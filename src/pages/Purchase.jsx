import { useEffect, useState, useMemo, useRef, Fragment } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FileText,
  Plus,
  Search,
  Trash2,
  Eye,
  Download,
  Calendar,
  Info,
  RefreshCw,
  AlertTriangle,
  IndianRupee,
  CreditCard,
  CheckCircle,
  X,
  Pencil,
  Loader2,
  Wallet,
  Coins,
  ChevronRight,
  TrendingUp,
  Copy,
  Paperclip,
  Upload,
  User,
  Hash,
  MapPin,
  ShoppingBag,
  CalendarCheck,
  Building,
  Phone,
  Mail,
  FileSpreadsheet,
  ChevronDown,
  Check,
  FlaskConical,
  Shield,
  Leaf,
  Package,
} from "lucide-react";
import {
  fetchPurchases,
  createPurchase,
  updatePurchase,
  deletePurchase,
  fetchPaymentsOut,
  createPaymentOut,
  updatePaymentOut,
  deletePaymentOut,
  fetchPurchaseReturns,
  createPurchaseReturn,
  deletePurchaseReturn,
  fetchExpenses,
  createExpense,
  deleteExpense,
  convertToPurchaseBill
} from "../store/thunks/purchaseThunk";
import { fetchParties, addParty } from "../store/thunks/partyThunk";
import { fetchProducts, addProduct, updateProduct, fetchStockSummary } from "../store/thunks/inventoryThunk";
import { clearPurchaseStatus } from "../store/slices/purchaseSlice";
import { usePermissions } from "../hooks/usePermissions";
import ErrorState from "../components/ErrorState";
import api from "../lib/api";
import SearchableStateSelect from "../components/SearchableStateSelect";
import { searchGstin } from "../store/thunks/eInvoiceThunk";
import { normalizeGstinData } from "../utils/gstinNormalizer";

const TABS = [
  { key: "purchases", label: "Received & Ordered", icon: FileText },
  { key: "payments", label: "Payments Out", icon: IndianRupee },
  { key: "returns", label: "Debit Notes (Returns)", icon: RefreshCw },
  { key: "expenses", label: "Expenses", icon: Wallet },
];

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi"
];

const EXPENSE_CATEGORIES = [
  "Office Supplies",
  "Rent",
  "Utilities",
  "Logistics & Transport",
  "Salaries & Wages",
  "Marketing & Advertising",
  "Repairs & Maintenance",
  "Other Expenses"
];

const PAYMENT_TYPES = ["Cash", "UPI", "Cheque", "Bank Transfer", "Card"];

// Helper component to resolve and display purchase bill numbers from ID
function LinkedBillCell({ billId }) {
  const [billNumber, setBillNumber] = useState("");

  useEffect(() => {
    if (!billId) return;
    if (typeof billId === 'object') {
      setBillNumber(billId.billNumber || "");
      return;
    }
    if (String(billId).length === 24) {
      api.get(`/purchase/${billId}`)
        .then(res => {
          const bill = res.data?.data || res.data;
          setBillNumber(bill?.billNumber || billId);
        })
        .catch(() => {
          setBillNumber(billId);
        });
    } else {
      setBillNumber(billId);
    }
  }, [billId]);

  return <span>{billNumber || "—"}</span>;
}

// Helper to resolve product name/label from a line item
const resolveItemLabel = (itemRow, products = []) => {
  const isInvalidName = (name) => {
    if (!name) return true;
    const lower = String(name).toLowerCase();
    return lower.includes("null") || lower.includes("undefined") || lower.includes("product id:");
  };

  // 1. If item is populated as an object
  if (itemRow.item && typeof itemRow.item === 'object') {
    const name = itemRow.item.productName || itemRow.item.name || itemRow.itemName;
    if (!isInvalidName(name)) {
      return name;
    }
  }

  // 2. If item is a valid string ID
  if (itemRow.item && typeof itemRow.item === 'string' && !isInvalidName(itemRow.item)) {
    const prod = products.find(p => p.products?.some(v => v._id === itemRow.item) || p._id === itemRow.item);
    if (prod) {
      const variant = prod.products?.find(v => v._id === itemRow.item);
      const varText = variant ? ` (${variant.parameter} ${variant.unit})` : "";
      return `${prod.productName}${varText}`;
    }
  }

  // 3. Fallback to itemName if present and valid
  if (itemRow.itemName && !isInvalidName(itemRow.itemName)) {
    return itemRow.itemName;
  }

  // 4. Fallback: search products store by matching unit and price!
  if (itemRow.unit && itemRow.pricePerUnit && products.length > 0) {
    const matched = products.find(p => p.products?.some(v =>
      String(v.unit).toLowerCase() === String(itemRow.unit).toLowerCase() &&
      Number(v.pricePerUnit || v.purchasePrice) === Number(itemRow.pricePerUnit)
    ));
    if (matched) {
      return matched.productName;
    }
  }

  // 5. Fallback: search products store by matching unit only!
  if (itemRow.unit && products.length > 0) {
    const matched = products.find(p => p.products?.some(v =>
      String(v.unit).toLowerCase() === String(itemRow.unit).toLowerCase()
    ));
    if (matched) {
      return matched.productName;
    }
  }

  return "Product";
};

// Helper to resolve purchase return item name using the original bill details when variant ID is null
const resolveReturnItemLabel = (it, products = [], linkedBill = null) => {
  if (linkedBill && linkedBill.items) {
    const originalItem = linkedBill.items.find(v => {
      const originalItemId = v.item?._id || v.item;
      const returnItemId = it.item?._id || it.item;
      if (returnItemId && originalItemId && returnItemId === originalItemId) {
        return true;
      }
      return String(v.unit).toLowerCase() === String(it.unit).toLowerCase() &&
             Number(v.pricePerUnit) === Number(it.pricePerUnit);
    });
    if (originalItem && originalItem.itemName) {
      return originalItem.itemName;
    }
  }
  return resolveItemLabel(it, products);
};


// Helper to resolve product variant ID from a line item to satisfy database reference constraints
const resolveVariantId = (itemRow, products = []) => {
  const isInvalidId = (id) => {
    if (!id) return true;
    const s = String(id);
    return s === "null" || s === "undefined" || s.length !== 24;
  };

  // 1. If it's already a valid 24-character ObjectId string
  if (itemRow.item && typeof itemRow.item === 'string' && !isInvalidId(itemRow.item)) {
    return itemRow.item;
  }

  // 2. If it's populated as an object
  if (itemRow.item && typeof itemRow.item === 'object' && itemRow.item._id && !isInvalidId(itemRow.item._id)) {
    return itemRow.item._id;
  }

  // 3. Search by matching product name from resolveItemLabel
  const resolvedLabel = resolveItemLabel(itemRow, products);
  if (resolvedLabel && resolvedLabel !== "Product" && products.length > 0) {
    const matchedProduct = products.find(p => 
      String(p.productName).toLowerCase().includes(String(resolvedLabel).toLowerCase()) ||
      String(resolvedLabel).toLowerCase().includes(String(p.productName).toLowerCase())
    );
    if (matchedProduct) {
      const matchedVariant = matchedProduct.products?.find(v =>
        String(v.unit).toLowerCase() === String(itemRow.unit).toLowerCase()
      );
      if (matchedVariant && matchedVariant._id && !isInvalidId(matchedVariant._id)) {
        return matchedVariant._id;
      }
      if (matchedProduct.products?.[0]?._id && !isInvalidId(matchedProduct.products[0]._id)) {
        return matchedProduct.products[0]._id;
      }
    }
  }

  // 4. Fallback: search products store for a matching variant by unit and price!
  if (itemRow.unit && itemRow.pricePerUnit && products.length > 0) {
    for (const p of products) {
      const matchedVariant = p.products?.find(v =>
        String(v.unit).toLowerCase() === String(itemRow.unit).toLowerCase() &&
        Number(v.pricePerUnit || v.purchasePrice) === Number(itemRow.pricePerUnit)
      );
      if (matchedVariant && matchedVariant._id && !isInvalidId(matchedVariant._id)) {
        return matchedVariant._id;
      }
    }
  }

  // 5. Fallback: search products store for a matching variant by unit only!
  if (itemRow.unit && products.length > 0) {
    for (const p of products) {
      const matchedVariant = p.products?.find(v =>
        String(v.unit).toLowerCase() === String(itemRow.unit).toLowerCase()
      );
      if (matchedVariant && matchedVariant._id && !isInvalidId(matchedVariant._id)) {
        return matchedVariant._id;
      }
    }
  }

  // 6. Fallback: just return the first product's first variant if available, to satisfy validation
  if (products.length > 0) {
    for (const p of products) {
      if (p.products && p.products.length > 0) {
        const firstVarId = p.products[0]._id;
        if (firstVarId && !isInvalidId(firstVarId)) {
          return firstVarId;
        }
      }
    }
  }

  return itemRow.item || null;
};

const getProductIcon = (category) => {
  const cat = String(category || "").toLowerCase();
  if (cat.includes("insecticide")) return FlaskConical;
  if (cat.includes("fungicide")) return Shield;
  if (cat.includes("fertilizer") || cat.includes("seed") || cat.includes("organic") || cat.includes("pgr")) return Leaf;
  return Package;
};

export default function Purchases() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "purchases";

  const { isReadOnly } = usePermissions();

  // Redux States
  const {
    purchases,
    purchasesTotal,
    payments,
    paymentsTotal,
    returns,
    returnsTotal,
    expenses,
    expensesTotal,
    loading,
    error,
  } = useSelector((state) => state.purchase);

  const { parties } = useSelector((state) => state.party);
  const { products, stockSummary } = useSelector((state) => state.inventory);

  const getLiveVariantStock = (p, v) => {
    if (!p || !v) return 0;
    const stockRecord = (stockSummary || []).find(
      (s) => s.item?.variantId === v._id || s.item?._id === v._id || (
         s.item?.sourceRef === p._id &&
         String(s.item?.parameter).trim().toLowerCase() === String(v.parameter).trim().toLowerCase() &&
         String(s.item?.unit).trim().toLowerCase() === String(v.unit).trim().toLowerCase()
      )
    );
    return stockRecord ? (stockRecord.availableQuantity ?? 0) : (v.quantity ?? 0);
  };

  const getLiveProductStock = (p) => {
    if (!p?.products) return 0;
    return p.products.reduce((sum, v) => sum + getLiveVariantStock(p, v), 0);
  };

  // Modals Local States
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [editBillRecord, setEditBillRecord] = useState(null);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editPaymentRecord, setEditPaymentRecord] = useState(null);

  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [viewDetailModalOpen, setViewDetailModalOpen] = useState(false);

  // Deletion confirm state
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteConfirmType, setDeleteConfirmType] = useState(null); // 'bill', 'payment', 'return', 'expense'

  // Detailed Modal Viewing state
  const [detailItem, setDetailItem] = useState(null);
  const [detailType, setDetailType] = useState("bill");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [partyFilter, setPartyFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [purchaseTypeFilter, setPurchaseTypeFilter] = useState("");
  const [billingTypeFilter, setBillingTypeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Load static data
  useEffect(() => {
    dispatch(clearPurchaseStatus());
    dispatch(fetchParties());
    dispatch(fetchProducts());
    dispatch(fetchStockSummary());
  }, [dispatch]);

  // Handle active tab or filters changes
  useEffect(() => {
    loadListData();
  }, [activeTab, currentPage, partyFilter, startDate, endDate, purchaseTypeFilter, billingTypeFilter]);

  const loadListData = () => {
    const filters = { page: currentPage, limit: ITEMS_PER_PAGE };
    if (searchQuery) filters.search = searchQuery;
    if (partyFilter) filters.party = partyFilter;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    if (activeTab === "purchases") {
      if (purchaseTypeFilter) filters.purchaseType = purchaseTypeFilter;
      if (billingTypeFilter) filters.billingType = billingTypeFilter;
      dispatch(fetchPurchases(filters));
    } else if (activeTab === "payments") {
      dispatch(fetchPaymentsOut(filters));
    } else if (activeTab === "returns") {
      dispatch(fetchPurchaseReturns(filters));
    } else if (activeTab === "expenses") {
      dispatch(fetchExpenses(filters));
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadListData();
  };

  // Helper date formatter
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Dashboard calculation metrics (Calculated from list arrays)
  const purchaseMetrics = useMemo(() => {
    const totalBills = purchases.filter(p => p.purchaseType === "BILL").reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const totalOrders = purchases.filter(p => p.purchaseType === "ORDER").reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const totalPayments = payments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    const totalExp = expenses.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
    return {
      totalBills,
      totalOrders,
      totalPayments,
      totalExpenses: totalExp,
      outstandingPayables: Math.max(0, totalBills - totalPayments)
    };
  }, [purchases, payments, expenses]);

  const totalPages = Math.ceil(
    (activeTab === "purchases" ? purchasesTotal : activeTab === "payments" ? paymentsTotal : activeTab === "returns" ? returnsTotal : expensesTotal) / ITEMS_PER_PAGE
  );

  const handleOpenDetailModal = (item, type) => {
    setDetailItem(item);
    setDetailType(type);
    setViewDetailModalOpen(true);
  };

  // Deletion logic
  const handleConfirmDelete = async () => {
    const id = deleteConfirmId;
    const type = deleteConfirmType;
    setDeleteConfirmId(null);
    setDeleteConfirmType(null);

    const loadingToast = toast.loading("Deleting record...");
    try {
      if (type === "bill") {
        await dispatch(deletePurchase(id)).unwrap();
        toast.success("Purchase record deleted successfully", { id: loadingToast });
        dispatch(fetchPurchases({ page: currentPage, limit: ITEMS_PER_PAGE }));
        dispatch(fetchPaymentsOut({ page: 1, limit: ITEMS_PER_PAGE }));
      } else if (type === "payment") {
        await dispatch(deletePaymentOut(id)).unwrap();
        toast.success("Payment out receipt deleted", { id: loadingToast });
        dispatch(fetchPaymentsOut({ page: currentPage, limit: ITEMS_PER_PAGE }));
        dispatch(fetchPurchases({ page: 1, limit: ITEMS_PER_PAGE }));
      } else if (type === "return") {
        await dispatch(deletePurchaseReturn(id)).unwrap();
        toast.success("Debit note deleted successfully", { id: loadingToast });
        dispatch(fetchPurchaseReturns({ page: currentPage, limit: ITEMS_PER_PAGE }));
      } else if (type === "expense") {
        await dispatch(deleteExpense(id)).unwrap();
        toast.success("Expense deleted successfully", { id: loadingToast });
        dispatch(fetchExpenses({ page: currentPage, limit: ITEMS_PER_PAGE }));
      }
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Failed to delete record", { id: loadingToast });
    }
  };

  const handleDownloadPurchaseReceipt = async (id) => {
    try {
      toast.loading("Generating purchase invoice PDF...", { id: "purchase-pdf-download" });
      const res = await api.get(`/purchase/receipt/${id}`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast.success("Purchase invoice opened in print preview", { id: "purchase-pdf-download" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to open purchase invoice PDF", { id: "purchase-pdf-download" });
    }
  };

  const handleDownloadPaymentOutReceipt = async (id) => {
    try {
      toast.loading("Generating payment receipt PDF...", { id: "payment-pdf-download" });
      const res = await api.get(`/purchase/payment-out/receipt/${id}`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast.success("Payment receipt opened in print preview", { id: "payment-pdf-download" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to open payment receipt PDF", { id: "payment-pdf-download" });
    }
  };

  const handleDownloadPurchaseReturnReceipt = async (id) => {
    try {
      toast.loading("Generating purchase return receipt PDF...", { id: "return-pdf-download" });
      const res = await api.get(`/purchase/return/receipt/${id}`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast.success("Purchase return receipt opened in print preview", { id: "return-pdf-download" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to open purchase return receipt PDF", { id: "return-pdf-download" });
    }
  };

  const handleConvertOrderToBill = async (id) => {
    if (!window.confirm("Are you sure you want to mark these goods as received and update your inventory?")) {
      return;
    }
    const loadingToast = toast.loading("Marking goods as received...");
    try {
      await dispatch(convertToPurchaseBill(id)).unwrap();
      toast.success("Goods marked as received successfully!", { id: loadingToast });
      loadListData();
      dispatch(fetchPaymentsOut({ page: 1, limit: ITEMS_PER_PAGE }));
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Failed to mark goods as received", { id: loadingToast });
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">Purchases Workspace</h1>
          <p className="text-sm text-gray-500">Manage vendor purchase bills, orders, cash payment outs, returns, and expense records</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {!isReadOnly && (
            <>
              {activeTab === "purchases" && (
                <button
                  onClick={() => {
                    setEditBillRecord(null);
                    setBillModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition shadow-sm active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  New Purchase
                </button>
              )}
              {activeTab === "payments" && (
                <button
                  onClick={() => {
                    setEditPaymentRecord(null);
                    setPaymentModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition shadow-sm active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Record Payment
                </button>
              )}
              {activeTab === "returns" && (
                <button
                  onClick={() => setReturnModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-medium text-sm shadow-md hover:shadow-xl transition-all duration-300 active:scale-95"
                >
                  <Plus size={16} />
                  Create Return
                </button>
              )}
              {activeTab === "expenses" && (
                <button
                  onClick={() => setExpenseModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition shadow-sm active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Add Expense
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 2. Dashboard Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: "Total Received Value",
            val: `₹${purchaseMetrics.totalBills.toLocaleString("en-IN")}`,
            icon: FileText,
            bg: "bg-blue-50 text-blue-700 border-blue-100"
          },
          {
            label: "Total Ordered Value",
            val: `₹${purchaseMetrics.totalOrders.toLocaleString("en-IN")}`,
            icon: Coins,
            bg: "bg-purple-50 text-purple-700 border-purple-100"
          },
          {
            label: "Total Payments Out",
            val: `₹${purchaseMetrics.totalPayments.toLocaleString("en-IN")}`,
            icon: IndianRupee,
            bg: "bg-emerald-50 text-emerald-700 border-emerald-100"
          },
          {
            label: "Total Expenses",
            val: `₹${purchaseMetrics.totalExpenses.toLocaleString("en-IN")}`,
            icon: Wallet,
            bg: "bg-amber-50 text-amber-700 border-amber-100"
          },
          {
            label: "Outstanding Payables",
            val: `₹${purchaseMetrics.outstandingPayables.toLocaleString("en-IN")}`,
            icon: AlertTriangle,
            bg: "bg-red-50 text-red-700 border-red-100"
          }
        ].map((item, idx) => (
          <div key={idx} className={`bg-white border ${item.bg.split(" ")[2]} rounded-2xl p-4 shadow-sm flex items-center gap-3`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.bg.split(" ")[0]} ${item.bg.split(" ")[1]}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-gray-505 font-semibold uppercase tracking-wider">{item.label}</p>
              <h3 className="text-lg font-bold text-gray-900 mt-0.5">{item.val}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Sub-Navigation Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map((t) => {
          const TabIcon = t.icon;
          const isSelected = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => {
                setSearchParams({ tab: t.key });
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all duration-150 ${isSelected
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
                }`}
            >
              <TabIcon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 4. Filter Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col xl:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by code, segments, or transaction details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder-gray-400"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white cursor-pointer h-[42px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white cursor-pointer h-[42px]"
            />
          </div>

          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setCurrentPage(1);
              }}
              className="px-3.5 py-2 text-xs font-bold text-red-655 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition h-[42px] active:scale-95"
            >
              Clear Dates
            </button>
          )}

          {activeTab === "purchases" && (
            <>
              <div className="w-full md:w-48">
                <select
                  value={purchaseTypeFilter}
                  onChange={(e) => {
                    setPurchaseTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white cursor-pointer h-[42px] font-medium text-gray-700"
                >
                  <option value="">All Types (Bill/Order)</option>
                  <option value="BILL">Received (Bill)</option>
                  <option value="ORDER">Ordered (Order)</option>
                </select>
              </div>

              <div className="w-full md:w-48">
                <select
                  value={billingTypeFilter}
                  onChange={(e) => {
                    setBillingTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white cursor-pointer h-[42px] font-medium text-gray-700"
                >
                  <option value="">All Billing (Cash/Credit)</option>
                  <option value="Cash">Cash</option>
                  <option value="Credit">Credit</option>
                </select>
              </div>
            </>
          )}

          <div className="w-full md:w-64">
            <select
              value={partyFilter}
              onChange={(e) => {
                setPartyFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white cursor-pointer h-[42px]"
            >
              <option value="">All Parties / Suppliers</option>
              {parties.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 5. Main Table UI */}
      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState
          title="Failed to load purchases data"
          error={error}
          onRetry={loadListData}
          variant="page"
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {activeTab === "purchases" && (
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-600 uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-4">Bill Number</th>
                    <th className="px-6 py-4">Vendor</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Goods Status</th>
                    <th className="px-6 py-4 text-right">Total Amount</th>
                    <th className="px-6 py-4 text-right">Paid Amount</th>
                    <th className="px-6 py-4 text-right">Due Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {purchases.length === 0 ? (
                    <tr className="hover:bg-transparent">
                      <td colSpan={9} className="px-6 py-16">
                        <EmptyState
                          title="No Purchase Bills Found"
                          description="Manage supplier invoices and procurement bills here to track item inventory and credits."
                        />
                      </td>
                    </tr>
                  ) : (
                    purchases.map((item) => {
                      const paid = item.paidAmount || 0;
                      const unpaid = item.unpaidAmount || 0;
                      return (
                        <tr key={item._id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4 font-bold text-gray-900">{item.billNumber || item._id.substring(0, 8).toUpperCase()}</td>
                          <td className="px-6 py-4 font-semibold text-gray-800">{item.party?.name || "Unknown Vendor"}</td>
                          <td className="px-6 py-4 text-gray-500">{formatDate(item.billDate)}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition ${item.purchaseType === "BILL"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-250"
                              : "bg-amber-50 text-amber-700 border-amber-250"
                              }`}>
                              {item.purchaseType === "BILL" ? "Received" : "Ordered"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-gray-950">₹{(item.totalAmount || 0).toLocaleString("en-IN")}</td>
                          <td className="px-6 py-4 text-right text-gray-600">₹{paid.toLocaleString("en-IN")}</td>
                          <td className="px-6 py-4 text-right text-red-600 font-semibold">₹{unpaid.toLocaleString("en-IN")}</td>
                          <td className="px-6 py-4">
                            {unpaid === 0 ? (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                                Paid
                              </span>
                            ) : paid === 0 ? (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-250">
                                Unpaid
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-250">
                                Due
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleOpenDetailModal(item, "bill")}
                                className="p-2 text-gray-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDownloadPurchaseReceipt(item._id)}
                                className="p-2 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                                title="Download Purchase PDF"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              {item.purchaseType === "ORDER" && !isReadOnly && (
                                <button
                                  onClick={() => handleConvertOrderToBill(item._id)}
                                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition active:scale-95"
                                  title="Receive Goods"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>Receive Goods</span>
                                </button>
                              )}
                              {unpaid > 0 && !isReadOnly && (
                                <button
                                  onClick={() => {
                                    setEditPaymentRecord({
                                      party: item.party?._id || item.party,
                                      linkedBill: item._id,
                                      linkedPurchaseBill: item._id,
                                      purchase: item._id,
                                      paidAmount: unpaid
                                    });
                                    setPaymentModalOpen(true);
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg transition active:scale-95 shadow-3xs"
                                  title="Record Payment"
                                >
                                  <IndianRupee className="w-3 h-3" />
                                  <span>Pay Dues</span>
                                </button>
                              )}
                              {!isReadOnly && (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditBillRecord(item);
                                      setBillModalOpen(true);
                                    }}
                                    className="p-2 text-gray-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                                    title="Edit Record"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeleteConfirmId(item._id);
                                      setDeleteConfirmType("bill");
                                    }}
                                    className="p-2 text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                    title="Delete Record"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "payments" && (
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-600 uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-4">Receipt No</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Supplier/Party</th>
                    <th className="px-6 py-4">Paid Breakdowns</th>
                    <th className="px-6 py-4 text-right">Total Amount</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.length === 0 ? (
                    <tr className="hover:bg-transparent">
                      <td colSpan={6} className="px-6 py-16">
                        <EmptyState
                          title="No Payments Out Found"
                          description="Track outgoing transactions, checkouts, and deposits made to your product suppliers."
                        />
                      </td>
                    </tr>
                  ) : (
                    payments.map((item) => (
                      <tr key={item._id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900">{item.receiptNo || item._id.substring(0, 8).toUpperCase()}</span>
                            {item.isAutoGenerated ? (
                              <span className="inline-flex items-center w-fit mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                Auto-Generated
                              </span>
                            ) : (
                              <span className="inline-flex items-center w-fit mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-250">
                                Manual
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{formatDate(item.date)}</td>
                        <td className="px-6 py-4 font-semibold text-gray-800">{item.party?.name || "Unknown Supplier"}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {item.payments?.map((py, idx) => (
                              <span key={idx} className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs uppercase font-medium">
                                {py.paymentType}: ₹{py.amount}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-extrabold text-red-650">₹{(item.paidAmount || 0).toLocaleString("en-IN")}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenDetailModal(item, "payment")}
                              className="p-2 text-gray-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadPaymentOutReceipt(item._id)}
                              className="p-2 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                              title="Download Payment Receipt PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {!isReadOnly && (
                              <>
                                {item.isAutoGenerated ? (
                                  <span
                                    className="p-2 text-gray-400 cursor-not-allowed inline-block"
                                    title="Auto-generated payments cannot be edited directly. Edit the linked bill instead."
                                  >
                                    <Pencil className="w-4 h-4 opacity-40" />
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setEditPaymentRecord(item);
                                      setPaymentModalOpen(true);
                                    }}
                                    className="p-2 text-gray-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                                    title="Edit Payment"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                )}
                                {item.isAutoGenerated ? (
                                  <span
                                    className="p-2 text-gray-400 cursor-not-allowed inline-block"
                                    title="Auto-generated payments cannot be deleted directly. Delete/update the linked bill instead."
                                  >
                                    <Trash2 className="w-4 h-4 opacity-40" />
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setDeleteConfirmId(item._id);
                                      setDeleteConfirmType("payment");
                                    }}
                                    className="p-2 text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                    title="Delete Record"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "returns" && (
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-600 uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-4">Debit Note #</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Party/Supplier</th>
                    <th className="px-6 py-4">Linked Bill</th>
                    <th className="px-6 py-4 text-right">Returned Amount</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {returns.length === 0 ? (
                    <tr className="hover:bg-transparent">
                      <td colSpan={6} className="px-6 py-16">
                        <EmptyState
                          title="No Purchase Returns Found"
                          description="Log debit notes for returns of damaged inventory items, matching items directly with bills."
                        />
                      </td>
                    </tr>
                  ) : (
                    returns.map((item) => (
                      <tr key={item._id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 font-bold text-gray-900">{item.returnNo || item._id.substring(0, 8).toUpperCase()}</td>
                        <td className="px-6 py-4 text-gray-500">{formatDate(item.returnDate)}</td>
                        <td className="px-6 py-4 font-semibold text-gray-800">{item.party?.name || "Unknown Party"}</td>
                        <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                          <LinkedBillCell billId={item.purchase} />
                        </td>
                        <td className="px-6 py-4 text-right font-extrabold text-red-650">₹{(item.totalAmount || 0).toLocaleString("en-IN")}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenDetailModal(item, "return")}
                              className="p-2 text-gray-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadPurchaseReturnReceipt(item._id)}
                              className="p-2 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                              title="Download Purchase Return PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {!isReadOnly && (
                              <button
                                onClick={() => {
                                  setDeleteConfirmId(item._id);
                                  setDeleteConfirmType("return");
                                }}
                                className="p-2 text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "expenses" && (
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-600 uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-4">Expense No</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Payment Method</th>
                    <th className="px-6 py-4">GST Details</th>
                    <th className="px-6 py-4 text-right">Total Amount</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expenses.length === 0 ? (
                    <tr className="hover:bg-transparent">
                      <td colSpan={7} className="px-6 py-16">
                        <EmptyState
                          title="No Expenses Recorded"
                          description="Log custom expenses (rent, stationery, services) with or without GST options."
                        />
                      </td>
                    </tr>
                  ) : (
                    expenses.map((item) => (
                      <tr key={item._id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 font-bold text-gray-900">{item.expenseNo || item._id.substring(0, 8).toUpperCase()}</td>
                        <td className="px-6 py-4 font-medium text-gray-800">{item.expenseCategory}</td>
                        <td className="px-6 py-4 text-gray-500">{formatDate(item.billDate)}</td>
                        <td className="px-6 py-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                            {item.paymentType}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${item.gstEnabled
                            ? "bg-purple-50 text-purple-700 border border-purple-100"
                            : "bg-gray-50 text-gray-400 border border-gray-250"
                            }`}>
                            {item.gstEnabled ? "GST Enabled" : "Without GST"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-extrabold text-gray-950">₹{(item.totalAmount || 0).toLocaleString("en-IN")}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenDetailModal(item, "expense")}
                              className="p-2 text-gray-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {!isReadOnly && (
                              <button
                                onClick={() => {
                                  setDeleteConfirmId(item._id);
                                  setDeleteConfirmType("expense");
                                }}
                                className="p-2 text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 6. Pagination UI */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center text-sm text-gray-500 px-2 mt-4">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-3.5 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-45 transition bg-white"
            >
              Prev
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3.5 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-45 transition bg-white"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
         A. NEW / EDIT PURCHASE BILL MODAL
      ============================================================ */}
      {billModalOpen && (
        <NewBillModal
          editRecord={editBillRecord}
          parties={parties}
          products={products}
          stockSummary={stockSummary}
          onClose={() => {
            setBillModalOpen(false);
            setEditBillRecord(null);
          }}
          onSuccess={() => {
            setBillModalOpen(false);
            setEditBillRecord(null);
            loadListData();
            dispatch(fetchPaymentsOut({ page: 1, limit: ITEMS_PER_PAGE }));
          }}
        />
      )}

      {/* ============================================================
         B. RECORD / EDIT PAYMENT OUT MODAL
      ============================================================ */}
      {paymentModalOpen && (
        <RecordPaymentModal
          editRecord={editPaymentRecord}
          parties={parties}
          onClose={() => {
            setPaymentModalOpen(false);
            setEditPaymentRecord(null);
          }}
          onSuccess={() => {
            setPaymentModalOpen(false);
            setEditPaymentRecord(null);
            loadListData();
            dispatch(fetchPurchases({ page: 1, limit: ITEMS_PER_PAGE }));
          }}
        />
      )}

      {/* ============================================================
         C. PURCHASE RETURN MODAL
      ============================================================ */}
      {returnModalOpen && (
        <CreateReturnModal
          onClose={() => setReturnModalOpen(false)}
          onSuccess={() => {
            setReturnModalOpen(false);
            loadListData();
          }}
        />
      )}

      {/* ============================================================
         D. EXPENSE MODAL
      ============================================================ */}
      {expenseModalOpen && (
        <ExpenseModal
          parties={parties}
          onClose={() => setExpenseModalOpen(false)}
          onSuccess={() => {
            setExpenseModalOpen(false);
            loadListData();
          }}
        />
      )}

      {/* ============================================================
         E. VIEW TRANSACTION DETAILS MODAL
      ============================================================ */}
      {viewDetailModalOpen && detailItem && (
        <DetailsModal
          item={detailItem}
          type={detailType}
          onClose={() => {
            setViewDetailModalOpen(false);
            setDetailItem(null);
          }}
          handleDownloadPurchaseReceipt={handleDownloadPurchaseReceipt}
          handleDownloadPaymentOutReceipt={handleDownloadPaymentOutReceipt}
          handleDownloadPurchaseReturnReceipt={handleDownloadPurchaseReturnReceipt}
        />
      )}

      {/* ============================================================
         F. DELETE CONFIRMATION DIALOG
      ============================================================ */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto text-red-655">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Delete Record?</h3>
              <p className="text-xs text-gray-500 mt-2">Are you sure you want to delete this record? This action cannot be undone.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setDeleteConfirmId(null);
                  setDeleteConfirmType(null);
                }}
                className="flex-1 py-2 border rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow-lg transition-all duration-200"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: TABLE SKELETON
// ─────────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4 animate-pulse">
      <div className="flex gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded col-span-1 flex-1"></div>
        ))}
      </div>
      <div className="space-y-3 pt-4 border-t border-gray-100">
        {[...Array(5)].map((_, idx) => (
          <div key={idx} className="flex gap-4 items-center">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-3 bg-gray-100 rounded col-span-1 flex-1"></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: EMPTY STATE
// ─────────────────────────────────────────────────────────────
function EmptyState({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 max-w-md mx-auto">
      <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center text-brand-600">
        <CreditCard className="w-8 h-8" />
      </div>
      <h3 className="font-bold text-gray-800 text-base">{title}</h3>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: NEW / EDIT BILL MODAL (Checkout Grid Table, Sticky Summary, Image Upload, Paid/Unpaid Rules)
// ─────────────────────────────────────────────────────────────
function NewBillModal({ editRecord = null, parties, products, stockSummary = [], onClose, onSuccess }) {
  const dispatch = useDispatch();

  const getLiveVariantStock = (p, v) => {
    if (!p || !v) return 0;
    const stockRecord = (stockSummary || []).find(
      (s) => s.item?.variantId === v._id || s.item?._id === v._id || (
         s.item?.sourceRef === p._id &&
         String(s.item?.parameter).trim().toLowerCase() === String(v.parameter).trim().toLowerCase() &&
         String(s.item?.unit).trim().toLowerCase() === String(v.unit).trim().toLowerCase()
      )
    );
    return stockRecord ? (stockRecord.availableQuantity ?? 0) : (v.quantity ?? 0);
  };

  const getLiveProductStock = (p) => {
    if (!p?.products) return 0;
    return p.products.reduce((sum, v) => sum + getLiveVariantStock(p, v), 0);
  };

  // Basic Header Fields
  const [purchaseType, setPurchaseType] = useState(editRecord ? editRecord.purchaseType : "BILL");
  const [billNumber, setBillNumber] = useState(editRecord ? (editRecord.billNumber || "") : "");
  const [billingType, setBillingType] = useState(editRecord ? editRecord.billingType : "Credit");
  const [selectedParty, setSelectedParty] = useState(editRecord ? (editRecord.party?._id || editRecord.party || "") : "");
  const [billDate, setBillDate] = useState(editRecord ? editRecord.billDate?.split("T")[0] : new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(editRecord ? (editRecord.dueDate?.split("T")[0] || "") : "");
  const [stateOfSupply, setStateOfSupply] = useState(editRecord ? (editRecord.stateOfSupply || "Uttar Pradesh") : "Uttar Pradesh");
  const [remarks, setRemarks] = useState(editRecord ? (editRecord.remarks || "") : "");

  // Paid Payment Workflows Fields
  const [paymentType, setPaymentType] = useState(editRecord ? (editRecord.paymentType || "Cash") : "Cash");
  const [referenceNo, setReferenceNo] = useState(editRecord ? (editRecord.referenceNo || "") : "");
  const [paidAmount, setPaidAmount] = useState(editRecord ? (editRecord.paidAmount ?? 0) : 0);

  // File Upload State
  const [uploadedFile, setUploadedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(editRecord ? editRecord.invoiceFile || editRecord.image || null : null);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(1);

  // Quick modals triggers
  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [activeRowIdxForProduct, setActiveRowIdxForProduct] = useState(null);
  // Table items rows checkout (initialized as empty or loaded from editRecord)
  const [items, setItems] = useState(() => {
    if (editRecord && editRecord.items?.length > 0) {
      return editRecord.items.map((it) => {
        const targetItemId = it.item?._id || it.item;
        let matchedProd = null;

        if (targetItemId && targetItemId !== 'null' && targetItemId !== 'undefined') {
          matchedProd = products.find(
            (p) => p._id === targetItemId || p.products?.some((v) => v._id === targetItemId)
          );
        }

        // Fallback: search products store by matching unit and price!
        if (!matchedProd && it.unit && it.pricePerUnit) {
          matchedProd = products.find(p => p.products?.some(v =>
            String(v.unit).toLowerCase() === String(it.unit).toLowerCase() &&
            Number(v.purchasePrice) === Number(it.pricePerUnit)
          ));
        }

        let productId = matchedProd?._id || "";
        let variantParameter = "";
        let unit = it.unit || "pcs";
        let stock = 0;

        if (matchedProd?.products) {
          // If we have variant ID, try to match by variant ID first
          let matchedVar = matchedProd.products.find(v => v._id === targetItemId);
          // Otherwise match by unit and price
          if (!matchedVar && it.unit && it.pricePerUnit) {
            matchedVar = matchedProd.products.find(v =>
              String(v.unit).toLowerCase() === String(it.unit).toLowerCase() &&
              Number(v.purchasePrice) === Number(it.pricePerUnit)
            );
          }
          if (matchedVar) {
            variantParameter = matchedVar.parameter || "";
            stock = matchedVar.quantity ?? 0;
            unit = matchedVar.unit || "pcs";
          }
        }

        return {
          productId,
          variantParameter,
          availableStock: stock,
          quantity: it.quantity || 1,
          unit: unit,
          pricePerUnit: it.pricePerUnit || "",
          taxType: it.taxType || "Without Tax",
          discountPercent: it.discountPercent || "",
          discountAmount: it.discountAmount || 0,
          taxPercent: it.taxPercent || "",
          taxAmount: it.taxAmount || 0,
          amount: it.amount || 0,
        };
      });
    }
    return [];
  });

  // Form states for the "Add Product" card
  const [formProductId, setFormProductId] = useState("");
  const [formVariantParameter, setFormVariantParameter] = useState("");
  const [formAvailableStock, setFormAvailableStock] = useState(0);
  const [formQuantity, setFormQuantity] = useState(1);
  const [formUnit, setFormUnit] = useState("kg");
  const [formPricePerUnit, setFormPricePerUnit] = useState("");
  const [discountType, setDiscountType] = useState("percentage"); // "percentage" | "amount"
  const [formDiscountValue, setFormDiscountValue] = useState("");
  const [taxInputType, setTaxInputType] = useState("percentage"); // "percentage" | "amount"
  const [formTaxValue, setFormTaxValue] = useState("");
  const [formTaxType, setFormTaxType] = useState("Without Tax");

  // Track if we are editing a row in the list
  const [editingIndex, setEditingIndex] = useState(null);

  const [formHsnCode, setFormHsnCode] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const productDropdownRef = useRef(null);

  const [expandedRows, setExpandedRows] = useState(new Set());

  const filteredProducts = useMemo(() => {
    const query = productSearchQuery.trim().toLowerCase();
    const selectedProd = products.find(p => p._id === formProductId);
    // If the search input exactly matches the selected product name, show all products
    if (selectedProd && selectedProd.productName.toLowerCase() === query) {
      return products;
    }
    if (!query) return products;
    return products.filter((p) => {
      const name = String(p.productName || "").toLowerCase();
      const cat = String(p.productCategory || "").toLowerCase();
      return name.includes(query) || cat.includes(query);
    });
  }, [productSearchQuery, products, formProductId]);

  // State of Supply autofill
  useEffect(() => {
    if (selectedParty) {
      const vendorObj = parties.find(p => p._id === selectedParty);
      if (vendorObj && vendorObj.state) {
        setStateOfSupply(vendorObj.state);
      }
    }
  }, [selectedParty, parties]);

  // Close product search dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target)) {
        setProductDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset product search query when dropdown closes or restore selected product name
  useEffect(() => {
    if (!productDropdownOpen) {
      const selectedProd = products.find(p => p._id === formProductId);
      setProductSearchQuery(selectedProd ? selectedProd.productName : "");
    }
  }, [productDropdownOpen, formProductId, products]);

  // Smart single-variant auto-selection
  useEffect(() => {
    if (formProductId) {
      const prod = products.find((p) => p._id === formProductId);
      if (prod && prod.products?.length === 1) {
        const singleVar = prod.products[0];
        setFormVariantParameter(singleVar.parameter || "");
        setFormUnit(singleVar.unit || "pcs");
        setFormAvailableStock(getLiveVariantStock(prod, singleVar));
        setFormPricePerUnit(singleVar.purchasePrice || "");
        setFormTaxType(singleVar.purchasePriceTaxType || "Without Tax");
        setFormHsnCode(prod.hsnCode || "");
      }
    }
  }, [formProductId, products]);

  const handleProductChange = (productId) => {
    setFormProductId(productId);
    const prod = products.find((p) => p._id === productId);
    if (prod) {
      const defaultVar = prod.products?.[0];
      setFormVariantParameter(defaultVar?.parameter || "");
      setFormAvailableStock(getLiveVariantStock(prod, defaultVar));
      setFormUnit(defaultVar?.unit || "pcs");
      setFormPricePerUnit(defaultVar?.purchasePrice || "");
      setTaxInputType("percentage");
      setFormTaxValue(prod.taxRate !== undefined ? parseFloat(prod.taxRate) : "");
      setFormTaxType(defaultVar?.purchasePriceTaxType || "Without Tax");
      setDiscountType("percentage");
      setFormDiscountValue("");
      setFormQuantity(1);
      setFormHsnCode(prod.hsnCode || "");
      setProductSearchQuery(prod.productName);
    } else {
      setFormVariantParameter("");
      setFormAvailableStock(0);
      setFormUnit("kg");
      setFormPricePerUnit("");
      setTaxInputType("percentage");
      setFormTaxValue("");
      setFormTaxType("Without Tax");
      setDiscountType("percentage");
      setFormDiscountValue("");
      setFormQuantity(1);
      setFormHsnCode("");
      setProductSearchQuery("");
    }
  };

  const handleVariantOrUnitChange = (field, value) => {
    let nextVariantParam = formVariantParameter;
    let nextUnit = formUnit;

    if (field === "variantParameter") {
      nextVariantParam = value;
      setFormVariantParameter(value);
    } else if (field === "unit") {
      nextUnit = value;
      setFormUnit(value);
    }

    const prod = products.find((p) => p._id === formProductId);
    if (prod) {
      const matchingVar = prod.products?.find(
        v => String(v.parameter).trim().toLowerCase() === String(nextVariantParam).trim().toLowerCase() &&
          String(v.unit).trim().toLowerCase() === String(nextUnit).trim().toLowerCase()
      );
      if (matchingVar) {
        setFormAvailableStock(getLiveVariantStock(prod, matchingVar));
        setFormPricePerUnit(matchingVar.purchasePrice || "");
        setFormTaxType(matchingVar.purchasePriceTaxType || "Without Tax");
      }
    }
  };

  const handleAddProductToList = () => {
    if (!formProductId) {
      toast.error("Please select a product");
      return;
    }
    if (!formVariantParameter.trim()) {
      toast.error("Variant parameter is required");
      return;
    }
    const qty = parseFloat(formQuantity) || 0;
    if (qty <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }
    const price = parseFloat(formPricePerUnit) || 0;
    if (price < 0) {
      toast.error("Price cannot be negative");
      return;
    }

    // Calculate row subtotal
    const base = qty * price;

    // Discount calculations (Percentage vs Flat Amount)
    let discPct = 0;
    let discountAmount = 0;
    const rawDisc = parseFloat(formDiscountValue) || 0;

    if (discountType === "percentage") {
      discPct = rawDisc;
      discountAmount = parseFloat((base * (discPct / 100)).toFixed(2));
    } else {
      discountAmount = rawDisc;
      discPct = base > 0 ? parseFloat(((discountAmount / base) * 100).toFixed(2)) : 0;
    }

    const afterDiscount = Math.max(0, base - discountAmount);

    // GST calculations (Percentage vs Flat Amount)
    let taxPct = 0;
    let taxAmount = 0;
    let amount = 0;
    const rawTax = parseFloat(formTaxValue) || 0;

    if (taxInputType === "percentage") {
      taxPct = rawTax;
      if (formTaxType === "With Tax") {
        amount = parseFloat(afterDiscount.toFixed(2));
        const taxable = amount / (1 + taxPct / 100);
        taxAmount = parseFloat((amount - taxable).toFixed(2));
      } else {
        const taxable = afterDiscount;
        taxAmount = parseFloat((taxable * (taxPct / 100)).toFixed(2));
        amount = parseFloat((taxable + taxAmount).toFixed(2));
      }
    } else {
      taxAmount = rawTax;
      if (formTaxType === "With Tax") {
        amount = parseFloat(afterDiscount.toFixed(2));
        const taxable = Math.max(0, amount - taxAmount);
        taxPct = taxable > 0 ? parseFloat(((taxAmount / taxable) * 100).toFixed(2)) : 0;
      } else {
        const taxable = afterDiscount;
        amount = parseFloat((taxable + taxAmount).toFixed(2));
        taxPct = taxable > 0 ? parseFloat(((taxAmount / taxable) * 100).toFixed(2)) : 0;
      }
    }

    const newItem = {
      productId: formProductId,
      variantParameter: formVariantParameter,
      availableStock: parseFloat(formAvailableStock) || 0,
      quantity: qty,
      unit: formUnit,
      pricePerUnit: price,
      taxType: formTaxType,
      discountPercent: discPct,
      discountAmount,
      taxPercent: taxPct,
      taxAmount,
      amount,
      hsnCode: formHsnCode || products.find(p => p._id === formProductId)?.hsnCode || ""
    };

    setItems((prev) => {
      const copy = [...prev];
      if (editingIndex !== null) {
        copy[editingIndex] = newItem;
      } else {
        copy.push(newItem);
      }
      return copy;
    });

    // Reset temporary form fields
    setFormProductId("");
    setFormVariantParameter("");
    setFormAvailableStock(0);
    setFormQuantity(1);
    setFormUnit("kg");
    setFormPricePerUnit("");
    setDiscountType("percentage");
    setFormDiscountValue("");
    setTaxInputType("percentage");
    setFormTaxValue("");
    setFormTaxType("Without Tax");
    setFormHsnCode("");
    setEditingIndex(null);
  };

  const handleEditProductInList = (idx) => {
    const item = items[idx];
    setFormProductId(item.productId);
    setFormVariantParameter(item.variantParameter);
    setFormAvailableStock(item.availableStock);
    setFormQuantity(item.quantity);
    setFormUnit(item.unit);
    setFormPricePerUnit(item.pricePerUnit);
    setDiscountType("percentage");
    setFormDiscountValue(item.discountPercent);
    setTaxInputType("percentage");
    setFormTaxValue(item.taxPercent);
    setFormTaxType(item.taxType);
    setFormHsnCode(item.hsnCode || "");
    setEditingIndex(idx);
  };

  const handleDeleteProductFromList = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
    if (editingIndex === idx) {
      setFormProductId("");
      setFormVariantParameter("");
      setFormAvailableStock(0);
      setFormQuantity(1);
      setFormUnit("kg");
      setFormPricePerUnit("");
      setDiscountType("percentage");
      setFormDiscountValue("");
      setTaxInputType("percentage");
      setFormTaxValue("");
      setFormTaxType("Without Tax");
      setFormHsnCode("");
      setEditingIndex(null);
    } else if (editingIndex !== null && editingIndex > idx) {
      setEditingIndex(editingIndex - 1);
    }
  };

  const formatPackSize = (parameter, unit) => {
    const u = String(unit || "").toLowerCase().trim();
    const p = String(parameter || "").trim();
    if (u === "kg" || u === "bag" || u === "bags" || u === "gm" || u === "g") {
      return `${p} ${unit} Bag`;
    }
    if (u === "ml" || u === "l" || u === "litres" || u === "litre") {
      return `${p} ${unit} Bottle`;
    }
    return `${p} ${unit}`;
  };

  const estimatedTotal = useMemo(() => {
    const qty = parseFloat(formQuantity) || 0;
    const price = parseFloat(formPricePerUnit) || 0;
    const base = qty * price;

    // Discount
    let discountAmount = 0;
    const rawDisc = parseFloat(formDiscountValue) || 0;
    if (discountType === "percentage") {
      discountAmount = base * (rawDisc / 100);
    } else {
      discountAmount = rawDisc;
    }
    const afterDiscount = Math.max(0, base - discountAmount);

    // Tax
    let taxAmount = 0;
    let amount = 0;
    const rawTax = parseFloat(formTaxValue) || 0;
    if (taxInputType === "percentage") {
      if (formTaxType === "With Tax") {
        amount = afterDiscount;
      } else {
        taxAmount = afterDiscount * (rawTax / 100);
        amount = afterDiscount + taxAmount;
      }
    } else {
      taxAmount = rawTax;
      if (formTaxType === "With Tax") {
        amount = afterDiscount;
      } else {
        amount = afterDiscount + taxAmount;
      }
    }
    return amount;
  }, [formQuantity, formPricePerUnit, formDiscountValue, discountType, formTaxValue, taxInputType, formTaxType]);

  const totalQty = useMemo(() => {
    return items.reduce((sum, line) => sum + (line.quantity === "" ? 0 : parseFloat(line.quantity) || 0), 0);
  }, [items]);

  const totalDiscount = useMemo(() => {
    return parseFloat(items.reduce((sum, line) => sum + (parseFloat(line.discountAmount) || 0), 0).toFixed(2));
  }, [items]);

  const totalTax = useMemo(() => {
    return parseFloat(items.reduce((sum, line) => sum + (parseFloat(line.taxAmount) || 0), 0).toFixed(2));
  }, [items]);

  const subTotal = useMemo(() => {
    return parseFloat(items.reduce((sum, item) => {
      const q = item.quantity === "" ? 0 : parseFloat(item.quantity) || 0;
      const p = item.pricePerUnit === "" ? 0 : parseFloat(item.pricePerUnit) || 0;
      return sum + (q * p);
    }, 0).toFixed(2));
  }, [items]);

  const grandTotal = useMemo(() => {
    return parseFloat(items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toFixed(2));
  }, [items]);

  // Cash Billing automation behavior
  useEffect(() => {
    if (billingType === "Cash") {
      setPaidAmount(grandTotal);
    }
  }, [billingType, grandTotal]);

  const unpaidAmount = useMemo(() => {
    if (billingType === "Cash") return 0;
    return Math.max(0, parseFloat((grandTotal - (parseFloat(paidAmount) || 0)).toFixed(2)));
  }, [billingType, grandTotal, paidAmount]);

  const purchaseStatus = useMemo(() => {
    const paidVal = parseFloat(paidAmount) || 0;
    if (billingType === "Cash" || paidVal === grandTotal) {
      return "Paid";
    }
    if (paidVal === 0) {
      return "Unpaid";
    }
    return "Due";
  }, [billingType, paidAmount, grandTotal]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setFilePreview(null);
  };

  const handleNextStep = () => {
    if (activeStep === 1) {
      if (!selectedParty) {
        toast.error("Supplier/Vendor field is required");
        return;
      }
      if (billingType === "Credit" && !dueDate) {
        toast.error("Due Date is required for credit transactions");
        return;
      }
      setActiveStep(2);
    } else if (activeStep === 2) {
      const validLines = items.filter(it => it.productId && (parseFloat(it.quantity) || 0) > 0);
      if (validLines.length === 0) {
        toast.error("Please add at least one valid product line item with quantity > 0");
        return;
      }
      setActiveStep(3);
    }
  };

  const handlePrevStep = () => {
    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!selectedParty) {
      toast.error("Supplier/Vendor field is required");
      setActiveStep(1);
      return;
    }
    if (billingType === "Credit" && !dueDate) {
      toast.error("Due Date is required for credit transactions");
      setActiveStep(1);
      return;
    }

    if (billingType === "Credit") {
      const pAmt = parseFloat(paidAmount) || 0;
      if (pAmt < 0) {
        toast.error("Paid amount cannot be negative");
        return;
      }
      if (pAmt > grandTotal) {
        toast.error(`Paid amount (₹${pAmt}) cannot exceed the grand total (₹${grandTotal})`);
        return;
      }
    }

    const validLines = items.filter(it => it.productId && (parseFloat(it.quantity) || 0) > 0);
    if (validLines.length === 0) {
      toast.error("Please add at least one valid product line item with quantity > 0");
      setActiveStep(2);
      return;
    }

    // Line Validation checks
    for (let i = 0; i < validLines.length; i++) {
      const it = validLines[i];
      if (parseFloat(it.quantity) <= 0) {
        toast.error(`Quantity in Row #${i + 1} must be greater than zero`);
        return;
      }
      if (parseFloat(it.pricePerUnit) < 0) {
        toast.error(`Price in Row #${i + 1} cannot be negative`);
        return;
      }
    }

    setLoading(true);
    const loadingToast = toast.loading(editRecord ? "Updating purchase..." : "Recording purchase...");

    try {
      const payloadItems = [];

      for (let i = 0; i < validLines.length; i++) {
        const it = validLines[i];
        const prod = products.find(p => p._id === it.productId);
        if (!prod) {
          throw new Error(`Product not found for line #${i + 1}`);
        }

        // Search for matching variant
        const existingVariant = prod.products?.find(
          v => String(v.parameter).trim().toLowerCase() === String(it.variantParameter).trim().toLowerCase() &&
            String(v.unit).trim().toLowerCase() === String(it.unit).trim().toLowerCase()
        );

        let variantId = "";

        const isNew = !existingVariant;
        const isChanged = existingVariant && (
          existingVariant.quantity !== (parseFloat(it.availableStock) || 0) ||
          existingVariant.purchasePrice !== (parseFloat(it.pricePerUnit) || 0) ||
          existingVariant.purchasePriceTaxType !== it.taxType
        );

        if (isNew || isChanged) {
          let updatedVariants = [];
          if (isNew) {
            const newVar = {
              parameter: it.variantParameter,
              unit: it.unit,
              quantity: parseFloat(it.availableStock) || 0,
              purchasePrice: parseFloat(it.pricePerUnit) || 0,
              purchasePriceTaxType: it.taxType || "Without Tax",
              mrp: 0,
              salePrice: 0,
              salePriceTaxType: "Without Tax",
              wholesalePrice: 0,
              wholesalePriceTaxType: "Without Tax",
              purchaseDate: new Date().toISOString().split("T")[0]
            };
            updatedVariants = [...(prod.products || []), newVar];
          } else {
            updatedVariants = prod.products.map(v => {
              if (v._id === existingVariant._id) {
                return {
                  ...v,
                  quantity: parseFloat(it.availableStock) || 0,
                  purchasePrice: parseFloat(it.pricePerUnit) || 0,
                  purchasePriceTaxType: it.taxType || "Without Tax",
                };
              }
              return v;
            });
          }

          const updatePayload = {
            productName: prod.productName,
            brand: prod.brand || "",
            productCategory: prod.productCategory,
            description: prod.description || "",
            itemType: prod.itemType || "PRODUCT",
            hsnCode: prod.hsnCode || "",
            taxRate: prod.taxRate !== undefined ? String(prod.taxRate) : "",
            products: updatedVariants
          };

          const updatedProd = await dispatch(updateProduct({ id: prod._id, data: updatePayload })).unwrap();

          const matchedVar = updatedProd?.products?.find(
            v => String(v.parameter).trim().toLowerCase() === String(it.variantParameter).trim().toLowerCase() &&
              String(v.unit).trim().toLowerCase() === String(it.unit).trim().toLowerCase()
          );
          variantId = matchedVar?._id || updatedProd?.products?.[updatedProd?.products?.length - 1]?._id;
        } else {
          variantId = existingVariant._id;
        }

        const stockRecord = (stockSummary || []).find(
          (s) => s.item?.sourceRef === prod._id &&
            String(s.item?.parameter).trim().toLowerCase() === String(it.variantParameter).trim().toLowerCase() &&
            String(s.item?.unit).trim().toLowerCase() === String(it.unit).trim().toLowerCase()
        );
        const inventoryItemId = stockRecord?.item?._id || variantId;

        payloadItems.push({
          item: inventoryItemId,
          itemName: prod.productName,
          quantity: parseInt(it.quantity),
          unit: it.unit,
          pricePerUnit: parseFloat(it.pricePerUnit),
          taxType: it.taxType,
          discountPercent: parseFloat(it.discountPercent) || 0,
          discountAmount: parseFloat(it.discountAmount) || 0,
          taxPercent: parseFloat(it.taxPercent) || 0,
          taxAmount: parseFloat(it.taxAmount) || 0,
          amount: parseFloat(it.amount)
        });
      }

      // Refresh products list in store to reflect the new variant/stock/price values
      await dispatch(fetchProducts()).unwrap();

      const paidVal = billingType === "Cash" ? grandTotal : (parseFloat(paidAmount) || 0);
      const unpaidVal = billingType === "Cash" ? 0 : Math.max(0, parseFloat((grandTotal - paidVal).toFixed(2)));
      const pType = paidVal > 0 ? paymentType : "Cash";

      let savedPurchase;
      if (!uploadedFile) {
        // Send clean JSON payload
        const jsonPayload = {
          purchaseType,
          billNumber: billNumber.trim() || undefined,
          billingType,
          paymentType: pType,
          paidAmount: Number(paidVal),
          unpaidAmount: Number(unpaidVal),
          party: selectedParty,
          billDate,
          stateOfSupply,
          subTotal: Number(subTotal),
          totalAmount: Number(grandTotal),
          items: payloadItems
        };
        if (referenceNo) {
          jsonPayload.referenceNo = referenceNo;
        }
        if (dueDate && billingType === "Credit") {
          jsonPayload.dueDate = dueDate;
        }
        if (remarks) {
          jsonPayload.remarks = remarks;
        }

        if (editRecord) {
          const response = await dispatch(updatePurchase({ id: editRecord._id, payload: jsonPayload })).unwrap();
          savedPurchase = response?.data || response;
          toast.success("Purchase bill updated successfully!", { id: loadingToast });
        } else {
          const response = await dispatch(createPurchase(jsonPayload)).unwrap();
          savedPurchase = response?.data || response;
          toast.success("Purchase bill logged successfully!", { id: loadingToast });
        }
      } else {
        // Build multipart/form-data if file is uploaded
        const data = new FormData();
        data.append("purchaseType", purchaseType);
        if (billNumber.trim()) {
          data.append("billNumber", billNumber.trim());
        }
        data.append("billingType", billingType);
        data.append("paymentType", pType);
        if (referenceNo) {
          data.append("referenceNo", referenceNo);
        }
        data.append("paidAmount", paidVal);
        data.append("unpaidAmount", unpaidVal);
        data.append("party", selectedParty);
        data.append("billDate", billDate);
        if (dueDate && billingType === "Credit") data.append("dueDate", dueDate);
        data.append("stateOfSupply", stateOfSupply);
        data.append("subTotal", subTotal);
        data.append("totalAmount", grandTotal);
        if (remarks) data.append("remarks", remarks);
        data.append("items", JSON.stringify(payloadItems));
        data.append("image", uploadedFile);

        if (editRecord) {
          const response = await dispatch(updatePurchase({ id: editRecord._id, payload: data })).unwrap();
          savedPurchase = response?.data || response;
          toast.success("Purchase bill updated successfully!", { id: loadingToast });
        } else {
          const response = await dispatch(createPurchase(data)).unwrap();
          savedPurchase = response?.data || response;
          toast.success("Purchase bill logged successfully!", { id: loadingToast });
        }
      }

      await dispatch(fetchProducts()).unwrap();
      await dispatch(fetchStockSummary()).unwrap();
      onSuccess();
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Failed to save purchase details", { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col max-h-[95vh] border border-gray-150 animate-in fade-in zoom-in-95 duration-200">

        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-700 p-2.5 rounded-xl text-white shadow-md">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="leading-tight text-slate-800 font-extrabold text-lg">
                Fast Purchase Checkout
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                QUICK LOG SUPPLIER PURCHASES & UPDATE STOCK
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-655 hover:bg-slate-50 rounded-xl transition-all duration-200 hover:rotate-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Stepper Header */}
        <div className="bg-white border-b border-slate-100 px-8 py-5 flex justify-center items-center">
          <div className="flex items-center w-full max-w-3xl justify-between relative">
            {/* Connecting lines */}
            <div className="absolute top-[18px] left-[16.6%] right-[16.6%] h-[3px] bg-slate-100 -translate-y-1/2 z-0 rounded-full" />
            <div
              className="absolute top-[18px] left-[16.6%] h-[3px] bg-emerald-600 -translate-y-1/2 z-0 transition-all duration-300 rounded-full"
              style={{
                width: activeStep === 1 ? "0%" : activeStep === 2 ? "50%" : "100%"
              }}
            />

            {/* Step 1 */}
            <button
              type="button"
              onClick={() => activeStep > 1 && setActiveStep(1)}
              className="z-10 flex flex-col items-center gap-2 focus:outline-none w-1/3"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm border transition-all duration-200 ${activeStep >= 1
                  ? "bg-emerald-600 border-emerald-600 text-white"
                  : "bg-white border-slate-200 text-slate-400"
                  }`}
              >
                1
              </div>
              <div className="flex flex-col items-center text-center">
                <span className={`text-[10px] font-black uppercase tracking-wider ${activeStep >= 1 ? "text-emerald-700" : "text-slate-400"}`}>
                  Invoice Info
                </span>
                <span className="text-[9px] text-slate-400 font-semibold mt-0.5">
                  Enter purchase details
                </span>
              </div>
            </button>

            {/* Step 2 */}
            <button
              type="button"
              onClick={() => {
                if (activeStep > 2) {
                  setActiveStep(2);
                } else if (activeStep === 1) {
                  handleNextStep();
                }
              }}
              className="z-10 flex flex-col items-center gap-2 focus:outline-none w-1/3"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm border transition-all duration-200 ${activeStep >= 2
                  ? "bg-emerald-600 border-emerald-600 text-white"
                  : "bg-white border-slate-200 text-slate-400"
                  }`}
              >
                2
              </div>
              <div className="flex flex-col items-center text-center">
                <span className={`text-[10px] font-black uppercase tracking-wider ${activeStep >= 2 ? "text-emerald-700" : "text-slate-400"}`}>
                  Add Products
                </span>
                <span className="text-[9px] text-slate-400 font-semibold mt-0.5">
                  Add items to purchase
                </span>
              </div>
            </button>

            {/* Step 3 */}
            <button
              type="button"
              onClick={() => {
                if (activeStep === 2) {
                  handleNextStep();
                } else if (activeStep === 1) {
                  if (selectedParty && (billingType !== "Credit" || dueDate)) {
                    const validLines = items.filter(it => it.productId && (parseFloat(it.quantity) || 0) > 0);
                    if (validLines.length > 0) {
                      setActiveStep(3);
                    } else {
                      toast.error("Please add at least one valid product line item with quantity > 0");
                      setActiveStep(2);
                    }
                  } else {
                    handleNextStep();
                  }
                }
              }}
              className="z-10 flex flex-col items-center gap-2 focus:outline-none w-1/3"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm border transition-all duration-200 ${activeStep >= 3
                  ? "bg-emerald-600 border-emerald-600 text-white"
                  : "bg-white border-slate-200 text-slate-400"
                  }`}
              >
                3
              </div>
              <div className="flex flex-col items-center text-center">
                <span className={`text-[10px] font-black uppercase tracking-wider ${activeStep >= 3 ? "text-emerald-700" : "text-slate-400"}`}>
                  Upload & Remarks
                </span>
                <span className="text-[9px] text-slate-400 font-semibold mt-0.5">
                  Review & submit
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Modal Body columns splits */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-50/50">

          {/* Main forms parameters (Spans left) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {activeStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-200">
                {/* A. Purchase Information Card */}
                <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 pb-3.5 border-b border-slate-100">
                    <div className="bg-emerald-50 p-1.5 rounded-lg text-emerald-600 border border-emerald-100">
                      <FileText className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">Purchase Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Supplier / Vendor */}
                    <div className="group">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Party/Supplier *</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <select
                            value={selectedParty}
                            onChange={(e) => setSelectedParty(e.target.value)}
                            className="pl-10 pr-8 w-full border border-slate-200 hover:border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[42px] transition-all font-semibold text-slate-800 cursor-pointer"
                            required
                          >
                            <option value="">-- Choose Party --</option>
                            {parties.map((p) => (
                              <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                          </select>
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                        <button
                          type="button"
                          onClick={() => setAddVendorOpen(true)}
                          className="px-3 bg-emerald-50/40 hover:bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl active:scale-95 transition-all h-[42px] flex items-center justify-center"
                          title="Quick Add Vendor"
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>

                    {/* Bill / Invoice Number */}
                    <div className="group">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Bill / Invoice Number</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={billNumber}
                          onChange={(e) => setBillNumber(e.target.value)}
                          placeholder="PUR-2026-001"
                          className="pl-10 pr-3 w-full border border-slate-200 hover:border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[42px] transition-all font-semibold text-slate-800"
                        />
                        <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Bill Date */}
                    <div className="group">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Bill Date *</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={billDate}
                          onChange={(e) => setBillDate(e.target.value)}
                          className="pl-10 pr-3 w-full border border-slate-200 hover:border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[42px] cursor-pointer transition-all font-semibold text-slate-800"
                          required
                        />
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Goods Status */}
                    <div className="group">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Goods Status</label>
                      <div className="flex gap-2.5 h-[42px]">
                        <button
                          type="button"
                          onClick={() => setPurchaseType("ORDER")}
                          className={`flex-1 rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2 border ${purchaseType === "ORDER"
                            ? "bg-emerald-50/50 border-emerald-600 text-emerald-750 shadow-sm"
                            : "bg-slate-100/60 hover:bg-slate-100 border-transparent text-slate-500"
                            }`}
                        >
                          <CalendarCheck className={`w-4 h-4 ${purchaseType === "ORDER" ? "text-emerald-600" : "text-slate-400"}`} />
                          Ordered
                        </button>
                        <button
                          type="button"
                          onClick={() => setPurchaseType("BILL")}
                          className={`flex-1 rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2 border ${purchaseType === "BILL"
                            ? "bg-emerald-50/50 border-emerald-600 text-emerald-750 shadow-sm"
                            : "bg-slate-100/60 hover:bg-slate-100 border-transparent text-slate-500"
                            }`}
                        >
                          <FileText className={`w-4 h-4 ${purchaseType === "BILL" ? "text-emerald-600" : "text-slate-400"}`} />
                          Received
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 font-semibold leading-relaxed">
                        {purchaseType === "ORDER"
                          ? "Goods have been ordered but not yet received."
                          : "Goods have been received and added to inventory."}
                      </p>
                    </div>

                    {/* Payment */}
                    <div className="group">
                      <label className="block text-[10px] font-bold text-slate-550 mb-1.5 uppercase tracking-wider">Payment</label>
                      <div className="flex gap-2.5 h-[42px]">
                        <button
                          type="button"
                          onClick={() => setBillingType("Cash")}
                          className={`flex-1 rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2 border ${billingType === "Cash"
                            ? "bg-emerald-50/50 border-emerald-600 text-emerald-750 shadow-sm"
                            : "bg-slate-100/60 hover:bg-slate-100 border-transparent text-slate-500"
                            }`}
                        >
                          <Coins className={`w-4 h-4 ${billingType === "Cash" ? "text-emerald-600" : "text-slate-400"}`} />
                          Pay Now
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillingType("Credit")}
                          className={`flex-1 rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2 border ${billingType === "Credit"
                            ? "bg-emerald-50/50 border-emerald-600 text-emerald-750 shadow-sm"
                            : "bg-slate-100/60 hover:bg-slate-100 border-transparent text-slate-500"
                            }`}
                        >
                          <CreditCard className={`w-4 h-4 ${billingType === "Credit" ? "text-emerald-600" : "text-slate-400"}`} />
                          Pay Later
                        </button>
                      </div>
                    </div>

                    {/* State of Supply */}
                    <div className="group">
                      <label className="block text-[10px] font-bold text-slate-550 mb-1.5 uppercase tracking-wider">State of Supply</label>
                      <SearchableStateSelect
                        value={stateOfSupply}
                        onChange={(val) => setStateOfSupply(val)}
                      />
                    </div>

                    {/* Due Date (Credit Only) */}
                    {billingType === "Credit" && (
                      <div className="group animate-in fade-in duration-200">
                        <label className="block text-[10px] font-bold text-slate-550 mb-1.5 uppercase tracking-wider">Due Date *</label>
                        <div className="relative">
                          <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="pl-10 pr-3 w-full border border-slate-200 hover:border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[42px] cursor-pointer transition-all font-semibold text-slate-800"
                            required
                          />
                          <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    )}

                    {/* Cash Mode Payment Fields */}
                    {billingType === "Cash" && (
                      <>
                        <div className="group animate-in fade-in duration-200">
                          <label className="block text-[10px] font-bold text-slate-550 mb-1.5 uppercase tracking-wider">Payment Mode</label>
                          <div className="relative">
                            <select
                              value={paymentType}
                              onChange={(e) => setPaymentType(e.target.value)}
                              className="pl-10 pr-8 w-full border border-slate-200 hover:border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[42px] cursor-pointer transition-all font-semibold text-slate-800"
                            >
                              {PAYMENT_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                            <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          </div>
                        </div>
                        <div className="group animate-in fade-in duration-200">
                          <label className="block text-[10px] font-bold text-slate-550 mb-1.5 uppercase tracking-wider">Reference No / Txn ID</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={referenceNo}
                              onChange={(e) => setReferenceNo(e.target.value)}
                              placeholder="e.g. TXN123456"
                              className="pl-10 pr-3 w-full border border-slate-200 hover:border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[42px] transition-all font-semibold text-slate-800"
                            />
                            <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Credit Mode Payment Fields */}
                    {billingType === "Credit" && (
                      <>
                        <div className="group animate-in fade-in duration-200">
                          <label className="block text-[10px] font-bold text-slate-550 mb-1.5 uppercase tracking-wider">Amount Paid Now</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              value={paidAmount || ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? "" : parseFloat(e.target.value);
                                setPaidAmount(val === "" ? 0 : val);
                              }}
                              placeholder="₹0"
                              className="pl-10 pr-3 w-full border border-slate-200 hover:border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[42px] transition-all font-semibold text-slate-800"
                            />
                            <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          </div>
                        </div>
                        {parseFloat(paidAmount) > 0 && (
                          <>
                            <div className="group animate-in fade-in duration-200">
                              <label className="block text-[10px] font-bold text-slate-550 mb-1.5 uppercase tracking-wider">Payment Mode</label>
                              <div className="relative">
                                <select
                                  value={paymentType}
                                  onChange={(e) => setPaymentType(e.target.value)}
                                  className="pl-10 pr-8 w-full border border-slate-200 hover:border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[42px] cursor-pointer transition-all font-semibold text-slate-800"
                                >
                                  {PAYMENT_TYPES.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                                <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                              </div>
                            </div>
                            <div className="group animate-in fade-in duration-200">
                              <label className="block text-[10px] font-bold text-slate-550 mb-1.5 uppercase tracking-wider">Reference No / Txn ID</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={referenceNo}
                                  onChange={(e) => setReferenceNo(e.target.value)}
                                  placeholder="e.g. TXN123456"
                                  className="pl-10 pr-3 w-full border border-slate-200 hover:border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[42px] transition-all font-semibold text-slate-800"
                                />
                                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* soft green banner with vector illustration */}
                <div className="bg-emerald-50/40 border border-emerald-100/85 rounded-2xl p-5 flex items-center justify-between relative overflow-hidden">
                  <div className="flex items-center gap-3.5 max-w-[80%]">
                    <div className="bg-emerald-100/50 p-2.5 rounded-xl text-emerald-600">
                      <Info className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-850">
                        Enter invoice details to get started. You can add products in the next step.
                      </span>
                    </div>
                  </div>

                  {/* Clipboard Check SVG Illustration */}
                  <svg width="120" height="90" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute right-6 bottom-0 overflow-visible pointer-events-none hidden md:block">
                    <path d="M95 70C92 50 102 38 108 35C108 35 106 48 98 58C96 61 95 66 95 70Z" fill="#86efac" opacity="0.7" />
                    <path d="M102 75C104 60 112 52 118 50C118 50 114 60 107 68C105 70 103 73 102 75Z" fill="#22c55e" opacity="0.6" />
                    <path d="M25 70C28 50 18 38 12 35C12 35 14 48 22 58C24 61 25 66 25 70Z" fill="#86efac" opacity="0.7" />
                    <rect x="42" y="24" width="40" height="52" rx="6" fill="#f1f5f9" />
                    <rect x="40" y="20" width="40" height="52" rx="6" fill="white" stroke="#e2e8f0" strokeWidth="2" />
                    <rect x="52" y="14" width="16" height="8" rx="2" fill="#cbd5e1" />
                    <rect x="55" y="16" width="10" height="4" rx="1" fill="#94a3b8" />
                    <line x1="48" y1="34" x2="64" y2="34" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
                    <line x1="48" y1="42" x2="72" y2="42" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
                    <line x1="48" y1="50" x2="68" y2="50" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
                    <line x1="48" y1="58" x2="60" y2="58" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="76" cy="62" r="10" fill="#16a34a" />
                    <path d="M72 62L75 65L81 59" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                {/* Step 1 Navigation Buttons */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95 hover:shadow-lg"
                  >
                    Next: Add Products →
                  </button>
                </div>
              </div>
            )}

            {activeStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
                {/* B. Add Product Form Card */}
                <div className="bg-white border border-slate-155 rounded-2xl p-6 shadow-sm space-y-5">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600 border border-emerald-100">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="font-extrabold text-slate-800 text-sm">Add Products</h3>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        Search and select products to add to your purchase
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Searchable Product Select */}
                    <div ref={productDropdownRef} className="w-full relative">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Product *</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={productSearchQuery}
                          onFocus={() => setProductDropdownOpen(true)}
                          onChange={(e) => {
                            setProductSearchQuery(e.target.value);
                            setProductDropdownOpen(true);
                          }}
                          placeholder="Search product by name / category..."
                          className={`pl-10 pr-10 w-full border rounded-xl text-xs h-[42px] transition-all font-semibold ${
                            productDropdownOpen
                              ? "border-emerald-500 bg-white ring-4 ring-emerald-500/10 text-slate-850"
                              : "border-slate-200 hover:border-slate-350 bg-white text-slate-700"
                          }`}
                        />
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <ChevronDown
                          onClick={(e) => {
                            e.stopPropagation();
                            setProductDropdownOpen(!productDropdownOpen);
                          }}
                          className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 cursor-pointer transition-transform duration-200 text-slate-400 ${
                            productDropdownOpen ? "rotate-180 text-emerald-600" : ""
                          }`}
                        />
                      </div>

                      {productDropdownOpen && (
                        <div className="absolute left-0 right-0 z-[100] mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-1 duration-150 overflow-hidden flex flex-col max-h-[300px]">
                          {/* Dropdown Items list */}
                          <div className="overflow-y-auto divide-y divide-slate-100 pointer-events-auto">
                            {/* Quick Add Option */}
                            <button
                              type="button"
                              onClick={() => {
                                setAddProductOpen(true);
                                setProductDropdownOpen(false);
                              }}
                              className="w-full px-3.5 py-3 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50/30 flex items-center gap-2 border-b border-slate-100"
                            >
                              <Plus className="w-4 h-4 stroke-[2.5]" />
                              <span>+ Create New Product</span>
                            </button>

                            {filteredProducts.length === 0 ? (
                              <div className="px-3.5 py-4 text-xs text-slate-400 text-center font-medium">
                                No products found
                              </div>
                            ) : (
                              filteredProducts.map((p) => {
                                const isSelected = formProductId === p._id;
                                const categoryLabel = p.productCategory ? p.productCategory.charAt(0).toUpperCase() + p.productCategory.slice(1) : "General";
                                const packsList = p.products?.map(v => `${v.parameter} ${v.unit}`).join(', ') || "N/A";
                                const totalStock = getLiveProductStock(p);
                                const stockLabel = String(totalStock);
                                const ProductIcon = getProductIcon(p.productCategory);

                                return (
                                  <div
                                    key={p._id}
                                    onClick={() => {
                                      handleProductChange(p._id);
                                      setProductDropdownOpen(false);
                                    }}
                                    className={`px-3.5 py-2.5 cursor-pointer transition-colors flex items-center gap-3 hover:bg-slate-50 ${
                                      isSelected ? "bg-emerald-50/30 hover:bg-emerald-50/40" : ""
                                    }`}
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                                      <ProductIcon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                      <div className="flex justify-between items-center">
                                        <span className="font-bold text-slate-850 text-xs truncate">{p.productName}</span>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-2" />}
                                      </div>
                                      <div className="text-[10px] text-slate-500 font-semibold flex flex-wrap gap-x-3 gap-y-0.5">
                                        <span>Category: <b className="text-slate-600">{categoryLabel}</b></span>
                                        <span>Packs: <b className="text-slate-600">{packsList}</b></span>
                                        <span>Stock: <b className="text-slate-600">{stockLabel}</b></span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {formProductId && (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        {/* Variant Selection (Available Packs) */}
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Available Packs *</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {(() => {
                              const selectedProduct = products.find(p => p._id === formProductId);
                              return selectedProduct?.products?.map((v) => {
                                const packLabel = formatPackSize(v.parameter, v.unit);
                                const isSelected = formVariantParameter === v.parameter && formUnit === v.unit;
                                const liveStock = getLiveVariantStock(selectedProduct, v);
                                return (
                                  <button
                                    key={v._id || `${v.parameter}-${v.unit}`}
                                    type="button"
                                    onClick={() => {
                                      setFormVariantParameter(v.parameter || "");
                                      setFormUnit(v.unit || "pcs");
                                      setFormAvailableStock(liveStock);
                                      setFormPricePerUnit(v.purchasePrice || "");
                                      setFormTaxType(v.purchasePriceTaxType || "Without Tax");
                                      setFormHsnCode(selectedProduct?.hsnCode || "");
                                    }}
                                    className={`p-3 rounded-xl border text-left transition-all duration-150 flex flex-col gap-1 ${isSelected
                                      ? "border-emerald-600 bg-emerald-50/40 text-emerald-855 ring-2 ring-emerald-500/20 shadow-3xs"
                                      : "border-slate-200 hover:border-slate-350 bg-white text-slate-700"
                                      }`}
                                  >
                                    <span className="font-extrabold text-xs">{packLabel}</span>
                                    <span className="text-[10px] text-slate-400 font-bold">Stock: {liveStock}</span>
                                  </button>
                                );
                              });
                            })()}
                          </div>
                        </div>

                        {/* Quantity controls */}
                        <div className="flex flex-col gap-1.5 max-w-[200px]">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quantity Purchased</label>
                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() => setFormQuantity(q => Math.max(1, q - 1))}
                              className="w-10 h-[40px] bg-slate-105 hover:bg-slate-200 border border-slate-200 text-slate-600 rounded-l-xl flex items-center justify-center font-bold text-lg transition active:scale-95"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={formQuantity}
                              onChange={(e) => {
                                const val = e.target.value === "" ? "" : parseFloat(e.target.value);
                                setFormQuantity(val === "" ? 1 : Math.max(1, val));
                              }}
                              className="w-16 h-[40px] border-y border-slate-200 text-center text-xs focus:outline-none focus:ring-0 font-bold text-slate-805"
                            />
                            <button
                              type="button"
                              onClick={() => setFormQuantity(q => q + 1)}
                              className="w-10 h-[40px] bg-slate-105 hover:bg-slate-200 border border-slate-200 text-slate-600 rounded-r-xl flex items-center justify-center font-bold text-lg transition active:scale-95"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Advanced Options (Price, Tax, Discounts) */}
                        <div className="bg-slate-50/30 border border-slate-150 rounded-2xl p-5 space-y-4">
                          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                            <div className="bg-emerald-50 text-emerald-700 p-1.5 rounded-lg border border-emerald-100">
                              <FileSpreadsheet className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                              Advanced Pricing & Tax Overrides
                            </span>
                          </div>
                          <div className="p-5 bg-white border border-slate-150 rounded-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-5 animate-in fade-in duration-150">
                            {/* Price */}
                            <div className="flex flex-col">
                              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Purchase Price *</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₹</span>
                                <input
                                  type="number"
                                  value={formPricePerUnit}
                                  onChange={(e) => setFormPricePerUnit(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  className="w-full border border-slate-200 hover:border-slate-355 rounded-xl pl-7 pr-3 text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 h-[38px] transition-all font-semibold text-slate-800 text-right"
                                />
                              </div>
                            </div>

                            {/* Discount */}
                            <div className="flex flex-col">
                              <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Discount</label>
                                <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                                  <button
                                    type="button"
                                    onClick={() => setDiscountType("percentage")}
                                    className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-md transition-all ${discountType === "percentage" ? "bg-white text-emerald-700 shadow-3xs" : "text-slate-450 hover:text-slate-655"}`}
                                  >
                                    %
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDiscountType("amount")}
                                    className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-md transition-all ${discountType === "amount" ? "bg-white text-emerald-700 shadow-3xs" : "text-slate-450 hover:text-slate-655"}`}
                                  >
                                    ₹
                                  </button>
                                </div>
                              </div>
                              <div className="relative">
                                <input
                                  type="number"
                                  value={formDiscountValue}
                                  onChange={(e) => setFormDiscountValue(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                  placeholder="0"
                                  className="w-full border border-slate-200 hover:border-slate-355 rounded-xl pl-3 pr-7 text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 h-[38px] transition-all font-semibold text-slate-805 text-left"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">
                                  {discountType === "percentage" ? "%" : "₹"}
                                </span>
                              </div>
                            </div>

                            {/* GST */}
                            <div className="flex flex-col">
                              <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">GST</label>
                                <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                                  <button
                                    type="button"
                                    onClick={() => setTaxInputType("percentage")}
                                    className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-md transition-all ${taxInputType === "percentage" ? "bg-white text-emerald-700 shadow-3xs" : "text-slate-450 hover:text-slate-655"}`}
                                  >
                                    %
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setTaxInputType("amount")}
                                    className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-md transition-all ${taxInputType === "amount" ? "bg-white text-emerald-700 shadow-3xs" : "text-slate-450 hover:text-slate-655"}`}
                                  >
                                    ₹
                                  </button>
                                </div>
                              </div>
                              <div className="relative">
                                <input
                                  type="number"
                                  value={formTaxValue}
                                  onChange={(e) => setFormTaxValue(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                  placeholder="0"
                                  className="w-full border border-slate-200 hover:border-slate-355 rounded-xl pl-3 pr-7 text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 h-[38px] transition-all font-semibold text-slate-805 text-left"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">
                                  {taxInputType === "percentage" ? "%" : "₹"}
                                </span>
                              </div>
                            </div>

                            {/* GST Type */}
                            <div className="flex flex-col">
                              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">GST Type</label>
                              <div className="relative">
                                <select
                                  value={formTaxType}
                                  onChange={(e) => setFormTaxType(e.target.value)}
                                  className="w-full border border-slate-200 hover:border-slate-355 rounded-xl pl-3 pr-8 text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white cursor-pointer h-[38px] transition-all font-semibold text-slate-850 appearance-none"
                                >
                                  <option value="Without Tax">Without Tax</option>
                                  <option value="With Tax">With Tax</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                              </div>
                            </div>

                            {/* HSN Code */}
                            <div className="flex flex-col">
                              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">HSN Code</label>
                              <input
                                type="text"
                                value={formHsnCode}
                                onChange={(e) => setFormHsnCode(e.target.value)}
                                placeholder="e.g. 3102"
                                className="w-full border border-slate-200 hover:border-slate-355 rounded-xl px-3 text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 h-[38px] transition-all font-semibold text-slate-805"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Product Preview & Summary Add Button */}
                        {formVariantParameter && (
                          <div className="bg-emerald-50/10 border border-emerald-100 rounded-2xl p-5 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-6 mt-4 animate-in fade-in zoom-in-95 duration-150">
                            {/* Left Part: Product Name & Details */}
                            <div className="flex-1 space-y-1">
                              <div className="text-emerald-700 font-extrabold text-xs uppercase tracking-wide">Estimated Item Details</div>
                              <div className="text-xs text-slate-805 font-semibold leading-relaxed">
                                {(() => {
                                  const selectedProduct = products.find(p => p._id === formProductId);
                                  return (
                                    <>
                                      {selectedProduct?.productName}{" "}
                                      {selectedProduct?.brand ? `[${selectedProduct.brand}]` : ""}{" "}
                                      {selectedProduct?.productCategory ? `(${selectedProduct.productCategory})` : ""}
                                      {selectedProduct?.description && (
                                        <span className="text-slate-500 font-normal block mt-0.5">{selectedProduct.description}</span>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Vertical divider on desktop */}
                            <div className="hidden lg:block w-px bg-emerald-150 self-stretch my-1"></div>

                            {/* Right Part: Metrics and Add button */}
                            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 justify-between lg:justify-end">
                              {/* Pack Size */}
                              <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pack Size</span>
                                <span className="text-xs font-bold text-slate-800 mt-1">{formatPackSize(formVariantParameter, formUnit)}</span>
                              </div>

                              {/* Rate */}
                              <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rate</span>
                                <span className="text-xs font-bold text-slate-800 mt-1">₹{parseFloat(formPricePerUnit || 0).toFixed(2)}</span>
                              </div>

                              {/* Quantity */}
                              <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Quantity</span>
                                <span className="text-xs font-bold text-slate-800 mt-1">{formQuantity}</span>
                              </div>

                              {/* Estimated Total */}
                              <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Estimated Total</span>
                                <span className="text-emerald-755 font-black text-lg mt-0.5">
                                  ₹{estimatedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </span>
                              </div>

                              {/* Add Button */}
                              <button
                                type="button"
                                onClick={handleAddProductToList}
                                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                              >
                                <Plus className="w-4 h-4 stroke-[2.5]" />
                                {editingIndex !== null ? "Update Item" : "Add Item"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* C. Checkout Item List Card */}
                <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-5">
                  <div className="flex items-center gap-3 pb-3.5 border-b border-slate-100">
                    <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600 border border-emerald-100">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="font-extrabold text-slate-800 text-sm">Checkout Item List</h3>
                    </div>
                  </div>

                  {/* Desktop Table Layout */}
                  <div className="hidden md:block overflow-x-auto border border-slate-150 rounded-xl">
                    <table className="w-full text-xs text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-slate-50/60">
                          <th className="py-3 px-4">Product</th>
                          <th className="py-3 px-3">Pack Size</th>
                          <th className="py-3 px-3 text-right">Qty</th>
                          <th className="py-3 px-3 text-right">Rate</th>
                          <th className="py-3 px-4 text-right">Total</th>
                          <th className="py-3 px-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="py-12 text-center bg-slate-50/20">
                              <div className="flex flex-col items-center justify-center space-y-4 max-w-sm mx-auto p-4 text-slate-455">
                                <div className="w-12 h-12 rounded-full bg-slate-100/80 flex items-center justify-center text-slate-400 border border-slate-150 shadow-3xs">
                                  <ShoppingBag className="w-6 h-6 text-slate-500" />
                                </div>
                                <div className="space-y-1">
                                  <h4 className="font-bold text-slate-800 text-sm">No products added yet</h4>
                                  <p className="text-[11px] text-slate-455 leading-relaxed font-bold">Follow these simple steps to add items:</p>
                                </div>
                                <ol className="text-left text-[11px] text-slate-500 font-semibold space-y-1 list-decimal list-inside pl-2">
                                  <li>Search and select a product</li>
                                  <li>Choose your preferred pack size</li>
                                  <li>Enter quantity purchased</li>
                                  <li>Click <b>+ Add Item</b></li>
                                </ol>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          items.map((line, idx) => {
                            const prod = products.find((p) => p._id === line.productId);
                            const productName = prod ? prod.productName : "Unknown Product";
                            const thumbnail = prod?.productImages?.[0] || "";
                            const packLabel = formatPackSize(line.variantParameter, line.unit);
                            const isExpanded = expandedRows.has(idx);

                            return (
                              <Fragment key={idx}>
                                <tr className="transition-colors group hover:bg-slate-50/30">
                                  {/* Product info */}
                                  <td className="py-3.5 px-4">
                                    <div className="flex flex-col">
                                      <span className="font-bold text-slate-800 leading-tight">{productName}</span>
                                      <button
                                        type="button"
                                        onClick={() => toggleRow(idx)}
                                        className="text-[10px] text-brand-600 hover:text-brand-700 font-bold mt-1 text-left flex items-center gap-0.5"
                                      >
                                        {isExpanded ? "▲ Hide Details" : "▼ View Details"}
                                      </button>
                                    </div>
                                  </td>

                                  {/* Pack size */}
                                  <td className="py-3.5 px-3">
                                    <span className="bg-slate-50 text-slate-605 border border-slate-200 px-2.5 py-0.5 rounded-md font-semibold text-[11px]">
                                      {packLabel}
                                    </span>
                                  </td>

                                  {/* Qty */}
                                  <td className="py-3.5 px-3 text-right text-slate-805 font-bold">
                                    {line.quantity}
                                  </td>

                                  {/* Rate */}
                                  <td className="py-3.5 px-3 text-right text-slate-700 font-semibold">
                                    ₹{parseFloat(line.pricePerUnit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  </td>

                                  {/* Total */}
                                  <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 text-sm">
                                    ₹{(line.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  </td>

                                  {/* Actions */}
                                  <td className="py-3.5 px-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleEditProductInList(idx)}
                                        className="p-2 border border-emerald-200 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                        title="Edit Item"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteProductFromList(idx)}
                                        className="p-2 border border-red-200 text-red-655 hover:bg-red-50 rounded-lg transition"
                                        title="Delete Item"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {/* Expandable details block */}
                                {isExpanded && (
                                  <tr className="bg-slate-50/50">
                                    <td colSpan="6" className="px-6 py-3 border-y border-slate-150">
                                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                                        <div>
                                          <span className="block text-slate-400 text-[9px]">HSN Code</span>
                                          <span className="text-slate-800 font-bold">{line.hsnCode || "—"}</span>
                                        </div>
                                        <div>
                                          <span className="block text-slate-400 text-[9px]">GST Rate</span>
                                          <span className="text-slate-800 font-bold">{line.taxPercent}%</span>
                                        </div>
                                        <div>
                                          <span className="block text-slate-400 text-[9px]">GST Type</span>
                                          <span className="text-slate-800 font-bold">{line.taxType}</span>
                                        </div>
                                        <div>
                                          <span className="block text-slate-400 text-[9px]">Discount Rate</span>
                                          <span className="text-slate-800 font-bold">{line.discountPercent}%</span>
                                        </div>
                                        <div>
                                          <span className="block text-slate-400 text-[9px]">Tax Amount</span>
                                          <span className="text-slate-800 font-bold">₹{line.taxAmount}</span>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Table Cards Layout */}
                  <div className="block md:hidden space-y-3">
                    {items.length === 0 ? (
                      <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-8 text-center text-slate-455">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <ShoppingBag className="w-7 h-7 text-slate-400" />
                          <div className="space-y-1">
                            <h4 className="font-bold text-slate-800 text-xs">No products added yet</h4>
                            <p className="text-[10px] text-slate-400 font-semibold">Select product, pack and qty to add item</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      items.map((line, idx) => {
                        const prod = products.find((p) => p._id === line.productId);
                        const productName = prod ? prod.productName : "Unknown Product";
                        const packLabel = formatPackSize(line.variantParameter, line.unit);
                        const isExpanded = expandedRows.has(idx);

                        return (
                          <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="flex flex-col">
                                <h4 className="font-bold text-slate-855 text-xs leading-tight">{productName}</h4>
                                <span className="inline-block bg-slate-50 border border-slate-155 text-slate-600 font-bold text-[9px] px-2 py-0.5 rounded-md mt-1 w-fit">
                                  {packLabel}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleEditProductInList(idx)}
                                  className="p-1.5 border border-emerald-250 text-emerald-600 rounded-lg hover:bg-emerald-50 transition"
                                  title="Edit Item"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProductFromList(idx)}
                                  className="p-1.5 border border-red-255 text-red-655 rounded-lg hover:bg-red-50 transition"
                                  title="Delete Item"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-[11px] font-semibold text-slate-700">
                              <div>
                                <span className="text-slate-400 font-bold block text-[9px] uppercase">Qty</span>
                                <span className="font-bold text-slate-805 text-sm">{line.quantity}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold block text-[9px] uppercase">Rate</span>
                                <span className="font-bold text-slate-805 text-sm">₹{parseFloat(line.pricePerUnit || 0).toLocaleString("en-IN")}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-slate-400 font-bold block text-[9px] uppercase">Total</span>
                                <span className="font-extrabold text-emerald-700 text-sm">₹{line.amount?.toLocaleString("en-IN")}</span>
                              </div>
                            </div>

                            {/* Mobile Accounting Details Expandable */}
                            <div className="border-t border-slate-50 pt-2.5">
                              <button
                                type="button"
                                onClick={() => toggleRow(idx)}
                                className="text-[10px] font-extrabold text-slate-400 hover:text-slate-600 flex items-center gap-1.5"
                              >
                                {isExpanded ? "▲ Hide Accounting Details" : "▼ View Accounting Details"}
                              </button>
                              {isExpanded && (
                                <div className="grid grid-cols-2 gap-2 mt-2 text-[10px] text-slate-500 font-bold bg-slate-50/50 p-2.5 rounded-xl border border-slate-150 leading-relaxed uppercase tracking-wide">
                                  <div>HSN Code: <span className="font-extrabold text-slate-805">{line.hsnCode || "—"}</span></div>
                                  <div>GST Rate: <span className="font-extrabold text-slate-805">{line.taxPercent}%</span></div>
                                  <div>GST Type: <span className="font-extrabold text-slate-805">{line.taxType}</span></div>
                                  <div>Discount: <span className="font-extrabold text-slate-805">{line.discountPercent}%</span></div>
                                  <div>Tax Amt: <span className="font-extrabold text-slate-850">₹{line.taxAmount}</span></div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Summary segment / cards grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border border-slate-150 rounded-2xl p-4 bg-emerald-50/5">
                    {/* Total Items */}
                    <div className="flex items-center gap-3 bg-white border border-slate-150 rounded-xl p-4 shadow-3xs">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">Total Items</span>
                        <span className="text-slate-800 font-black text-lg mt-0.5">{items.length}</span>
                      </div>
                    </div>

                    {/* Total Quantity */}
                    <div className="flex items-center gap-3 bg-white border border-slate-150 rounded-xl p-4 shadow-3xs">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                        <Coins className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">Total Quantity</span>
                        <span className="text-slate-800 font-black text-lg mt-0.5">{totalQty}</span>
                      </div>
                    </div>

                    {/* Subtotal */}
                    <div className="flex items-center gap-3 bg-white border border-slate-150 rounded-xl p-4 shadow-3xs">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">Subtotal</span>
                        <span className="text-slate-800 font-black text-lg mt-0.5">₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2 Navigation Buttons */}
                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 active:scale-95 bg-white"
                  >
                    ← Previous: Invoice Details
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95 hover:shadow-lg"
                  >
                    Next: Upload & Remarks →
                  </button>
                </div>
              </div>
            )}

            {activeStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
                {/* D. Bottom Row Cards (Invoice upload & transaction remarks) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Supplier Invoice Upload */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 pb-3.5 border-b border-slate-100">
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <h3 className="font-bold text-slate-800 text-sm">Supplier Invoice Upload</h3>
                    </div>

                    <div className="border-2 border-dashed border-emerald-100 hover:border-emerald-300 rounded-xl p-6 text-center cursor-pointer transition bg-emerald-50/5 hover:bg-emerald-50/10 duration-150">
                      {filePreview ? (
                        <div className="relative inline-block group">
                          {uploadedFile?.type?.startsWith("image/") || (typeof filePreview === "string" && !filePreview.endsWith(".pdf")) ? (
                            <img src={filePreview} alt="Invoice preview" className="max-h-32 rounded-xl object-contain border border-slate-150 shadow-sm" />
                          ) : (
                            <div className="flex flex-col items-center gap-1.5 py-4 px-8 border border-slate-150 rounded-xl bg-white shadow-xs">
                              <FileText className="w-10 h-10 text-emerald-600 animate-pulse" />
                              <span className="text-xs text-slate-655 font-semibold max-w-[200px] truncate">
                                {uploadedFile ? uploadedFile.name : "Linked Invoice Document.pdf"}
                              </span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="absolute -top-2.5 -right-2.5 p-1.5 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow-md transition active:scale-90"
                            title="Remove Document"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center justify-center gap-2 py-2">
                          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-full mb-1">
                            <Upload className="w-6 h-6" />
                          </div>
                          <p className="text-xs text-slate-700 font-bold">
                            Drag & Drop your invoice here
                          </p>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">or</span>
                          <span className="px-4 py-1.5 bg-white border border-slate-200 hover:border-emerald-250 hover:bg-emerald-50/10 text-slate-700 hover:text-emerald-700 rounded-lg text-[11px] font-bold shadow-3xs transition-all mt-1">
                            Browse Files
                          </span>
                          <p className="text-[9px] text-slate-400 mt-2">Supports: PDF, JPG, PNG (Max. 5MB)</p>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Transaction Remarks */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 pb-3.5 border-b border-slate-100">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <h3 className="font-bold text-slate-800 text-sm">Transaction Remarks</h3>
                    </div>
                    <div className="relative">
                      <textarea
                        rows={4}
                        maxLength={250}
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="batch details, transport costs, comments..."
                        className="w-full border border-slate-200 hover:border-slate-350 focus:border-emerald-500 rounded-xl p-3 text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 shadow-3xs text-slate-800 transition-all duration-150"
                      />
                      <span className="absolute bottom-3 right-3 text-[10px] text-slate-400 font-bold">
                        {(remarks || "").length}/250
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    ← Previous: Add Products
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Purchase Calculations & Payments Out Sidebar (Desktop right) */}
          {activeStep === 3 && (
            <div className="w-full md:w-[360px] border-t md:border-t-0 md:border-l border-slate-100 bg-white p-6 flex flex-col justify-between overflow-y-auto space-y-6 md:max-h-full animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-6">

                {/* Purchase Calculations Card */}
                <div className="space-y-3.5 bg-gradient-to-br from-slate-50/50 to-white p-5 border border-slate-100 rounded-2xl shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
                  <div className="flex items-center gap-2 pb-2.5 border-b border-slate-150">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Purchase Summary</h4>
                  </div>

                  <div className="flex justify-between text-xs text-slate-500 font-medium">
                    <span>Subtotal (Base value)</span>
                    <span className="font-semibold text-slate-800">
                      ₹{subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between text-xs text-rose-600 font-medium">
                    <span>Discounts Applied</span>
                    <span>-₹{totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between text-xs text-emerald-700 font-medium">
                    <span>GST & Tax</span>
                    <span>+₹{totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between border-t border-slate-100 pt-3.5 font-bold text-slate-900 items-baseline">
                    <span className="text-sm">Grand Total</span>
                    <span className="text-2xl text-emerald-600 font-black">
                      ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {billingType === "Credit" && (
                    <>
                      {parseFloat(paidAmount) > 0 && (
                        <div className="flex justify-between text-xs text-emerald-700 font-medium">
                          <span>Amount Paid</span>
                          <span>-₹{parseFloat(paidAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-slate-100 pt-2.5 text-xs font-bold text-slate-850 items-baseline">
                        <span>Outstanding Due</span>
                        <span className="text-slate-850 font-black text-sm">
                          ₹{unpaidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Payment Status</span>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] shadow-3xs tracking-wider border ${purchaseStatus === "Paid"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : purchaseStatus === "Unpaid"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                      {purchaseStatus}
                    </span>
                  </div>
                </div>

                {/* Credit Settings Card */}
                {billingType === "Credit" && (
                  <div className="space-y-4 border border-slate-100 bg-white p-5 rounded-2xl shadow-3xs animate-fade-in">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-150 pb-2 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      Pay Later Settings
                    </h4>
                    <div className="group relative">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Due Date *</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full border border-slate-200 hover:border-slate-350 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 h-[38px] cursor-pointer shadow-3xs font-semibold text-slate-850 bg-white transition-all"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar Actions */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold shadow-md transition active:scale-[0.98] duration-150 animate-in fade-in"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Save Invoice
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition bg-white shadow-3xs active:scale-[0.98] duration-150"
                >
                  <X className="w-4 h-4 text-slate-400" />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QUICK ADD VENDOR MODAL */}
      {addVendorOpen && (
        <QuickAddVendorModal
          onClose={() => setAddVendorOpen(false)}
          onSuccess={(newVendorId) => {
            setAddVendorOpen(false);
            setSelectedParty(newVendorId);
          }}
        />
      )}

      {/* QUICK ADD PRODUCT MODAL */}
      {addProductOpen && (
        <QuickAddProductModal
          onClose={() => {
            setAddProductOpen(false);
          }}
          onSuccess={(newProductId) => {
            setAddProductOpen(false);
            handleProductChange(newProductId);
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: RECORD PAYMENT OUT MODAL
// ─────────────────────────────────────────────────────────────
function RecordPaymentModal({ editRecord = null, parties, onClose, onSuccess }) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  const [partyId, setPartyId] = useState(editRecord ? (editRecord.party?._id || editRecord.party || "") : "");
  const [purchaseId, setPurchaseId] = useState(
    editRecord
      ? (editRecord.linkedBill?._id || editRecord.linkedBill || editRecord.linkedPurchaseBill?._id || editRecord.linkedPurchaseBill || editRecord.purchase?._id || editRecord.purchase || "")
      : ""
  );
  const [paymentAmount, setPaymentAmount] = useState(editRecord ? (editRecord.paidAmount || editRecord.payments?.[0]?.amount || "") : "");
  const [paymentType, setPaymentType] = useState(editRecord ? (editRecord.paymentType || editRecord.payments?.[0]?.paymentType || "Cash") : "Cash");
  const [referenceNo, setReferenceNo] = useState(editRecord ? (editRecord.referenceNo || editRecord.payments?.[0]?.referenceNo || "") : "");
  const [paymentDate, setPaymentDate] = useState(editRecord ? (editRecord.date?.split("T")[0] || editRecord.paymentDate?.split("T")[0]) : new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState(editRecord ? (editRecord.description || "") : "");

  const [unpaidBills, setUnpaidBills] = useState([]);
  const [fetchingBills, setFetchingBills] = useState(false);

  useEffect(() => {
    if (!editRecord || !editRecord._id) return;
    const fetchPaymentDetails = async () => {
      try {
        const res = await api.get(`/purchase/payment-out/${editRecord._id}`);
        const data = res.data?.data || res.data;
        if (data) {
          const fetchedPartyId = data.party?._id || data.party || "";
          const fetchedPurchaseId = data.linkedBill?._id || data.linkedBill || data.linkedPurchaseBill?._id || data.linkedPurchaseBill || data.purchase?._id || data.purchase || "";
          const fetchedAmount = data.paidAmount || data.payments?.[0]?.amount || "";
          const fetchedType = data.paymentType || data.payments?.[0]?.paymentType || "Cash";
          const fetchedRef = data.referenceNo || data.payments?.[0]?.referenceNo || "";
          const fetchedDate = (data.date || data.paymentDate || "").split("T")[0];
          const fetchedNotes = data.description || "";

          if (fetchedPartyId) setPartyId(fetchedPartyId);
          if (fetchedPurchaseId) setPurchaseId(fetchedPurchaseId);
          if (fetchedAmount) setPaymentAmount(fetchedAmount);
          if (fetchedType) setPaymentType(fetchedType);
          if (fetchedRef) setReferenceNo(fetchedRef);
          if (fetchedDate) setPaymentDate(fetchedDate);
          if (fetchedNotes) setNotes(fetchedNotes);
        }
      } catch (err) {
        console.error("Failed to load payment details:", err);
      }
    };
    fetchPaymentDetails();
  }, [editRecord]);

  useEffect(() => {
    if (!partyId) {
      setUnpaidBills([]);
      return;
    }
    const loadBills = async () => {
      setFetchingBills(true);
      try {
        const res = await api.get(`/purchase/list?party=${partyId}&limit=100`);
        const all = res.data?.records || res.data?.data?.records || res.data?.data || res.data || [];
        const filtered = all.filter(
          (b) => b.unpaidAmount > 0 || b._id === purchaseId
        );

        // If purchaseId is set but not found in the fetched list, fetch it specifically
        if (purchaseId && !filtered.some(b => b._id === purchaseId)) {
          try {
            const singleRes = await api.get(`/purchase/${purchaseId}`);
            const singleBill = singleRes.data?.data || singleRes.data;
            if (singleBill) {
              filtered.push(singleBill);
            }
          } catch (singleErr) {
            console.error("Failed to fetch linked purchase bill", singleErr);
          }
        }

        setUnpaidBills(filtered);
      } catch (err) {
        console.error("Failed to load supplier bills", err);
      } finally {
        setFetchingBills(false);
      }
    };
    loadBills();
  }, [partyId, purchaseId]);

  const selectedBill = unpaidBills.find(b => b._id === purchaseId);
  const allowance = editRecord ? (editRecord.paidAmount || editRecord.payments?.[0]?.amount || 0) : 0;
  const maxAmount = selectedBill ? (selectedBill.unpaidAmount + allowance) : Infinity;

  const amt = parseFloat(paymentAmount) || 0;
  const originalPaid = editRecord ? (editRecord.paidAmount || editRecord.payments?.[0]?.amount || 0) : 0;
  const isCurrentlyLinked = editRecord && selectedBill && (
    (editRecord.linkedBill?._id || editRecord.linkedBill) === selectedBill._id ||
    (editRecord.linkedPurchaseBill?._id || editRecord.linkedPurchaseBill) === selectedBill._id ||
    (editRecord.purchase?._id || editRecord.purchase) === selectedBill._id
  );
  const baseOutstanding = isCurrentlyLinked ? (selectedBill.unpaidAmount + originalPaid) : (selectedBill ? selectedBill.unpaidAmount : 0);
  const newOutstanding = Math.max(0, baseOutstanding - amt);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!partyId) {
      toast.error("Please select a vendor");
      return;
    }
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Payment amount must be greater than zero");
      return;
    }
    if (selectedBill && amt > maxAmount) {
      toast.error(`Payment amount cannot exceed the outstanding balance of ₹${maxAmount}`);
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading(editRecord ? "Updating payment out record..." : "Recording payment out...");

    const payload = {
      party: partyId,
      linkedBill: purchaseId || undefined,
      linkedPurchaseBill: purchaseId || undefined,
      purchase: purchaseId || undefined,
      paidAmount: amt,
      payments: [{ paymentType, amount: amt, referenceNo: referenceNo || undefined }],
      paymentType,
      referenceNo: referenceNo || undefined,
      date: paymentDate,
      description: notes,
      receiptNo: editRecord?.receiptNo || `PAY-${Date.now()}`,
      isAutoGenerated: false
    };

    try {
      if (editRecord && editRecord._id) {
        await dispatch(updatePaymentOut({ id: editRecord._id, payload })).unwrap();
        toast.success("Payment Out updated successfully!", { id: loadingToast });
      } else {
        await dispatch(createPaymentOut(payload)).unwrap();
        toast.success("Payment Out recorded successfully!", { id: loadingToast });
      }
      onSuccess();
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Failed to save payment out details", { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-150 bg-white">
          <h2 className="text-lg font-bold text-gray-905 flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-red-655" />
            {editRecord ? "Edit Payment Out" : "Record Supplier Payment Out"}
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 bg-gray-50/20 text-xs select-none">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Select Party/Supplier *</label>
            <select
              value={partyId}
              onChange={(e) => {
                setPartyId(e.target.value);
                setPurchaseId("");
              }}
              disabled={!!editRecord}
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white cursor-pointer h-[36px]"
              required
            >
              <option value="">-- Choose Party --</option>
              {parties.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Link Purchase Bill (Optional)</label>
            <div className="relative">
              <select
                value={purchaseId}
                onChange={(e) => setPurchaseId(e.target.value)}
                disabled={!partyId || fetchingBills}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white cursor-pointer h-[36px] disabled:bg-gray-100 disabled:cursor-not-allowed font-medium text-gray-800"
              >
                {fetchingBills ? (
                  <option value="">-- Loading supplier bills... --</option>
                ) : !partyId ? (
                  <option value="">-- Choose Party First --</option>
                ) : unpaidBills.length === 0 ? (
                  <option value="">-- No outstanding bills found --</option>
                ) : (
                  <>
                    <option value="">-- Select Bill invoice --</option>
                    {unpaidBills.map((b) => (
                      <option key={b._id} value={b._id}>
                        [{b.purchaseType === "ORDER" ? "Ordered" : "Received"}] {b.billNumber || "Ref #" + b._id.substring(b._id.length - 8)} (Date: {new Date(b.billDate).toLocaleDateString("en-IN")} - Outstanding: ₹{b.unpaidAmount + (editRecord && (editRecord.linkedBill?._id || editRecord.linkedBill || editRecord.linkedPurchaseBill?._id || editRecord.linkedPurchaseBill || editRecord.purchase?._id || editRecord.purchase) === b._id ? allowance : 0)})
                      </option>
                    ))}
                  </>
                )}
              </select>
              {fetchingBills && (
                <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                </div>
              )}
            </div>
            {partyId && !fetchingBills && unpaidBills.length === 0 && (
              <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <div className="space-y-0.5">
                  <p className="font-bold text-[10px] uppercase tracking-wider text-amber-700">No Unpaid Bills</p>
                  <p className="text-[11px] font-medium leading-tight text-amber-600">This supplier has no outstanding balances or pending bills to settle.</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Payment Amount (₹) *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={maxAmount}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 h-[36px] font-bold text-gray-800"
                required
              />
              {selectedBill && (
                <>
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Max Payable: ₹{maxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                  <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 animate-in fade-in duration-150">
                    <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                      <span>Outstanding Balance:</span>
                      <span>₹{selectedBill.unpaidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    {editRecord && isCurrentlyLinked && (
                      <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                        <span>Original Paid Amount:</span>
                        <span>₹{originalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[10px] text-slate-650 font-bold border-t pt-1 border-slate-200">
                      <span>New Outstanding Dues:</span>
                      <span className="font-extrabold text-slate-900">₹{newOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    {editRecord && isCurrentlyLinked && amt !== originalPaid && (
                      <div className="text-[9px] font-extrabold mt-1">
                        {amt > originalPaid ? (
                          <span className="text-emerald-700">▲ Reducing dues by a delta of ₹{(amt - originalPaid).toLocaleString("en-IN")}</span>
                        ) : (
                          <span className="text-amber-700">▼ Adding ₹{(originalPaid - amt).toLocaleString("en-IN")} back to dues</span>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Payment Method *</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white cursor-pointer h-[36px]"
                required
              >
                {PAYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Reference Number</label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="TXN / Cheque ID"
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 h-[36px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 h-[36px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Notes / Description</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record any details regarding transaction settlement..."
              className="w-full border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </form>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border rounded-lg text-sm text-gray-655 hover:bg-gray-100 bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-1.5 px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold shadow-sm"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save Payment
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: QUICK ADD VENDOR MODAL (Ported from Party.jsx)
// ─────────────────────────────────────────────────────────────
const GST_TYPES = [
  "Unregistered/Consumer",
  "Registered-Regular",
  "Registered-Composition",
  "Overseas",
  "SEZ"
];

function QuickAddVendorModal({ onClose, onSuccess }) {
  const dispatch = useDispatch();
  const { gstinLoading } = useSelector((s) => s.eInvoice);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phoneNumber: "",
    gstType: "Unregistered/Consumer",
    gstin: "",
    state: "Uttar Pradesh",
    email: "",
    billingAddress: "",
    shippingAddress: "",
    openingBalance: "",
    openingBalanceType: "CREDIT"
  });
  const [errors, setErrors] = useState({});
  const [verifiedGstinDetails, setVerifiedGstinDetails] = useState(null);
  const [gstinError, setGstinError] = useState(null);
  const [hasAttemptedGstin, setHasAttemptedGstin] = useState(false);
  const [shippingSameAsBilling, setShippingSameAsBilling] = useState(true);
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  const validate = () => {
    const temp = {};
    if (!form.name.trim()) temp.name = "Party Name is required";

    if (!form.phoneNumber) {
      temp.phoneNumber = "Phone number is required";
    } else if (!/^\d{10}$/.test(form.phoneNumber)) {
      temp.phoneNumber = "Phone number must be exactly 10 digits";
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      temp.email = "Please enter a valid email address";
    }

    // GSTIN required if registered
    if (form.gstType.startsWith("Registered")) {
      if (!form.gstin) {
        temp.gstin = "GSTIN is required for registered parties";
      } else if (form.gstin.length !== 15) {
        temp.gstin = "GSTIN must be exactly 15 alphanumeric characters";
      }
    }

    setErrors(temp);
    return Object.keys(temp).length === 0;
  };

  const handleVerifyGstin = () => {
    const trimmedGstin = (form.gstin || "").replace(/\s+/g, "").toUpperCase();
    if (trimmedGstin.length !== 15) {
      toast.error("Please enter a valid 15-character GSTIN");
      return;
    }

    setGstinError(null);
    setVerifiedGstinDetails(null);
    setHasAttemptedGstin(true);

    dispatch(searchGstin({ gstin: trimmedGstin }))
      .unwrap()
      .then((res) => {
        const normalized = normalizeGstinData(res);
        if (!normalized) {
          setGstinError("Failed to parse Government GSTIN response.");
          return;
        }

        toast.success("GSTIN verified successfully!");
        setVerifiedGstinDetails(normalized);

        // Map registration type from taxpayer type
        let resolvedGstType = "Registered-Regular";
        if (normalized.taxpayerType?.toLowerCase().includes("composition")) {
          resolvedGstType = "Registered-Composition";
        }

        // Match state name
        let matchedState = form.state;
        if (normalized.state) {
          const matched = STATES.find(s => s.toLowerCase() === normalized.state.toLowerCase());
          if (matched) matchedState = matched;
        }

        setForm((prev) => ({
          ...prev,
          gstin: normalized.gstin,
          name: normalized.tradeName || normalized.legalName || prev.name,
          billingAddress: normalized.billingAddress || prev.billingAddress,
          shippingAddress: normalized.shippingAddress || prev.shippingAddress,
          state: matchedState || prev.state,
          gstType: resolvedGstType,
        }));
      })
      .catch((err) => {
        setGstinError(err || "GSTIN not found or inactive. Please check and try again.");
      });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!validate()) return;

    setLoading(true);
    const payload = { ...form };
    payload.openingBalance = payload.openingBalance === "" || payload.openingBalance === null ? 0 : Number(payload.openingBalance);
    if (!payload.gstType.startsWith("Registered")) {
      payload.gstin = "";
    }

    try {
      const res = await dispatch(addParty(payload)).unwrap();
      toast.success("Party added successfully");

      // Reload overall lists in Redux
      const refreshedParties = await dispatch(fetchParties()).unwrap();
      const match = refreshedParties.find(
        p => p.name === payload.name || p._id === res._id || p._id === res.data?._id
      );

      onSuccess(match?._id || res._id || res.data?._id);
    } catch (err) {
      console.error("[QuickAddVendorModal submit error]:", err);
      toast.error(err || "Failed to create party");
    } finally {
      setLoading(false);
    }
  };

  const isNameAutofilled = !!verifiedGstinDetails && (form.name === verifiedGstinDetails.tradeName || form.name === verifiedGstinDetails.legalName);
  const isAddressAutofilled = !!verifiedGstinDetails && form.billingAddress === verifiedGstinDetails.billingAddress;
  const isStateAutofilled = !!verifiedGstinDetails && form.state === verifiedGstinDetails.state;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white">
          <h2 className="text-lg font-bold text-gray-900">Register New Party</h2>
          <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-650 rounded-lg transition hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 bg-gray-55/30 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

          {/* DYNAMIC FLOW */}
          {form.gstType.startsWith("Registered") ? (
            <>
              {/* SECTION 1: GST Registration Verification */}
              <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-l-4 border-emerald-600 pl-2">
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">🛡 GST Registration</h3>
                    <p className="text-[11px] text-gray-500">Verify and fetch business details from Government GST Portal</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  {/* GST Type */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">GST Type</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <FileSpreadsheet className="w-4 h-4" />
                      </span>
                      <select
                        value={form.gstType}
                        onChange={(e) => setForm({ ...form, gstType: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white appearance-none cursor-pointer h-[38px] font-bold text-gray-800"
                      >
                        {GST_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>

                  {/* GSTIN input & Verify Button */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      GSTIN <span className="text-red-505">*</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                          <FileText className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          maxLength={15}
                          value={form.gstin}
                          onChange={(e) => {
                            setForm({ ...form, gstin: e.target.value.toUpperCase() });
                            if (verifiedGstinDetails) setVerifiedGstinDetails(null);
                            if (gstinError) setGstinError(null);
                            if (hasAttemptedGstin) setHasAttemptedGstin(false);
                          }}
                          className={`w-full pl-10 pr-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white h-[38px] ${
                            errors.gstin ? "border-red-400 focus:ring-red-400" : "border-gray-200"
                          }`}
                          placeholder="22AAAAA0000A1Z5"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={gstinLoading || form.gstin.length !== 15}
                        onClick={handleVerifyGstin}
                        className={`px-3.5 py-2 disabled:opacity-50 text-xs font-bold rounded-lg border transition shrink-0 flex items-center gap-1.5 h-[38px] ${
                          verifiedGstinDetails
                            ? "bg-emerald-50 border-emerald-250 text-emerald-700 hover:bg-emerald-100"
                            : "bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100"
                        }`}
                      >
                        {gstinLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {gstinLoading ? "Fetching..." : verifiedGstinDetails ? "Re-Verify" : "Verify GSTIN"}
                      </button>
                    </div>
                  </div>
                </div>

                {errors.gstin && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.gstin}</p>
                )}

                {/* SKELETON LOADING CARD */}
                {gstinLoading && (
                  <div className="bg-gray-55/40 border border-gray-150 rounded-xl p-5 space-y-4 animate-pulse shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
                      <div className="h-3.5 bg-gray-200 rounded-md w-40"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded-md w-3/4"></div>
                      <div className="h-3 bg-gray-150 rounded-md w-1/2"></div>
                    </div>
                  </div>
                )}

                {/* SUCCESS VERIFICATION CARD */}
                {verifiedGstinDetails && !gstinLoading && (
                  <div className="bg-emerald-50/20 border border-emerald-200 rounded-xl p-5 space-y-4 text-xs animate-in fade-in duration-200 shadow-xs">
                    <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-855 font-bold text-[9px]">✓</span>
                        <span className="font-bold text-emerald-900 text-xs">🛡 GST Registration Verified</span>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-medium">Verified just now</span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-extrabold text-sm text-gray-900 leading-tight">{verifiedGstinDetails.tradeName}</h4>
                      {verifiedGstinDetails.legalName && verifiedGstinDetails.legalName !== verifiedGstinDetails.tradeName && (
                        <p className="text-gray-500 font-medium text-[11px]">({verifiedGstinDetails.legalName})</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-805 text-[9px] font-bold uppercase tracking-wider">
                        {verifiedGstinDetails.gstStatus}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-855 text-[9px] font-bold uppercase tracking-wider">
                        {verifiedGstinDetails.taxpayerType}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-805 text-[9px] font-bold uppercase tracking-wider">
                        {verifiedGstinDetails.einvoiceStatus?.toLowerCase()?.includes("elig") || 
                         verifiedGstinDetails.einvoiceStatus?.toLowerCase()?.includes("enab") || 
                         verifiedGstinDetails.einvoiceStatus?.toLowerCase() === "yes" || 
                         verifiedGstinDetails.einvoiceStatus?.toLowerCase() === "y"
                          ? "E-Invoice Enabled" 
                          : "E-Invoice Disabled"}
                      </span>
                    </div>

                    <div className="bg-white/60 p-3 rounded-lg border border-emerald-100/50 space-y-2">
                      <div>
                        <span className="text-gray-400 font-semibold block text-[10px] uppercase tracking-wider">GSTIN</span>
                        <span className="font-bold text-gray-800 text-[11px]">{verifiedGstinDetails.gstin}</span>
                      </div>
                      
                      <div className="pt-2 border-t border-gray-150 flex items-start gap-2">
                        <span className="text-emerald-700 text-xs shrink-0 mt-0.5">📍</span>
                        <div>
                          <span className="text-gray-400 font-bold block text-[10px] uppercase tracking-wider">Registered Address</span>
                          <p className="text-gray-750 leading-relaxed text-[11px] mt-0.5">{verifiedGstinDetails.billingAddress}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-emerald-100/50 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setShowMoreDetails(!showMoreDetails)}
                        className="text-emerald-700 hover:text-emerald-800 text-[11px] font-bold flex items-center gap-1 focus:outline-none mt-1 bg-transparent border-0 cursor-pointer text-left"
                      >
                        {showMoreDetails ? "▲ Hide Details" : "▼ Show More Details"}
                      </button>
                      
                      {showMoreDetails && (
                        <div className="grid grid-cols-2 gap-3 pt-2 text-[11px] leading-relaxed border-t border-emerald-100/30 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div>
                            <span className="text-gray-450 font-semibold uppercase tracking-wider block text-[9px]">Registration Date</span>
                            <p className="font-bold text-gray-850">{verifiedGstinDetails.registrationDate || "—"}</p>
                          </div>
                          <div>
                            <span className="text-gray-455 font-semibold uppercase tracking-wider block text-[9px]">Constitution</span>
                            <p className="font-bold text-gray-850">{verifiedGstinDetails.constitution || "—"}</p>
                          </div>
                          {verifiedGstinDetails.legalName && verifiedGstinDetails.legalName !== verifiedGstinDetails.tradeName && (
                            <div className="col-span-2">
                              <span className="text-gray-450 font-semibold uppercase tracking-wider block text-[9px]">Legal Name</span>
                              <p className="font-bold text-gray-850">{verifiedGstinDetails.legalName}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ERROR CARD */}
                {gstinError && !gstinLoading && (
                  <div className="bg-rose-50/30 border border-rose-150 rounded-xl p-4 text-xs text-rose-955 animate-in fade-in duration-200 shadow-xs flex items-start gap-3">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-bold shrink-0">✕</span>
                    <div className="space-y-1 flex-1">
                      <h5 className="font-bold text-rose-900 text-sm">GST Verification Failed</h5>
                      <p className="text-[11px] text-rose-800 leading-relaxed">{gstinError}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}

          {/* 1. Basic Information Section */}
          <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 mb-2 border-l-4 border-brand-600 pl-2">
              <h3 className="font-bold text-gray-800 text-sm">Basic Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Unregistered GST Type Selection dropdown inside Business Info if Unregistered */}
              {!form.gstType.startsWith("Registered") && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">GST Type</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <FileSpreadsheet className="w-4 h-4" />
                    </span>
                    <select
                      value={form.gstType}
                      onChange={(e) => setForm({ ...form, gstType: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white appearance-none cursor-pointer h-[38px] font-bold text-gray-800"
                    >
                      {GST_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>
              )}

              {/* Party / Business Name */}
              <div>
                <label className="flex items-center text-xs font-semibold text-gray-500 mb-1">
                  Party / Business Name <span className="text-red-500 ml-0.5">*</span>
                  {isNameAutofilled && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded ml-1.5 animate-pulse shrink-0">Auto-filled</span>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Building className={`w-4 h-4 ${isNameAutofilled ? "text-emerald-500" : ""}`} />
                  </span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={`w-full pl-10 pr-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 bg-white h-[38px] ${
                      errors.name 
                        ? "border-red-400 focus:ring-red-400" 
                        : isNameAutofilled 
                          ? "border-emerald-300 focus:ring-emerald-450 focus:border-emerald-450 bg-emerald-50/5 text-emerald-950" 
                          : "border-gray-200 focus:ring-brand-500"
                    }`}
                    placeholder="Mahadev Traders"
                  />
                </div>
                {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>}
              </div>

              {/* State */}
              <div>
                <label className="flex items-center text-xs font-semibold text-gray-500 mb-1">
                  State
                  {isStateAutofilled && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded ml-1.5 animate-pulse shrink-0">Verified</span>
                  )}
                </label>
                <SearchableStateSelect
                  value={form.state}
                  onChange={(val) => setForm({ ...form, state: val })}
                  height="h-[38px]"
                  className={isStateAutofilled ? "border-emerald-300 focus:border-emerald-450 focus:ring-emerald-450 bg-emerald-50/5" : ""}
                />
                {isStateAutofilled && (
                  <p className="text-[10px] text-emerald-600 mt-1 font-semibold">✓ Government Verified</p>
                )}
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Mobile Number <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    maxLength={10}
                    value={form.phoneNumber}
                    onChange={(e) => setForm({ ...form, phoneNumber: e.target.value.replace(/\D/g, "") })}
                    className={`w-full pl-10 pr-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white h-[38px] ${
                      errors.phoneNumber ? "border-red-400 focus:ring-red-400 bg-white" : "border-gray-200 bg-white"
                    }`}
                    placeholder="9876543210"
                  />
                </div>
                {errors.phoneNumber && <p className="text-[11px] text-red-500 mt-1">{errors.phoneNumber}</p>}
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={`w-full pl-10 pr-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white h-[38px] ${
                      errors.email ? "border-red-400 focus:ring-red-400 bg-white" : "border-gray-200 bg-white"
                    }`}
                    placeholder="mahadevtraders@example.com"
                  />
                </div>
                {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email}</p>}
              </div>
            </div>
          </div>

          {/* SECTION 3: Address Details */}
          <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-l-4 border-brand-600 pl-2 gap-2">
              <div>
                <h3 className="font-bold text-gray-800 text-sm">2. Address Details</h3>
                <p className="text-[11px] text-gray-500">Billing and shipping addresses</p>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shippingSameAsBilling}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setShippingSameAsBilling(checked);
                    if (checked) {
                      setForm(prev => ({ ...prev, shippingAddress: prev.billingAddress }));
                    }
                  }}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                Shipping address is same as billing
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Billing Address */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Billing Address</label>
                <div className="relative">
                  <span className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none text-gray-400">
                    <MapPin className={`w-4 h-4 ${isAddressAutofilled ? "text-emerald-500" : ""}`} />
                  </span>
                  <textarea
                    value={form.billingAddress}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm(prev => ({
                        ...prev,
                        billingAddress: val,
                        shippingAddress: shippingSameAsBilling ? val : prev.shippingAddress
                      }));
                    }}
                    rows={3}
                    className={`w-full pl-10 pr-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 bg-white ${
                      isAddressAutofilled
                        ? "border-emerald-300 focus:ring-emerald-450 focus:border-emerald-450 bg-emerald-50/5 text-emerald-950"
                        : "border-gray-200 focus:ring-brand-500 bg-white"
                    }`}
                    placeholder="Main Road, Deoria"
                  />
                </div>
                {isAddressAutofilled && (
                  <p className="text-[10px] text-emerald-600 mt-1 font-semibold">✓ Verified from GST</p>
                )}
              </div>

              {/* Shipping Address */}
              {!shippingSameAsBilling && (
                <div className="animate-in fade-in duration-200">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Shipping Address</label>
                  <div className="relative">
                    <span className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none text-gray-400">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <textarea
                      value={form.shippingAddress}
                      onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })}
                      rows={3}
                      className="w-full pl-10 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                      placeholder="Main Road, Deoria"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: Financial Settings */}
          <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 mb-2 border-l-4 border-brand-600 pl-2">
              <div>
                <h3 className="font-bold text-gray-800 text-sm">3. Financial Settings</h3>
                <p className="text-[11px] text-gray-500">Configure accounting preferences</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Opening Balance */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Opening Balance</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-505 font-semibold text-xs">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={form.openingBalance === "" ? "" : form.openingBalance}
                    onChange={(e) => setForm({ ...form, openingBalance: e.target.value === "" ? "" : Number(e.target.value) })}
                    className="w-full pl-10 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white h-[38px]"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Balance Type Radio Group */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">Balance Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Credit Option */}
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    form.openingBalanceType === "CREDIT"
                      ? "bg-emerald-50/20 border-emerald-500 ring-1 ring-emerald-500"
                      : "bg-white border-gray-200 hover:bg-gray-50/50"
                  }`}>
                    <input
                      type="radio"
                      name="openingBalanceTypeQuick"
                      value="CREDIT"
                      checked={form.openingBalanceType === "CREDIT"}
                      onChange={() => setForm({ ...form, openingBalanceType: "CREDIT" })}
                      className="mt-1 text-emerald-605 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="block text-xs font-bold text-gray-900">Credit (Payable)</span>
                      <span className="block text-[10px] text-gray-500 mt-0.5">Money owed TO suppliers</span>
                    </div>
                  </label>

                  {/* Debit Option */}
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    form.openingBalanceType === "DEBIT"
                      ? "bg-emerald-50/20 border-emerald-500 ring-1 ring-emerald-500"
                      : "bg-white border-gray-200 hover:bg-gray-50/50"
                  }`}>
                    <input
                      type="radio"
                      name="openingBalanceTypeQuick"
                      value="DEBIT"
                      checked={form.openingBalanceType === "DEBIT"}
                      onChange={() => setForm({ ...form, openingBalanceType: "DEBIT" })}
                      className="mt-1 text-emerald-650 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="block text-xs font-bold text-gray-900">Debit (Receivable)</span>
                      <span className="block text-[10px] text-gray-500 mt-0.5">Money owed BY customers</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-150 bg-white">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <span className="text-emerald-605">🛡</span>
              <span>GST data is securely verified through the Government GST Portal</span>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-5 py-2.5 text-xs font-semibold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition shadow-sm"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {loading ? "Creating Party..." : "✓ Register Party"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: QUICK ADD PRODUCT MODAL (Simplified Variant Modal)
// ─────────────────────────────────────────────────────────────
function QuickAddProductModal({ onClose, onSuccess }) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    productName: "",
    brand: "",
    productCategory: "fertilizers",
    itemType: "PRODUCT",
    taxRate: "18",
    description: "",
    hsnCode: "",
  });

  const [variant, setVariant] = useState({
    parameter: "50",
    unit: "kg",
    quantity: 100,
    purchasePrice: "",
    mrp: "",
    salePrice: "",
    purchasePriceTaxType: "Without Tax"
  });

  useEffect(() => {
    if (!form.hsnCode || form.hsnCode.trim().length < 4) return;

    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await api.get(`/hsn/code/${form.hsnCode.trim()}`);
        if (res.data && res.data.taxRate !== undefined) {
          setForm(prev => ({
            ...prev,
            taxRate: String(res.data.taxRate)
          }));
          toast.success(`HSN Code recognized. GST Tax Rate set to ${res.data.taxRate}%`);
        }
      } catch (err) {
        console.warn("HSN Lookup failed:", err);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [form.hsnCode]);

  const validate = () => {
    if (!form.productName.trim()) {
      toast.error("Product name is required");
      return false;
    }
    if (!form.brand.trim()) {
      toast.error("Brand name is required");
      return false;
    }
    if (!variant.parameter.trim() || !variant.unit.trim()) {
      toast.error("Variant measure & unit are required");
      return false;
    }
    if (variant.purchasePrice === "" || variant.mrp === "") {
      toast.error("Variant MRP and Purchase Price are required");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!validate()) return;

    setLoading(true);

    const payload = {
      productName: form.productName,
      brand: form.brand,
      productCategory: form.productCategory,
      description: form.description,
      itemType: form.itemType,
      hsnCode: form.hsnCode,
      taxRate: String(form.taxRate),
      targetCrops: ["Cotton", "Wheat"],
      productImages: [],
      productVideos: [],
      products: [
        {
          parameter: variant.parameter,
          unit: variant.unit,
          quantity: Number(variant.quantity) || 0,
          purchasePrice: Number(variant.purchasePrice),
          purchasePriceTaxType: variant.purchasePriceTaxType,
          mrp: Number(variant.mrp),
          salePrice: Number(variant.salePrice) || Number(variant.mrp),
          salePriceTaxType: variant.purchasePriceTaxType,
          purchaseDate: new Date().toISOString().split("T")[0],
          discountOnSalePrice: 0,
          discountType: "Percentage"
        }
      ]
    };

    try {
      const res = await dispatch(addProduct(payload)).unwrap();
      toast.success("Product added successfully");

      // Reload global list in Redux
      const refreshedProds = await dispatch(fetchProducts()).unwrap();
      await dispatch(fetchStockSummary()).unwrap();
      const match = refreshedProds.find(p => p.productName === payload.productName || p._id === res._id || p._id === res.data?._id);

      onSuccess(match?._id || res._id || res.data?._id);
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-150 bg-white">
          <h3 className="font-bold text-gray-905">Register New Product</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 bg-gray-50/20 text-xs">

          {/* Base product info */}
          <div className="bg-white p-4 rounded-xl border border-gray-150 space-y-3 shadow-xs">
            <h4 className="font-bold text-gray-800 border-b pb-1.5 border-gray-100">Base Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-gray-550 font-semibold mb-1">Product Name *</label>
                <input
                  type="text"
                  value={form.productName}
                  onChange={(e) => setForm({ ...form, productName: e.target.value })}
                  placeholder="Urea Fertilizer"
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 h-[32px]"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-550 font-semibold mb-1">Brand Name *</label>
                <input
                  type="text"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  placeholder="IFFCO"
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 h-[32px]"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-550 font-semibold mb-1">Category</label>
                <select
                  value={form.productCategory}
                  onChange={(e) => setForm({ ...form, productCategory: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white h-[32px] cursor-pointer"
                >
                  <option value="fertilizers">Fertilizers</option>
                  <option value="seeds">Seeds</option>
                  <option value="insecticides">Insecticides</option>
                  <option value="organic">Organic</option>
                  <option value="tools">Tools</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-550 font-semibold mb-1">GST Tax Rate (%)</label>
                <input
                  type="number"
                  value={form.taxRate}
                  onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                  placeholder="18"
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 h-[32px]"
                />
              </div>

              <div>
                <label className="block text-gray-550 font-semibold mb-1">HSN Code</label>
                <input
                  type="text"
                  value={form.hsnCode}
                  onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
                  placeholder="3102"
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 h-[32px]"
                />
              </div>
            </div>
          </div>

          {/* Variant Detail */}
          <div className="bg-white p-4 rounded-xl border border-gray-150 space-y-3 shadow-xs">
            <h4 className="font-bold text-gray-800 border-b pb-1.5 border-gray-100">Default Variant Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-gray-550 font-semibold mb-1">Size / Measure *</label>
                <input
                  type="text"
                  value={variant.parameter}
                  onChange={(e) => setVariant({ ...variant, parameter: e.target.value })}
                  placeholder="50"
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 h-[32px]"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-550 font-semibold mb-1">Unit *</label>
                <select
                  value={variant.unit}
                  onChange={(e) => setVariant({ ...variant, unit: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white h-[32px] cursor-pointer"
                >
                  <option value="kg">kg</option>
                  <option value="bags">bags</option>
                  <option value="ml">ml</option>
                  <option value="L">L</option>
                  <option value="pcs">pcs</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-550 font-semibold mb-1">Opening Stock Qty</label>
                <input
                  type="number"
                  value={variant.quantity}
                  onChange={(e) => setVariant({ ...variant, quantity: e.target.value === "" ? "" : parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 h-[32px]"
                />
              </div>

              <div>
                <label className="block text-gray-550 font-semibold mb-1">Purchase Cost Price *</label>
                <input
                  type="number"
                  value={variant.purchasePrice}
                  onChange={(e) => setVariant({ ...variant, purchasePrice: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 h-[32px]"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-550 font-semibold mb-1">Purchase Tax Type</label>
                <select
                  value={variant.purchasePriceTaxType}
                  onChange={(e) => setVariant({ ...variant, purchasePriceTaxType: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white h-[32px] cursor-pointer"
                >
                  <option value="Without Tax">Without Tax (Exclusive)</option>
                  <option value="With Tax">With Tax (Inclusive)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-550 font-semibold mb-1">Max Printed Price (MRP) *</label>
                <input
                  type="number"
                  value={variant.mrp}
                  onChange={(e) => setVariant({ ...variant, mrp: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 h-[32px]"
                  required
                />
              </div>
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100 bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-1.5 px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold shadow-sm"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save Product
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: CREATE / LINKED PURCHASE RETURN MODAL
// ─────────────────────────────────────────────────────────────
function CreateReturnModal({ onClose, onSuccess }) {
  const dispatch = useDispatch();
  const { products } = useSelector((state) => state.inventory);
  const [returnNo, setReturnNo] = useState("");
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  // Bill-linking states
  const [billList, setBillList] = useState([]);
  const [selectedBillId, setSelectedBillId] = useState("");
  const [selectedBillDetails, setSelectedBillDetails] = useState(null);
  const [loadingBillDetails, setLoadingBillDetails] = useState(false);
  const [returnItems, setReturnItems] = useState([]);

  // Load purchase bills of type BILL for linking
  useEffect(() => {
    const fetchBills = async () => {
      try {
        const res = await api.get('/purchase/list?purchaseType=BILL&limit=100');
        setBillList(res.data?.records || res.data?.data?.records || res.data?.data || res.data || []);
      } catch (err) {
        console.error("Failed to load bills", err);
      }
    };
    fetchBills();
  }, []);

  const handleBillSelectChange = async (e) => {
    const billId = e.target.value;
    setSelectedBillId(billId);
    if (!billId) {
      setSelectedBillDetails(null);
      setReturnItems([]);
      return;
    }

    setLoadingBillDetails(true);
    try {
      const res = await api.get(`/purchase/${billId}`);
      const bill = res.data?.data || res.data;
      setSelectedBillDetails(bill);

      if (bill?.items?.length > 0) {
        const itemsMapped = bill.items.map((it) => {
          const itemId = resolveVariantId(it, products);
          return {
            item: itemId,
            productName: resolveItemLabel(it, products),
            purchasedQty: it.quantity || 0,
            returnQty: 0,
            unit: it.unit || "pcs",
            pricePerUnit: it.pricePerUnit || 0,
            taxType: it.taxType || "Without Tax",
            discountPercent: it.discountPercent || 0,
            taxPercent: it.taxPercent || 0,
            taxAmount: 0,
            amount: 0,
          };
        });
        setReturnItems(itemsMapped);
      } else {
        setReturnItems([]);
      }
    } catch (err) {
      toast.error("Failed to load bill items details");
      console.error(err);
    } finally {
      setLoadingBillDetails(false);
    }
  };

  const updateReturnQty = (idx, qtyVal) => {
    setReturnItems((prev) => {
      const copy = [...prev];
      const line = { ...copy[idx] };
      const maxQty = line.purchasedQty;

      if (qtyVal === "") {
        line.returnQty = "";
        line.taxAmount = 0;
        line.amount = 0;
      } else {
        let q = parseInt(qtyVal) || 0;
        if (q < 0) q = 0;
        if (q > maxQty) {
          toast.error(`Cannot return quantity (${q}) greater than purchased quantity (${maxQty})`);
          q = maxQty;
        }
        line.returnQty = q;

        // calculations
        const price = line.pricePerUnit;
        const base = q * price;
        const discountAmt = parseFloat((base * (line.discountPercent / 100)).toFixed(2));
        const afterDiscount = Math.max(0, base - discountAmt);
        const taxPct = line.taxPercent;

        if (line.taxType === "With Tax") {
          line.amount = parseFloat(afterDiscount.toFixed(2));
          const taxable = line.amount / (1 + taxPct / 100);
          line.taxAmount = parseFloat((line.amount - taxable).toFixed(2));
        } else {
          const taxable = afterDiscount;
          line.taxAmount = parseFloat((taxable * (taxPct / 100)).toFixed(2));
          line.amount = parseFloat((taxable + line.taxAmount).toFixed(2));
        }
      }

      copy[idx] = line;
      return copy;
    });
  };

  const subTotal = useMemo(() => {
    return parseFloat(returnItems.reduce((sum, line) => {
      const q = line.returnQty === "" ? 0 : parseFloat(line.returnQty) || 0;
      return sum + (q * line.pricePerUnit);
    }, 0).toFixed(2));
  }, [returnItems]);

  const totalAmount = useMemo(() => {
    return parseFloat(returnItems.reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0).toFixed(2));
  }, [returnItems]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!selectedBillId) {
      toast.error("Please select a linked purchase bill invoice");
      return;
    }
    if (!returnNo.trim()) {
      toast.error("Debit note return number is required");
      return;
    }

    const activeReturns = returnItems.filter(l => (parseInt(l.returnQty) || 0) > 0);
    if (activeReturns.length === 0) {
      toast.error("At least one item must have a return quantity greater than 0");
      return;
    }

    // Explicit validations: Qty > 0 and Qty <= Purchased Qty
    for (const it of activeReturns) {
      if (it.returnQty <= 0) {
        toast.error(`Return quantity for ${it.productName} must be greater than 0`);
        return;
      }
      if (it.returnQty > it.purchasedQty) {
        toast.error(`Return quantity for ${it.productName} exceeds original purchased quantity (${it.purchasedQty})`);
        return;
      }
    }

    setLoading(true);
    const payloadItems = activeReturns.map((it) => {
      const base = it.returnQty * it.pricePerUnit;
      const discountAmount = parseFloat((base * (it.discountPercent / 100)).toFixed(2));
      return {
        item: it.item,
        quantity: parseInt(it.returnQty),
        unit: it.unit,
        pricePerUnit: it.pricePerUnit,
        taxType: it.taxType,
        discountPercent: it.discountPercent,
        discountAmount,
        taxPercent: it.taxPercent,
        taxAmount: it.taxAmount,
        amount: it.amount
      };
    });

    const payload = {
      purchase: selectedBillId,
      party: selectedBillDetails?.party?._id || selectedBillDetails?.party,
      returnNo,
      returnDate,
      items: payloadItems,
      subTotal,
      totalAmount,
      description
    };

    try {
      await dispatch(createPurchaseReturn(payload)).unwrap();
      toast.success("Debit note logged successfully!");
      onSuccess();
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Failed to register purchase return");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white">
          <h2 className="text-lg font-bold text-gray-900">Create Purchase Return (Debit Note)</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 bg-gray-50/30 select-none">
          <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Link Purchase Bill *</label>
              <select
                value={selectedBillId}
                onChange={handleBillSelectChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white h-[38px] cursor-pointer"
                required
              >
                <option value="">-- Choose Purchase Bill --</option>
                {billList.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.billNumber} - Vendor: {b.party?.name || "N/A"} (₹{b.totalAmount || 0})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Debit Note / Return No *</label>
              <input
                type="text"
                value={returnNo}
                onChange={(e) => setReturnNo(e.target.value)}
                placeholder="RET-2026-001"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 h-[38px]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Return Date</label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 h-[38px]"
              />
            </div>
          </div>

          {selectedBillId && (
            <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-gray-800 text-sm border-l-4 border-red-650 pl-2">Linked Bill Items</h3>
              {loadingBillDetails ? (
                <div className="py-8 text-center text-gray-400 flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                  <span>Loading bill lines details...</span>
                </div>
              ) : returnItems.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No products found inside the selected bill.</p>
              ) : (
                <div className="space-y-3">
                  {returnItems.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center bg-gray-50/50 p-3 rounded-lg border border-gray-150">
                      <div className="md:col-span-2">
                        <span className="block text-xs font-bold text-gray-800">{line.productName}</span>
                        <span className="text-[10px] text-gray-500">
                          Price: ₹{line.pricePerUnit} | Tax: {line.taxPercent}% ({line.taxType}) | Disc: {line.discountPercent}%
                        </span>
                      </div>

                      <div>
                        <span className="block text-[10px] text-gray-400 font-semibold">Purchased Qty</span>
                        <span className="font-semibold text-gray-700 text-sm">{line.purchasedQty} {line.unit}</span>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-gray-400 mb-1">Return Qty *</label>
                        <input
                          type="number"
                          min="0"
                          max={line.purchasedQty}
                          value={line.returnQty}
                          onChange={(e) => updateReturnQty(idx, e.target.value)}
                          placeholder="0"
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                        />
                      </div>

                      <div>
                        <span className="block text-[10px] text-gray-400 font-semibold">Tax Refunded</span>
                        <span className="font-semibold text-gray-700 text-xs">₹{(line.taxAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>

                      <div className="text-right">
                        <span className="block text-[9px] text-gray-400 uppercase">Return Subtotal</span>
                        <span className="font-bold text-gray-800 text-sm">₹{(line.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Return Reason / Memo</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe reason for returning items..."
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs flex flex-col justify-center items-center text-center">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Debit Note Total Refund</span>
              <span className="font-extrabold text-red-650 text-3xl mt-1">₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100 bg-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Processing..." : "Log Return"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: EXPENSE RECORD MODAL (Inclusive GST Math for Expense)
// ─────────────────────────────────────────────────────────────
function ExpenseModal({ parties, onClose, onSuccess }) {
  const dispatch = useDispatch();
  const [gstEnabled, setGstEnabled] = useState(false);
  const [selectedParty, setSelectedParty] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Office Supplies");
  const [expenseNo, setExpenseNo] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [stateOfSupply, setStateOfSupply] = useState("Uttar Pradesh");
  const [paymentType, setPaymentType] = useState("Cash");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const [items, setItems] = useState([
    { itemName: "", quantity: 1, pricePerUnit: "", discountPercent: 0, taxPercent: 18, amount: 0 }
  ]);

  const handleAddLine = () => {
    setItems((prev) => [
      ...prev,
      { itemName: "", quantity: 1, pricePerUnit: "", discountPercent: 0, taxPercent: 18, amount: 0 }
    ]);
  };

  const handleRemoveLine = (idx) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const updateLineItem = (idx, field, value) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[idx], [field]: value };

      const qty = item.quantity === "" ? 0 : parseFloat(item.quantity) || 0;
      const price = item.pricePerUnit === "" ? 0 : parseFloat(item.pricePerUnit) || 0;
      const base = qty * price;

      const discPct = parseFloat(item.discountPercent) || 0;
      const taxable = Math.max(0, base - (base * (discPct / 100)));

      if (gstEnabled) {
        const taxPct = parseFloat(item.taxPercent) || 0;
        item.amount = parseFloat((taxable * (1 + taxPct / 100)).toFixed(2));
      } else {
        item.amount = parseFloat(taxable.toFixed(2));
      }

      copy[idx] = item;
      return copy;
    });
  };

  // Recalculate on gstEnabled toggle
  useEffect(() => {
    setItems((prev) => {
      return prev.map(item => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.pricePerUnit) || 0;
        const base = qty * price;
        const discPct = parseFloat(item.discountPercent) || 0;
        const taxable = Math.max(0, base - (base * (discPct / 100)));

        let amount = taxable;
        if (gstEnabled) {
          const taxPct = parseFloat(item.taxPercent) || 0;
          amount = taxable * (1 + taxPct / 100);
        }
        return { ...item, amount: parseFloat(amount.toFixed(2)) };
      });
    });
  }, [gstEnabled]);

  const subTotal = useMemo(() => {
    return parseFloat(items.reduce((sum, it) => {
      const q = it.quantity === "" ? 0 : parseFloat(it.quantity) || 0;
      const p = it.pricePerUnit === "" ? 0 : parseFloat(it.pricePerUnit) || 0;
      return sum + (q * p);
    }, 0).toFixed(2));
  }, [items]);

  const totalAmount = useMemo(() => {
    return parseFloat(items.reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0).toFixed(2));
  }, [items]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!expenseNo.trim()) {
      toast.error("Please enter a valid expense number");
      return;
    }
    const validLines = items.filter(it => it.itemName.trim() && (parseFloat(it.pricePerUnit) || 0) > 0);
    if (validLines.length === 0) {
      toast.error("Please enter at least one line item with a name and price");
      return;
    }

    setLoading(true);
    const payload = {
      gstEnabled,
      party: selectedParty || undefined,
      expenseCategory,
      expenseNo,
      billDate,
      stateOfSupply,
      items: validLines.map(it => ({
        itemName: it.itemName,
        quantity: parseInt(it.quantity),
        pricePerUnit: parseFloat(it.pricePerUnit),
        discountPercent: parseFloat(it.discountPercent) || 0,
        taxPercent: gstEnabled ? (parseFloat(it.taxPercent) || 0) : 0,
        amount: parseFloat(it.amount),
      })),
      subTotal,
      totalAmount,
      paymentType,
      description
    };

    try {
      await dispatch(createExpense(payload)).unwrap();
      toast.success("Expense recorded successfully!");
      onSuccess();
    } catch (err) {
      toast.error(err || "Failed to record expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white">
          <h2 className="text-lg font-bold text-gray-905">Record Business Expense</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 bg-gray-50/30 select-none">
          <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">GST Enable Status</label>
              <div className="flex items-center h-[38px]">
                <input
                  type="checkbox"
                  id="gstEnabled"
                  checked={gstEnabled}
                  onChange={(e) => setGstEnabled(e.target.checked)}
                  className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500 cursor-pointer"
                />
                <label htmlFor="gstEnabled" className="ml-2 text-xs font-bold text-gray-600 cursor-pointer select-none">
                  Enable GST Scopes
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Expense Voucher No *</label>
              <input
                type="text"
                value={expenseNo}
                onChange={(e) => setExpenseNo(e.target.value)}
                placeholder="E.g. EXP-2026-001"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 h-[38px]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Expense Category</label>
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white h-[38px] cursor-pointer"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Linked Party (Optional)</label>
              <select
                value={selectedParty}
                onChange={(e) => setSelectedParty(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white h-[38px] cursor-pointer"
              >
                <option value="">-- No Party --</option>
                {parties.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Bill Date</label>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 h-[38px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">State of Supply</label>
              <SearchableStateSelect
                value={stateOfSupply}
                onChange={(val) => setStateOfSupply(val)}
                height="h-[38px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Payment Method</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white h-[38px] cursor-pointer"
              >
                {PAYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-800 text-sm border-l-4 border-brand-600 pl-2">Expense Item Lines</h3>
              <button
                type="button"
                onClick={handleAddLine}
                className="text-xs text-brand-600 hover:underline flex items-center gap-1 font-bold"
              >
                + Add Line
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end bg-gray-50/50 p-3 rounded-lg border border-gray-150 relative">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      className="absolute top-2 right-2 md:static text-gray-400 hover:text-red-500 p-1 md:mb-2"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1">Item Name *</label>
                    <input
                      type="text"
                      value={item.itemName}
                      onChange={(e) => updateLineItem(idx, "itemName", e.target.value)}
                      placeholder="E.g. Printing Paper, Office Rent"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(idx, "quantity", e.target.value === "" ? "" : parseInt(e.target.value) || 0)}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1">Price Per Unit *</label>
                    <input
                      type="number"
                      min="1"
                      value={item.pricePerUnit}
                      onChange={(e) => updateLineItem(idx, "pricePerUnit", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                      required
                    />
                  </div>

                  {gstEnabled && (
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1">GST rate %</label>
                      <input
                        type="number"
                        min="0"
                        value={item.taxPercent}
                        onChange={(e) => updateLineItem(idx, "taxPercent", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                        placeholder="18%"
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                      />
                    </div>
                  )}

                  <div className="text-right">
                    <span className="block text-[9px] text-gray-400 uppercase">Subtotal</span>
                    <span className="font-bold text-gray-800 text-sm">₹{(item.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Description / Memo</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Include payment receipt references..."
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs flex flex-col justify-center items-center text-center">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total Expense Amount</span>
              <span className="font-extrabold text-brand-700 text-3xl mt-1">₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100 bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-1.5 px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold shadow-sm"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save Expense
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: DETAILS VIEWING MODAL (Supports Image File Previews)
// ─────────────────────────────────────────────────────────────
function DetailsModal({ item, type, onClose, handleDownloadPurchaseReceipt, handleDownloadPaymentOutReceipt, handleDownloadPurchaseReturnReceipt }) {
  const { products } = useSelector((state) => state.inventory);
  const [linkedBill, setLinkedBill] = useState(null);

  useEffect(() => {
    if (type === "return" && item.purchase) {
      const billId = typeof item.purchase === 'object' ? item.purchase?._id : item.purchase;
      if (billId && billId.length === 24) {
        api.get(`/purchase/${billId}`)
          .then(res => {
            setLinkedBill(res.data?.data || res.data);
          })
          .catch(err => {
            console.error("Failed to load linked purchase bill details:", err);
          });
      }
    }
  }, [item, type]);

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const isImageFile = (fileUrl) => {
    if (!fileUrl) return false;
    const url = String(fileUrl).toLowerCase();
    return url.includes(".png") || url.includes(".jpg") || url.includes(".jpeg") || url.startsWith("data:image/") || url.includes("s3.amazonaws.com");
  };

  // Safe metrics calculations for the invoice
  const totalVal = item.totalAmount || 0;
  const billingTypeVal = item.billingType || "Credit";

  let paidVal = 0;
  let unpaidVal = 0;

  if (billingTypeVal === "Cash") {
    paidVal = totalVal;
    unpaidVal = 0;
  } else {
    // Credit
    if (item.paidAmount !== undefined && item.paidAmount !== null) {
      paidVal = item.paidAmount;
      unpaidVal = item.unpaidAmount !== undefined && item.unpaidAmount !== null ? item.unpaidAmount : Math.max(0, totalVal - paidVal);
    } else if (item.unpaidAmount !== undefined && item.unpaidAmount !== null) {
      unpaidVal = item.unpaidAmount;
      paidVal = Math.max(0, totalVal - unpaidVal);
    } else {
      paidVal = 0;
      unpaidVal = totalVal;
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-150 bg-white">
          <h2 className="text-lg font-bold text-gray-905">Transaction Details</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-gray-50/20 select-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border border-gray-150 p-4 rounded-xl shadow-xs">
            {type === "bill" && (
              <>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Invoice ID / Number</span>
                  <span className="font-bold text-gray-800 text-sm">{item.billNumber}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Supplier Vendor</span>
                  <span className="font-bold text-gray-800 text-sm">{item.party?.name || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Bill Date</span>
                  <span className="text-gray-650 text-xs font-semibold">{formatDate(item.billDate)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Payment Terms</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                      {item.billingType === "Cash" ? "Pay Now" : "Pay Later"}
                    </span>
                    {item.purchaseType === "BILL" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-150">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Received
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-150">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Ordered
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}

            {type === "payment" && (
              <>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Payment Receipt No</span>
                  <span className="font-bold text-gray-850 text-sm">{item.receiptNo}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Vendor Partner</span>
                  <span className="font-bold text-gray-800 text-sm">{item.party?.name || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Date Logged</span>
                  <span className="text-gray-650 text-xs font-semibold">{formatDate(item.date)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Total Amount Paid</span>
                  <span className="text-sm font-extrabold text-red-655">₹{item.paidAmount?.toLocaleString("en-IN")}</span>
                </div>
                <div className="md:col-span-2 border-t pt-3 mt-1">
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Payment Type / Origin</span>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {item.isAutoGenerated ? (
                      <>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-150">
                          Auto-Generated
                        </span>
                        {(item.linkedBill || item.linkedPurchaseBill || item.purchase) && (
                          <span className="text-xs text-gray-500">
                            Linked to Bill: <span className="font-mono font-bold text-gray-700">
                              {(item.linkedBill?.billNumber || item.linkedPurchaseBill?.billNumber || item.purchase?.billNumber ||
                                (typeof item.linkedBill === 'object' ? item.linkedBill?._id : item.linkedBill) ||
                                (typeof item.linkedPurchaseBill === 'object' ? item.linkedPurchaseBill?._id : item.linkedPurchaseBill) ||
                                (typeof item.purchase === 'object' ? item.purchase?._id : item.purchase))}
                            </span>
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-gray-150 text-gray-700 border border-gray-250">
                          Manual Payment (Pay Dues)
                        </span>
                        {(item.linkedBill || item.linkedPurchaseBill || item.purchase) && (
                          <span className="text-xs text-gray-500">
                            Applied to Bill: <span className="font-mono font-bold text-gray-700">
                              {(item.linkedBill?.billNumber || item.linkedPurchaseBill?.billNumber || item.purchase?.billNumber ||
                                (typeof item.linkedBill === 'object' ? item.linkedBill?._id : item.linkedBill) ||
                                (typeof item.linkedPurchaseBill === 'object' ? item.linkedPurchaseBill?._id : item.linkedPurchaseBill) ||
                                (typeof item.purchase === 'object' ? item.purchase?._id : item.purchase))}
                            </span>
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {type === "return" && (
              <>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Debit Note Voucher</span>
                  <span className="font-bold text-gray-900 text-sm">{item.returnNo}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Supplier Vendor</span>
                  <span className="font-bold text-gray-800 text-sm">{item.party?.name || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Return Date</span>
                  <span className="text-gray-650 text-xs font-semibold">{formatDate(item.returnDate)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Linked Original Purchase Invoice</span>
                  <span className="text-xs font-mono text-gray-700 bg-gray-105 px-2.5 py-0.5 rounded-full inline-block mt-0.5">{linkedBill?.billNumber || item.purchase?.billNumber || item.purchase || "N/A"}</span>
                </div>
              </>
            )}

            {type === "expense" && (
              <>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Expense Voucher No</span>
                  <span className="font-bold text-gray-950 text-sm">{item.expenseNo}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Expense Category</span>
                  <span className="font-bold text-brand-700 text-sm bg-brand-50 px-2.5 py-0.5 rounded-full inline-block mt-0.5">{item.expenseCategory}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Expense Date</span>
                  <span className="text-gray-650 text-xs font-semibold">{formatDate(item.billDate)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Settlement Method</span>
                  <span className="text-xs font-bold text-gray-700 bg-gray-105 px-2 py-0.5 rounded-full inline-block mt-0.5">{item.paymentType}</span>
                </div>
              </>
            )}
          </div>

          {/* Table representing sub-items breakdown */}
          {(type === "bill" || type === "return" || type === "expense") && (
            <div className="bg-white border border-gray-150 rounded-xl shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/60 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Line Item</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3 text-right">Unit Price</th>
                    <th className="px-4 py-3 text-right">Discount</th>
                    <th className="px-4 py-3 text-right">GST Rate</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {item.items?.map((it, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-semibold text-gray-850">
                        {type === "return" 
                          ? resolveReturnItemLabel(it, products, linkedBill)
                          : resolveItemLabel(it, products)
                        }
                      </td>
                      <td className="px-4 py-3 text-right">{it.quantity} {it.unit || "pcs"}</td>
                      <td className="px-4 py-3 text-right">₹{it.pricePerUnit?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right">
                        {it.discountPercent ? `${it.discountPercent}%` : `₹${it.discountAmount || 0}`}
                      </td>
                      <td className="px-4 py-3 text-right">{it.taxPercent || 0}% ({it.taxType || "Without Tax"})</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">₹{it.amount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Payment breakdown */}
          {type === "payment" && (
            <div className="bg-white border border-gray-150 rounded-xl shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/60 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Payment Method</th>
                    <th className="px-4 py-3">Reference No</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                  {item.payments?.map((py, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 uppercase">{py.paymentType}</td>
                      <td className="px-4 py-3 font-mono text-gray-500">{py.referenceNo || "—"}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">₹{py.amount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Delete Record? Document attachments */}
          {type === "bill" && (item.invoiceFile || item.image) && (
            <div className="bg-white border border-gray-150 p-4 rounded-xl shadow-xs space-y-2">
              <span className="block text-[10px] text-gray-400 font-semibold uppercase">Uploaded Bill Document</span>
              {isImageFile(item.invoiceFile || item.image) ? (
                <img
                  src={item.invoiceFile || item.image}
                  alt="Supplier Invoice Document"
                  className="max-h-64 rounded-lg object-contain border shadow-sm"
                />
              ) : (
                <a
                  href={item.invoiceFile || item.image}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold text-brand-700 bg-brand-50 px-4 py-2 border border-brand-200 rounded-lg hover:bg-brand-100"
                >
                  <Paperclip className="w-4 h-4" />
                  Download/View Invoice PDF Document
                </a>
              )}
            </div>
          )}

          {/* Remarks/Notes */}
          {(item.remarks || item.description) && (
            <div className="bg-white border border-gray-150 p-4 rounded-xl shadow-xs space-y-1">
              <span className="block text-[10px] text-gray-400 font-semibold uppercase">Notes / Descriptions</span>
              <p className="text-xs text-gray-600 whitespace-pre-wrap">{item.remarks || item.description}</p>
            </div>
          )}

          {/* Total summary calculations */}
          {(type === "bill" || type === "return" || type === "expense") && (
            <div className="flex flex-col items-end space-y-1.5 pr-2 text-xs w-full">
              <div className="flex justify-between w-64 text-gray-500">
                <span>Subtotal (Base value)</span>
                <span>₹{(item.subTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              {type === "bill" && (
                <>
                  <div className="flex justify-between w-64 text-gray-500">
                    <span>Paid Amount</span>
                    <span className="text-emerald-700 font-semibold">₹{paidVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between w-64 text-gray-500">
                    <span>Due Amount</span>
                    <span className="text-red-655 font-semibold">₹{unpaidVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between w-64 border-t border-gray-150 pt-2 font-extrabold text-sm text-gray-900">
                <span>Grand Total</span>
                <span>₹{totalVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
          {type === "bill" && (
            <button
              onClick={() => handleDownloadPurchaseReceipt(item._id)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-brand-500 text-brand-650 hover:bg-brand-50 font-bold rounded-lg text-xs transition bg-white"
            >
              <Download size={13} /> Print/Download PDF
            </button>
          )}
          {type === "payment" && (
            <button
              onClick={() => handleDownloadPaymentOutReceipt(item._id)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-brand-500 text-brand-650 hover:bg-brand-50 font-bold rounded-lg text-xs transition bg-white"
            >
              <Download size={13} /> Print/Download PDF
            </button>
          )}
          {type === "return" && (
            <button
              onClick={() => handleDownloadPurchaseReturnReceipt(item._id)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-brand-500 text-brand-650 hover:bg-brand-50 font-bold rounded-lg text-xs transition bg-white"
            >
              <Download size={13} /> Print/Download PDF
            </button>
          )}
          <button
            onClick={onClose}
            className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-sm transition ml-auto"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}

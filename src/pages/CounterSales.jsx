import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import {
  fetchSales,
  createSaleOrEstimate,
  updateSaleOrEstimate,
  convertToSale,
  deleteSale,
  fetchPaymentsIn,
  recordPaymentIn,
  updatePaymentIn,
  deletePaymentIn,
  fetchSalesReturns,
  recordSalesReturn,
  updateSalesReturn,
  deleteSalesReturn,
} from "../store/thunks/sellThunk";
import { fetchParties } from "../store/thunks/partyThunk";
import { fetchProducts, fetchStockSummary } from "../store/thunks/inventoryThunk";
import { clearSellStatus } from "../store/slices/sellSlice";
import { usePermissions } from "../hooks/usePermissions";
import api, { isEInvoiceSessionValid, addAuditLog } from "../lib/api";
import { generateEInvoice, generateEInvoicePdf } from "../store/thunks/eInvoiceThunk";
import { clearEInvoiceStatus } from "../store/slices/eInvoiceSlice";
import {
  Receipt,
  Plus,
  Search,
  Trash2,
  Eye,
  Download,
  User,
  Calendar,
  ChevronRight,
  ChevronDown,
  Send,
  Info,
  RefreshCw,
  AlertTriangle,
  FileText,
  IndianRupee,
  CreditCard,
  CheckCircle,
  Check,
  HelpCircle,
  X,
  Pencil,
  Loader2,
  Tag,
  ArrowLeftRight,
  Wallet,
  Printer,
  Layers,
  Clock,
  Shield,
  MoreVertical,
} from "lucide-react";

const TABS = [
  { key: "sales", label: "Sales Bills", icon: FileText },
  { key: "payments", label: "Payments In", icon: IndianRupee },
  { key: "returns", label: "Sales Returns", icon: RefreshCw },
];

// Helper to resolve product name/label from a line item
const resolveItemLabel = (itemRow, products = [], stockSummary = []) => {
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

  // 2. Identify the target item string ID
  const targetItemId = itemRow.item?._id || (typeof itemRow.item === 'string' ? itemRow.item : null);

  if (targetItemId && !isInvalidName(targetItemId)) {
    // Look up in stockSummary
    const stockRecord = stockSummary.find((s) => s.item?._id === targetItemId || s._id === targetItemId);
    let productId = stockRecord?.item?.sourceRef || "";

    // If not found in stockSummary, look up in products
    if (!productId) {
      const matchedProd = products.find(p => p._id === targetItemId || p.products?.some(v => v._id === targetItemId));
      if (matchedProd) {
        productId = matchedProd._id;
      }
    }

    const prod = products.find(p => p._id === productId);
    if (prod) {
      const variant = prod.products?.find(v => v._id === targetItemId || (stockRecord?.item?.variantId && v._id === stockRecord.item.variantId));
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
      Number(v.pricePerUnit || v.rate || v.salePrice || v.purchasePrice) === Number(itemRow.pricePerUnit)
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

export default function CounterSales() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const getTabFromPath = (path) => {
    if (path.includes("/sell/receipts")) return "payments";
    if (path.includes("/sell/returns")) return "returns";
    return "sales";
  };
  const activeTab = getTabFromPath(pathname);

  const { isReadOnly } = usePermissions();

  // Redux states
  const {
    sales,
    salesTotal,
    payments,
    paymentsTotal,
    returns,
    returnsTotal,
    loading,
    error,
    success,
  } = useSelector((state) => state.sell);
  
  const { parties } = useSelector((state) => state.party);
  const { products, stockSummary } = useSelector((state) => state.inventory);

  // Local state for modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editPaymentRecord, setEditPaymentRecord] = useState(null);
  const [linkedSellForPayment, setLinkedSellForPayment] = useState(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [editReturnRecord, setEditReturnRecord] = useState(null);
  const [viewDetailModalOpen, setViewDetailModalOpen] = useState(false);
  const [quickEInvoiceItem, setQuickEInvoiceItem] = useState(null);
  const [quickEInvoiceMode, setQuickEInvoiceMode] = useState("generate"); // "generate" | "details"
  
  // Compliance drawer state
  const [complianceDrawerOpen, setComplianceDrawerOpen] = useState(false);
  const [complianceItem, setComplianceItem] = useState(null);
  
  // Local list filters
  const [searchQuery, setSearchQuery] = useState("");
  const [saleTypeFilter, setSaleTypeFilter] = useState("all");
  const [billingFilter, setBillingFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Viewing detail state
  const [detailItem, setDetailItem] = useState(null);
  const [detailType, setDetailType] = useState("sale"); // 'sale', 'payment', 'return'
  const [activeDropdownId, setActiveDropdownId] = useState(null);

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveDropdownId(null);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  useEffect(() => {
    dispatch(clearSellStatus());
    dispatch(fetchParties({ partyType: "BUYER" }));
    dispatch(fetchProducts());
    dispatch(fetchStockSummary());
  }, [dispatch]);

  // Load correct lists on active tab changes
  useEffect(() => {
    setSearchQuery("");
    setCurrentPage(1);
    loadListData();
  }, [activeTab]);

  const loadListData = () => {
    const filters = { page: currentPage, limit: ITEMS_PER_PAGE };
    if (activeTab === "sales") {
      if (saleTypeFilter !== "all") filters.saleType = saleTypeFilter;
      if (billingFilter !== "all") filters.billingType = billingFilter;
      if (searchQuery) filters.search = searchQuery;
      dispatch(fetchSales(filters));
    } else if (activeTab === "payments") {
      if (searchQuery) filters.search = searchQuery;
      dispatch(fetchPaymentsIn(filters));
    } else if (activeTab === "returns") {
      if (searchQuery) filters.search = searchQuery;
      dispatch(fetchSalesReturns(filters));
    }
  };

  // Re-run filter fetch
  useEffect(() => {
    loadListData();
  }, [currentPage, saleTypeFilter, billingFilter]);

  // Trigger search on submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadListData();
  };

  // Helper: Format Date
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // PDF Receipt download/preview handler
  const handleDownloadReceipt = async (id, invoiceNo = "Invoice", supplyType) => {
    try {
      toast.loading("Generating receipt PDF...", { id: "pdf-download" });
      const queryParam = supplyType ? `?supplyType=${encodeURIComponent(supplyType)}` : "";
      const res = await api.get(`/sell/receipt/${id}${queryParam}`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast.success("Receipt opened in print preview", { id: "pdf-download" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to open receipt PDF", { id: "pdf-download" });
    }
  };

  // PDF Payment Receipt download/preview handler
  const handleDownloadPaymentReceipt = async (id) => {
    try {
      toast.loading("Generating payment receipt PDF...", { id: "payment-pdf-download" });
      const res = await api.get(`/sell/payment-in/receipt/${id}`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast.success("Payment receipt opened in print preview", { id: "payment-pdf-download" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to open payment receipt PDF", { id: "payment-pdf-download" });
    }
  };

  // Convert estimate to sale
  const handleConvertEstimate = async (id) => {
    const loadingToast = toast.loading("Converting estimate to sale...");
    try {
      await dispatch(convertToSale(id)).unwrap();
      toast.success("Estimate converted to Sale successfully!", { id: loadingToast });
      loadListData();
    } catch (err) {
      toast.error(err || "Failed to convert estimate", { id: loadingToast });
    }
  };

  // Delete transaction handlers
  const handleDeleteSale = async (id) => {
    if (window.confirm("Are you sure you want to delete this sales bill? This will revert inventory stock and ledger updates!")) {
      try {
        await dispatch(deleteSale(id)).unwrap();
        toast.success("Sales Bill deleted successfully");
        loadListData();
      } catch (err) {
        toast.error(err || "Failed to delete sales bill");
      }
    }
  };

  const handleDeletePayment = async (id) => {
    if (window.confirm("Are you sure you want to delete this payment receipt?")) {
      try {
        await dispatch(deletePaymentIn(id)).unwrap();
        toast.success("Payment receipt deleted successfully");
        loadListData();
      } catch (err) {
        toast.error(err || "Failed to delete payment receipt");
      }
    }
  };

  const handleDeleteReturn = async (id) => {
    if (window.confirm("Are you sure you want to delete this sales return? This will revert credit node updates!")) {
      try {
        await dispatch(deleteSalesReturn(id)).unwrap();
        toast.success("Sales return deleted successfully");
        loadListData();
      } catch (err) {
        toast.error(err || "Failed to delete sales return");
      }
    }
  };

  // View Details Modal Trigger
  const handleViewDetails = (item, type) => {
    setDetailItem(item);
    setDetailType(type);
    setViewDetailModalOpen(true);
  };

  // Summary Metrics calculations (from loaded lists)
  const salesMetrics = {
    totalSales: sales.filter((s) => s.saleType === "SALE").reduce((acc, s) => acc + (s.totalAmount || 0), 0),
    totalEstimates: sales.filter((s) => s.saleType === "ESTIMATE").reduce((acc, s) => acc + (s.totalAmount || 0), 0),
    creditOutstanding: sales.filter((s) => s.billingType === "Credit").reduce((acc, s) => acc + (s.totalAmount || 0), 0),
    paymentsReceived: payments.reduce((acc, p) => acc + (p.receivedAmount || 0), 0),
  };

  const totalPages = Math.ceil(
    (activeTab === "sales" ? salesTotal : activeTab === "payments" ? paymentsTotal : returnsTotal) / ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      {/* 1. Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">Counter Sales (Direct Sell)</h1>
          <p className="text-sm text-gray-500">Manage walk-in cash checkouts, credit sales, customer sales bills, and returns</p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {!isReadOnly && (
            <>
              {activeTab === "sales" && (
                <button
                  onClick={() => navigate("/sell/invoice/new")}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition shadow-sm active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  New Sales Bill
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
                  onClick={() => {
                    setEditReturnRecord(null);
                    setReturnModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition shadow-sm active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Record Return
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 2. Stat Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Sales Revenue", val: `₹${salesMetrics.totalSales.toLocaleString("en-IN")}`, icon: CreditCard, bg: "bg-emerald-50 text-emerald-700", border: "border-emerald-100" },
          { label: "Estimate Volume", val: `₹${salesMetrics.totalEstimates.toLocaleString("en-IN")}`, icon: FileText, bg: "bg-blue-50 text-blue-700", border: "border-blue-100" },
          { label: "Outstanding Dues", val: `₹${salesMetrics.creditOutstanding.toLocaleString("en-IN")}`, icon: AlertTriangle, bg: "bg-amber-50 text-amber-700", border: "border-amber-100" },
          { label: "Payments Logged", val: `₹${salesMetrics.paymentsReceived.toLocaleString("en-IN")}`, icon: IndianRupee, bg: "bg-purple-50 text-purple-700", border: "border-purple-100" },
        ].map((item, idx) => (
          <div key={idx} className={`bg-white border ${item.border} rounded-2xl p-5 shadow-sm flex items-center gap-4`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.bg}`}>
              <item.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{item.label}</p>
              <h3 className="text-xl font-bold text-gray-900 mt-0.5">{item.val}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map((t) => {
          const TabIcon = t.icon;
          const isSelected = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => {
                if (t.key === "sales") navigate("/sell/invoices");
                else if (t.key === "payments") navigate("/sell/receipts");
                else if (t.key === "returns") navigate("/sell/returns");
              }}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all duration-150 ${
                isSelected
                  ? "border-brand-650 text-brand-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
              }`}
            >
              <TabIcon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 4. Controls & Filter Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by buyer details, reference code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder-gray-400"
          />
        </form>
        
        {activeTab === "sales" && (
          <div className="flex gap-3">
            <select
              value={saleTypeFilter}
              onChange={(e) => setSaleTypeFilter(e.target.value)}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
            >
              <option value="all">All Types</option>
              <option value="SALE">Sales Only</option>
              <option value="ESTIMATE">Estimates Only</option>
            </select>
            <select
              value={billingFilter}
              onChange={(e) => setBillingFilter(e.target.value)}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
            >
              <option value="all">All Billing</option>
              <option value="Cash">Cash</option>
              <option value="Credit">Credit</option>
            </select>
          </div>
        )}
      </div>

      {/* 5. Lists Renderings */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh] bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {activeTab === "sales" && (
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-600 uppercase font-semibold">
                  <tr className="text-[10px] tracking-wider text-gray-500">
                    <th className="px-3 py-3 font-bold">SALES BILL #</th>
                    <th className="px-3 py-3 text-center font-bold">DATE</th>
                    <th className="px-3 py-3 font-bold">BUYER/PARTY</th>
                    <th className="px-3 py-3 font-bold">PAYMENT</th>
                    <th className="px-3 py-3 font-bold">TYPE</th>
                    <th className="px-3 py-3 text-right font-bold">TOTAL AMOUNT</th>
                    <th className="px-3 py-3 text-right font-bold">RECEIVED AMOUNT</th>
                    <th className="px-3 py-3 text-right font-bold">UNPAID AMOUNT</th>
                    <th className="px-3 py-3 text-center font-bold">E-INVOICE</th>
                    <th className="px-3 py-3 text-center font-bold">E-WAY BILL</th>
                    <th className="px-3 py-3 text-right font-bold">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-16 text-center text-gray-400">
                        <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                        <p className="font-medium">No sales bills found</p>
                      </td>
                    </tr>
                  ) : (
                    sales.map((sale) => (
                      <tr key={sale._id} className="hover:bg-gray-50 transition">
                        <td className="px-3 py-2.5 font-bold text-gray-900 text-xs">{sale.invoiceNo || sale._id.substring(0, 8).toUpperCase()}</td>
                        <td className="px-3 py-2.5 text-gray-500">
                          {(() => {
                            const dateVal = new Date(sale.createdAt);
                            if (isNaN(dateVal.getTime())) return "—";
                            const day = dateVal.getDate();
                            const month = dateVal.toLocaleDateString("en-IN", { month: "short" });
                            const year = dateVal.getFullYear();
                            return (
                              <div className="flex flex-col items-center justify-center text-center font-medium leading-tight text-[11px] font-sans text-gray-500">
                                <span className="text-gray-700 font-bold">{day}</span>
                                <span className="text-[10px] text-gray-400 font-semibold">{month}</span>
                                <span className="text-[9px] text-gray-400">{year}</span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-2.5">
                          <div>
                            <p className="font-bold text-gray-800 text-xs">{sale.party?.name || sale.buyerName || "Walk-in Customer"}</p>
                            {(sale.buyerPhone || sale.party?.phoneNumber) && (
                              <span className="text-[10px] text-gray-400 mt-0.5 block font-semibold">{sale.buyerPhone || sale.party?.phoneNumber}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            sale.billingType === "Credit"
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-green-50 text-green-700 border border-green-100"
                          }`}>
                            {sale.billingType === "Cash" ? "Money Received" : "Udhar (Credit)"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-655 text-[10px] font-extrabold uppercase tracking-wider border border-gray-200">
                            {sale.saleType}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-extrabold text-gray-950 text-xs">₹{(sale.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2.5 text-right text-green-700 font-semibold text-xs">₹{(sale.receivedAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        <td className={`px-3 py-2.5 text-right font-semibold text-xs ${sale.unpaidAmount > 0 ? "text-red-650" : "text-gray-900"}`}>
                          ₹{(sale.unpaidAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {(() => {
                            const partyId = typeof sale.party === "string" ? sale.party : sale.party?._id;
                            const resolved = parties.find(p => p._id === partyId);
                            const isB2B = sale.saleType === "SALE" && resolved && (resolved.gstin || resolved.gstNumber || resolved.gstType?.startsWith("Registered"));
                            
                            if (!isB2B) {
                              return (
                                <span className="text-gray-450 font-semibold text-xs select-none">
                                  N/A
                                </span>
                              );
                            }

                            const irnVal = sale.eInvoiceIrn || sale.irn || sale.eInvoiceInfo?.irn;
                            if (irnVal) {
                              return (
                                <button
                                  onClick={() => navigate(`/sell/compliance/${sale._id}`)}
                                  className="border border-emerald-500 bg-emerald-50/10 hover:bg-emerald-50 text-emerald-800 font-bold px-3 py-1.5 text-[11px] rounded-lg inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer text-xs"
                                >
                                  ✓ Generated
                                </button>
                              );
                            }

                            const isFailed = sale.eInvoiceStatus === "FAILED" || sale.eInvoiceStatus === "Failed" || sale.eInvoiceError || (sale.eInvoiceInfo && (sale.eInvoiceInfo.status === "FAILED" || sale.eInvoiceInfo.error));
                            if (isFailed) {
                              return (
                                <button
                                  onClick={() => navigate(`/sell/compliance/${sale._id}`)}
                                  className="border border-rose-500 bg-rose-50/10 hover:bg-rose-50 text-rose-750 font-bold px-3 py-1.5 text-[11px] rounded-lg inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer text-xs"
                                >
                                  ❌ Failed
                                </button>
                              );
                            }

                            return (
                              <button
                                onClick={() => navigate(`/sell/compliance/${sale._id}`)}
                                className="border border-gray-205 bg-white hover:bg-gray-50 text-gray-700 font-bold px-3 py-1.5 text-[11px] rounded-lg inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer font-sans text-xs"
                              >
                                ⚡ Generate
                              </button>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {(() => {
                            if (sale.saleType === "ESTIMATE") {
                              return (
                                <span className="text-gray-400 font-medium text-[11px] select-none">
                                  —
                                </span>
                              );
                            }

                            const ewbNo = sale.ewayBillNo || sale.eWayBillNo || sale.eInvoiceInfo?.ewayBillNo || sale.eInvoiceInfo?.eWayBillNo;
                            const ewbStatus = sale.ewayBillStatus || sale.eInvoiceInfo?.ewayBillStatus || "ACTIVE";
                            const hasEwb = !!ewbNo;

                            if (hasEwb) {
                              return (
                                <button
                                  onClick={() => navigate(`/sell/compliance/${sale._id}`)}
                                  className={`font-bold px-3 py-1.5 text-[11px] rounded-lg inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer text-xs border ${
                                    ewbStatus === "CANCELLED"
                                      ? "border-rose-300 bg-rose-50/10 text-rose-700"
                                      : "border-emerald-500 bg-emerald-50/10 text-emerald-805"
                                  }`}
                                >
                                  {ewbStatus === "CANCELLED" ? "Cancelled" : "✓ Generated"}
                                </button>
                              );
                            }

                            const partyId = typeof sale.party === "string" ? sale.party : sale.party?._id;
                            const resolved = parties.find(p => p._id === partyId);
                            const isB2B = sale.saleType === "SALE" && resolved && (resolved.gstin || resolved.gstNumber || resolved.gstType?.startsWith("Registered"));

                            if (isB2B) {
                              const irnVal = sale.eInvoiceIrn || sale.irn || sale.eInvoiceInfo?.irn;
                              if (!irnVal) {
                                return (
                                  <span className="text-gray-400 font-semibold text-[11px] select-none">
                                    Waiting IRN
                                  </span>
                                );
                              }
                            }

                            return (
                              <button
                                onClick={() => navigate(`/sell/compliance/${sale._id}`)}
                                className="border border-amber-500 bg-amber-50/5 hover:bg-amber-50 text-amber-700 font-bold px-3 py-1.5 text-[11px] rounded-lg inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer text-xs"
                              >
                                ⚡ Generate
                              </button>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="relative inline-block text-left">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(activeDropdownId === sale._id ? null : sale._id);
                              }}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition border-0 bg-transparent cursor-pointer text-gray-500 hover:text-gray-900"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            
                            {activeDropdownId === sale._id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-2xl shadow-xl z-[100] py-1.5 animate-in fade-in zoom-in-95 duration-100">
                                <button
                                  onClick={() => handleViewDetails(sale, "sale")}
                                  className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-0 bg-transparent cursor-pointer font-semibold flex items-center gap-2"
                                >
                                  <Eye className="w-3.5 h-3.5 text-gray-400" />
                                  View Details
                                </button>
                                
                                {sale.saleType === "SALE" && (
                                  <button
                                    onClick={() => navigate(`/sell/compliance/${sale._id}`)}
                                    className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-0 bg-transparent cursor-pointer font-semibold flex items-center gap-2"
                                  >
                                    <Shield className="w-3.5 h-3.5 text-gray-400" />
                                    Government Compliance
                                  </button>
                                )}
                                
                                <button
                                  onClick={() => handleDownloadReceipt(sale._id, sale.invoiceNo || "Receipt", sale.supplyType)}
                                  className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-0 bg-transparent cursor-pointer font-semibold flex items-center gap-2"
                                >
                                  <Download className="w-3.5 h-3.5 text-gray-400" />
                                  Download PDF
                                </button>
                                
                                {sale.billingType === "Credit" && sale.saleType === "SALE" && sale.unpaidAmount > 0 && !isReadOnly && (
                                  <button
                                    onClick={() => {
                                      setLinkedSellForPayment(sale);
                                      setPaymentModalOpen(true);
                                    }}
                                    className="w-full text-left px-4 py-2 text-xs text-emerald-705 hover:bg-emerald-50 border-0 bg-transparent cursor-pointer font-bold flex items-center gap-2"
                                  >
                                    <IndianRupee className="w-3.5 h-3.5 text-emerald-500" />
                                    Receive Payment
                                  </button>
                                )}
                                
                                {sale.saleType === "ESTIMATE" && !isReadOnly && (
                                  <button
                                    onClick={() => handleConvertEstimate(sale._id)}
                                    className="w-full text-left px-4 py-2 text-xs text-brand-700 hover:bg-brand-50 border-0 bg-transparent cursor-pointer font-bold flex items-center gap-2"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5 text-brand-500" />
                                    Convert to Sale
                                  </button>
                                )}
                                
                                {!isReadOnly && (
                                  <>
                                    <div className="h-px bg-gray-100 my-1"></div>
                                    <button
                                      onClick={() => navigate(`/sell/invoice/edit/${sale._id}`)}
                                      className="w-full text-left px-4 py-2 text-xs text-amber-700 hover:bg-amber-50 border-0 bg-transparent cursor-pointer font-bold flex items-center gap-2"
                                    >
                                      <Pencil className="w-3.5 h-3.5 text-amber-500" />
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSale(sale._id)}
                                      className="w-full text-left px-4 py-2 text-xs text-rose-700 hover:bg-rose-50 border-0 bg-transparent cursor-pointer font-bold flex items-center gap-2"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "payments" && (
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-600 uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-4">Receipt #</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Party/Customer</th>
                    <th className="px-6 py-4">Linked Sales Bill</th>
                    <th className="px-6 py-4">Payment Breakdown</th>
                    <th className="px-6 py-4 text-right">Received Amount</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                        <IndianRupee className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                        <p className="font-medium">No customer payments recorded</p>
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p._id} className="hover:bg-gray-55 transition">
                        <td className="px-6 py-4 font-bold text-gray-900">
                          <div className="flex items-center gap-2">
                            <span>{p.receiptNo || p._id.substring(0, 8).toUpperCase()}</span>
                            {p.isAutoGenerated && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Auto
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-550">{formatDate(p.createdAt)}</td>
                        <td className="px-6 py-4 font-semibold text-gray-800">{p.party?.name || "Unassigned"}</td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-500 font-semibold">
                          {p.linkedSell?.invoiceNo || p.sell?.invoiceNo || (p.sell && typeof p.sell === "string" ? p.sell.substring(0, 8).toUpperCase() : "—")}
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {p.payments?.map((py, idx) => (
                              <span key={idx} className="inline-block mr-2 px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs uppercase font-medium">
                                {py.paymentType}: ₹{py.amount}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-extrabold text-green-700">₹{(p.receivedAmount || 0).toLocaleString("en-IN")}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="relative inline-block text-left">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(activeDropdownId === p._id ? null : p._id);
                              }}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition border-0 bg-transparent cursor-pointer text-gray-500 hover:text-gray-900"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            
                            {activeDropdownId === p._id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-2xl shadow-xl z-[100] py-1.5 animate-in fade-in zoom-in-95 duration-100">
                                <button
                                  onClick={() => handleViewDetails(p, "payment")}
                                  className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-0 bg-transparent cursor-pointer font-semibold flex items-center gap-2"
                                >
                                  <Eye className="w-3.5 h-3.5 text-gray-400" />
                                  View Details
                                </button>
                                
                                <button
                                  onClick={() => handleDownloadPaymentReceipt(p._id)}
                                  className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-0 bg-transparent cursor-pointer font-semibold flex items-center gap-2"
                                >
                                  <Download className="w-3.5 h-3.5 text-gray-400" />
                                  Download PDF
                                </button>
                                
                                {!isReadOnly && !p.isAutoGenerated && (
                                  <>
                                    <div className="h-px bg-gray-100 my-1"></div>
                                    <button
                                      onClick={() => {
                                        setEditPaymentRecord(p);
                                        setPaymentModalOpen(true);
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs text-amber-700 hover:bg-amber-50 border-0 bg-transparent cursor-pointer font-bold flex items-center gap-2"
                                    >
                                      <Pencil className="w-3.5 h-3.5 text-amber-500" />
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeletePayment(p._id)}
                                      className="w-full text-left px-4 py-2 text-xs text-rose-700 hover:bg-rose-50 border-0 bg-transparent cursor-pointer font-bold flex items-center gap-2"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
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
                    <th className="px-6 py-4">Credit Note #</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Party/Customer</th>
                    <th className="px-6 py-4">Linked Sales Bill</th>
                    <th className="px-6 py-4 text-right">Credit Value</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {returns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                        <RefreshCw className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                        <p className="font-medium">No sales returns recorded</p>
                      </td>
                    </tr>
                  ) : (
                    returns.map((r) => (
                      <tr key={r._id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 font-bold text-gray-900">{r.returnNo || r._id.substring(0, 8).toUpperCase()}</td>
                        <td className="px-6 py-4 text-gray-500">{formatDate(r.createdAt)}</td>
                        <td className="px-6 py-4 font-semibold text-gray-800">{r.party?.name || r.sale?.buyerName || "Walk-in"}</td>
                        <td className="px-6 py-4 text-gray-500 font-mono">{r.sale?.invoiceNo || "Sales Bill ID"}</td>
                        <td className="px-6 py-4 text-right font-extrabold text-red-650">₹{(r.totalAmount || 0).toLocaleString("en-IN")}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="relative inline-block text-left">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(activeDropdownId === r._id ? null : r._id);
                              }}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition border-0 bg-transparent cursor-pointer text-gray-500 hover:text-gray-900"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            
                            {activeDropdownId === r._id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-2xl shadow-xl z-[100] py-1.5 animate-in fade-in zoom-in-95 duration-100">
                                <button
                                  onClick={() => handleViewDetails(r, "return")}
                                  className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-0 bg-transparent cursor-pointer font-semibold flex items-center gap-2"
                                >
                                  <Eye className="w-3.5 h-3.5 text-gray-400" />
                                  View Details
                                </button>
                                
                                {!isReadOnly && (
                                  <>
                                    <div className="h-px bg-gray-100 my-1"></div>
                                    <button
                                      onClick={() => {
                                        setEditReturnRecord(r);
                                        setReturnModalOpen(true);
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs text-amber-700 hover:bg-amber-50 border-0 bg-transparent cursor-pointer font-bold flex items-center gap-2"
                                    >
                                      <Pencil className="w-3.5 h-3.5 text-amber-500" />
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteReturn(r._id)}
                                      className="w-full text-left px-4 py-2 text-xs text-rose-700 hover:bg-rose-50 border-0 bg-transparent cursor-pointer font-bold flex items-center gap-2"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center text-sm text-gray-500 px-2">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-3.5 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-45 transition"
            >
              Prev
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3.5 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-45 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}



      {/* ════════════════════════════════════════════════════════════
         2. RECORD PAYMENT MODAL
      ════════════════════════════════════════════════════════════ */}
      {paymentModalOpen && (
        <RecordPaymentModal
          editRecord={editPaymentRecord}
          linkedSell={linkedSellForPayment}
          parties={parties}
          onClose={() => {
            setPaymentModalOpen(false);
            setEditPaymentRecord(null);
            setLinkedSellForPayment(null);
          }}
          onSuccess={() => {
            setPaymentModalOpen(false);
            setEditPaymentRecord(null);
            setLinkedSellForPayment(null);
            loadListData();
          }}
        />
      )}

      {/* ════════════════════════════════════════════════════════════
         3. RECORD RETURN MODAL
      ════════════════════════════════════════════════════════════ */}
      {returnModalOpen && (
        <RecordReturnModal
          editRecord={editReturnRecord}
          sales={sales.filter((s) => s.saleType === "SALE")}
          onClose={() => {
            setReturnModalOpen(false);
            setEditReturnRecord(null);
          }}
          onSuccess={() => {
            setReturnModalOpen(false);
            setEditReturnRecord(null);
            loadListData();
          }}
        />
      )}



      {/* ════════════════════════════════════════════════════════════
         4. DETAILS VIEWING MODAL
      ════════════════════════════════════════════════════════════ */}
      {viewDetailModalOpen && detailItem && (
        <DetailsModal
          item={detailItem}
          type={detailType}
          onClose={() => {
            dispatch(clearEInvoiceStatus());
            setViewDetailModalOpen(false);
            setDetailItem(null);
          }}
          handleDownloadReceipt={handleDownloadReceipt}
          handleDownloadPaymentReceipt={handleDownloadPaymentReceipt}
        />
      )}


    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: Record Payment Modal
// ─────────────────────────────────────────────────────────────
function RecordPaymentModal({ editRecord = null, linkedSell = null, parties, onClose, onSuccess }) {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.sell);

  const initialPartyId = editRecord
    ? (editRecord.party?._id || editRecord.party || "")
    : (linkedSell ? (linkedSell.party?._id || linkedSell.party || "") : "");

  const initialSellId = editRecord
    ? (editRecord.linkedSell?._id || editRecord.sell?._id || editRecord.sell || "")
    : (linkedSell ? linkedSell._id : "");

  const [partyId, setPartyId] = useState(initialPartyId);
  const [sellId, setSellId] = useState(initialSellId);
  const [description, setDescription] = useState(editRecord ? (editRecord.description || "") : "");
  const [paymentDate, setPaymentDate] = useState(
    editRecord
      ? (editRecord.date?.split("T")[0] || editRecord.paymentDate?.split("T")[0] || new Date().toISOString().split("T")[0])
      : new Date().toISOString().split("T")[0]
  );

  const [unpaidInvoices, setUnpaidInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  useEffect(() => {
    if (!partyId) {
      setUnpaidInvoices([]);
      return;
    }
    let isMounted = true;
    const fetchUnpaid = async () => {
      setLoadingInvoices(true);
      try {
        const res = await api.get("/sell/", {
          params: { party: partyId, billingType: "Credit", saleType: "SALE", limit: 100 }
        });
        const records = res.data?.records || res.data?.data || res.data || [];
        if (isMounted) {
          const currentlyLinkedId = editRecord?.linkedSell?._id || editRecord?.sell?._id || editRecord?.sell || linkedSell?._id;
          const filtered = records.filter((s) => s.unpaidAmount > 0 || s._id === currentlyLinkedId);
          setUnpaidInvoices(filtered);
        }
      } catch (err) {
        console.error("Failed to fetch outstanding invoices", err);
      } finally {
        if (isMounted) setLoadingInvoices(false);
      }
    };
    fetchUnpaid();
    return () => {
      isMounted = false;
    };
  }, [partyId, editRecord, linkedSell]);

  const normalizePaymentType = (type) => {
    if (!type) return "Cash";
    const t = type.toLowerCase();
    if (t === "upi") return "UPI";
    if (t === "cash") return "Cash";
    if (t === "card") return "Card";
    if (t === "bank" || t === "bank transfer") return "Bank Transfer";
    return type;
  };

  const [paymentLines, setPaymentLines] = useState(() => {
    if (editRecord && editRecord.payments?.length > 0) {
      return editRecord.payments.map((py) => ({
        paymentType: normalizePaymentType(py.paymentType),
        amount: py.amount || "",
        referenceNo: py.referenceNo || "",
      }));
    }
    if (linkedSell) {
      return [{ paymentType: "UPI", amount: linkedSell.unpaidAmount || "" }];
    }
    return [{ paymentType: "UPI", amount: "" }];
  });

  const handleAddPaymentLine = () => {
    setPaymentLines((prev) => [...prev, { paymentType: "UPI", amount: "" }]);
  };

  const handleRemovePaymentLine = (idx) => {
    if (paymentLines.length > 1) {
      setPaymentLines((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const updatePaymentLine = (idx, field, value) => {
    setPaymentLines((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const totalAmount = paymentLines.reduce((acc, line) => acc + (parseFloat(line.amount) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!partyId) {
      toast.error("Please select a valid customer party");
      return;
    }

    const validPayments = paymentLines
      .filter((l) => parseFloat(l.amount) > 0)
      .map((l) => ({
        paymentType: l.paymentType,
        amount: parseFloat(l.amount),
        referenceNo: l.referenceNo || undefined,
      }));

    if (validPayments.length === 0) {
      toast.error("Please specify at least one valid payment amount");
      return;
    }

    const payload = {
      party: partyId,
      payments: validPayments,
      receivedAmount: totalAmount,
      description,
      date: paymentDate,
    };

    if (sellId) {
      payload.sell = sellId;
    }

    try {
      if (editRecord) {
        await dispatch(updatePaymentIn({ id: editRecord._id, payload })).unwrap();
        toast.success("Payment receipt updated successfully!");
      } else {
        await dispatch(recordPaymentIn(payload)).unwrap();
        toast.success("Payment logged successfully!");
      }
      onSuccess();
    } catch (err) {
      toast.error(err || "Failed to log payment");
    }
  };

  const selectedSale = unpaidInvoices.find(s => s._id === sellId);
  const originalReceived = editRecord ? (editRecord.receivedAmount || 0) : 0;
  const isCurrentlyLinked = editRecord && selectedSale && (
    (editRecord.linkedSell?._id || editRecord.linkedSell) === selectedSale._id ||
    (editRecord.sell?._id || editRecord.sell) === selectedSale._id
  );
  const baseOutstanding = isCurrentlyLinked ? (selectedSale.unpaidAmount + originalReceived) : (selectedSale ? selectedSale.unpaidAmount : 0);
  const newOutstanding = Math.max(0, baseOutstanding - totalAmount);

  return (
    <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-150 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <span className="text-emerald-600 font-bold text-lg">₹</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                {editRecord ? "Edit Customer Payment Receipt" : "Record Customer Payment In"}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Record a payment received from your customer
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 bg-gray-50/20 text-xs select-none">
          <div>
            <label className="block text-xs font-bold text-gray-900 mb-2">1. Select Party / Customer *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <User className="w-4 h-4" />
              </span>
              <select
                value={partyId}
                onChange={(e) => {
                  setPartyId(e.target.value);
                  setSellId("");
                }}
                disabled={!!editRecord || !!linkedSell}
                className="w-full border border-gray-200 rounded-xl pl-10 pr-10 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed font-semibold text-gray-700 h-[42px] appearance-none transition-all"
              >
                <option value="">-- Select Customer --</option>
                {parties.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} (+91 {p.phoneNumber || "No Phone"})
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-gray-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-900 mb-2">2. Link Sales Bill (Optional)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <FileText className="w-4 h-4" />
              </span>
              <select
                value={sellId}
                onChange={(e) => {
                  const selId = e.target.value;
                  setSellId(selId);
                  // Pre-populate amount if it is single line and empty
                  const matchedSale = unpaidInvoices.find((s) => s._id === selId);
                  if (matchedSale && paymentLines.length === 1 && !paymentLines[0].amount) {
                    setPaymentLines([{ paymentType: "UPI", amount: matchedSale.unpaidAmount || "" }]);
                  }
                }}
                disabled={!!editRecord || !!linkedSell || !partyId || loadingInvoices}
                className="w-full border border-gray-200 rounded-xl pl-10 pr-10 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed font-semibold text-gray-700 h-[42px] appearance-none transition-all"
              >
                {loadingInvoices ? (
                  <option value="">-- Loading customer sales bills... --</option>
                ) : !partyId ? (
                  <option value="">-- Choose Customer First --</option>
                ) : unpaidInvoices.length === 0 ? (
                  <option value="">-- No outstanding sales bills found --</option>
                ) : (
                  <>
                    <option value="">-- Select Sales Bill --</option>
                    {unpaidInvoices.map((s) => (
                      <option key={s._id} value={s._id}>
                        Bill {s.invoiceNo || s._id.substring(0, 8).toUpperCase()} (Date: {new Date(s.createdAt).toLocaleDateString("en-IN")} - Outstanding: ₹{s.unpaidAmount})
                      </option>
                    ))}
                  </>
                )}
              </select>
              <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-gray-400">
                {loadingInvoices ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </div>
            {partyId && !loadingInvoices && unpaidInvoices.length === 0 && (
              <div className="mt-3.5 p-4 bg-emerald-50/50 border border-emerald-150 rounded-2xl flex gap-3.5 animate-in fade-in duration-200 text-xs">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
                  <Check className="w-4 h-4 text-white stroke-[3.5]" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <h4 className="font-bold text-emerald-800 text-[13px] leading-tight">Customer account is fully settled.</h4>
                  <p className="text-gray-550 font-semibold">No unpaid sales bills found.</p>
                  
                  <div className="border-t border-emerald-200/40 my-3"></div>
                  
                  <div className="flex items-start gap-2 text-slate-600 font-medium text-[11px] leading-relaxed">
                    <Info className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>Any amount received now will be recorded as an Advance Payment and adjusted against future sales bills.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-2">3. Reference Number (Optional)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <FileText className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="TXN / Cheque ID"
                  value={paymentLines[0]?.referenceNo || ""}
                  onChange={(e) => updatePaymentLine(0, "referenceNo", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white font-semibold text-gray-800 h-[42px] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-900 mb-2">4. Payment Date</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Calendar className="w-4 h-4" />
                </span>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white font-semibold text-gray-800 h-[42px] transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <label className="text-xs font-bold text-gray-900">5. Payment Mode & Amount *</label>
              <button
                type="button"
                onClick={handleAddPaymentLine}
                className="text-[11px] text-emerald-600 font-bold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Mode
              </button>
            </div>

            {paymentLines.map((line, idx) => (
              <div key={idx} className="flex gap-2.5 items-center bg-gray-50/50 p-3 rounded-xl border border-gray-200 animate-in fade-in duration-150">
                <div className="relative w-[30%]">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <CreditCard className="w-3.5 h-3.5" />
                  </span>
                  <select
                    value={line.paymentType}
                    onChange={(e) => updatePaymentLine(idx, "paymentType", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-2 py-1.5 text-[11px] bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-gray-700 h-[38px] cursor-pointer"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-450 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    placeholder="Amount"
                    value={line.amount}
                    onChange={(e) => updatePaymentLine(idx, "amount", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-gray-800 h-[38px]"
                    required
                  />
                </div>

                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <FileText className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Ref No (Optional)"
                    value={line.referenceNo || ""}
                    onChange={(e) => updatePaymentLine(idx, "referenceNo", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-gray-800 h-[38px]"
                  />
                </div>

                {paymentLines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePaymentLine(idx)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            {selectedSale && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 animate-in fade-in duration-150 text-[11px] text-slate-500 font-bold mt-2">
                <div className="flex justify-between">
                  <span>Outstanding Balance:</span>
                  <span>₹{baseOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                {editRecord && isCurrentlyLinked && (
                  <div className="flex justify-between">
                    <span>Original Received Amount:</span>
                    <span>₹{originalReceived.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-705 font-extrabold border-t pt-1.5 border-slate-200 mt-1">
                  <span>New Outstanding Dues:</span>
                  <span className="text-slate-900 font-black">₹{newOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-900 mb-2">6. Notes / Description (Optional)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-gray-400">
                <Pencil className="w-4 h-4" />
              </span>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Record any details regarding transaction settlement..."
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white font-semibold text-gray-800"
              />
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 border rounded-xl text-sm font-semibold text-gray-600 bg-white hover:bg-gray-100 disabled:opacity-50 transition active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-450 text-white rounded-xl text-sm font-bold shadow-sm transition active:scale-95 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {editRecord
              ? (loading ? "Saving..." : "Save Changes")
              : (loading ? "Logging..." : "Save Payment")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: Record Sales Return Modal
// ─────────────────────────────────────────────────────────────
function RecordReturnModal({ editRecord = null, sales, onClose, onSuccess }) {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.sell);
  const { products, stockSummary } = useSelector((state) => state.inventory);

  const [selectedSaleId, setSelectedSaleId] = useState(
    editRecord ? (editRecord.sale?._id || editRecord.sale || "") : ""
  );
  const [description, setDescription] = useState(
    editRecord ? (editRecord.description || "") : ""
  );
  const [returnItems, setReturnItems] = useState([]);

  // Fetch sales invoices when modal mounts so the dropdown has choices
  useEffect(() => {
    dispatch(fetchSales({ limit: 100, saleType: "SALE" }));
  }, [dispatch]);

  // Ensure the linked sale of the return we're editing is included in the dropdown list
  const dropdownSales = useMemo(() => {
    if (editRecord && editRecord.sale) {
      const saleObj = typeof editRecord.sale === "object" ? editRecord.sale : null;
      const saleId = saleObj?._id || editRecord.sale;
      const exists = sales.some((s) => s._id === saleId);
      if (!exists && saleObj) {
        return [saleObj, ...sales];
      }
    }
    return sales;
  }, [sales, editRecord]);

  // Fetch loaded invoice details when user selects a sale
  useEffect(() => {
    if (!selectedSaleId) {
      setReturnItems([]);
      return;
    }
    const sale = dropdownSales.find((s) => s._id === selectedSaleId);
    if (sale) {
      // Map original items to returnable array
      const mapped = (sale.items || []).map((item) => {
        // Find if this item was already returned in editRecord
        let returnQty = 0;
        if (editRecord && (editRecord.sale?._id || editRecord.sale) === selectedSaleId) {
          const editItem = editRecord.items?.find((ei) => (ei.item?._id || ei.item) === (item.item?._id || item.item));
          if (editItem) returnQty = editItem.quantity;
        }

        return {
          itemId: item.item?._id || item.item,
          name: resolveItemLabel(item, products, stockSummary),
          unit: item.unit || "pcs",
          pricePerUnit: item.pricePerUnit || item.rate || 0,
          purchasedQty: item.quantity || 0,
          returnQty, // initialize with the edited value
          discountPercent: item.discountPercent || 0,
          taxPercent: item.taxPercent || 0,
          taxType: item.taxType || "Without Tax",
        };
      });
      setReturnItems(mapped);
    }
  }, [selectedSaleId, dropdownSales, editRecord, products, stockSummary]);

  const handleReturnQtyChange = (idx, val) => {
    setReturnItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[idx] };
      const v = Math.min(item.purchasedQty, Math.max(0, parseInt(val) || 0));
      item.returnQty = v;
      copy[idx] = item;
      return copy;
    });
  };

  // Compute Return Bills
  const computeItemReturnBill = (item) => {
    const q = item.returnQty;
    const base = q * item.pricePerUnit;
    const disc = base * (item.discountPercent / 100);
    const taxable = base - disc;
    
    if (item.taxType === "With Tax") {
      return taxable;
    } else {
      const tax = taxable * (item.taxPercent / 100);
      return taxable + tax;
    }
  };

  const subTotal = returnItems.reduce((acc, item) => acc + (item.returnQty * item.pricePerUnit), 0);
  const totalAmount = returnItems.reduce((acc, item) => acc + computeItemReturnBill(item), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedSaleId) {
      toast.error("Please select an original sale invoice");
      return;
    }

    const validReturns = returnItems
      .filter((i) => i.returnQty > 0)
      .map((i) => {
        const base = i.returnQty * i.pricePerUnit;
        const discAmt = base * (i.discountPercent / 100);
        const taxable = base - discAmt;
        let taxVal = 0;
        let amount = 0;
        let rate = i.pricePerUnit;

        if (i.taxType === "With Tax") {
          amount = taxable;
          const exclTax = amount / (1 + i.taxPercent / 100);
          taxVal = amount - exclTax;
          rate = i.pricePerUnit / (1 + i.taxPercent / 100);
        } else {
          taxVal = taxable * (i.taxPercent / 100);
          amount = taxable + taxVal;
          rate = i.pricePerUnit;
        }

        return {
          item: i.itemId,
          quantity: i.returnQty,
          unit: i.unit,
          pricePerUnit: i.pricePerUnit,
          rate: parseFloat(rate.toFixed(2)),
          taxType: i.taxType,
          discountPercent: i.discountPercent,
          discountAmount: parseFloat(discAmt.toFixed(2)),
          taxPercent: i.taxPercent,
          taxAmount: parseFloat(taxVal.toFixed(2)),
          amount: parseFloat(amount.toFixed(2)),
        };
      });

    if (validReturns.length === 0) {
      toast.error("Please specify at least one return quantity > 0");
      return;
    }

    const sale = dropdownSales.find((s) => s._id === selectedSaleId);

    const payload = {
      sale: selectedSaleId,
      party: sale?.party?._id || sale?.party || undefined,
      items: validReturns,
      subTotal,
      totalAmount,
      description: description.trim() || undefined,
    };

    try {
      if (editRecord) {
        await dispatch(updateSalesReturn({ id: editRecord._id, payload })).unwrap();
        toast.success("Sales Return updated successfully!");
      } else {
        await dispatch(recordSalesReturn(payload)).unwrap();
        toast.success("Sales Return logged successfully!");
      }
      onSuccess();
    } catch (err) {
      toast.error(err || "Failed to log sales return");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white">
          <h2 className="text-lg font-bold text-gray-900">
            {editRecord ? "Edit Sales Return (Credit Note)" : "Record Sales Return (Credit Note)"}
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-650 rounded-lg transition hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 bg-gray-50/20">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Select Original Sales Bill *</label>
            <select
              value={selectedSaleId}
              onChange={(e) => setSelectedSaleId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white cursor-pointer"
            >
              <option value="">-- Select Sales Bill --</option>
              {dropdownSales.map((s) => (
                <option key={s._id} value={s._id}>
                  Sales Bill {s.invoiceNo || s._id.substring(0,8).toUpperCase()} - {s.party?.name || s.buyerName} (₹{s.totalAmount})
                </option>
              ))}
            </select>
          </div>

          {returnItems.length > 0 && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-gray-500 block border-b pb-1.5">Returned Quantities</label>
              
              <div className="max-h-60 overflow-y-auto space-y-2.5">
                {returnItems.map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-center justify-between bg-white p-3 rounded-lg border border-gray-150">
                    <div className="flex-1">
                      <p className="font-semibold text-xs text-gray-800 truncate">{item.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Purchased: {item.purchasedQty} {item.unit} @ ₹{item.pricePerUnit} (Disc: {item.discountPercent}%)
                      </p>
                    </div>

                    <div className="flex gap-2 items-center">
                      <label className="text-[11px] text-gray-400">Return Qty:</label>
                      <input
                        type="number"
                        min="0"
                        max={item.purchasedQty}
                        value={item.returnQty}
                        onChange={(e) => handleReturnQtyChange(idx, e.target.value)}
                        className="w-16 border border-gray-200 rounded px-1.5 py-1 text-xs text-center focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-100 rounded-xl p-4 flex justify-between items-center text-sm font-extrabold text-gray-800">
                <span>Credit Value Refund:</span>
                <span>₹{totalAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Reason / Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="E.g. Minor damage to pesticide bottles returned by customer..."
              className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border rounded-lg text-sm text-gray-655 bg-white hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white rounded-lg text-sm font-semibold shadow-sm transition"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {editRecord
              ? (loading ? "Saving..." : "Save Changes")
              : (loading ? "Recording..." : "Record Return")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: Transaction Details Modal
// ─────────────────────────────────────────────────────────────
function DetailsModal({ item, type, onClose, handleDownloadReceipt, handleDownloadPaymentReceipt }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [overrideSupplyType, setOverrideSupplyType] = useState(item.supplyType || "Tax Invoice");
  const { products, stockSummary } = useSelector((state) => state.inventory);

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const calculateItemDiscountAmount = (it) => {
    if (it.discountAmount !== undefined && it.discountAmount !== null) {
      return Number(it.discountAmount);
    }
    const base = (it.quantity || 0) * (it.pricePerUnit || 0);
    return Number((base * ((it.discountPercent || 0) / 100)).toFixed(2));
  };

  const calculateItemTaxAmount = (it) => {
    if (it.taxAmount !== undefined && it.taxAmount !== null) {
      return Number(it.taxAmount);
    }
    const base = (it.quantity || 0) * (it.pricePerUnit || 0);
    const discAmt = calculateItemDiscountAmount(it);
    const taxable = base - discAmt;
    if (it.taxType === "With Tax") {
      const exclTax = taxable / (1 + (it.taxPercent || 0) / 100);
      return Number((taxable - exclTax).toFixed(2));
    }
    return Number((taxable * ((it.taxPercent || 0) / 100)).toFixed(2));
  };

  const calculateSubtotal = () => {
    if (type === "payment") return item.amount || item.receivedAmount || 0;
    return item.items?.reduce((sum, it) => sum + ((it.quantity || 0) * (it.pricePerUnit || 0)), 0) || 0;
  };

  // Determine label values based on transaction type
  const isSale = type === "sale";
  const isReturn = type === "return";
  const isPayment = type === "payment";

  const titleText = isSale 
    ? `${item.saleType || "SALE"} DETAILS` 
    : isReturn 
      ? "CREDIT NOTE DETAILS" 
      : "PAYMENT RECEIPT DETAILS";

  const billingTypeLabel = isSale 
    ? (item.billingType === "Cash" ? "Cash" : "Credit") 
    : isReturn 
      ? "Credit Note" 
      : "Receipt Entry";

  const transactionNo = isSale 
    ? (item.invoiceNo || item._id?.substring(0, 8).toUpperCase()) 
    : isReturn 
      ? (item.returnNo || item._id?.substring(0, 8).toUpperCase()) 
      : (item.receiptNo || item._id?.substring(0, 8).toUpperCase());

  const dateLabel = isSale ? "Bill Date" : isReturn ? "Return Date" : "Payment Date";
  const displayDate = formatDisplayDate(item.createdAt);

  const dueDateLabel = isSale ? "Due Date" : isReturn ? "Linked Bill #" : "Linked Bill";
  const dueDateVal = isSale 
    ? (item.dueDate || (item.createdAt ? new Date(new Date(item.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000) : null))
    : isReturn 
      ? (item.sale?.invoiceNo || "—") 
      : (item.linkedSell?.invoiceNo || item.sell?.invoiceNo || "—");
  const displayDueDate = isSale ? formatDisplayDate(dueDateVal) : dueDateVal;

  const totalAmountFormatted = `₹${(item.totalAmount || item.receivedAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-5xl p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-150 flex flex-col [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        {/* Header Title */}
        <div className="flex justify-between items-center border-b border-gray-100 pb-4">
          <h2 className="text-base font-extrabold text-gray-900 uppercase tracking-wide flex items-center gap-2">
            <span className="w-10 h-10 rounded-full bg-[#EAF7F0] flex items-center justify-center text-[#00875A]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
            {titleText}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-650 transition duration-150 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Core Summary Cards Box */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch gap-4">
          {/* Summary Row */}
          <div className="flex-1 bg-white border border-gray-150 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
            {/* Sale / Transaction Type */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#EAF7F0] flex items-center justify-center text-[#00875A] shrink-0">
                <Tag className="w-4 h-4" />
              </div>
              <div className="text-left leading-normal">
                <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Type</span>
                <span className="text-xs font-bold text-[#006C47] uppercase">{isSale ? item.saleType : type}</span>
              </div>
            </div>

            {/* Billing Type */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#EAF7F0] flex items-center justify-center text-[#00875A] shrink-0">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <div className="text-left leading-normal">
                <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Billing Type</span>
                <span className="text-xs font-bold text-gray-800">{billingTypeLabel}</span>
              </div>
            </div>

            {/* Bill Number */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#EAF7F0] flex items-center justify-center text-[#00875A] shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-left leading-normal">
                <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Number</span>
                <span className="text-xs font-bold text-gray-800 font-mono">
                  {transactionNo}
                </span>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#EAF7F0] flex items-center justify-center text-[#00875A] shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="text-left leading-normal">
                <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">{dateLabel}</span>
                <span className="text-xs font-bold text-gray-800">{displayDate}</span>
              </div>
            </div>

            {/* Due Date or Linked Reference */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#EAF7F0] flex items-center justify-center text-[#00875A] shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="text-left leading-normal">
                <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">{dueDateLabel}</span>
                <span className="text-xs font-bold text-gray-800 truncate max-w-[110px]">{displayDueDate}</span>
              </div>
            </div>
          </div>

          {/* Total Amount Box */}
          <div className="w-full lg:w-48 bg-[#F4FBF7] border border-[#E3F4EC] rounded-2xl p-4 flex flex-col justify-center items-start lg:items-center text-left lg:text-center leading-normal">
            <span className="text-[10px] text-[#006C47] font-bold block uppercase tracking-wider">Total Amount</span>
            <span className="text-base sm:text-lg font-black text-[#006C47] mt-1 select-all">{totalAmountFormatted}</span>
          </div>
        </div>

        {/* 2. Grid Compartment: Buyer Details vs Sale Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Buyer Details */}
          <div className="border border-gray-150 rounded-2xl p-5 bg-white space-y-4 shadow-3xs">
            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-2 border-b pb-2 border-gray-100 uppercase tracking-wide">
              <User className="w-4 h-4 text-emerald-600" />
              Buyer Details
            </h3>
            <div className="grid grid-cols-[120px_1fr] gap-y-3.5 text-xs">
              <div className="text-gray-500 font-semibold">Buyer Name</div>
              <div className="font-bold text-gray-900">{item.party?.name || item.buyerName || "Walk-in Customer"}</div>
              <div className="text-gray-500 font-semibold">Phone</div>
              <div className="font-bold text-gray-900">{item.buyerPhone || item.party?.phoneNumber || "—"}</div>
              <div className="text-gray-500 font-semibold">Address</div>
              <div className="font-bold text-gray-900">{item.party?.address || item.party?.village || "—"}</div>
              <div className="text-gray-500 font-semibold">Buyer Type</div>
              <div className="font-bold text-gray-900">{item.party?.partyType || item.buyerType || "—"}</div>
              <div className="text-gray-500 font-semibold">State of Supply</div>
              <div className="font-bold text-gray-900">{item.party?.state || item.stateOfSupply || "—"}</div>
            </div>
          </div>

          {/* Sale Info */}
          <div className="border border-gray-150 rounded-2xl p-5 bg-white space-y-4 shadow-3xs">
            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-2 border-b pb-2 border-gray-100 uppercase tracking-wide">
              <Clock className="w-4 h-4 text-emerald-600" />
              {isSale ? "Sale Info" : isReturn ? "Return Info" : "Payment Info"}
            </h3>
            <div className="grid grid-cols-[120px_1fr] gap-y-3.5 text-xs">
              <div className="text-gray-500 font-semibold">{isPayment ? "Payment Mode" : "Payment Type"}</div>
              <div className="font-bold text-gray-900">{item.paymentMode || (item.billingType === "Cash" ? "Cash" : "Credit")}</div>
              {isSale && (
                <div style={{ display: "contents" }}>
                  <div className="text-gray-500 font-semibold">Supply Format</div>
                  <div className="font-bold text-emerald-700 font-bold">{item.supplyType || "Tax Invoice"}</div>
                </div>
              )}
              <div className="text-gray-500 font-semibold">Reference No.</div>
              <div className="font-bold text-gray-900 font-mono">{item.referenceNo || item.payments?.[0]?.referenceNo || "—"}</div>
              <div className="text-gray-500 font-semibold">Description</div>
              <div className="font-bold text-gray-900">{item.description || "—"}</div>
              <div className="text-gray-500 font-semibold">Remarks</div>
              <div className="font-bold text-gray-900">{item.remarks || "—"}</div>
              <div className="text-gray-500 font-semibold">Terms & Conditions</div>
              <div className="font-bold text-gray-900">{item.termsAndConditions || "Goods once sold will not be taken back."}</div>
            </div>
          </div>
        </div>

        {/* 3. Items list table */}
        {(isSale || isReturn) && item.items?.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wide">
              <Layers className="w-4 h-4 text-emerald-600" />
              Items
            </h3>
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-3xs bg-white">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#F8F9FA] text-gray-550 border-b border-gray-150 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">#</th>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-center">Unit</th>
                    <th className="px-4 py-3 text-right">Price / Unit</th>
                    <th className="px-4 py-3 text-right">Rate</th>
                    <th className="px-4 py-3 text-center">Discount</th>
                    <th className="px-4 py-3 text-center">Tax</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {item.items.map((it, idx) => {
                    const resolvedLabel = resolveItemLabel(it, products, stockSummary);
                    const discountAmt = calculateItemDiscountAmount(it);
                    const taxAmt = calculateItemTaxAmount(it);

                    return (
                      <tr key={idx} className="hover:bg-gray-50/50 transition duration-150">
                        <td className="px-4 py-4 text-center font-bold text-gray-400">{idx + 1}</td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-bold text-gray-900 text-xs sm:text-[13px]">{resolvedLabel}</p>
                            <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">
                              {it.item?._id || it.item || "INVENTORY_ITEM_ID"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center font-bold text-gray-800 text-xs sm:text-[13px]">
                          {it.quantity}
                        </td>
                        <td className="px-4 py-4 text-center font-semibold text-gray-500">{it.unit || "—"}</td>
                        <td className="px-4 py-4 text-right font-semibold text-gray-700">₹{(it.pricePerUnit || 0).toFixed(2)}</td>
                        <td className="px-4 py-4 text-right font-semibold text-gray-700">₹{(it.rate || it.pricePerUnit || 0).toFixed(2)}</td>
                        <td className="px-4 py-4 text-center">
                          <div className="leading-tight">
                            <span className="font-semibold text-gray-700 block">{it.discountPercent > 0 ? `${it.discountPercent}%` : "—"}</span>
                            {discountAmt > 0 && (
                              <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">(-₹{discountAmt.toFixed(2)})</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="leading-tight text-center">
                            <span className="font-semibold text-gray-700 block">{it.taxPercent || 0}%</span>
                            {taxAmt > 0 && (
                              <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">(₹{taxAmt.toFixed(2)})</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right font-black text-gray-900 text-xs sm:text-[13px]">
                          ₹{(it.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. Payment Summary Box */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wide">
            <Wallet className="w-4 h-4 text-emerald-600" />
            Payment Summary
          </h3>
          <div className="border border-gray-150 rounded-2xl p-6 bg-white grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-stretch shadow-3xs">
            {/* Left column: values list */}
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-medium">Sub Total</span>
                <span className="font-bold text-gray-800">₹{calculateSubtotal().toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-medium">{isReturn ? "Refunded Discount" : "Discount Amount"}</span>
                <span className="font-bold text-[#00875A]">-₹{(item.discountAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-medium">{isReturn ? "Refunded Tax" : "Tax Amount"}</span>
                <span className="font-bold text-gray-800">₹{(item.taxAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-medium">Round Off</span>
                <span className={`font-bold ${item.roundOff < 0 ? "text-emerald-600" : "text-gray-800"}`}>
                  {item.roundOff < 0 ? "-" : ""}₹{Math.abs(item.roundOff || 0).toFixed(2)}
                </span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between items-center select-all">
                <span className="text-sm font-extrabold text-gray-900">Total Amount</span>
                <span className="text-base font-black text-gray-950">{totalAmountFormatted}</span>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="hidden md:block w-px bg-gray-100 self-stretch"></div>

            {/* Right column: balances and credit alert card */}
            <div className="flex flex-col justify-between gap-4 text-xs">
              <div className="space-y-3.5">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-medium">{isReturn ? "Returned Cash" : isPayment ? "Received Cash" : "Received Amount"}</span>
                  <span className="font-bold text-gray-800">₹{(item.receivedAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-medium">{isReturn ? "Pending Balance" : isPayment ? "Remaining Dues" : "Unpaid Amount"}</span>
                  <span className={`font-bold ${(item.unpaidAmount || 0) > 0 ? "text-rose-600 font-bold" : "text-gray-800"}`}>
                    ₹{(item.unpaidAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Status alert card */}
              <div className="border border-[#E3F4EC] bg-[#F4FBF7] rounded-2xl p-4 flex items-start gap-3 mt-1.5 shadow-2xs">
                <span className="w-10 h-10 rounded-full bg-[#EAF7F0] flex items-center justify-center text-[#00875A] shrink-0">
                  <Wallet className="w-4 h-4" />
                </span>
                <div className="text-left leading-normal">
                  <span className="font-bold text-[#006C47] block text-xs">
                    {isReturn 
                      ? "Credit Issued" 
                      : (item.billingType === "Credit" || item.unpaidAmount > 0) 
                        ? "Credit Sale" 
                        : "Fully Settled"}
                  </span>
                  <span className="text-gray-500 text-[10px] block mt-0.5">
                    {isReturn 
                      ? "Refund added to credit account" 
                      : (item.billingType === "Credit" || item.unpaidAmount > 0) 
                        ? "Amount pending from buyer" 
                        : "Fully settled at checkout"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions block */}
        <div className="flex justify-between items-center border-t border-gray-100 pt-4 flex-wrap gap-4 select-none">
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => {
                if (isPayment) {
                  handleDownloadPaymentReceipt(item._id);
                } else {
                  handleDownloadReceipt(item._id, item.invoiceNo || "Invoice", overrideSupplyType);
                }
              }}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-xl text-xs transition duration-150 active:scale-95 cursor-pointer shadow-3xs bg-white"
            >
              <Printer size={14} /> Print / Download PDF
            </button>

            {!isPayment && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">PDF Title Override:</span>
                <select
                  value={overrideSupplyType}
                  onChange={(e) => setOverrideSupplyType(e.target.value)}
                  className="border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-800 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500"
                >
                  <option value="Tax Invoice">Tax Invoice</option>
                  <option value="Exempted Supply">Exempted Supply</option>
                  <option value="Zero Rated">Zero Rated</option>
                </select>
              </div>
            )}
          </div>

          <div className="text-right flex items-baseline gap-2 leading-none">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Amount</span>
            <span className="text-xl font-black text-emerald-700">
              {totalAmountFormatted}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

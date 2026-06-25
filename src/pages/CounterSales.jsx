import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams, useNavigate } from "react-router-dom";
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
import api from "../lib/api";
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
} from "lucide-react";

const TABS = [
  { key: "sales", label: "Sales Invoices", icon: FileText },
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
  const activeTab = searchParams.get("tab") || "sales";

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
  
  // Local list filters
  const [searchQuery, setSearchQuery] = useState("");
  const [saleTypeFilter, setSaleTypeFilter] = useState("all");
  const [billingFilter, setBillingFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Viewing detail state
  const [detailItem, setDetailItem] = useState(null);
  const [detailType, setDetailType] = useState("sale"); // 'sale', 'payment', 'return'

  useEffect(() => {
    dispatch(clearSellStatus());
    dispatch(fetchParties());
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
  const handleDownloadReceipt = async (id, invoiceNo = "Invoice") => {
    try {
      toast.loading("Generating receipt PDF...", { id: "pdf-download" });
      const res = await api.get(`/sell/receipt/${id}`, { responseType: "blob" });
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
    if (window.confirm("Are you sure you want to delete this invoice? This will revert inventory stock and ledger updates!")) {
      try {
        await dispatch(deleteSale(id)).unwrap();
        toast.success("Invoice deleted successfully");
        loadListData();
      } catch (err) {
        toast.error(err || "Failed to delete invoice");
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
          <p className="text-sm text-gray-500">Manage walk-in cash checkouts, credit sales, customer invoices, and returns</p>
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
                  New Invoice
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
              onClick={() => setSearchParams({ tab: t.key })}
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
                  <tr>
                    <th className="px-6 py-4">Invoice #</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Buyer/Party</th>
                    <th className="px-6 py-4">Payment</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4 text-right">Total Amount</th>
                    <th className="px-6 py-4 text-right">Received Amount</th>
                    <th className="px-6 py-4 text-right">Unpaid Amount</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-16 text-center text-gray-400">
                        <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                        <p className="font-medium">No sales invoices found</p>
                      </td>
                    </tr>
                  ) : (
                    sales.map((sale) => (
                      <tr key={sale._id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 font-bold text-gray-900">{sale.invoiceNo || sale._id.substring(0, 8).toUpperCase()}</td>
                        <td className="px-6 py-4 text-gray-500">{formatDate(sale.createdAt)}</td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-bold text-gray-800">{sale.party?.name || sale.buyerName || "Walk-in Customer"}</p>
                            {(sale.buyerPhone || sale.party?.phoneNumber) && (
                              <p className="text-xs text-gray-400 mt-0.5">{sale.buyerPhone || sale.party?.phoneNumber}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            sale.billingType === "Credit"
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-green-50 text-green-700 border border-green-100"
                          }`}>
                            {sale.billingType === "Cash" ? "Money Received" : "Udhar (Credit)"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            sale.saleType === "SALE"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {sale.saleType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-extrabold text-gray-950">₹{(sale.totalAmount || 0).toLocaleString("en-IN")}</td>
                        <td className="px-6 py-4 text-right text-green-700 font-semibold">₹{(sale.receivedAmount || 0).toLocaleString("en-IN")}</td>
                        <td className="px-6 py-4 text-right text-red-650 font-semibold">₹{(sale.unpaidAmount || 0).toLocaleString("en-IN")}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleViewDetails(sale, "sale")}
                              className="p-2 text-gray-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadReceipt(sale._id, sale.invoiceNo || "Receipt")}
                              className="p-2 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                              title="Download Invoice PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {sale.billingType === "Credit" && sale.saleType === "SALE" && sale.unpaidAmount > 0 && !isReadOnly && (
                              <button
                                onClick={() => {
                                  setLinkedSellForPayment(sale);
                                  setPaymentModalOpen(true);
                                }}
                                className="p-2 text-gray-650 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition animate-pulse"
                                title="Receive Payment"
                              >
                                <IndianRupee className="w-4 h-4 text-emerald-650" />
                              </button>
                            )}
                            {!isReadOnly && (
                              <button
                                onClick={() => navigate(`/sell/invoice/edit/${sale._id}`)}
                                className="p-2 text-gray-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                                title="Edit Invoice/Estimate"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {sale.saleType === "ESTIMATE" && !isReadOnly && (
                              <button
                                onClick={() => handleConvertEstimate(sale._id)}
                                className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold rounded-lg transition"
                                title="Convert to Sale"
                              >
                                Convert to Sale
                              </button>
                            )}
                            {!isReadOnly && (
                              <button
                                onClick={() => handleDeleteSale(sale._id)}
                                className="p-2 text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                title="Delete Invoice"
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

            {activeTab === "payments" && (
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-600 uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-4">Receipt #</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Party/Customer</th>
                    <th className="px-6 py-4">Linked Invoice</th>
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
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleViewDetails(p, "payment")}
                              className="p-2 text-gray-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadPaymentReceipt(p._id)}
                              className="p-2 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                              title="Download Payment Receipt PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {!isReadOnly && !p.isAutoGenerated && (
                              <button
                                onClick={() => {
                                  setEditPaymentRecord(p);
                                  setPaymentModalOpen(true);
                                }}
                                className="p-2 text-gray-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                                title="Edit Payment Receipt"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {!isReadOnly && !p.isAutoGenerated && (
                              <button
                                onClick={() => handleDeletePayment(p._id)}
                                className="p-2 text-gray-600 hover:text-red-750 hover:bg-red-50 rounded-lg transition"
                                title="Delete Payment Receipt"
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

            {activeTab === "returns" && (
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-600 uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-4">Credit Note #</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Party/Customer</th>
                    <th className="px-6 py-4">Linked Invoice</th>
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
                        <td className="px-6 py-4 text-gray-500 font-mono">{r.sale?.invoiceNo || "Invoice ID"}</td>
                        <td className="px-6 py-4 text-right font-extrabold text-red-650">₹{(r.totalAmount || 0).toLocaleString("en-IN")}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleViewDetails(r, "return")}
                              className="p-2 text-gray-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {!isReadOnly && (
                              <button
                                onClick={() => {
                                  setEditReturnRecord(r);
                                  setReturnModalOpen(true);
                                }}
                                className="p-2 text-gray-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                                title="Edit Sales Return"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {!isReadOnly && (
                              <button
                                onClick={() => handleDeleteReturn(r._id)}
                                className="p-2 text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                title="Delete Return"
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
            <label className="block text-xs font-bold text-gray-900 mb-2">2. Link Sales Invoice (Optional)</label>
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
                  <option value="">-- Loading customer invoices... --</option>
                ) : !partyId ? (
                  <option value="">-- Choose Customer First --</option>
                ) : unpaidInvoices.length === 0 ? (
                  <option value="">-- No outstanding invoices found --</option>
                ) : (
                  <>
                    <option value="">-- Select Bill invoice --</option>
                    {unpaidInvoices.map((s) => (
                      <option key={s._id} value={s._id}>
                        Invoice {s.invoiceNo || s._id.substring(0, 8).toUpperCase()} (Date: {new Date(s.createdAt).toLocaleDateString("en-IN")} - Outstanding: ₹{s.unpaidAmount})
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
                  <p className="text-gray-550 font-semibold">No unpaid invoices found.</p>
                  
                  <div className="border-t border-emerald-200/40 my-3"></div>
                  
                  <div className="flex items-start gap-2 text-slate-600 font-medium text-[11px] leading-relaxed">
                    <Info className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>Any amount received now will be recorded as an Advance Payment and adjusted against future invoices.</span>
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
      party: sale?.party?._id || sale?.party || null,
      items: validReturns,
      subTotal,
      totalAmount,
      description,
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
            <label className="block text-xs font-semibold text-gray-500 mb-1">Select Original Sale Invoice *</label>
            <select
              value={selectedSaleId}
              onChange={(e) => setSelectedSaleId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white cursor-pointer"
            >
              <option value="">-- Select Invoice --</option>
              {dropdownSales.map((s) => (
                <option key={s._id} value={s._id}>
                  Invoice {s.invoiceNo || s._id.substring(0,8).toUpperCase()} - {s.party?.name || s.buyerName} (₹{s.totalAmount})
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
            className="px-4 py-2 border rounded-lg text-sm text-gray-600 bg-white hover:bg-gray-100 disabled:opacity-50"
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
  const { products, stockSummary } = useSelector((state) => state.inventory);

  return (
    <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-100">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide">
            {type === "sale"
              ? `${item.saleType} DETAILS`
              : type === "payment"
              ? "PAYMENT RECEIPT DETAILS"
              : "CREDIT NOTE DETAILS"}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-650 text-xl font-bold">✕</button>
        </div>

        {/* Core details block */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs bg-gray-50/50 p-4 rounded-xl border border-gray-100">
          <div>
            <p className="text-gray-400 font-semibold uppercase tracking-wider">Reference Code / ID</p>
            <p className="font-bold text-gray-800 mt-0.5">
              {item.invoiceNo || item.billNumber || item.receiptNo || item.returnNo || (item._id ? item._id.substring(0, 8).toUpperCase() : "—")}
            </p>
          </div>
          <div>
            <p className="text-gray-400 font-semibold uppercase tracking-wider">Recorded On</p>
            <p className="font-bold text-gray-800 mt-0.5">
              {new Date(item.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div>
            <p className="text-gray-400 font-semibold uppercase tracking-wider">Party/Customer</p>
            <p className="font-bold text-gray-800 mt-0.5">{item.party?.name || item.buyerName || "Walk-in Customer"}</p>
          </div>
          {type === "sale" && (
            <>
              <div>
                <p className="text-gray-400 font-semibold uppercase tracking-wider">Payment</p>
                <p className="font-bold text-gray-800 mt-0.5">{item.billingType === "Cash" ? "Money Received" : "Udhar (Credit)"}</p>
              </div>
              <div>
                <p className="text-gray-400 font-semibold uppercase tracking-wider">Type</p>
                <p className="font-bold text-gray-800 mt-0.5">{item.saleType}</p>
              </div>
            </>
          )}
          {type === "return" && (
            <div>
              <p className="text-gray-400 font-semibold uppercase tracking-wider">Linked Invoice #</p>
              <p className="font-bold text-gray-800 mt-0.5 font-mono">{item.sale?.invoiceNo || "Invoice ID"}</p>
            </div>
          )}
          {type === "payment" && (
            <>
              <div>
                <p className="text-gray-400 font-semibold uppercase tracking-wider">Linked Invoice</p>
                <p className="font-bold text-gray-800 mt-0.5 font-mono">
                  {item.linkedSell?.invoiceNo || item.sell?.invoiceNo || "None (General)"}
                </p>
              </div>
              <div>
                <p className="text-gray-400 font-semibold uppercase tracking-wider">Receipt Type</p>
                <p className="font-bold text-gray-800 mt-0.5">
                  {item.isAutoGenerated ? "Auto-Generated" : "Manual Entry"}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Item Arrays for sales / returns */}
        {(type === "sale" || type === "return") && item.items?.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Particular Items</h4>
            <div className="border border-gray-150 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2">Item Description</th>
                    <th className="px-4 py-2 text-center">Qty</th>
                    <th className="px-4 py-2 text-center">Unit</th>
                    <th className="px-4 py-2 text-right">Price / Unit</th>
                    <th className="px-4 py-2 text-right">Rate</th>
                    <th className="px-4 py-2 text-right">Discount</th>
                    <th className="px-4 py-2 text-right">Discount Amt.</th>
                    <th className="px-4 py-2 text-center">Tax</th>
                    <th className="px-4 py-2 text-right">Tax Amt.</th>
                    <th className="px-4 py-2 text-right">Net Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {item.items.map((it, idx) => {
                    const resolvedLabel = resolveItemLabel(it, products, stockSummary);
                    return (
                      <tr key={idx} className="hover:bg-gray-55/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {resolvedLabel}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-700">{it.quantity}</td>
                        <td className="px-4 py-3 text-center text-gray-500 font-medium">{it.unit || "—"}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-700">₹{(it.pricePerUnit || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-700">₹{(it.rate || it.pricePerUnit || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-gray-550">{it.discountPercent > 0 ? `${it.discountPercent}%` : "—"}</td>
                        <td className="px-4 py-3 text-right text-red-655">-₹{(it.discountAmount || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-center text-gray-550">
                          <div>{it.taxPercent || 0}%</div>
                          <div className="text-[9px] text-gray-400 font-semibold">{it.taxType || "Without Tax"}</div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 font-bold">₹{(it.taxAmount || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-black text-emerald-600">₹{(it.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments breakdown arrays */}
        {type === "payment" && item.payments?.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Payment Breakdown</h4>
            <div className="border border-gray-150 rounded-xl overflow-hidden shadow-xs bg-white p-3 divide-y divide-gray-100">
              {item.payments.map((py, idx) => (
                <div key={idx} className="flex justify-between py-2 text-xs">
                  <div>
                    <span className="font-bold text-gray-800 uppercase">{py.paymentType}</span>
                    {py.referenceNo && <span className="text-[10px] text-gray-400 ml-2 font-mono">(Ref: {py.referenceNo})</span>}
                  </div>
                  <span className="font-extrabold text-green-700">₹{py.amount.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description / remarks */}
        {(item.remarks || item.description) && (
          <div className="text-xs">
            <span className="font-semibold text-gray-400 block uppercase tracking-wider mb-1">Remarks/Notes</span>
            <p className="bg-gray-50 border border-gray-100 rounded-lg p-3 font-medium text-gray-700 italic">
              {item.remarks || item.description}
            </p>
          </div>
        )}

        {/* Invoice Grand Totals block */}
        <div className="flex justify-between items-center border-t border-gray-100 pt-3 flex-wrap gap-2">
          {type === "sale" && (
            <button
              onClick={() => handleDownloadReceipt(item._id, item.invoiceNo || "Invoice")}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-brand-500 text-brand-650 hover:bg-brand-50 font-bold rounded-lg text-xs transition"
            >
              <Download size={13} /> Print/Download PDF
            </button>
          )}
          {type === "payment" && (
            <button
              onClick={() => handleDownloadPaymentReceipt(item._id)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-brand-500 text-brand-650 hover:bg-brand-50 font-bold rounded-lg text-xs transition"
            >
              <Download size={13} /> Print/Download PDF
            </button>
          )}

          <div className="text-right ml-auto">
            <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider">Total Valuation</span>
            <span className={`text-xl font-extrabold ${type === "return" ? "text-red-650" : "text-brand-700"}`}>
              ₹{(item.totalAmount || item.receivedAmount || 0).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
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
  Info,
  RefreshCw,
  AlertTriangle,
  FileText,
  IndianRupee,
  CreditCard,
  CheckCircle,
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

export default function CounterSales() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editPaymentRecord, setEditPaymentRecord] = useState(null);
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
                  onClick={() => {
                    setEditRecord(null);
                    setInvoiceModalOpen(true);
                  }}
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
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
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
                            {sale.billingType === "Cash" ? "Pay Now" : "Pay Later"}
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
                            {!isReadOnly && (
                              <button
                                onClick={() => {
                                  setEditRecord(sale);
                                  setInvoiceModalOpen(true);
                                }}
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
                    <th className="px-6 py-4">Payment Breakdown</th>
                    <th className="px-6 py-4 text-right">Received Amount</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                        <IndianRupee className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                        <p className="font-medium">No customer payments recorded</p>
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p._id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 font-bold text-gray-900">{p.receiptNo || p._id.substring(0, 8).toUpperCase()}</td>
                        <td className="px-6 py-4 text-gray-500">{formatDate(p.createdAt)}</td>
                        <td className="px-6 py-4 font-semibold text-gray-800">{p.party?.name || "Unassigned"}</td>
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
                            {!isReadOnly && (
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
                            {!isReadOnly && (
                              <button
                                onClick={() => handleDeletePayment(p._id)}
                                className="p-2 text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
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
         1. NEW INVOICE MODAL (SALE / ESTIMATE)
      ════════════════════════════════════════════════════════════ */}
      {invoiceModalOpen && (
        <NewInvoiceModal
          editRecord={editRecord}
          parties={parties}
          products={products}
          stockSummary={stockSummary}
          onClose={() => {
            setInvoiceModalOpen(false);
            setEditRecord(null);
          }}
          onSuccess={() => {
            setInvoiceModalOpen(false);
            setEditRecord(null);
            loadListData();
          }}
        />
      )}

      {/* ════════════════════════════════════════════════════════════
         2. RECORD PAYMENT MODAL
      ════════════════════════════════════════════════════════════ */}
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
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: New Invoice Modal
// ─────────────────────────────────────────────────────────────
function NewInvoiceModal({ editRecord = null, parties, products, stockSummary = [], onClose, onSuccess }) {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.sell);

  const [saleType, setSaleType] = useState(editRecord ? editRecord.saleType : "SALE");
  const [billingType, setBillingType] = useState(editRecord ? editRecord.billingType : "Credit");
  const [selectedPartyId, setSelectedPartyId] = useState(editRecord ? (editRecord.party?._id || editRecord.party || "") : "");
  
  // Manual Entry walk-in fields
  const [buyerName, setBuyerName] = useState(editRecord ? (editRecord.buyerName || "") : "");
  const [buyerPhone, setBuyerPhone] = useState(editRecord ? (editRecord.buyerPhone || "") : "");
  const [buyerAddress, setBuyerAddress] = useState(editRecord ? (editRecord.buyerAddress || "") : "");
  const [buyerType, setBuyerType] = useState(editRecord ? (editRecord.buyerType || "FARMER") : "FARMER");
  const [remarks, setRemarks] = useState(editRecord ? (editRecord.remarks || "") : "");

  // Items checkout array
  const [checkoutItems, setCheckoutItems] = useState(() => {
    if (editRecord && editRecord.items?.length > 0) {
      return editRecord.items.map((it) => {
        const targetItemId = it.item?._id || it.item;
        const stockRecord = stockSummary.find((s) => s.item?._id === targetItemId || s._id === targetItemId);
        let productId = stockRecord?.item?.sourceRef || "";
        
        if (!productId) {
          const matchedProd = products.find(p => p._id === targetItemId || p.products?.some(v => v._id === targetItemId));
          if (matchedProd) {
            productId = matchedProd._id;
          }
        }

        const prod = products.find(p => p._id === productId);
        let variantIndex = 0;
        if (prod?.products) {
          const vIdx = prod.products.findIndex(v => v._id === targetItemId || v.unit === it.unit);
          if (vIdx !== -1) variantIndex = vIdx;
        }

        const discType = it.discountPercent > 0 ? "Percentage" : "Fixed Amount";

        return {
          productId,
          variantIndex,
          quantity: it.quantity,
          pricePerUnit: it.pricePerUnit || it.rate || "",
          discountPercent: it.discountPercent || "",
          discountAmount: it.discountAmount || "",
          discountType: discType,
          taxPercent: it.taxPercent || "",
          taxAmount: it.taxAmount || 0,
          amount: it.amount || 0,
        };
      });
    }
    return [
      {
        productId: "",
        variantIndex: 0,
        quantity: 1,
        pricePerUnit: "",
        discountPercent: "",
        discountAmount: "",
        discountType: "Percentage",
        taxPercent: "",
        taxAmount: 0,
        amount: 0,
      },
    ];
  });

  const handleAddLine = () => {
    setCheckoutItems((prev) => [
      ...prev,
      {
        productId: "",
        variantIndex: 0,
        quantity: 1,
        pricePerUnit: "",
        discountPercent: "",
        discountAmount: "",
        discountType: "Percentage",
        taxPercent: "",
        taxAmount: 0,
        amount: 0,
      },
    ]);
  };

  const handleRemoveLine = (idx) => {
    if (checkoutItems.length > 1) {
      setCheckoutItems((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const updateLineItem = (idx, field, value) => {
    setCheckoutItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[idx], [field]: value };
      
      const prod = products.find((p) => p._id === item.productId);
      const variant = prod?.products?.[item.variantIndex];

      if (field === "productId") {
        item.variantIndex = 0;
        const newVariant = prod?.products?.[0];
        item.pricePerUnit = newVariant?.salePrice || "";
        item.taxPercent = prod?.taxRate !== undefined && prod?.taxRate !== null ? parseFloat(prod.taxRate) : "";
        item.discountPercent = "";
        item.discountAmount = "";
        item.discountType = "Percentage";
        item.quantity = 1;
      }
      if (field === "variantIndex") {
        item.pricePerUnit = variant?.salePrice || "";
        item.discountPercent = "";
        item.discountAmount = "";
        item.discountType = "Percentage";
        item.quantity = 1;
      }

      // Compute math details — always exclusive tax math
      const q = item.quantity === "" ? 0 : (parseFloat(item.quantity) || 0);
      const price = item.pricePerUnit === "" ? 0 : (parseFloat(item.pricePerUnit) || 0);
      const base = q * price;

      // Calculate discount only if product is selected
      if (item.productId) {
        if (item.discountType === "Fixed Amount") {
          if (item.discountAmount === "") {
            item.discountPercent = "";
          } else {
            const discAmt = parseFloat(item.discountAmount) || 0;
            const finalDiscAmt = Math.min(base, Math.max(0, discAmt));
            item.discountAmount = finalDiscAmt;
            item.discountPercent = base > 0 ? parseFloat(((finalDiscAmt / base) * 100).toFixed(2)) : 0;
          }
        } else {
          if (item.discountPercent === "") {
            item.discountAmount = "";
          } else {
            const discPct = parseFloat(item.discountPercent) || 0;
            const finalDiscPct = Math.min(100, Math.max(0, discPct));
            item.discountPercent = finalDiscPct;
            item.discountAmount = parseFloat((base * (finalDiscPct / 100)).toFixed(2));
          }
        }
      }

      // Tax is always calculated on (base - discountAmount) — exclusive
      const discountVal = item.discountAmount === "" ? 0 : (parseFloat(item.discountAmount) || 0);
      const taxable = Math.max(0, base - discountVal);
      const taxPct = item.taxPercent === "" ? 0 : (parseFloat(item.taxPercent) || 0);
      item.taxAmount = parseFloat((taxable * (taxPct / 100)).toFixed(2));
      item.amount = parseFloat((taxable + item.taxAmount).toFixed(2));

      copy[idx] = item;
      return copy;
    });
  };

  // Compute Grand Totals for UI display
  const subTotal = parseFloat(checkoutItems.reduce((acc, item) => acc + ((item.quantity === "" ? 0 : (parseFloat(item.quantity) || 0)) * (item.pricePerUnit === "" ? 0 : (parseFloat(item.pricePerUnit) || 0))), 0).toFixed(2));
  const totalDiscounts = parseFloat(checkoutItems.reduce((acc, item) => acc + (item.discountAmount === "" ? 0 : (parseFloat(item.discountAmount) || 0)), 0).toFixed(2));
  const totalTaxes = parseFloat(checkoutItems.reduce((acc, item) => acc + (parseFloat(item.taxAmount) || 0), 0).toFixed(2));
  const grandTotal = parseFloat(checkoutItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0).toFixed(2));

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (!selectedPartyId && !buyerName.trim()) {
      toast.error("Please select a registered party or enter Walk-in Buyer Name");
      return;
    }

    const validItems = checkoutItems.filter((i) => i.productId && (i.quantity === "" ? 0 : (parseFloat(i.quantity) || 0)) > 0);
    if (validItems.length === 0) {
      toast.error("Please add at least one valid inventory item");
      return;
    }

    // Stock quantity validation for SALE type
    if (saleType === "SALE") {
      for (const item of validItems) {
        const prod = products.find((p) => p._id === item.productId);
        const variant = prod?.products?.[item.variantIndex];
        const availableQty = variant?.quantity ?? 0;
        // In edit mode, allow the existing qty to not trigger stock violation since it's already deducted from stock
        let originalQty = 0;
        if (editRecord) {
          const targetItemId = variant?._id || prod?._id;
          const origItem = editRecord.items?.find((o) => (o.item?._id || o.item) === targetItemId);
          if (origItem) originalQty = origItem.quantity;
        }
        if ((item.quantity === "" ? 0 : (parseFloat(item.quantity) || 0)) > (availableQty + originalQty)) {
          toast.error(
            `Quantity (${item.quantity}) for "${prod?.productName || "Product"} - ${variant?.parameter || ""} ${variant?.unit || ""}" exceeds available stock (${availableQty + originalQty})`
          );
          return;
        }
      }
    }

    const payloadItems = validItems.map((item) => {
      const prod = products.find((p) => p._id === item.productId);
      const variant = prod?.products?.[item.variantIndex];
      // Find the correct inventory item ID from stockSummary
      const stockRecord = stockSummary.find((s) => s.item?.sourceRef === prod?._id);
      const inventoryItemId = stockRecord?.item?._id || variant?._id || prod?._id;
      return {
        item: inventoryItemId,
        quantity: item.quantity === "" ? 0 : (parseInt(item.quantity) || 0),
        unit: variant?.unit || "pcs",
        pricePerUnit: parseFloat((parseFloat(item.pricePerUnit) || 0).toFixed(2)),
        rate: parseFloat((parseFloat(item.pricePerUnit) || 0).toFixed(2)),
        taxType: "Without Tax",
        discountPercent: parseFloat((parseFloat(item.discountPercent) || 0).toFixed(2)),
        discountAmount: parseFloat((parseFloat(item.discountAmount) || 0).toFixed(2)),
        taxPercent: parseFloat((parseFloat(item.taxPercent) || 0).toFixed(2)),
        taxAmount: parseFloat((parseFloat(item.taxAmount) || 0).toFixed(2)),
        amount: parseFloat((parseFloat(item.amount) || 0).toFixed(2)),
      };
    });

    const payload = {
      saleType,
      billingType,
      party: selectedPartyId || null,
      buyerName: selectedPartyId ? parties.find((p) => p._id === selectedPartyId)?.name : buyerName,
      buyerPhone: selectedPartyId ? parties.find((p) => p._id === selectedPartyId)?.phoneNumber : buyerPhone,
      buyerAddress: selectedPartyId ? parties.find((p) => p._id === selectedPartyId)?.billingAddress : buyerAddress,
      buyerType: selectedPartyId ? "FARMER" : buyerType,
      items: payloadItems,
      subTotal,
      totalAmount: grandTotal,
      remarks,
    };

    try {
      if (editRecord) {
        await dispatch(updateSaleOrEstimate({ id: editRecord._id, payload })).unwrap();
        toast.success("Transaction updated successfully!");
      } else {
        await dispatch(createSaleOrEstimate(payload)).unwrap();
        toast.success("Transaction recorded successfully!");
      }
      onSuccess();
    } catch (err) {
      toast.error(err || "Failed to submit transaction");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white">
          <h2 className="text-lg font-bold text-gray-900">
            {editRecord ? "Edit Counter Invoice / Estimate" : "Create New Counter Invoice"}
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 bg-gray-50/35">
          {/* Top Parameters */}
          <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Sale Type</label>
              <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50/50 w-full h-[38px] items-center">
                <button
                  type="button"
                  onClick={() => setSaleType("SALE")}
                  className={`flex-1 h-full rounded-md text-xs font-semibold transition-all ${
                    saleType === "SALE" ? "bg-brand-600 text-white shadow-sm" : "text-gray-500"
                  }`}
                >
                  Direct Sale
                </button>
                <button
                  type="button"
                  onClick={() => setSaleType("ESTIMATE")}
                  className={`flex-1 h-full rounded-md text-xs font-semibold transition-all ${
                    saleType === "ESTIMATE" ? "bg-brand-600 text-white shadow-sm" : "text-gray-500"
                  }`}
                >
                  Estimate/Quotation
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Payment</label>
              <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50/50 w-full h-[38px] items-center">
                <button
                  type="button"
                  onClick={() => setBillingType("Credit")}
                  className={`flex-1 h-full rounded-md text-xs font-semibold transition-all ${
                    billingType === "Credit" ? "bg-brand-600 text-white shadow-sm" : "text-gray-500"
                  }`}
                >
                  Pay Later
                </button>
                <button
                  type="button"
                  onClick={() => setBillingType("Cash")}
                  className={`flex-1 h-full rounded-md text-xs font-semibold transition-all ${
                    billingType === "Cash" ? "bg-brand-600 text-white shadow-sm" : "text-gray-500"
                  }`}
                >
                  Pay Now
                </button>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Party Profile</label>
              <select
                value={selectedPartyId}
                onChange={(e) => setSelectedPartyId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white h-[38px] cursor-pointer"
              >
                <option value="">-- Direct Walk-In (Manual Entry) --</option>
                {parties.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} - +91 {p.phoneNumber || "No Phone"} ({p.gstType})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Manual Entry details if no party is chosen */}
          {!selectedPartyId && (
            <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-gray-800 text-xs border-l-4 border-brand-600 pl-2">Walk-In Customer Profiles</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Buyer Name *</label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="E.g. Ramesh Kumar"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Buyer Phone</label>
                  <input
                    type="text"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Buyer Address</label>
                  <input
                    type="text"
                    value={buyerAddress}
                    onChange={(e) => setBuyerAddress(e.target.value)}
                    placeholder="E.g. Village Deoria"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Buyer Segment</label>
                  <select
                    value={buyerType}
                    onChange={(e) => setBuyerType(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    <option value="FARMER">Farmer</option>
                    <option value="RETAILER">Retailer</option>
                    <option value="DISTRIBUTOR">Distributor</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Items Checkout Lines */}
          <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-800 text-sm border-l-4 border-brand-600 pl-2">Checkout Item List</h3>
              <button
                type="button"
                onClick={handleAddLine}
                className="text-xs text-brand-650 hover:underline flex items-center gap-1 font-bold"
              >
                + Add Item Line
              </button>
            </div>

            <div className="space-y-3">
              {checkoutItems.map((item, idx) => {
                const selectedProd = products.find((p) => p._id === item.productId);
                const selectedVariant = selectedProd?.products?.[item.variantIndex];
                const availableQty = selectedVariant?.quantity ?? 0;

                return (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-9 gap-3 items-end bg-gray-50/50 p-3 rounded-lg border border-gray-100 relative">
                    {/* Remove button */}
                    {checkoutItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="absolute top-2 right-2 md:static text-gray-400 hover:text-red-500 p-1 md:mb-2"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}

                    {/* Product Autocomplete dropdown */}
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1">Select Product</label>
                      <select
                        value={item.productId}
                        onChange={(e) => updateLineItem(idx, "productId", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                      >
                        <option value="">-- Select Product --</option>
                        {products.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.productName} ({p.brand})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Variant dropdown */}
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1">Variant Size</label>
                      <select
                        disabled={!item.productId}
                        value={item.variantIndex}
                        onChange={(e) => updateLineItem(idx, "variantIndex", parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        {selectedProd?.products?.map((v, vIdx) => (
                          <option key={vIdx} value={vIdx}>
                            {v.parameter} {v.unit}
                          </option>
                        ))}
                        {!selectedProd && <option value="0">—</option>}
                      </select>
                    </div>

                    {/* Quantity field */}
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1">
                        Qty {selectedVariant && <span className="text-[9px] text-gray-500">(Max: {availableQty})</span>}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={availableQty || undefined}
                        disabled={!item.productId}
                        value={item.quantity}
                        onChange={(e) => updateLineItem(idx, "quantity", e.target.value === "" ? "" : (parseInt(e.target.value) || 0))}
                        placeholder="0"
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </div>

                    {/* Price field */}
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1">Unit Price</label>
                      <input
                        type="number"
                        min="0"
                        disabled={!item.productId}
                        value={item.pricePerUnit}
                        onChange={(e) => updateLineItem(idx, "pricePerUnit", e.target.value === "" ? "" : (parseFloat(e.target.value) || 0))}
                        placeholder="0.00"
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </div>

                    {/* Discount */}
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1">Discount</label>
                      <div className="flex border border-gray-200 rounded-lg bg-white overflow-hidden items-center focus-within:ring-1 focus-within:ring-brand-500 focus-within:border-brand-500">
                        <input
                          type="number"
                          min="0"
                          disabled={!item.productId}
                          value={item.discountType === "Fixed Amount" ? item.discountAmount : item.discountPercent}
                          onChange={(e) => {
                            const val = e.target.value === "" ? "" : (parseFloat(e.target.value) || 0);
                            if (item.discountType === "Fixed Amount") {
                              updateLineItem(idx, "discountAmount", val);
                            } else {
                              updateLineItem(idx, "discountPercent", val);
                            }
                          }}
                          placeholder={item.discountType === "Fixed Amount" ? "₹0.00" : "0%"}
                          className="w-full border-0 px-2 py-1.5 text-xs focus:ring-0 focus:outline-none min-w-0 disabled:bg-gray-100 disabled:text-gray-400"
                        />
                        <select
                          disabled={!item.productId}
                          value={item.discountType || "Percentage"}
                          onChange={(e) => {
                            updateLineItem(idx, "discountType", e.target.value);
                          }}
                          className="border-l border-gray-200 bg-gray-50 text-[10px] px-1 py-1.5 focus:ring-0 focus:outline-none font-bold text-gray-500 cursor-pointer h-full"
                        >
                          <option value="Percentage">%</option>
                          <option value="Fixed Amount">₹</option>
                        </select>
                      </div>
                      {item.productId && (
                        <span className="text-[9px] text-brand-600 mt-1 block">
                          {item.discountType === "Percentage" ? "Enter discount %" : "Enter flat ₹"}
                        </span>
                      )}
                    </div>

                    {/* Tax rate percent */}
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1">Tax rate (GST %)</label>
                      <input
                        type="number"
                        min="0"
                        disabled={!item.productId}
                        value={item.taxPercent}
                        onChange={(e) => updateLineItem(idx, "taxPercent", parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </div>

                    {/* Line totals */}
                    <div className="text-right md:col-span-2 pr-2 pb-1.5">
                      <span className="block text-[9px] text-gray-400 uppercase">Subtotal</span>
                      <span className="font-bold text-gray-800 text-sm">₹{(item.amount || 0).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Remarks & Invoice Calculations Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Invoice Notes / Remarks</label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="E.g. Paid via digital UPI, credit details logged to ledger..."
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs space-y-2.5">
              <h4 className="font-bold text-gray-800 text-xs border-b border-gray-100 pb-1.5">Invoice Total Bill</h4>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal (Base Bill)</span>
                <span>₹{subTotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-sm text-red-600 font-medium">
                <span>Discounts Applied</span>
                <span>-₹{totalDiscounts.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Taxes & GST</span>
                <span>+₹{totalTaxes.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2.5 font-extrabold text-base text-slate-900">
                <span>Grand Total (Net Due)</span>
                <span>₹{grandTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
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
            className="flex items-center gap-2 px-6 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white rounded-lg text-sm font-semibold shadow-sm transition"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {editRecord
              ? (loading ? "Saving..." : "Save Changes")
              : (loading ? "Creating..." : `Create ${saleType === "SALE" ? "Invoice" : "Estimate"}`)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: Record Payment Modal
// ─────────────────────────────────────────────────────────────
function RecordPaymentModal({ editRecord = null, parties, onClose, onSuccess }) {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.sell);

  const [partyId, setPartyId] = useState(editRecord ? (editRecord.party?._id || editRecord.party || "") : "");
  const [description, setDescription] = useState(editRecord ? (editRecord.description || "") : "");

  const [paymentLines, setPaymentLines] = useState(() => {
    if (editRecord && editRecord.payments?.length > 0) {
      return editRecord.payments.map((py) => ({
        paymentType: py.paymentType,
        amount: py.amount || "",
        referenceNo: py.referenceNo || "",
      }));
    }
    return [{ paymentType: "upi", amount: "" }];
  });

  const handleAddPaymentLine = () => {
    setPaymentLines((prev) => [...prev, { paymentType: "upi", amount: "" }]);
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
    };

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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white">
          <h2 className="text-lg font-bold text-gray-900">
            {editRecord ? "Edit Customer Payment Receipt" : "Record Customer Payment In"}
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-gray-50/20">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Customer Party *</label>
            <select
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white cursor-pointer"
            >
              <option value="">-- Select Customer --</option>
              {parties.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} (+91 {p.phoneNumber || "No Phone"})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-1.5">
              <label className="text-xs font-semibold text-gray-500">Payment Breakdown</label>
              <button
                type="button"
                onClick={handleAddPaymentLine}
                className="text-[11px] text-brand-650 font-bold hover:underline"
              >
                + Add Mode
              </button>
            </div>

            {paymentLines.map((line, idx) => (
              <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                <select
                  value={line.paymentType}
                  onChange={(e) => updatePaymentLine(idx, "paymentType", e.target.value)}
                  className="w-1/3 border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank">Bank Transfer</option>
                </select>
                <input
                  type="number"
                  placeholder="Amount"
                  value={line.amount}
                  onChange={(e) => updatePaymentLine(idx, "amount", e.target.value)}
                  className="w-1/3 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <input
                  type="text"
                  placeholder="Ref No (Optional)"
                  value={line.referenceNo || ""}
                  onChange={(e) => updatePaymentLine(idx, "referenceNo", e.target.value)}
                  className="w-1/3 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                {paymentLines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePaymentLine(idx)}
                    className="p-1 text-red-500 hover:text-red-700 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Total Amount (Auto-sum)</label>
            <div className="w-full bg-gray-100 rounded-lg px-3 py-2 text-sm font-extrabold text-gray-800">
              ₹{totalAmount.toLocaleString("en-IN")}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Description / Notes</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="E.g. Cleared invoice balance dues..."
              className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
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
              : (loading ? "Logging..." : "Log Payment")}
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
          name: item.item?.productName || "Product",
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
  }, [selectedSaleId, dropdownSales, editRecord]);

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
    const tax = taxable * (item.taxPercent / 100);
    return taxable + tax;
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
        const taxVal = taxable * (i.taxPercent / 100);
        return {
          item: i.itemId,
          quantity: i.returnQty,
          unit: i.unit,
          pricePerUnit: i.pricePerUnit,
          rate: i.pricePerUnit,
          taxType: i.taxType,
          discountPercent: i.discountPercent,
          discountAmount: discAmt,
          taxPercent: i.taxPercent,
          taxAmount: taxVal,
          amount: taxable + taxVal,
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
function DetailsModal({ item, type, onClose, handleDownloadReceipt }) {
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
            <p className="font-bold text-gray-800 mt-0.5">{item.invoiceNo || item.receiptNo || item.returnNo || item._id}</p>
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
                <p className="font-bold text-gray-800 mt-0.5">{item.billingType === "Cash" ? "Pay Now" : "Pay Later"}</p>
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
                    <th className="px-4 py-2 text-right">Qty</th>
                    <th className="px-4 py-2 text-right">Price per Unit</th>
                    <th className="px-4 py-2 text-right">Discount</th>
                    <th className="px-4 py-2 text-right">Net Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {item.items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2 font-medium text-gray-800">
                        {it.item?.productName || "Product"}
                        {it.unit && <span className="text-gray-400 text-[10px] ml-1">({it.unit})</span>}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-gray-700">{it.quantity}</td>
                      <td className="px-4 py-2 text-right font-semibold text-gray-700">₹{it.pricePerUnit || it.rate}</td>
                      <td className="px-4 py-2 text-right text-red-600">-₹{(it.discountAmount || 0).toFixed(1)}</td>
                      <td className="px-4 py-2 text-right font-bold text-slate-800">₹{(it.amount || 0).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
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

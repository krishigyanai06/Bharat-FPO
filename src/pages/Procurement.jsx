import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchOrders, createOrder, deleteOrder, updateOrder } from "../store/thunks/procurementThunk";
import { fetchMembers } from "../store/thunks/membersThunk";
import { 
  fetchProcurementStock, 
  fetchProcurementStockLogs, 
  adjustProcurementStock 
} from "../redux/procurementSaleThunk";
import { SkeletonHeader, SkeletonStatCards, SkeletonTable } from "../components/Skeleton";
import api from "../lib/api";
import {
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Search,
  Eye,
  MapPin,
  MoreVertical,
  Sprout,
  Plus,
  SlidersHorizontal,
  Loader2,
  Info,
  Pencil,
  Trash2,
  Download,
  Warehouse,
  Calendar,
  User,
  Activity,
  FileText,
  PlusCircle,
  MinusCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

const getCropImage = (cropObj) =>
  cropObj?.image || cropObj?.imageUrl || cropObj?.cropImage || null;

const formatDisplayDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatCurrency = (value) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
};

function Procurement() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Tabs State
  const [activeTab, setActiveTab] = useState("purchases"); // "purchases", "stock", "logs"

  // Purchases selectors & local state
  const { orders, loading } = useSelector((s) => s.procurement);
  const { members = [] } = useSelector((s) => s.members || {});
  
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [searchQuery, setSearchQuery] = useState("");
  const [viewOrder, setViewOrder] = useState(null);

  // Stock selectors & adjustment state
  const { stock = [], stockLogs = [], loading: stockLoading, logsLoading, adjusting } = useSelector(
    (s) => s.procurementSales || { stock: [], stockLogs: [] }
  );

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    cropName: "",
    variety: "",
    godown: "Main Godown",
    unit: "Kg",
    quantityChanged: "",
    remarks: "",
  });

  // Initial fetch for Purchases and Members
  useEffect(() => {
    dispatch(fetchOrders());
    dispatch(fetchMembers());
  }, [dispatch]);

  // Tab dynamic loading
  useEffect(() => {
    if (activeTab === "stock") {
      dispatch(fetchProcurementStock());
    } else if (activeTab === "logs") {
      dispatch(fetchProcurementStockLogs());
    }
  }, [activeTab, dispatch]);

  const handleEditPurchase = (order) => {
    navigate(`/purchase/crop/${order._id}`);
  };

  const handleDeletePurchase = (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This will remove the procurement record permanently!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await dispatch(deleteOrder(id)).unwrap();
          toast.success("Procurement order deleted.");
        } catch (err) {
          toast.error(err || "Delete failed");
        }
      }
    });
  };

  const handleDownloadReceipt = async (orderId) => {
    try {
      const loadId = toast.loading("Downloading procurement PDF...");
      const res = await api.get(`/procurement/receipt/${orderId}`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Procurement_Receipt_${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("PDF Downloaded successfully!", { id: loadId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to download procurement PDF");
    }
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustForm.cropName.trim()) {
      toast.error("Crop name is required");
      return;
    }
    const qty = Number(adjustForm.quantityChanged);
    if (isNaN(qty) || qty === 0) {
      toast.error("Quantity change must be a non-zero number");
      return;
    }

    try {
      await dispatch(
        adjustProcurementStock({
          cropName: adjustForm.cropName,
          variety: adjustForm.variety,
          godown: adjustForm.godown,
          unit: adjustForm.unit,
          quantityChanged: qty,
          remarks: adjustForm.remarks,
        })
      ).unwrap();

      toast.success("Stock adjusted successfully!");
      setShowAdjustModal(false);
      setAdjustForm({
        cropName: "",
        variety: "",
        godown: "Main Godown",
        unit: "Kg",
        quantityChanged: "",
        remarks: "",
      });
      dispatch(fetchProcurementStock());
    } catch (err) {
      toast.error(err || "Adjustment failed");
    }
  };

  // Filter logic for Purchases
  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const farmerName = `${o.farmer?.firstName ?? ""} ${o.farmer?.lastName ?? ""}`.toLowerCase();
    const crops = o.crops?.map((c) => c.cropName?.toLowerCase()).join(" ") ?? "";
    const center = o.procurementCenter?.toLowerCase() ?? "";
    return farmerName.includes(q) || crops.includes(q) || center.includes(q);
  });

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);



  if (loading && activeTab === "purchases") {
    return (
      <div className="space-y-6">
        <SkeletonHeader />
        <SkeletonStatCards count={3} />
        <SkeletonTable rows={9} cols={8} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Procurement Management</h1>
          <p className="text-xs text-gray-500 font-semibold mt-1">
            Manage crop purchases, monitor godown inventories, and adjust stock logs.
          </p>
        </div>

        {activeTab === "stock" && (
          <button
            onClick={() => setShowAdjustModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-700 hover:bg-brand-850 text-white font-bold rounded-xl text-xs transition cursor-pointer active:scale-95 shadow-sm"
          >
            <SlidersHorizontal size={14} /> Adjust Stock Levels
          </button>
        )}
      </div>

      {/* TABS INTERFACE */}
      <div className="flex border-b border-gray-200 bg-white px-2.5 rounded-t-2xl">
        {[
          { id: "purchases", label: "Procurement Purchases" },
          { id: "stock", label: "Procurement Stock levels" },
          { id: "logs", label: "Stock transaction logs" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-xs font-extrabold transition-all border-b-2 uppercase tracking-wider ${
              activeTab === tab.id
                ? "border-brand-600 text-brand-700 font-black"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: PURCHASES ── */}
      {activeTab === "purchases" && (
        <div className="space-y-6 animate-fade-in">
          {/* SEARCH */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by farmer, crop, or center..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-150 overflow-hidden overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 border-b border-gray-150">
                <tr className="text-[10px] text-gray-400 font-bold uppercase tracking-wider select-none">
                  <th className="px-4 py-3 text-left w-8">#</th>
                  <th className="px-4 py-3 text-left">Crop Details</th>
                  <th className="px-4 py-3 text-left">Farmer Details</th>
                  <th className="px-4 py-3 text-left">Quantity & Price</th>
                  <th className="px-4 py-3 text-left">Total Value</th>
                  <th className="px-4 py-3 text-left">Logistics & Warehouse</th>
                  <th className="px-4 py-3 text-left">Submitted On</th>
                  <th className="px-4 py-3 text-center w-40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                {paginatedOrders.map((order, index) => {
                  const firstCrop = order.crops?.[0];
                  const cropImg = getCropImage(firstCrop);

                  return (
                    <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 text-gray-400 text-xs">{startIndex + index + 1}</td>

                      {/* Crop Details */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg border border-gray-150 overflow-hidden flex-shrink-0 bg-amber-50 flex items-center justify-center">
                            {cropImg ? (
                              <img
                                src={cropImg}
                                alt={firstCrop?.cropName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  e.target.parentNode.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22V12"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><path d="M12 12C12 6 17 2 17 2s-5 4-5 10"/><path d="M12 12C12 6 7 2 7 2s5 4 5 10"/></svg>`;
                                }}
                              />
                            ) : (
                              <Sprout className="w-5 h-5 text-amber-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 text-sm">{firstCrop?.cropName || "—"}</p>
                            {firstCrop?.variety && <p className="text-[10px] text-gray-400">{firstCrop.variety}</p>}
                          </div>
                        </div>
                      </td>

                      {/* Farmer Details */}
                      <td className="px-4 py-4">
                        <p className="font-bold text-gray-800 text-xs">
                          {order.farmer?.firstName} {order.farmer?.lastName}
                        </p>
                        {order.farmer?.role && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Role: {order.farmer.role}
                          </p>
                        )}
                      </td>

                      {/* Quantity & Price */}
                      <td className="px-4 py-4">
                        {order.crops?.map((c, i) => (
                          <div key={i} className="text-xs">
                            <div className="flex items-center gap-1 text-gray-700 font-bold">
                              <Package size={10} className="text-gray-400" />
                              <span>{c.quantity} {c.unit || "qtl"}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5 ml-3.5">₹{Number(c.rate).toLocaleString()} / {c.unit || "qtl"}</p>
                          </div>
                        ))}
                      </td>

                      {/* Total Value */}
                      <td className="px-4 py-4">
                        <span className="text-sm font-extrabold text-green-600">
                          {formatCurrency(order.totalAmount)}
                        </span>
                      </td>

                      {/* Logistics & Warehouse */}
                      <td className="px-4 py-4">
                        {order.godown && (
                          <p className="text-xs text-gray-700 flex items-center gap-1">
                            <Warehouse size={11} className="text-gray-400" />
                            {order.godown}
                          </p>
                        )}
                        {order.procurementCenter && (
                          <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                            <MapPin size={10} className="text-gray-450" />
                            {order.procurementCenter}
                          </p>
                        )}
                        {order.vehicle && (
                          <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                            Vehicle: {order.vehicle}
                          </p>
                        )}
                        {!order.godown && !order.procurementCenter && !order.vehicle && (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Submitted On */}
                      <td className="px-4 py-4 text-gray-450">
                        <p className="text-xs text-gray-700">
                          {order.procurementDate ? formatDisplayDate(order.procurementDate) : "—"}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setViewOrder(order)}
                            title="View PO Details"
                            className="p-1 rounded-lg text-gray-450 hover:text-brand-700 hover:bg-brand-50 transition cursor-pointer font-bold"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => handleDownloadReceipt(order._id)}
                            title="Download Receipt PDF"
                            className="p-1 rounded-lg text-gray-450 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer font-bold"
                          >
                            <Download size={13} />
                          </button>
                          <button
                            onClick={() => handleEditPurchase(order)}
                            title="Edit PO"
                            className="p-1 rounded-lg text-gray-450 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer font-bold"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDeletePurchase(order._id)}
                            title="Delete PO"
                            className="p-1 rounded-lg text-gray-450 hover:text-red-500 hover:bg-red-50 transition cursor-pointer font-bold"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredOrders.length && (
                  <tr>
                    <td colSpan="8" className="text-center py-10 text-gray-400 select-none">
                      No purchase orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {totalPages >= 1 && (
            <div className="flex justify-between items-center text-xs text-gray-500 font-semibold select-none">
              <span>
                Showing {filteredOrders.length === 0 ? 0 : startIndex + 1} to{" "}
                {Math.min(startIndex + ITEMS_PER_PAGE, filteredOrders.length)} of{" "}
                {filteredOrders.length} listings
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="px-2 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs ${
                      p === currentPage ? "bg-brand-600 text-white font-bold" : "border hover:bg-gray-50 text-gray-600"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="px-2 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: STOCK LEVELS ── */}
      {activeTab === "stock" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden overflow-x-auto animate-fade-in">
          {stockLoading && stock.length === 0 ? (
            <div className="p-10 flex justify-center items-center">
              <Loader2 className="w-8 h-8 text-brand-650 animate-spin" />
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 border-b border-gray-150">
                <tr className="text-[10px] text-gray-400 font-bold uppercase tracking-wider select-none">
                  <th className="px-4 py-3 text-left w-8">#</th>
                  <th className="px-4 py-3 text-left">Crop</th>
                  <th className="px-4 py-3 text-left">Variety</th>
                  <th className="px-4 py-3 text-left">Godown</th>
                  <th className="px-4 py-3 text-right">Available stock</th>
                  <th className="px-4 py-3 text-right">Estimated Rate (₹)</th>
                  <th className="px-4 py-3 text-center">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                {stock.map((item, index) => (
                  <tr key={item._id || index} className="hover:bg-gray-50/50 transition">
                    <td className="px-4 py-3 text-gray-400">{index + 1}</td>
                    <td className="px-4 py-3 text-gray-900 font-bold">{item.cropName}</td>
                    <td className="px-4 py-3 text-gray-500">{item.variety || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{item.godown || "—"}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-brand-600">
                      {item.availableQuantity}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">
                      {formatCurrency(item.rate)}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-450">{item.unit || "qtl"}</td>
                  </tr>
                ))}
                {stock.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-400 select-none">
                      No stock levels found in procurement godown database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── TAB 3: TRANSACTION LOGS ── */}
      {activeTab === "logs" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden overflow-x-auto animate-fade-in">
          {logsLoading && stockLogs.length === 0 ? (
            <div className="p-10 flex justify-center items-center">
              <Loader2 className="w-8 h-8 text-brand-650 animate-spin" />
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 border-b border-gray-150">
                <tr className="text-[10px] text-gray-400 font-bold uppercase tracking-wider select-none">
                  <th className="px-4 py-3 text-left w-8">#</th>
                  <th className="px-4 py-3 text-left">Crop details</th>
                  <th className="px-4 py-3 text-left">Godown</th>
                  <th className="px-4 py-3 text-right">Adjustment</th>
                  <th className="px-4 py-3 text-left">Remarks</th>
                  <th className="px-4 py-3 text-left">Adjusted On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                {stockLogs.map((log, index) => {
                  const qty = Number(log.quantityChanged || log.quantity || 0);
                  const isPositive = qty > 0;
                  return (
                    <tr key={log._id || index} className="hover:bg-gray-50/50 transition">
                      <td className="px-4 py-3 text-gray-400">{index + 1}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-gray-800 block">{log.cropName}</span>
                        {log.variety && <span className="text-[10px] text-gray-400">Variety: {log.variety}</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{log.godown || "—"}</td>
                      <td className="px-4 py-3 text-right font-extrabold">
                        <span className={isPositive ? "text-green-600" : "text-red-500"}>
                          {isPositive ? `+${qty}` : qty} {log.unit || "Kg"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{log.remarks || "—"}</td>
                      <td className="px-4 py-3 text-gray-450 font-medium">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString("en-IN") : "—"}
                      </td>
                    </tr>
                  );
                })}
                {stockLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400 select-none">
                      No stock log adjustment records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── STOCK ADJUSTMENT MODAL ── */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-fade-in p-4">
          <form onSubmit={handleAdjustSubmit} className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl text-xs font-semibold text-gray-700">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Manual Stock Adjustment</h2>
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                  Crop Name *
                </label>
                <input
                  type="text"
                  required
                  value={adjustForm.cropName}
                  onChange={(e) => setAdjustForm({ ...adjustForm, cropName: e.target.value })}
                  placeholder="e.g. Wheat, Paddy, Pulses"
                  className="w-full border border-gray-200 px-3 py-2 rounded-xl focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                    Variety
                  </label>
                  <input
                    type="text"
                    value={adjustForm.variety}
                    onChange={(e) => setAdjustForm({ ...adjustForm, variety: e.target.value })}
                    placeholder="e.g. Sharbati"
                    className="w-full border border-gray-200 px-3 py-2 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                    Godown Warehouse
                  </label>
                  <input
                    type="text"
                    value={adjustForm.godown}
                    onChange={(e) => setAdjustForm({ ...adjustForm, godown: e.target.value })}
                    placeholder="e.g. Godown A"
                    className="w-full border border-gray-200 px-3 py-2 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                    Change Amount (Use +/-) *
                  </label>
                  <input
                    type="number"
                    required
                    step="any"
                    value={adjustForm.quantityChanged}
                    onChange={(e) => setAdjustForm({ ...adjustForm, quantityChanged: e.target.value })}
                    placeholder="e.g. -5 for waste, 10 for surplus"
                    className="w-full border border-gray-200 px-3 py-2 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                    Measurement Unit
                  </label>
                  <select
                    value={adjustForm.unit}
                    onChange={(e) => setAdjustForm({ ...adjustForm, unit: e.target.value })}
                    className="w-full border border-gray-200 bg-white px-3 py-2 rounded-xl focus:outline-none"
                  >
                    <option value="Kg">Kg</option>
                    <option value="qtl">qtl</option>
                    <option value="Ton">Ton</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                  Remarks / Adjustment Reason
                </label>
                <textarea
                  rows={2}
                  value={adjustForm.remarks}
                  onChange={(e) => setAdjustForm({ ...adjustForm, remarks: e.target.value })}
                  placeholder="e.g. Moisture spoilage / Weighing variance..."
                  className="w-full border border-gray-200 px-3 py-2 rounded-xl focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="flex-1 py-2 border rounded-xl hover:bg-gray-50 transition font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adjusting}
                className="flex-1 py-2 bg-brand-700 hover:bg-brand-850 text-white rounded-xl transition flex items-center justify-center gap-1.5 font-bold disabled:opacity-50 cursor-pointer"
              >
                {adjusting && <Loader2 size={12} className="animate-spin" />}
                Confirm Adjustment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── REDESIGNED VIEW DETAILS MODAL ── */}
      {viewOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl text-xs font-semibold text-gray-700 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/70 rounded-t-3xl">
              <div>
                <h2 className="text-base font-black text-gray-800 tracking-tight">Procurement Details</h2>
                <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                  Purchase ID: <span className="font-mono text-brand-700 font-extrabold">{viewOrder.purchaseId || "—"}</span>
                </p>
              </div>
              <button
                onClick={() => setViewOrder(null)}
                className="w-8 h-8 rounded-full bg-white border border-gray-150 flex items-center justify-center text-gray-400 hover:text-gray-650 hover:shadow-sm transition cursor-pointer active:scale-95 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              
              {/* Compact Information Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Farmer Name", value: `${viewOrder.farmer?.firstName || ""} ${viewOrder.farmer?.lastName || ""}`, icon: User },
                  { label: "Farmer Role", value: viewOrder.farmer?.role || "Farmer", icon: User },
                  { label: "Procurement Date", value: formatDisplayDate(viewOrder.procurementDate), icon: Calendar },
                  { label: "Center", value: viewOrder.procurementCenter || "—", icon: MapPin },
                  { label: "Godown", value: viewOrder.godown || "—", icon: Warehouse },
                  { label: "Vehicle", value: viewOrder.vehicle || "—", icon: Truck },
                  { label: "Previous Dues", value: formatCurrency(viewOrder.previousDues), icon: Activity },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-gray-50/60 border border-gray-150 p-3 rounded-2xl flex flex-col justify-between shadow-xs">
                    <span className="text-[9px] text-gray-400 uppercase font-black tracking-wider flex items-center gap-1">
                      <Icon size={10} className="text-gray-400" /> {label}
                    </span>
                    <span className="font-extrabold text-gray-800 mt-1 block truncate text-xs">{value}</span>
                  </div>
                ))}
              </div>

              {/* Crops Table Card */}
              <div className="border border-gray-150 rounded-2xl overflow-hidden shadow-xs bg-white">
                <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-150">
                  <h3 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Sprout size={12} className="text-gray-400" /> Procured Crops List
                  </h3>
                </div>
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/40 text-[9px] text-gray-400 font-extrabold uppercase border-b border-gray-150 select-none">
                      <th className="px-4 py-2.5">Crop</th>
                      <th className="px-4 py-2.5">Variety</th>
                      <th className="px-4 py-2.5 text-right">Quantity</th>
                      <th className="px-4 py-2.5 text-center">Unit</th>
                      <th className="px-4 py-2.5 text-right">Rate</th>
                      <th className="px-4 py-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                    {viewOrder.crops?.map((c, i) => {
                      const amount = Number(c.quantity) * Number(c.rate) || 0;
                      return (
                        <tr key={i} className="hover:bg-gray-50/30 transition">
                          <td className="px-4 py-3 font-bold text-gray-850">{c.cropName}</td>
                          <td className="px-4 py-3 text-gray-500">{c.variety || "—"}</td>
                          <td className="px-4 py-3 text-right font-bold text-gray-800">{c.quantity}</td>
                          <td className="px-4 py-3 text-center text-gray-450">{c.unit || "—"}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(c.rate)}</td>
                          <td className="px-4 py-3 text-right font-black text-brand-650">{formatCurrency(amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Remarks Card */}
              {viewOrder.remarks && (
                <div className="bg-gray-50 border border-gray-150 p-4.5 rounded-2xl space-y-1.5 shadow-xs">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <FileText size={11} /> Remarks / Notes
                  </h4>
                  <p className="text-xs text-gray-650 leading-relaxed font-semibold whitespace-pre-wrap">{viewOrder.remarks}</p>
                </div>
              )}

              {/* Final Summary Card */}
              <div className="bg-brand-50/20 border border-brand-100/50 p-5 rounded-2xl flex flex-col space-y-2.5 max-w-sm ml-auto shadow-xs">
                <div className="flex justify-between items-center text-gray-500 font-semibold">
                  <span>Current Amount:</span>
                  <span className="font-extrabold text-gray-700">
                    {formatCurrency(
                      viewOrder.crops?.reduce((sum, c) => sum + (Number(c.quantity) * Number(c.rate) || 0), 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-550 font-semibold pb-2 border-b border-gray-200">
                  <span>Previous Dues (Debit Adjust):</span>
                  <span className="font-extrabold text-red-500">
                    - {formatCurrency(viewOrder.previousDues)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-900 text-sm font-black pt-1">
                  <span>Total Payable:</span>
                  <span className="text-brand-700 text-base">{formatCurrency(viewOrder.totalAmount)}</span>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4.5 border-t border-gray-100 bg-gray-50/50 rounded-b-3xl flex justify-end">
              <button
                onClick={() => setViewOrder(null)}
                className="px-6 py-2.5 bg-brand-700 hover:bg-brand-850 text-white rounded-xl font-black text-xs transition cursor-pointer active:scale-95 shadow-sm"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Procurement;

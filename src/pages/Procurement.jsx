import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchOrders } from "../store/thunks/procurementThunk";
import { SkeletonHeader, SkeletonStatCards, SkeletonTable } from "../components/Skeleton";
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
} from "lucide-react";

const CROP_IMAGES = {
  paddy:     "https://images.unsplash.com/photo-1536054985791-5e3e4b8e8b8e?w=120&h=120&fit=crop&q=80",
  rice:      "https://images.unsplash.com/photo-1536054985791-5e3e4b8e8b8e?w=120&h=120&fit=crop&q=80",
  wheat:     "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=120&h=120&fit=crop&q=80",
  maize:     "https://images.unsplash.com/photo-1601593346740-925612772716?w=120&h=120&fit=crop&q=80",
  corn:      "https://images.unsplash.com/photo-1601593346740-925612772716?w=120&h=120&fit=crop&q=80",
  tomato:    "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=120&h=120&fit=crop&q=80",
  soybean:   "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=120&h=120&fit=crop&q=80",
  cotton:    "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=120&h=120&fit=crop&q=80",
  sugarcane: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=120&h=120&fit=crop&q=80",
  onion:     "https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=120&h=120&fit=crop&q=80",
  potato:    "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=120&h=120&fit=crop&q=80",
  mustard:   "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&h=120&fit=crop&q=80",
  groundnut: "https://images.unsplash.com/photo-1567892737950-30c4db37cd89?w=120&h=120&fit=crop&q=80",
};

const getCropImage = (cropName) =>
  CROP_IMAGES[(cropName || "").toLowerCase().trim()] || null;

const ORDER_STATUSES = [
  { value: "pending",    label: "Pending",    color: "bg-yellow-100 text-yellow-700", icon: Package },
  { value: "approved",   label: "Approved",   color: "bg-blue-100 text-blue-700",    icon: CheckCircle },
  { value: "in-transit", label: "In Transit", color: "bg-purple-100 text-purple-700", icon: Truck },
  { value: "completed",  label: "Completed",  color: "bg-brand-100 text-brand-700",  icon: CheckCircle },
  { value: "cancelled",  label: "Cancelled",  color: "bg-red-100 text-red-700",      icon: XCircle },
];

const getStatusConfig = (status) =>
  ORDER_STATUSES.find((s) => s.value === status) || ORDER_STATUSES[0];

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toISOString().split("T")[0];
};

function Procurement() {
  const dispatch = useDispatch();
  const { orders, loading } = useSelector((s) => s.procurement);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewOrder, setViewOrder] = useState(null);

  useEffect(() => {
    dispatch(fetchOrders());
  }, [dispatch]);

  const filteredOrders = orders
    .filter((o) => statusFilter === "all" || (o.status || "pending") === statusFilter)
    .filter((o) => {
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

  if (loading) {
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
      <div>
        <h1 className="text-2xl font-semibold">Procurement Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          {filteredOrders.length} orders{statusFilter !== "all" && ` (${statusFilter})`}
        </p>
      </div>

      {/* SEARCH */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search by farmer, crop, or center..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "Total POs",     value: orders.length,                                                    color: "bg-blue-50 text-blue-600",   icon: Package },
          { title: "Pending POs",   value: orders.filter((o) => (o.status || "pending") === "pending").length, color: "bg-yellow-50 text-yellow-600", icon: Package },
          { title: "Completed POs", value: orders.filter((o) => o.status === "completed").length,             color: "bg-brand-50 text-brand-600", icon: CheckCircle },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-white p-5 rounded-xl shadow-sm flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">{card.title}</p>
                <p className="text-3xl font-bold mt-1">{card.value}</p>
              </div>
              <div className={`${card.color} p-3 rounded-xl`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* STATUS FILTERS */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All Orders ({orders.length})
        </button>
        {ORDER_STATUSES.map((s) => {
          const count = orders.filter((o) => (o.status || "pending") === s.value).length;
          const Icon = s.icon;
          return (
            <button
              key={s.value}
              onClick={() => { setStatusFilter(s.value); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                statusFilter === s.value ? s.color : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Icon size={16} />
              {s.label} ({count})
            </button>
          );
        })}
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-xs text-gray-500 font-medium">
              <th className="px-4 py-3 text-left w-8">#</th>
              <th className="px-4 py-3 text-left">Crop Details</th>
              <th className="px-4 py-3 text-left">Farmer Details</th>
              <th className="px-4 py-3 text-left">Quantity & Price</th>
              <th className="px-4 py-3 text-left">Total Value</th>
              <th className="px-4 py-3 text-left">Submitted On</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedOrders.map((order, index) => {
              const statusConfig = getStatusConfig(order.status || "pending");
              const StatusIcon = statusConfig.icon;
              const firstCrop = order.crops?.[0];
              const isPending = (order.status || "pending") === "pending";
              const cropImg = getCropImage(firstCrop?.cropName);

              return (
                <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 text-gray-500 text-sm">{startIndex + index + 1}</td>

                  {/* Crop Details */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0 bg-amber-50 flex items-center justify-center">
                        {cropImg ? (
                          <img
                            src={cropImg}
                            alt={firstCrop?.cropName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.parentNode.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22V12"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><path d="M12 12C12 6 17 2 17 2s-5 4-5 10"/><path d="M12 12C12 6 7 2 7 2s5 4 5 10"/></svg>`;
                            }}
                          />
                        ) : (
                          <Sprout className="w-7 h-7 text-amber-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{firstCrop?.cropName || "—"}</p>
                        {firstCrop?.variety && <p className="text-xs text-gray-400">{firstCrop.variety}</p>}
                        <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${
                          isPending
                            ? "bg-orange-50 text-orange-500 border-orange-200"
                            : "bg-green-50 text-green-600 border-green-200"
                        }`}>
                          <CheckCircle size={10} />
                          {isPending ? "New" : statusConfig.label}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Farmer Details */}
                  <td className="px-4 py-4">
                    <p className="font-semibold text-gray-800 text-sm">
                      {order.farmer?.firstName} {order.farmer?.lastName}
                    </p>
                    {(order.farmer?.phone || order.farmer?.mobile || order.farmer?.phoneNumber) && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {order.farmer?.phone || order.farmer?.mobile || order.farmer?.phoneNumber}
                      </p>
                    )}
                    {(order.procurementCenter || order.farmer?.village || order.farmer?.address) && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} className="text-gray-400" />
                        {order.procurementCenter || order.farmer?.village || order.farmer?.address}
                      </p>
                    )}
                  </td>

                  {/* Quantity & Price */}
                  <td className="px-4 py-4">
                    {order.crops?.map((c, i) => (
                      <div key={i} className="text-sm">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center">
                            <Package size={11} className="text-gray-500" />
                          </div>
                          <span className="font-medium">{c.quantity} {c.unit || "qtl"}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 ml-6">₹{Number(c.rate).toLocaleString()} / {c.unit || "qtl"}</p>
                      </div>
                    ))}
                  </td>

                  {/* Total Value */}
                  <td className="px-4 py-4">
                    <span className="text-base font-bold text-green-600">
                      ₹{Number(order.totalAmount || 0).toLocaleString()}
                    </span>
                  </td>

                  {/* Submitted On */}
                  <td className="px-4 py-4">
                    <p className="text-sm text-gray-700">
                      {order.procurementDate
                        ? new Date(order.procurementDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                        : "—"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {order.procurementDate
                        ? new Date(order.procurementDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                        : ""}
                    </p>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                      isPending                          ? "bg-orange-50 text-orange-600 border-orange-200"
                      : statusConfig.value === "approved"  ? "bg-green-50 text-green-600 border-green-200"
                      : statusConfig.value === "completed" ? "bg-blue-50 text-blue-600 border-blue-200"
                      : statusConfig.value === "cancelled" ? "bg-red-50 text-red-600 border-red-200"
                      : "bg-purple-50 text-purple-600 border-purple-200"
                    }`}>
                      <StatusIcon size={11} />
                      {statusConfig.label}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {isPending ? "Awaiting review" : statusConfig.value === "approved" ? "Listed for sale" : statusConfig.label}
                    </p>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewOrder(order)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-green-500 text-green-600 rounded-lg hover:bg-green-50 transition-colors"
                      >
                        <Eye size={12} /> View
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                        <MoreVertical size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!filteredOrders.length && (
              <tr>
                <td colSpan="8" className="text-center py-10 text-gray-500">
                  {statusFilter === "all" ? "No purchase orders found" : `No ${statusFilter} orders`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages >= 1 && (
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>
            Showing {filteredOrders.length === 0 ? 0 : startIndex + 1} to{" "}
            {Math.min(startIndex + ITEMS_PER_PAGE, filteredOrders.length)} of{" "}
            {filteredOrders.length} listings
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="w-8 h-8 flex items-center justify-center border rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium ${
                  p === currentPage ? "bg-brand-600 text-white" : "border hover:bg-gray-50 text-gray-600"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="w-8 h-8 flex items-center justify-center border rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              ›
            </button>
            <select
              className="ml-2 border rounded-lg px-2 py-1 text-sm text-gray-600"
              defaultValue={ITEMS_PER_PAGE}
              disabled
            >
              <option>{ITEMS_PER_PAGE} per page</option>
            </select>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Purchase Order Details</h2>
              <button onClick={() => setViewOrder(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Farmer",        value: `${viewOrder.farmer?.firstName || ""} ${viewOrder.farmer?.lastName || ""}` },
                { label: "Date",          value: formatDate(viewOrder.procurementDate) },
                { label: "Center",        value: viewOrder.procurementCenter || "—" },
                { label: "Godown",        value: viewOrder.godown || "—" },
                { label: "Vehicle",       value: viewOrder.vehicle || "—" },
                { label: "Previous Dues", value: `₹${viewOrder.previousDues || 0}` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-gray-500 text-xs">{label}</p>
                  <p className="font-medium">{value}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">Crops</p>
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <thead className="bg-gray-50 text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Crop</th>
                    <th className="px-3 py-2 text-left">Variety</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Rate (₹)</th>
                    <th className="px-3 py-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {viewOrder.crops?.map((c, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{c.cropName}</td>
                      <td className="px-3 py-2">{c.variety || "—"}</td>
                      <td className="px-3 py-2 text-right">{c.quantity} {c.unit || "qtl"}</td>
                      <td className="px-3 py-2 text-right">₹{c.rate}</td>
                      <td className="px-3 py-2 text-right font-medium">
                        ₹{(Number(c.quantity) * Number(c.rate)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              {viewOrder.remarks && <p className="text-xs text-gray-500">Remarks: {viewOrder.remarks}</p>}
              <p className="text-base font-bold text-brand-700 ml-auto">Total: ₹{viewOrder.totalAmount}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Procurement;

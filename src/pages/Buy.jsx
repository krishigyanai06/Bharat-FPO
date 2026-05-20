import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { fetchAllOrders, updateOrderStatus } from "../store/thunks/orderThunk";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  ShoppingCart,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Download,
  AlertCircle,
  Tag,
  ImageOff,
} from "lucide-react";
import { usePermissions } from "../hooks/usePermissions";

const ORDER_STATUSES = [
  {
    value: "PENDING",
    label: "Pending",
    color: "bg-yellow-100 text-yellow-700",
    icon: Clock,
  },
  {
    value: "APPROVED",
    label: "Approved",
    color: "bg-blue-100 text-blue-700",
    icon: CheckCircle,
  },
  {
    value: "SOLD",
    label: "Sold",
    color: "bg-brand-100 text-brand-700",
    icon: CheckCircle,
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
];

const getStatusConfig = (status) =>
  ORDER_STATUSES.find((s) => s.value === (status || "").toUpperCase()) ||
  ORDER_STATUSES[0];

const fmt = (date) => {
  if (!date) return "—";
  const d = new Date(date);
  return isNaN(d) ? "—" : d.toLocaleDateString("en-IN");
};

const getDueStatus = (o) => {
  if (
    o.paymentMethod !== "CREDIT" ||
    o.status === "SOLD" ||
    o.status === "CANCELLED"
  )
    return null;
  const due = o.dueDate
    ? new Date(o.dueDate)
    : (() => {
        if (!o.placedAt || !o.creditDays) return null;
        const d = new Date(o.placedAt);
        d.setDate(d.getDate() + o.creditDays);
        return d;
      })();
  if (!due) return null;
  const diff = Math.ceil((due - Date.now()) / 86400000);
  if (diff < 0)
    return {
      label: `Overdue ${Math.abs(diff)}d`,
      cls: "bg-red-100 text-red-700",
    };
  if (diff <= 3)
    return { label: `Due in ${diff}d`, cls: "bg-orange-100 text-orange-700" };
  return null;
};

const getFirstImage = (o) =>
  o.items?.[0]?.item?.sourceRef?.productImages?.[0]?.url ?? null;

const ITEMS_PER_PAGE = 10;

function Buy() {
  const dispatch = useDispatch();
  const { orders, loading } = useSelector((s) => s.orders);
  const location = useLocation();
  const { isReadOnly } = usePermissions();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewOrder, setViewOrder] = useState(null);
  const [imgErrors, setImgErrors] = useState({});
  const [confirmStatus, setConfirmStatus] = useState(null);
  const [highlightId, setHighlightId] = useState(null);

  useEffect(() => {
    dispatch(fetchAllOrders());
  }, [dispatch]);

  // Auto-open order from ledger navigation
  useEffect(() => {
    const orderId = location.state?.orderId;
    if (!orderId || !orders.length) return;
    const match = orders.find(
      (o) => o._id === orderId || o.orderId === orderId,
    );
    if (match) {
      setViewOrder(match);
      setHighlightId(match._id);
      setTimeout(() => setHighlightId(null), 3000);
    }
  }, [location.state, orders]);

  const filtered = orders.filter((o) => {
    const matchStatus =
      statusFilter === "all" || (o.status || "").toUpperCase() === statusFilter;
    const q = search.toLowerCase();
    const farmerName =
      `${o.farmer?.firstName ?? ""} ${o.farmer?.lastName ?? ""}`.toLowerCase();
    const itemNames =
      o.items?.map((i) => i.item?.itemName?.toLowerCase()).join(" ") ?? "";
    return (
      matchStatus && (!q || farmerName.includes(q) || itemNames.includes(q))
    );
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleStatusChange = (id, newStatus, currentStatus) => {
    if (newStatus === currentStatus) return;
    setConfirmStatus({ id, status: newStatus });
  };

  const confirmStatusChange = () => {
    dispatch(
      updateOrderStatus({ id: confirmStatus.id, status: confirmStatus.status }),
    )
      .unwrap()
      .then(() => toast.success("Status updated"))
      .catch(() => toast.error("Failed to update status"))
      .finally(() => setConfirmStatus(null));
  };

  const exportCSV = () => {
    const headers = [
      "Order ID",
      "Farmer",
      "Items",
      "Total (₹)",
      "Payment",
      "Status",
      "Date",
    ];
    const rows = filtered.map((o) => [
      o.orderId,
      `${o.farmer?.firstName ?? ""} ${o.farmer?.lastName ?? ""}`.trim(),
      o.items?.map((i) => `${i.item?.itemName} x${i.quantity}`).join(" | ") ??
        "—",
      o.finalAmount ?? "—",
      o.paymentMethod ?? "—",
      o.status ?? "—",
      fmt(o.placedAt),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${v}"`).join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "orders.csv";
    a.click();
  };

  const handleRowClick = (e, order) => {
    if (e.target.closest("select") || e.target.closest("button")) return;
    setViewOrder(order);
  };

  const stats = [
    {
      title: "Total Orders",
      value: orders.length,
      color: "bg-blue-50 text-blue-600",
      icon: ShoppingCart,
    },
    {
      title: "Pending",
      value: orders.filter((o) => o.status === "PENDING").length,
      color: "bg-yellow-50 text-yellow-600",
      icon: Clock,
    },
    {
      title: "Sold",
      value: orders.filter((o) => o.status === "SOLD").length,
      color: "bg-brand-50 text-brand-600",
      icon: CheckCircle,
    },
    {
      title: "Total Revenue",
      value: `₹${orders
        .filter((o) => o.status === "SOLD")
        .reduce((s, o) => s + (o.finalAmount || 0), 0)
        .toLocaleString("en-IN")}`,
      color: "bg-purple-50 text-purple-600",
      icon: ShoppingCart,
    },
  ];

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-10 w-10 border-b-2 border-brand-600 rounded-full" />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Order Book</h1>
          <p className="text-sm text-gray-500">
            Manage orders from buyers and procurement agencies
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
        >
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={i}
              className="bg-white p-5 rounded-xl shadow-sm flex justify-between items-center"
            >
              <div>
                <p className="text-xs text-gray-500">{s.title}</p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </div>
              <div className={`${s.color} p-3 rounded-xl`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* SEARCH + FILTERS */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search farmer or product..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 pr-3 py-2 border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              setStatusFilter("all");
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${statusFilter === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            All ({orders.length})
          </button>
          {ORDER_STATUSES.map((s) => {
            const Icon = s.icon;
            const count = orders.filter(
              (o) => (o.status || "").toUpperCase() === s.value,
            ).length;
            return (
              <button
                key={s.value}
                onClick={() => {
                  setStatusFilter(s.value);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition ${statusFilter === s.value ? s.color : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
              >
                <Icon size={13} /> {s.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-4 text-left">Order ID</th>
              <th className="px-4 py-4 text-left">Farmer</th>
              <th className="px-4 py-4 text-left">Items</th>
              <th className="px-4 py-4 text-right">Total (₹)</th>
              <th className="px-4 py-4 text-left">Payment</th>
              <th className="px-4 py-4 text-left">Date</th>
              <th className="px-4 py-4 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginated.map((o) => {
              const sc = getStatusConfig(o.status);
              const dueAlert = getDueStatus(o);
              const imgUrl = getFirstImage(o);
              return (
                <tr
                  key={o._id}
                  onClick={(e) => handleRowClick(e, o)}
                  className={`cursor-pointer transition-colors ${
                    highlightId === o._id
                      ? "bg-blue-50 ring-2 ring-inset ring-blue-300"
                      : "hover:bg-brand-50/40"
                  }`}
                >
                  <td className="px-4 py-4 font-medium text-gray-700 whitespace-nowrap">
                    {o.orderId}
                  </td>

                  <td className="px-4 py-4">
                    <div className="font-medium">
                      {o.farmer?.firstName} {o.farmer?.lastName}
                    </div>
                    <div className="text-xs text-gray-400">
                      {o.farmer?.phone}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-start gap-2">
                      {imgUrl && !imgErrors[o._id] ? (
                        <img
                          src={imgUrl}
                          alt=""
                          onError={() =>
                            setImgErrors((p) => ({ ...p, [o._id]: true }))
                          }
                          className="w-9 h-9 rounded-lg object-cover border flex-shrink-0 mt-0.5"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <ImageOff size={14} className="text-gray-300" />
                        </div>
                      )}
                      <div>
                        {o.items?.slice(0, 2).map((it, i) => (
                          <div key={i} className="text-xs text-gray-600">
                            {it.item?.itemName} × {it.quantity}
                            {it.item?.brand && (
                              <span className="text-gray-400">
                                {" "}
                                ({it.item.brand})
                              </span>
                            )}
                          </div>
                        ))}
                        {o.items?.length > 2 && (
                          <div className="text-xs text-brand-600">
                            +{o.items.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-right">
                    <div className="font-semibold text-brand-700">
                      ₹{(o.finalAmount || 0).toLocaleString("en-IN")}
                    </div>
                    {o.coupon?.code && (
                      <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full mt-0.5">
                        <Tag size={9} /> {o.coupon.code}
                      </span>
                    )}
                    {o.discountAmount > 0 && !o.coupon?.code && (
                      <div className="text-xs text-gray-400">
                        -₹{o.discountAmount}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${o.paymentMethod === "CASH" ? "bg-brand-50 text-brand-700" : "bg-blue-50 text-blue-700"}`}
                    >
                      {o.paymentMethod || "—"}
                    </span>
                    {o.paymentMethod === "CREDIT" && o.creditDays > 0 && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {o.creditDays} days credit
                      </div>
                    )}
                    {dueAlert && (
                      <div
                        className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full mt-1 ${dueAlert.cls}`}
                      >
                        <AlertCircle size={9} /> {dueAlert.label}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-4 text-gray-500 text-xs whitespace-nowrap">
                    {fmt(o.placedAt)}
                  </td>

                  <td className="px-4 py-4">
                    <select
                      value={o.status || "PENDING"}
                      onChange={(e) => !isReadOnly && handleStatusChange(o._id, e.target.value, o.status)}
                      disabled={isReadOnly}
                      className={`text-xs font-medium px-2 py-1 rounded-lg border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-400 ${sc.color} ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr>
                <td colSpan="7" className="text-center py-14 text-gray-400">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  {statusFilter === "all"
                    ? "No orders found"
                    : `No ${statusFilter.toLowerCase()} orders`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="px-3 py-1 border rounded disabled:opacity-50 text-sm"
          >
            Prev
          </button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="px-3 py-1 border rounded disabled:opacity-50 text-sm"
          >
            Next
          </button>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Order Details</h2>
              <button
                onClick={() => setViewOrder(null)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            {(() => {
              const sc = getStatusConfig(viewOrder.status);
              const Icon = sc.icon;
              return (
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium ${sc.color}`}
                >
                  <Icon size={12} /> {sc.label}
                </span>
              );
            })()}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Order ID", viewOrder.orderId],
                [
                  "Farmer",
                  `${viewOrder.farmer?.firstName ?? ""} ${viewOrder.farmer?.lastName ?? ""}`.trim(),
                ],
                ["Phone", viewOrder.farmer?.phone ?? "—"],
                ["Payment", viewOrder.paymentMethod ?? "—"],
                [
                  "Credit Days",
                  viewOrder.paymentMethod === "CREDIT"
                    ? `${viewOrder.creditDays || 0} days`
                    : null,
                ],
                ["Due Date", viewOrder.dueDate ? fmt(viewOrder.dueDate) : null],
                [
                  "Final Amount",
                  "₹" + (viewOrder.finalAmount || 0).toLocaleString("en-IN"),
                ],
                [
                  "Discount",
                  viewOrder.discountAmount > 0
                    ? `₹${viewOrder.discountAmount}`
                    : "—",
                ],
                ["Placed At", fmt(viewOrder.placedAt)],
                [
                  "Approved At",
                  viewOrder.approvedAt ? fmt(viewOrder.approvedAt) : null,
                ],
              ]
                .filter(([, val]) => val !== null)
                .map(([label, val]) => (
                  <div key={label}>
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="font-medium">{val || "—"}</p>
                  </div>
                ))}
              {viewOrder.coupon?.code && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400">Coupon Applied</p>
                  <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-full mt-1 font-medium">
                    <Tag size={11} /> {viewOrder.coupon.code} —{" "}
                    {viewOrder.coupon.discountType} ₹
                    {viewOrder.coupon.discountValue}
                  </span>
                </div>
              )}
              {(() => {
                const d = getDueStatus(viewOrder);
                return d ? (
                  <div className="col-span-2">
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${d.cls}`}
                    >
                      <AlertCircle size={11} /> {d.label}
                    </span>
                  </div>
                ) : null;
              })()}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">Items</p>
              <div className="space-y-2">
                {viewOrder.items?.map((it, i) => {
                  const img = it.item?.sourceRef?.productImages?.[0]?.url;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 border rounded-lg p-2"
                    >
                      {img ? (
                        <img
                          src={img}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover border flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <ImageOff size={16} className="text-gray-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {it.item?.itemName ?? "—"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {it.item?.brand ?? ""} · {it.quantity}{" "}
                          {it.item?.unit ?? ""}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-400">MRP</p>
                        <p className="text-sm font-semibold">
                          ₹{it.expectedPrice ?? "—"}
                        </p>
                        {it.finalPrice && (
                          <p className="text-xs text-brand-600">
                            Selling ₹{it.finalPrice}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewOrder(null)}
                className="px-4 py-2 text-sm border rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM STATUS CHANGE */}
      {confirmStatus && (
        <ConfirmDialog
          message={`Change status to "${getStatusConfig(confirmStatus.status).label}"?`}
          subMessage="This will update the order status."
          confirmLabel="Yes, Update"
          confirmClassName={
            confirmStatus.status === "CANCELLED"
              ? "bg-red-600 hover:bg-red-700"
              : "bg-brand-600 hover:bg-brand-700"
          }
          onConfirm={confirmStatusChange}
          onCancel={() => setConfirmStatus(null)}
        />
      )}
    </div>
  );
}

export default Buy;

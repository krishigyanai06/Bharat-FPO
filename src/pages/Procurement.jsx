import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  fetchOrders,
  createOrder,
  deleteOrder,
  updateOrder,
} from "../store/thunks/procurementThunk";
import { fetchMembers } from "../store/thunks/membersThunk";
import ConfirmDialog from "../components/ConfirmDialog";
import { SkeletonHeader, SkeletonStatCards, SkeletonTable } from "../components/Skeleton";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Search,
  Eye,
} from "lucide-react";
import { usePermissions } from "../hooks/usePermissions";

const EMPTY_CROP = {
  cropName: "",
  variety: "",
  rate: "",
  quantity: "",
  unit: "qtl",
};
const UNITS = ["qtl", "kg", "liter"];

const ORDER_STATUSES = [
  {
    value: "pending",
    label: "Pending",
    color: "bg-yellow-100 text-yellow-700",
    icon: Package,
  },
  {
    value: "approved",
    label: "Approved",
    color: "bg-blue-100 text-blue-700",
    icon: CheckCircle,
  },
  {
    value: "in-transit",
    label: "In Transit",
    color: "bg-purple-100 text-purple-700",
    icon: Truck,
  },
  {
    value: "completed",
    label: "Completed",
    color: "bg-brand-100 text-brand-700",
    icon: CheckCircle,
  },
  {
    value: "cancelled",
    label: "Cancelled",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
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
  const { members } = useSelector((s) => s.members);
  const { isReadOnly } = usePermissions();

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  /* CREATE FORM */
  const [showModal, setShowModal] = useState(false);
  const [pickupDate, setPickupDate] = useState(null);
  const [formData, setFormData] = useState({
    farmerId: "",
    crops: [{ ...EMPTY_CROP }],
    pickupLocation: "",
    godown: "",
    vehicle: "",
    notes: "",
    previousDues: "",
  });

  /* EDIT FORM */
  const [editOrder, setEditOrder] = useState(null);
  const [editForm, setEditForm] = useState({
    farmer: "",
    crops: [{ ...EMPTY_CROP }],
    procurementDate: "",
    procurementCenter: "",
    godown: "",
    vehicle: "",
    remarks: "",
    previousDues: "",
  });

  useEffect(() => {
    dispatch(fetchOrders());
    dispatch(fetchMembers());
  }, [dispatch]);

  /* FILTERING & PAGINATION */
  const filteredOrders = orders
    .filter(
      (o) => statusFilter === "all" || (o.status || "pending") === statusFilter,
    )
    .filter((o) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const farmerName =
        `${o.farmer?.firstName ?? ""} ${o.farmer?.lastName ?? ""}`.toLowerCase();
      const crops =
        o.crops?.map((c) => c.cropName?.toLowerCase()).join(" ") ?? "";
      const center = o.procurementCenter?.toLowerCase() ?? "";
      return farmerName.includes(q) || crops.includes(q) || center.includes(q);
    });

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedOrders = filteredOrders.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  /* EDIT HANDLERS */
  const handleEdit = (order) => {
    setEditOrder(order);
    setEditForm({
      farmer: order.farmer?._id ?? "",
      purchaseId: order.purchaseId ?? "",
      crops: order.crops?.map((c) => ({
        cropName: c.cropName ?? "",
        variety: c.variety ?? "",
        rate: c.rate ?? "",
        quantity: c.quantity ?? "",
        unit: c.unit ?? "qtl",
      })) ?? [{ ...EMPTY_CROP }],
      procurementDate: order.procurementDate
        ? new Date(order.procurementDate)
        : null,
      procurementCenter: order.procurementCenter ?? "",
      godown: order.godown ?? "",
      vehicle: order.vehicle ?? "",
      remarks: order.remarks ?? "",
      previousDues: order.previousDues ?? "",
      status: order.status || "pending",
    });
  };

  const handleEditCropChange = (index, field, value) => {
    const updated = editForm.crops.map((c, i) =>
      i === index ? { ...c, [field]: value } : c,
    );
    setEditForm({ ...editForm, crops: updated });
  };

  const handleEditSave = () => {
    dispatch(
      updateOrder({
        id: editOrder._id,
        data: {
          ...editForm,
          purchaseId: editForm.purchaseId || editOrder._id,
          procurementDate: formatDate(editForm.procurementDate),
          status: editForm.status,
        },
      }),
    )
      .unwrap()
      .then(() => {
        toast.success("Order updated successfully");
        dispatch(fetchOrders());
        setEditOrder(null);
      })
      .catch(() => toast.error("Failed to update order"));
  };

  const [confirmId, setConfirmId] = useState(null);
  const [viewOrder, setViewOrder] = useState(null);

  const handleDelete = (id) => setConfirmId(id);

  const confirmDelete = () => {
    dispatch(deleteOrder(confirmId))
      .unwrap()
      .then(() => toast.success("Order deleted"))
      .catch(() => toast.error("Failed to delete order"))
      .finally(() => setConfirmId(null));
  };

  /* CREATE HANDLERS */
  const handleCreateCropChange = (index, field, value) => {
    const updated = formData.crops.map((c, i) =>
      i === index ? { ...c, [field]: value } : c,
    );
    setFormData({ ...formData, crops: updated });
  };

  const addCropRow = () =>
    setFormData({ ...formData, crops: [...formData.crops, { ...EMPTY_CROP }] });

  const removeCropRow = (index) =>
    setFormData({
      ...formData,
      crops: formData.crops.filter((_, i) => i !== index),
    });

  const submitOrder = () => {
    const payload = {
      farmer: formData.farmerId,
      crops: formData.crops.map((c) => ({
        cropName: c.cropName,
        variety: c.variety,
        rate: Number(c.rate),
        quantity: Number(c.quantity),
        unit: c.unit || "qtl",
      })),
      procurementDate: formatDate(pickupDate),
      procurementCenter: formData.pickupLocation,
      godown: formData.godown,
      vehicle: formData.vehicle,
      remarks: formData.notes,
      previousDues: Number(formData.previousDues) || 0,
      status: "pending",
    };

    dispatch(createOrder(payload))
      .unwrap()
      .then(() => {
        dispatch(fetchOrders());
        toast.success("Purchase order created successfully");
        setShowModal(false);
        setFormData({
          farmerId: "",
          crops: [{ ...EMPTY_CROP }],
          pickupLocation: "",
          godown: "",
          vehicle: "",
          notes: "",
          previousDues: "",
        });
        setPickupDate(null);
      })
      .catch(() => toast.error("Failed to create order"));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonHeader />
        <SkeletonStatCards count={3} />
        <SkeletonTable rows={9} cols={10} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Procurement Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filteredOrders.length} orders{" "}
            {statusFilter !== "all" && `(${statusFilter})`}
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
          >
            + Create Purchase Order
          </button>
        )}
      </div>

      {/* SEARCH */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search by farmer, crop, or center..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* PO SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            title: "Total POs",
            value: orders.length,
            color: "bg-blue-50 text-blue-600",
            icon: Package,
          },
          {
            title: "Pending POs",
            value: orders.filter((o) => (o.status || "pending") === "pending")
              .length,
            color: "bg-yellow-50 text-yellow-600",
            icon: Package,
          },
          {
            title: "Completed POs",
            value: orders.filter((o) => o.status === "completed").length,
            color: "bg-brand-50 text-brand-600",
            icon: CheckCircle,
          },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="bg-white p-5 rounded-xl shadow-sm flex justify-between items-center"
            >
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
          onClick={() => {
            setStatusFilter("all");
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === "all"
              ? "bg-gray-800 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All Orders ({orders.length})
        </button>
        {ORDER_STATUSES.map((s) => {
          const count = orders.filter(
            (o) => (o.status || "pending") === s.value,
          ).length;
          const Icon = s.icon;
          return (
            <button
              key={s.value}
              onClick={() => {
                setStatusFilter(s.value);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                statusFilter === s.value
                  ? s.color
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
          <thead className="bg-gray-50 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">PO ID</th>
              <th className="px-4 py-3 text-left">Farmer</th>
              <th className="px-4 py-3 text-left">Crops</th>
              <th className="px-4 py-3 text-left">Center</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-right">Quantity</th>
              <th className="px-4 py-3 text-right">Price (₹)</th>
              <th className="px-4 py-3 text-right">Total Amount</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedOrders.map((order, index) => {
              const statusConfig = getStatusConfig(order.status || "pending");
              const StatusIcon = statusConfig.icon;

              return (
                <tr key={order._id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 font-medium">
                    PO-{String(startIndex + index + 1).padStart(3, "0")}
                  </td>
                  <td className="px-4 py-4">
                    {order.farmer?.firstName} {order.farmer?.lastName}
                  </td>
                  <td className="px-4 py-4">
                    {order.crops?.map((c, i) => (
                      <div key={i} className="text-xs text-gray-600">
                        {c.cropName}
                        {c.variety ? ` (${c.variety})` : ""}
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-4">{order.procurementCenter}</td>
                  <td className="px-4 py-4">
                    {formatDate(order.procurementDate)}
                  </td>
                  <td className="px-4 py-4 text-right font-medium">
                    {order.crops?.map((c, i) => (
                      <div key={i} className="text-xs">
                        {c.quantity} {c.unit || "qtl"}
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {order.crops?.map((c, i) => (
                      <div key={i} className="text-xs">
                        ₹{c.rate}/{c.unit || "qtl"}
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-4 text-right font-semibold text-brand-700">
                    ₹{order.totalAmount}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium ${statusConfig.color}`}
                    >
                      <StatusIcon size={12} />
                      {statusConfig.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => setViewOrder(order)}
                        className="px-3 py-1 text-xs border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center gap-1"
                      >
                        <Eye size={12} /> View
                      </button>
                      {!isReadOnly && (
                        <>
                          <button
                            onClick={() => handleEdit(order)}
                            className="px-3 py-1 text-xs border border-yellow-500 text-yellow-600 rounded-lg hover:bg-yellow-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(order._id)}
                            className="px-3 py-1 text-xs border border-red-600 text-red-600 rounded-lg hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!filteredOrders.length && (
              <tr>
                <td colSpan="10" className="text-center py-10 text-gray-500">
                  {statusFilter === "all"
                    ? "No purchase orders found"
                    : `No ${statusFilter} orders`}
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
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Purchase Order Details</h2>
              <button
                onClick={() => setViewOrder(null)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Farmer</p>
                <p className="font-medium">
                  {viewOrder.farmer?.firstName} {viewOrder.farmer?.lastName}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Date</p>
                <p className="font-medium">
                  {formatDate(viewOrder.procurementDate)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Center</p>
                <p className="font-medium">
                  {viewOrder.procurementCenter || "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Godown</p>
                <p className="font-medium">{viewOrder.godown || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Vehicle</p>
                <p className="font-medium">{viewOrder.vehicle || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Previous Dues</p>
                <p className="font-medium">₹{viewOrder.previousDues || 0}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">Crops</p>
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <thead className="bg-gray-50 text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Crop</th>
                    <th className="px-3 py-2 text-left">Variety</th>
                    <th className="px-3 py-2 text-right">Quantity</th>
                    <th className="px-3 py-2 text-right">Rate (₹)</th>
                    <th className="px-3 py-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {viewOrder.crops?.map((c, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{c.cropName}</td>
                      <td className="px-3 py-2">{c.variety || "—"}</td>
                      <td className="px-3 py-2 text-right">
                        {c.quantity} {c.unit || "qtl"}
                      </td>
                      <td className="px-3 py-2 text-right">₹{c.rate}</td>
                      <td className="px-3 py-2 text-right font-medium">
                        ₹
                        {(Number(c.quantity) * Number(c.rate)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <div>
                {viewOrder.remarks && (
                  <p className="text-xs text-gray-500">
                    Remarks: {viewOrder.remarks}
                  </p>
                )}
              </div>
              <p className="text-base font-bold text-brand-700">
                Total: ₹{viewOrder.totalAmount}
              </p>
            </div>
          </div>
        </div>
      )}

      {confirmId && (
        <ConfirmDialog
          message="Delete this order?"
          subMessage="This action cannot be undone."
          onConfirm={confirmDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {/* EDIT MODAL */}
      {editOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold">Edit Purchase Order</h2>

            <select
              className="w-full border px-3 py-2 rounded-lg text-sm"
              value={editForm.farmer}
              onChange={(e) =>
                setEditForm({ ...editForm, farmer: e.target.value })
              }
            >
              <option value="">Select Farmer</option>
              {members.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.firstName} {f.lastName}
                </option>
              ))}
            </select>

            {/* CROPS */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Crops</p>
              {editForm.crops.map((crop, i) => (
                <div key={i} className="grid grid-cols-5 gap-2">
                  <input
                    className="border px-2 py-1 rounded text-sm"
                    placeholder="Crop Name"
                    value={crop.cropName}
                    onChange={(e) =>
                      handleEditCropChange(i, "cropName", e.target.value)
                    }
                  />
                  <input
                    className="border px-2 py-1 rounded text-sm"
                    placeholder="Variety"
                    value={crop.variety}
                    onChange={(e) =>
                      handleEditCropChange(i, "variety", e.target.value)
                    }
                  />
                  <input
                    type="number"
                    className="border px-2 py-1 rounded text-sm"
                    placeholder="Rate ₹"
                    value={crop.rate}
                    onChange={(e) =>
                      handleEditCropChange(i, "rate", e.target.value)
                    }
                  />
                  <input
                    type="number"
                    className="border px-2 py-1 rounded text-sm"
                    placeholder="Quantity"
                    value={crop.quantity}
                    onChange={(e) =>
                      handleEditCropChange(i, "quantity", e.target.value)
                    }
                  />
                  <select
                    className="border px-2 py-1 rounded text-sm"
                    value={crop.unit || "qtl"}
                    onChange={(e) =>
                      handleEditCropChange(i, "unit", e.target.value)
                    }
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                className="border px-3 py-2 rounded-lg text-sm"
                placeholder="Procurement Center"
                value={editForm.procurementCenter}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    procurementCenter: e.target.value,
                  })
                }
              />
              <input
                className="border px-3 py-2 rounded-lg text-sm"
                placeholder="Godown"
                value={editForm.godown}
                onChange={(e) =>
                  setEditForm({ ...editForm, godown: e.target.value })
                }
              />
              <input
                className="border px-3 py-2 rounded-lg text-sm"
                placeholder="Vehicle No."
                value={editForm.vehicle}
                onChange={(e) =>
                  setEditForm({ ...editForm, vehicle: e.target.value })
                }
              />
              <input
                type="number"
                className="border px-3 py-2 rounded-lg text-sm"
                placeholder="Previous Dues ₹"
                value={editForm.previousDues}
                onChange={(e) =>
                  setEditForm({ ...editForm, previousDues: e.target.value })
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">
                Order Status
              </label>
              <select
                value={editForm.status}
                onChange={(e) =>
                  setEditForm({ ...editForm, status: e.target.value })
                }
                className="w-full border px-3 py-2 rounded-lg text-sm"
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              className="w-full border px-3 py-2 rounded-lg text-sm h-16"
              placeholder="Remarks"
              value={editForm.remarks}
              onChange={(e) =>
                setEditForm({ ...editForm, remarks: e.target.value })
              }
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditOrder(null)}
                className="px-4 py-2 text-sm border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold">Create Purchase Order</h2>

            <select
              value={formData.farmerId}
              onChange={(e) =>
                setFormData({ ...formData, farmerId: e.target.value })
              }
              className="w-full border px-3 py-2 rounded-lg text-sm"
            >
              <option value="">Select Farmer</option>
              {members.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.firstName} {f.lastName}
                </option>
              ))}
            </select>

            {/* CROPS */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium">Crops</p>
                <button
                  onClick={addCropRow}
                  className="text-xs text-brand-600 border border-brand-600 px-2 py-1 rounded"
                >
                  + Add Crop
                </button>
              </div>
              {formData.crops.map((crop, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 items-center">
                  <input
                    className="border px-2 py-1 rounded text-sm"
                    placeholder="Crop Name"
                    value={crop.cropName}
                    onChange={(e) =>
                      handleCreateCropChange(i, "cropName", e.target.value)
                    }
                  />
                  <input
                    className="border px-2 py-1 rounded text-sm"
                    placeholder="Variety"
                    value={crop.variety}
                    onChange={(e) =>
                      handleCreateCropChange(i, "variety", e.target.value)
                    }
                  />
                  <input
                    type="number"
                    className="border px-2 py-1 rounded text-sm"
                    placeholder="Rate ₹"
                    value={crop.rate}
                    onChange={(e) =>
                      handleCreateCropChange(i, "rate", e.target.value)
                    }
                  />
                  <input
                    type="number"
                    className="border px-2 py-1 rounded text-sm"
                    placeholder="Quantity"
                    value={crop.quantity}
                    onChange={(e) =>
                      handleCreateCropChange(i, "quantity", e.target.value)
                    }
                  />
                  <div className="flex gap-1">
                    <select
                      className="border px-2 py-1 rounded text-sm w-full"
                      value={crop.unit || "qtl"}
                      onChange={(e) =>
                        handleCreateCropChange(i, "unit", e.target.value)
                      }
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                    {formData.crops.length > 1 && (
                      <button
                        onClick={() => removeCropRow(i)}
                        className="text-red-500 text-xs px-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Procurement Center"
                className="border px-3 py-2 rounded-lg text-sm"
                value={formData.pickupLocation}
                onChange={(e) =>
                  setFormData({ ...formData, pickupLocation: e.target.value })
                }
              />
              <input
                placeholder="Godown"
                className="border px-3 py-2 rounded-lg text-sm"
                value={formData.godown}
                onChange={(e) =>
                  setFormData({ ...formData, godown: e.target.value })
                }
              />
              <input
                placeholder="Vehicle No."
                className="border px-3 py-2 rounded-lg text-sm"
                value={formData.vehicle}
                onChange={(e) =>
                  setFormData({ ...formData, vehicle: e.target.value })
                }
              />
              <input
                type="number"
                placeholder="Previous Dues ₹"
                className="border px-3 py-2 rounded-lg text-sm"
                value={formData.previousDues}
                onChange={(e) =>
                  setFormData({ ...formData, previousDues: e.target.value })
                }
              />
              <DatePicker
                selected={pickupDate}
                onChange={(date) => setPickupDate(date)}
                placeholderText="Procurement Date"
                dateFormat="yyyy-MM-dd"
                className="border px-3 py-2 rounded-lg w-full text-sm"
              />
            </div>

            <textarea
              placeholder="Remarks"
              className="w-full border px-3 py-2 rounded-lg text-sm h-16"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={submitOrder}
                className="px-5 py-2 bg-brand-600 text-white rounded-lg text-sm"
              >
                Generate PO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Procurement;

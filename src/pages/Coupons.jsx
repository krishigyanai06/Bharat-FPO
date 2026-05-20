import { useEffect, useState } from "react";
import { SkeletonHeader, SkeletonTable } from "../components/Skeleton";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  fetchCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from "../store/thunks/couponsThunk";
import {
  Ticket,
  Plus,
  Pencil,
  Trash2,
  X,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { usePermissions } from "../hooks/usePermissions";

function Coupons() {
  const dispatch = useDispatch();
  const { coupons, loading } = useSelector((state) => state.coupons);
  const { isReadOnly } = usePermissions();

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showStats, setShowStats] = useState(false);
  const ITEMS_PER_PAGE = 9;

  const [formData, setFormData] = useState({
    code: "",
    discountType: "PERCENTAGE",
    discountValue: "",
    maxDiscount: "",
    minOrderAmount: "",
    validFrom: null,
    validUntil: null,
  });

  useEffect(() => {
    dispatch(fetchCoupons());
  }, [dispatch]);

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toISOString().split("T")[0];
  };

  const isExpired = (validUntil) => {
    return new Date(validUntil) < new Date();
  };

  const isActive = (validFrom, validUntil) => {
    const now = new Date();
    return new Date(validFrom) <= now && new Date(validUntil) >= now;
  };

  const getCouponStats = () => {
    const total = coupons.length;
    const active = coupons.filter((c) =>
      isActive(c.validFrom, c.validUntil),
    ).length;
    const expired = coupons.filter((c) => isExpired(c.validUntil)).length;
    const scheduled = coupons.filter(
      (c) => new Date(c.validFrom) > new Date(),
    ).length;

    return { total, active, expired, scheduled };
  };

  const stats = getCouponStats();

  const getStatusBadge = (coupon) => {
    if (isExpired(coupon.validUntil)) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
          Expired
        </span>
      );
    }
    if (isActive(coupon.validFrom, coupon.validUntil)) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-100 text-brand-700">
          Active
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
        Scheduled
      </span>
    );
  };

  const filteredCoupons = coupons.filter((c) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "active") return isActive(c.validFrom, c.validUntil);
    if (filterStatus === "expired") return isExpired(c.validUntil);
    if (filterStatus === "scheduled") return new Date(c.validFrom) > new Date();
    return true;
  });

  const totalPages = Math.ceil(filteredCoupons.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCoupons = filteredCoupons.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  const handleOpenModal = (coupon = null) => {
    if (coupon) {
      setEditMode(true);
      setSelectedCoupon(coupon);
      setFormData({
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscount: coupon.maxDiscount || "",
        minOrderAmount: coupon.minOrderAmount || "",
        validFrom: new Date(coupon.validFrom),
        validUntil: new Date(coupon.validUntil),
      });
    } else {
      setEditMode(false);
      setSelectedCoupon(null);
      setFormData({
        code: "",
        discountType: "PERCENTAGE",
        discountValue: "",
        maxDiscount: "",
        minOrderAmount: "",
        validFrom: null,
        validUntil: null,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditMode(false);
    setSelectedCoupon(null);
  };

  const handleSubmit = () => {
    // Validation
    if (!formData.code) {
      toast.error("Please enter a coupon code");
      return;
    }
    if (!formData.discountValue) {
      toast.error("Please enter a discount value");
      return;
    }
    if (!formData.validFrom || !formData.validUntil) {
      toast.error("Please select valid from and valid until dates");
      return;
    }

    const payload = {
      code: formData.code.trim(),
      discountType: formData.discountType,
      discountValue: Number(formData.discountValue),
      validFrom: formatDate(formData.validFrom),
      validUntil: formatDate(formData.validUntil),
    };

    // Only add optional fields if they have values
    if (formData.maxDiscount && Number(formData.maxDiscount) > 0) {
      payload.maxDiscount = Number(formData.maxDiscount);
    }
    if (formData.minOrderAmount && Number(formData.minOrderAmount) > 0) {
      payload.minOrderAmount = Number(formData.minOrderAmount);
    }

    if (editMode && selectedCoupon) {
      dispatch(updateCoupon({ id: selectedCoupon._id, couponData: payload }))
        .unwrap()
        .then(() => {
          toast.success("Coupon updated successfully!");
          dispatch(fetchCoupons());
          handleCloseModal();
        })
        .catch((err) => toast.error(`Failed to update coupon: ${err}`));
    } else {
      dispatch(createCoupon(payload))
        .unwrap()
        .then(() => {
          toast.success("Coupon created successfully!");
          dispatch(fetchCoupons());
          handleCloseModal();
        })
        .catch((err) => toast.error(`Failed to create coupon: ${err}`));
    }
  };

  const [confirmId, setConfirmId] = useState(null);

  const handleDelete = (id) => setConfirmId(id);

  const confirmDelete = () => {
    dispatch(deleteCoupon(confirmId))
      .unwrap()
      .then(() => {
        toast.success("Coupon deleted");
        dispatch(fetchCoupons());
      })
      .catch(() => toast.error("Failed to delete coupon"))
      .finally(() => setConfirmId(null));
  };

  if (loading && !coupons.length) {
    return (
      <div className="space-y-6">
        <SkeletonHeader />
        <SkeletonTable rows={6} cols={7} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Coupon Management</h1>
          <p className="text-sm text-gray-500">
            Create and manage discount coupons
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowStats(!showStats)}
            className="flex items-center gap-2 px-4 py-2 border border-brand-600 text-brand-600 rounded-lg hover:bg-brand-50"
          >
            <BarChart3 className="w-4 h-4" />
            {showStats ? "Hide Stats" : "Show Stats"}
          </button>
          {!isReadOnly && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
            >
              <Plus className="w-4 h-4" />
              Create Coupon
            </button>
          )}
        </div>
      </div>

      {/* STATS CARDS */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">Total Coupons</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-brand-500">
            <p className="text-sm text-gray-600">Active</p>
            <p className="text-2xl font-bold text-brand-600">{stats.active}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600">Scheduled</p>
            <p className="text-2xl font-bold text-yellow-600">
              {stats.scheduled}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500">
            <p className="text-sm text-gray-600">Expired</p>
            <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
          </div>
        </div>
      )}

      {/* FILTER */}
      <div className="flex gap-3">
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2 border rounded-lg text-sm"
        >
          <option value="all">All Coupons</option>
          <option value="active">Active</option>
          <option value="scheduled">Scheduled</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase">
            <tr>
              <th className="px-6 py-3 text-left">Code</th>
              <th className="px-6 py-3 text-left">Type</th>
              <th className="px-6 py-3 text-left">Discount</th>
              <th className="px-6 py-3 text-left">Min Order</th>
              <th className="px-6 py-3 text-left">Valid From</th>
              <th className="px-6 py-3 text-left">Valid Until</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {paginatedCoupons.map((coupon) => (
              <tr key={coupon._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{coupon.code}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    {coupon.discountType}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {coupon.discountType === "PERCENTAGE"
                    ? `${coupon.discountValue}%`
                    : `₹${coupon.discountValue}`}
                  {coupon.maxDiscount && (
                    <span className="text-xs text-gray-500 ml-1">
                      (Max: ₹{coupon.maxDiscount})
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {coupon.minOrderAmount ? `₹${coupon.minOrderAmount}` : "—"}
                </td>
                <td className="px-6 py-4">{formatDate(coupon.validFrom)}</td>
                <td className="px-6 py-4">{formatDate(coupon.validUntil)}</td>
                <td className="px-6 py-4">{getStatusBadge(coupon)}</td>
                <td className="px-6 py-4 text-center">
                  {!isReadOnly ? (
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleOpenModal(coupon)}
                        className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(coupon._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">View only</span>
                  )}
                </td>
              </tr>
            ))}

            {!paginatedCoupons.length && (
              <tr>
                <td colSpan="8" className="text-center py-10 text-gray-500">
                  No coupons found
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

      {confirmId && (
        <ConfirmDialog
          message="Delete this coupon?"
          subMessage="This action cannot be undone."
          onConfirm={confirmDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">
                {editMode ? "Edit Coupon" : "Create Coupon"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input
                placeholder="Coupon Code (e.g., SAVE20)"
                className="border px-3 py-2 rounded-lg uppercase"
                value={formData.code}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    code: e.target.value.toUpperCase(),
                  })
                }
              />

              <select
                value={formData.discountType}
                onChange={(e) =>
                  setFormData({ ...formData, discountType: e.target.value })
                }
                className="border px-3 py-2 rounded-lg"
              >
                <option value="PERCENTAGE">Percentage</option>
                <option value="FLAT">Flat Amount</option>
              </select>

              <input
                type="number"
                placeholder={
                  formData.discountType === "PERCENTAGE"
                    ? "Discount % (e.g., 20)"
                    : "Discount Amount (₹)"
                }
                className="border px-3 py-2 rounded-lg"
                value={formData.discountValue}
                onChange={(e) =>
                  setFormData({ ...formData, discountValue: e.target.value })
                }
              />

              <input
                type="number"
                placeholder="Max Discount (₹) - Optional"
                className="border px-3 py-2 rounded-lg"
                value={formData.maxDiscount}
                onChange={(e) =>
                  setFormData({ ...formData, maxDiscount: e.target.value })
                }
              />

              <input
                type="number"
                placeholder="Min Order Amount (₹) - Optional"
                className="border px-3 py-2 rounded-lg"
                value={formData.minOrderAmount}
                onChange={(e) =>
                  setFormData({ ...formData, minOrderAmount: e.target.value })
                }
              />

              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Valid From
                  </label>
                  <DatePicker
                    selected={formData.validFrom}
                    onChange={(date) =>
                      setFormData({ ...formData, validFrom: date })
                    }
                    dateFormat="yyyy-MM-dd"
                    className="border px-3 py-2 rounded-lg w-full"
                    placeholderText="Select start date"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Valid Until
                  </label>
                  <DatePicker
                    selected={formData.validUntil}
                    onChange={(date) =>
                      setFormData({ ...formData, validUntil: date })
                    }
                    dateFormat="yyyy-MM-dd"
                    className="border px-3 py-2 rounded-lg w-full"
                    placeholderText="Select end date"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
              >
                {editMode ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Coupons;

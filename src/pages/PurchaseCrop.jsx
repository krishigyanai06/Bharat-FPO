import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { fetchOrders, createOrder, updateOrder } from "../store/thunks/procurementThunk";
import { fetchMembers } from "../store/thunks/membersThunk";
import SearchableSelect from "../components/common/SearchableSelect";
import {
  User,
  Sprout,
  Warehouse,
  PlusCircle,
  Trash2,
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle2,
  FileText,
  Truck,
  IndianRupee,
  Scale,
  Building2,
} from "lucide-react";
import toast from "react-hot-toast";

const formatCurrency = (value) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
};

export default function PurchaseCrop() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();

  const { orders = [], loading: loadingOrders } = useSelector((s) => s.procurement || {});
  const { members = [], loading: loadingMembers } = useSelector((s) => s.members || {});

  const [saving, setSaving] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({
    farmer: "",
    crops: [{ cropName: "", variety: "", unit: "qtl", rate: "", quantity: "" }],
    procurementDate: new Date().toISOString().split("T")[0],
    procurementCenter: "",
    previousDues: "",
    godown: "",
    vehicle: "",
    remarks: "",
    purchaseId: "",
  });

  const VEHICLE_REGEX = /^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{1,4}$/i;

  const [errors, setErrors] = useState({
    farmer: "",
    procurementDate: "",
    previousDues: "",
    vehicle: "",
    crops: [],
  });

  // Load initial resources
  useEffect(() => {
    dispatch(fetchMembers());
    dispatch(fetchOrders());
  }, [dispatch]);

  // Set form values if editing
  useEffect(() => {
    if (id && orders.length > 0) {
      const order = orders.find((o) => String(o._id || o.id) === String(id));
      if (order) {
        setPurchaseForm({
          farmer: String(order.farmer?._id || order.farmer?.id || order.farmer || ""),
          crops: order.crops?.map((c) => ({
            cropName: c.cropName || c.crop || "Wheat",
            variety: c.variety || "",
            unit: c.unit || "qtl",
            rate: c.rate !== undefined && c.rate !== null ? String(c.rate) : "",
            quantity: c.quantity !== undefined && c.quantity !== null ? String(c.quantity) : "",
            ...(c._id && { _id: c._id }),
            ...(c.id && { id: c.id }),
          })) || [{ cropName: "Wheat", variety: "", unit: "qtl", rate: "", quantity: "" }],
          procurementDate: order.procurementDate
            ? new Date(order.procurementDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          procurementCenter: order.procurementCenter || "",
          previousDues: order.previousDues ? String(order.previousDues) : "",
          godown: order.godown || "Main Godown",
          vehicle: order.vehicle || "",
          remarks: order.remarks || "",
          purchaseId: order.purchaseId || "",
          status: order.status || "pending",
        });
      } else if (!loadingOrders) {
        toast.error("Procurement record not found");
        navigate("/procurement");
      }
    }
  }, [id, orders, loadingOrders, navigate]);

  const farmerList = useMemo(() => {
    if (!members || members.length === 0) return [];
    const filtered = members.filter((m) => String(m.role || m.partyType).toLowerCase() === "farmer");
    return filtered.length > 0 ? filtered : members;
  }, [members]);

  const farmerOptions = useMemo(() => {
    return farmerList.map((f) => {
      const rawName = (f.name || `${f.firstName || ""} ${f.lastName || ""}`).trim();
      const phone = f.phone || f.mobile || "";
      const name = rawName || (phone ? `Farmer (${phone})` : `Farmer #${String(f._id || f.id).slice(-6)}`);
      const village = f.village || f.district || "";
      const memberId = f.memberId ? `ID: ${f.memberId}` : "";
      const subtext = [memberId, village].filter(Boolean).join(" · ");

      return {
        id: String(f._id || f.id),
        name,
        phone: phone || "—",
        subtext,
        badge: String(f.role || "Farmer").toUpperCase(),
        initials: (rawName.charAt(0) || "F").toUpperCase(),
      };
    });
  }, [farmerList]);

  const selectedFarmer = farmerList.find((f) => String(f._id || f.id) === String(purchaseForm.farmer));
  const selectedFarmerRole = selectedFarmer
    ? String(selectedFarmer.role || "FARMER").toUpperCase()
    : "";

  const handleCropRowChange = (index, field, value) => {
    let fieldErr = "";
    if (field === "quantity") {
      if (value !== "" && Number(value) < 0) {
        fieldErr = "Quantity cannot be negative.";
      } else if (value !== "" && Number(value) === 0) {
        fieldErr = "Quantity must be > 0.";
      }
    } else if (field === "rate") {
      if (value !== "" && Number(value) < 0) {
        fieldErr = "Rate cannot be negative.";
      } else if (value !== "" && Number(value) === 0) {
        fieldErr = "Rate must be > 0.";
      }
    } else if (field === "cropName") {
      if (!value.trim()) {
        fieldErr = "Crop name is required.";
      }
    }

    const updated = purchaseForm.crops.map((c, i) => {
      if (i !== index) return c;
      return { ...c, [field]: value };
    });
    setPurchaseForm({ ...purchaseForm, crops: updated });

    setErrors((prev) => {
      const nextCrops = [...(prev.crops || [])];
      nextCrops[index] = { ...(nextCrops[index] || {}), [field]: fieldErr };
      return { ...prev, crops: nextCrops };
    });
  };

  const addCropRow = () => {
    setPurchaseForm({
      ...purchaseForm,
      crops: [...purchaseForm.crops, { cropName: "Wheat", variety: "", unit: "qtl", rate: "", quantity: "" }],
    });
    setErrors((prev) => ({
      ...prev,
      crops: [...(prev.crops || []), {}],
    }));
  };

  const removeCropRow = (index) => {
    const updated = purchaseForm.crops.filter((_, i) => i !== index);
    setPurchaseForm({ ...purchaseForm, crops: updated });
    setErrors((prev) => ({
      ...prev,
      crops: (prev.crops || []).filter((_, i) => i !== index),
    }));
  };

  const calculateCropAmount = (quantity, rate, unit = "qtl", rateUnit = "qtl") => {
    const q = Number(quantity) || 0;
    const r = Number(rate) || 0;
    const u = String(unit || "qtl").toLowerCase();
    const ru = String(rateUnit || "qtl").toLowerCase();

    if (u === "qtl" && ru === "qtl") return q * r;
    if (u === "kg" && ru === "qtl") return (q / 100) * r;
    if (u === "qtl" && ru === "kg") return q * 100 * r;
    if (u === "kg" && ru === "kg") return q * r;

    return q * r;
  };

  const getEditCropsTotal = () => {
    return purchaseForm.crops.reduce(
      (sum, c) => sum + calculateCropAmount(c.quantity, c.rate, c.unit, c.rateUnit || "qtl"),
      0
    );
  };

  const totalQuantitySum = useMemo(() => {
    return purchaseForm.crops.reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
  }, [purchaseForm.crops]);

  const getEditGrandTotal = () => {
    const cropsTotal = getEditCropsTotal();
    const dues = Number(purchaseForm.previousDues) || 0;
    return cropsTotal - dues;
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      farmer: "",
      procurementDate: "",
      previousDues: "",
      vehicle: "",
      crops: [],
    };

    if (!purchaseForm.farmer) {
      newErrors.farmer = "Please select a farmer.";
      isValid = false;
    }

    if (!purchaseForm.procurementDate) {
      newErrors.procurementDate = "Procurement date is required.";
      isValid = false;
    }

    if (purchaseForm.previousDues !== "" && Number(purchaseForm.previousDues) < 0) {
      newErrors.previousDues = "Previous dues cannot be negative.";
      isValid = false;
    }

    const cleanVehicle = (purchaseForm.vehicle || "").trim();
    if (cleanVehicle && !VEHICLE_REGEX.test(cleanVehicle)) {
      const vehError = "Please enter a valid vehicle number. Example: MH12AB1234";
      newErrors.vehicle = vehError;
      toast.error(vehError);
      isValid = false;
    }

    const cropErrors = purchaseForm.crops.map((c) => {
      const rowErr = {};
      if (!c.cropName || !c.cropName.trim()) {
        rowErr.cropName = "Crop name is required.";
        isValid = false;
      }
      if (c.quantity === "" || c.quantity === null || c.quantity === undefined) {
        rowErr.quantity = "Quantity is required.";
        isValid = false;
      } else if (Number(c.quantity) < 0) {
        rowErr.quantity = "Quantity cannot be negative.";
        isValid = false;
      } else if (Number(c.quantity) === 0) {
        rowErr.quantity = "Quantity must be > 0.";
        isValid = false;
      }

      if (c.rate === "" || c.rate === null || c.rate === undefined) {
        rowErr.rate = "Rate is required.";
        isValid = false;
      } else if (Number(c.rate) < 0) {
        rowErr.rate = "Rate cannot be negative.";
        isValid = false;
      } else if (Number(c.rate) === 0) {
        rowErr.rate = "Rate must be > 0.";
        isValid = false;
      }

      return rowErr;
    });

    newErrors.crops = cropErrors;
    setErrors(newErrors);
    return isValid;
  };

  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload = {
      ...(purchaseForm.purchaseId && { purchaseId: purchaseForm.purchaseId }),
      farmer: purchaseForm.farmer,
      crops: purchaseForm.crops.map((c) => ({
        crop: c.cropName || c.crop || "",
        cropName: c.cropName || c.crop || "",
        variety: c.variety || "",
        unit: c.unit || "qtl",
        rate: Number(c.rate),
        quantity: Number(c.quantity),
        ...(c._id && { _id: c._id }),
        ...(c.id && { id: c.id }),
      })),
      procurementDate: purchaseForm.procurementDate,
      procurementCenter: purchaseForm.procurementCenter || "Main Yard",
      previousDues: Number(purchaseForm.previousDues) || 0,
      godown: purchaseForm.godown || "Main Godown",
      vehicle: purchaseForm.vehicle || "",
      remarks: purchaseForm.remarks || "",
      status: purchaseForm.status || "pending",
    };

    setSaving(true);
    try {
      if (id) {
        await dispatch(updateOrder({ id, data: payload })).unwrap();
        dispatch(fetchOrders({ force: true }));
        toast.success("Procurement entry updated successfully!");
      } else {
        await dispatch(createOrder(payload)).unwrap();
        dispatch(fetchOrders({ force: true }));
        toast.success("Procurement entry recorded successfully!");
      }
      navigate("/procurement");
    } catch (err) {
      toast.error(err || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (id && loadingOrders && orders.length === 0) {
    return (
      <div className="w-full h-full min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
        <p className="text-sm text-slate-500 font-bold">Loading procurement details...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[calc(100vh-4rem)] flex flex-col bg-[#F8FAFC] select-none p-4 md:p-6 space-y-5">
      {/* 1. Top Header Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 md:px-6 md:py-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/procurement")}
            className="p-2.5 hover:bg-slate-100 rounded-xl transition-all text-slate-500 hover:text-slate-900 border border-slate-200 bg-white cursor-pointer active:scale-95 shadow-3xs"
            title="Back to Procurement"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                {id ? "Edit Procurement Record" : "Record Crop Procurement"}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                Procurement
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              {id ? `Purchase ID: ${purchaseForm.purchaseId || id}` : "Record new crop purchase transaction from members"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => navigate("/procurement")}
            className="px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl transition font-bold text-slate-700 text-xs cursor-pointer active:scale-95 shadow-3xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePurchaseSubmit}
            disabled={saving}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition flex items-center justify-center gap-2 font-bold text-xs cursor-pointer shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving Record...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{id ? "Update Entry" : "Save Procurement"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Main Workspace Layout */}
      <form onSubmit={handlePurchaseSubmit} noValidate className="w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Main Form Inputs (8 Columns on desktop) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section A: Farmer Registration */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <User size={15} />
                </div>
                <span>Farmer Member Information</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-bold">Step 1 of 3</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <SearchableSelect
                  options={farmerOptions}
                  value={purchaseForm.farmer}
                  onChange={(val) => {
                    setPurchaseForm({ ...purchaseForm, farmer: val });
                    if (errors.farmer) setErrors((prev) => ({ ...prev, farmer: "" }));
                  }}
                  placeholder="Type farmer name, phone, or village..."
                  label="Choose Farmer Member *"
                  required
                  icon={User}
                  hasError={!!errors.farmer}
                  error={errors.farmer}
                />
                {errors.farmer && (
                  <p className="text-[11px] text-rose-600 font-extrabold mt-1">{errors.farmer}</p>
                )}
              </div>

              {purchaseForm.farmer ? (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-450 uppercase block font-bold tracking-wider">Member Details</span>
                    <span className="text-xs text-slate-800 font-extrabold block">
                      {selectedFarmer?.name || "Selected Farmer"}
                    </span>
                    {selectedFarmer?.subtext && (
                      <span className="text-[11px] text-slate-500 font-semibold block">{selectedFarmer.subtext}</span>
                    )}
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] rounded-lg font-bold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 size={12} /> {selectedFarmerRole || "FARMER"}
                  </span>
                </div>
              ) : (
                <div className="p-3.5 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 font-semibold">
                  Select a member farmer to load profile information
                </div>
              )}
            </div>
          </div>

          {/* Section B: Crop Stock Line Items Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                  <Sprout size={15} />
                </div>
                <span>Crop Stock Procurement Lines</span>
              </h3>
              <button
                type="button"
                onClick={addCropRow}
                className="text-brand-650 hover:text-brand-800 text-xs font-bold flex items-center gap-1.5 border border-brand-200 bg-brand-50/60 px-3.5 py-1.5 rounded-xl transition active:scale-95 cursor-pointer shadow-3xs"
              >
                <PlusCircle size={14} /> Add Crop Line
              </button>
            </div>

            <div className="space-y-4">
              {/* Header row */}
              <div className="grid grid-cols-12 gap-2 text-[10px] text-slate-450 uppercase tracking-wider font-extrabold select-none border-b border-slate-100 pb-2 px-1">
                <div className="col-span-3">Crop Name *</div>
                <div className="col-span-2">Variety</div>
                <div className="col-span-2 text-center">Unit</div>
                <div className="col-span-2 text-right">Quantity *</div>
                <div className="col-span-2 text-right">Rate (₹) *</div>
                <div className="col-span-1 text-right">Amount</div>
              </div>

              {/* Crop Items */}
              {purchaseForm.crops.map((crop, idx) => {
                const rowAmt = calculateCropAmount(crop.quantity, crop.rate, crop.unit, crop.rateUnit || "qtl");
                const cropErr = errors.crops?.[idx] || {};
                return (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-start bg-slate-50/40 p-3 rounded-xl border border-slate-200/70 hover:border-slate-300 transition"
                  >
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={crop.cropName}
                        onChange={(e) => handleCropRowChange(idx, "cropName", e.target.value)}
                        placeholder="Crop (e.g. Wheat, Mustard)"
                        className={`w-full border ${cropErr.cropName
                            ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30 text-rose-900"
                            : "border-slate-200 bg-white"
                          } px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold text-xs text-slate-800`}
                      />
                      {cropErr.cropName && (
                        <span className="text-[10px] text-rose-600 font-extrabold block mt-1">{cropErr.cropName}</span>
                      )}
                    </div>

                    <div className="col-span-2">
                      <input
                        type="text"
                        value={crop.variety}
                        onChange={(e) => handleCropRowChange(idx, "variety", e.target.value)}
                        placeholder="Variety (e.g. Basmati)"
                        className="w-full border border-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold text-xs bg-white text-slate-800"
                      />
                    </div>

                    <div className="col-span-2">
                      <select
                        value={crop.unit}
                        onChange={(e) => handleCropRowChange(idx, "unit", e.target.value)}
                        className="w-full border border-slate-200 bg-white px-2 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold text-xs text-slate-800 cursor-pointer"
                      >
                        <option value="qtl">Quintals (qtl)</option>
                        <option value="Kg">Kilograms (Kg)</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        min={0.01}
                        step="any"
                        onKeyDown={(e) => {
                          if (e.key === "-" || e.key === "e") e.preventDefault();
                        }}
                        value={crop.quantity}
                        onChange={(e) => handleCropRowChange(idx, "quantity", e.target.value)}
                        placeholder="0.00"
                        className={`w-full border ${cropErr.quantity
                            ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30 text-rose-900"
                            : "border-slate-200 bg-white"
                          } px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-right font-bold text-xs text-slate-900`}
                      />
                      {cropErr.quantity && (
                        <span className="text-[10px] text-rose-600 font-extrabold block mt-1 text-right">
                          {cropErr.quantity}
                        </span>
                      )}
                    </div>

                    <div className="col-span-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0.01}
                          step="any"
                          onKeyDown={(e) => {
                            if (e.key === "-" || e.key === "e") e.preventDefault();
                          }}
                          value={crop.rate}
                          onChange={(e) => handleCropRowChange(idx, "rate", e.target.value)}
                          placeholder="Rate"
                          className={`w-full border ${cropErr.rate
                              ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30 text-rose-900"
                              : "border-slate-200 bg-white"
                            } px-2.5 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-right font-bold text-xs text-slate-900`}
                        />
                        <select
                          value={crop.rateUnit || "qtl"}
                          onChange={(e) => handleCropRowChange(idx, "rateUnit", e.target.value)}
                          className="text-[10px] font-bold border border-slate-200 bg-white rounded-lg px-1.5 py-2 text-slate-600 focus:outline-none cursor-pointer"
                          title="Rate Unit (/qtl or /Kg)"
                        >
                          <option value="qtl">/qtl</option>
                          <option value="Kg">/Kg</option>
                        </select>
                      </div>
                      {cropErr.rate && (
                        <span className="text-[10px] text-rose-600 font-extrabold block mt-1 text-right">
                          {cropErr.rate}
                        </span>
                      )}
                    </div>

                    <div className="col-span-1 flex items-center justify-end gap-1.5 pt-2">
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-black text-slate-900">{formatCurrency(rowAmt)}</span>
                      </div>
                      {purchaseForm.crops.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCropRow(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition border-0 bg-transparent cursor-pointer"
                          title="Delete Row"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section C: Logistics & Fulfillment */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Truck size={15} />
                </div>
                <span>Logistics & Storage Fulfillment</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-bold">Step 3 of 3</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
                  Procurement Date *
                </label>
                <input
                  type="date"
                  value={purchaseForm.procurementDate}
                  onChange={(e) => {
                    setPurchaseForm({ ...purchaseForm, procurementDate: e.target.value });
                    if (errors.procurementDate) setErrors((prev) => ({ ...prev, procurementDate: "" }));
                  }}
                  className={`w-full border ${errors.procurementDate
                      ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30 text-rose-900"
                      : "border-slate-200 bg-white"
                    } px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold text-xs text-slate-800 h-[40px]`}
                />
                {errors.procurementDate && (
                  <p className="text-[10px] text-rose-600 font-extrabold mt-1">{errors.procurementDate}</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
                  Procurement Center
                </label>
                <input
                  type="text"
                  value={purchaseForm.procurementCenter}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, procurementCenter: e.target.value })}
                  placeholder="e.g. Deoria Center, Yard A"
                  className="w-full border border-slate-200 bg-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold text-xs text-slate-800 h-[40px]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
                  Godown / Warehouse
                </label>
                <input
                  type="text"
                  value={purchaseForm.godown}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, godown: e.target.value })}
                  placeholder="e.g. Main Godown"
                  className="w-full border border-slate-200 bg-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold text-xs text-slate-800 h-[40px]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  value={purchaseForm.vehicle}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPurchaseForm({ ...purchaseForm, vehicle: val });
                    if (errors.vehicle) {
                      const clean = val.trim();
                      if (!clean || VEHICLE_REGEX.test(clean)) {
                        setErrors((prev) => ({ ...prev, vehicle: "" }));
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (val && !VEHICLE_REGEX.test(val)) {
                      setErrors((prev) => ({
                        ...prev,
                        vehicle: "Please enter a valid vehicle number. Example: MH12AB1234",
                      }));
                    } else {
                      setErrors((prev) => ({ ...prev, vehicle: "" }));
                    }
                  }}
                  placeholder="e.g. UP53AB1234"
                  className={`w-full border px-3 py-2 rounded-xl focus:outline-none focus:ring-2 font-mono font-semibold text-xs transition h-[40px] ${errors.vehicle
                      ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/10 text-rose-700"
                      : "border-slate-200 bg-white focus:ring-brand-500 text-slate-900"
                    }`}
                />
                {errors.vehicle && (
                  <p className="text-[10px] text-rose-600 font-bold mt-1">{errors.vehicle}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
                Quality / Remarks & Notes
              </label>
              <textarea
                rows={2}
                value={purchaseForm.remarks}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, remarks: e.target.value })}
                placeholder="Include moisture percentage, crop grade, inspection notes..."
                className="w-full border border-slate-200 bg-white px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold text-xs text-slate-800 resize-none"
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Financial Summary & Primary Action Card (4 Columns on desktop) */}
        <div className="lg:col-span-4 space-y-6 sticky top-6">
          {/* Summary Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <IndianRupee size={15} />
                </div>
                <span>Procurement Summary</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">INR (₹)</span>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Crop Lines</span>
                <span className="text-sm font-black text-slate-800 block">{purchaseForm.crops.length} Items</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Total Quantity</span>
                <span className="text-sm font-black text-slate-800 block">{totalQuantitySum}</span>
              </div>
            </div>

            {/* Breakdown calculation */}
            <div className="space-y-3 pt-2 text-xs">
              <div className="flex justify-between items-center text-slate-600 font-semibold">
                <span>Crop Stock Value:</span>
                <span className="font-bold text-slate-900 text-sm">{formatCurrency(getEditCropsTotal())}</span>
              </div>

              <div className="flex justify-between items-center text-slate-600 font-semibold pt-2 border-t border-slate-100">
                <div className="flex flex-col">
                  <span>Previous Dues (Deduction):</span>
                  <span className="text-[10px] text-slate-400">Subtract member dues</span>
                </div>
                <div className="flex flex-col items-end">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      value={purchaseForm.previousDues}
                      onKeyDown={(e) => {
                        if (e.key === "-" || e.key === "e") e.preventDefault();
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPurchaseForm({ ...purchaseForm, previousDues: val });
                        if (val !== "" && Number(val) < 0) {
                          setErrors((prev) => ({ ...prev, previousDues: "Dues cannot be negative." }));
                        } else {
                          if (errors.previousDues) setErrors((prev) => ({ ...prev, previousDues: "" }));
                        }
                      }}
                      placeholder="0"
                      className={`w-28 pl-6 pr-2.5 py-1.5 border ${errors.previousDues
                          ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30 text-rose-900"
                          : "border-slate-200 bg-white"
                        } rounded-xl text-right font-bold text-xs text-rose-600 focus:outline-none focus:ring-2 focus:ring-brand-500`}
                    />
                  </div>
                  {errors.previousDues && (
                    <span className="text-[10px] text-rose-600 font-extrabold block mt-1 text-right">
                      {errors.previousDues}
                    </span>
                  )}
                </div>
              </div>

              {/* Grand Total Display */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1 mt-4">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Net Amount Payable to Farmer
                </span>
                <span className="text-2xl font-black text-emerald-800 block">
                  {formatCurrency(getEditGrandTotal())}
                </span>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-extrabold text-xs transition-all shadow-md hover:shadow-xl active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving Record...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>{id ? "Update Procurement Record" : "Confirm & Save Procurement"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

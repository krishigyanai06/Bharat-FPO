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
  MinusCircle, 
  ArrowLeft, 
  Save, 
  Loader2 
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
    crops: [{ cropName: "Wheat", variety: "", unit: "qtl", rate: "", quantity: "" }],
    procurementDate: new Date().toISOString().split("T")[0],
    procurementCenter: "",
    previousDues: "",
    godown: "Main Godown",
    vehicle: "",
    remarks: "",
    purchaseId: "",
  });

  // Load initial resources
  useEffect(() => {
    dispatch(fetchMembers());
    dispatch(fetchOrders());
  }, [dispatch]);

  // Set form values if editing
  useEffect(() => {
    if (id && orders.length > 0) {
      const order = orders.find((o) => o._id === id);
      if (order) {
        setPurchaseForm({
          farmer: order.farmer?._id || order.farmer || "",
          crops: order.crops?.map((c) => ({
            cropName: c.cropName || "Wheat",
            variety: c.variety || "",
            unit: c.unit || "qtl",
            rate: c.rate || "",
            quantity: c.quantity || "",
          })) || [{ cropName: "Wheat", variety: "", unit: "qtl", rate: "", quantity: "" }],
          procurementDate: order.procurementDate ? new Date(order.procurementDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          procurementCenter: order.procurementCenter || "",
          previousDues: order.previousDues || "",
          godown: order.godown || "Main Godown",
          vehicle: order.vehicle || "",
          remarks: order.remarks || "",
          purchaseId: order.purchaseId || "",
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
    const updated = purchaseForm.crops.map((c, i) => {
      if (i !== index) return c;
      return { ...c, [field]: value };
    });
    setPurchaseForm({ ...purchaseForm, crops: updated });
  };

  const addCropRow = () => {
    setPurchaseForm({
      ...purchaseForm,
      crops: [...purchaseForm.crops, { cropName: "Wheat", variety: "", unit: "qtl", rate: "", quantity: "" }],
    });
  };

  const removeCropRow = (index) => {
    const updated = purchaseForm.crops.filter((_, i) => i !== index);
    setPurchaseForm({ ...purchaseForm, crops: updated });
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

  const getEditGrandTotal = () => {
    const cropsTotal = getEditCropsTotal();
    const dues = Number(purchaseForm.previousDues) || 0;
    return cropsTotal - dues;
  };

  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    if (!purchaseForm.farmer) {
      toast.error("Please select a farmer.");
      return;
    }
    const hasInvalidCrop = purchaseForm.crops.some(
      (c) => !c.cropName.trim() || Number(c.rate) <= 0 || Number(c.quantity) <= 0
    );
    if (hasInvalidCrop) {
      toast.error("Please fill crop name, rate, and quantity for all crop rows.");
      return;
    }

    const payload = {
      farmer: purchaseForm.farmer,
      crops: purchaseForm.crops.map((c) => ({
        crop: c.cropName || c.crop || "",
        cropName: c.cropName || c.crop || "",
        variety: c.variety || "",
        unit: c.unit || "qtl",
        rate: Number(c.rate),
        quantity: Number(c.quantity),
      })),
      procurementDate: purchaseForm.procurementDate,
      procurementCenter: purchaseForm.procurementCenter || "Main Yard",
      previousDues: Number(purchaseForm.previousDues) || 0,
      godown: purchaseForm.godown || "Main Godown",
      vehicle: purchaseForm.vehicle || "",
      remarks: purchaseForm.remarks || "",
    };

    setSaving(true);
    try {
      if (id) {
        await dispatch(updateOrder({ id, data: payload })).unwrap();
        toast.success("Procurement entry updated successfully!");
      } else {
        await dispatch(createOrder(payload)).unwrap();
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
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        <p className="text-xs text-gray-500 font-semibold">Loading procurement details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-150 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/procurement")}
            className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-500 hover:text-gray-900 border-0 bg-transparent cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">
              {id ? "Edit Procurement Record" : "Record Crop Procurement"}
            </h1>
            <p className="text-xs text-gray-400 font-bold">
              {id ? `Purchase ID: ${purchaseForm.purchaseId || id}` : "Record new crop purchase transaction from members"}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handlePurchaseSubmit} className="bg-white border border-gray-200 rounded-3xl shadow-sm text-xs font-semibold text-gray-700 flex flex-col p-6 space-y-6">
        {/* Farmer Profile Section */}
        <div className="bg-brand-50/30 border border-brand-100/50 p-5 rounded-2xl space-y-4">
          <h3 className="text-[10px] font-extrabold text-brand-800 uppercase tracking-widest flex items-center gap-1.5 border-b border-brand-100/50 pb-2">
            <User size={12} /> Farmer Registration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <SearchableSelect
                options={farmerOptions}
                value={purchaseForm.farmer}
                onChange={(val) => setPurchaseForm({ ...purchaseForm, farmer: val })}
                placeholder="Type farmer name, phone, or village..."
                label="Choose Farmer"
                required
                icon={User}
              />
            </div>
            {purchaseForm.farmer && (
              <div className="px-4 py-3 bg-white border border-gray-100 rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[9px] text-gray-400 uppercase block font-bold tracking-wider">Farmer Role</span>
                  <span className="text-xs text-gray-700 font-extrabold mt-0.5 block">{selectedFarmerRole}</span>
                </div>
                <span className="px-2 py-0.5 bg-brand-50 border border-brand-200 text-brand-700 text-[10px] rounded-md font-bold uppercase tracking-wider">
                  Verified
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Crop Rows Section */}
        <div className="border border-gray-150 p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2">
            <h3 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sprout size={12} /> Crop Stock Information
            </h3>
            <button
              type="button"
              onClick={addCropRow}
              className="text-brand-650 hover:text-brand-850 text-[10px] font-black flex items-center gap-1 border border-brand-200 bg-brand-50/50 px-3 py-1.5 rounded-lg transition active:scale-95 cursor-pointer"
            >
              <PlusCircle size={12} /> Add Crop Row
            </button>
          </div>

          <div className="space-y-3.5">
            {/* Table headers */}
            <div className="grid grid-cols-12 gap-2 text-[9px] text-gray-400 uppercase tracking-wider font-extrabold select-none border-b border-gray-100 pb-1.5">
              <div className="col-span-3">Crop Name</div>
              <div className="col-span-2">Variety</div>
              <div className="col-span-1.5 text-center">Unit</div>
              <div className="col-span-2 text-right">Quantity</div>
              <div className="col-span-2 text-right">Rate (₹)</div>
              <div className="col-span-1.5 text-right">Amount</div>
            </div>

            {/* Crop Rows */}
            {purchaseForm.crops.map((crop, idx) => {
              const rowAmt = calculateCropAmount(crop.quantity, crop.rate, crop.unit, crop.rateUnit || "qtl");
              return (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center border-b border-gray-100/50 pb-3 last:border-b-0 last:pb-0">
                  <div className="col-span-3">
                    <input
                      type="text"
                      required
                      value={crop.cropName}
                      onChange={(e) => handleCropRowChange(idx, "cropName", e.target.value)}
                      placeholder="Crop name (e.g. Wheat)"
                      className="w-full border border-gray-200 bg-white px-2.5 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 font-semibold text-xs text-gray-800"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={crop.variety}
                      onChange={(e) => handleCropRowChange(idx, "variety", e.target.value)}
                      placeholder="Roma, Basmati"
                      className="w-full border border-gray-200 px-2.5 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 font-semibold"
                    />
                  </div>
                  <div className="col-span-1.5">
                    <select
                      value={crop.unit}
                      onChange={(e) => handleCropRowChange(idx, "unit", e.target.value)}
                      className="w-full border border-gray-200 bg-white px-1.5 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 font-semibold text-xs"
                    >
                      <option value="qtl">qtl</option>
                      <option value="Kg">Kg</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      required
                      min={0.01}
                      step="any"
                      value={crop.quantity}
                      onChange={(e) => handleCropRowChange(idx, "quantity", e.target.value)}
                      placeholder="0.00"
                      className="w-full border border-gray-200 px-2 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-right font-bold"
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-1">
                    <input
                      type="number"
                      required
                      min={0.01}
                      step="any"
                      value={crop.rate}
                      onChange={(e) => handleCropRowChange(idx, "rate", e.target.value)}
                      placeholder="0"
                      className="w-full border border-gray-200 px-2 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-right font-bold text-xs"
                    />
                    <select
                      value={crop.rateUnit || "qtl"}
                      onChange={(e) => handleCropRowChange(idx, "rateUnit", e.target.value)}
                      className="text-[10px] font-bold border border-gray-200 bg-gray-50 rounded-lg px-1 py-2 text-gray-600 focus:outline-none cursor-pointer"
                      title="Rate Unit (/qtl or /Kg)"
                    >
                      <option value="qtl">/qtl</option>
                      <option value="Kg">/Kg</option>
                    </select>
                  </div>
                  <div className="col-span-1.5 flex items-center justify-end gap-1.5">
                    <span className="text-xs font-black text-gray-800">{formatCurrency(rowAmt)}</span>
                    {purchaseForm.crops.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCropRow(idx)}
                        className="text-red-500 hover:text-red-700 p-0.5 hover:bg-red-50 rounded transition border-0 bg-transparent cursor-pointer"
                        title="Delete Row"
                      >
                        <MinusCircle size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Logistics & Information Section */}
        <div className="border border-gray-150 p-5 rounded-2xl space-y-4">
          <h3 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-gray-100 pb-2">
            <Warehouse size={12} /> Logistics & Fulfillment
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-gray-450 uppercase tracking-wider mb-1.5">
                Procurement Date *
              </label>
              <input
                type="date"
                required
                value={purchaseForm.procurementDate}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, procurementDate: e.target.value })}
                className="w-full border border-gray-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 font-semibold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-gray-455 uppercase tracking-wider mb-1.5">
                Procurement Center
              </label>
              <input
                type="text"
                value={purchaseForm.procurementCenter}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, procurementCenter: e.target.value })}
                placeholder="e.g. Deoria Center"
                className="w-full border border-gray-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 font-semibold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-gray-455 uppercase tracking-wider mb-1.5">
                Godown Warehouse
              </label>
              <input
                type="text"
                value={purchaseForm.godown}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, godown: e.target.value })}
                placeholder="e.g. Godown A"
                className="w-full border border-gray-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 font-semibold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-gray-455 uppercase tracking-wider mb-1.5">
                Vehicle Number
              </label>
              <input
                type="text"
                value={purchaseForm.vehicle}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, vehicle: e.target.value })}
                placeholder="e.g. UP53-1234"
                className="w-full border border-gray-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Remarks/Notes */}
        <div>
          <label className="block text-[10px] font-extrabold text-gray-455 uppercase tracking-wider mb-1.5">
            Remarks / Notes
          </label>
          <textarea
            rows={3}
            value={purchaseForm.remarks}
            onChange={(e) => setPurchaseForm({ ...purchaseForm, remarks: e.target.value })}
            placeholder="Moisture variance notes, quality statements..."
            className="w-full border border-gray-200 px-3.5 py-2.5 rounded-2xl focus:outline-none focus:ring-1 focus:ring-brand-500 font-semibold resize-none"
          />
        </div>

        {/* Financial Section */}
        <div className="bg-gray-50 border border-gray-150 p-5 rounded-2xl flex flex-col space-y-2.5 max-w-sm ml-auto w-full">
          <div className="flex justify-between items-center text-gray-500 font-semibold">
            <span>Current Amount:</span>
            <span className="font-extrabold text-gray-700">{formatCurrency(getEditCropsTotal())}</span>
          </div>
          <div className="flex justify-between items-center text-gray-500 font-semibold pb-2 border-b border-gray-200">
            <span>Previous Dues (Debit):</span>
            <input
              type="number"
              value={purchaseForm.previousDues}
              onChange={(e) => setPurchaseForm({ ...purchaseForm, previousDues: e.target.value })}
              placeholder="0"
              className="w-24 border border-gray-250 bg-white px-2 py-1 rounded-lg text-right focus:outline-none font-bold text-red-500"
            />
          </div>
          <div className="flex justify-between items-center text-gray-800 text-sm font-black pt-1">
            <span>Grand Total (Payable):</span>
            <span className="text-brand-700 text-base">{formatCurrency(getEditGrandTotal())}</span>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => navigate("/sales/procurement")}
            className="px-6 py-3 border border-gray-250 bg-white rounded-xl hover:bg-gray-50 transition font-black text-gray-600 text-xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 bg-brand-700 hover:bg-brand-850 text-white rounded-xl transition flex items-center justify-center gap-1.5 font-black text-xs cursor-pointer shadow-sm disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={12} className="animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save size={12} /> Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

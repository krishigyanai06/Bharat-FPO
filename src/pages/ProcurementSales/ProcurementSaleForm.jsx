import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  createProcurementSale,
  updateProcurementSale,
  fetchProcurementSaleDetails,
  fetchProcurementStock,
  generateProcurementEWayBill
} from "../../redux/procurementSaleThunk";
import { fetchParties } from "../../store/thunks/partyThunk";
import { authenticateEWayBillSession } from "../../store/thunks/eWayBillThunk";
import { isEWayBillSessionValid } from "../../lib/api";
import CropSearch from "../../components/ProcurementSales/CropSearch";
import procurementSaleService from "../../services/procurementSaleService";
import {
  AlertCircle,
  Loader2,
  Save,
  User,
  Package,
  Truck,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Trash2,
  Search,
  FileText,
  ShieldCheck,
  ExternalLink,
  ArrowLeft,
  X,
  Leaf,
  Wallet,
  CreditCard,
  Zap,
  Building2,
  Scale,
  Coins,
  Lock,
  Plus,
  Sprout
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

export default function ProcurementSaleForm({ id, onBack }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { submitting, submitError, stock = [], loading } = useSelector((s) => s.procurementSales);
  const { parties = [], loading: partiesLoading } = useSelector((s) => s.party || { parties: [] });

  // Form Local State
  const [buyerDetails, setBuyerDetails] = useState({
    buyerType: "walk-in", // "walk-in", "party", "gst"
    buyerParty: "",
    buyerName: "",
    phone: "",
    gstin: "",
    address: "",
    billingType: "Cash",
    receivedAmount: "",
  });

  const [crops, setCrops] = useState([]);
  const [dispatchDetails, setDispatchDetails] = useState({
    transporterName: "",
    transporterId: "",
    vehicleNo: "",
    distance: "",
    remarks: "",
  });

  const [dispatchCollapsed, setDispatchCollapsed] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdSale, setCreatedSale] = useState(null);

  // Party search/select dropdown local state
  const [partySearchQuery, setPartySearchQuery] = useState("");
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);

  // E-way bill session states inside Success Modal
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authForm, setAuthForm] = useState({ username: "", password: "", gstin: "" });
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [ewbLoading, setEwbLoading] = useState(false);
  const [ewbError, setEwbError] = useState(null);
  const [ewbForm, setEwbForm] = useState({
    hsnCode: "1006",
    toPlace: "",
    toPincode: "",
    toStateCode: "27",
    vehicleType: "R",
    transMode: "1",
  });

  // Mount effects
  useEffect(() => {
    dispatch(fetchParties({ partyType: "BUYER" }));
    dispatch(fetchProcurementStock());
  }, [dispatch]);

  // Edit Mode: Fetch details
  useEffect(() => {
    if (isEdit) {
      dispatch(fetchProcurementSaleDetails(id))
        .unwrap()
        .then((sale) => {
          if (sale) {
            setBuyerDetails({
              buyerType: sale.buyerParty ? (sale.buyer?.gstin ? "gst" : "party") : "walk-in",
              buyerParty: sale.buyerParty || "",
              buyerName: sale.buyerName || sale.buyer?.name || "",
              phone: sale.phone || sale.buyer?.phone || "",
              gstin: sale.buyer?.gstin || "",
              address: sale.address || sale.buyer?.address || "",
              billingType: sale.billingType || "Cash",
              receivedAmount: sale.receivedAmount || 0,
            });
            setCrops(
              (sale.crops || []).map((c) => ({
                ...c,
                // Match fields
                cropName: c.cropName || c.crop || "",
                availableQuantity: (c.availableQuantity || c.quantity || 0) + 1000,
              }))
            );



            setDispatchDetails({
              transporterName: sale.dispatchDetails?.transporterName || "",
              transporterId: sale.dispatchDetails?.transporterId || "",
              vehicleNo: sale.dispatchDetails?.vehicleNo || "",
              distance: sale.dispatchDetails?.distance || "",
              remarks: sale.dispatchDetails?.remarks || "",
            });
            if (sale.dispatchDetails?.vehicleNo) {
              setDispatchCollapsed(false);
            }
          }
        })
        .catch((err) => {
          toast.error(err || "Failed to load sale details");
          onBack();
        });
    }
  }, [id, isEdit, dispatch]);

  // Available stock check
  const hasAvailableStock =
    (stock || []).some(
      (item) => (Number(item.availableQuantity) || Number(item.quantity) || 0) > 0
    ) || (stock || []).length > 0;

  // Live Auto-Calculations
  const subtotal = crops.reduce((sum, c) => sum + (Number(c.quantity) || 0) * (Number(c.rate) || 0), 0);
  const grandTotal = subtotal;
  const receivedNum = Number(buyerDetails.receivedAmount) || 0;
  const outstandingBalance = grandTotal - receivedNum;

  // Verify Sandbox session
  const checkEwbSession = () => {
    const valid = isEWayBillSessionValid();
    setIsAuthenticated(valid);
    setShowAuthForm(!valid);
  };

  useEffect(() => {
    if (showSuccessModal && createdSale) {
      checkEwbSession();
    }
  }, [showSuccessModal, createdSale]);

  const handleNICAuth = async (e) => {
    e.preventDefault();
    try {
      setEwbLoading(true);
      setEwbError(null);
      await dispatch(authenticateEWayBillSession(authForm)).unwrap();
      toast.success("Authenticated with NIC portal successfully!");
      setIsAuthenticated(true);
      setShowAuthForm(false);
    } catch (err) {
      setEwbError(err || "NIC Authentication failed");
      toast.error(err || "NIC Authentication failed");
    } finally {
      setEwbLoading(false);
    }
  };

  const handleGenerateEWayBill = async (e) => {
    e.preventDefault();
    const token = sessionStorage.getItem("ewaybill_token");
    if (!token) {
      toast.error("Session expired. Please re-authenticate.");
      checkEwbSession();
      return;
    }

    const payload = {
      hsnCode: ewbForm.hsnCode,
      toPlace: ewbForm.toPlace,
      toPincode: Number(ewbForm.toPincode),
      toStateCode: Number(ewbForm.toStateCode),
      vehicleType: ewbForm.vehicleType,
      transMode: ewbForm.transMode,
    };

    try {
      setEwbLoading(true);
      setEwbError(null);
      const updated = await dispatch(
        generateProcurementEWayBill({
          id: createdSale._id,
          body: payload,
          token,
        })
      ).unwrap();
      setCreatedSale(updated);
      toast.success("E-Way Bill generated successfully!");
    } catch (err) {
      setEwbError(err || "E-Way Bill generation failed");
      toast.error(err || "E-Way Bill generation failed");
    } finally {
      setEwbLoading(false);
    }
  };

  // Autocomplete Select Party
  const handleSelectParty = (party) => {
    setBuyerDetails({
      ...buyerDetails,
      buyerParty: party._id,
      buyerName: party.name || "",
      phone: party.phone || party.mobile || "",
      gstin: party.gstin || "",
      address: party.address || "",
    });
    setPartySearchQuery(party.name || "");
    setShowPartyDropdown(false);
  };

  // Simulate auto-fetch from GSTIN
  const handleFetchGSTDetails = () => {
    if (!buyerDetails.gstin.trim() || buyerDetails.gstin.length < 15) {
      toast.error("Please enter a valid 15-digit GSTIN.");
      return;
    }
    toast.loading("Verifying GSTIN with portal...", { id: "gst-fetch" });
    setTimeout(() => {
      setBuyerDetails({
        ...buyerDetails,
        buyerName: `GST Registered Buyer (${buyerDetails.gstin.slice(0, 7)})`,
        phone: "9876543210",
        address: "Industrial Area Yard Site, Maharashtra",
      });
      toast.success("GST details loaded successfully!", { id: "gst-fetch" });
    }, 1200);
  };

  // Add Crop selection
  const handleSelectCropStock = (item) => {
    const exists = crops.find(
      (c) => c.cropName === item.cropName && c.variety === item.variety && c.godown === item.godown
    );
    if (exists) {
      toast.error("Crop variety from this godown is already added.");
      return;
    }
    setCrops([
      ...crops,
      {
        cropName: item.cropName,
        variety: item.variety || "",
        godown: item.godown || "Main Godown",
        availableQuantity: item.availableQuantity || 0,
        unit: item.unit || "qtl",
        rate: item.rate || "",
        quantity: "",
      },
    ]);
  };

  const handleRemoveCrop = (index) => {
    setCrops(crops.filter((_, i) => i !== index));
  };

  const handleCropRowEdit = (index, field, value) => {
    if ((field === "quantity" || field === "rate") && value !== "" && Number(value) < 0) {
      toast.error(`${field === "quantity" ? "Quantity" : "Rate"} cannot be negative.`);
      return;
    }
    const updated = crops.map((c, i) => {
      if (i !== index) return c;
      return { ...c, [field]: value };
    });
    setCrops(updated);
  };

  // Validate and Submit
  const handleFormSave = async (e) => {
    e.preventDefault();
    if (!buyerDetails.buyerName.trim()) {
      toast.error("Buyer Name is required");
      return;
    }
    if (crops.length === 0) {
      toast.error("Please add at least one crop item.");
      return;
    }
    const hasNegativeQty = crops.some((c) => Number(c.quantity) < 0);
    if (hasNegativeQty) {
      toast.error("Quantity cannot be negative.");
      return;
    }
    const hasExceeded = crops.some((c) => Number(c.quantity) > Number(c.availableQuantity));
    if (hasExceeded) {
      toast.error("Cannot proceed: Some quantities exceed available stock levels.");
      return;
    }
    const hasInvalidCrops = crops.some((c) => !c.quantity || Number(c.quantity) <= 0 || !c.rate || Number(c.rate) <= 0);
    if (hasInvalidCrops) {
      toast.error("Please enter a valid rate and quantity for all crop items.");
      return;
    }

    const payload = {
      buyer: {
        name: buyerDetails.buyerName,
        phone: buyerDetails.phone,
        address: buyerDetails.address,
        gstin: buyerDetails.gstin,
      },
      buyerParty: buyerDetails.buyerParty || undefined,
      crops: crops.map((c) => ({
        cropName: c.cropName,
        variety: c.variety,
        godown: c.godown,
        unit: c.unit,
        quantity: Number(c.quantity),
        rate: Number(c.rate),
      })),
      billingType: buyerDetails.billingType,
      receivedAmount: Number(buyerDetails.receivedAmount) || 0,
      dispatchDetails: {
        transporterName: dispatchDetails.transporterName,
        transporterId: dispatchDetails.transporterId,
        vehicleNo: dispatchDetails.vehicleNo,
        distance: Number(dispatchDetails.distance) || 0,
        remarks: dispatchDetails.remarks,
      },
    };

    try {
      if (isEdit) {
        await dispatch(updateProcurementSale({ id, payload })).unwrap();
        toast.success("Procurement sale invoice updated!");
        onBack();
      } else {
        const result = await dispatch(createProcurementSale(payload)).unwrap();
        setCreatedSale(result);
        setShowSuccessModal(true);
        toast.success("Procurement sale recorded!");
      }
    } catch (err) {
      toast.error(err || "Save failed");
    }
  };

  const filteredParties = parties.filter((p) =>
    (p.name || "").toLowerCase().includes(partySearchQuery.toLowerCase())
  );

  const activeEwb = createdSale?.eWayBill || createdSale?.ewayBill;
  const activeEwbNo = activeEwb?.ewbNo || createdSale?.ewayBillNo || createdSale?.eWayBillNo;
  const hasEwb = !!activeEwbNo;

  const totalQty = crops.reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
  const firstUnit = crops[0]?.unit || "qtl";

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      {/* HEADER */}
      <div className="flex justify-between items-center pb-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="p-2 bg-emerald-50 text-emerald-700 rounded-full hover:bg-emerald-100 transition active:scale-95 cursor-pointer shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              {isEdit ? "Edit Procurement Crop Sale" : "New Procurement Crop Sale"}
            </h1>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Log crop dispatches, reduce inventories, and record double-entry accounting ledger entries.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 cursor-pointer active:scale-95 transition flex items-center gap-1.5"
        >
          <X size={14} /> Cancel
        </button>
      </div>

      {/* SINGLE PAGE ERP GRID CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* LEFT COLUMN: FORM DETAILS (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">

          {/* 1. BUYER INFORMATION CARD */}
          <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-gray-800 tracking-wide flex items-center gap-2 border-b border-gray-50 pb-3">
              <User size={16} className="text-emerald-600" /> Buyer Information
            </h3>

            {/* Segmented Buyer Type Selector */}
            <div className="grid grid-cols-3 bg-gray-50 p-1 rounded-2xl select-none border border-gray-100">
              {[
                { id: "walk-in", label: "Walk-in Buyer", icon: <User size={13} /> },
                { id: "party", label: "Existing Party", icon: <Package size={13} /> },
                { id: "gst", label: "GST Registered", icon: <FileText size={13} /> },
              ].map((btn) => {
                const isActive = buyerDetails.buyerType === btn.id;
                return (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => {
                      setBuyerDetails({
                        buyerType: btn.id,
                        buyerParty: "",
                        buyerName: btn.id === "walk-in" ? "Walk-in Buyer" : "",
                        phone: "",
                        gstin: "",
                        address: "",
                        billingType: buyerDetails.billingType,
                        receivedAmount: buyerDetails.receivedAmount,
                      });
                      setPartySearchQuery("");
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition ${isActive
                        ? "bg-emerald-50 border border-emerald-600 text-emerald-700 shadow-xs"
                        : "text-gray-400 border border-transparent hover:text-gray-600 cursor-pointer"
                      }`}
                  >
                    {btn.icon}
                    {btn.label}
                  </button>
                );
              })}
            </div>

            {/* Inputs based on selection */}
            {buyerDetails.buyerType === "walk-in" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-semibold text-xs text-gray-700">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Buyer Name *</label>
                  <input
                    type="text"
                    required
                    value={buyerDetails.buyerName}
                    onChange={(e) => setBuyerDetails({ ...buyerDetails, buyerName: e.target.value })}
                    placeholder="Enter buyer name"
                    className="w-full border border-gray-200 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    value={buyerDetails.phone}
                    onChange={(e) => setBuyerDetails({ ...buyerDetails, phone: e.target.value })}
                    placeholder="Enter phone number"
                    className="w-full border border-gray-200 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Billing Address</label>
                  <input
                    type="text"
                    value={buyerDetails.address}
                    onChange={(e) => setBuyerDetails({ ...buyerDetails, address: e.target.value })}
                    placeholder="Enter billing address"
                    className="w-full border border-gray-200 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-semibold"
                  />
                </div>
              </div>
            )}

            {buyerDetails.buyerType === "party" && (
              <div className="space-y-4">
                <div className="relative font-semibold text-xs text-gray-700">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Search & Select Party *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Type name to search existing FPO buyers..."
                      value={partySearchQuery}
                      onChange={(e) => {
                        setPartySearchQuery(e.target.value);
                        setShowPartyDropdown(true);
                      }}
                      onFocus={() => setShowPartyDropdown(true)}
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-500 font-semibold"
                    />
                  </div>

                  {showPartyDropdown && filteredParties.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto z-40 py-1.5 animate-fade-in">
                      {filteredParties.map((p) => (
                        <div
                          key={p._id}
                          onClick={() => handleSelectParty(p)}
                          className="px-4 py-2 hover:bg-gray-50 cursor-pointer flex justify-between items-center transition"
                        >
                          <div>
                            <span className="font-bold text-gray-800 block">{p.name}</span>
                            <span className="block text-[10px] text-gray-400">Phone: {p.phone || p.mobile || "—"}</span>
                          </div>
                          {p.gstin && (
                            <span className="px-2 py-0.5 bg-brand-50 border border-brand-200 text-brand-700 rounded text-[9px] font-bold font-mono">
                              GSTIN: {p.gstin}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {buyerDetails.buyerName && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 border border-gray-150 rounded-2xl animate-fade-in text-[11px]">
                    <div>
                      <span className="text-[9px] text-gray-400 block uppercase font-extrabold tracking-wider">Party Name</span>
                      <span className="font-bold text-gray-700 block mt-0.5">{buyerDetails.buyerName}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 block uppercase font-extrabold tracking-wider">Phone</span>
                      <span className="font-bold text-gray-700 block mt-0.5 font-mono">{buyerDetails.phone || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 block uppercase font-extrabold tracking-wider">GSTIN</span>
                      <span className="font-bold text-gray-700 block mt-0.5 font-mono">{buyerDetails.gstin || "—"}</span>
                    </div>
                    <div className="col-span-1 md:col-span-3 mt-1 pt-1.5 border-t border-gray-200">
                      <span className="text-[9px] text-gray-400 block uppercase font-extrabold tracking-wider">Address</span>
                      <span className="font-bold text-gray-700 block mt-0.5">{buyerDetails.address || "—"}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {buyerDetails.buyerType === "gst" && (
              <div className="space-y-4 font-semibold text-xs text-gray-700">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 max-w-sm">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Enter Taxpayer GSTIN *</label>
                    <input
                      type="text"
                      maxLength={15}
                      value={buyerDetails.gstin}
                      onChange={(e) => setBuyerDetails({ ...buyerDetails, gstin: e.target.value.toUpperCase() })}
                      placeholder="e.g. 29AAACQ3770E005"
                      className="w-full border border-gray-200 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono tracking-wider font-semibold text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleFetchGSTDetails}
                    className="py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer active:scale-95 transition h-[38px]"
                  >
                    Verify & Auto-Fill
                  </button>
                </div>

                {buyerDetails.buyerName && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 border border-gray-150 rounded-2xl animate-fade-in text-[11px]">
                    <div>
                      <span className="text-[9px] text-gray-400 block uppercase font-extrabold tracking-wider">Verified Legal Name</span>
                      <span className="font-bold text-gray-700 block mt-0.5">{buyerDetails.buyerName}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 block uppercase font-extrabold tracking-wider">Phone</span>
                      <span className="font-bold text-gray-700 block mt-0.5 font-mono">{buyerDetails.phone || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 block uppercase font-extrabold tracking-wider">Registered Address</span>
                      <span className="font-bold text-gray-700 block mt-0.5">{buyerDetails.address || "—"}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. CROP SELECTION */}
          <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex justify-between items-start border-b border-gray-50 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-800 tracking-wide flex items-center gap-2">
                  <Leaf size={16} className="text-emerald-600" /> Crop Selection
                </h3>
                <p className="text-[10px] text-gray-400 font-bold mt-1">Search and add crops from inventory</p>
              </div>
            </div>

            {!isEdit && !loading && !hasAvailableStock ? (
              <div className="py-10 px-6 flex flex-col items-center justify-center text-center bg-emerald-50/30 border border-dashed border-emerald-200 rounded-2xl space-y-4 my-2">
                <div className="w-16 h-16 bg-emerald-100/60 rounded-full flex items-center justify-center text-emerald-700 shadow-xs border border-emerald-200">
                  <span className="text-3xl select-none" role="img" aria-label="crop">🌾</span>
                </div>
                <div className="max-w-md space-y-2">
                  <h4 className="text-base font-bold text-gray-900 tracking-tight">
                    No Crops Available for Sale
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed font-medium">
                    You don't have any procured crops available for sale. Please purchase crops from farmers first. Once crops are added to your procurement stock, you can create a sale.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onBack) onBack();
                    navigate("/purchase/crop");
                  }}
                  className="mt-1 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <Sprout size={15} />
                  Go to Crop Procurement
                </button>
              </div>
            ) : (
              <>
                {/* Search Stock Input */}
                <div>
                  <CropSearch onSelect={handleSelectCropStock} selectedCrops={crops} />
                </div>

                {/* Selected Crops Spreadsheet Table */}
                {crops.length > 0 ? (
                  <div className="border border-gray-150 rounded-2xl overflow-hidden shadow-xs">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-[9px] text-gray-400 font-extrabold uppercase border-b border-gray-150 select-none">
                          <th className="px-4 py-3 text-center w-8">#</th>
                          <th className="px-4 py-3">Crop / Variety</th>
                          <th className="px-4 py-3 text-right w-24">Available Stock</th>
                          <th className="px-4 py-3 text-center w-20">Unit</th>
                          <th className="px-4 py-3 text-right w-28">Quantity</th>
                          <th className="px-4 py-3 text-right w-28">Rate (₹)</th>
                          <th className="px-4 py-3 text-right w-28">Amount (₹)</th>
                          <th className="px-3 py-3 text-center w-12">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-semibold text-gray-750 bg-white">
                        {crops.map((item, index) => {
                          const rowAmt = Number(item.quantity) * Number(item.rate) || 0;
                          const hasExceeded = Number(item.quantity) > Number(item.availableQuantity);

                          return (
                            <tr key={index} className={`hover:bg-gray-50/50 transition border-b border-gray-100 ${hasExceeded ? "bg-red-50/20" : ""}`}>
                              {/* # */}
                              <td className="px-4 py-3 font-bold text-gray-500 text-center w-8">
                                {index + 1}
                              </td>
                              {/* Crop/Variety Details */}
                              <td className="px-4 py-3">
                                <span className="font-bold text-gray-900 block">{item.cropName}</span>
                                {item.variety && (
                                  <span className="text-[10px] text-gray-455 block font-medium mt-0.5">{item.variety}</span>
                                )}
                              </td>
                              {/* Available stock */}
                              <td className="px-4 py-3 text-right font-bold text-gray-600 w-24">
                                {item.availableQuantity} {item.unit || "qtl"}
                              </td>
                              {/* Original Unit (non-editable plain text) */}
                              <td className="px-4 py-3 text-center font-bold text-gray-750 w-20">
                                {item.unit || "qtl"}
                              </td>
                              {/* Quantity input */}
                              <td className="px-4 py-3 text-right w-28">
                                <div className="space-y-1">
                                  <input
                                    type="number"
                                    min={0.01}
                                    step="any"
                                    required
                                    value={item.quantity}
                                    onChange={(e) => handleCropRowEdit(index, "quantity", e.target.value)}
                                    placeholder="0.00"
                                    className={`w-full border px-2.5 py-1.5 rounded-xl text-right font-black focus:outline-none focus:ring-1 text-xs shadow-xs transition ${hasExceeded
                                        ? "border-red-300 bg-red-50/10 focus:ring-red-500 focus:border-red-500 text-red-700"
                                        : "border-gray-200 bg-white focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                                      }`}
                                  />
                                  {hasExceeded && (
                                    <span className="text-[9px] text-red-600 font-bold flex items-center justify-end gap-1 mt-1 leading-none">
                                      <AlertCircle size={10} className="text-red-500 shrink-0" />
                                      Max: {item.availableQuantity} {item.unit}
                                    </span>
                                  )}
                                </div>
                              </td>
                              {/* Rate input */}
                              <td className="px-4 py-3 text-right w-28">
                                <input
                                  type="number"
                                  min={0.01}
                                  step="any"
                                  required
                                  value={item.rate}
                                  onChange={(e) => handleCropRowEdit(index, "rate", e.target.value)}
                                  placeholder="0"
                                  className="w-full border border-gray-200 bg-white px-2.5 py-1.5 rounded-xl text-right font-black focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs shadow-xs"
                                />
                              </td>
                              {/* Row Total amount */}
                              <td className="px-4 py-3 text-right font-black text-emerald-700 text-xs w-28">
                                {formatCurrency(rowAmt)}
                              </td>
                              {/* Remove button */}
                              <td className="px-3 py-3 text-center w-12">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCrop(index)}
                                  className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="border border-dashed border-gray-200 rounded-2xl py-8 text-center text-gray-400 font-semibold text-xs select-none">
                    No items added. Search and select a stock item above.
                  </div>
                )}

                {/* Table Summary Bar */}
                <div className="grid grid-cols-3 gap-4 border border-gray-200 rounded-2xl p-4 bg-gray-50/50 text-xs font-semibold">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                      <Package size={15} />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Total Items</span>
                      <span className="font-extrabold text-gray-800 text-xs mt-0.5 block">{crops.length}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
                    <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                      <Scale size={15} />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Total Quantity</span>
                      <span className="font-extrabold text-gray-800 text-xs mt-0.5 block">{totalQty} {firstUnit}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
                    <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                      <Coins size={15} />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Subtotal</span>
                      <span className="font-black text-emerald-700 text-xs mt-0.5 block">{formatCurrency(subtotal)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 3. PAYMENT & ACCOUNTING */}
          <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-gray-800 tracking-wide flex items-center gap-2 border-b border-gray-50 pb-3">
              <Wallet size={16} className="text-emerald-600" /> Payment & Double-entry Ledger
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-semibold text-xs text-gray-700">

              {/* Payment Mode Selector */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Payment Method *</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "Cash", label: "Cash", icon: <Coins size={12} /> },
                    { id: "Credit", label: "Credit", icon: <CreditCard size={12} /> },
                    { id: "UPI", label: "UPI", icon: <Zap size={12} /> },
                    { id: "Bank", label: "Bank", icon: <Building2 size={12} /> },
                  ].map((method) => {
                    const isActive = buyerDetails.billingType === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setBuyerDetails({ ...buyerDetails, billingType: method.id })}
                        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition ${isActive
                            ? "border-emerald-650 bg-emerald-50/50 text-emerald-700"
                            : "border-gray-200 hover:bg-gray-50 text-gray-500 cursor-pointer"
                          }`}
                      >
                        {method.icon}
                        {method.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Received Amount */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Received Amount (₹) *</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={buyerDetails.receivedAmount}
                  onChange={(e) => setBuyerDetails({ ...buyerDetails, receivedAmount: e.target.value })}
                  placeholder="0.00"
                  className="w-full border border-gray-200 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold text-xs"
                />
              </div>
            </div>

            {/* Outstanding Balance green box */}
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex justify-between items-center text-xs font-semibold">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Outstanding Balance (₹)</span>
                <span className="font-black text-emerald-750 text-base mt-0.5 block">
                  {formatCurrency(outstandingBalance)}
                </span>
              </div>
              <div>
                {outstandingBalance <= 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-150 text-green-700 select-none">
                    <CheckCircle size={12} /> Fully Paid
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-100 select-none">
                    Pending
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 4. DISPATCH LOGISTICS (COLLAPSIBLE ACCORDION) */}
          <div className="bg-white border border-gray-150 rounded-3xl overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setDispatchCollapsed(!dispatchCollapsed)}
              className="w-full px-6 py-4.5 bg-gray-50/50 hover:bg-gray-50 flex items-center justify-between border-b border-gray-100 transition select-none cursor-pointer"
            >
              <span className="text-xs font-bold text-gray-800 uppercase tracking-widest flex items-center gap-2">
                <Truck size={15} className="text-emerald-650" /> Dispatch & Transporter Details (Optional)
              </span>
              {dispatchCollapsed ? <ChevronDown size={14} className="text-gray-450" /> : <ChevronUp size={14} className="text-gray-450" />}
            </button>

            {!dispatchCollapsed && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 font-semibold text-xs text-gray-700 animate-fade-in">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Transporter Name</label>
                  <input
                    type="text"
                    value={dispatchDetails.transporterName}
                    onChange={(e) => setDispatchDetails({ ...dispatchDetails, transporterName: e.target.value })}
                    placeholder="e.g. VRL Logistics"
                    className="w-full border border-gray-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Transporter GSTIN</label>
                  <input
                    type="text"
                    value={dispatchDetails.transporterId}
                    onChange={(e) => setDispatchDetails({ ...dispatchDetails, transporterId: e.target.value })}
                    placeholder="e.g. 29AAACQ3770E005"
                    className="w-full border border-gray-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Vehicle Registration No</label>
                  <input
                    type="text"
                    value={dispatchDetails.vehicleNo}
                    onChange={(e) => setDispatchDetails({ ...dispatchDetails, vehicleNo: e.target.value })}
                    placeholder="e.g. KA51MC1234"
                    className="w-full border border-gray-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono uppercase font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Logistics Distance (KM)</label>
                  <input
                    type="number"
                    value={dispatchDetails.distance}
                    onChange={(e) => setDispatchDetails({ ...dispatchDetails, distance: e.target.value })}
                    placeholder="e.g. 150"
                    className="w-full border border-gray-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Logistics Remarks</label>
                  <textarea
                    rows={2}
                    value={dispatchDetails.remarks}
                    onChange={(e) => setDispatchDetails({ ...dispatchDetails, remarks: e.target.value })}
                    placeholder="Special transit instructions..."
                    className="w-full border border-gray-200 px-3.5 py-2.5 rounded-xl focus:outline-none resize-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: STICKY INVOICE SUMMARY PANEL (1/3 width) */}
        <div className="col-span-1 lg:sticky lg:top-6 space-y-6">
          <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm flex flex-col space-y-4 font-semibold text-xs text-gray-700">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-widest flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <FileText size={13} className="text-gray-400" /> Invoice Summary
            </h3>

            <div className="space-y-3 pt-1">
              <div className="flex justify-between items-center text-gray-500">
                <span>Items Count</span>
                <span className="font-extrabold text-gray-900 text-xs">{crops.length}</span>
              </div>
              <div className="flex justify-between items-center text-gray-500">
                <span>Total Quantity</span>
                <span className="font-extrabold text-gray-900 text-xs">{totalQty} {firstUnit}</span>
              </div>
              <div className="flex justify-between items-center text-gray-500">
                <span>Subtotal (₹)</span>
                <span className="font-extrabold text-gray-900 text-xs">{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-gray-500">
                <span>Charges / Discount</span>
                <span className="font-extrabold text-gray-900 text-xs">0.00</span>
              </div>
              <div className="flex justify-between items-center text-gray-500 pb-3 border-b border-gray-100">
                <span>GST (0%)</span>
                <span className="font-extrabold text-gray-900 text-xs">0.00</span>
              </div>
              <div className="flex justify-between items-center text-emerald-700 text-sm font-black pt-1">
                <span>Grand Total (₹)</span>
                <span className="text-base text-emerald-750 font-black">{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-gray-500 pt-2 pb-2">
                <span>Received Amount</span>
                <span className="font-extrabold text-gray-900 text-xs">{receivedNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-gray-550 border-t border-gray-100 pt-3">
                <span>Outstanding Balance</span>
                <span className="font-black text-amber-600 text-xs">{outstandingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                disabled={submitting}
                onClick={handleFormSave}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-98 cursor-pointer select-none"
              >
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Save Procurement Sale
              </button>



              <button
                type="button"
                onClick={onBack}
                className="w-full py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 font-extrabold rounded-xl text-xs flex items-center justify-center transition active:scale-98 cursor-pointer select-none"
              >
                Cancel
              </button>
            </div>

            {/* Compliance Badge */}
            <div className="bg-emerald-50/40 border border-emerald-150 rounded-2xl p-4 flex gap-2 text-[10px] text-emerald-800 leading-normal font-medium">
              <ShieldCheck size={14} className="text-emerald-600 shrink-0 mt-0.5" />
              <span>Your data is secure and compliant. All transactions are encrypted and stored securely.</span>
            </div>

            {submitError && (
              <div className="bg-red-950/60 border border-red-900 rounded-2xl p-3 flex items-start gap-2 text-[10px] text-red-200 leading-normal font-semibold">
                <AlertCircle size={12} className="shrink-0 mt-0.5 text-red-500" />
                <span>{submitError}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SUCCESS MODAL CARD OVERLAY ── */}
      {showSuccessModal && createdSale && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto text-xs font-semibold text-gray-700 relative">

            {/* Close Cross Button */}
            <button
              type="button"
              onClick={onBack}
              className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-650 transition cursor-pointer"
            >
              <X size={16} />
            </button>

            {/* Animation Check */}
            <div className="flex flex-col items-center text-center space-y-2 border-b border-gray-100 pb-4">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600 shadow-sm border border-green-200">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h2 className="text-base font-black text-gray-800 tracking-tight">Invoice Successfully Created!</h2>
              <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                Dispatch log registered and inventory levels reduced.
              </p>
            </div>

            {/* Details Box */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50/50 p-4 border border-gray-150 rounded-2xl">
              <div>
                <span className="text-[9px] text-gray-400 block uppercase font-extrabold tracking-wider">Invoice No</span>
                <p className="font-bold text-gray-800 mt-0.5">{createdSale.invoiceNo || "—"}</p>
              </div>
              <div>
                <span className="text-[9px] text-gray-400 block uppercase font-extrabold tracking-wider">Buyer Name</span>
                <p className="font-bold text-gray-800 mt-0.5">{createdSale.buyerName || createdSale.buyer?.name || "—"}</p>
              </div>
              <div className="col-span-2 pt-1 border-t border-gray-100">
                <span className="text-[9px] text-gray-400 block uppercase font-extrabold tracking-wider">Total Invoice Value</span>
                <p className="font-black text-brand-700 text-sm mt-0.5">{formatCurrency(createdSale.totalAmount)}</p>
              </div>
            </div>

            {/* NIC Compliance Integration inside Modal */}
            {createdSale.buyer?.gstin && createdSale.dispatchDetails?.vehicleNo ? (
              <div className="border border-gray-150 rounded-2xl p-4.5 space-y-3 bg-gray-50/30">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    NIC Portal e-Way Bill Compliance
                  </h4>
                  {hasEwb ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-green-50 border border-green-200 text-green-700 uppercase tracking-wider">
                      Generated
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-yellow-50 border border-yellow-250 text-yellow-750 uppercase tracking-wider">
                      Required
                    </span>
                  )}
                </div>

                {hasEwb ? (
                  <div className="space-y-3 bg-green-50/30 border border-green-200 p-3 rounded-xl">
                    <div className="flex items-center gap-1.5 text-green-700">
                      <ShieldCheck size={14} className="shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Registered on Sandbox</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                      <div>
                        <span className="text-gray-400 block text-[9px] uppercase tracking-wider">EWB Number</span>
                        <p className="text-gray-800 font-black mt-0.5">{activeEwbNo}</p>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[9px] uppercase tracking-wider">Validity</span>
                        <p className="text-gray-800 mt-0.5">{activeEwb?.validUpto || "—"}</p>
                      </div>
                    </div>
                  </div>
                ) : showAuthForm ? (
                  <form onSubmit={handleNICAuth} className="space-y-3 bg-white p-3.5 border border-gray-200 rounded-xl">
                    <p className="text-[10px] text-gray-500 leading-normal font-semibold">
                      🔐 Session expired. Connect to NIC Sandbox Portal to register the dispatch.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="col-span-2">
                        <input
                          type="text"
                          required
                          value={authForm.username}
                          onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                          placeholder="NIC Username"
                          className="w-full border border-gray-250 px-2 py-1.5 rounded-lg focus:outline-none"
                        />
                      </div>
                      <div>
                        <input
                          type="password"
                          required
                          value={authForm.password}
                          onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                          placeholder="NIC Password"
                          className="w-full border border-gray-250 px-2 py-1.5 rounded-lg focus:outline-none"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          required
                          maxLength={15}
                          value={authForm.gstin}
                          onChange={(e) => setAuthForm({ ...authForm, gstin: e.target.value.toUpperCase() })}
                          placeholder="FPO GSTIN"
                          className="w-full border border-gray-250 px-2 py-1.5 rounded-lg focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                    {ewbError && <p className="text-[10px] text-red-500 font-bold block">{ewbError}</p>}
                    <button
                      type="submit"
                      disabled={ewbLoading}
                      className="w-full py-2 bg-gray-850 hover:bg-gray-900 text-white font-extrabold rounded-lg text-[10px] flex items-center justify-center gap-1"
                    >
                      {ewbLoading && <Loader2 size={11} className="animate-spin" />}
                      Authenticate Portal
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleGenerateEWayBill} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <label className="block text-[9px] font-extrabold text-gray-400 uppercase tracking-wider mb-0.5">HSN Code</label>
                        <input
                          type="text"
                          required
                          value={ewbForm.hsnCode}
                          onChange={(e) => setEwbForm({ ...ewbForm, hsnCode: e.target.value })}
                          className="w-full border border-gray-200 px-2.5 py-1.5 rounded-lg focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold text-gray-400 uppercase tracking-wider mb-0.5">Destination Pincode</label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={ewbForm.toPincode}
                          onChange={(e) => setEwbForm({ ...ewbForm, toPincode: e.target.value.replace(/\D/g, "") })}
                          placeholder="e.g. 400001"
                          className="w-full border border-gray-200 px-2.5 py-1.5 rounded-lg focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold text-gray-400 uppercase tracking-wider mb-0.5">Destination place</label>
                        <input
                          type="text"
                          required
                          value={ewbForm.toPlace}
                          onChange={(e) => setEwbForm({ ...ewbForm, toPlace: e.target.value })}
                          placeholder="Place Name"
                          className="w-full border border-gray-200 px-2.5 py-1.5 rounded-lg focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold text-gray-400 uppercase tracking-wider mb-0.5">State code</label>
                        <input
                          type="text"
                          required
                          value={ewbForm.toStateCode}
                          onChange={(e) => setEwbForm({ ...ewbForm, toStateCode: e.target.value.replace(/\D/g, "") })}
                          className="w-full border border-gray-200 px-2.5 py-1.5 rounded-lg focus:outline-none"
                        />
                      </div>
                    </div>
                    {ewbError && <p className="text-[10px] text-red-500 font-bold block">{ewbError}</p>}
                    <button
                      type="submit"
                      disabled={ewbLoading}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-[10px] flex items-center justify-center gap-1 shadow-sm"
                    >
                      {ewbLoading && <Loader2 size={11} className="animate-spin" />}
                      ⚡ Generate Sandbox e-Way Bill
                    </button>
                  </form>
                )}
              </div>
            ) : null}

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={async () => {
                  try {
                    toast.loading("Preparing print...", { id: "print-invoice" });
                    const blobData = await procurementSaleService.downloadInvoicePdf(createdSale._id);
                    const fileURL = window.URL.createObjectURL(blobData);
                    const iframe = document.createElement("iframe");
                    iframe.style.display = "none";
                    iframe.src = fileURL;
                    document.body.appendChild(iframe);
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();
                    toast.success("Print dialog opened!", { id: "print-invoice" });
                  } catch (e) {
                    console.error(e);
                    toast.error("Failed to prepare print", { id: "print-invoice" });
                  }
                }}
                className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 text-gray-655 rounded-xl font-bold flex items-center justify-center gap-1 hover:shadow-xs active:scale-95 transition"
              >
                <FileText size={13} /> Print Invoice
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    toast.loading("Downloading PDF invoice...", { id: "download-invoice" });
                    const blobData = await procurementSaleService.downloadInvoicePdf(createdSale._id);
                    const fileURL = window.URL.createObjectURL(blobData);
                    const link = document.createElement("a");
                    link.href = fileURL;
                    link.download = `Invoice_${createdSale.invoiceNo || createdSale._id}.pdf`;
                    link.click();
                    toast.success("Downloaded successfully!", { id: "download-invoice" });
                  } catch (e) {
                    console.error(e);
                    toast.error("Failed to download invoice PDF", { id: "download-invoice" });
                  }
                }}
                className="flex-1 py-3 border border-gray-250 hover:bg-gray-50 text-gray-655 rounded-xl font-bold flex items-center justify-center gap-1 hover:shadow-xs active:scale-95 transition"
              >
                <Download size={13} /> Download PDF
              </button>
              <button
                type="button"
                onClick={onBack}
                className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-black flex items-center justify-center gap-1 shadow-sm active:scale-95 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

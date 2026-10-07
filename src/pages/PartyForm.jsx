import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { fetchParties, addParty, updateParty } from "../store/thunks/partyThunk";
import { clearPartyStatus } from "../store/slices/partySlice";
import { usePermissions } from "../hooks/usePermissions";
import SearchableStateSelect from "../components/SearchableStateSelect";
import { searchGstin } from "../store/thunks/eInvoiceThunk";
import { normalizeGstinData } from "../utils/gstinNormalizer";
import toast from "react-hot-toast";
import {
    ArrowLeft,
    Building2,
    Building,
    MapPin,
    IndianRupee,
    CreditCard,
    Check,
    Loader2,
    Info,
    Package,
    RefreshCw,
    ShieldCheck,
    Sparkles,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Phone,
    Mail
} from "lucide-react";

// State Options for Dropdowns
const STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
    "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
    "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
    "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi"
];

const GST_TYPES = [
    "Unregistered/Consumer",
    "Registered-Regular",
    "Registered-Composition",
    "Overseas",
    "SEZ"
];

export default function PartyForm() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const queryRole = searchParams.get("role")?.toUpperCase();
    const initialRole = queryRole === "BUYER" || queryRole === "SUPPLIER" || queryRole === "BOTH" ? queryRole : "SUPPLIER";

    const { parties, loading, error, success } = useSelector((s) => s.party);
    const { isReadOnly } = usePermissions();
    const { gstinLoading } = useSelector((s) => s.eInvoice);

    // Form States
    const [verifiedGstinDetails, setVerifiedGstinDetails] = useState(null);
    const [gstinError, setGstinError] = useState(null);
    const [hasAttemptedGstin, setHasAttemptedGstin] = useState(false);
    const [shippingSameAsBilling, setShippingSameAsBilling] = useState(true);
    const [showMoreDetails, setShowMoreDetails] = useState(false);

    const [form, setForm] = useState({
        name: "",
        phoneNumber: "",
        gstin: "",
        gstType: "Unregistered/Consumer",
        state: "Uttar Pradesh",
        email: "",
        billingAddress: "",
        shippingAddress: "",
        openingBalance: "",
        openingBalanceType: "CREDIT",
        partyType: initialRole,
    });
    const [errors, setErrors] = useState({});

    // Fetch parties list to populate on edit mode (if refreshed or directly entered URL)
    useEffect(() => {
        dispatch(fetchParties());
    }, [dispatch]);

    // Load party details if in Edit Mode
    useEffect(() => {
        if (id && parties.length > 0) {
            const party = parties.find((p) => p._id === id);
            if (party) {
                setForm({
                    name: party.name || "",
                    phoneNumber: party.phoneNumber || "",
                    gstin: party.gstin || "",
                    gstType: party.gstType || "Unregistered/Consumer",
                    state: party.state || "Uttar Pradesh",
                    email: party.email || "",
                    billingAddress: party.billingAddress || "",
                    shippingAddress: party.shippingAddress || "",
                    openingBalance: party.openingBalance ?? "",
                    openingBalanceType: party.openingBalanceType || "CREDIT",
                    partyType: party.partyType || "SUPPLIER",
                });
                setShippingSameAsBilling(!party.shippingAddress || party.shippingAddress === party.billingAddress);
            } else {
                toast.error("Party not found");
                navigate("/party");
            }
        }
    }, [id, parties, navigate]);

    // Handle Operation Success/Fail states
    useEffect(() => {
        if (success) {
            const isEdit = !!id;
            dispatch(clearPartyStatus());
            
            Swal.fire({
                icon: "success",
                title: isEdit ? "Party Profile Updated!" : "Party Registered Successfully!",
                html: `
                    <div style="font-family: inherit; text-align: center; padding: 4px 0;">
                        <p style="font-size: 13px; color: #475569; margin-bottom: 6px;">
                            Party <strong>${form.name}</strong> (${form.partyType}) has been ${isEdit ? "updated" : "saved to directory"}.
                        </p>
                        <p style="font-size: 12px; color: #64748b;">
                            Phone: <strong>+91 ${form.phoneNumber}</strong> · State: <strong>${form.state}</strong>
                        </p>
                    </div>
                `,
                confirmButtonColor: "#16A36A",
                confirmButtonText: "Return to Directory",
                customClass: {
                    popup: "rounded-2xl shadow-2xl border border-slate-100 p-5",
                    title: "text-lg font-bold text-slate-900",
                    confirmButton: "px-5 py-2 text-xs font-bold rounded-xl cursor-pointer shadow-2xs",
                },
            }).then(() => {
                navigate("/party");
            });
        }
    }, [success, dispatch, id, navigate, form.name, form.partyType, form.phoneNumber, form.state]);

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearPartyStatus());
        }
    }, [error, dispatch]);

    // Input handlers
    const handleGstTypeChange = (e) => {
        const selectedGstType = e.target.value;
        setForm((prev) => {
            const updated = { ...prev, gstType: selectedGstType };
            // Clear GSTIN if setting to unregistered/consumer
            if (!selectedGstType.startsWith("Registered")) {
                updated.gstin = "";
            }
            return updated;
        });
        setVerifiedGstinDetails(null);
        setGstinError(null);
        setHasAttemptedGstin(false);
    };

    const handleGstinChange = (e) => {
        setForm({ ...form, gstin: e.target.value.toUpperCase() });
        if (verifiedGstinDetails) setVerifiedGstinDetails(null);
        if (gstinError) setGstinError(null);
        if (hasAttemptedGstin) setHasAttemptedGstin(false);
    };

    // Form validations
    const validateForm = () => {
        const tempErrors = {};
        if (!form.name.trim()) tempErrors.name = "Name is required";
        if (!form.phoneNumber) {
            tempErrors.phoneNumber = "Phone number is required";
        } else if (!/^\d{10}$/.test(form.phoneNumber)) {
            tempErrors.phoneNumber = "Phone number must be exactly 10 digits";
        }

        // GSTIN validation if registered type is selected
        if (form.gstType.startsWith("Registered")) {
            if (!form.gstin) {
                tempErrors.gstin = "GSTIN is required for registered parties";
            } else if (form.gstin.length !== 15) {
                tempErrors.gstin = "GSTIN must be exactly 15 alphanumeric characters";
            }
        }

        if (!form.partyType) {
            tempErrors.partyType = "Business role is required";
        }

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    // GST Verification Logic
    const handleVerifyGstin = () => {
        const trimmedGstin = (form.gstin || "").replace(/\s+/g, "").toUpperCase();
        if (trimmedGstin.length !== 15) {
            toast.error("Please enter a valid 15-character GSTIN");
            return;
        }

        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstinRegex.test(trimmedGstin)) {
            setGstinError("Invalid GSTIN format. The 14th character must be 'Z' (e.g. 29AAACQ3770E1Z5).");
            setVerifiedGstinDetails(null);
            setHasAttemptedGstin(true);
            return;
        }

        setGstinError(null);
        setVerifiedGstinDetails(null);
        setHasAttemptedGstin(true);

        dispatch(searchGstin({ gstin: trimmedGstin }))
            .unwrap()
            .then((res) => {
                const normalized = normalizeGstinData(res);
                if (!normalized) {
                    setGstinError("Failed to parse Government GSTIN response.");
                    return;
                }

                toast.success("GSTIN verified successfully!");
                setVerifiedGstinDetails(normalized);

                // Map registration type from taxpayer type
                let resolvedGstType = "Registered-Regular";
                if (normalized.taxpayerType?.toLowerCase().includes("composition")) {
                    resolvedGstType = "Registered-Composition";
                }

                // Match state name
                let matchedState = form.state;
                if (normalized.state) {
                    const matched = STATES.find(s => s.toLowerCase() === normalized.state.toLowerCase());
                    if (matched) matchedState = matched;
                }

                setForm((prev) => ({
                    ...prev,
                    gstin: normalized.gstin,
                    name: normalized.tradeName || normalized.legalName || prev.name,
                    billingAddress: normalized.billingAddress || prev.billingAddress,
                    shippingAddress: normalized.shippingAddress || prev.shippingAddress,
                    state: matchedState || prev.state,
                    gstType: resolvedGstType,
                }));
            })
            .catch((err) => {
                setGstinError(err || "GSTIN not found or inactive. Please check and try again.");
            });
    };

    // Form Submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isReadOnly) {
            toast.error("You have read-only access.");
            return;
        }
        if (!validateForm()) {
            toast.error("Please fill all required fields correctly.");
            return;
        }

        const payload = { ...form };
        payload.openingBalance = payload.openingBalance === "" || payload.openingBalance === null ? 0 : Number(payload.openingBalance);
        
        // Clear GSTIN if unregistered/consumer
        if (!payload.gstType.startsWith("Registered")) {
            payload.gstin = "";
        }

        if (id) {
            dispatch(updateParty({ id, data: payload }));
        } else {
            dispatch(addParty(payload));
        }
    };

    const isNameAutofilled = !!verifiedGstinDetails && (form.name === verifiedGstinDetails.tradeName || form.name === verifiedGstinDetails.legalName);
    const isAddressAutofilled = !!verifiedGstinDetails && form.billingAddress === verifiedGstinDetails.billingAddress;
    const isStateAutofilled = !!verifiedGstinDetails && form.state === verifiedGstinDetails.state;

    return (
        <div className="-m-6 min-h-[calc(100vh-68px)] flex flex-col bg-[#F8FAFC] text-slate-800 font-sans select-none overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            
            {/* 1. TOP HEADER TOOLBAR (FULL EDGE-TO-EDGE WIDTH) */}
            <div className="bg-white border-b border-[#DCE5EA] sticky top-0 z-20 shadow-2xs w-full px-6 h-14 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => navigate("/party")}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition active:scale-95 flex items-center justify-center cursor-pointer"
                        title="Back to Party Directory"
                    >
                        <ArrowLeft className="w-4.5 h-4.5" />
                    </button>
                    <div className="h-5 w-px bg-slate-200" />
                    <div>
                        <h1 className="text-sm font-bold text-slate-900 tracking-tight">
                            {id ? "Edit Party Profile" : "Register New Party"}
                        </h1>
                        <p className="text-[11px] text-slate-500 font-medium">
                            Configure supplier or buyer business details, GSTIN & opening balances
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md bg-emerald-50 text-[#16A36A] border border-emerald-200 shadow-2xs">
                        {form.partyType}
                    </span>
                </div>
            </div>

            {/* Read-Only Warning Banner */}
            {isReadOnly && (
                <div className="w-full px-6 mt-4">
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl flex items-center gap-2.5 text-xs font-semibold shadow-2xs">
                        <Info className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>You are in <strong>Read-Only Mode</strong>. You can view party details but cannot make modifications.</span>
                    </div>
                </div>
            )}

            {/* 2. MAIN FORM BODY CONTROLLER (FULL WIDTH CONTENT) */}
            <form onSubmit={handleSubmit} className="flex-1 w-full px-6 py-6 space-y-6">
                
                {/* ================= CARD 1: BUSINESS & CONTACT INFORMATION ================= */}
                <div className="w-full bg-white border border-[#DCE5EA] rounded-2xl p-6 shadow-2xs space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#16A36A] flex items-center justify-center border border-emerald-100 shadow-2xs">
                                <Building2 className="w-4.5 h-4.5" />
                            </div>
                            <div>
                                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                    Business Information
                                </h2>
                                <p className="text-[11px] text-slate-500 font-medium">Select partner role, GST registration type & business contact details</p>
                            </div>
                        </div>
                    </div>

                    {/* Partner Role Options */}
                    <div>
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
                            Partner Role <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                                { id: "SUPPLIER", label: "Supplier", icon: <Package className="w-4.5 h-4.5 shrink-0" />, desc: "Buy crops & agricultural supplies from this party" },
                                { id: "BUYER", label: "Buyer", icon: <Building className="w-4.5 h-4.5 shrink-0" />, desc: "Sell crops & agricultural supplies to this party" },
                                { id: "BOTH", label: "Both Roles", icon: <RefreshCw className="w-4.5 h-4.5 shrink-0" />, desc: "Act as both supplier & buyer in transactions" },
                            ].map((role) => {
                                const isSelected = form.partyType === role.id;
                                return (
                                    <button
                                        key={role.id}
                                        type="button"
                                        disabled={isReadOnly}
                                        onClick={() => setForm({ ...form, partyType: role.id })}
                                        className={`flex items-start gap-3.5 p-3.5 rounded-xl border text-left transition select-none cursor-pointer ${
                                            isSelected
                                                ? "border-[#16A36A] bg-emerald-50/40 ring-1 ring-[#16A36A] text-slate-900 shadow-2xs"
                                                : "border-[#DCE5EA] hover:bg-slate-50 text-slate-700 hover:border-slate-300"
                                        } disabled:opacity-50`}
                                    >
                                        <div className={`p-2 rounded-lg transition ${
                                            isSelected ? "bg-emerald-100 text-[#16A36A]" : "bg-slate-100 text-slate-500"
                                        }`}>
                                            {role.icon}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider">{role.label}</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{role.desc}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        {errors.partyType && (
                            <p className="text-[10px] font-bold text-rose-600 mt-1">{errors.partyType}</p>
                        )}
                    </div>

                    {/* Business Fields Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {/* GST Type */}
                        <div>
                            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                                GST Type
                            </label>
                            <select
                                disabled={isReadOnly}
                                value={form.gstType}
                                onChange={handleGstTypeChange}
                                className="w-full px-3 py-2 text-xs font-semibold border border-[#DCE5EA] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#16A36A] focus:border-[#16A36A] bg-slate-50/50 focus:bg-white h-9 text-slate-800 cursor-pointer disabled:bg-slate-100"
                            >
                                {GST_TYPES.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        {/* Party / Business Name */}
                        <div>
                            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                                Party / Business Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                disabled={isReadOnly}
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className={`w-full px-3 py-2 text-xs font-semibold border rounded-lg focus:outline-none focus:ring-1 h-9 placeholder-slate-400 disabled:bg-slate-100 ${
                                    errors.name 
                                        ? "border-rose-400 focus:ring-rose-400 focus:border-rose-400 bg-rose-50/20 text-rose-900" 
                                        : isNameAutofilled 
                                            ? "border-emerald-300 focus:ring-[#16A36A] focus:border-[#16A36A] bg-emerald-50/20 text-slate-900" 
                                            : "border-[#DCE5EA] focus:ring-[#16A36A] focus:border-[#16A36A] bg-slate-50/50 focus:bg-white text-slate-800"
                                }`}
                                placeholder="Enter party or business legal name"
                            />
                            {isNameAutofilled && (
                                <p className="text-[10px] text-[#16A36A] mt-1 font-bold flex items-center gap-1">
                                    <Check className="w-3 h-3 stroke-[3]" /> Auto-filled from GSTIN
                                </p>
                            )}
                            {errors.name && (
                                <p className="text-[10px] font-bold text-rose-600 mt-1">{errors.name}</p>
                            )}
                        </div>

                        {/* Supply State */}
                        <div>
                            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                                Supply State
                            </label>
                            <SearchableStateSelect
                                disabled={isReadOnly}
                                value={form.state}
                                onChange={(val) => setForm({ ...form, state: val })}
                                height="h-9"
                                className={isStateAutofilled ? "border-emerald-300 ring-1 ring-[#16A36A]" : ""}
                            />
                            {isStateAutofilled && (
                                <p className="text-[10px] text-[#16A36A] mt-1 font-bold flex items-center gap-1">
                                    <Check className="w-3 h-3 stroke-[3]" /> Auto-filled from GSTIN
                                </p>
                            )}
                        </div>

                        {/* Mobile Number */}
                        <div>
                            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                                Mobile Number <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                maxLength={10}
                                disabled={isReadOnly}
                                value={form.phoneNumber}
                                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value.replace(/\D/g, "") })}
                                className={`w-full px-3 py-2 text-xs font-semibold border rounded-lg focus:outline-none focus:ring-1 h-9 placeholder-slate-400 disabled:bg-slate-100 ${
                                    errors.phoneNumber ? "border-rose-400 focus:ring-rose-400 focus:border-rose-400 bg-rose-50/20 text-rose-900" : "border-[#DCE5EA] focus:ring-[#16A36A] focus:border-[#16A36A] bg-slate-50/50 focus:bg-white text-slate-800"
                                }`}
                                placeholder="10-digit mobile number"
                            />
                            {errors.phoneNumber && (
                                <p className="text-[10px] font-bold text-rose-600 mt-1">{errors.phoneNumber}</p>
                            )}
                        </div>

                        {/* Email Address */}
                        <div>
                            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                                Email Address (Optional)
                            </label>
                            <input
                                type="email"
                                disabled={isReadOnly}
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="w-full px-3 py-2 text-xs font-semibold border border-[#DCE5EA] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#16A36A] focus:border-[#16A36A] bg-slate-50/50 focus:bg-white h-9 text-slate-800 placeholder-slate-400 disabled:bg-slate-100"
                                placeholder="e.g. party@business.com"
                            />
                        </div>

                        {/* GSTIN Input + Verification (Conditional full row) */}
                        {form.gstType.startsWith("Registered") && (
                            <div className="lg:col-span-3 space-y-2 bg-slate-50/50 border border-slate-200/80 rounded-xl p-4">
                                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                                    GSTIN Identification <span className="text-rose-500">*</span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        maxLength={15}
                                        disabled={isReadOnly}
                                        value={form.gstin}
                                        onChange={handleGstinChange}
                                        className={`flex-1 px-3.5 py-2 text-xs font-mono font-bold uppercase border rounded-lg focus:outline-none focus:ring-1 h-9 placeholder-slate-400 disabled:bg-slate-100 ${
                                            errors.gstin ? "border-rose-400 focus:ring-rose-400 focus:border-rose-400 bg-rose-50/20" : "border-[#DCE5EA] focus:ring-[#16A36A] focus:border-[#16A36A] bg-white text-slate-800"
                                        }`}
                                        placeholder="e.g. 09AAAAA0000A1Z5"
                                    />
                                    <button
                                        type="button"
                                        disabled={gstinLoading || form.gstin.length !== 15 || isReadOnly}
                                        onClick={handleVerifyGstin}
                                        className="px-5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#16A36A] text-xs font-bold rounded-lg transition h-9 shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                                    >
                                        {gstinLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                        {gstinLoading ? "Verifying..." : "Validate GSTIN"}
                                    </button>
                                </div>
                                {errors.gstin && (
                                    <p className="text-[10px] font-bold text-rose-600">{errors.gstin}</p>
                                )}

                                {/* Verification status loaders & result cards */}
                                {gstinLoading && (
                                    <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1.5 animate-pulse shadow-2xs">
                                        <div className="h-3 bg-slate-200 rounded w-1/4" />
                                        <div className="h-3.5 bg-slate-200 rounded w-1/2" />
                                    </div>
                                )}

                                {verifiedGstinDetails && !gstinLoading && (
                                    <div className="bg-emerald-50/40 border border-emerald-200 rounded-lg p-3.5 space-y-2 text-xs text-left animate-in fade-in">
                                        <div className="flex items-center justify-between border-b border-emerald-100 pb-1.5 font-bold text-emerald-950">
                                            <span className="flex items-center gap-1.5 text-xs text-[#16A36A]">
                                                <CheckCircle2 className="w-4 h-4" />
                                                Government GST Registry Match
                                            </span>
                                            <span className="text-[9px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Active</span>
                                        </div>
                                        
                                        <div className="space-y-0.5 font-medium text-slate-700">
                                            <p className="font-bold text-slate-900">{verifiedGstinDetails.tradeName || verifiedGstinDetails.legalName}</p>
                                            <p className="text-[10px] text-slate-500">Taxpayer Type: {verifiedGstinDetails.taxpayerType} | Constitution: {verifiedGstinDetails.constitution}</p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setShowMoreDetails(!showMoreDetails)}
                                            className="text-[#16A36A] hover:text-emerald-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer p-0"
                                        >
                                            {showMoreDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                            {showMoreDetails ? "Hide Registered Address" : "Show Registered Address"}
                                        </button>
                                        
                                        {showMoreDetails && (
                                            <div className="pt-2 text-[10px] border-t border-emerald-100 text-slate-600 leading-relaxed font-semibold">
                                                <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Registered Billing Address</span>
                                                <p className="text-slate-900 mt-0.5">{verifiedGstinDetails.billingAddress || "—"}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {gstinError && !gstinLoading && (
                                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-950 flex items-start gap-2">
                                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-rose-100 text-rose-700 font-bold shrink-0 mt-0.5 text-[10px]">✕</span>
                                        <div>
                                            <h5 className="font-bold text-rose-900">GST Verification Failed</h5>
                                            <p className="text-[10px] text-rose-700 font-medium mt-0.5">{gstinError}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>


                {/* ================= CARD 2: ADDRESS DETAILS ================= */}
                <div className="w-full bg-white border border-[#DCE5EA] rounded-2xl p-6 shadow-2xs space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#16A36A] flex items-center justify-center border border-emerald-100 shadow-2xs">
                                <MapPin className="w-4.5 h-4.5" />
                            </div>
                            <div>
                                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                    Address Details
                                </h2>
                                <p className="text-[11px] text-slate-500 font-medium">Specify billing & shipping addresses</p>
                            </div>
                        </div>

                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                disabled={isReadOnly}
                                checked={shippingSameAsBilling}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    setShippingSameAsBilling(checked);
                                    if (checked) {
                                        setForm(prev => ({ ...prev, shippingAddress: prev.billingAddress }));
                                    }
                                }}
                                className="rounded border-slate-300 text-[#16A36A] focus:ring-[#16A36A] w-3.5 h-3.5 cursor-pointer disabled:opacity-50"
                            />
                            <span className="text-[11px] font-bold text-slate-600">Shipping same as billing</span>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Billing Address */}
                        <div className={shippingSameAsBilling ? "md:col-span-2" : "col-span-1"}>
                            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                                Billing Address
                            </label>
                            <textarea
                                disabled={isReadOnly}
                                value={form.billingAddress}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setForm((prev) => ({
                                        ...prev,
                                        billingAddress: val,
                                        shippingAddress: shippingSameAsBilling ? val : prev.shippingAddress
                                    }));
                                }}
                                rows={3}
                                className={`w-full px-3.5 py-2.5 text-xs font-medium border rounded-lg focus:outline-none focus:ring-1 placeholder-slate-400 disabled:bg-slate-100 resize-none h-24 ${
                                    isAddressAutofilled
                                        ? "border-emerald-300 focus:ring-[#16A36A] focus:border-[#16A36A] bg-emerald-50/20 text-slate-900"
                                        : "border-[#DCE5EA] focus:ring-[#16A36A] focus:border-[#16A36A] bg-slate-50/50 focus:bg-white text-slate-800"
                                }`}
                                placeholder="Enter complete billing street address, city, & pincode"
                            />
                            {isAddressAutofilled && (
                                <p className="text-[10px] text-[#16A36A] mt-1 font-bold flex items-center gap-1">
                                    <Check className="w-3 h-3 stroke-[3]" /> Auto-filled from GSTIN
                                </p>
                            )}
                        </div>

                        {/* Shipping Address */}
                        {!shippingSameAsBilling && (
                            <div className="col-span-1 animate-in fade-in">
                                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                                    Shipping Address
                                </label>
                                <textarea
                                    disabled={isReadOnly}
                                    value={form.shippingAddress}
                                    onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })}
                                    rows={3}
                                    className="w-full px-3.5 py-2.5 text-xs font-medium border border-[#DCE5EA] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#16A36A] focus:border-[#16A36A] bg-slate-50/50 focus:bg-white text-slate-800 placeholder-slate-400 disabled:bg-slate-100 resize-none h-24"
                                    placeholder="Enter complete shipping destination address"
                                />
                            </div>
                        )}
                    </div>
                </div>


                {/* ================= CARD 3: FINANCIAL INFORMATION ================= */}
                <div className="w-full bg-white border border-[#DCE5EA] rounded-2xl p-6 shadow-2xs space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#16A36A] flex items-center justify-center border border-emerald-100 shadow-2xs">
                                <IndianRupee className="w-4.5 h-4.5" />
                            </div>
                            <div>
                                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                    Financial Information
                                </h2>
                                <p className="text-[11px] text-slate-500 font-medium">Opening ledger balances & debit/credit nature</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Opening Balance */}
                        <div>
                            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                                Opening Balance (₹)
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                                    ₹
                                </span>
                                <input
                                    type="number"
                                    min="0"
                                    disabled={isReadOnly}
                                    value={form.openingBalance === "" ? "" : form.openingBalance}
                                    onChange={(e) => setForm({ ...form, openingBalance: e.target.value === "" ? "" : Number(e.target.value) })}
                                    className="w-full pl-8 pr-3.5 py-2 text-xs font-semibold border border-[#DCE5EA] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#16A36A] focus:border-[#16A36A] bg-slate-50/50 focus:bg-white h-9 text-slate-800 placeholder-slate-400 disabled:bg-slate-100"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {/* Balance Nature - Segmented buttons */}
                        <div>
                            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                                Balance Nature
                            </label>
                            <div className="flex h-9 border border-[#DCE5EA] rounded-lg overflow-hidden bg-slate-50/50 p-0.5">
                                <button
                                    type="button"
                                    disabled={isReadOnly}
                                    onClick={() => setForm({ ...form, openingBalanceType: "DEBIT" })}
                                    className={`flex-1 text-xs font-bold transition-all rounded-md flex items-center justify-center gap-1.5 cursor-pointer ${
                                        form.openingBalanceType === "DEBIT"
                                            ? "bg-[#16A36A] text-white shadow-2xs"
                                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-transparent"
                                    }`}
                                >
                                    <CreditCard className="w-3.5 h-3.5" />
                                    DEBIT (Receivable)
                                </button>
                                <button
                                    type="button"
                                    disabled={isReadOnly}
                                    onClick={() => setForm({ ...form, openingBalanceType: "CREDIT" })}
                                    className={`flex-1 text-xs font-bold transition-all rounded-md flex items-center justify-center gap-1.5 cursor-pointer ${
                                        form.openingBalanceType === "CREDIT"
                                            ? "bg-[#16A36A] text-white shadow-2xs"
                                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-transparent"
                                    }`}
                                >
                                    <IndianRupee className="w-3.5 h-3.5" />
                                    CREDIT (Payable)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Extra spacer to ensure smooth scrolling past footer */}
                <div className="h-6" />
            </form>

            {/* 3. STICKY BOTTOM ACTIONS FOOTER (FULL EDGE-TO-EDGE WIDTH) */}
            <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#DCE5EA] px-6 py-3.5 shadow-lg w-full flex items-center justify-between shrink-0">
                <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <ShieldCheck className="w-4.5 h-4.5 text-[#16A36A]" />
                    <span>GST details & taxpayer data verified live with Government Registry API</span>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <button
                        type="button"
                        onClick={() => navigate("/party")}
                        className="px-5 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-2xs transition active:scale-95 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading || isReadOnly}
                        onClick={handleSubmit}
                        className="px-7 py-2 bg-[#16A36A] hover:bg-[#138a59] text-white rounded-lg text-xs font-bold shadow-2xs transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <span>{id ? "Save Changes" : "Save Party"}</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

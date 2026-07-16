import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { fetchParties, addParty, updateParty } from "../store/thunks/partyThunk";
import { clearPartyStatus } from "../store/slices/partySlice";
import { usePermissions } from "../hooks/usePermissions";
import SearchableStateSelect from "../components/SearchableStateSelect";
import { searchGstin } from "../store/thunks/eInvoiceThunk";
import { normalizeGstinData } from "../utils/gstinNormalizer";
import toast from "react-hot-toast";
import {
    ArrowLeft,
    Building,
    Phone,
    Mail,
    MapPin,
    IndianRupee,
    CreditCard,
    Check,
    Loader2,
    Info,
    FileText,
    FileSpreadsheet,
    Package,
    RefreshCw
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
            toast.success(id ? "Party updated successfully!" : "Party added successfully!");
            dispatch(clearPartyStatus());
            navigate("/party");
        }
    }, [success, dispatch, id, navigate]);

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
        <div className="min-h-screen bg-white pb-36 text-gray-900 font-sans">
            {/* 1. TOP TOOLBAR */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate("/party")}
                            className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-950 transition active:scale-95 flex items-center justify-center"
                            title="Back to Party Directory"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="h-6 w-px bg-gray-200" />
                        <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">
                            {id ? "Edit Party Profile" : "Register New Party"}
                        </h1>
                    </div>
                </div>
            </div>

            {/* Read-Only Warning Banner */}
            {isReadOnly && (
                <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 mt-4">
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3.5 rounded-lg flex items-center gap-2.5 text-xs font-semibold shadow-xs">
                        <Info className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                        <span>You are in <strong>Read-Only Mode</strong>. You can view the details but cannot update party profiles.</span>
                    </div>
                </div>
            )}

            {/* 2. FORM BODY CONTROLLER */}
            <form onSubmit={handleSubmit} className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] lg:grid-cols-[180px_1fr_180px_1fr] items-start gap-x-8 gap-y-4">
                    
                    {/* ================= SECTION 1: BUSINESS INFORMATION ================= */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-4 pb-2 border-b border-gray-200">
                        <h2 className="text-[16px] font-bold text-brand-700 tracking-wider uppercase">Business Information</h2>
                    </div>

                    {/* Partner Role */}
                    <label className="text-[13px] font-bold text-gray-700 uppercase tracking-wide md:pt-3">
                        Partner Role <span className="text-red-500">*</span>
                    </label>
                    <div className="col-span-1 md:col-span-1 lg:col-span-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                                { id: "SUPPLIER", label: "Supplier", icon: <Package className="w-5 h-5 shrink-0" />, desc: "Buy crops/supplies from this party" },
                                { id: "BUYER", label: "Buyer", icon: <Building className="w-5 h-5 shrink-0" />, desc: "Sell crops/supplies to this party" },
                                { id: "BOTH", label: "Both Roles", icon: <RefreshCw className="w-5 h-5 shrink-0" />, desc: "Act as both supplier & buyer" },
                            ].map((role) => {
                                const isSelected = form.partyType === role.id;
                                return (
                                    <button
                                        key={role.id}
                                        type="button"
                                        disabled={isReadOnly}
                                        onClick={() => setForm({ ...form, partyType: role.id })}
                                        className={`flex items-start gap-3 p-4 rounded-xl border text-left transition select-none cursor-pointer ${
                                            isSelected
                                                ? "border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600 text-emerald-950"
                                                : "border-gray-200 hover:bg-gray-50 text-gray-700"
                                        } disabled:opacity-50`}
                                    >
                                        <div className={`p-2 rounded-lg transition ${
                                            isSelected ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                                        }`}>
                                            {role.icon}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider">{role.label}</p>
                                            <p className="text-[10px] text-gray-405 mt-0.5 leading-normal">{role.desc}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        {errors.partyType && (
                            <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.partyType}</p>
                        )}
                    </div>

                    {/* GST Type */}
                    <label className="text-[13px] font-bold text-gray-700 uppercase tracking-wide md:pt-3">
                        GST Type
                    </label>
                    <div>
                        <select
                            disabled={isReadOnly}
                            value={form.gstType}
                            onChange={handleGstTypeChange}
                            className="w-full px-3 text-[14px] font-semibold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600/10 focus:border-brand-600 bg-white cursor-pointer h-11 disabled:bg-slate-50 disabled:text-gray-400 shadow-xs"
                        >
                            {GST_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    {/* Party / Business Name */}
                    <label className="text-[13px] font-bold text-gray-700 uppercase tracking-wide md:pt-3">
                        Party Name <span className="text-red-500">*</span>
                    </label>
                    <div>
                        <input
                            type="text"
                            disabled={isReadOnly}
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className={`w-full px-3 text-[14px] font-semibold border rounded-lg focus:outline-none focus:ring-2 bg-white h-11 placeholder-gray-400 disabled:bg-slate-50 shadow-xs ${
                                errors.name 
                                    ? "border-red-400 focus:ring-red-500/10 focus:border-red-400" 
                                    : isNameAutofilled 
                                        ? "border-emerald-300 focus:ring-emerald-500/10 focus:border-emerald-300 bg-emerald-50/5 text-emerald-950" 
                                        : "border-gray-200 focus:ring-brand-600/10 focus:border-brand-600"
                            }`}
                            placeholder="Enter party or business name"
                        />
                        {isNameAutofilled && (
                            <p className="text-[10px] text-emerald-600 mt-1 font-bold flex items-center gap-1">
                                <Check className="w-3 h-3 stroke-[3]" /> Auto-filled from GSTIN
                            </p>
                        )}
                        {errors.name && (
                            <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.name}</p>
                        )}
                    </div>

                    {/* GSTIN (Conditional row) */}
                    {form.gstType.startsWith("Registered") ? (
                        <>
                            <label className="text-[13px] font-bold text-gray-700 uppercase tracking-wide md:pt-3">
                                GSTIN <span className="text-red-500">*</span>
                            </label>
                            <div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        maxLength={15}
                                        disabled={isReadOnly}
                                        value={form.gstin}
                                        onChange={handleGstinChange}
                                        className={`flex-1 px-3 text-[14px] font-semibold border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600/10 focus:border-brand-600 bg-white h-11 uppercase placeholder-gray-400 disabled:bg-slate-50 shadow-xs ${
                                            errors.gstin ? "border-red-400 focus:ring-red-500/10 focus:border-red-400" : "border-gray-200"
                                        }`}
                                        placeholder="22AAAAA0000A1Z5"
                                    />
                                    <button
                                        type="button"
                                        disabled={gstinLoading || form.gstin.length !== 15 || isReadOnly}
                                        onClick={handleVerifyGstin}
                                        className="px-5 bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 text-xs font-bold rounded-lg transition h-11 shrink-0 flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                                    >
                                        {gstinLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                        {gstinLoading ? "Verifying" : "Validate"}
                                    </button>
                                </div>
                                {errors.gstin && (
                                    <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.gstin}</p>
                                )}

                                {/* Verification loader skeleton */}
                                {gstinLoading && (
                                    <div className="mt-2 bg-slate-50 border border-gray-150 rounded-lg p-4 space-y-2 animate-pulse shadow-xs">
                                        <div className="h-3.5 bg-gray-200 rounded w-1/3" />
                                        <div className="h-4 bg-gray-200 rounded w-2/3" />
                                    </div>
                                )}

                                {/* Success Verification Info Panel */}
                                {verifiedGstinDetails && !gstinLoading && (
                                    <div className="mt-2 bg-emerald-50/20 border border-emerald-200 rounded-lg p-4 space-y-2 animate-fade-in text-xs shadow-xs text-left">
                                        <div className="flex items-center justify-between border-b border-emerald-100 pb-1.5 font-semibold text-emerald-950">
                                            <span className="flex items-center gap-1">
                                                <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
                                                Government GST Registry Match
                                            </span>
                                            <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">Active</span>
                                        </div>
                                        
                                        <div className="space-y-1 font-medium text-gray-700">
                                            <p className="font-bold text-gray-900">{verifiedGstinDetails.tradeName || verifiedGstinDetails.legalName}</p>
                                            <p className="text-[10px] text-gray-500">Taxpayer Type: {verifiedGstinDetails.taxpayerType} | Constitution: {verifiedGstinDetails.constitution}</p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setShowMoreDetails(!showMoreDetails)}
                                            className="text-emerald-700 hover:text-emerald-800 text-[10px] font-bold flex items-center gap-1 focus:outline-none bg-transparent border-0 cursor-pointer p-0"
                                        >
                                            {showMoreDetails ? "▲ Hide GST Details" : "▼ Show GST Registry Address"}
                                        </button>
                                        
                                        {showMoreDetails && (
                                            <div className="pt-2 text-[10px] border-t border-emerald-100/50 animate-fade-in text-gray-600 leading-relaxed font-semibold">
                                                <span className="text-gray-400 block text-[9px] uppercase tracking-wider font-bold">Registered Billing Address</span>
                                                <p className="text-gray-900 mt-0.5">{verifiedGstinDetails.billingAddress || "—"}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Error Panel */}
                                {gstinError && !gstinLoading && (
                                    <div className="mt-2 bg-rose-50/20 border border-rose-200 rounded-lg p-3 text-xs text-rose-950 animate-fade-in flex items-start gap-2 shadow-xs">
                                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-rose-100 text-rose-700 font-bold shrink-0 mt-0.5">✕</span>
                                        <div>
                                            <h5 className="font-bold text-rose-900">Verification Failed</h5>
                                            <p className="text-[10px] text-rose-800 leading-relaxed font-semibold mt-0.5">{gstinError}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        // Keep layout perfectly aligned by reserving cells on desktop
                        <>
                            <div className="hidden lg:block" />
                            <div className="hidden lg:block" />
                        </>
                    )}

                    {/* State */}
                    <label className="text-[13px] font-bold text-gray-700 uppercase tracking-wide md:pt-3">
                        State
                    </label>
                    <div>
                        <SearchableStateSelect
                            disabled={isReadOnly}
                            value={form.state}
                            onChange={(val) => setForm({ ...form, state: val })}
                            height="h-11"
                            className={isStateAutofilled ? "border-emerald-300 ring-2 ring-emerald-500/10" : ""}
                        />
                        {isStateAutofilled && (
                            <p className="text-[10px] text-emerald-600 mt-1 font-bold flex items-center gap-1">
                                <Check className="w-3 h-3 stroke-[3]" /> Auto-filled from GSTIN
                            </p>
                        )}
                    </div>

                    {/* Mobile Number */}
                    <label className="text-[13px] font-bold text-gray-700 uppercase tracking-wide md:pt-3">
                        Mobile <span className="text-red-500">*</span>
                    </label>
                    <div>
                        <input
                            type="text"
                            maxLength={10}
                            disabled={isReadOnly}
                            value={form.phoneNumber}
                            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value.replace(/\D/g, "") })}
                            className={`w-full px-3 text-[14px] font-semibold border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600/10 focus:border-brand-600 bg-white h-11 placeholder-gray-400 disabled:bg-slate-50 shadow-xs ${
                                errors.phoneNumber ? "border-red-400 focus:ring-red-500/10 focus:border-red-400" : "border-gray-200"
                            }`}
                            placeholder="Enter 10-digit mobile number"
                        />
                        {errors.phoneNumber && (
                            <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.phoneNumber}</p>
                        )}
                    </div>

                    {/* Email Address */}
                    <label className="text-[13px] font-bold text-gray-700 uppercase tracking-wide md:pt-3">
                        Email
                    </label>
                    <div>
                        <input
                            type="email"
                            disabled={isReadOnly}
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className="w-full px-3 text-[14px] font-semibold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600/10 focus:border-brand-600 bg-white h-11 placeholder-gray-400 disabled:bg-slate-50 shadow-xs"
                            placeholder="Enter email address"
                        />
                    </div>

                    
                    {/* ================= SECTION 2: ADDRESS DETAILS ================= */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-8 pb-2 border-b border-gray-200">
                        <h2 className="text-[16px] font-bold text-brand-700 tracking-wider uppercase">Address Details</h2>
                    </div>

                    {/* Checkbox same as billing */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-4 flex items-center justify-end py-1">
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer select-none">
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
                                className="rounded border-gray-300 text-brand-600 focus:ring-brand-600 w-4 h-4 cursor-pointer disabled:opacity-50"
                            />
                            <span>Shipping Address is same as Billing Address</span>
                        </label>
                    </div>

                    {/* Billing Address */}
                    <label className="text-[13px] font-bold text-gray-700 uppercase tracking-wide pt-3">
                        Billing Address
                    </label>
                    <div className={shippingSameAsBilling ? "col-span-1 md:col-span-2 lg:col-span-3" : "col-span-1"}>
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
                            rows={2}
                            className={`w-full px-3 py-2.5 text-[14px] font-semibold border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600/10 focus:border-brand-600 bg-white placeholder-gray-400 disabled:bg-slate-50 resize-none h-20 shadow-xs ${
                                isAddressAutofilled
                                    ? "border-emerald-300 focus:ring-emerald-500/10 focus:border-emerald-300 bg-emerald-50/5 text-emerald-950"
                                    : "border-gray-200"
                            }`}
                            placeholder="Enter complete billing address details"
                        />
                        {isAddressAutofilled && (
                            <p className="text-[10px] text-emerald-600 mt-1 font-bold flex items-center gap-1">
                                <Check className="w-3 h-3 stroke-[3]" /> Auto-filled from GSTIN
                            </p>
                        )}
                    </div>

                    {/* Shipping Address (conditional) */}
                    {!shippingSameAsBilling && (
                        <>
                            <label className="text-[13px] font-bold text-gray-700 uppercase tracking-wide pt-3 animate-fade-in">
                                Shipping Address
                            </label>
                            <div className="col-span-1 animate-fade-in">
                                <textarea
                                    disabled={isReadOnly}
                                    value={form.shippingAddress}
                                    onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })}
                                    rows={2}
                                    className="w-full px-3 py-2.5 text-[14px] font-semibold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600/10 focus:border-brand-600 bg-white placeholder-gray-400 disabled:bg-slate-50 resize-none h-20 shadow-xs"
                                    placeholder="Enter complete shipping address details"
                                />
                            </div>
                        </>
                    )}


                    {/* ================= SECTION 3: FINANCIAL DETAILS ================= */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-8 pb-2 border-b border-gray-200">
                        <h2 className="text-[16px] font-bold text-brand-700 tracking-wider uppercase">Financial Information</h2>
                    </div>

                    {/* Opening Balance */}
                    <label className="text-[13px] font-bold text-gray-700 uppercase tracking-wide md:pt-3">
                        Opening Balance
                    </label>
                    <div>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 font-semibold text-sm">
                                ₹
                            </span>
                            <input
                                type="number"
                                min="0"
                                disabled={isReadOnly}
                                value={form.openingBalance === "" ? "" : form.openingBalance}
                                onChange={(e) => setForm({ ...form, openingBalance: e.target.value === "" ? "" : Number(e.target.value) })}
                                className="w-full pl-8 pr-3 py-2 text-[14px] font-semibold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600/10 focus:border-brand-600 bg-white h-11 placeholder-gray-400 disabled:bg-slate-50 shadow-xs"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Balance Nature - Segmented buttons */}
                    <label className="text-[13px] font-bold text-gray-700 uppercase tracking-wide md:pt-3">
                        Balance Nature
                    </label>
                    <div>
                        <div className="flex h-11 border border-gray-200 rounded-lg overflow-hidden bg-gray-50/50 p-1 shadow-xs">
                            <button
                                type="button"
                                disabled={isReadOnly}
                                onClick={() => setForm({ ...form, openingBalanceType: "DEBIT" })}
                                className={`flex-1 text-xs font-bold transition-all rounded-md flex items-center justify-center gap-1.5 ${
                                    form.openingBalanceType === "DEBIT"
                                        ? "bg-brand-600 text-white shadow-sm"
                                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 bg-transparent"
                                }`}
                            >
                                <CreditCard className="w-3.5 h-3.5" />
                                DEBIT (Receivable)
                            </button>
                            <button
                                type="button"
                                disabled={isReadOnly}
                                onClick={() => setForm({ ...form, openingBalanceType: "CREDIT" })}
                                className={`flex-1 text-xs font-bold transition-all rounded-md flex items-center justify-center gap-1.5 ${
                                    form.openingBalanceType === "CREDIT"
                                        ? "bg-brand-600 text-white shadow-sm"
                                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 bg-transparent"
                                }`}
                            >
                                <IndianRupee className="w-3.5 h-3.5" />
                                CREDIT (Payable)
                            </button>
                        </div>
                    </div>
                </div>

                {/* 3. STICKY BOTTOM ACTIONS FOOTER */}
                <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 py-4 shadow-lg">
                    <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between">
                        <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 font-semibold">
                            <span className="text-emerald-600 text-sm">🛡</span>
                            <span>GST data is securely verified through the official GST API services.</span>
                        </div>
                        
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                            <button
                                type="button"
                                onClick={() => navigate("/party")}
                                className="px-6 py-2.5 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-lg text-sm font-semibold shadow-xs transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || isReadOnly}
                                className="px-8 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-bold shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {id ? "Save Changes" : "Save Party"}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

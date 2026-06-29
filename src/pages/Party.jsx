import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchParties, addParty, updateParty, deleteParty } from "../store/thunks/partyThunk";
import { clearPartyStatus } from "../store/slices/partySlice";
import { usePermissions } from "../hooks/usePermissions";
import {
    Users,
    Plus,
    Search,
    Pencil,
    Trash2,
    X,
    CreditCard,
    IndianRupee,
    FileSpreadsheet,
    Building,
    Info,
    Mail,
    Phone,
    MapPin,
    Copy,
    FileText,
    RefreshCw
} from "lucide-react";
import toast from "react-hot-toast";
import SearchableStateSelect from "../components/SearchableStateSelect";

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

export default function Party() {
    const dispatch = useDispatch();
    const { parties, loading, error, success } = useSelector((s) => s.party);
    const { isReadOnly } = usePermissions();

    // Search & Filter State
    const [searchTerm, setSearchTerm] = useState("");
    const [filterGstType, setFilterGstType] = useState("");

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState(null); // null means adding a new party
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    // Form State
    const [form, setForm] = useState({
        name: "",
        phoneNumber: "",
        gstin: "",
        gstType: "Unregistered/Consumer",
        state: "",
        email: "",
        billingAddress: "",
        shippingAddress: "",
        openingBalance: "",
        openingBalanceType: "CREDIT",
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        dispatch(fetchParties());
    }, [dispatch]);

    // Handle operation success messages
    useEffect(() => {
        if (success) {
            toast.success(editId ? "Party updated successfully!" : "Party added successfully!");
            closeModal();
            dispatch(clearPartyStatus());
            dispatch(fetchParties());
        }
    }, [success, dispatch]);

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearPartyStatus());
        }
    }, [error, dispatch]);

    // Validate form details
    const validateForm = () => {
        const tempErrors = {};
        if (!form.name.trim()) tempErrors.name = "Party Name is required";

        if (form.phoneNumber && !/^\d{10}$/.test(form.phoneNumber)) {
            tempErrors.phoneNumber = "Phone number must be exactly 10 digits";
        }

        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            tempErrors.email = "Please enter a valid email address";
        }

        // GSTIN required if registered
        if (form.gstType.startsWith("Registered")) {
            if (!form.gstin) {
                tempErrors.gstin = "GSTIN is required for registered parties";
            } else if (form.gstin.length !== 15) {
                tempErrors.gstin = "GSTIN must be exactly 15 alphanumeric characters";
            }
        }

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const openAddModal = () => {
        setEditId(null);
        setForm({
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
        });
        setErrors({});
        setModalOpen(true);
    };

    const openEditModal = (party) => {
        setEditId(party._id);
        setForm({
            name: party.name || "",
            phoneNumber: party.phoneNumber || "",
            gstin: party.gstin || "",
            gstType: party.gstType || "Unregistered/Consumer",
            state: party.state || "Uttar Pradesh",
            email: party.email || "",
            billingAddress: party.billingAddress || "",
            shippingAddress: party.shippingAddress || "",
            openingBalance: party.openingBalance,
            openingBalanceType: party.openingBalanceType || "CREDIT",
        });
        setErrors({});
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditId(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        const payload = { ...form };
        // Clear GSTIN if unregistered/consumer
        if (!payload.gstType.startsWith("Registered")) {
            payload.gstin = "";
        }

        if (editId) {
            dispatch(updateParty({ id: editId, data: payload }));
        } else {
            dispatch(addParty(payload));
        }
    };

    const handleDelete = async (id) => {
        const result = await dispatch(deleteParty(id));
        if (deleteParty.fulfilled.match(result)) {
            toast.success("Party deleted successfully");
        } else {
            toast.error(result.payload || "Delete failed");
        }
        setConfirmDeleteId(null);
    };

    // Filter parties based on search terms
    const filteredParties = parties.filter((p) => {
        const matchesSearch =
            p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.phoneNumber?.includes(searchTerm) ||
            p.gstin?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesGst = filterGstType ? p.gstType === filterGstType : true;

        return matchesSearch && matchesGst;
    });

    // Calculate summary metrics
    const totals = {
        total: parties.length,
        registered: parties.filter(p => p.gstType?.startsWith("Registered")).length,
        receivable: parties
            .filter(p => p.openingBalanceType === "DEBIT")
            .reduce((sum, p) => sum + Number(p.openingBalance || 0), 0),
        payable: parties
            .filter(p => p.openingBalanceType === "CREDIT")
            .reduce((sum, p) => sum + Number(p.openingBalance || 0), 0),
    };

    // 0. Render Global Spinner
    if (loading && parties.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {parties.length === 0 ? (
                /* ================= EMPTY STATE CONTAINER ================= */
                <div className="flex flex-col items-center justify-center min-h-[70vh] bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
                    <h2 className="text-xl font-bold text-gray-800">Party Details</h2>
                    <p className="text-sm text-gray-500 max-w-md mt-2 leading-relaxed">
                        Add your customers and suppliers to manage your business easily.<br />
                        Track payments and grow your business without any hassle!
                    </p>

                    <div className="relative my-8 select-none">
                        {/* SVG Illustration matching the screenshot layout */}
                        <svg width="420" height="260" viewBox="0 0 420 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
                            {/* Shadow ellipse */}
                            <ellipse cx="210" cy="225" rx="140" ry="10" fill="#F1F5F9" />

                            {/* Mock dashboard window in background */}
                            <rect x="70" y="35" width="220" height="150" rx="10" fill="#FFFFFF" stroke="#475569" strokeWidth="2.5" />
                            <path d="M70,60 L290,60" stroke="#475569" strokeWidth="2.5" />
                            <circle cx="85" cy="48" r="4" fill="#EF4444" />
                            <circle cx="97" cy="48" r="4" fill="#FBBF24" />
                            <circle cx="109" cy="48" r="4" fill="#34D399" />

                            {/* Mock fields */}
                            <rect x="85" y="75" width="70" height="16" rx="4" fill="#FBBF24" />
                            <rect x="165" y="75" width="60" height="16" rx="4" fill="#E2E8F0" />

                            {/* Rows */}
                            <circle cx="97" cy="115" r="9" fill="#FBBF24" opacity="0.3" />
                            <circle cx="97" cy="115" r="5" fill="#FBBF24" />
                            <rect x="115" y="110" width="140" height="10" rx="3" fill="#FBBF24" opacity="0.25" />

                            <circle cx="97" cy="145" r="9" fill="#FBBF24" opacity="0.3" />
                            <circle cx="97" cy="145" r="5" fill="#FBBF24" />
                            <rect x="115" y="140" width="140" height="10" rx="3" fill="#FBBF24" opacity="0.25" />

                            {/* Yellow border badge around character */}
                            <circle cx="240" cy="120" r="48" fill="#FFFFFF" stroke="#FBBF24" strokeWidth="4" />

                            {/* Clip path to crop character to circle */}
                            <defs>
                                <clipPath id="avatar-clip">
                                    <circle cx="240" cy="120" r="46" />
                                </clipPath>
                            </defs>

                            {/* Character */}
                            <g clipPath="url(#avatar-clip)">
                                {/* Yellow shirt */}
                                <path d="M210,165 C210,138 270,138 270,165 Z" fill="#FBBF24" />
                                <rect x="236" y="138" width="8" height="18" fill="#F59E0B" />
                                {/* Collar details */}
                                <path d="M232,138 L240,146 L248,138" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />

                                {/* Neck */}
                                <rect x="236" y="126" width="8" height="12" fill="#FED7AA" />

                                {/* Head */}
                                <circle cx="240" cy="116" r="14" fill="#FED7AA" />

                                {/* Hair */}
                                <path d="M224,112 C224,102 256,102 256,112 C256,107 224,107 224,112 Z" fill="#1E293B" />
                                <path d="M223,114 C223,105 257,105 257,114 Z" fill="#1E293B" />

                                {/* Eyes & smile */}
                                <circle cx="235" cy="115" r="1.5" fill="#1E293B" />
                                <circle cx="245" cy="115" r="1.5" fill="#1E293B" />
                                <path d="M236,122 Q240,126 244,122" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" fill="none" />

                                {/* Arm waving */}
                                <path d="M216,145 C216,130 226,116 230,120 C234,124 224,138 224,145 Z" fill="#FED7AA" />
                            </g>

                            {/* Overlapping Plus icon badge */}
                            <circle cx="225" cy="155" r="18" fill="#475569" stroke="#FFFFFF" strokeWidth="3" />
                            <path d="M218,155 L232,155 M225,148 L225,162" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                    </div>

                    {!isReadOnly ? (
                        <button
                            onClick={openAddModal}
                            className="flex items-center gap-2 px-6 py-3 bg-[#e93a54] hover:bg-[#d62f49] text-white rounded-full text-sm font-semibold transition shadow-md active:scale-95 mt-2"
                        >
                            <Plus className="w-4.5 h-4.5" />
                            Add Your First Party
                        </button>
                    ) : (
                        <p className="text-xs text-gray-400 italic">No parties are currently registered (Read-Only access)</p>
                    )}
                </div>
            ) : (
                /* ================= REGULAR TABLE LAYOUT ================= */
                <>
                    {/* 1. Header Area */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-950">Party Directory</h1>
                            <p className="text-sm text-gray-500">Manage customers, distributors, suppliers, and business accounts</p>
                        </div>
                        {!isReadOnly && (
                            <button
                                onClick={openAddModal}
                                className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
                            >
                                <Plus className="w-4.5 h-4.5" />
                                Add Party
                            </button>
                        )}
                    </div>

                    {/* 2. Stat summary cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: "Total Parties", val: totals.total, icon: Users, bg: "bg-blue-50 text-blue-700" },
                            { label: "GST Registered", val: totals.registered, icon: Building, bg: "bg-purple-50 text-purple-700" },
                            { label: "Total Payable (Credit)", val: `₹${totals.payable.toLocaleString("en-IN")}`, icon: IndianRupee, bg: "bg-amber-50 text-amber-700" },
                            { label: "Total Receivable (Debit)", val: `₹${totals.receivable.toLocaleString("en-IN")}`, icon: CreditCard, bg: "bg-emerald-50 text-emerald-700" },
                        ].map((item, idx) => (
                            <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.bg}`}>
                                    <item.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">{item.label}</p>
                                    <h3 className="text-xl font-bold text-gray-900 mt-0.5">{loading ? "..." : item.val}</h3>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 3. Controls & Filter Bar */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by Party Name, Phone or GSTIN..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder-gray-400"
                            />
                        </div>
                        <div className="w-full md:w-56">
                            <select
                                value={filterGstType}
                                onChange={(e) => setFilterGstType(e.target.value)}
                                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
                            >
                                <option value="">All GST Types</option>
                                {GST_TYPES.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 4. Parties Data Table */}
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-600 uppercase font-semibold">
                                    <tr>
                                        <th className="px-6 py-4">Party Details</th>
                                        <th className="px-6 py-4">GST Info</th>
                                        <th className="px-6 py-4">State & Location</th>
                                        <th className="px-6 py-4">Balance</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading && filteredParties.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-2" />
                                                Loading parties...
                                            </td>
                                        </tr>
                                    ) : filteredParties.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-16 text-center text-gray-400">
                                                <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                                                <p className="font-medium">No parties found</p>
                                                <p className="text-xs text-gray-400 mt-1">Try refining your search query or add a new business partner.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredParties.map((party) => (
                                            <tr key={party._id} className="hover:bg-gray-50 transition">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-bold text-gray-900">{party.name}</p>
                                                        <p className="text-xs text-gray-500 mt-0.5">{party.phoneNumber || "No Phone"}</p>
                                                        {party.email && <p className="text-xs text-brand-600 mt-0.5">{party.email}</p>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${party.gstType?.startsWith("Registered")
                                                            ? "bg-purple-50 text-purple-700 border border-purple-100"
                                                            : "bg-gray-100 text-gray-600"
                                                            }`}>
                                                            {party.gstType || "Unregistered/Consumer"}
                                                        </span>
                                                        {party.gstin && (
                                                            <p className="text-xs font-mono text-gray-500 mt-1.5 uppercase tracking-wider">{party.gstin}</p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-800">{party.state || "—"}</p>
                                                        <p className="text-xs text-gray-400 truncate max-w-xs mt-0.5" title={party.billingAddress}>
                                                            {party.billingAddress || "No billing address"}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-semibold text-gray-950">₹{(party.openingBalance || 0).toLocaleString("en-IN")}</p>
                                                        <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 ${party.openingBalanceType === "CREDIT"
                                                            ? "bg-amber-100 text-amber-800"
                                                            : "bg-emerald-100 text-emerald-800"
                                                            }`}>
                                                            {party.openingBalanceType || "CREDIT"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {!isReadOnly && (
                                                            <>
                                                                <button
                                                                    onClick={() => openEditModal(party)}
                                                                    className="p-2 text-gray-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition"
                                                                    title="Edit Party"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => setConfirmDeleteId(party._id)}
                                                                    className="p-2 text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                                                    title="Delete Party"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                        {isReadOnly && (
                                                            <span className="text-xs text-gray-400 italic">View Only</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* 5. Add / Edit Modal Drawer */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white">
                            <h2 className="text-lg font-bold text-gray-900">
                                {editId ? "Edit Party Profile" : "Register New Party"}
                            </h2>
                            <button onClick={closeModal} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body / Form */}
                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 bg-gray-50/30 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

                            {/* 1. Basic Information Section */}
                            <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs space-y-4">
                                <div className="flex items-center gap-2 mb-2 border-l-4 border-brand-600 pl-2">
                                    <h3 className="font-bold text-gray-800 text-sm">Basic Information</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Party / Business Name */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">
                                            Party / Business Name <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                                <Building className="w-4 h-4" />
                                            </span>
                                            <input
                                                type="text"
                                                value={form.name}
                                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                                className={`w-full pl-10 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white ${errors.name ? "border-red-400 focus:ring-red-400" : "border-gray-200"
                                                    }`}
                                                placeholder="Mahadev Traders"
                                            />
                                        </div>
                                        {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>}
                                    </div>

                                    {/* State */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">State</label>
                                        <SearchableStateSelect
                                            value={form.state}
                                            onChange={(val) => setForm({ ...form, state: val })}
                                            height="h-[38px]"
                                        />
                                    </div>

                                    {/* Mobile Number */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Mobile Number</label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                                <Phone className="w-4 h-4" />
                                            </span>
                                            <input
                                                type="text"
                                                maxLength={10}
                                                value={form.phoneNumber}
                                                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value.replace(/\D/g, "") })}
                                                className={`w-full pl-10 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white ${errors.phoneNumber ? "border-red-400 focus:ring-red-400" : "border-gray-200"
                                                    }`}
                                                placeholder="9876543210"
                                            />
                                        </div>
                                        {errors.phoneNumber && <p className="text-[11px] text-red-500 mt-1">{errors.phoneNumber}</p>}
                                    </div>

                                    {/* Email Address */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Email Address</label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                                <Mail className="w-4 h-4" />
                                            </span>
                                            <input
                                                type="email"
                                                value={form.email}
                                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                                className={`w-full pl-10 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white ${errors.email ? "border-red-400 focus:ring-red-400" : "border-gray-200"
                                                    }`}
                                                placeholder="mahadevtraders@example.com"
                                            />
                                        </div>
                                        {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* 2. GST & Financial Details Section */}
                            <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs space-y-4">
                                <div className="flex items-center gap-2 mb-2 border-l-4 border-brand-600 pl-2">
                                    <h3 className="font-bold text-gray-800 text-sm">GST & Financial Details</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* GST Type */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">GST Type</label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                                <FileSpreadsheet className="w-4 h-4" />
                                            </span>
                                            <select
                                                value={form.gstType}
                                                onChange={(e) => setForm({ ...form, gstType: e.target.value })}
                                                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white appearance-none cursor-pointer"
                                            >
                                                {GST_TYPES.map((t) => (
                                                    <option key={t} value={t}>{t}</option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* GSTIN (Linked with GST Type condition) */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">
                                            GSTIN {form.gstType.startsWith("Registered") && <span className="text-red-500">*</span>}
                                        </label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                                <FileText className="w-4 h-4" />
                                            </span>
                                            <input
                                                type="text"
                                                maxLength={15}
                                                disabled={!form.gstType.startsWith("Registered")}
                                                value={form.gstType.startsWith("Registered") ? form.gstin : ""}
                                                onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                                                className={`w-full pl-10 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 ${!form.gstType.startsWith("Registered")
                                                    ? "bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200"
                                                    : errors.gstin
                                                        ? "border-red-400 focus:ring-red-400 bg-white"
                                                        : "border-gray-200 bg-white"
                                                    }`}
                                                placeholder={form.gstType.startsWith("Registered") ? "22AAAAA0000A1Z5" : "Not Applicable"}
                                            />
                                        </div>
                                        {errors.gstin && form.gstType.startsWith("Registered") && (
                                            <p className="text-[11px] text-red-500 mt-1">{errors.gstin}</p>
                                        )}
                                    </div>

                                    {/* Opening Balance */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Opening Balance (₹)</label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 font-semibold text-sm">
                                                ₹
                                            </span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={form.openingBalance === "" ? "" : form.openingBalance}
                                                onChange={(e) => setForm({ ...form, openingBalance: e.target.value === "" ? "" : Number(e.target.value) })}
                                                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                                                placeholder="15,000"
                                            />
                                        </div>
                                    </div>

                                    {/* Balance Type */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Balance Type</label>
                                        <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50/50 w-full h-[38px] items-center">
                                            <button
                                                type="button"
                                                onClick={() => setForm({ ...form, openingBalanceType: "CREDIT" })}
                                                className={`flex-1 h-full rounded-md text-xs font-semibold transition-all ${form.openingBalanceType === "CREDIT"
                                                    ? "bg-brand-600 text-white shadow-sm"
                                                    : "text-gray-500 hover:text-gray-750 hover:bg-white/50"
                                                    }`}
                                            >
                                                CREDIT (Payable)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setForm({ ...form, openingBalanceType: "DEBIT" })}
                                                className={`flex-1 h-full rounded-md text-xs font-semibold transition-all ${form.openingBalanceType === "DEBIT"
                                                    ? "bg-brand-600 text-white shadow-sm"
                                                    : "text-gray-500 hover:text-gray-750 hover:bg-white/50"
                                                    }`}
                                            >
                                                DEBIT (Receivable)
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Address Details Section */}
                            <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs space-y-4">
                                <div className="flex items-center justify-between border-l-4 border-brand-600 pl-2">
                                    <h3 className="font-bold text-gray-800 text-sm">Address Details</h3>
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, shippingAddress: form.billingAddress })}
                                        className="text-xs text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1 font-semibold"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                        Copy Billing Address
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Billing Address */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Billing Address</label>
                                        <div className="relative">
                                            <span className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none text-gray-400">
                                                <MapPin className="w-4 h-4" />
                                            </span>
                                            <textarea
                                                value={form.billingAddress}
                                                onChange={(e) => setForm({ ...form, billingAddress: e.target.value })}
                                                rows={3}
                                                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                                                placeholder="Main Road, Deoria"
                                            />
                                        </div>
                                    </div>

                                    {/* Shipping Address */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Shipping Address</label>
                                        <div className="relative">
                                            <span className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none text-gray-400">
                                                <MapPin className="w-4 h-4" />
                                            </span>
                                            <textarea
                                                value={form.shippingAddress}
                                                onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })}
                                                rows={3}
                                                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                                                placeholder="Main Road, Deoria"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer Controls */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-150 bg-white">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-5 py-2.5 text-sm font-semibold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg transition"
                                >
                                    {loading ? "Saving..." : editId ? "Save Changes" : "Register Party"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 6. Delete Confirmation Dialogue */}
            {confirmDeleteId && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center space-y-4">
                        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                            <Trash2 className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-gray-950">Remove Party?</h3>
                            <p className="text-xs text-gray-500 mt-1">This will soft-delete the party records. Historical transactions are preserved.</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(confirmDeleteId)}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

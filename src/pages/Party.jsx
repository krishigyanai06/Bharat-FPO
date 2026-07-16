import { useEffect, useState, lazy, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchParties, deleteParty } from "../store/thunks/partyThunk";
import { clearPartyStatus } from "../store/slices/partySlice";
import { fetchMembers } from "../store/thunks/membersThunk";
import { usePermissions } from "../hooks/usePermissions";
import ErrorState from "../components/ErrorState";
import AddMemberButton from "../components/AddMemberButton";
import MemberFilters from "../components/members/MemberFilters";
import MemberTable from "../components/members/MemberTable";
import MemberDetailsDrawer from "../components/members/MemberDetailsDrawer";
import {
    Users,
    Plus,
    Search,
    Pencil,
    Trash2,
    CreditCard,
    IndianRupee,
    Building,
    RefreshCw,
    Tractor,
    Briefcase
} from "lucide-react";
import toast from "react-hot-toast";

const FarmModal = lazy(() => import("../components/FarmModal"));

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

const getInitials = (name) => {
    if (!name) return "P";
    const clean = name.trim().replace(/[^a-zA-Z0-9\s]/g, "");
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }
    return "P";
};

export default function Party() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isReadOnly } = usePermissions();
    // SearchSearchParams synchronization
    const [searchParams, setSearchParams] = useSearchParams();
    const rawTab = searchParams.get("tab")?.toUpperCase() || "";
    const activeRoleTab = rawTab === "SUPPLIERS" ? "SUPPLIER" : rawTab === "BUYERS" ? "BUYER" : rawTab === "CUSTOMERS" ? "CUSTOMERS" : rawTab;

    const setActiveRoleTab = (tab) => {
        if (tab) {
            const urlTab = tab === "SUPPLIER" ? "suppliers" : tab === "BUYER" ? "buyers" : tab.toLowerCase();
            setSearchParams({ tab: urlTab });
        } else {
            setSearchParams({});
        }
    };

    // Parties state from Redux
    const { parties, loading: partyLoading, error: partyError } = useSelector((s) => s.party);

    // Members state from Redux
    const { members, loading: membersLoading, error: membersError } = useSelector((s) => s.members);

    // Dynamic Loading/Error states depending on tab
    const isCustomersTab = activeRoleTab === "CUSTOMERS";
    const loading = isCustomersTab ? membersLoading : partyLoading;
    const error = isCustomersTab ? membersError : partyError;

    // Search & Filter States for Parties
    const [searchTerm, setSearchTerm] = useState("");
    const [filterGstType, setFilterGstType] = useState("");
    const [filterState, setFilterState] = useState("");
    const [filterBalanceType, setFilterBalanceType] = useState("");
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    // Search & Filter States for Members (Customers)
    const [memberSearch, setMemberSearch] = useState("");
    const [memberRole, setMemberRole] = useState("");
    const [memberKyc, setMemberKyc] = useState("");
    const [memberPage, setMemberPage] = useState(1);

    // Member Modals
    const [selectedMember, setSelectedMember] = useState(null);
    const [farmMember, setFarmMember] = useState(null);

    useEffect(() => {
        if (isCustomersTab) {
            dispatch(fetchMembers());
        } else {
            const params = {};
            if (activeRoleTab) {
                params.partyType = activeRoleTab;
            }
            dispatch(fetchParties(params));
        }
    }, [dispatch, activeRoleTab, isCustomersTab]);

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearPartyStatus());
        }
    }, [error, dispatch]);

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
        const matchesState = filterState ? p.state === filterState : true;
        const matchesBalanceType = filterBalanceType ? p.openingBalanceType === filterBalanceType : true;

        return matchesSearch && matchesGst && matchesState && matchesBalanceType;
    });

    // Filter members based on search and filters
    const filteredMembers = members.filter((m) => {
        const fullName = `${m.firstName || ""} ${m.lastName || ""}`.toLowerCase();
        const matchesSearch =
            fullName.includes(memberSearch.toLowerCase()) ||
            m.phone?.includes(memberSearch) ||
            m._id?.toLowerCase().includes(memberSearch.toLowerCase());

        const matchesRole = memberRole ? m.role === memberRole : true;
        const matchesKyc = memberKyc ? (m.kycStatus || "Pending") === memberKyc : true;

        return matchesSearch && matchesRole && matchesKyc;
    }).sort((a, b) => new Date(b.createdAt || b._id) - new Date(a.createdAt || a._id));

    const ITEMS_PER_PAGE = 10;
    const totalMemberPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);
    const memberStartIndex = (memberPage - 1) * ITEMS_PER_PAGE;
    const paginatedMembers = filteredMembers.slice(memberStartIndex, memberStartIndex + ITEMS_PER_PAGE);

    // Calculate summary metrics
    const totals = isCustomersTab
        ? {
            total: members.length,
            farmer: members.filter(m => m.role === "Farmer").length,
            staff: members.filter(m => m.role === "Staff").length,
            approved: members.filter(m => m.kycStatus === "Approved").length,
          }
        : {
            total: parties.length,
            registered: parties.filter(p => p.gstType?.startsWith("Registered")).length,
            receivable: parties
                .filter(p => p.openingBalanceType === "DEBIT")
                .reduce((sum, p) => sum + Number(p.openingBalance || 0), 0),
            payable: parties
                .filter(p => p.openingBalanceType === "CREDIT")
                .reduce((sum, p) => sum + Number(p.openingBalance || 0), 0),
          };

    const getCityAndState = (party) => {
        const stateName = party.state || "—";
        let cityName = "";
        if (party.billingAddress) {
            const parts = party.billingAddress.split(",");
            cityName = parts[0].trim();
        }
        return { stateName, cityName };
    };

    return (
        <div className="max-w-[1700px] w-full mx-auto space-y-6 text-gray-900 font-sans">
            {error && (
                <ErrorState
                    title="Failed to load parties"
                    error={error}
                    onRetry={() => dispatch(fetchParties())}
                    variant="page"
                />
            )}

            {/* 1. Header Area */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-[26px] font-bold text-gray-900 tracking-tight leading-tight">Party Directory</h1>
                    <p className="text-sm text-gray-500 font-medium">Manage customers, suppliers, distributors and business accounts.</p>
                </div>
                {!isReadOnly && (
                    isCustomersTab ? (
                        <AddMemberButton />
                    ) : (
                        <button
                            onClick={() => navigate(
                                activeRoleTab === "SUPPLIER"
                                    ? "/party/new?role=supplier"
                                    : activeRoleTab === "BUYER"
                                    ? "/party/new?role=buyer"
                                    : "/party/new"
                            )}
                            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold transition shadow-sm active:scale-95 shrink-0"
                        >
                            <Plus className="w-4.5 h-4.5" />
                            {activeRoleTab === "SUPPLIER"
                                ? "Add Supplier"
                                : activeRoleTab === "BUYER"
                                ? "Add Buyer"
                                : "Add Party"}
                        </button>
                    )
                )}
            </div>

            {/* 2. KPI Summary Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {loading && (isCustomersTab ? members.length === 0 : parties.length === 0) ? (
                    // Skeleton cards
                    Array(4).fill(0).map((_, idx) => (
                        <div key={idx} className="bg-white border border-gray-250 rounded-xl px-4 py-3 h-[90px] shadow-xs flex items-center justify-between animate-pulse">
                            <div className="space-y-2">
                                <div className="h-3 bg-gray-200 rounded w-20" />
                                <div className="h-6 bg-gray-300 rounded w-24" />
                            </div>
                            <div className="w-10 h-10 rounded-lg bg-gray-200 border border-gray-150 shrink-0" />
                        </div>
                    ))
                ) : (
                    isCustomersTab ? (
                        [
                            { label: "Total Members", val: totals.total, icon: Users, bg: "bg-blue-50 text-blue-700 border-blue-105" },
                            { label: "Farmers", val: totals.farmer, icon: Tractor, bg: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                            { label: "Staff", val: totals.staff, icon: Briefcase, bg: "bg-amber-50 text-amber-700 border-amber-100" },
                            { label: "KYC Approved", val: totals.approved, icon: Users, bg: "bg-purple-50 text-purple-700 border-purple-100" },
                        ].map((item, idx) => (
                            <div 
                                key={idx} 
                                className="bg-white border border-gray-250 rounded-xl px-4 py-3 h-[90px] shadow-xs flex items-center justify-between hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-pointer group"
                            >
                                <div className="flex flex-col justify-between h-full py-0.5">
                                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{item.label}</span>
                                    <span className="text-[22px] font-bold text-gray-900 leading-tight mt-1">{item.val}</span>
                                </div>
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${item.bg}`}>
                                    <item.icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
                                </div>
                            </div>
                        ))
                    ) : (
                        [
                            { label: "Total Parties", val: totals.total, icon: Users, bg: "bg-blue-50 text-blue-700 border-blue-105" },
                            { label: "GST Registered", val: totals.registered, icon: Building, bg: "bg-purple-50 text-purple-700 border-purple-100" },
                            { label: "Receivable", val: `₹${totals.receivable.toLocaleString("en-IN")}`, icon: IndianRupee, bg: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                            { label: "Payable", val: `₹${totals.payable.toLocaleString("en-IN")}`, icon: CreditCard, bg: "bg-amber-50 text-amber-700 border-amber-100" },
                        ].map((item, idx) => (
                            <div 
                                key={idx} 
                                className="bg-white border border-gray-250 rounded-xl px-4 py-3 h-[90px] shadow-xs flex items-center justify-between hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-pointer group"
                            >
                                <div className="flex flex-col justify-between h-full py-0.5">
                                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{item.label}</span>
                                    <span className="text-[22px] font-bold text-gray-900 leading-tight mt-1">{item.val}</span>
                                </div>
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${item.bg}`}>
                                    <item.icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
                                </div>
                            </div>
                        ))
                    )
                )}
            </div>

            {/* Role Filter Tabs */}
            <div className="flex bg-gray-50 border border-gray-150 p-1 rounded-xl select-none max-w-md">
                {[
                    { id: "", label: "All" },
                    { id: "SUPPLIER", label: "Suppliers" },
                    { id: "BUYER", label: "Buyers" },
                    { id: "CUSTOMERS", label: "Customers" },
                ].map((tab) => {
                    const isActive = activeRoleTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveRoleTab(tab.id)}
                            className={`flex-1 py-1.5 px-4 text-center rounded-lg text-xs font-bold transition cursor-pointer select-none ${
                                isActive
                                    ? "bg-white text-emerald-700 border border-emerald-650/20 shadow-xs"
                                    : "text-gray-500 hover:text-gray-850"
                            }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* 3. Sticky Controls & Filter Bar */}
            <div className="sticky top-0 z-20 bg-white py-3 border-b border-gray-200 flex flex-wrap lg:flex-nowrap items-center gap-3 w-full">
                {loading && (isCustomersTab ? members.length === 0 : parties.length === 0) ? (
                    // Skeleton filter toolbar
                    <div className="w-full h-11 bg-gray-50 border border-gray-200 rounded-lg animate-pulse" />
                ) : (
                    isCustomersTab ? (
                        <MemberFilters
                            searchTerm={memberSearch}
                            setSearchTerm={setMemberSearch}
                            roleFilter={memberRole}
                            setRoleFilter={setMemberRole}
                            kycFilter={memberKyc}
                            setKycFilter={setMemberKyc}
                        />
                    ) : (
                        <>
                            <div className="flex-1 min-w-[240px] relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by Party Name, Phone or GSTIN..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 h-11 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600/10 focus:border-brand-600 bg-white placeholder-gray-400 font-medium shadow-xs"
                                />
                            </div>
                            <div className="w-full sm:w-44 shrink-0">
                                <select
                                    value={filterGstType}
                                    onChange={(e) => setFilterGstType(e.target.value)}
                                    className="w-full px-3 h-11 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600/10 focus:border-brand-600 bg-white cursor-pointer font-semibold text-gray-700 shadow-xs"
                                >
                                    <option value="">GST Type</option>
                                    {GST_TYPES.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-full sm:w-44 shrink-0">
                                <select
                                    value={filterState}
                                    onChange={(e) => setFilterState(e.target.value)}
                                    className="w-full px-3 h-11 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600/10 focus:border-brand-600 bg-white cursor-pointer font-semibold text-gray-700 shadow-xs"
                                >
                                    <option value="">State</option>
                                    {STATES.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-full sm:w-44 shrink-0">
                                <select
                                    value={filterBalanceType}
                                    onChange={(e) => setFilterBalanceType(e.target.value)}
                                    className="w-full px-3 h-11 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600/10 focus:border-brand-600 bg-white cursor-pointer font-semibold text-gray-700 shadow-xs"
                                >
                                    <option value="">Balance Type</option>
                                    <option value="DEBIT">DEBIT (Receivable)</option>
                                    <option value="CREDIT">CREDIT (Payable)</option>
                                </select>
                            </div>
                            {(searchTerm || filterGstType || filterState || filterBalanceType) && (
                                <button
                                    onClick={() => {
                                        setSearchTerm("");
                                        setFilterGstType("");
                                        setFilterState("");
                                        setFilterBalanceType("");
                                    }}
                                    className="h-11 px-4 text-xs font-bold text-red-650 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition shrink-0 active:scale-95"
                                >
                                    Reset Filters
                                </button>
                            )}
                        </>
                    )
                )}
            </div>

            {/* 4. Parties Data Content Container */}
            {isCustomersTab ? (
                <MemberTable
                    members={paginatedMembers}
                    loading={loading}
                    onViewDetails={setSelectedMember}
                    onViewFarms={setFarmMember}
                    currentPage={memberPage}
                    totalPages={totalMemberPages || 1}
                    totalCount={filteredMembers.length}
                    startIndex={memberStartIndex}
                    perPage={ITEMS_PER_PAGE}
                    onPageChange={setMemberPage}
                />
            ) : parties.length === 0 && !loading ? (
                /* ================= EMPTY STATE CONTAINER ================= */
                <div className="flex flex-col items-center justify-center min-h-[50vh] bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-xs">
                    <div className="relative my-6 select-none">
                        {/* SVG Illustration */}
                        <svg width="420" height="220" viewBox="0 0 420 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
                            <ellipse cx="210" cy="205" rx="140" ry="10" fill="#F1F5F9" />
                            <rect x="70" y="15" width="220" height="150" rx="10" fill="#FFFFFF" stroke="#475569" strokeWidth="2.5" />
                            <path d="M70,40 L290,40" stroke="#475569" strokeWidth="2.5" />
                            <circle cx="85" cy="28" r="4" fill="#EF4444" />
                            <circle cx="97" cy="28" r="4" fill="#FBBF24" />
                            <circle cx="109" cy="28" r="4" fill="#34D399" />
                            <rect x="85" y="55" width="70" height="16" rx="4" fill="#FBBF24" />
                            <rect x="165" y="55" width="60" height="16" rx="4" fill="#E2E8F0" />
                            <circle cx="97" cy="95" r="9" fill="#FBBF24" opacity="0.3" />
                            <circle cx="97" cy="95" r="5" fill="#FBBF24" />
                            <rect x="115" y="90" width="140" height="10" rx="3" fill="#FBBF24" opacity="0.25" />
                            <circle cx="97" cy="125" r="9" fill="#FBBF24" opacity="0.3" />
                            <circle cx="97" cy="125" r="5" fill="#FBBF24" />
                            <rect x="115" y="120" width="140" height="10" rx="3" fill="#FBBF24" opacity="0.25" />
                            <circle cx="240" cy="100" r="48" fill="#FFFFFF" stroke="#FBBF24" strokeWidth="4" />
                            <defs>
                                <clipPath id="avatar-clip">
                                    <circle cx="240" cy="100" r="46" />
                                </clipPath>
                            </defs>
                            <g clipPath="url(#avatar-clip)">
                                <path d="M210,145 C210,118 270,118 270,145 Z" fill="#FBBF24" />
                                <rect x="236" y="118" width="8" height="18" fill="#F59E0B" />
                                <path d="M232,118 L240,126 L248,118" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                                <rect x="236" y="106" width="8" height="12" fill="#FED7AA" />
                                <circle cx="240" cy="96" r="14" fill="#FED7AA" />
                                <path d="M224,92 C224,82 256,82 256,92 C256,87 224,87 224,92 Z" fill="#1E293B" />
                                <path d="M223,94 C223,85 257,85 257,94 Z" fill="#1E293B" />
                                <circle cx="235" cy="95" r="1.5" fill="#1E293B" />
                                <circle cx="245" cy="95" r="1.5" fill="#1E293B" />
                                <path d="M236,102 Q240,106 244,102" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                                <path d="M216,125 C216,110 226,96 230,100 C234,104 224,118 224,125 Z" fill="#FED7AA" />
                            </g>
                            <circle cx="225" cy="135" r="18" fill="#475569" stroke="#FFFFFF" strokeWidth="3" />
                            <path d="M218,135 L232,135 M225,128 L225,142" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                    </div>

                    <h3 className="text-lg font-bold text-gray-905">No Parties Found</h3>
                    <p className="text-sm text-gray-500 max-w-sm mt-1 leading-relaxed">
                        There are no business partners registered in your database yet. Register your first customer or supplier to get started.
                    </p>

                    {!isReadOnly ? (
                        <button
                            onClick={() => navigate("/party/new")}
                            className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold transition shadow-sm active:scale-95 mt-4"
                        >
                            <Plus className="w-4.5 h-4.5" />
                            Add Party
                        </button>
                    ) : (
                        <p className="text-xs text-gray-400 italic mt-3">No parties are currently registered (Read-Only access)</p>
                    )}
                </div>
            ) : (
                /* ================= DATA TABLE CONTAINER ================= */
                <div className="bg-white border border-gray-250 rounded-2xl shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm table-fixed">
                            <thead className="bg-gray-50 border-b border-gray-150 text-xs text-gray-600 uppercase font-bold tracking-wider">
                                <tr>
                                    <th className="px-5 py-3 w-[32%]">Party</th>
                                    <th className="px-5 py-3 w-[18%]">GST</th>
                                    <th className="px-5 py-3 w-[16%]">Contact</th>
                                    <th className="px-5 py-3 w-[16%]">Location</th>
                                    <th className="px-5 py-3 w-[10%]">Balance</th>
                                    <th className="px-5 py-3 w-[8%] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-150">
                                {loading && filteredParties.length === 0 ? (
                                    // Skeletons for Loading Rows
                                    Array(5).fill(0).map((_, idx) => (
                                        <tr key={idx} className="animate-pulse">
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                                                    <div className="space-y-1.5 flex-1">
                                                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                                                        <div className="h-3 bg-gray-150 rounded w-1/2" />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="space-y-1.5">
                                                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                                                    <div className="h-3 bg-gray-150 rounded w-1/2" />
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="space-y-1.5">
                                                    <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                                                    <div className="h-3 bg-gray-150 rounded w-2/3" />
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="space-y-1.5">
                                                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                                                    <div className="h-3 bg-gray-150 rounded w-1/3" />
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="space-y-1.5">
                                                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                                                    <div className="h-3 bg-gray-150 rounded w-1/3" />
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="h-8 bg-gray-200 rounded w-12 ml-auto" />
                                            </td>
                                        </tr>
                                    ))
                                ) : filteredParties.length === 0 ? (
                                    /* Empty search results block */
                                    <tr>
                                        <td colSpan="6" className="px-5 py-16 text-center text-gray-400">
                                            <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                                            <p className="font-semibold text-gray-900">No matching records found</p>
                                            <p className="text-xs text-gray-400 mt-1">Try resetting the filter selections or entering a different search term.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredParties.map((party) => (
                                        <tr key={party._id} className="hover:bg-slate-50/50 transition">
                                            {/* Party Column (32%) */}
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-brand-50 border border-brand-100 text-brand-700 font-bold flex items-center justify-center shrink-0 text-sm select-none">
                                                        {getInitials(party.name)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p 
                                                            onClick={() => navigate(`/party/edit/${party._id}`)}
                                                            className="font-bold text-gray-900 text-sm hover:text-brand-700 transition cursor-pointer truncate"
                                                            title={party.name}
                                                        >
                                                            {party.name}
                                                        </p>
                                                        <p className="text-xs text-gray-400 font-medium truncate mt-0.5">{party._id}</p>
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {(party.partyType === "SUPPLIER" || party.partyType === "BOTH" || !party.partyType) && (
                                                                <span className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 select-none">
                                                                    📦 Supplier
                                                                </span>
                                                            )}
                                                            {(party.partyType === "BUYER" || party.partyType === "BOTH") && (
                                                                <span className="px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 select-none">
                                                                    🛒 Buyer
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* GST Column (18%) */}
                                            <td className="px-5 py-3">
                                                <div className="space-y-1">
                                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                                                        party.gstType?.startsWith("Registered")
                                                            ? "bg-purple-100 text-purple-800"
                                                            : "bg-gray-100 text-gray-700"
                                                    }`}>
                                                        {party.gstType?.replace("Registered-", "") || "Unregistered"}
                                                    </span>
                                                    {party.gstin && (
                                                        <p className="text-xs font-mono text-gray-600 font-bold uppercase tracking-wider">{party.gstin}</p>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Contact Column (16%) */}
                                            <td className="px-5 py-3 text-xs font-medium text-gray-700">
                                                <div className="space-y-0.5">
                                                    <p className="font-semibold text-gray-900">{party.phoneNumber || "—"}</p>
                                                    {party.email && (
                                                        <p className="text-[11px] text-gray-500 truncate" title={party.email}>{party.email}</p>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Location Column (16%) */}
                                            <td className="px-5 py-3 text-sm">
                                                <div className="space-y-0.5">
                                                    <p className="font-semibold text-gray-900 leading-tight">{getCityAndState(party).stateName}</p>
                                                    {getCityAndState(party).cityName && (
                                                        <p className="text-xs text-gray-500 font-medium leading-tight truncate" title={party.billingAddress}>{getCityAndState(party).cityName}</p>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Balance Column (10%) */}
                                            <td className="px-5 py-3">
                                                <div className="space-y-1">
                                                    <p className="font-bold text-gray-900 text-sm">₹{(party.openingBalance || 0).toLocaleString("en-IN")}</p>
                                                    <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase ${
                                                        party.openingBalanceType === "CREDIT"
                                                            ? "bg-amber-100 text-amber-800"
                                                            : "bg-emerald-100 text-emerald-800"
                                                    }`}>
                                                        {party.openingBalanceType || "CREDIT"}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Actions Column (8%) */}
                                            <td className="px-5 py-3 text-right">
                                                <div className="flex justify-end gap-1.5">
                                                    {!isReadOnly ? (
                                                        <>
                                                            <button
                                                                onClick={() => navigate(`/party/edit/${party._id}`)}
                                                                className="p-1.5 text-gray-500 hover:text-brand-700 hover:bg-brand-50 rounded transition active:scale-95"
                                                                title="Edit Party Profile"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmDeleteId(party._id)}
                                                                className="p-1.5 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded transition active:scale-95"
                                                                title="Delete Party"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic font-semibold">View</span>
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
            )}

            {/* 6. Delete Confirmation Dialogue */}
            {confirmDeleteId && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center space-y-4">
                        <div className="w-14 h-14 bg-red-100 text-red-650 rounded-full flex items-center justify-center mx-auto">
                            <Trash2 className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-gray-950">Remove Party?</h3>
                            <p className="text-xs text-gray-505 mt-1">This will soft-delete the party records. Historical transactions are preserved.</p>
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
                                className="flex-1 px-4 py-2 bg-red-650 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Member Details Drawer overlay */}
            {selectedMember && (
                <MemberDetailsDrawer
                    member={selectedMember}
                    onClose={() => setSelectedMember(null)}
                    isReadOnly={isReadOnly}
                />
            )}

            {/* Farm plots modal overlay */}
            {farmMember && (
                <Suspense fallback={<div className="p-4 text-center">Loading Map...</div>}>
                    <FarmModal member={farmMember} onClose={() => setFarmMember(null)} />
                </Suspense>
            )}
        </div>
    );
}

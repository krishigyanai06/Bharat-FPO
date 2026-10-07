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
  Building2,
  RefreshCw,
  Tractor,
  Briefcase,
  X,
  Filter,
  Package,
  ShoppingCart,
  Building,
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
  // SearchParams synchronization
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
    if (rawTab === "CUSTOMERS") {
      navigate("/customers", { replace: true });
    }
  }, [rawTab, navigate]);

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

  const hasActiveFilters = Boolean(searchTerm || filterGstType || filterState || filterBalanceType);

  return (
    <div className="w-full h-full flex flex-col space-y-3 select-none text-slate-800 font-sans flex-1">
      {error && (
        <ErrorState
          title="Failed to load parties"
          error={error}
          onRetry={() => dispatch(fetchParties())}
          variant="page"
        />
      )}

      {/* 1. Header Area */}
      <div className="shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200/80 pb-2.5">
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#16A36A]" />
            Party Directory
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Manage suppliers, buyers, business partners and accounts.
          </p>
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
              className="flex items-center gap-2 px-4 py-2 bg-[#16A36A] hover:bg-[#138a59] text-white rounded-lg text-xs font-bold transition shadow-2xs active:scale-95 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
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
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {loading && (isCustomersTab ? members.length === 0 : parties.length === 0) ? (
          Array(4).fill(0).map((_, idx) => (
            <div key={idx} className="bg-white border border-[#DCE5EA] rounded-xl p-3 shadow-2xs flex items-center justify-between animate-pulse">
              <div className="space-y-1.5 flex-1">
                <div className="h-3 bg-slate-200 rounded w-20" />
                <div className="h-5 bg-slate-200 rounded w-24" />
              </div>
              <div className="w-9 h-9 rounded-lg bg-slate-100 shrink-0" />
            </div>
          ))
        ) : (
          isCustomersTab ? (
            [
              { label: "Total Members", val: totals.total, icon: Users, color: "emerald" },
              { label: "Farmers", val: totals.farmer, icon: Tractor, color: "emerald" },
              { label: "Staff", val: totals.staff, icon: Briefcase, color: "blue" },
              { label: "KYC Approved", val: totals.approved, icon: Users, color: "purple" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-white border border-[#DCE5EA] rounded-xl p-3 shadow-2xs flex items-center justify-between hover:border-slate-300 transition-all cursor-pointer"
              >
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{item.label}</p>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">{item.val}</h3>
                </div>
                <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4" />
                </div>
              </div>
            ))
          ) : (
            [
              { label: "Total Parties", val: totals.total, sub: "Registered Accounts", icon: Users, textCol: "text-slate-900" },
              { label: "GST Registered", val: totals.registered, sub: "Tax Registered Parties", icon: Building, textCol: "text-purple-700" },
              { label: "Receivable", val: `₹${totals.receivable.toLocaleString("en-IN")}`, sub: "Outstanding Receivables", icon: IndianRupee, textCol: "text-emerald-700" },
              { label: "Payable", val: `₹${totals.payable.toLocaleString("en-IN")}`, sub: "Outstanding Payables", icon: CreditCard, textCol: "text-amber-700" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-white border border-[#DCE5EA] rounded-xl p-3 shadow-2xs flex items-center justify-between hover:border-slate-300 transition-all cursor-pointer"
              >
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{item.label}</p>
                  <h3 className={`text-lg font-bold ${item.textCol} mt-0.5`}>{item.val}</h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{item.sub}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4" />
                </div>
              </div>
            ))
          )
        )}
      </div>

      {/* 3. Role Category Tabs */}
      <div className="shrink-0 flex border-b border-slate-200">
        {[
          { id: "", label: "All Parties", icon: Building2 },
          { id: "SUPPLIER", label: "Suppliers", icon: Package },
          { id: "BUYER", label: "Buyers", icon: ShoppingCart },
        ].map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeRoleTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveRoleTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-colors duration-150 border-b-2 cursor-pointer ${
                isActive
                  ? "border-[#16A36A] text-[#16A36A] font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <TabIcon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 4. Controls & Filter Bar */}
      <div className="shrink-0 bg-white border border-[#DCE5EA] rounded-xl p-2 shadow-2xs flex flex-col md:flex-row gap-2 items-center w-full">
        {loading && (isCustomersTab ? members.length === 0 : parties.length === 0) ? (
          <div className="w-full h-9 bg-slate-100 rounded-lg animate-pulse" />
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
              {/* Search input */}
              <div className="flex-1 relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by party name, phone, or GSTIN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 h-9 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#16A36A] focus:border-[#16A36A] placeholder-slate-400 text-slate-800 font-medium bg-slate-50/50"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter dropdowns group */}
              <div className="flex items-center gap-2 w-full md:w-auto shrink-0 flex-wrap md:flex-nowrap justify-between md:justify-end">
                {/* GST Type filter */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 h-9 shrink-0">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">GST:</span>
                  <select
                    value={filterGstType}
                    onChange={(e) => setFilterGstType(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="">All GST Types</option>
                    {GST_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* State filter */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 h-9 shrink-0">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">State:</span>
                  <select
                    value={filterState}
                    onChange={(e) => setFilterState(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1 max-w-[130px] truncate"
                  >
                    <option value="">All States</option>
                    {STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Balance type filter */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 h-9 shrink-0">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Balance:</span>
                  <select
                    value={filterBalanceType}
                    onChange={(e) => setFilterBalanceType(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="">All Balances</option>
                    <option value="DEBIT">DEBIT (Receivable)</option>
                    <option value="CREDIT">CREDIT (Payable)</option>
                  </select>
                </div>

                {/* Reset button */}
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setFilterGstType("");
                      setFilterState("");
                      setFilterBalanceType("");
                    }}
                    className="h-9 px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition shrink-0 cursor-pointer flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reset
                  </button>
                )}
              </div>
            </>
          )
        )}
      </div>

      {/* 5. Parties ERP Register Table Container */}
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
        /* Empty state block */
        <div className="flex flex-col items-center justify-center flex-1 bg-white rounded-xl border border-[#DCE5EA] p-8 text-center shadow-2xs min-h-[350px]">
          <Building2 className="w-12 h-12 text-slate-300 mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No Parties Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
            There are no business partners registered in your database yet. Register your first customer or supplier to get started.
          </p>

          {!isReadOnly ? (
            <button
              onClick={() => navigate("/party/new")}
              className="flex items-center gap-2 px-4 py-2 bg-[#16A36A] hover:bg-[#138a59] text-white rounded-lg text-xs font-bold transition shadow-2xs mt-4 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Party
            </button>
          ) : (
            <p className="text-xs text-slate-400 italic mt-3">No parties are currently registered (Read-Only access)</p>
          )}
        </div>
      ) : (
        /* Parties Register Table */
        <div className="bg-white border border-[#DCE5EA] rounded-xl shadow-2xs overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="overflow-x-auto overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full border-collapse text-left text-xs table-fixed">
              <thead className="bg-[#F8FAFC] border-b border-slate-200/90 text-[11px] text-slate-500 uppercase font-bold tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2.5 w-[28%] bg-[#F8FAFC]">Party Name & Code</th>
                  <th className="px-4 py-2.5 w-[18%] bg-[#F8FAFC]">GST Type & GSTIN</th>
                  <th className="px-4 py-2.5 w-[16%] bg-[#F8FAFC]">Contact</th>
                  <th className="px-4 py-2.5 w-[16%] bg-[#F8FAFC]">Location</th>
                  <th className="px-4 py-2.5 w-[14%] text-right bg-[#F8FAFC]">Opening Balance</th>
                  <th className="px-4 py-2.5 w-[8%] text-right bg-[#F8FAFC]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {loading && filteredParties.length === 0 ? (
                  Array(6).fill(0).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-200" />
                          <div className="space-y-1 flex-1">
                            <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                            <div className="h-2.5 bg-slate-150 rounded w-1/2" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><div className="h-3.5 bg-slate-200 rounded w-2/3" /></td>
                      <td className="px-4 py-3"><div className="h-3.5 bg-slate-200 rounded w-3/4" /></td>
                      <td className="px-4 py-3"><div className="h-3.5 bg-slate-200 rounded w-2/3" /></td>
                      <td className="px-4 py-3 text-right"><div className="h-4 bg-slate-200 rounded w-16 ml-auto" /></td>
                      <td className="px-4 py-3 text-right"><div className="h-6 bg-slate-200 rounded w-12 ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredParties.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-16 text-center text-slate-400">
                      <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-xs text-slate-600">No matching party records found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Try resetting search parameters or adding a new party.</p>
                    </td>
                  </tr>
                ) : (
                  filteredParties.map((party) => {
                    const initials = getInitials(party.name);
                    const partyCode = `PRT-${party._id?.slice(-6).toUpperCase()}`;
                    const balance = Number(party.openingBalance || 0);
                    const isCredit = party.openingBalanceType === "CREDIT";

                    return (
                      <tr key={party._id} className="hover:bg-slate-50/80 transition-colors cursor-pointer" onClick={() => navigate(`/party/edit/${party._id}`)}>
                        {/* Party Column */}
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs select-none">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p
                                className="font-bold text-slate-900 text-xs hover:text-[#16A36A] transition truncate"
                                title={party.name}
                              >
                                {party.name}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono font-medium truncate">{partyCode}</p>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {(party.partyType === "SUPPLIER" || party.partyType === "BOTH" || !party.partyType) && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    📦 Supplier
                                  </span>
                                )}
                                {(party.partyType === "BUYER" || party.partyType === "BOTH") && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                                    🛒 Buyer
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* GST Column */}
                        <td className="px-4 py-2.5">
                          <div className="space-y-0.5">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                              party.gstType?.startsWith("Registered")
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}>
                              {party.gstType?.replace("Registered-", "") || "Unregistered"}
                            </span>
                            {party.gstin && (
                              <p className="text-[10px] font-mono text-slate-600 font-bold uppercase tracking-wider">{party.gstin}</p>
                            )}
                          </div>
                        </td>

                        {/* Contact Column */}
                        <td className="px-4 py-2.5 text-xs font-medium text-slate-700">
                          <div className="space-y-0.5">
                            <p className="font-semibold text-slate-900">{party.phoneNumber || "—"}</p>
                            {party.email && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[140px]" title={party.email}>{party.email}</p>
                            )}
                          </div>
                        </td>

                        {/* Location Column */}
                        <td className="px-4 py-2.5 text-xs">
                          <div className="space-y-0.5">
                            <p className="font-semibold text-slate-800 leading-tight truncate">{getCityAndState(party).stateName}</p>
                            {getCityAndState(party).cityName && (
                              <p className="text-[10px] text-slate-400 font-medium leading-tight truncate max-w-[130px]" title={party.billingAddress}>{getCityAndState(party).cityName}</p>
                            )}
                          </div>
                        </td>

                        {/* Opening Balance Column */}
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-extrabold border ${
                            isCredit
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}>
                            ₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 0 })} {isCredit ? "(Cr)" : "(Dr)"}
                          </span>
                        </td>

                        {/* Actions Column */}
                        <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            {!isReadOnly ? (
                              <>
                                <button
                                  onClick={() => navigate(`/party/edit/${party._id}`)}
                                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer"
                                  title="Edit Party Profile"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(party._id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                                  title="Delete Party"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic font-semibold">View</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialogue */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 text-center space-y-3.5 border border-slate-200 animate-scale-up">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Remove Party Account?</h3>
              <p className="text-xs text-slate-500 mt-1">This will soft-delete the party record. Historical financial transactions will be preserved.</p>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
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
        <Suspense fallback={<div className="p-4 text-center text-xs text-slate-500">Loading Map...</div>}>
          <FarmModal member={farmMember} onClose={() => setFarmMember(null)} />
        </Suspense>
      )}
    </div>
  );
}

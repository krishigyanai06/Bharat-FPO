import { useEffect, useState, lazy, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMembers } from "../store/thunks/membersThunk";
import { usePermissions } from "../hooks/usePermissions";
import ErrorState from "../components/ErrorState";
import AddMemberButton from "../components/AddMemberButton";
import MemberFilters from "../components/members/MemberFilters";
import MemberTable from "../components/members/MemberTable";
import MemberDetailsDrawer from "../components/members/MemberDetailsDrawer";
import {
  Users,
  CheckCircle,
  Clock,
  Sprout,
  RefreshCw,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";

const FarmModal = lazy(() => import("../components/FarmModal"));

export default function Customers() {
  const dispatch = useDispatch();
  const { isReadOnly } = usePermissions();

  // Redux state
  const { members, loading, error } = useSelector((s) => s.members);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [kycFilter, setKycFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Modals state
  const [selectedMember, setSelectedMember] = useState(null);
  const [farmMember, setFarmMember] = useState(null);

  useEffect(() => {
    dispatch(fetchMembers());
  }, [dispatch]);

  // Filter members based on search term, role, and KYC status
  const filteredMembers = members
    .filter((m) => {
      const fullName = `${m.firstName || ""} ${m.lastName || ""}`.toLowerCase();
      const matchesSearch =
        fullName.includes(searchTerm.toLowerCase()) ||
        (m.phone && m.phone.includes(searchTerm)) ||
        (m._id && m._id.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesRole = roleFilter ? m.role === roleFilter : true;
      const matchesKyc = kycFilter ? (m.kycStatus || "Pending") === kycFilter : true;

      return matchesSearch && matchesRole && matchesKyc;
    })
    .sort((a, b) => new Date(b.createdAt || b._id) - new Date(a.createdAt || a._id));

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedMembers = filteredMembers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Metrics
  const totals = {
    total: members.length,
    farmers: members.filter((m) => m.role === "Farmer").length,
    approved: members.filter((m) => m.kycStatus === "Approved").length,
    pending: members.filter((m) => !m.kycStatus || m.kycStatus === "Pending").length,
  };

  return (
    <div className="w-full h-full flex flex-col space-y-4 select-none text-slate-800 font-sans flex-1">
      {error && (
        <ErrorState
          title="Failed to load customer list"
          error={error}
          onRetry={() => dispatch(fetchMembers())}
          variant="page"
        />
      )}

      {/* 1. Header Area */}
      <div className="shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200/80 pb-2.5">
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#16A36A]" />
            Customers (Farmers)
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Manage FPO farmers, members, customer accounts and their sales activity.
          </p>
        </div>
        {!isReadOnly && <AddMemberButton />}
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-[#DCE5EA] rounded-xl p-3 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Customers</p>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">{totals.total}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Registered Accounts</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-[#DCE5EA] rounded-xl p-3 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Farmers</p>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">{totals.farmers}</h3>
            <p className="text-[10px] text-emerald-700 font-medium mt-0.5">FPO Producer Members</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Sprout className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-[#DCE5EA] rounded-xl p-3 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Approved KYC</p>
            <h3 className="text-lg font-bold text-emerald-700 mt-0.5">{totals.approved}</h3>
            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Verified Accounts</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-[#DCE5EA] rounded-xl p-3 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pending Verification</p>
            <h3 className="text-lg font-bold text-amber-700 mt-0.5">{totals.pending}</h3>
            <p className="text-[10px] text-amber-600 font-medium mt-0.5">KYC In Progress</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <MemberFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        kycFilter={kycFilter}
        setKycFilter={setKycFilter}
      />

      {/* 4. Customer Register Table */}
      <MemberTable
        members={paginatedMembers}
        loading={loading}
        onViewDetails={(m) => setSelectedMember(m)}
        onViewFarms={(m) => setFarmMember(m)}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={filteredMembers.length}
        startIndex={startIndex}
        perPage={ITEMS_PER_PAGE}
        onPageChange={(page) => setCurrentPage(page)}
      />

      {/* Drawer: Member Details & Sales / Farm Overview */}
      {selectedMember && (
        <MemberDetailsDrawer
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onViewFarms={(m) => {
            setSelectedMember(null);
            setFarmMember(m);
          }}
        />
      )}

      {/* Modal: Farm Details */}
      {farmMember && (
        <Suspense
          fallback={
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
          }
        >
          <FarmModal member={farmMember} onClose={() => setFarmMember(null)} />
        </Suspense>
      )}
    </div>
  );
}

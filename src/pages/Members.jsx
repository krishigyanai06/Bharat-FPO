import { useEffect, useState, lazy, Suspense, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMembers, updateMember, updateKyc } from "../store/thunks/membersThunk";
import { updateMemberLocal } from "../store/slices/membersSlice";
import {
  Users,
  Tractor,
  Briefcase,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Plus,
  X,
  Filter,
  RefreshCw,
  Phone,
  MapPin,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import AddMemberButton from "../components/AddMemberButton";
import MemberDetailsDrawer from "../components/members/MemberDetailsDrawer";
import { usePermissions } from "../hooks/usePermissions";
import ErrorState from "../components/ErrorState";

const FarmModal = lazy(() => import("../components/FarmModal"));

const KYC_BADGE = {
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  Rejected: "bg-rose-50 text-rose-700 border-rose-200/70",
  Pending: "bg-amber-50 text-amber-700 border-amber-200/70",
};

const getInitials = (firstName, lastName) => {
  const f = firstName?.[0] || "";
  const l = lastName?.[0] || "";
  return (f + l).toUpperCase() || "M";
};

export default function Members() {
  const dispatch = useDispatch();
  const { members, loading, error } = useSelector((state) => state.members);
  const { isReadOnly } = usePermissions();

  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [roleTab, setRoleTab] = useState("ALL"); // "ALL", "Farmer", "Staff"
  const [searchQuery, setSearchQuery] = useState("");
  const [kycFilter, setKycFilter] = useState("ALL");

  const [farmMember, setFarmMember] = useState(null);
  const [detailMember, setDetailMember] = useState(null);

  useEffect(() => {
    dispatch(fetchMembers());
  }, [dispatch]);

  // Compute stats
  const stats = useMemo(() => {
    const total = members.length;
    const farmers = members.filter((m) => m.role === "Farmer").length;
    const staff = members.filter((m) => m.role === "Staff").length;
    const approved = members.filter((m) => m.kycStatus === "Approved").length;
    const pending = members.filter((m) => !m.kycStatus || m.kycStatus === "Pending").length;
    return { total, farmers, staff, approved, pending };
  }, [members]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members
      .filter((m) => {
        // Role tab filter
        if (roleTab === "Farmer" && m.role !== "Farmer") return false;
        if (roleTab === "Staff" && m.role !== "Staff") return false;

        // KYC status filter
        if (kycFilter !== "ALL") {
          const kStatus = m.kycStatus || "Pending";
          if (kStatus !== kycFilter) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const fullName = `${m.firstName || ""} ${m.lastName || ""}`.toLowerCase();
          const phone = m.phone || "";
          const memberId = (m._id || "").toLowerCase();
          const village = (m.village || "").toLowerCase();
          return (
            fullName.includes(q) ||
            phone.includes(q) ||
            memberId.includes(q) ||
            village.includes(q)
          );
        }

        return true;
      })
      .sort((a, b) => new Date(b.createdAt || b._id) - new Date(a.createdAt || a._id));
  }, [members, roleTab, kycFilter, searchQuery]);

  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedMembers = filteredMembers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="w-full h-full flex flex-col space-y-3 select-none text-slate-800 flex-1">
      {/* ERROR DISPLAY */}
      {error && (
        <ErrorState
          title="Failed to load member directory"
          error={error}
          onRetry={() => dispatch(fetchMembers())}
          variant="page"
        />
      )}

      {/* 1. Header Area */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#16A36A]" />
            Member Directory
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage FPO producer farmers, staff members, KYC verification and farm records
          </p>
        </div>
        {!isReadOnly && <AddMemberButton />}
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Members */}
        <div className="bg-white border border-[#DCE5EA] rounded-xl p-3 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Members</p>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">{loading ? "—" : stats.total}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Registered FPO Accounts</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100/80 text-emerald-600 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
        </div>

        {/* Farmers */}
        <div className="bg-white border border-[#DCE5EA] rounded-xl p-3 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Producer Farmers</p>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">{loading ? "—" : stats.farmers}</h3>
            <p className="text-[10px] text-emerald-700 font-medium mt-0.5">Active Agriculture Producers</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100/80 text-emerald-600 flex items-center justify-center shrink-0">
            <Tractor className="w-4 h-4" />
          </div>
        </div>

        {/* Staff Members */}
        <div className="bg-white border border-[#DCE5EA] rounded-xl p-3 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">FPO Staff</p>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">{loading ? "—" : stats.staff}</h3>
            <p className="text-[10px] text-blue-700 font-medium mt-0.5">FPO Operational Staff</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100/80 text-blue-600 flex items-center justify-center shrink-0">
            <Briefcase className="w-4 h-4" />
          </div>
        </div>

        {/* Approved KYC */}
        <div className="bg-white border border-[#DCE5EA] rounded-xl p-3 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Verified KYC</p>
            <h3 className="text-lg font-bold text-emerald-700 mt-0.5">{loading ? "—" : stats.approved}</h3>
            <p className="text-[10px] text-amber-600 font-medium mt-0.5">{stats.pending} Pending Verification</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100/80 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 3. Role Category Tabs */}
      <div className="shrink-0 flex border-b border-slate-200">
        {[
          { key: "ALL", label: `All Members (${stats.total})`, icon: Users },
          { key: "Farmer", label: `Farmers (${stats.farmers})`, icon: Tractor },
          { key: "Staff", label: `Staff (${stats.staff})`, icon: Briefcase },
        ].map((t) => {
          const TabIcon = t.icon;
          const isSelected = roleTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => {
                setRoleTab(t.key);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-colors duration-150 border-b-2 cursor-pointer ${
                isSelected
                  ? "border-[#16A36A] text-[#16A36A] font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <TabIcon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 4. Controls & Filter Bar */}
      <div className="shrink-0 bg-white border border-[#DCE5EA] rounded-xl p-2 shadow-2xs flex flex-col md:flex-row gap-2 items-center">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by member name, phone, member ID, or village..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-8 h-9 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#16A36A] focus:border-[#16A36A] placeholder-slate-400 text-slate-800 font-medium bg-slate-50/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 h-9 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">KYC:</span>
            <select
              value={kycFilter}
              onChange={(e) => {
                setKycFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL">All Status</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. Members ERP Register Table */}
      <div className="w-full bg-white border border-[#DCE5EA] rounded-xl shadow-2xs overflow-x-auto overflow-y-auto flex-1 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="bg-[#F8FAFC] border-b border-slate-200/90 text-[11px] text-slate-500 uppercase font-bold tracking-wider sticky top-0 z-10">
            <tr>
              <th className="px-3.5 py-3 font-bold bg-[#F8FAFC] w-[14%]">MEMBER ID</th>
              <th className="px-3.5 py-3 font-bold bg-[#F8FAFC] w-[24%]">MEMBER NAME</th>
              <th className="px-3.5 py-3 font-bold bg-[#F8FAFC] w-[15%]">CONTACT</th>
              <th className="px-3.5 py-3 font-bold bg-[#F8FAFC] w-[14%]">LOCATION</th>
              <th className="px-3.5 py-3 font-bold bg-[#F8FAFC] w-[11%]">ROLE</th>
              <th className="px-3.5 py-3 font-bold bg-[#F8FAFC] w-[11%]">KYC STATUS</th>
              <th className="px-3.5 py-3 text-right font-bold bg-[#F8FAFC] w-[11%]">DUE BALANCE</th>
              <th className="px-3.5 py-3 text-right font-bold bg-[#F8FAFC] w-[10%]">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
            {loading ? (
              Array(6)
                .fill(0)
                .map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-3.5 py-3">
                      <div className="h-4 bg-slate-200 rounded w-20" />
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
                        <div className="space-y-1 flex-1">
                          <div className="h-3.5 bg-slate-200 rounded w-28" />
                          <div className="h-2.5 bg-slate-150 rounded w-20" />
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-3"><div className="h-3.5 bg-slate-200 rounded w-24" /></td>
                    <td className="px-3.5 py-3"><div className="h-3.5 bg-slate-200 rounded w-20" /></td>
                    <td className="px-3.5 py-3"><div className="h-4 bg-slate-200 rounded w-16" /></td>
                    <td className="px-3.5 py-3"><div className="h-4 bg-slate-200 rounded w-16" /></td>
                    <td className="px-3.5 py-3 text-right"><div className="h-4 bg-slate-200 rounded w-16 ml-auto" /></td>
                    <td className="px-3.5 py-3 text-right"><div className="h-7 bg-slate-200 rounded w-16 ml-auto" /></td>
                  </tr>
                ))
            ) : paginatedMembers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                  <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-xs text-slate-500">No members found</p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-xs text-[#16A36A] font-bold hover:underline mt-1 inline-block"
                    >
                      Clear search filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              paginatedMembers.map((m) => {
                const initials = getInitials(m.firstName, m.lastName);
                const fullName = `${m.firstName || ""} ${m.lastName || ""}`.trim() || "Unnamed Member";
                const kycStatus = m.kycStatus || "Pending";
                const dueAmt = Number(m.dueAmount || 0);
                const memberCode = `FPO-${m._id?.slice(-6).toUpperCase()}`;

                return (
                  <tr
                    key={m._id}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    onClick={() => setDetailMember(m)}
                  >
                    {/* Member ID */}
                    <td className="px-3.5 py-2.5 font-bold font-mono text-slate-900 text-xs">
                      {memberCode}
                    </td>

                    {/* Name */}
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[11px] shrink-0">
                          {initials}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-xs leading-snug">{fullName}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {m.emailId && !m.emailId.includes("@noemail.local") ? m.emailId : "No Email"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="px-3.5 py-2.5 text-slate-700 font-semibold text-xs whitespace-nowrap">
                      {m.phone ? `+91 ${m.phone}` : "—"}
                    </td>

                    {/* Location */}
                    <td className="px-3.5 py-2.5 text-slate-600 text-xs">
                      {m.village || m.district || m.state ? (
                        <span>{[m.village, m.district, m.state].filter(Boolean).slice(0, 2).join(", ")}</span>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Role */}
                    <td className="px-3.5 py-2.5">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                        {m.role || "Farmer"}
                      </span>
                    </td>

                    {/* KYC Status */}
                    <td className="px-3.5 py-2.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          KYC_BADGE[kycStatus] || KYC_BADGE.Pending
                        }`}
                      >
                        {kycStatus}
                      </span>
                    </td>

                    {/* Due Balance */}
                    <td className="px-3.5 py-2.5 text-right font-extrabold text-xs whitespace-nowrap">
                      <span
                        className={dueAmt > 0 ? "text-rose-600" : "text-emerald-700"}
                      >
                        ₹{dueAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-3.5 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {m.role === "Farmer" && (
                          <button
                            onClick={() => setFarmMember(m)}
                            className="px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded transition cursor-pointer"
                            title="View Farms"
                          >
                            Farms
                          </button>
                        )}
                        <button
                          onClick={() => setDetailMember(m)}
                          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 6. Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center text-xs font-medium text-slate-500 pt-1 px-1">
          <span>
            Page <strong className="text-slate-800">{currentPage}</strong> of {totalPages} ({filteredMembers.length} records)
          </span>
          <div className="flex gap-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-white bg-slate-50 disabled:opacity-40 transition font-semibold text-slate-700 cursor-pointer"
            >
              Prev
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-white bg-slate-50 disabled:opacity-40 transition font-semibold text-slate-700 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Farm Details Modal */}
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

      {/* Member Details Drawer */}
      {detailMember && (
        <MemberDetailsDrawer
          member={detailMember}
          onClose={() => setDetailMember(null)}
          isReadOnly={isReadOnly}
        />
      )}
    </div>
  );
}

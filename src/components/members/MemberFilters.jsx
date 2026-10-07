import { Search, X, Filter } from "lucide-react";

export default function MemberFilters({
  searchTerm,
  setSearchTerm,
  roleFilter,
  setRoleFilter,
  kycFilter,
  setKycFilter,
}) {
  const hasActiveFilters = Boolean(searchTerm || roleFilter || kycFilter);

  return (
    <div className="bg-white border border-[#DCE5EA] rounded-xl p-2 shadow-2xs flex flex-col md:flex-row gap-2 items-center w-full shrink-0">
      {/* Search Input */}
      <div className="flex-1 relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by member name, phone, member ID, or village..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.value !== undefined ? e.value : e.target.value)}
          className="w-full pl-9 pr-8 h-9 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#16A36A] focus:border-[#16A36A] placeholder-slate-400 text-slate-800 font-medium bg-slate-50/50"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Controls Group */}
      <div className="flex items-center gap-2 w-full md:w-auto shrink-0 flex-wrap md:flex-nowrap justify-between md:justify-end">
        {/* Role Filter */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 h-9 shrink-0">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
          >
            <option value="">All Roles</option>
            <option value="Farmer">Farmer</option>
            <option value="Staff">Staff</option>
          </select>
        </div>

        {/* KYC Status Filter */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 h-9 shrink-0">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">KYC:</span>
          <select
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
          >
            <option value="">All Status</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {/* Reset Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={() => {
              setSearchTerm("");
              setRoleFilter("");
              setKycFilter("");
            }}
            className="h-9 px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition shrink-0 cursor-pointer flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

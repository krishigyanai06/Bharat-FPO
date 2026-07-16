import { Search, X } from "lucide-react";

export default function MemberFilters({
  searchTerm,
  setSearchTerm,
  roleFilter,
  setRoleFilter,
  kycFilter,
  setKycFilter,
}) {
  return (
    <>
      {/* Search Input */}
      <div className="flex-1 min-w-[240px] relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search members by name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-10 h-11 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600/10 focus:border-brand-600 bg-white placeholder-gray-400 font-medium shadow-xs"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Role Filter */}
      <div className="w-full sm:w-44 shrink-0">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full px-3 h-11 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600/10 focus:border-brand-600 bg-white cursor-pointer font-semibold text-gray-700 shadow-xs"
        >
          <option value="">All Roles</option>
          <option value="Farmer">Farmer</option>
          <option value="Staff">Staff</option>
        </select>
      </div>

      {/* KYC Status Filter */}
      <div className="w-full sm:w-44 shrink-0">
        <select
          value={kycFilter}
          onChange={(e) => setKycFilter(e.target.value)}
          className="w-full px-3 h-11 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600/10 focus:border-brand-600 bg-white cursor-pointer font-semibold text-gray-700 shadow-xs"
        >
          <option value="">KYC Status</option>
          <option value="Approved">Approved</option>
          <option value="Pending">Pending</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {/* Clear Filters Button */}
      {(searchTerm || roleFilter || kycFilter) && (
        <button
          onClick={() => {
            setSearchTerm("");
            setRoleFilter("");
            setKycFilter("");
          }}
          className="h-11 px-4 text-xs font-bold text-red-650 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition shrink-0 active:scale-95"
        >
          Reset Filters
        </button>
      )}
    </>
  );
}

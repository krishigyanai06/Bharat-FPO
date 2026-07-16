import { Users } from "lucide-react";

const KYC_BADGE = {
  Approved: "bg-emerald-100 text-emerald-800 border-emerald-250",
  Rejected: "bg-rose-105 text-rose-800 border-rose-200",
  Pending: "bg-amber-100 text-amber-800 border-amber-200",
};

const getInitials = (firstName, lastName) => {
  const f = firstName?.[0] || "";
  const l = lastName?.[0] || "";
  return (f + l).toUpperCase() || "M";
};

export default function MemberTable({
  members,
  loading,
  onViewDetails,
  onViewFarms,
  currentPage,
  totalPages,
  totalCount,
  startIndex,
  perPage,
  onPageChange,
}) {
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div className="bg-white border border-gray-250 rounded-2xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm table-fixed">
          <thead className="bg-gray-50 border-b border-gray-150 text-xs text-gray-600 uppercase font-bold tracking-wider">
            <tr>
              <th className="px-5 py-3 w-[32%]">Member Name</th>
              <th className="px-5 py-3 w-[18%]">Role & KYC</th>
              <th className="px-5 py-3 w-[16%]">Contact</th>
              <th className="px-5 py-3 w-[16%]">Location</th>
              <th className="px-5 py-3 w-[10%]">Farms / Docs</th>
              <th className="px-5 py-3 w-[8%] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-150">
            {loading ? (
              // Skeleton loading rows
              Array(5)
                .fill(0)
                .map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4" />
                          <div className="h-3 bg-gray-150 rounded w-1/2" />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 bg-gray-200 rounded w-2/3" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 bg-gray-200 rounded w-2/3" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-6 bg-gray-250 rounded w-16" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="h-8 bg-gray-200 rounded w-12 ml-auto" />
                    </td>
                  </tr>
                ))
            ) : members.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-5 py-16 text-center text-gray-400">
                  <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p className="font-semibold text-gray-905">No members found</p>
                  <p className="text-xs text-gray-400 mt-1">Try refining search parameters or register a new member.</p>
                </td>
              </tr>
            ) : (
              members.map((member) => {
                const initials = getInitials(member.firstName, member.lastName);
                const fullName = `${member.firstName || ""} ${member.lastName || ""}`.trim();
                const kycStatus = member.kycStatus || "Pending";
                const isFarmer = member.role === "Farmer";

                return (
                  <tr key={member._id} className="hover:bg-slate-50/50 transition">
                    {/* Member Column */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-50 border border-brand-100 text-brand-700 font-bold flex items-center justify-center shrink-0 text-sm select-none">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p
                            onClick={() => onViewDetails(member)}
                            className="font-bold text-gray-909 text-sm hover:text-brand-700 transition cursor-pointer truncate"
                            title={fullName}
                          >
                            {fullName}
                          </p>
                          <p className="text-xs text-gray-400 font-medium truncate mt-0.5">
                            FPO-{member._id?.slice(-6).toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role & KYC Status Column */}
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                          isFarmer
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}>
                          {member.role || "Farmer"}
                        </span>
                        {isFarmer && (
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border tracking-wide uppercase ${KYC_BADGE[kycStatus] || KYC_BADGE.Pending}`}>
                            KYC: {kycStatus}
                          </span>
                        )}
                        {!isFarmer && member.designation && (
                          <span className="text-[10px] text-gray-500 font-semibold italic">
                            {member.designation}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Contact Column */}
                    <td className="px-5 py-3 text-xs font-medium text-gray-700">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-gray-900">+91 {member.phone}</p>
                        {member.emailId && !member.emailId.includes("@noemail.local") && (
                          <p className="text-[11px] text-gray-500 truncate" title={member.emailId}>
                            {member.emailId}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Location Column */}
                    <td className="px-5 py-3 text-sm">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-gray-900 leading-tight">
                          {member.state || "—"}
                        </p>
                        {(member.village || member.district) && (
                          <p className="text-xs text-gray-500 font-medium leading-tight truncate">
                            {[member.village, member.district].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Farms Column */}
                    <td className="px-5 py-3">
                      {isFarmer ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewFarms(member);
                          }}
                          className="px-3 py-1 text-xs text-brand-600 transition border border-brand-200 rounded-lg hover:bg-brand-50 font-bold active:scale-95 shadow-xs bg-white cursor-pointer"
                        >
                          View Farms
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">N/A</span>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onViewDetails(member)}
                        className="px-3 py-1 text-xs bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold rounded-lg transition active:scale-95 cursor-pointer"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && members.length > 0 && (
        <div className="px-5 py-4 border-t border-gray-150 flex items-center justify-between text-xs font-semibold text-gray-500 select-none bg-gray-50">
          <span>
            Showing {totalCount === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + perPage, totalCount)} of {totalCount} Customers
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              Prev
            </button>
            {pages.map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-1 text-gray-400">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`w-7 h-7 rounded-lg transition cursor-pointer ${
                    currentPage === p
                      ? "bg-brand-600 text-white shadow-xs"
                      : "bg-white border border-gray-200 hover:bg-gray-50 text-gray-600"
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

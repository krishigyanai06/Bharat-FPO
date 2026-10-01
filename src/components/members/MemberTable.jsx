import { Users } from "lucide-react";

const KYC_BADGE = {
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 border-rose-200",
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
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
    <div className="bg-white border border-[#DCE5EA] rounded-xl shadow-2xs overflow-hidden flex flex-col flex-1 min-h-0">
      <div className="overflow-x-auto overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <table className="w-full border-collapse text-left text-xs table-fixed">
          <thead className="bg-[#F8FAFC] border-b border-slate-200/90 text-[11px] text-slate-500 uppercase font-bold tracking-wider sticky top-0 z-10">
            <tr>
              <th className="px-4 py-2.5 w-[28%] bg-[#F8FAFC]">Member / Farmer Name</th>
              <th className="px-4 py-2.5 w-[16%] bg-[#F8FAFC]">Role & KYC</th>
              <th className="px-4 py-2.5 w-[15%] bg-[#F8FAFC]">Contact</th>
              <th className="px-4 py-2.5 w-[14%] bg-[#F8FAFC]">Location</th>
              <th className="px-4 py-2.5 w-[13%] text-right bg-[#F8FAFC]">Due Balance</th>
              <th className="px-4 py-2.5 w-[7%] text-center bg-[#F8FAFC]">Farms</th>
              <th className="px-4 py-2.5 w-[7%] text-right bg-[#F8FAFC]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
            {loading ? (
              // Skeleton loading rows
              Array(6)
                .fill(0)
                .map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200" />
                        <div className="space-y-1 flex-1">
                          <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                          <div className="h-2.5 bg-slate-150 rounded w-1/2" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-3.5 bg-slate-200 rounded w-2/3" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-3.5 bg-slate-200 rounded w-2/3" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="h-4 bg-slate-200 rounded w-16 ml-auto" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="h-6 bg-slate-200 rounded w-12 mx-auto" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="h-6 bg-slate-200 rounded w-12 ml-auto" />
                    </td>
                  </tr>
                ))
            ) : members.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-5 py-16 text-center text-slate-400">
                  <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-xs text-slate-600">No members found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Try refining search parameters or register a new member.</p>
                </td>
              </tr>
            ) : (
              members.map((member) => {
                const initials = getInitials(member.firstName, member.lastName);
                const fullName = `${member.firstName || ""} ${member.lastName || ""}`.trim();
                const kycStatus = member.kycStatus || "Pending";
                const isFarmer = member.role === "Farmer";
                const dueAmt = Number(member.dueAmount || 0);
                const memberCode = `FPO-${member._id?.slice(-6).toUpperCase()}`;

                return (
                  <tr
                    key={member._id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => onViewDetails(member)}
                  >
                    {/* Member Column */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs select-none">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p
                            className="font-bold text-slate-900 text-xs hover:text-[#16A36A] transition truncate"
                            title={fullName}
                          >
                            {fullName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono font-medium truncate">
                            {memberCode}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role & KYC Status Column */}
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col gap-0.5 items-start">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border ${
                          isFarmer
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                            : "bg-blue-50 text-blue-700 border-blue-200/80"
                        }`}>
                          {member.role || "Farmer"}
                        </span>
                        {isFarmer && (
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border tracking-wide uppercase ${KYC_BADGE[kycStatus] || KYC_BADGE.Pending}`}>
                            KYC: {kycStatus}
                          </span>
                        )}
                        {!isFarmer && member.designation && (
                          <span className="text-[10px] text-slate-500 font-medium italic truncate max-w-[120px]">
                            {member.designation}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Contact Column */}
                    <td className="px-4 py-2.5 text-xs font-medium text-slate-700">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-900">+91 {member.phone}</p>
                        {member.emailId && !member.emailId.includes("@noemail.local") && (
                          <p className="text-[10px] text-slate-400 truncate max-w-[140px]" title={member.emailId}>
                            {member.emailId}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Location Column */}
                    <td className="px-4 py-2.5 text-xs">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-800 leading-tight truncate">
                          {member.state || "—"}
                        </p>
                        {(member.village || member.district) && (
                          <p className="text-[10px] text-slate-400 font-medium leading-tight truncate max-w-[130px]">
                            {[member.village, member.district].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Due Balance Column */}
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {isFarmer ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-extrabold border ${
                            dueAmt > 0
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}>
                            ₹{dueAmt.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                          </span>
                          {member.dueAmountNote && (
                            <span className="text-[9px] text-slate-400 font-medium truncate max-w-[100px]" title={member.dueAmountNote}>
                              {member.dueAmountNote}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">—</span>
                      )}
                    </td>

                    {/* Farms Column */}
                    <td className="px-4 py-2.5 text-center">
                      {isFarmer ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewFarms(member);
                          }}
                          className="px-2 py-1 text-[11px] text-emerald-700 transition border border-emerald-200 rounded-md hover:bg-emerald-50 font-bold bg-white cursor-pointer"
                        >
                          Farms
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">—</span>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onViewDetails(member)}
                        className="px-2.5 py-1 text-[11px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-md transition cursor-pointer"
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
        <div className="shrink-0 px-4 py-2.5 border-t border-slate-200/90 flex items-center justify-between text-xs font-medium text-slate-500 bg-[#F8FAFC]">
          <span>
            Showing <strong className="text-slate-800 font-bold">{totalCount === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + perPage, totalCount)}</strong> of <strong className="text-slate-800 font-bold">{totalCount}</strong> Customers
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-700 transition cursor-pointer"
            >
              Prev
            </button>
            {pages.map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-1 text-slate-400">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`w-6 h-6 text-xs rounded-md transition font-bold cursor-pointer flex items-center justify-center ${
                    currentPage === p
                      ? "bg-[#16A36A] text-white shadow-2xs"
                      : "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-700 transition cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

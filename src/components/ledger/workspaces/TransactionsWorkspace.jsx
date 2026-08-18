import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Search,
  Download,
  X,
  RefreshCw,
  Eye,
  AlertCircle,
  Tag,
  Filter,
  TrendingUp,
  User,
} from "lucide-react";
import SearchableSelect from "../../common/SearchableSelect";
import DateRangePicker from "../common/DateRangePicker";
import SortIcon from "../common/SortIcon";
import {
  TYPE_CONFIG,
  REFERENCE_TYPES,
  fmt,
  fmtDateOnly,
  formatRefNo,
  exportCSV,
} from "../utils/ledgerHelpers";

const ITEMS_PER_PAGE = 12;

export default function TransactionsWorkspace({
  entries = [],
  resolvedTransactions = [],
  partyOptions = [],
  farmerOptions = [],
  loading = false,
  error = null,
  onRefresh,
  onSelectEntry,
  initialRefType = "ALL",
}) {
  const [txnSearch, setTxnSearch] = useState("");
  const [txnRefType, setTxnRefType] = useState(initialRefType);
  const [txnEntryType, setTxnEntryType] = useState("ALL");
  const [txnPartyFilter, setTxnPartyFilter] = useState("ALL");
  const [txnFromDate, setTxnFromDate] = useState("");
  const [txnToDate, setTxnToDate] = useState("");
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setCurrentPage(1);
  };

  const filteredTransactions = useMemo(() => {
    let result = resolvedTransactions.filter((e) => {
      const puName = (e.partyOrUser?.name || "").toLowerCase();
      const puPhone = String(e.partyOrUser?.phone || "");
      const refId = String(e.referenceId || "").toLowerCase();
      const formattedRef = formatRefNo(e).toLowerCase();
      const refType = String(e.referenceType || "").toLowerCase();
      const q = txnSearch.trim().toLowerCase();

      const matchSearch =
        !q ||
        puName.includes(q) ||
        puPhone.includes(q) ||
        refId.includes(q) ||
        formattedRef.includes(q) ||
        refType.includes(q);

      const matchRefType =
        txnRefType === "ALL" ||
        String(e.referenceType || "").toUpperCase() === txnRefType.toUpperCase();
      const matchType =
        txnEntryType === "ALL" ||
        String(e.type || "").toUpperCase() === txnEntryType.toUpperCase();
      const matchParty =
        txnPartyFilter === "ALL" ||
        String(e.partyOrUser?._id) === String(txnPartyFilter) ||
        String(e.party?._id || e.party) === String(txnPartyFilter) ||
        String(e.user?._id || e.user) === String(txnPartyFilter);

      let matchFrom = true;
      let matchTo = true;
      if (e.createdAt) {
        const entryDate = new Date(e.createdAt);
        if (!isNaN(entryDate.getTime())) {
          if (txnFromDate) {
            matchFrom = entryDate >= new Date(txnFromDate);
          }
          if (txnToDate) {
            matchTo = entryDate <= new Date(txnToDate + "T23:59:59");
          }
        }
      }

      return (
        matchSearch &&
        matchRefType &&
        matchType &&
        matchParty &&
        matchFrom &&
        matchTo
      );
    });

    result = [...result].sort((a, b) => {
      if (sortField === "date") {
        const diff = new Date(a.createdAt) - new Date(b.createdAt);
        return sortDir === "asc" ? diff : -diff;
      }
      if (sortField === "amount") {
        const diff = Number(a.amount || 0) - Number(b.amount || 0);
        return sortDir === "asc" ? diff : -diff;
      }
      return 0;
    });

    return result;
  }, [
    resolvedTransactions,
    txnSearch,
    txnRefType,
    txnEntryType,
    txnPartyFilter,
    txnFromDate,
    txnToDate,
    sortField,
    sortDir,
  ]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTransactions = filteredTransactions.slice(
    start,
    start + ITEMS_PER_PAGE
  );

  const resetTxnFilters = () => {
    setTxnSearch("");
    setTxnRefType("ALL");
    setTxnEntryType("ALL");
    setTxnPartyFilter("ALL");
    setTxnFromDate("");
    setTxnToDate("");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Workspace Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-gray-800">
            Ledger Transactions
          </h2>
          <span className="bg-brand-50 text-brand-700 font-semibold px-2 py-0.5 rounded-full text-xs border border-brand-200">
            {entries.length} recorded
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            type="button"
            onClick={() =>
              exportCSV(filteredTransactions, "all_transactions")
            }
            disabled={filteredTransactions.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" /> Filter Ledger Entries
          </span>
          {(txnSearch ||
            txnRefType !== "ALL" ||
            txnEntryType !== "ALL" ||
            txnPartyFilter !== "ALL" ||
            txnFromDate ||
            txnToDate) && (
            <button
              type="button"
              onClick={resetTxnFilters}
              className="text-xs text-red-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Reset Filters
            </button>
          )}
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          {/* Search Input */}
          <div className="lg:col-span-4 space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-gray-400" /> Search
            </label>
            <div className="relative">
              <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
              <input
                type="text"
                placeholder="Search party, phone, reference..."
                value={txnSearch}
                onChange={(e) => {
                  setTxnSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full py-2.5 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-xl pl-9 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 font-medium text-gray-900"
              />
            </div>
          </div>

          {/* Party / Farmer Filter using SearchableSelect */}
          <div className="lg:col-span-3">
            <SearchableSelect
              options={[
                {
                  id: "ALL",
                  name: "All Parties & Farmers",
                  phone: "—",
                  badge: "ALL",
                  initials: "ALL",
                },
                ...farmerOptions,
                ...partyOptions,
              ]}
              value={txnPartyFilter}
              onChange={(val) => {
                setTxnPartyFilter(val);
                setCurrentPage(1);
              }}
              placeholder="Filter by party or farmer..."
              label="Party / Farmer"
              icon={User}
            />
          </div>

          {/* Reference Type Filter */}
          <div className="lg:col-span-3 space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-gray-400" /> Reference Type
            </label>
            <select
              value={txnRefType}
              onChange={(e) => {
                setTxnRefType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2.5 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 text-gray-700 font-medium cursor-pointer"
            >
              {REFERENCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter (Credit / Debit) */}
          <div className="lg:col-span-2 space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-gray-400" /> Type
            </label>
            <select
              value={txnEntryType}
              onChange={(e) => {
                setTxnEntryType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2.5 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 text-gray-700 font-medium cursor-pointer"
            >
              <option value="ALL">All Credit / Debit</option>
              <option value="CREDIT">CREDIT</option>
              <option value="DEBIT">DEBIT</option>
            </select>
          </div>

          {/* Compact & Clickable Anywhere Date Range Picker */}
          <div className="lg:col-span-12 pt-2 border-t border-gray-100">
            <DateRangePicker
              fromDate={txnFromDate}
              toDate={txnToDate}
              onFromChange={(val) => {
                setTxnFromDate(val);
                setCurrentPage(1);
              }}
              onToChange={(val) => {
                setTxnToDate(val);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* Transactions Table Container */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse flex items-center justify-between py-2"
              >
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
                <div className="h-4 bg-gray-200 rounded w-1/8" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-600 space-y-2">
            <AlertCircle className="w-10 h-10 mx-auto text-red-500" />
            <p className="font-bold text-sm">Unable to load ledger data</p>
            <p className="text-xs text-gray-500">{error}</p>
            <button
              type="button"
              onClick={onRefresh}
              className="mt-2 px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-16 text-center text-gray-500 space-y-2">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="font-bold text-sm">No ledger transactions found</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              No records match your selected filters or database contains no entry.
            </p>
            <button
              type="button"
              onClick={onRefresh}
              className="mt-2 px-4 py-2 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-xl hover:bg-brand-100 transition cursor-pointer"
            >
              Refresh Data
            </button>
          </div>
        ) : (
          <>
            {/* Desktop ERP Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider sticky top-0">
                  <tr>
                    <th
                      className="px-4 py-3 cursor-pointer select-none"
                      onClick={() => handleSort("date")}
                    >
                      Date{" "}
                      <SortIcon
                        field="date"
                        sortField={sortField}
                        sortDir={sortDir}
                      />
                    </th>
                    <th className="px-4 py-3">Party / Farmer</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Reference Type</th>
                    <th className="px-4 py-3">Reference Number</th>
                    <th className="px-4 py-3">Credit / Debit</th>
                    <th
                      className="px-4 py-3 text-right cursor-pointer select-none"
                      onClick={() => handleSort("amount")}
                    >
                      Amount{" "}
                      <SortIcon
                        field="amount"
                        sortField={sortField}
                        sortDir={sortDir}
                      />
                    </th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedTransactions.map((entry, idx) => {
                    const pu = entry.partyOrUser;
                    const refConfig =
                      TYPE_CONFIG[entry.referenceType] || {};
                    const isCredit = entry.type === "CREDIT";
                    const refFormatted = formatRefNo(entry);

                    return (
                      <tr
                        key={entry._id || idx}
                        className="hover:bg-gray-50/80 transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-600 font-medium whitespace-nowrap">
                          {fmtDateOnly(entry.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-[10px] ${
                                pu.isDeleted
                                  ? "bg-gray-200 text-gray-400"
                                  : "bg-brand-50 text-brand-700 border border-brand-200"
                              }`}
                            >
                              {pu.initials}
                            </div>
                            <span
                              className={`font-semibold text-xs ${
                                pu.isDeleted
                                  ? "text-gray-400 italic"
                                  : "text-gray-900"
                              }`}
                            >
                              {pu.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 font-mono">
                          {pu.phone}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full ${
                              refConfig.badge || "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {refConfig.label || entry.referenceType || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-700 text-xs">
                          <span
                            className="bg-gray-50 border border-gray-200 text-gray-700 px-2 py-0.5 rounded-md font-mono font-semibold text-[11px]"
                            title={
                              entry.referenceId
                                ? `Full ID: ${entry.referenceId}`
                                : ""
                            }
                          >
                            {refFormatted}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                              isCredit
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {entry.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-sm">
                          <span
                            className={
                              isCredit ? "text-green-600" : "text-red-600"
                            }
                          >
                            {isCredit ? "+" : "-"}
                            {fmt(entry.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => onSelectEntry(entry)}
                            className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition cursor-pointer"
                            title="View Details Drawer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {paginatedTransactions.map((entry, idx) => {
                const pu = entry.partyOrUser;
                const refConfig = TYPE_CONFIG[entry.referenceType] || {};
                const isCredit = entry.type === "CREDIT";

                return (
                  <div
                    key={entry._id || idx}
                    onClick={() => onSelectEntry(entry)}
                    className="p-3.5 hover:bg-gray-50 active:bg-gray-100 cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-[10px] ${
                            pu.isDeleted
                              ? "bg-gray-200 text-gray-400"
                              : "bg-brand-50 text-brand-700"
                          }`}
                        >
                          {pu.initials}
                        </div>
                        <span
                          className={`text-xs font-bold truncate ${
                            pu.isDeleted
                              ? "text-gray-400 italic"
                              : "text-gray-900"
                          }`}
                        >
                          {pu.name}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-bold ${
                          isCredit ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {isCredit ? "+" : "-"}
                        {fmt(entry.amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                            isCredit
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {entry.type}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                            refConfig.badge || "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {refConfig.label || entry.referenceType || "—"}
                        </span>
                      </div>
                      <span className="font-mono text-gray-600 text-[10px]">
                        {formatRefNo(entry)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
                <span>
                  Showing {start + 1}–
                  {Math.min(
                    start + ITEMS_PER_PAGE,
                    filteredTransactions.length
                  )}{" "}
                  of {filteredTransactions.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="px-2.5 py-1 border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
                  >
                    Prev
                  </button>
                  <span className="px-2 font-semibold">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="px-2.5 py-1 border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

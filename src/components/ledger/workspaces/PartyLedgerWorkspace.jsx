import React, { useState, useMemo } from "react";
import {
  Building2,
  Printer,
  Download,
  Filter,
  MapPin,
  BookOpen,
} from "lucide-react";
import SearchableSelect from "../../common/SearchableSelect";
import DateRangePicker from "../common/DateRangePicker";
import FinancialSummaryCards from "../common/FinancialSummaryCards";
import {
  TYPE_CONFIG,
  REFERENCE_TYPES,
  fmt,
  fmtDateOnly,
  formatRefNo,
  getInitials,
  exportCSV,
  printStatementPdf,
} from "../utils/ledgerHelpers";

export default function PartyLedgerWorkspace({
  selectedPartyId = "",
  onSelectParty,
  selectedPartyObj = null,
  partyOptions = [],
  partyBalanceDetails = null,
  partyInfo = null,
  resolvedTransactions = [],
  parties = [],
  partyMap = {},
}) {
  const [partyRefFilter, setPartyRefFilter] = useState("ALL");
  const [partyFromDate, setPartyFromDate] = useState("");
  const [partyToDate, setPartyToDate] = useState("");

  const partyTransactions = useMemo(() => {
    if (!selectedPartyId) return [];
    if (resolvedTransactions.length === 0) return [];

    const targetId = String(selectedPartyId).toLowerCase();
    const selPartyObj =
      partyMap[selectedPartyId] ||
      parties.find((p) => String(p._id || p.id) === selectedPartyId);

    const selGstin = (
      selPartyObj?.gstin ||
      selPartyObj?.gstNumber ||
      ""
    ).toLowerCase();
    const selPhone = (
      selPartyObj?.phone ||
      selPartyObj?.mobile ||
      ""
    ).trim();
    const selName = (
      selPartyObj?.partyName ||
      selPartyObj?.name ||
      `${selPartyObj?.firstName || ""} ${selPartyObj?.lastName || ""}`
    )
      .trim()
      .toLowerCase();

    // If fetched specifically for party via fetchLedgerByParty, include all entries
    if (
      partyInfo ||
      (partyBalanceDetails && Object.keys(partyBalanceDetails).length > 0)
    ) {
      return resolvedTransactions;
    }

    return resolvedTransactions.filter((e) => {
      // 1. Direct ID match on resolved partyOrUser ID
      const puId = String(e.partyOrUser?._id || "").toLowerCase();
      if (puId && puId !== "unknown" && puId === targetId) return true;

      // 2. Direct ID match on raw entry fields
      const ePartyId = String(
        e.party?._id || e.party || e.partyId || ""
      ).toLowerCase();
      const eUserId = String(
        e.user?._id ||
          e.user ||
          e.userId ||
          e.farmerId ||
          e.buyerId ||
          e.supplierId ||
          ""
      ).toLowerCase();
      if (
        (ePartyId && ePartyId === targetId) ||
        (eUserId && eUserId === targetId)
      ) {
        return true;
      }

      // 3. Match on GSTIN if available
      if (selGstin) {
        const eGstin = String(
          e.gstin ||
            e.partyGstin ||
            e.buyerGstin ||
            e.partyOrUser?.raw?.gstin ||
            e.partyOrUser?.raw?.gstNumber ||
            ""
        ).toLowerCase();
        if (eGstin && eGstin === selGstin) return true;
      }

      // 4. Match on Phone if available
      if (selPhone && selPhone !== "—") {
        const ePhone = String(
          e.phone || e.mobile || e.partyOrUser?.phone || ""
        ).trim();
        if (ePhone && ePhone === selPhone) return true;
      }

      // 5. Match on Name if available
      if (selName) {
        const eName = String(
          e.partyName ||
            e.buyerName ||
            e.supplierName ||
            e.farmerName ||
            e.customerName ||
            e.partyOrUser?.name ||
            ""
        )
          .trim()
          .toLowerCase();
        if (
          eName &&
          (eName === selName ||
            eName.includes(selName) ||
            selName.includes(eName))
        ) {
          return true;
        }
      }

      return true;
    });
  }, [
    resolvedTransactions,
    selectedPartyId,
    partyMap,
    parties,
    partyInfo,
    partyBalanceDetails,
  ]);

  const filteredPartyTxns = useMemo(() => {
    return partyTransactions.filter((e) => {
      const matchRef =
        partyRefFilter === "ALL" || e.referenceType === partyRefFilter;
      const entryDate = new Date(e.createdAt);
      const matchFrom = !partyFromDate || entryDate >= new Date(partyFromDate);
      const matchTo =
        !partyToDate || entryDate <= new Date(partyToDate + "T23:59:59");
      return matchRef && matchFrom && matchTo;
    });
  }, [partyTransactions, partyRefFilter, partyFromDate, partyToDate]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            Party Ledger & Account Statement
          </h2>
          <p className="text-xs text-gray-500">
            Select any Vendor, Customer, or Party to view their statement
          </p>
        </div>
        {selectedPartyObj && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                printStatementPdf(
                  "Party Account Statement",
                  selectedPartyObj.partyName ||
                    selectedPartyObj.name ||
                    "Party Statement",
                  `Type: ${
                    selectedPartyObj.partyType ||
                    selectedPartyObj.role ||
                    "Party"
                  } | GSTIN: ${selectedPartyObj.gstin || "N/A"} | Phone: ${
                    selectedPartyObj.phone ||
                    selectedPartyObj.mobile ||
                    "—"
                  }`,
                  filteredPartyTxns,
                  partyBalanceDetails
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Export PDF
            </button>
            <button
              type="button"
              onClick={() =>
                exportCSV(
                  filteredPartyTxns,
                  `party_${(
                    selectedPartyObj.name || "statement"
                  ).replace(/\s+/g, "_")}`,
                  partyBalanceDetails
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        )}
      </div>

      {/* Party Search & Selection Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          {/* Searchable Combobox */}
          <div className="lg:col-span-6">
            <SearchableSelect
              options={partyOptions}
              value={selectedPartyId}
              onChange={onSelectParty}
              placeholder="Type party name or phone to search..."
              label={`Search & Select Party / Vendor (${partyOptions.length} available)`}
              icon={Building2}
            />
          </div>

          {/* Reference Type Filter */}
          <div className="lg:col-span-6 space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-gray-400" /> Filter Reference
              Type
            </label>
            <select
              value={partyRefFilter}
              onChange={(e) => setPartyRefFilter(e.target.value)}
              className="w-full py-2.5 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 text-gray-700 font-medium cursor-pointer"
            >
              {REFERENCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Picker */}
          <div className="lg:col-span-12 pt-2 border-t border-gray-100">
            <DateRangePicker
              fromDate={partyFromDate}
              toDate={partyToDate}
              onFromChange={setPartyFromDate}
              onToChange={setPartyToDate}
            />
          </div>
        </div>
      </div>

      {/* Selected Party Summary Card */}
      {selectedPartyObj ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 font-black text-base flex items-center justify-center">
                {getInitials(
                  selectedPartyObj.partyName ||
                    selectedPartyObj.name ||
                    "Party"
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 leading-tight">
                  {selectedPartyObj.partyName ||
                    selectedPartyObj.name ||
                    "Party Statement"}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Phone:{" "}
                  <span className="font-mono font-semibold text-gray-700">
                    {selectedPartyObj.phone ||
                      selectedPartyObj.mobile ||
                      "—"}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg border border-gray-200">
                {selectedPartyObj.partyType ||
                  selectedPartyObj.role ||
                  "Party"}
              </span>
              {selectedPartyObj.gstin && (
                <span className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                  GSTIN: {selectedPartyObj.gstin}
                </span>
              )}
            </div>
          </div>

          {/* Address / Details if available */}
          {(selectedPartyObj.address ||
            selectedPartyObj.village ||
            selectedPartyObj.district) && (
            <p className="text-xs text-gray-600 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              Address:{" "}
              {[
                selectedPartyObj.address,
                selectedPartyObj.village,
                selectedPartyObj.district,
                selectedPartyObj.state,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}

          {/* Financial Balance Summary Cards from API balanceDetails */}
          <FinancialSummaryCards
            balanceDetails={partyBalanceDetails}
            variant="party"
          />

          {/* Statement Table */}
          <div className="pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Account Statement ({filteredPartyTxns.length} records)
            </h4>
            {filteredPartyTxns.length === 0 ? (
              <div className="py-12 text-center text-gray-400 bg-gray-50 rounded-xl border border-gray-200">
                <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold">
                  No transactions found for this party.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Reference Type</th>
                      <th className="px-4 py-3">Reference Number</th>
                      <th className="px-4 py-3 text-right">Debit</th>
                      <th className="px-4 py-3 text-right">Credit</th>
                      <th className="px-4 py-3 text-center">Type Badge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPartyTxns.map((entry, idx) => {
                      const refConfig =
                        TYPE_CONFIG[entry.referenceType] || {};
                      const isCredit = entry.type === "CREDIT";
                      return (
                        <tr
                          key={entry._id || idx}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-4 py-3 text-gray-600 font-medium">
                            {fmtDateOnly(entry.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                                refConfig.badge || "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {refConfig.label ||
                                entry.referenceType ||
                                "—"}
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
                              {formatRefNo(entry)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-red-600">
                            {!isCredit ? fmt(entry.amount) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-green-600">
                            {isCredit ? fmt(entry.amount) : "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
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
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400 space-y-2">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-sm font-semibold text-gray-600">
            Please select a party above
          </p>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Search or select any vendor or customer from the search box above
            to display their transaction statement.
          </p>
        </div>
      )}
    </div>
  );
}

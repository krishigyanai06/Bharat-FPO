import React, { useState, useMemo } from "react";
import {
  User,
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

export default function FarmerLedgerWorkspace({
  selectedFarmerId = "",
  onSelectFarmer,
  selectedFarmerObj = null,
  farmerOptions = [],
  partyBalanceDetails = null,
  partyInfo = null,
  resolvedTransactions = [],
  farmerList = [],
  partyMap = {},
}) {
  const [farmerRefFilter, setFarmerRefFilter] = useState("ALL");
  const [farmerFromDate, setFarmerFromDate] = useState("");
  const [farmerToDate, setFarmerToDate] = useState("");

  const farmerTransactions = useMemo(() => {
    if (!selectedFarmerId) return [];
    if (resolvedTransactions.length === 0) return [];

    const targetId = String(selectedFarmerId).toLowerCase();
    const selFarmerObj =
      partyMap[selectedFarmerId] ||
      farmerList.find((f) => String(f._id || f.id) === selectedFarmerId);

    const selPhone = (
      selFarmerObj?.phone ||
      selFarmerObj?.mobile ||
      ""
    ).trim();
    const selName = (
      selFarmerObj?.partyName ||
      selFarmerObj?.name ||
      `${selFarmerObj?.firstName || ""} ${selFarmerObj?.lastName || ""}`
    )
      .trim()
      .toLowerCase();
    const selMemberId = String(selFarmerObj?.memberId || "").toLowerCase();

    // If fetched specifically for party/farmer via fetchLedgerByUser, include all entries
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
        e.user?._id || e.user || e.userId || e.farmerId || ""
      ).toLowerCase();
      if (
        (ePartyId && ePartyId === targetId) ||
        (eUserId && eUserId === targetId)
      ) {
        return true;
      }

      // 3. Match on Phone if available
      if (selPhone && selPhone !== "—") {
        const ePhone = String(
          e.phone || e.mobile || e.partyOrUser?.phone || ""
        ).trim();
        if (ePhone && ePhone === selPhone) return true;
      }

      // 4. Match on Member ID if available
      if (selMemberId) {
        const eMemberId = String(
          e.memberId ||
            e.farmerMemberId ||
            e.partyOrUser?.raw?.memberId ||
            ""
        ).toLowerCase();
        if (eMemberId && eMemberId === selMemberId) return true;
      }

      // 5. Match on Name if available
      if (selName) {
        const eName = String(
          e.partyName ||
            e.farmerName ||
            e.buyerName ||
            e.supplierName ||
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
    selectedFarmerId,
    partyMap,
    farmerList,
    partyInfo,
    partyBalanceDetails,
  ]);

  const filteredFarmerTxns = useMemo(() => {
    return farmerTransactions.filter((e) => {
      const matchRef =
        farmerRefFilter === "ALL" || e.referenceType === farmerRefFilter;
      const entryDate = new Date(e.createdAt);
      const matchFrom =
        !farmerFromDate || entryDate >= new Date(farmerFromDate);
      const matchTo =
        !farmerToDate || entryDate <= new Date(farmerToDate + "T23:59:59");
      return matchRef && matchFrom && matchTo;
    });
  }, [farmerTransactions, farmerRefFilter, farmerFromDate, farmerToDate]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            Farmer Ledger & Financial History
          </h2>
          <p className="text-xs text-gray-500">
            Select any member or farmer ({farmerOptions.length} available) to
            view procurement & payment statements
          </p>
        </div>
        {selectedFarmerObj && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                printStatementPdf(
                  "Farmer Account Statement",
                  selectedFarmerObj.partyName ||
                    selectedFarmerObj.name ||
                    `${selectedFarmerObj.firstName || ""} ${
                      selectedFarmerObj.lastName || ""
                    }`.trim(),
                  `Member ID: ${
                    selectedFarmerObj.memberId || "N/A"
                  } | Village: ${
                    selectedFarmerObj.village || "N/A"
                  } | Phone: ${
                    selectedFarmerObj.phone ||
                    selectedFarmerObj.mobile ||
                    "—"
                  }`,
                  filteredFarmerTxns,
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
                  filteredFarmerTxns,
                  `farmer_${(
                    selectedFarmerObj.name || "statement"
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

      {/* Farmer Search & Selection Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          {/* Searchable Combobox */}
          <div className="lg:col-span-6">
            <SearchableSelect
              options={farmerOptions}
              value={selectedFarmerId}
              onChange={onSelectFarmer}
              placeholder="Type farmer name, village, or phone to search..."
              label={`Search & Select Farmer / Member (${farmerOptions.length} available)`}
              icon={User}
            />
          </div>

          {/* Reference Type Filter */}
          <div className="lg:col-span-6 space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-gray-400" /> Filter Reference
              Type
            </label>
            <select
              value={farmerRefFilter}
              onChange={(e) => setFarmerRefFilter(e.target.value)}
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
              fromDate={farmerFromDate}
              toDate={farmerToDate}
              onFromChange={setFarmerFromDate}
              onToChange={setFarmerToDate}
            />
          </div>
        </div>
      </div>

      {/* Selected Farmer Summary Card */}
      {selectedFarmerObj ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-brand-50 border border-brand-200 text-brand-700 font-black text-base flex items-center justify-center">
                {getInitials(
                  selectedFarmerObj.partyName ||
                    selectedFarmerObj.name ||
                    `${selectedFarmerObj.firstName || ""} ${
                      selectedFarmerObj.lastName || ""
                    }`.trim()
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 leading-tight">
                  {selectedFarmerObj.partyName ||
                    selectedFarmerObj.name ||
                    `${selectedFarmerObj.firstName || ""} ${
                      selectedFarmerObj.lastName || ""
                    }`.trim()}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Phone:{" "}
                  <span className="font-mono font-semibold text-gray-700">
                    {selectedFarmerObj.phone ||
                      selectedFarmerObj.mobile ||
                      "—"}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {selectedFarmerObj.memberId && (
                <span className="px-2.5 py-1 text-xs font-semibold bg-brand-50 text-brand-700 rounded-lg border border-brand-200">
                  Member ID: {selectedFarmerObj.memberId}
                </span>
              )}
              {selectedFarmerObj.village && (
                <span className="px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg border border-gray-200">
                  Village: {selectedFarmerObj.village}
                </span>
              )}
            </div>
          </div>

          {/* Address / Location if available */}
          {(selectedFarmerObj.village ||
            selectedFarmerObj.district ||
            selectedFarmerObj.state ||
            selectedFarmerObj.address) && (
            <p className="text-xs text-gray-600 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              Location:{" "}
              {[
                selectedFarmerObj.address,
                selectedFarmerObj.village,
                selectedFarmerObj.district,
                selectedFarmerObj.state,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}

          {/* Financial Balance Summary Cards from API balanceDetails */}
          <FinancialSummaryCards
            balanceDetails={partyBalanceDetails}
            variant="farmer"
          />

          {/* Statement Table */}
          <div className="pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Farmer Statement ({filteredFarmerTxns.length} records)
            </h4>
            {filteredFarmerTxns.length === 0 ? (
              <div className="py-12 text-center text-gray-400 bg-gray-50 rounded-xl border border-gray-200">
                <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold">
                  No ledger available for this farmer.
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
                    {filteredFarmerTxns.map((entry, idx) => {
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
          <User className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-sm font-semibold text-gray-600">
            Please search or select a farmer above
          </p>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Type name, village, or phone in the search box above to choose any
            farmer ({farmerOptions.length} available) and view their financial
            statement.
          </p>
        </div>
      )}
    </div>
  );
}

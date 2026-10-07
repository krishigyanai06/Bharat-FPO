import React from "react";
import toast from "react-hot-toast";
import { Search, FileSpreadsheet, ChevronDown } from "lucide-react";

export default function PurchaseFilters({
  activeTab,
  searchQuery,
  setSearchQuery,
  handleSearchSubmit,
  handleResetFilters,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  purchaseTypeFilter,
  setPurchaseTypeFilter,
  billingTypeFilter,
  setBillingTypeFilter,
  partyFilter,
  setPartyFilter,
  parties = [],
  setCurrentPage,
}) {
  return (
    <div className="bg-[#FAFBFC] border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-4">
      {/* Row 1: Search & Reset / Export */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-[360px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-405 hover:text-slate-600 transition" />
          <input
            type="text"
            placeholder="Search Bill No, Vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 h-[42px] text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-555/10 focus:border-emerald-500 placeholder-slate-400 bg-white transition-all font-semibold text-slate-800"
          />
        </form>

        <div className="flex items-center gap-2.5 self-stretch md:self-auto justify-end">
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 px-4 h-[42px] text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition active:scale-95 cursor-pointer shadow-3xs"
          >
            Reset Filters
          </button>
          <button
            type="button"
            onClick={() => {
              toast.success("Excel sheet export started...");
            }}
            className="flex items-center gap-1.5 px-4 h-[42px] text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition active:scale-95 cursor-pointer shadow-3xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Row 2: Advanced filters */}
      <div className="flex flex-wrap items-end gap-4 w-full pt-4 border-t border-slate-100">
        {/* Date Range Group */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Date Range</span>
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 h-[42px]">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs border-0 focus:ring-0 focus:outline-none bg-transparent cursor-pointer font-semibold text-slate-700 w-[115px]"
            />
            <span className="text-slate-300 text-xs">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs border-0 focus:ring-0 focus:outline-none bg-transparent cursor-pointer font-semibold text-slate-700 w-[115px]"
            />
          </div>
        </div>

        {activeTab === "purchases" && (
          <>
            {/* Document Type Dropdown */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[140px] md:max-w-[180px]">
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Document Type</span>
              <div className="relative">
                <select
                  value={purchaseTypeFilter}
                  onChange={(e) => {
                    setPurchaseTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-3.5 pr-8 h-[42px] text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white cursor-pointer font-semibold text-slate-700 appearance-none"
                >
                  <option value="">All Documents</option>
                  <option value="BILL">Purchase Bill</option>
                  <option value="ORDER">Purchase Order</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450 pointer-events-none" />
              </div>
            </div>

            {/* Billing Type Dropdown */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[140px] md:max-w-[180px]">
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Billing Type</span>
              <div className="relative">
                <select
                  value={billingTypeFilter}
                  onChange={(e) => {
                    setBillingTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-3.5 pr-8 h-[42px] text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white cursor-pointer font-semibold text-slate-700 appearance-none"
                >
                  <option value="">Cash / Credit</option>
                  <option value="Cash">Cash</option>
                  <option value="Credit">Credit</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-455 pointer-events-none" />
              </div>
            </div>
          </>
        )}

        {/* Supplier Dropdown */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[180px] md:max-w-[240px]">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Supplier</span>
          <div className="relative">
            <select
              value={partyFilter}
              onChange={(e) => {
                setPartyFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-3.5 pr-8 h-[42px] text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white cursor-pointer font-semibold text-slate-700 appearance-none"
            >
              <option value="">All Suppliers</option>
              {parties.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-455 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { fmt, getDueStatusBadge } from "../utils/ledgerHelpers";

export default function FinancialSummaryCards({
  balanceDetails,
  variant = "party",
}) {
  if (!balanceDetails) return null;

  const isFarmer = variant === "farmer";

  return (
    <div
      className={`grid gap-3 pt-2 ${
        isFarmer
          ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
          : "grid-cols-2 sm:grid-cols-4"
      }`}
    >
      {/* 1. Opening Balance (For Farmer variant or when opening balance exists) */}
      {isFarmer && (
        <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
            Opening Balance
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-base font-extrabold text-gray-850">
              {fmt(
                balanceDetails.periodOpeningBalance?.amount ??
                  balanceDetails.profileOpeningBalance ??
                  0
              )}
            </span>
            {(balanceDetails.periodOpeningBalance?.balanceType ||
              balanceDetails.profileOpeningBalanceType) && (
              <span className="text-[9px] font-bold bg-gray-200/80 text-gray-700 px-1.5 py-0.2 rounded uppercase">
                {balanceDetails.periodOpeningBalance?.balanceType ||
                  balanceDetails.profileOpeningBalanceType}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 2. Total Credit */}
      <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl p-3 shadow-2xs">
        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
          Total Credit
        </span>
        <span className="text-base font-extrabold text-emerald-600 mt-0.5 block">
          {fmt(balanceDetails.totalCredit ?? 0)}
        </span>
      </div>

      {/* 3. Total Debit */}
      <div className="bg-rose-50/50 border border-rose-200/70 rounded-xl p-3 shadow-2xs">
        <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
          Total Debit
        </span>
        <span className="text-base font-extrabold text-rose-600 mt-0.5 block">
          {fmt(balanceDetails.totalDebit ?? 0)}
        </span>
      </div>

      {/* 4. Current Balance */}
      <div className="bg-brand-50/70 border border-brand-200 rounded-xl p-3 shadow-2xs">
        <span className="text-[10px] font-bold text-brand-800 uppercase tracking-wider block">
          Current Balance
        </span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-base font-extrabold text-brand-900">
            {fmt(
              balanceDetails.currentBalance?.amount ??
                balanceDetails.currentBalance ??
                0
            )}
          </span>
          {balanceDetails.currentBalance?.balanceType && (
            <span className="text-[9px] font-bold bg-brand-200 text-brand-800 px-1.5 py-0.2 rounded uppercase">
              {balanceDetails.currentBalance.balanceType}
            </span>
          )}
        </div>
      </div>

      {/* 5. Due / Advance & Status */}
      <div
        className={`bg-gray-50/80 border border-gray-200 rounded-xl p-3 shadow-2xs ${
          isFarmer ? "col-span-2 sm:col-span-1" : ""
        }`}
      >
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
          Due / Status
        </span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-base font-extrabold text-gray-900">
            {fmt(
              balanceDetails.dueAmount ||
                balanceDetails.advanceAmount ||
                0
            )}
          </span>
          {balanceDetails.dueStatus && (
            <span
              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                getDueStatusBadge(balanceDetails.dueStatus).badge
              }`}
            >
              {balanceDetails.dueStatus}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

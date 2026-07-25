import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBalanceSheet, downloadBalanceSheetPdf } from '../../store/thunks/reportsThunk';
import ErrorState from '../../components/ErrorState';
import toast from 'react-hot-toast';
import { 
  RotateCw, 
  AlertCircle,
  Download,
  Loader2,
  Coins,
  Scale,
  ShieldCheck,
  FileText
} from 'lucide-react';

const BalanceSheetReport = () => {
  const dispatch = useDispatch();

  // Get current date string (YYYY-MM-DD)
  const getTodayString = () => new Date().toISOString().split('T')[0];

  // Filters State
  const [statementDate, setStatementDate] = useState(getTodayString());
  const [dateError, setDateError] = useState(null);

  // Redux selectors
  const { balanceSheet, balanceSheetLoading, balanceSheetDownloadLoading, error } = useSelector(
    (state) => state.reports
  );

  // Initial load
  useEffect(() => {
    handleFetchData();
  }, [dispatch]);

  const validateDate = (dateVal) => {
    const today = getTodayString();
    if (dateVal && dateVal > today) {
      return "Future dates are not allowed.\nPlease select today's date or an earlier date.";
    }
    return null;
  };

  const handleFetchData = () => {
    const err = validateDate(statementDate);
    if (err) {
      setDateError(err);
      toast.error("Future dates are not allowed.\nPlease select today's date or an earlier date.");
      return;
    }
    setDateError(null);
    if (statementDate) {
      dispatch(fetchBalanceSheet(statementDate));
    }
  };

  const handleDownloadPDF = async () => {
    const err = validateDate(statementDate);
    if (err) {
      setDateError(err);
      toast.error("Future dates are not allowed.\nPlease select today's date or an earlier date.");
      return;
    }
    setDateError(null);
    if (statementDate) {
      const res = await dispatch(downloadBalanceSheetPdf(statementDate));
      
      if (downloadBalanceSheetPdf.rejected.match(res)) {
        toast.error(res.payload || "Failed to download Balance Sheet PDF");
      }
    }
  };

  // Check if API returned an empty report
  const isEmptyReport = useMemo(() => {
    if (!balanceSheet) return false;
    const assets = balanceSheet.assets || {};
    const liabilities = balanceSheet.liabilities || {};
    const equity = balanceSheet.equity || {};
    const hasAssetVals = Object.values(assets).some((v) => Number(v) > 0);
    const hasLiabVals = Object.values(liabilities).some((v) => Number(v) > 0);
    const hasEquityVals = Object.values(equity).some((v) => Number(v) > 0);
    return !hasAssetVals && !hasLiabVals && !hasEquityVals;
  }, [balanceSheet]);

  // Adapt to API structure if it returns data. Ensure keys exist with fallback
  const data = useMemo(() => {
    if (!balanceSheet) {
      return {
        assets: { cashInHand: 0, bankBalance: 0, inventoryValue: 0, accountsReceivable: 0 },
        liabilities: { accountsPayable: 0, outstandingPurchases: 0, loans: 0 },
        equity: { capital: 0, retainedEarnings: 0 },
      };
    }

    return {
      assets: {
        cashInHand: Number(balanceSheet.assets?.cashInHand ?? 0),
        bankBalance: Number(balanceSheet.assets?.bankBalance ?? 0),
        inventoryValue: Number(balanceSheet.assets?.inventoryValue ?? balanceSheet.assets?.inventory ?? 0),
        accountsReceivable: Number(balanceSheet.assets?.accountsReceivable ?? 0),
      },
      liabilities: {
        accountsPayable: Number(balanceSheet.liabilities?.accountsPayable ?? 0),
        outstandingPurchases: Number(balanceSheet.liabilities?.outstandingPurchases ?? 0),
        loans: Number(balanceSheet.liabilities?.loans ?? 0),
      },
      equity: {
        capital: Number(balanceSheet.equity?.capital ?? 0),
        retainedEarnings: Number(balanceSheet.equity?.retainedEarnings ?? 0),
      },
    };
  }, [balanceSheet]);

  // Calculations
  const calculatedTotals = useMemo(() => {
    const totalAssets = Object.values(data.assets).reduce((a, b) => a + b, 0);
    const totalLiabilities = Object.values(data.liabilities).reduce((a, b) => a + b, 0);
    const netWorth = totalAssets - totalLiabilities;

    return { totalAssets, totalLiabilities, netWorth };
  }, [data]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-4 text-gray-800 bg-white">
      {/* ── Header Section (Compact) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-3">
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Balance Sheet</h1>
          <p className="text-xs text-gray-400 font-medium">
            View asset valuations, outstanding dues, and overall net worth.
          </p>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={balanceSheetDownloadLoading || balanceSheetLoading}
          className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#15803D] hover:bg-[#126630] rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          {balanceSheetDownloadLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          <span>{balanceSheetDownloadLoading ? 'Downloading...' : 'Download PDF'}</span>
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-4">
          <ErrorState
            error={error}
            variant="inline"
            onRetry={() => handleFetchData()}
          />
        </div>
      )}

      {/* ── Compact Filter Bar (Statement Date) ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Statement Date</span>
            <input
              type="date"
              value={statementDate}
              max={getTodayString()}
              onClick={(e) => e.target.showPicker?.()}
              onChange={(e) => {
                const val = e.target.value;
                setStatementDate(val);
                if (val && val > getTodayString()) {
                  setDateError("Future dates are not allowed.\nPlease select today's date or an earlier date.");
                } else {
                  setDateError(null);
                }
              }}
              className={`w-[160px] bg-white border ${dateError ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'} px-3 py-1.5 h-[38px] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#15803D] focus:ring-1 focus:ring-[#15803D] text-gray-700 shadow-sm cursor-pointer`}
            />
            {dateError && (
              <span className="text-[11px] font-semibold text-red-600 mt-1 animate-fade-in whitespace-pre-line">
                {dateError}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleFetchData}
            disabled={balanceSheetLoading || balanceSheetDownloadLoading}
            className="flex items-center justify-center gap-1.5 px-4 h-[38px] text-xs font-bold text-white bg-[#15803D] hover:bg-[#126630] rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed self-end"
          >
            {balanceSheetLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <RotateCw className="w-3.5 h-3.5" />
                <span>Generate</span>
              </>
            )}
          </button>
        </div>
      </div>

      {balanceSheetLoading ? (
        <div className="p-12 text-center text-gray-500 text-xs font-semibold flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#15803D]" />
          <span>Compiling balance sheet calculations...</span>
        </div>
      ) : isEmptyReport ? (
        /* ── Empty State Handling ── */
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm flex flex-col items-center justify-center space-y-3 my-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-base font-bold text-gray-900">No Transactions Found</h3>
            <p className="text-xs text-gray-500 font-medium leading-relaxed">
              No transactions are available for the selected date range. Try selecting a different date range or adjusting your filters.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Account Categories Split Layout ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Card: Assets */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-[#F8FAFC] flex items-center gap-2">
                <span className="w-1.5 h-3.5 rounded-full bg-[#15803D] inline-block" />
                <h3 className="text-xs font-bold text-gray-750 uppercase tracking-wider">Assets</h3>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                <div className="divide-y divide-gray-50">
                  <div className="py-2.5 flex justify-between text-xs font-semibold">
                    <span className="text-gray-500">Cash in Hand</span>
                    <span className="text-gray-900 tabular-nums">{formatCurrency(data.assets.cashInHand)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between text-xs font-semibold">
                    <span className="text-gray-500">Bank Balance</span>
                    <span className="text-gray-900 tabular-nums">{formatCurrency(data.assets.bankBalance)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between text-xs font-semibold">
                    <span className="text-gray-500">Inventory Valuation</span>
                    <span className="text-gray-900 tabular-nums">{formatCurrency(data.assets.inventoryValue)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between text-xs font-semibold">
                    <span className="text-gray-500">Customer Receivables</span>
                    <span className="text-gray-900 tabular-nums">{formatCurrency(data.assets.accountsReceivable)}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200 border-dashed flex justify-between items-center text-xs font-bold text-gray-900">
                  <span>TOTAL ASSETS</span>
                  <span className="tabular-nums text-[#15803D] text-sm font-extrabold">{formatCurrency(calculatedTotals.totalAssets)}</span>
                </div>
              </div>
            </div>

            {/* Right Card: Liabilities */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-[#F8FAFC] flex items-center gap-2">
                <span className="w-1.5 h-3.5 rounded-full bg-red-600 inline-block" />
                <h3 className="text-xs font-bold text-gray-750 uppercase tracking-wider">Liabilities</h3>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                <div className="divide-y divide-gray-50">
                  <div className="py-2.5 flex justify-between text-xs font-semibold">
                    <span className="text-gray-500">Supplier Dues (AP)</span>
                    <span className="text-gray-900 tabular-nums">{formatCurrency(data.liabilities.accountsPayable)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between text-xs font-semibold">
                    <span className="text-gray-500">Outstanding Purchase Bills</span>
                    <span className="text-gray-900 tabular-nums">{formatCurrency(data.liabilities.outstandingPurchases)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between text-xs font-semibold">
                    <span className="text-gray-500">Working Capital Loans</span>
                    <span className="text-gray-900 tabular-nums">{formatCurrency(data.liabilities.loans)}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200 border-dashed flex justify-between items-center text-xs font-bold text-gray-900">
                  <span>TOTAL LIABILITIES</span>
                  <span className="tabular-nums text-red-600 text-sm font-extrabold">{formatCurrency(calculatedTotals.totalLiabilities)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom Card: Net Worth ── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Scale className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Net Worth Equation</span>
                <h3 className="text-xs font-semibold text-gray-550">
                  Total Assets ({formatCurrency(calculatedTotals.totalAssets)}) − Total Liabilities ({formatCurrency(calculatedTotals.totalLiabilities)})
                </h3>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Net Worth Value</span>
              <span className="text-base font-black text-blue-650 tabular-nums">
                {formatCurrency(calculatedTotals.netWorth)}
              </span>
            </div>
          </div>

          {/* ── Audit Verification Footer ── */}
          <div className="bg-emerald-50/20 border border-emerald-100/50 p-4 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-[#15803D] flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-gray-800">Accounting Equations Verified</h4>
              <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
                The net worth represents the owner equity of the FPO cooperative, calculated as Total Assets minus Total Liabilities.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BalanceSheetReport;

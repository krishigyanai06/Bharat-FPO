import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { downloadGstr1Report } from '../../store/thunks/reportsThunk';
import { clearReportsError } from '../../store/slices/reportsSlice';
import { 
  Download, 
  Calendar, 
  AlertCircle, 
  FileText, 
  FileSpreadsheet, 
  Info,
  CheckCircle,
  ShieldCheck,
  Building,
  Users,
  Layers,
  ArrowRight,
  TrendingUp,
  FileSignature,
  ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const YEARS = ['2024', '2025', '2026', '2027', '2028', '2029', '2030'];

const Gstr1Report = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Redux state
  const { gstr1DownloadLoading } = useSelector((state) => state.reports);

  // Default month and year corresponding to July 2026 (local system time)
  const [periodMode, setPeriodMode] = useState('monthly'); // 'monthly' | 'custom'
  const [month, setMonth] = useState('07');
  const [year, setYear] = useState('2026');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [format, setFormat] = useState('json'); // 'json' | 'csv'

  // Clear reports error on mount and unmount
  useEffect(() => {
    dispatch(clearReportsError());
    return () => {
      dispatch(clearReportsError());
    };
  }, [dispatch]);

  // Date validation helper
  const validationError = useMemo(() => {
    if (periodMode === 'custom') {
      if (!startDate || !endDate) {
        return 'Please select both start and end dates.';
      }
      if (new Date(startDate) > new Date(endDate)) {
        return 'Start date cannot be after end date.';
      }
    }
    return null;
  }, [periodMode, startDate, endDate]);

  // Display month name helper for summary
  const selectedMonthName = useMemo(() => {
    const matched = MONTHS.find((m) => m.value === month);
    return matched ? matched.label : '';
  }, [month]);

  // Handle Download Request
  const handleDownload = async () => {
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const filters = { format };
    if (periodMode === 'monthly') {
      filters.month = month;
      filters.year = year;
    } else {
      filters.startDate = startDate;
      filters.endDate = endDate;
    }

    const downloadToast = toast.loading('Generating GSTR-1 compliance file...');
    const result = await dispatch(downloadGstr1Report(filters));

    if (downloadGstr1Report.fulfilled.match(result)) {
      toast.success('GSTR-1 report downloaded successfully!', { id: downloadToast });
    } else {
      toast.error(result.payload || 'Failed to download report. Check inputs or try again.', { id: downloadToast });
    }
  };

  return (
    <div className="space-y-6 w-full bg-white rounded-2xl p-6 border border-gray-150 min-h-[80vh] select-none">
      {/* ── Breadcrumbs Navigation & Back Button ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
        <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold">
          <span className="hover:text-emerald-700 hover:underline cursor-pointer" onClick={() => navigate('/gst-reports')}>
            GST Reports
          </span>
          <span className="text-gray-300">&gt;</span>
          <span className="text-emerald-700 font-bold">GSTR-1</span>
        </div>
        <button
          onClick={() => navigate('/gst-reports')}
          className="w-fit flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition duration-150 cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-gray-500" /> Back to GST Reports
        </button>
      </div>

      {/* ── Compliance Banner/Header ── */}
        <div className="bg-gradient-to-r from-emerald-800 to-green-700 text-white rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 transform translate-x-12 -translate-y-12">
            <ShieldCheck className="w-96 h-96" />
          </div>
          <div className="relative z-10 space-y-2.5 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-900/50 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide border border-emerald-500/20 text-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Government Compliance Portal
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">GSTR-1 Tax Return Center</h1>
            <p className="text-sm text-emerald-100 leading-relaxed font-medium">
              Generate and export sales return information. Output government-compliant JSON schemas compatible with the official GST offline utility tool, or CSV spreadsheets ready for internal auditing and reconciliation.
            </p>
          </div>
        </div>

        {/* ── Main Layout Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Side: Filter Form & Selector Controls */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Card 1: Reporting Period Selector */}
            <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-50">
                <h3 className="text-sm font-extrabold text-gray-800 flex items-center gap-2">
                  <Calendar className="w-4.5 h-4.5 text-emerald-600" /> Reporting Period
                </h3>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Required
                </span>
              </div>

              {/* Segmented Radio Options */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPeriodMode('monthly')}
                  className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    periodMode === 'monthly'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${periodMode === 'monthly' ? 'border-emerald-600' : 'border-gray-300'}`}>
                    {periodMode === 'monthly' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />}
                  </div>
                  Monthly Return
                </button>

                <button
                  type="button"
                  onClick={() => setPeriodMode('custom')}
                  className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    periodMode === 'custom'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${periodMode === 'custom' ? 'border-emerald-600' : 'border-gray-300'}`}>
                    {periodMode === 'custom' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />}
                  </div>
                  Custom Date Range
                </button>
              </div>

              {/* Sub-Forms */}
              {periodMode === 'monthly' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Select Month</label>
                    <div className="relative">
                      <select
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer appearance-none animate-fade-in"
                      >
                        {MONTHS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        ▼
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Select Year</label>
                    <div className="relative">
                      <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer appearance-none animate-fade-in"
                      >
                        {YEARS.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        ▼
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 animate-fade-in"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 animate-fade-in"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: Download Format Selector */}
            <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-50">
                <h3 className="text-sm font-extrabold text-gray-800 flex items-center gap-2">
                  <FileSignature className="w-4.5 h-4.5 text-emerald-600" /> Download Format
                </h3>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Select Option
                </span>
              </div>

              {/* Clickable Card Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Option A: GST JSON */}
                <div
                  onClick={() => setFormat('json')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer select-none space-y-2.5 relative flex flex-col justify-between ${
                    format === 'json'
                      ? 'border-emerald-500 bg-emerald-50/20'
                      : 'border-gray-200 bg-white hover:bg-gray-50/50 hover:border-gray-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg ${format === 'json' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      {format === 'json' && (
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-gray-900">GST JSON (Portal Upload)</h4>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                        Generates government-specified schema containing B2B, B2CL, B2CS, CDNR, CDNUR, HSN, and DOC details.
                      </p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <span className="inline-flex items-center text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                      Ready to Upload
                    </span>
                  </div>
                </div>

                {/* Option B: CSV Sales Register */}
                <div
                  onClick={() => setFormat('csv')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer select-none space-y-2.5 relative flex flex-col justify-between ${
                    format === 'csv'
                      ? 'border-emerald-500 bg-emerald-50/20'
                      : 'border-gray-200 bg-white hover:bg-gray-50/50 hover:border-gray-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg ${format === 'csv' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      {format === 'csv' && (
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-gray-900">CSV Sales Register</h4>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                        Generates a flattened ledger showing customer billing, tax categories (CGST, SGST, IGST), and HSN rates.
                      </p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <span className="inline-flex items-center text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">
                      Audit & Analysis
                    </span>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Right Side: Report Summary Panel & Action Box */}
          <div className="space-y-6">
            
            {/* Summary Box */}
            <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-sm space-y-5">
              <h3 className="text-sm font-extrabold text-gray-800 pb-2 border-b border-gray-50">
                Report Summary
              </h3>

              {/* Key-Value Information Panel */}
              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-400 font-semibold">Period:</span>
                  <span className="font-extrabold text-gray-900 text-right">
                    {periodMode === 'monthly' ? (
                      `${selectedMonthName} ${year}`
                    ) : (
                      startDate && endDate ? `${startDate} to ${endDate}` : 'Dates Unspecified'
                    )}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-400 font-semibold">Download Format:</span>
                  <span className="font-extrabold text-emerald-700 bg-emerald-50/50 px-2 py-0.5 rounded">
                    {format === 'json' ? 'GST JSON' : 'CSV Sales Register'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-400 font-semibold">Purpose:</span>
                  <span className="font-extrabold text-gray-700 text-right">
                    {format === 'json' ? 'GST Portal Upload' : 'Tax Reconciliation & Analysis'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-400 font-semibold">Validation:</span>
                  {validationError ? (
                    <span className="font-extrabold text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Invalid Dates
                    </span>
                  ) : (
                    <span className="font-extrabold text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Ready
                    </span>
                  )}
                </div>
              </div>

              {/* Date Validation Alert Warning */}
              {validationError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl flex gap-2 text-xs border border-red-100">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span className="font-semibold leading-relaxed">{validationError}</span>
                </div>
              )}

              {/* Main Action Button */}
              <button
                onClick={handleDownload}
                disabled={!!validationError || gstr1DownloadLoading}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer ${
                  validationError
                    ? 'bg-gray-300 shadow-none cursor-not-allowed text-gray-500'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]'
                }`}
              >
                {gstr1DownloadLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating Report...
                  </>
                ) : (
                  <>
                    <Download className="w-4.5 h-4.5" />
                    Download GSTR-1 Report
                  </>
                )}
              </button>

              {/* Educational compliance tooltip */}
              <div className="bg-amber-50/55 rounded-xl p-3 border border-amber-100 text-[11px] text-amber-800 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 shrink-0 text-amber-600" /> Due Date Note
                </div>
                <p className="leading-relaxed font-semibold">
                  GSTR-1 is normally due on the <strong>11th of the succeeding month</strong> for monthly filings. Double-check all B2B GSTIN entries before final portal submission to avoid mismatches on GSTR-2B.
                </p>
              </div>
            </div>

          </div>

        </div>

        {/* ── Section: Reusable compliance information modules (GST Grid details) ── */}
        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-gray-800 flex items-center gap-2">
              <Layers className="w-4.5 h-4.5 text-emerald-600" /> GSTR-1 Schema Structure
            </h3>
            <p className="text-[11px] text-gray-400 font-semibold">
              This module processes the following transaction types under government regulations:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            
            <div className="p-3.5 bg-gray-50/60 border border-gray-100 rounded-xl space-y-1">
              <div className="font-extrabold text-gray-800 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-emerald-600" /> B2B Invoices (4A, 4B, 4C, 6B, 6C)
              </div>
              <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                Sales transactions made to registered taxpayers with correct buyer GSTIN tags.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50/60 border border-gray-100 rounded-xl space-y-1">
              <div className="font-extrabold text-gray-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" /> B2C Small & Large (7 & 5A, 5B)
              </div>
              <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                Unregistered consumer transactions grouped by state codes and tax rates.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50/60 border border-gray-100 rounded-xl space-y-1">
              <div className="font-extrabold text-gray-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" /> HSN Summary (Table 12)
              </div>
              <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                HSN-wise details of all crop/product goods and services sold during the period.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50/60 border border-gray-100 rounded-xl space-y-1">
              <div className="font-extrabold text-gray-800 flex items-center gap-1.5">
                <FileSignature className="w-3.5 h-3.5 text-emerald-600" /> Documents Issued (Table 13)
              </div>
              <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                Serial ranges of all billing invoices, debit/credit notes, or vouchers issued.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50/60 border border-gray-100 rounded-xl space-y-1">
              <div className="font-extrabold text-gray-800 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Credit/Debit Notes (9B)
              </div>
              <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                CDNR & CDNUR vouchers issued against previous sales invoices.
              </p>
            </div>

            <div className="p-3.5 bg-emerald-50/20 border border-emerald-100/50 rounded-xl flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Need GSTR-3B?
                </div>
                <p className="text-[10px] text-emerald-700/80 font-medium leading-relaxed">
                  Summary records are ready to auto-populate monthly GSTR-3B filings.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
            </div>

          </div>
        </div>

      </div>
  );
};

export default Gstr1Report;

import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { downloadGstr3bReport, fetchGstr3bReport } from '../../store/thunks/reportsThunk';
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
  ArrowLeft,
  Percent,
  RotateCw,
  Loader2
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

const Gstr3bReport = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Redux state
  const { gstr3bDownloadLoading, gstr3bData, gstr3bLoading } = useSelector((state) => state.reports);

  // Default month and year corresponding to June 2026
  const [periodMode, setPeriodMode] = useState('monthly'); // 'monthly' | 'custom'
  const [month, setMonth] = useState('06');
  const [year, setYear] = useState('2026');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [format, setFormat] = useState('json'); // 'json' | 'excel'

  // Sub-tab selection for Preview
  const [activePreviewTab, setActivePreviewTab] = useState('section31'); // 'section31' | 'section32'

  // Clear reports error on mount and unmount
  useEffect(() => {
    dispatch(clearReportsError());
    return () => {
      dispatch(clearReportsError());
    };
  }, [dispatch]);

  // Fetch JSON data whenever filters change
  const handleFetchPreview = () => {
    const filters = {};
    if (periodMode === 'monthly') {
      filters.month = month;
      filters.year = year;
    } else {
      if (!startDate || !endDate) return;
      filters.startDate = startDate;
      filters.endDate = endDate;
    }
    dispatch(fetchGstr3bReport(filters));
  };

  useEffect(() => {
    handleFetchPreview();
  }, [periodMode, month, year, startDate, endDate, dispatch]);

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

  // Mock Fallback Data matching user spec
  const fallbackData = useMemo(() => {
    return {
      from: `${month}/${year}`,
      to: `${month}/${year}`,
      supplies: {
        a: { 
          description: '(a) Outward taxable supplies (other than zero rated, nil rated and exempted)', 
          taxableValue: 1550000, 
          igst: 180000, 
          cgst: 49500, 
          sgst: 49500, 
          cess: 0 
        },
        b: { 
          description: '(b) Outward taxable supplies (zero rated)', 
          taxableValue: 320000, 
          igst: 38400, 
          cgst: 0, 
          sgst: 0, 
          cess: 0 
        },
        c: { 
          description: '(c) Other outward supplies (Nil rated, exempted)', 
          taxableValue: 125000, 
          igst: 0, 
          cgst: 0, 
          sgst: 0, 
          cess: 0 
        },
        d: { 
          description: '(d) Inward supplies (liable to reverse charge)', 
          taxableValue: 45000, 
          igst: 4500, 
          cgst: 1800, 
          sgst: 1800, 
          cess: 0 
        },
        e: { 
          description: '(e) Non-GST outward supplies', 
          taxableValue: 75000, 
          igst: 0, 
          cgst: 0, 
          sgst: 0, 
          cess: 0 
        }
      },
      section32: [
        {
          placeOfSupply: 'Karnataka',
          stateCode: '29',
          unregistered: { taxableValue: 120000, igst: 21600 },
          composition: { taxableValue: 40000, igst: 7200 },
          uinHolders: { taxableValue: 0, igst: 0 }
        },
        {
          placeOfSupply: 'Maharashtra',
          stateCode: '27',
          unregistered: { taxableValue: 250000, igst: 45000 },
          composition: { taxableValue: 0, igst: 0 },
          uinHolders: { taxableValue: 15000, igst: 2700 }
        },
        {
          placeOfSupply: 'Delhi',
          stateCode: '07',
          unregistered: { taxableValue: 80000, igst: 14400 },
          composition: { taxableValue: 12000, igst: 2160 },
          uinHolders: { taxableValue: 0, igst: 0 }
        }
      ]
    };
  }, [month, year]);

  // Determine active report data
  const reportData = useMemo(() => {
    if (gstr3bData && Object.keys(gstr3bData).length > 0) {
      return gstr3bData;
    }
    return fallbackData;
  }, [gstr3bData, fallbackData]);

  // Safe mapping arrays for Section 3.1 supplies
  const suppliesList = useMemo(() => {
    if (!reportData?.supplies) return [];
    if (Array.isArray(reportData.supplies)) return reportData.supplies;
    
    // If it's a map (a, b, c, d, e), extract them in order
    const keys = ['a', 'b', 'c', 'd', 'e'];
    return keys.map((key) => {
      const row = reportData.supplies[key] || {};
      let desc = row.description;
      if (!desc) {
        if (key === 'a') desc = '(a) Outward taxable supplies (other than zero rated, nil rated and exempted)';
        else if (key === 'b') desc = '(b) Outward taxable supplies (zero rated)';
        else if (key === 'c') desc = '(c) Other outward supplies (Nil rated, exempted)';
        else if (key === 'd') desc = '(d) Inward supplies (liable to reverse charge)';
        else if (key === 'e') desc = '(e) Non-GST outward supplies';
      }
      return {
        key,
        description: desc,
        taxableValue: row.taxableValue || 0,
        igst: row.igst || 0,
        cgst: row.cgst || 0,
        sgst: row.sgst || 0,
        cess: row.cess || 0,
      };
    });
  }, [reportData]);

  const section32List = useMemo(() => {
    return Array.isArray(reportData?.section32) ? reportData.section32 : [];
  }, [reportData]);

  // Formatting helper
  const fmtINR = (v) => {
    if (v === undefined || v === null || isNaN(v)) return '₹0';
    return '₹' + Number(v).toLocaleString('en-IN');
  };

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

    const downloadToast = toast.loading('Generating GSTR-3B compliance file...');
    const result = await dispatch(downloadGstr3bReport(filters));

    if (downloadGstr3bReport.fulfilled.match(result)) {
      toast.success('GSTR-3B report downloaded successfully!', { id: downloadToast });
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
          <span className="text-emerald-700 font-bold">GSTR-3B</span>
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
          <Percent className="w-96 h-96" />
        </div>
        <div className="relative z-10 space-y-2.5 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-900/50 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide border border-emerald-500/20 text-emerald-250">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Government Compliance Portal
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">GSTR-3B Summary Return Center</h1>
          <p className="text-sm text-emerald-100 leading-relaxed font-medium">
            Generate and export consolidated monthly summary returns. Download government-compliant Section 3.1 JSON schemas containing outward/inward supplies, or formatted Excel spreadsheets matching the offline GSTR-3B government utility structure.
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
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer select-none space-y-2.5 relative flex flex-col justify-between h-full ${
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
                      Generates government-specified schema representing GSTR-3B Section 3.1 rows ((a) to (e)) containing details of taxable value and taxes.
                    </p>
                  </div>
                </div>
                <div className="pt-2">
                  <span className="inline-flex items-center text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                    Ready to Upload
                  </span>
                </div>
              </div>

              {/* Option B: Excel Workbook */}
              <div
                onClick={() => setFormat('excel')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer select-none space-y-2.5 relative flex flex-col justify-between h-full ${
                  format === 'excel'
                    ? 'border-emerald-500 bg-emerald-50/20'
                    : 'border-gray-200 bg-white hover:bg-gray-50/50 hover:border-gray-300'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${format === 'excel' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    {format === 'excel' && (
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-gray-900">Excel Workbook (.xlsx)</h4>
                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                      Formatted Excel workbook matching the official offline GSTR-3B utility. Displays supplies, taxable values, integrated tax, central tax, state/UT tax, and cess.
                    </p>
                  </div>
                </div>
                <div className="pt-2">
                  <span className="inline-flex items-center text-[10px] text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded">
                    Rich Utility Form
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
                  {format === 'json' ? 'GST JSON' : 'Excel Workbook'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-gray-400 font-semibold">Purpose:</span>
                <span className="font-extrabold text-gray-700 text-right">
                  {format === 'json' ? 'GST Portal Upload' : 'Offline Reconciliation'}
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
              disabled={!!validationError || gstr3bDownloadLoading}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer ${
                validationError
                  ? 'bg-gray-300 shadow-none cursor-not-allowed text-gray-500'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]'
              }`}
            >
              {gstr3bDownloadLoading ? (
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
                  Download GSTR-3B Report
                </>
              )}
            </button>

            {/* Educational compliance tooltip */}
            <div className="bg-amber-50/55 rounded-xl p-3 border border-amber-100 text-[11px] text-amber-800 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <Info className="w-3.5 h-3.5 shrink-0 text-amber-600" /> Due Date Note
              </div>
              <p className="leading-relaxed font-semibold">
                GSTR-3B is a monthly summary return and must be filed by the <strong>20th of the succeeding month</strong>. Ensure your outward liabilities match GSTR-1 and input tax credits correspond to GSTR-2B.
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* ── Interactive Preview Tables Container ── */}
      <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden flex flex-col">
        
        {/* Preview Segment Tabs */}
        <div className="bg-gray-50 border-b border-gray-200 px-5 pt-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 -mb-[1px]">
            <button
              onClick={() => setActivePreviewTab('section31')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activePreviewTab === 'section31'
                  ? 'border-emerald-600 text-emerald-700 font-extrabold'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Percent className="w-3.5 h-3.5" /> Section 3.1: Outward & Inward Supplies
            </button>
            <button
              onClick={() => setActivePreviewTab('section32')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activePreviewTab === 'section32'
                  ? 'border-emerald-600 text-emerald-700 font-extrabold'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Section 3.2: Inter-State Supplies
            </button>
          </div>
          
          <div className="pb-2 text-[10px] text-gray-400 font-semibold flex items-center gap-1.5">
            {!gstr3bData && (
              <span className="bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                Showing Fallback Simulation
              </span>
            )}
            {gstr3bLoading && (
              <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
            )}
          </div>
        </div>

        {/* Preview Tables Display */}
        <div className="p-6 relative min-h-[250px]">
          {gstr3bLoading ? (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                <span className="text-xs text-gray-500 font-bold">Querying GSTR-3B return records...</span>
              </div>
            </div>
          ) : null}

          {activePreviewTab === 'section31' ? (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-extrabold text-gray-800">Section 3.1 — Details of outward supplies and inward supplies liable to reverse charge</h3>
                  <p className="text-[11px] text-gray-400 font-medium">All amounts net of sell return credit notes for the period.</p>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-150 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/75 border-b border-gray-150 text-gray-500 font-extrabold text-[10px] uppercase tracking-wider">
                      <th className="px-4 py-3 w-[45%]">Nature of Supplies</th>
                      <th className="px-4 py-3 text-right">Total Taxable Value</th>
                      <th className="px-4 py-3 text-right">Integrated Tax (IGST)</th>
                      <th className="px-4 py-3 text-right">Central Tax (CGST)</th>
                      <th className="px-4 py-3 text-right">State/UT Tax (SGST)</th>
                      <th className="px-4 py-3 text-right">Cess</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {suppliesList.map((row) => (
                      <tr key={row.key} className="hover:bg-gray-50/50 transition">
                        <td className="px-4 py-3.5 font-semibold text-gray-700 leading-normal">{row.description}</td>
                        <td className="px-4 py-3.5 text-right font-extrabold text-gray-900">{fmtINR(row.taxableValue)}</td>
                        <td className="px-4 py-3.5 text-right font-extrabold text-gray-900">{fmtINR(row.igst)}</td>
                        <td className="px-4 py-3.5 text-right font-extrabold text-gray-900">{fmtINR(row.cgst)}</td>
                        <td className="px-4 py-3.5 text-right font-extrabold text-gray-900">{fmtINR(row.sgst)}</td>
                        <td className="px-4 py-3.5 text-right font-extrabold text-gray-900">{fmtINR(row.cess)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-extrabold text-gray-800">Section 3.2 — Of the supplies shown in 3.1(a), details of inter-state supplies</h3>
                  <p className="text-[11px] text-gray-400 font-medium">Captures inter-state outward taxable supplies (excluding zero-rated/exempt supplies). Net of credit notes.</p>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-150 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/75 border-b border-gray-150 text-gray-500 font-extrabold text-[10px] uppercase tracking-wider">
                      <th className="px-4 py-3 rowspan-2">Place of Supply (State/UT)</th>
                      <th className="px-4 py-3 text-center">State Code</th>
                      <th className="px-4 py-3 text-center border-l border-gray-150" colSpan={2}>Supplies Made to Unregistered Persons</th>
                      <th className="px-4 py-3 text-center border-l border-gray-150" colSpan={2}>Supplies Made to Composition Taxable Persons</th>
                      <th className="px-4 py-3 text-center border-l border-gray-150" colSpan={2}>Supplies Made to UIN Holders</th>
                    </tr>
                    <tr className="bg-gray-50/30 border-b border-gray-150 text-gray-400 text-[9px] uppercase tracking-wider">
                      <th className="px-2 py-1.5 text-center">Code</th>
                      <th className="px-3 py-1.5 text-right border-l border-gray-100">Taxable Value</th>
                      <th className="px-3 py-1.5 text-right">IGST Amount</th>
                      <th className="px-3 py-1.5 text-right border-l border-gray-100">Taxable Value</th>
                      <th className="px-3 py-1.5 text-right">IGST Amount</th>
                      <th className="px-3 py-1.5 text-right border-l border-gray-100">Taxable Value</th>
                      <th className="px-3 py-1.5 text-right">IGST Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {section32List.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-gray-400 italic">No inter-state supplies recorded for the period.</td>
                      </tr>
                    ) : (
                      [...section32List]
                        .sort((a, b) => Number(a.stateCode || 0) - Number(b.stateCode || 0))
                        .map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50 transition">
                            <td className="px-4 py-3 font-semibold text-gray-700">{row.placeOfSupply}</td>
                            <td className="px-4 py-3 text-center font-bold text-gray-500">{row.stateCode}</td>
                            
                            {/* Unregistered */}
                            <td className="px-3 py-3 text-right font-extrabold text-gray-900 border-l border-gray-100">{fmtINR(row.unregistered?.taxableValue)}</td>
                            <td className="px-3 py-3 text-right font-extrabold text-emerald-700">{fmtINR(row.unregistered?.igst)}</td>
                            
                            {/* Composition */}
                            <td className="px-3 py-3 text-right font-extrabold text-gray-900 border-l border-gray-100">{fmtINR(row.composition?.taxableValue)}</td>
                            <td className="px-3 py-3 text-right font-extrabold text-emerald-700">{fmtINR(row.composition?.igst)}</td>
                            
                            {/* UIN Holders */}
                            <td className="px-3 py-3 text-right font-extrabold text-gray-900 border-l border-gray-100">{fmtINR(row.uinHolders?.taxableValue)}</td>
                            <td className="px-3 py-3 text-right font-extrabold text-emerald-700">{fmtINR(row.uinHolders?.igst)}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── Section: Mockup Bottom Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-gray-150 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-extrabold text-xs text-gray-800">3.1(a) Outward Taxable Supplies</span>
        </div>
        <div className="p-4 bg-white border border-gray-150 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-extrabold text-xs text-gray-800">3.1(b) Zero Rated Supplies</span>
        </div>
        <div className="p-4 bg-white border border-gray-150 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-extrabold text-xs text-gray-800">3.1(c) Nil Rated & Exempted Supplies</span>
        </div>
        <div className="p-4 bg-white border border-gray-150 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-extrabold text-xs text-gray-800">3.1(d) RCM Inward Reverse Charge Supplies</span>
        </div>
        <div className="p-4 bg-white border border-gray-150 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-extrabold text-xs text-gray-800">3.1(e) Non-GST Outward Supplies</span>
        </div>
        <div className="p-4 bg-white border border-gray-150 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-extrabold text-xs text-gray-800">Section 4 Eligible ITC</span>
          </div>
          <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
        </div>
      </div>

    </div>
  );
};

export default Gstr3bReport;

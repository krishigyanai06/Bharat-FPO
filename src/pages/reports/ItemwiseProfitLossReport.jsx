import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchItemwiseProfitLoss } from '../../store/thunks/reportsThunk';
import ErrorState from '../../components/ErrorState';
import { 
  RotateCw, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  Wallet,
  AlertCircle,
  ShoppingBag,
  ShoppingCart,
  Users,
  Calendar,
  Filter,
  MoreVertical,
  Download,
  ChevronDown,
  Info,
  Printer,
  FileText,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';

const ItemwiseProfitLossReport = () => {
  const dispatch = useDispatch();
  const exportDropdownRef = useRef(null);

  // Redux Selectors
  const { itemwiseProfitLoss, itemwiseProfitLossLoading, error } = useSelector((state) => state.reports);

  // Initial date calculation for default June 2026 or current month
  const getInitialDates = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const start = `${y}-${m}-01`;
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    const end = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
    return { start, end };
  };

  const initialDates = getInitialDates();

  // Filters State
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [search, setSearch] = useState('');
  const [reportType, setReportType] = useState('all'); // all, sales, profit, loss

  // UI State
  const [exportOpen, setExportOpen] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState(null);

  // Refs for tracking reactive lifecycle and network requests
  const isMounted = useRef(false);
  const lastFetchedFilters = useRef(null);
  const debounceTimerRef = useRef(null);
  const activeRequestRef = useRef(null);

  // Table Pagination and Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortConfig, setSortConfig] = useState({ key: 'netProfitLoss', direction: 'desc' });

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Reactive Fetch when dates change
  useEffect(() => {
    const currentFilters = { startDate, endDate, reportType };

    // We only trigger remote reload on date range changes or explicit refresh
    const datesChanged = !lastFetchedFilters.current ||
      currentFilters.startDate !== lastFetchedFilters.current.startDate ||
      currentFilters.endDate !== lastFetchedFilters.current.endDate;

    if (!datesChanged) return;

    if (!isMounted.current) {
      isMounted.current = true;
      handleFetchData(currentFilters);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      handleFetchData(currentFilters);
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [startDate, endDate]);

  const handleFetchData = (targetFilters = null) => {
    const rawFilters = targetFilters || { startDate, endDate, reportType };
    const filters = {};
    if (rawFilters.startDate) filters.startDate = rawFilters.startDate;
    if (rawFilters.endDate) filters.endDate = rawFilters.endDate;
    
    // itemsHavingSale is set to false/true depending on whether reportType asks for All Items or not
    filters.itemsHavingSale = rawFilters.reportType !== 'all';

    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
    }

    lastFetchedFilters.current = rawFilters;

    const promise = dispatch(fetchItemwiseProfitLoss(filters));
    activeRequestRef.current = promise;

    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    const cleanDates = getInitialDates();
    setStartDate(cleanDates.start);
    setEndDate(cleanDates.end);
    setSearch('');
    setReportType('all');

    const cleanFilters = { startDate: cleanDates.start, endDate: cleanDates.end, reportType: 'all' };

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    handleFetchData(cleanFilters);
  };

  // Compute metrics from data (calculated from all API returned data)
  const summaryMetrics = useMemo(() => {
    const records = itemwiseProfitLoss || [];
    let totalSales = 0;
    let netProfitLoss = 0;
    let openingStock = 0;
    let closingStock = 0;
    let taxPayable = 0;
    let totalItems = records.length;

    records.forEach((item) => {
      totalSales += Number(item.sale || 0);
      netProfitLoss += Number(item.netProfitLoss || 0);
      openingStock += Number(item.openingStock || 0);
      closingStock += Number(item.closingStock || 0);
      taxPayable += Number(item.taxPayable || 0);
    });

    return { totalSales, netProfitLoss, openingStock, closingStock, taxPayable, totalItems };
  }, [itemwiseProfitLoss]);

  // Compute Quick Insights from API data
  const insightsMetrics = useMemo(() => {
    const records = itemwiseProfitLoss || [];
    let bestItem = null;
    let worstItem = null;
    let profitableCount = 0;
    let lossCount = 0;
    let breakevenCount = 0;

    records.forEach((item) => {
      const p = Number(item.netProfitLoss || 0);
      if (p > 0) {
        profitableCount++;
        if (!bestItem || p > Number(bestItem.netProfitLoss || 0)) {
          bestItem = item;
        }
      } else if (p < 0) {
        lossCount++;
        if (!worstItem || p < Number(worstItem.netProfitLoss || 0)) {
          worstItem = item;
        }
      } else {
        breakevenCount++;
      }
    });

    return { bestItem, worstItem, profitableCount, lossCount, breakevenCount };
  }, [itemwiseProfitLoss]);

  // Process data for Table (Filtering, Sorting, Pagination)
  const processedData = useMemo(() => {
    const records = itemwiseProfitLoss || [];
    let result = [...records];

    // Filter by Search (Instant Client-side Search)
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(item => 
        String(item.itemName || '').toLowerCase().includes(q)
      );
    }

    // Filter by Report Type Dropdown Option client-side
    if (reportType === 'sales') {
      result = result.filter(item => Number(item.sale || 0) > 0);
    } else if (reportType === 'profit') {
      result = result.filter(item => Number(item.netProfitLoss || 0) > 0);
    } else if (reportType === 'loss') {
      result = result.filter(item => Number(item.netProfitLoss || 0) < 0);
    }

    // Client-side sort
    if (sortConfig.key) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (sortConfig.key === 'sale') {
          valA = Number(a.sale || 0);
          valB = Number(b.sale || 0);
        } else if (sortConfig.key === 'openingStock') {
          valA = Number(a.openingStock || 0);
          valB = Number(b.openingStock || 0);
        } else if (sortConfig.key === 'closingStock') {
          valA = Number(a.closingStock || 0);
          valB = Number(b.closingStock || 0);
        } else if (sortConfig.key === 'netProfitLoss') {
          valA = Number(a.netProfitLoss || 0);
          valB = Number(b.netProfitLoss || 0);
        }

        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      });
    }

    return result;
  }, [itemwiseProfitLoss, search, reportType, sortConfig]);

  // Paginated Rows
  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return processedData.slice(startIdx, startIdx + itemsPerPage);
  }, [processedData, currentPage]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(val);
  };

  const handleExport = (type) => {
    if (type === 'excel') {
      const headers = ['Item Name', 'Unit', 'Sales', 'Sales Return', 'Purchase', 'Purchase Return', 'Opening Stock', 'Closing Stock', 'Tax Payable', 'Net Profit/Loss'];
      const rows = processedData.map(item => [
        item.itemName || '',
        item.unit || '',
        item.sale || 0,
        item.saleReturn || 0,
        item.purchase || 0,
        item.purchaseReturn || 0,
        item.openingStock || 0,
        item.closingStock || 0,
        item.taxPayable || 0,
        item.netProfitLoss || 0
      ]);
      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `itemwise_profit_loss_report_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (type === 'pdf') {
      alert('PDF generation is starting...');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const startIndex = processedData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, processedData.length);

  // Skeleton Components for loading state
  const SkeletonCard = () => (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm h-[96px] animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex-shrink-0" />
        <div className="space-y-2 flex-grow">
          <div className="h-3 bg-gray-200 rounded w-1/3" />
          <div className="h-5 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    </div>
  );

  const SkeletonInsight = () => (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm h-[115px] animate-pulse space-y-3">
      <div className="h-4 bg-gray-200 rounded w-1/2" />
      <div className="h-5 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-200 rounded w-1/3" />
    </div>
  );

  const SkeletonRow = () => (
    <tr className="animate-pulse h-[52px] border-b border-gray-100">
      <td className="py-2.5 px-4"><div className="h-4 bg-gray-200 rounded w-3/4" /></td>
      <td className="py-2.5 px-4"><div className="h-4 bg-gray-200 rounded w-12" /></td>
      <td className="py-2.5 px-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
      <td className="py-2.5 px-4"><div className="h-4 bg-gray-200 rounded w-12" /></td>
      <td className="py-2.5 px-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
      <td className="py-2.5 px-4"><div className="h-4 bg-gray-200 rounded w-12" /></td>
      <td className="py-2.5 px-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="py-2.5 px-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="py-2.5 px-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
      <td className="py-2.5 px-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="py-2.5 px-4"><div className="h-6 bg-gray-200 rounded-full w-16" /></td>
    </tr>
  );

  return (
    <div className="space-y-6 text-gray-800 bg-[#F8FAFC] min-h-screen p-1">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Item-wise Profit & Loss Report</h1>
          <p className="text-xs text-gray-500 font-medium">
            Analyze sales performance, stock valuation, taxes, and profitability for every inventory item.
          </p>
        </div>

        {/* Header Quick Actions */}
        <div className="flex flex-wrap gap-2">
          {/* Export Dropdown Button */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-bold text-gray-700 bg-white shadow-sm transition-all cursor-pointer h-[38px]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            
            {exportOpen && (
              <div className="absolute right-0 mt-1.5 w-36 bg-white border border-gray-150 rounded-lg shadow-lg py-1 z-50 animate-fade-in text-left">
                <button
                  onClick={() => {
                    setExportOpen(false);
                    handleExport('excel');
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 font-semibold flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
                  Excel / CSV
                </button>
                <button
                  onClick={() => {
                    setExportOpen(false);
                    handleExport('pdf');
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 font-semibold flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-red-500" />
                  PDF Report
                </button>
              </div>
            )}
          </div>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-bold text-gray-700 bg-white shadow-sm transition-all cursor-pointer h-[38px]"
          >
            <Printer className="w-3.5 h-3.5 text-gray-500" />
            <span>Print</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => handleFetchData()}
            className="flex items-center justify-center p-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-700 bg-white shadow-sm transition-all cursor-pointer w-[38px] h-[38px]"
            title="Refresh Report Data"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
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

      {/* ── Filter Section ── */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Date Range Picker */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date Range</span>
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5 h-[38px] shadow-sm hover:border-gray-300 transition-colors focus-within:border-[#15803D] focus-within:ring-1 focus-within:ring-[#15803D]">
              <Calendar className="w-3.5 h-3.5 text-gray-450" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-gray-700 focus:outline-none w-[115px] p-0"
              />
              <span className="text-gray-400 text-xs font-semibold px-0.5">–</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-gray-700 focus:outline-none w-[115px] p-0"
              />
            </div>
          </div>

          {/* Integrated Search bar */}
          <div className="flex-grow min-w-[200px] flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Search Item</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search items by inventory name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-gray-200 pl-9 pr-3 h-[38px] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#15803D] focus:ring-1 focus:ring-[#15803D] text-gray-700 shadow-sm"
              />
            </div>
          </div>

          {/* Report Type Dropdown */}
          <div className="w-[180px] flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Report Type</span>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full bg-white border border-gray-200 px-3 py-1.5 h-[38px] rounded-lg text-xs font-bold focus:outline-none focus:border-[#15803D] focus:ring-1 focus:ring-[#15803D] text-gray-750 shadow-sm cursor-pointer"
            >
              <option value="all">All Items</option>
              <option value="sales">Items with Sales</option>
              <option value="profit">Profit Items</option>
              <option value="loss">Loss Items</option>
            </select>
          </div>

          {/* Filter Action Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleFetchData()}
              className="flex items-center gap-1.5 px-4 h-[38px] bg-[#15803D] hover:bg-[#126630] text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              Generate Report
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 h-[38px] text-xs font-bold text-gray-500 hover:text-gray-900 border border-gray-200 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-all cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary Cards Section ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {itemwiseProfitLossLoading ? (
          Array.from({ length: 6 }).map((_, idx) => <SkeletonCard key={idx} />)
        ) : (
          <>
            {/* Card 1: Total Sales */}
            <div className="bg-white rounded-xl border border-gray-150 p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 text-[#16A34A] rounded-full flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Sales</span>
                <h3 className="text-sm font-bold text-gray-900 tabular-nums">
                  {formatCurrency(summaryMetrics.totalSales)}
                </h3>
              </div>
            </div>

            {/* Card 2: Net Profit / Loss */}
            <div className="bg-white rounded-xl border border-gray-150 p-4 shadow-sm flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                summaryMetrics.netProfitLoss >= 0 ? 'bg-green-50 text-[#16A34A]' : 'bg-red-50 text-red-650'
              }`}>
                {summaryMetrics.netProfitLoss >= 0 ? <TrendingUp className="w-4.5 h-4.5" /> : <TrendingDown className="w-4.5 h-4.5" />}
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Net Profit/Loss</span>
                <h3 className={`text-sm font-bold tabular-nums ${
                  summaryMetrics.netProfitLoss >= 0 ? 'text-[#16A34A]' : 'text-red-600'
                }`}>
                  {summaryMetrics.netProfitLoss >= 0 ? '+' : ''}{formatCurrency(summaryMetrics.netProfitLoss)}
                </h3>
              </div>
            </div>

            {/* Card 3: Opening Stock Value */}
            <div className="bg-white rounded-xl border border-gray-150 p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Wallet className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Opening Stock</span>
                <h3 className="text-sm font-bold text-gray-900 tabular-nums">
                  {formatCurrency(summaryMetrics.openingStock)}
                </h3>
              </div>
            </div>

            {/* Card 4: Closing Stock Value */}
            <div className="bg-white rounded-xl border border-gray-150 p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <ShoppingCart className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Closing Stock</span>
                <h3 className="text-sm font-bold text-gray-900 tabular-nums">
                  {formatCurrency(summaryMetrics.closingStock)}
                </h3>
              </div>
            </div>

            {/* Card 5: Tax Payable */}
            <div className="bg-white rounded-xl border border-gray-150 p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Tax Payable</span>
                <h3 className="text-sm font-bold text-gray-900 tabular-nums">
                  {formatCurrency(summaryMetrics.taxPayable)}
                </h3>
              </div>
            </div>

            {/* Card 6: Total Items */}
            <div className="bg-white rounded-xl border border-gray-150 p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-50 text-slate-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Items</span>
                <h3 className="text-sm font-bold text-gray-900 tabular-nums">
                  {summaryMetrics.totalItems}
                </h3>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Quick Insights ── */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-gray-450 uppercase tracking-wider">Report Quick Insights</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {itemwiseProfitLossLoading ? (
            Array.from({ length: 3 }).map((_, idx) => <SkeletonInsight key={idx} />)
          ) : (
            <>
              {/* Card 1: Best Performing Item */}
              <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm flex flex-col justify-between min-h-[115px]">
                <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                  <span className="text-xs font-bold text-gray-500">Best Performing Item</span>
                  <ArrowUpRight className="w-4 h-4 text-green-600 bg-green-50 rounded" />
                </div>
                <div className="pt-2">
                  <h4 className="text-sm font-bold text-gray-900 truncate">
                    {insightsMetrics.bestItem ? insightsMetrics.bestItem.itemName : '—'}
                  </h4>
                  <p className="text-xs font-bold text-[#16A34A] mt-1">
                    {insightsMetrics.bestItem ? `Profit: ${formatCurrency(insightsMetrics.bestItem.netProfitLoss)}` : 'No profits recorded'}
                  </p>
                </div>
              </div>

              {/* Card 2: Highest Loss Item */}
              <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm flex flex-col justify-between min-h-[115px]">
                <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                  <span className="text-xs font-bold text-gray-500">Highest Loss Item</span>
                  <ArrowDownRight className="w-4 h-4 text-red-650 bg-red-50 rounded" />
                </div>
                <div className="pt-2">
                  <h4 className="text-sm font-bold text-gray-900 truncate">
                    {insightsMetrics.worstItem ? insightsMetrics.worstItem.itemName : '—'}
                  </h4>
                  <p className="text-xs font-bold text-red-600 mt-1">
                    {insightsMetrics.worstItem ? `Loss: ${formatCurrency(insightsMetrics.worstItem.netProfitLoss)}` : 'No losses recorded'}
                  </p>
                </div>
              </div>

              {/* Card 3: Report Summary */}
              <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm flex flex-col justify-between min-h-[115px]">
                <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                  <span className="text-xs font-bold text-gray-500">Report Summary</span>
                  <Info className="w-4.5 h-4.5 text-blue-600" />
                </div>
                <div className="grid grid-cols-4 gap-2 pt-2 text-[10px] font-bold text-center">
                  <div className="bg-slate-50 border border-gray-100 rounded py-1 px-0.5">
                    <span className="text-slate-600 block text-xs">{insightsMetrics.profitableCount + insightsMetrics.lossCount + insightsMetrics.breakevenCount}</span>
                    <span className="text-gray-400 block uppercase scale-90">Total</span>
                  </div>
                  <div className="bg-green-50/50 border border-green-100 rounded py-1 px-0.5">
                    <span className="text-green-700 block text-xs">{insightsMetrics.profitableCount}</span>
                    <span className="text-green-550 block uppercase scale-90">Profit</span>
                  </div>
                  <div className="bg-red-50/50 border border-red-100 rounded py-1 px-0.5">
                    <span className="text-red-700 block text-xs">{insightsMetrics.lossCount}</span>
                    <span className="text-red-550 block uppercase scale-90">Loss</span>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded py-1 px-0.5">
                    <span className="text-gray-600 block text-xs">{insightsMetrics.breakevenCount}</span>
                    <span className="text-gray-450 block uppercase scale-90">Even</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Report Table ── */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-sm overflow-hidden flex flex-col">
        {itemwiseProfitLossLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-gray-150">
                  <th className="py-3 px-4 text-xs font-bold text-gray-650 uppercase">Item Name</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-650 uppercase">Unit</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-650 uppercase">Sales</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-650 uppercase">Sales Return</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-650 uppercase">Purchase</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-650 uppercase">Purchase Return</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-650 uppercase">Opening Stock</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-650 uppercase">Closing Stock</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-650 uppercase">Tax Payable</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-650 uppercase">Net Profit/Loss</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-650 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, idx) => <SkeletonRow key={idx} />)}
              </tbody>
            </table>
          </div>
        ) : processedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <span className="text-5xl mb-4 select-none">📊</span>
            <h3 className="text-base font-bold text-gray-800">No report data found</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm select-none">
              Try changing filters or selecting another date range.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-4 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto relative max-h-[500px]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-25 bg-[#F8FAFC] shadow-[inset_0_-1px_0_0_rgba(229,231,235,1)]">
                  <tr className="h-[44px]">
                    <th className="py-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Item Name</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Unit</th>
                    
                    <th 
                      onClick={() => handleSort('sale')}
                      className="py-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Sales</span>
                        <span className="text-[10px] text-gray-400">
                          {sortConfig.key === 'sale' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
                        </span>
                      </div>
                    </th>

                    <th className="py-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Sales Return</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Purchase</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Purchase Return</th>

                    <th 
                      onClick={() => handleSort('openingStock')}
                      className="py-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Opening Stock</span>
                        <span className="text-[10px] text-gray-400">
                          {sortConfig.key === 'openingStock' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
                        </span>
                      </div>
                    </th>

                    <th 
                      onClick={() => handleSort('closingStock')}
                      className="py-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Closing Stock</span>
                        <span className="text-[10px] text-gray-400">
                          {sortConfig.key === 'closingStock' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
                        </span>
                      </div>
                    </th>

                    <th className="py-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Tax Payable</th>

                    <th 
                      onClick={() => handleSort('netProfitLoss')}
                      className="py-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Net Profit/Loss</span>
                        <span className="text-[10px] text-gray-400">
                          {sortConfig.key === 'netProfitLoss' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
                        </span>
                      </div>
                    </th>
                    
                    <th className="py-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {paginatedData.map((item, index) => {
                    const sales = Number(item.sale || 0);
                    const salesReturn = Number(item.saleReturn || 0);
                    const purchase = Number(item.purchase || 0);
                    const purchaseReturn = Number(item.purchaseReturn || 0);
                    const opStock = Number(item.openingStock || 0);
                    const clStock = Number(item.closingStock || 0);
                    const taxPay = Number(item.taxPayable || 0);
                    const profit = Number(item.netProfitLoss || 0);
                    
                    const isExpanded = expandedItemId === item.itemId;

                    return (
                      <React.Fragment key={item.itemId || index}>
                        {/* Main clickable row */}
                        <tr 
                          onClick={() => setExpandedItemId(isExpanded ? null : item.itemId)}
                          className="hover:bg-slate-50/40 transition-colors h-[52px] cursor-pointer"
                        >
                          <td className="py-2.5 px-4 text-sm font-semibold text-gray-900">
                            {item.itemName || '—'}
                          </td>
                          <td className="py-2.5 px-4 text-sm text-gray-500">
                            {item.unit || '—'}
                          </td>
                          <td className="py-2.5 px-4 text-sm font-medium text-gray-900 tabular-nums">
                            {formatCurrency(sales)}
                          </td>
                          <td className="py-2.5 px-4 text-sm text-gray-600 tabular-nums">
                            {formatCurrency(salesReturn)}
                          </td>
                          <td className="py-2.5 px-4 text-sm text-gray-900 tabular-nums">
                            {formatCurrency(purchase)}
                          </td>
                          <td className="py-2.5 px-4 text-sm text-gray-600 tabular-nums">
                            {formatCurrency(purchaseReturn)}
                          </td>
                          <td className="py-2.5 px-4 text-sm text-gray-700 tabular-nums">
                            {formatCurrency(opStock)}
                          </td>
                          <td className="py-2.5 px-4 text-sm text-gray-700 tabular-nums">
                            {formatCurrency(clStock)}
                          </td>
                          <td className="py-2.5 px-4 text-sm text-gray-650 tabular-nums">
                            {formatCurrency(taxPay)}
                          </td>
                          
                          {/* Net Profit Column with arrows */}
                          <td className={`py-2.5 px-4 text-sm font-bold tabular-nums`}>
                            {profit > 0 ? (
                              <span className="text-[#16A34A]">↑ +{formatCurrency(profit)}</span>
                            ) : profit < 0 ? (
                              <span className="text-red-600">↓ -{formatCurrency(Math.abs(profit))}</span>
                            ) : (
                              <span className="text-gray-500">{formatCurrency(profit)}</span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-2.5 px-4">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                              profit > 0 
                                ? 'bg-green-50 text-green-700 border-green-100'
                                : profit < 0
                                  ? 'bg-red-50 text-red-700 border-red-100'
                                  : 'bg-gray-50 text-gray-500 border-gray-150'
                            }`}>
                              {profit > 0 ? 'Profit' : profit < 0 ? 'Loss' : 'Break Even'}
                            </span>
                          </td>
                        </tr>

                        {/* Collapsible details panel */}
                        {isExpanded && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={11} className="p-4 border-b border-gray-150">
                              <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm max-w-4xl">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-50 pb-2">
                                  Expanded Inventory Stock & Cost Details
                                </h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3.5">
                                  {/* Column 1 */}
                                  <div className="space-y-3">
                                    <div className="flex justify-between border-b border-gray-100 pb-1 text-xs">
                                      <span className="text-gray-500 font-semibold">Sales</span>
                                      <span className="font-bold text-gray-900">{formatCurrency(sales)}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-100 pb-1 text-xs">
                                      <span className="text-gray-500 font-semibold">Sales Return</span>
                                      <span className="font-bold text-gray-900">{formatCurrency(salesReturn)}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-100 pb-1 text-xs">
                                      <span className="text-gray-500 font-semibold">Purchase</span>
                                      <span className="font-bold text-gray-900">{formatCurrency(purchase)}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-100 pb-1 text-xs">
                                      <span className="text-gray-500 font-semibold">Purchase Return</span>
                                      <span className="font-bold text-gray-900">{formatCurrency(purchaseReturn)}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-100 pb-1 text-xs">
                                      <span className="text-gray-500 font-semibold">Manufacturing Cost</span>
                                      <span className="font-bold text-gray-900">{formatCurrency(Number(item.mfgCost || 0))}</span>
                                    </div>
                                  </div>

                                  {/* Column 2 */}
                                  <div className="space-y-3">
                                    <div className="flex justify-between border-b border-gray-100 pb-1 text-xs">
                                      <span className="text-gray-500 font-semibold">Opening Stock</span>
                                      <span className="font-bold text-gray-900">{formatCurrency(opStock)}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-100 pb-1 text-xs">
                                      <span className="text-gray-500 font-semibold">Closing Stock</span>
                                      <span className="font-bold text-gray-900">{formatCurrency(clStock)}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-100 pb-1 text-xs">
                                      <span className="text-gray-500 font-semibold">Tax Receivable</span>
                                      <span className="font-bold text-gray-900">{formatCurrency(Number(item.taxReceivable || 0))}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-100 pb-1 text-xs">
                                      <span className="text-gray-500 font-semibold">Tax Payable</span>
                                      <span className="font-bold text-gray-900">{formatCurrency(taxPay)}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-100 pb-1 text-xs">
                                      <span className="text-gray-500 font-semibold">Consumption Cost</span>
                                      <span className="font-bold text-gray-900">{formatCurrency(Number(item.consumptionCost || 0))}</span>
                                    </div>
                                  </div>

                                  {/* Profit row span */}
                                  <div className="flex justify-between border-b border-gray-100 pb-1 text-xs md:col-span-2 pt-2 border-t border-gray-100 mt-2">
                                    <span className="text-gray-500 font-bold">Net Profit / Loss</span>
                                    <span className={`font-extrabold ${profit >= 0 ? 'text-[#16A34A]' : 'text-red-650'}`}>
                                      {profit > 0 ? '+' : ''}{formatCurrency(profit)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-[#F8FAFC] flex-wrap gap-4 select-none">
              <span className="text-sm text-gray-500 font-medium">
                Showing {startIndex} to {endIndex} of {processedData.length} records
              </span>

              <div className="inline-flex gap-1 items-center">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage <= 1}
                  className="p-1.5 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg text-gray-500 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: Math.ceil(processedData.length / itemsPerPage) || 1 }).map((_, idx) => {
                  const pg = idx + 1;
                  const isCurrent = pg === currentPage;
                  return (
                    <button
                      key={pg}
                      onClick={() => setCurrentPage(pg)}
                      className={`w-8 h-8 text-xs font-bold rounded-lg transition-all ${
                        isCurrent 
                          ? 'bg-slate-900 text-white shadow-sm' 
                          : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                      } cursor-pointer`}
                    >
                      {pg}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, Math.ceil(processedData.length / itemsPerPage)))}
                  disabled={currentPage >= Math.ceil(processedData.length / itemsPerPage)}
                  className="p-1.5 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg text-gray-500 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ItemwiseProfitLossReport;

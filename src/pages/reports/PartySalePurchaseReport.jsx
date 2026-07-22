import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPartySalePurchase } from '../../store/thunks/reportsThunk';
import ErrorState from '../../components/ErrorState';
import { 
  RotateCw, 
  Search, 
  ArrowLeft, 
  ArrowRight, 
  Loader2,
  AlertCircle,
  ShoppingBag,
  ShoppingCart,
  Users,
  Calendar,
  Filter,
  MoreVertical,
  Download,
  ChevronDown
} from 'lucide-react';

const PartySalePurchaseReport = () => {
  const dispatch = useDispatch();
  const exportDropdownRef = useRef(null);
  const rowMenuRef = useRef(null);

  // Redux Selectors
  const { partySalePurchase, partySalePurchaseLoading, error } = useSelector((state) => state.reports);

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
  
  // UI Dropdowns State
  const [exportOpen, setExportOpen] = useState(false);
  const [openRowActionId, setOpenRowActionId] = useState(null);

  // Refs for tracking reactive lifecycle and network requests
  const isMounted = useRef(false);
  const lastFetchedFilters = useRef(null);
  const debounceTimerRef = useRef(null);
  const activeRequestRef = useRef(null);

  // Table Pagination and Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortConfig, setSortConfig] = useState({ key: 'partyName', direction: 'asc' });

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target)) {
        setExportOpen(false);
      }
      if (rowMenuRef.current && !rowMenuRef.current.contains(e.target)) {
        setOpenRowActionId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Reactive Fetch when filters change
  useEffect(() => {
    const currentFilters = { startDate, endDate, search };

    const filtersChanged = !lastFetchedFilters.current ||
      currentFilters.startDate !== lastFetchedFilters.current.startDate ||
      currentFilters.endDate !== lastFetchedFilters.current.endDate ||
      currentFilters.search !== lastFetchedFilters.current.search;

    if (!filtersChanged) return;

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
  }, [startDate, endDate, search]);

  const handleFetchData = (targetFilters = null) => {
    const rawFilters = targetFilters || { startDate, endDate, search };
    const filters = {};
    if (rawFilters.startDate) filters.startDate = rawFilters.startDate;
    if (rawFilters.endDate) filters.endDate = rawFilters.endDate;
    if (rawFilters.search) filters.search = rawFilters.search;

    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
    }

    lastFetchedFilters.current = rawFilters;

    const promise = dispatch(fetchPartySalePurchase(filters));
    activeRequestRef.current = promise;

    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    const cleanDates = getInitialDates();
    setStartDate(cleanDates.start);
    setEndDate(cleanDates.end);
    setSearch('');

    const cleanFilters = { startDate: cleanDates.start, endDate: cleanDates.end, search: '' };

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    handleFetchData(cleanFilters);
  };

  // Compute metrics from data
  const summaryMetrics = useMemo(() => {
    const records = partySalePurchase || [];
    let totalSales = 0;
    let totalPurchases = 0;
    let totalParties = records.length;

    records.forEach((item) => {
      const salesAmt = Number(item.saleAmount || 0);
      const purchaseAmt = Number(item.purchaseAmount || 0);
      totalSales += salesAmt;
      totalPurchases += purchaseAmt;
    });

    return { totalSales, totalPurchases, totalParties };
  }, [partySalePurchase]);

  // Process data for Table (Sorting, Pagination)
  const processedData = useMemo(() => {
    const records = partySalePurchase || [];
    let result = [...records];

    // Client-side sort
    if (sortConfig.key) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (sortConfig.key === 'partyName') {
          valA = a.partyName || '';
          valB = b.partyName || '';
        } else if (sortConfig.key === 'phoneNumber') {
          valA = a.phoneNumber || '';
          valB = b.phoneNumber || '';
        } else if (sortConfig.key === 'saleAmount') {
          valA = Number(a.saleAmount || 0);
          valB = Number(b.saleAmount || 0);
        } else if (sortConfig.key === 'purchaseAmount') {
          valA = Number(a.purchaseAmount || 0);
          valB = Number(b.purchaseAmount || 0);
        }

        if (typeof valA === 'string') {
          return sortConfig.direction === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }

        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      });
    }

    return result;
  }, [partySalePurchase, sortConfig]);

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
    if (type === 'csv') {
      const headers = ['Party Name', 'Phone Number', 'Sale Amount', 'Purchase Amount'];
      const rows = processedData.map(item => [
        item.partyName || 'Walk-in Contact',
        item.phoneNumber || '—',
        item.saleAmount || 0,
        item.purchaseAmount || 0
      ]);
      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `party_sale_purchase_report_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('PDF generation is starting...');
    }
  };

  const startIndex = processedData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, processedData.length);

  return (
    <div className="space-y-6 text-gray-800 bg-white">
      {/* ── Header Section ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-150 pb-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Party Sale–Purchase Report</h1>
          <p className="text-xs text-gray-500 font-medium">
            View total sales and purchases for customers & suppliers.
          </p>
        </div>
        
        {/* Export Dropdown Button */}
        <div className="relative" ref={exportDropdownRef}>
          <button
            onClick={() => setExportOpen(!exportOpen)}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-250 hover:bg-gray-550 rounded-lg text-xs font-bold text-gray-700 bg-white shadow-sm transition-all cursor-pointer"
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
                  handleExport('csv');
                }}
                className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 font-semibold"
              >
                Export CSV
              </button>
              <button
                onClick={() => {
                  setExportOpen(false);
                  handleExport('pdf');
                }}
                className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 font-semibold"
              >
                Export PDF
              </button>
            </div>
          )}
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

      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Date Range Picker inputs inside a styled container */}
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
          <div className="flex-grow min-w-[240px] flex flex-col">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by party name or phone number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-gray-200 pl-9 pr-3 h-[38px] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#15803D] focus:ring-1 focus:ring-[#15803D] text-gray-700 shadow-sm"
              />
            </div>
          </div>

          {/* Filters Button */}
          <button
            type="button"
            className="flex items-center gap-1.5 px-4 h-[38px] bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 shadow-sm transition-all cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <span>Filters</span>
          </button>

          {/* Reset Filters Button */}
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-3 h-[38px] text-xs font-bold text-gray-505 hover:text-gray-900 transition-all cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Sales */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm h-[96px]">
          <div className="w-12 h-12 bg-green-50 text-[#16A34A] rounded-full flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-gray-505">Total Sales</span>
            <h3 className="text-xl font-bold text-gray-900 tabular-nums">
              {formatCurrency(summaryMetrics.totalSales)}
            </h3>
          </div>
        </div>

        {/* Card 2: Total Purchases */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm h-[96px]">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-gray-550">Total Purchases</span>
            <h3 className="text-xl font-bold text-gray-900 tabular-nums">
              {formatCurrency(summaryMetrics.totalPurchases)}
            </h3>
          </div>
        </div>

        {/* Card 3: Total Parties */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm h-[96px]">
          <div className="w-12 h-12 bg-slate-50 text-slate-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-gray-550">Total Parties</span>
            <h3 className="text-xl font-bold text-gray-900 tabular-nums">
              {summaryMetrics.totalParties}
            </h3>
          </div>
        </div>
      </div>

      {/* ── Table Section ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        {partySalePurchaseLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-xs gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#15803D]" />
            <span>Loading report...</span>
          </div>
        ) : processedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <span className="text-4xl mb-3 select-none">🔍</span>
            <h3 className="text-sm font-bold text-gray-800">No records found</h3>
            <p className="text-xs text-gray-400 mt-1 select-none">
              Try changing the selected filters or date range.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto relative min-h-[240px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-gray-150">
                    <th 
                      onClick={() => handleSort('partyName')}
                      className="py-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-50 select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Party Name</span>
                        <span className="text-[10px] text-gray-400">
                          {sortConfig.key === 'partyName' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
                        </span>
                      </div>
                    </th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Phone Number</th>
                    <th 
                      onClick={() => handleSort('saleAmount')}
                      className="py-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-50 select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Sale Amount</span>
                        <span className="text-[10px] text-gray-400">
                          {sortConfig.key === 'saleAmount' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
                        </span>
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('purchaseAmount')}
                      className="py-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-50 select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Purchase Amount</span>
                        <span className="text-[10px] text-gray-400">
                          {sortConfig.key === 'purchaseAmount' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
                        </span>
                      </div>
                    </th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider text-right w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedData.map((item, index) => {
                    const partyName = item.partyName || 'Walk-in Contact';
                    const phone = item.phoneNumber || '—';
                    const sales = Number(item.saleAmount || 0);
                    const purchase = Number(item.purchaseAmount || 0);

                    return (
                      <tr key={item.partyId || index} className="hover:bg-gray-50/30 transition-colors h-[52px]">
                        <td className="py-2.5 px-4 text-sm font-semibold text-gray-900">
                          {partyName}
                        </td>
                        <td className="py-2.5 px-4 text-sm text-gray-600">
                          {phone}
                        </td>
                        <td className="py-2.5 px-4 text-sm font-medium text-green-600 tabular-nums">
                          {formatCurrency(sales)}
                        </td>
                        <td className="py-2.5 px-4 text-sm font-medium text-blue-600 tabular-nums">
                          {formatCurrency(purchase)}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-right relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenRowActionId(openRowActionId === item.partyId ? null : item.partyId);
                            }}
                            className="text-gray-400 hover:text-gray-650 p-1 rounded transition-colors cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          
                          {openRowActionId === item.partyId && (
                            <div 
                              ref={rowMenuRef}
                              className="absolute right-6 top-2 w-36 bg-white border border-gray-205 rounded-lg shadow-lg py-1.5 z-30 text-left animate-fade-in"
                            >
                              <button
                                onClick={() => setOpenRowActionId(null)}
                                className="w-full px-4 py-1.5 text-xs text-gray-700 hover:bg-gray-50 font-semibold"
                              >
                                View Ledger
                              </button>
                              <button
                                onClick={() => setOpenRowActionId(null)}
                                className="w-full px-4 py-1.5 text-xs text-gray-750 hover:bg-gray-50 font-semibold"
                              >
                                Party Details
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {Math.ceil(processedData.length / itemsPerPage) > 1 && (
              <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between bg-white flex-wrap gap-4 select-none">
                {/* Left: Item Range */}
                <div className="text-xs font-semibold text-gray-500">
                  Showing{' '}
                  <span className="text-[#15803D] font-bold">
                    {processedData.length === 0 ? 0 : startIndex}–{endIndex}
                  </span>{' '}
                  of <span className="text-[#15803D] font-bold">{Number(processedData.length).toLocaleString('en-IN')}</span> items
                </div>
                
                {/* Center: Current Page Status */}
                <div className="text-xs font-semibold text-gray-500">
                  Page <span className="text-[#15803D] font-bold">{currentPage}</span> of {Math.ceil(processedData.length / itemsPerPage)}
                </div>

                {/* Right: Previous / Next Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage <= 1}
                    className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 font-bold text-xs text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#15803D]" />
                    <span>Previous</span>
                  </button>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, Math.ceil(processedData.length / itemsPerPage)))}
                    disabled={currentPage >= Math.ceil(processedData.length / itemsPerPage)}
                    className="flex items-center gap-2 bg-[#15803D] hover:bg-green-700 text-white rounded-xl px-4 py-2 font-bold text-xs shadow-sm shadow-green-600/10 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PartySalePurchaseReport;

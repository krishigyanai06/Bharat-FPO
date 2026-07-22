import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchExpenses } from '../../store/thunks/purchaseThunk';
import { fetchParties } from '../../store/thunks/partyThunk';
import { downloadExpenseReport } from '../../store/thunks/reportsThunk';
import { generateClientExpenseReportPDF, generateIndividualExpensePDF } from '../../utils/clientPdfGenerator';
import api from '../../lib/api';
import ErrorState from '../../components/ErrorState';
import { 
  Check, 
  RotateCw, 
  Search, 
  ArrowLeft, 
  ArrowRight, 
  AlertCircle,
  Download,
  Loader2,
  ChevronDown,
  Coins,
  FileText,
  Wallet
} from 'lucide-react';

const ExpenseReport = () => {
  const dispatch = useDispatch();
  const dropdownRef = useRef(null);

  // Redux Selectors
  const { expenses, loading: expensesLoading } = useSelector((state) => state.purchase);
  const { parties } = useSelector((state) => state.party);
  const { expenseDownloadLoading, error } = useSelector((state) => state.reports);

  // Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [gstEnabled, setGstEnabled] = useState('');
  const [partyId, setPartyId] = useState('');
  const [search, setSearch] = useState('');

  // Refs for tracking reactive lifecycle and network requests
  const isMounted = useRef(false);
  const lastFetchedFilters = useRef(null);
  const debounceTimerRef = useRef(null);
  const activeRequestRef = useRef(null);

  // Dropdown actions menu state
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Table Pagination and Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortConfig, setSortConfig] = useState({ key: 'billDate', direction: 'desc' });

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Initial Fetch
  useEffect(() => {
    dispatch(fetchParties());
  }, [dispatch]);

  // Reactive Fetch when filters change
  useEffect(() => {
    const currentFilters = { startDate, endDate, category, paymentType, gstEnabled, party: partyId };

    const filtersChanged = !lastFetchedFilters.current ||
      currentFilters.startDate !== lastFetchedFilters.current.startDate ||
      currentFilters.endDate !== lastFetchedFilters.current.endDate ||
      currentFilters.category !== lastFetchedFilters.current.category ||
      currentFilters.paymentType !== lastFetchedFilters.current.paymentType ||
      currentFilters.gstEnabled !== lastFetchedFilters.current.gstEnabled ||
      currentFilters.party !== lastFetchedFilters.current.party;

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
  }, [startDate, endDate, category, paymentType, gstEnabled, partyId]);

  const handleFetchData = (targetFilters = null) => {
    const rawFilters = targetFilters || { startDate, endDate, category, paymentType, gstEnabled, party: partyId };
    const filters = {};
    if (rawFilters.startDate) filters.startDate = rawFilters.startDate;
    if (rawFilters.endDate) filters.endDate = rawFilters.endDate;
    if (rawFilters.category) filters.category = rawFilters.category;
    if (rawFilters.paymentType) filters.paymentType = rawFilters.paymentType;
    if (rawFilters.gstEnabled !== '') filters.gstEnabled = rawFilters.gstEnabled === 'true';
    if (rawFilters.party) filters.party = rawFilters.party;

    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
    }

    lastFetchedFilters.current = rawFilters;

    const promise = dispatch(fetchExpenses(filters));
    activeRequestRef.current = promise;

    setCurrentPage(1);
    setOpenDropdownId(null);
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setCategory('');
    setPaymentType('');
    setGstEnabled('');
    setPartyId('');
    setSearch('');

    const cleanFilters = { startDate: '', endDate: '', category: '', paymentType: '', gstEnabled: '', party: '' };

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    handleFetchData(cleanFilters);
  };

  const handleDownloadPDF = async () => {
    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (category) filters.category = category;
    if (paymentType) filters.paymentType = paymentType;
    if (gstEnabled !== '') filters.gstEnabled = gstEnabled === 'true';
    if (partyId) filters.party = partyId;

    const res = await dispatch(downloadExpenseReport(filters));
    
    if (downloadExpenseReport.rejected.match(res)) {
      console.warn('[ExpenseReport] Backend PDF failed. Generating client-side PDF...');
      generateClientExpenseReportPDF(processedData, filters);
    }
  };

  const handleDownloadIndividual = async (item) => {
    try {
      const expenseNo = item.expenseNo || item._id;
      const res = await api.get(`/purchase/expense/receipt/${item._id}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ExpenseVoucher_${expenseNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('[ExpenseReport] Individual PDF download failed. Generating client-side PDF...');
      generateIndividualExpensePDF(item);
    }
  };

  // Compute metrics from data
  const summaryMetrics = useMemo(() => {
    const records = expenses || [];
    let totalExpenses = 0;
    let gstCount = 0;
    let nonGstCount = 0;
    const totalCount = records.length;

    records.forEach((item) => {
      totalExpenses += Number(item.totalAmount || 0);
      if (item.gstEnabled) {
        gstCount += 1;
      } else {
        nonGstCount += 1;
      }
    });

    return { totalExpenses, totalCount, gstCount, nonGstCount };
  }, [expenses]);

  // Process data for Table (Filtering, Sorting, Pagination)
  const processedData = useMemo(() => {
    const records = expenses || [];
    let result = [...records];

    // Client-side search match
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          String(item.expenseNo || item._id || '').toLowerCase().includes(q) ||
          String(item.expenseCategory || '').toLowerCase().includes(q) ||
          String(item.party?.name || item.supplierName || '').toLowerCase().includes(q) ||
          String(item.party?.phone || item.supplierPhone || '').includes(q) ||
          String(item.refNo || item.referenceNo || '').toLowerCase().includes(q)
      );
    }

    // Client-side sort
    if (sortConfig.key) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (sortConfig.key === 'billDate' || sortConfig.key === 'date') {
          valA = new Date(valA || 0);
          valB = new Date(valB || 0);
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
  }, [expenses, search, sortConfig]);

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

  const startIndex = processedData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, processedData.length);

  return (
    <div className="space-y-4 text-gray-800 bg-white">
      {/* ── Header Section (Compact) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-3">
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Expense Report</h1>
          <p className="text-xs text-gray-400 font-medium">
            Analyze administrative costs, utility bills, inventory charges, and general operations.
          </p>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={expenseDownloadLoading}
          className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#15803D] hover:bg-[#126630] rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          {expenseDownloadLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          <span>{expenseDownloadLoading ? 'Downloading...' : 'Download PDF'}</span>
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

      {/* ── Compact Single-Row Filter Bar ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Party */}
          <div className="w-[130px]">
            <select
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              className="w-full bg-white border border-gray-200 px-2 py-1.5 h-[38px] rounded-lg text-xs font-bold focus:outline-none focus:border-[#15803D] focus:ring-1 focus:ring-[#15803D] text-gray-700 shadow-sm cursor-pointer"
            >
              <option value="">Supplier Name</option>
              {parties?.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="w-[125px]">
            <input
              type={startDate ? "date" : "text"}
              placeholder="📅 From Date"
              value={startDate}
              onFocus={(e) => (e.target.type = "date")}
              onBlur={(e) => {
                if (!e.target.value) e.target.type = "text";
              }}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white border border-gray-200 px-2 py-1.5 h-[38px] rounded-lg text-xs font-medium focus:outline-none focus:border-[#15803D] focus:ring-1 focus:ring-[#15803D] text-gray-700 shadow-sm"
            />
          </div>

          {/* End Date */}
          <div className="w-[125px]">
            <input
              type={endDate ? "date" : "text"}
              placeholder="📅 To Date"
              value={endDate}
              onFocus={(e) => (e.target.type = "date")}
              onBlur={(e) => {
                if (!e.target.value) e.target.type = "text";
              }}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white border border-gray-200 px-2 py-1.5 h-[38px] rounded-lg text-xs font-medium focus:outline-none focus:border-[#15803D] focus:ring-1 focus:ring-[#15803D] text-gray-700 shadow-sm"
            />
          </div>

          {/* Category */}
          <div className="w-[130px]">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white border border-gray-200 px-2 py-1.5 h-[38px] rounded-lg text-xs font-bold focus:outline-none focus:border-[#15803D] focus:ring-1 focus:ring-[#15803D] text-gray-700 shadow-sm cursor-pointer"
            >
              <option value="">Expense Category</option>
              <option value="Office Supplies">Office Supplies</option>
              <option value="Rent">Rent</option>
              <option value="Logistics">Logistics</option>
              <option value="Utilities">Utilities</option>
              <option value="Marketing">Marketing</option>
              <option value="Salary">Salary</option>
              <option value="Other Expenses">Other Expenses</option>
            </select>
          </div>

          {/* Payment Type */}
          <div className="w-[120px]">
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              className="w-full bg-white border border-gray-200 px-2 py-1.5 h-[38px] rounded-lg text-xs font-bold focus:outline-none focus:border-[#15803D] focus:ring-1 focus:ring-[#15803D] text-gray-700 shadow-sm cursor-pointer"
            >
              <option value="">Payment Type</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank">Bank Transfer</option>
              <option value="Card">Card</option>
            </select>
          </div>

          {/* GST Details */}
          <div className="w-[120px]">
            <select
              value={gstEnabled}
              onChange={(e) => setGstEnabled(e.target.value)}
              className="w-full bg-white border border-gray-200 px-2 py-1.5 h-[38px] rounded-lg text-xs font-bold focus:outline-none focus:border-[#15803D] focus:ring-1 focus:ring-[#15803D] text-gray-700 shadow-sm cursor-pointer"
            >
              <option value="">GST Status</option>
              <option value="true">GST Enabled</option>
              <option value="false">Without GST</option>
            </select>
          </div>

          {/* Search bar */}
          <div className="relative flex-grow min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by category, payee, expense no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-200 pl-8 pr-3 h-[38px] rounded-lg text-xs font-medium focus:outline-none focus:border-[#15803D] focus:ring-1 focus:ring-[#15803D] text-gray-700 shadow-sm"
            />
          </div>

          {/* Clear Filters Button */}
          <div className="flex gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center justify-center gap-1 px-3 h-[38px] text-xs font-bold text-gray-500 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary Cards Section (90-100px Height) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Expenses */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3.5 shadow-sm h-[90px]">
          <div className="p-2.5 bg-green-50 text-[#15803D] rounded-xl flex items-center justify-center">
            <Coins className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Expenses</span>
            <h3 className="text-base font-extrabold text-[#15803D] tabular-nums">
              {formatCurrency(summaryMetrics.totalExpenses)}
            </h3>
          </div>
        </div>

        {/* Card 2: Total Bills */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3.5 shadow-sm h-[90px]">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Transactions</span>
            <h3 className="text-base font-extrabold text-blue-650 tabular-nums">
              {summaryMetrics.totalCount}
            </h3>
          </div>
        </div>

        {/* Card 3: GST Enabled */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3.5 shadow-sm h-[90px]">
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">GST Registered</span>
            <h3 className="text-base font-extrabold text-purple-650 tabular-nums">
              {summaryMetrics.gstCount}
            </h3>
          </div>
        </div>

        {/* Card 4: Non-GST Bills */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3.5 shadow-sm h-[90px]">
          <div className="p-2.5 bg-orange-50 text-orange-550 rounded-xl flex items-center justify-center">
            <Coins className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Non-GST Bills</span>
            <h3 className="text-base font-extrabold text-orange-650 tabular-nums">
              {summaryMetrics.nonGstCount}
            </h3>
          </div>
        </div>
      </div>

      {/* ── Table Section (Modern Accounting Style) ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        {expensesLoading ? (
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
                  <tr className="bg-[#F8FAFC] border-b border-gray-100 sticky top-0 z-10">
                    <th className="py-2.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Expense No.</th>
                    <th className="py-2.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                    <th 
                      onClick={() => handleSort('billDate')}
                      className="py-2.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Date</span>
                        <span className="text-[9px]">
                          {sortConfig.key === 'billDate' && sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      </div>
                    </th>
                    <th className="py-2.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Payee</th>
                    <th className="py-2.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Payment Method</th>
                    <th className="py-2.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">GST Details</th>
                    <th className="py-2.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="py-2.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedData.map((item, index) => {
                    const amountVal = Number(item.totalAmount || 0);

                    return (
                      <tr key={item._id || index} className="hover:bg-gray-55/20 transition-colors h-[48px]">
                        {/* Expense No */}
                        <td className="py-2 px-4 text-xs">
                          <span className="text-[#15803D] hover:underline font-bold cursor-pointer">
                            {item.expenseNo || item._id?.substring(0, 8).toUpperCase() || '—'}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="py-2 px-4 text-xs font-bold text-gray-900">
                          {item.expenseCategory || 'Other Expenses'}
                        </td>

                        {/* Date */}
                        <td className="py-2 px-4 text-xs text-gray-500">
                          {item.billDate || item.date || item.createdAt ? new Date(item.billDate || item.date || item.createdAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          }) : '—'}
                        </td>

                        {/* Payee */}
                        <td className="py-2 px-4 text-xs">
                          {item.party?.name || item.supplierName || 'Walk-in Vendor'}
                        </td>

                        {/* Payment Method */}
                        <td className="py-2 px-4 text-xs">
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border bg-gray-50 text-gray-600 border-gray-200">
                            {item.paymentType || 'Cash'}
                          </span>
                        </td>

                        {/* GST Details */}
                        <td className="py-2 px-4 text-xs">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            item.gstEnabled 
                              ? 'bg-purple-50 text-purple-700 border-purple-200' 
                              : 'bg-gray-50 text-gray-600 border-gray-200'
                          }`}>
                            {item.gstEnabled ? 'GST Registered' : 'Non-GST'}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="py-2 px-4 text-xs font-bold text-red-650 tabular-nums">
                          ₹{amountVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-4 text-xs text-center" ref={openDropdownId === (item._id || index) ? dropdownRef : null}>
                          <div className="relative inline-block text-left">
                            <button
                              onClick={() => setOpenDropdownId(openDropdownId === (item._id || index) ? null : (item._id || index))}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold border border-gray-200 bg-white hover:bg-gray-50 rounded-lg shadow-sm text-gray-700 transition-colors cursor-pointer select-none"
                            >
                              <span>Action</span>
                              <ChevronDown className="w-3 h-3 text-gray-400" />
                            </button>

                            {/* Dropdown Floating Options Menu */}
                            {openDropdownId === (item._id || index) && (
                              <div className={`absolute right-0 w-28 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-30 text-left animate-fade-in ${
                                index >= paginatedData.length - 2 && paginatedData.length > 2
                                  ? 'bottom-full mb-1'
                                  : 'top-full mt-1'
                              }`}>
                                <button
                                  onClick={() => {
                                    alert(`Viewing expense details for ${item.expenseNo || item._id}`);
                                    setOpenDropdownId(null);
                                  }}
                                  className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 font-medium cursor-pointer"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => {
                                    alert(`Opening print dialog for expense ${item.expenseNo || item._id}`);
                                    setOpenDropdownId(null);
                                  }}
                                  className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 font-medium cursor-pointer"
                                >
                                  Print
                                </button>
                                <button
                                  onClick={() => {
                                    handleDownloadIndividual(item);
                                    setOpenDropdownId(null);
                                  }}
                                  className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 font-medium cursor-pointer"
                                >
                                  Download
                                </button>
                              </div>
                            )}
                          </div>
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

export default ExpenseReport;

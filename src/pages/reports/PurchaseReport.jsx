import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPurchases } from '../../store/thunks/purchaseThunk';
import { fetchParties } from '../../store/thunks/partyThunk';
import { downloadPurchaseReport } from '../../store/thunks/reportsThunk';
import { generateClientPurchaseReportPDF, generateIndividualPurchasePDF } from '../../utils/clientPdfGenerator';
import api from '../../lib/api';
import ErrorState from '../../components/ErrorState';

import { 
  RotateCw, 
  Search, 
  ArrowLeft, 
  ArrowRight, 
  Loader2,
  Wallet,
  AlertCircle,
  ShoppingBag,
  Users,
  Calendar,
  MoreVertical,
  Download,
  ChevronDown,
  Info,
  Printer,
  FileText,
  FileSpreadsheet,
  TrendingUp,
  ArrowUpRight,
  RefreshCw,
  Building
} from 'lucide-react';

const PurchaseReport = () => {
  const dispatch = useDispatch();
  const exportDropdownRef = useRef(null);
  const rowMenuRef = useRef(null);

  // Redux Selectors
  const { purchases, loading: purchasesLoading } = useSelector((state) => state.purchase);
  const { parties } = useSelector((state) => state.party);
  const { purchaseDownloadLoading, error } = useSelector((state) => state.reports);

  // Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [purchaseType, setPurchaseType] = useState('');
  const [billingType, setBillingType] = useState('');
  const [partyId, setPartyId] = useState('');
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
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

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

  // Initial Fetch
  useEffect(() => {
    dispatch(fetchParties());
  }, [dispatch]);

  // Reactive Fetch when filters change
  useEffect(() => {
    const currentFilters = { startDate, endDate, purchaseType, billingType, party: partyId };

    const filtersChanged = !lastFetchedFilters.current ||
      currentFilters.startDate !== lastFetchedFilters.current.startDate ||
      currentFilters.endDate !== lastFetchedFilters.current.endDate ||
      currentFilters.purchaseType !== lastFetchedFilters.current.purchaseType ||
      currentFilters.billingType !== lastFetchedFilters.current.billingType ||
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
  }, [startDate, endDate, purchaseType, billingType, partyId]);

  const handleFetchData = (targetFilters = null) => {
    const rawFilters = targetFilters || { startDate, endDate, purchaseType, billingType, party: partyId };
    const filters = {};
    if (rawFilters.startDate) filters.startDate = rawFilters.startDate;
    if (rawFilters.endDate) filters.endDate = rawFilters.endDate;
    if (rawFilters.purchaseType) filters.purchaseType = rawFilters.purchaseType;
    if (rawFilters.billingType) filters.billingType = rawFilters.billingType;
    if (rawFilters.party) filters.party = rawFilters.party;

    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
    }

    lastFetchedFilters.current = rawFilters;

    const promise = dispatch(fetchPurchases(filters));
    activeRequestRef.current = promise;

    setCurrentPage(1);
    setOpenRowActionId(null);
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setPurchaseType('');
    setBillingType('');
    setPartyId('');
    setSearch('');

    const cleanFilters = { startDate: '', endDate: '', purchaseType: '', billingType: '', party: '' };

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    handleFetchData(cleanFilters);
  };

  const handleDownloadPDF = async () => {
    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (purchaseType) filters.purchaseType = purchaseType;
    if (billingType) filters.billingType = billingType;
    if (partyId) filters.party = partyId;

    const res = await dispatch(downloadPurchaseReport(filters));
    
    if (downloadPurchaseReport.rejected.match(res)) {
      console.warn('[PurchaseReport] Backend PDF failed. Generating client-side PDF...');
      generateClientPurchaseReportPDF(processedData, filters);
    }
  };

  const handleDownloadIndividual = async (item) => {
    try {
      const billNo = item.billNumber || item.billNo || item.orderNo || item.orderNumber || item._id;
      const res = await api.get(`/purchase/receipt/${item._id}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bill_${billNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('[PurchaseReport] Individual PDF download failed. Generating client-side PDF...');
      generateIndividualPurchasePDF(item);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Compute metrics from data
  const summaryMetrics = useMemo(() => {
    if (!purchases || !Array.isArray(purchases)) {
      return { totalPurchases: 0, totalBills: 0, receivedAmount: 0, unpaidAmount: 0, completionRate: 0, activeSuppliers: 0 };
    }

    let totalPurchases = 0;
    let receivedAmount = 0;
    let unpaidAmount = 0;
    const totalBills = purchases.length;
    const uniqueSuppliers = new Set();

    purchases.forEach((item) => {
      const totalAmt = Number(item.totalAmount || item.finalAmount || 0);
      totalPurchases += totalAmt;
      
      const recAmt = item.receivedAmount !== undefined 
        ? Number(item.receivedAmount) 
        : (item.billingType === 'Cash' ? totalAmt : 0);
      receivedAmount += recAmt;
      
      const unpAmt = item.unpaidAmount !== undefined 
        ? Number(item.unpaidAmount) 
        : (item.billingType === 'Credit' ? (totalAmt - recAmt) : 0);
      unpaidAmount += unpAmt;

      const name = item.supplierName || item.partyName || item.supplier?.name || item.party?.name || 'Walk-in Vendor';
      uniqueSuppliers.add(name);
    });

    const completionRate = totalPurchases > 0 ? (receivedAmount / totalPurchases) * 100 : 0;
    const activeSuppliers = uniqueSuppliers.size;

    return { totalPurchases, totalBills, receivedAmount, unpaidAmount, completionRate, activeSuppliers };
  }, [purchases]);

  // Compute Quick Insights from API data
  const insightsMetrics = useMemo(() => {
    const records = purchases || [];
    let topSupplierName = '—';
    let topSupplierValue = 0;
    let highestBillNo = '—';
    let highestBillAmount = 0;

    let paidCount = 0;
    let partialCount = 0;
    let pendingCount = 0;

    // Track total purchase values per supplier
    const supplierPurchases = {};

    records.forEach(item => {
      const totalAmt = Number(item.totalAmount || item.finalAmount || 0);
      const recAmt = item.receivedAmount !== undefined 
        ? Number(item.receivedAmount) 
        : (item.billingType === 'Cash' ? totalAmt : 0);
      const unpAmt = item.unpaidAmount !== undefined 
        ? Number(item.unpaidAmount) 
        : (item.billingType === 'Credit' ? (totalAmt - recAmt) : 0);

      // Bill status counts
      if (item.billingType === 'Credit' && unpAmt > 0) {
        if (recAmt > 0) {
          partialCount++;
        } else {
          pendingCount++;
        }
      } else {
        paidCount++;
      }

      // Highest Invoice
      if (totalAmt > highestBillAmount) {
        highestBillAmount = totalAmt;
        highestBillNo = item.billNumber || item.billNo || item.orderNo || item.orderNumber || item._id;
      }

      // Top Supplier calculation
      const name = item.supplierName || item.partyName || item.supplier?.name || item.party?.name || 'Walk-in Vendor';
      if (name !== 'Walk-in Vendor') {
        supplierPurchases[name] = (supplierPurchases[name] || 0) + totalAmt;
      }
    });

    // Find top supplier
    let maxPurchase = 0;
    Object.entries(supplierPurchases).forEach(([name, amt]) => {
      if (amt > maxPurchase) {
        maxPurchase = amt;
        topSupplierName = name;
        topSupplierValue = amt;
      }
    });

    return {
      topSupplierName,
      topSupplierValue,
      highestBillNo,
      highestBillAmount,
      paidCount,
      partialCount,
      pendingCount,
      totalCount: records.length
    };
  }, [purchases]);

  // Process data for Table (Filtering, Sorting, Pagination)
  const processedData = useMemo(() => {
    if (!purchases || !Array.isArray(purchases)) return [];

    let result = [...purchases];

    // Client-side search match (Instant Search)
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          String(item.billNumber || item.billNo || '').toLowerCase().includes(q) ||
          String(item.orderNo || item.orderNumber || '').toLowerCase().includes(q) ||
          String(item.refNo || item.referenceNo || '').toLowerCase().includes(q) ||
          String(item.supplierName || item.partyName || item.supplier?.name || item.party?.name || '').toLowerCase().includes(q) ||
          String(item.supplierPhone || item.party?.phone || item.supplier?.phone || '').includes(q)
      );
    }

    // Client-side sort
    if (sortConfig.key) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (sortConfig.key === 'date') {
          valA = new Date(a.billDate || a.createdAt || a.date || 0);
          valB = new Date(b.billDate || b.createdAt || b.date || 0);
        } else if (sortConfig.key === 'billNo') {
          valA = a.billNumber || a.billNo || a.orderNo || a.orderNumber || '';
          valB = b.billNumber || b.billNo || b.orderNo || b.orderNumber || '';
        } else if (sortConfig.key === 'totalAmount') {
          valA = Number(a.totalAmount || a.finalAmount || 0);
          valB = Number(b.totalAmount || b.finalAmount || 0);
        } else if (sortConfig.key === 'unpaidAmount') {
          const totA = Number(a.totalAmount || a.finalAmount || 0);
          const recA = a.receivedAmount !== undefined ? Number(a.receivedAmount) : (a.billingType === 'Cash' ? totA : 0);
          valA = a.billingType === 'Credit' ? (totA - recA) : 0;

          const totB = Number(b.totalAmount || b.finalAmount || 0);
          const recB = b.receivedAmount !== undefined ? Number(b.receivedAmount) : (b.billingType === 'Cash' ? totB : 0);
          valB = b.billingType === 'Credit' ? (totB - recB) : 0;
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
  }, [purchases, search, sortConfig]);

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

  const handleExportExcel = () => {
    const headers = ['Bill No.', 'Date', 'Supplier Name', 'Supplier Phone', 'Purchase Type', 'Payment Type', 'Bill Amount', 'Paid Amount', 'Outstanding Amount'];
    const rows = processedData.map(item => {
      const totalAmt = Number(item.totalAmount || item.finalAmount || 0);
      const recAmt = item.receivedAmount !== undefined ? Number(item.receivedAmount) : (item.billingType === 'Cash' ? totalAmt : 0);
      const unpAmt = item.unpaidAmount !== undefined ? Number(item.unpaidAmount) : (item.billingType === 'Credit' ? (totalAmt - recAmt) : 0);
      return [
        item.billNumber || item.billNo || item.orderNo || item.orderNumber || '',
        (item.billDate || item.createdAt || item.date) ? new Date(item.billDate || item.createdAt || item.date).toLocaleDateString('en-GB') : '',
        item.supplierName || item.partyName || item.supplier?.name || item.party?.name || 'Walk-in Vendor',
        item.supplierPhone || item.party?.phone || '',
        item.purchaseType || 'BILL',
        item.billingType || 'Cash',
        totalAmt,
        recAmt,
        unpAmt
      ];
    });
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `purchase_report_${startDate || 'start'}_to_${endDate || 'end'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      <td className="py-2.5 px-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
      <td className="py-2.5 px-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="py-2.5 px-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
      <td className="py-2.5 px-4"><div className="h-4 bg-gray-200 rounded w-12" /></td>
      <td className="py-2.5 px-4"><div className="h-4 bg-gray-200 rounded w-12" /></td>
      <td className="py-2.5 px-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
      <td className="py-2.5 px-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
      <td className="py-2.5 px-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
      <td className="py-2.5 px-4"><div className="h-6 bg-gray-200 rounded-full w-14" /></td>
      <td className="py-2.5 px-4 text-center"><div className="h-4 bg-gray-200 rounded w-8 mx-auto" /></td>
    </tr>
  );

  return (
    <div className="space-y-6 text-gray-800 bg-[#F8FAFC] min-h-screen p-1">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Purchase Report</h1>
          <p className="text-xs text-gray-500 font-medium">
            Monitor purchase transactions, supplier payments, outstanding bills, and purchasing activity during the selected period.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap gap-2">
          {/* Export Dropdown Button */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 hover:bg-gray-55 rounded-lg text-xs font-bold text-gray-700 bg-white shadow-sm transition-all cursor-pointer h-[38px]"
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
                    handleExportExcel();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 font-semibold flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
                  Excel / CSV
                </button>
                <button
                  onClick={() => {
                    setExportOpen(false);
                    handleDownloadPDF();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 font-semibold flex items-center gap-1.5"
                  disabled={purchaseDownloadLoading}
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
            className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 hover:bg-gray-55 rounded-lg text-xs font-bold text-gray-700 bg-white shadow-sm transition-all cursor-pointer h-[38px]"
          >
            <Printer className="w-3.5 h-3.5 text-gray-500" />
            <span>Print</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => handleFetchData()}
            className="flex items-center justify-center p-2 border border-gray-200 hover:bg-gray-55 rounded-lg text-gray-700 bg-white shadow-sm transition-all cursor-pointer w-[38px] h-[38px]"
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

      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-end animate-fade-in">
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

          {/* Supplier filter */}
          <div className="w-[160px] flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Supplier</span>
            <select
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              className="w-full bg-white border border-gray-200 px-3 py-1.5 h-[38px] rounded-lg text-xs font-bold focus:outline-none focus:border-[#15803D] focus:ring-1 focus:ring-[#15803D] text-gray-750 shadow-sm cursor-pointer"
            >
              <option value="">All Suppliers</option>
              {parties?.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Purchase Type filter */}
          <div className="w-[120px] flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Purchase Type</span>
            <select
              value={purchaseType}
              onChange={(e) => setPurchaseType(e.target.value)}
              className="w-full bg-white border border-gray-200 px-3 py-1.5 h-[38px] rounded-lg text-xs font-bold focus:outline-none focus:border-[#15803D] focus:ring-1 focus:ring-[#15803D] text-gray-755 shadow-sm cursor-pointer"
            >
              <option value="">All Types</option>
              <option value="BILL">BILL</option>
              <option value="ORDER">ORDER</option>
            </select>
          </div>

          {/* Payment Type filter */}
          <div className="w-[140px] flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Payment Type</span>
            <select
              value={billingType}
              onChange={(e) => setBillingType(e.target.value)}
              className="w-full bg-white border border-gray-200 px-3 py-1.5 h-[38px] rounded-lg text-xs font-bold focus:outline-none focus:border-[#15803D] focus:ring-1 focus:ring-[#15803D] text-gray-750 shadow-sm cursor-pointer"
            >
              <option value="">All Payments</option>
              <option value="Cash">Cash</option>
              <option value="Credit">Credit</option>
            </select>
          </div>

          {/* Integrated Search bar */}
          <div className="flex-grow min-w-[200px] flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Search Bill / Supplier</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search bills by number or supplier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-gray-200 pl-9 pr-3 h-[38px] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#15803D] focus:ring-1 focus:ring-[#15803D] text-gray-700 shadow-sm"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleFetchData()}
              className="flex items-center justify-center px-4 h-[38px] bg-[#15803D] hover:bg-[#126630] text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
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
        {purchasesLoading ? (
          Array.from({ length: 6 }).map((_, idx) => <SkeletonCard key={idx} />)
        ) : (
          <>
            {/* Card 1: Total Purchase */}
            <div className="bg-white rounded-xl border border-gray-150 p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 text-[#16A34A] rounded-full flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Purchase</span>
                <h3 className="text-sm font-bold text-gray-900 tabular-nums">
                  {formatCurrency(summaryMetrics.totalPurchases)}
                </h3>
              </div>
            </div>

            {/* Card 2: Total Bills */}
            <div className="bg-white rounded-xl border border-gray-150 p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Bills</span>
                <h3 className="text-sm font-bold text-gray-900 tabular-nums">
                  {summaryMetrics.totalBills}
                </h3>
              </div>
            </div>

            {/* Card 3: Paid Amount */}
            <div className="bg-white rounded-xl border border-gray-150 p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 text-[#16A34A] rounded-full flex items-center justify-center flex-shrink-0">
                <Wallet className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Paid Amount</span>
                <h3 className="text-sm font-bold text-gray-900 tabular-nums">
                  {formatCurrency(summaryMetrics.receivedAmount)}
                </h3>
              </div>
            </div>

            {/* Card 4: Outstanding Amount */}
            <div className="bg-white rounded-xl border border-gray-155 p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Outstanding</span>
                <h3 className="text-sm font-bold text-gray-900 tabular-nums">
                  {formatCurrency(summaryMetrics.unpaidAmount)}
                </h3>
              </div>
            </div>

            {/* Card 5: Payment Completion */}
            <div className="bg-white rounded-xl border border-gray-150 p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 text-purple-650 rounded-full flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Payment Completion</span>
                <h3 className="text-sm font-bold text-gray-900 tabular-nums">
                  {summaryMetrics.completionRate.toFixed(0)}%
                </h3>
              </div>
            </div>

            {/* Card 6: Active Suppliers */}
            <div className="bg-white rounded-xl border border-gray-150 p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-50 text-slate-505 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active Suppliers</span>
                <h3 className="text-sm font-bold text-gray-900 tabular-nums">
                  {summaryMetrics.activeSuppliers}
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
          {purchasesLoading ? (
            Array.from({ length: 3 }).map((_, idx) => <SkeletonInsight key={idx} />)
          ) : (
            <>
              {/* Card 1: Top Supplier */}
              <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm flex flex-col justify-between min-h-[115px]">
                <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                  <span className="text-xs font-bold text-gray-500">🏆 Top Supplier</span>
                  <ArrowUpRight className="w-4 h-4 text-green-600 bg-green-50 rounded" />
                </div>
                <div className="pt-2">
                  <h4 className="text-sm font-bold text-gray-900 truncate">
                    {insightsMetrics.topSupplierName}
                  </h4>
                  <p className="text-xs font-bold text-[#16A34A] mt-1">
                    {insightsMetrics.topSupplierValue > 0 ? `Purchases: ${formatCurrency(insightsMetrics.topSupplierValue)}` : 'No purchases recorded'}
                  </p>
                </div>
              </div>

              {/* Card 2: Highest Purchase Bill */}
              <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm flex flex-col justify-between min-h-[115px]">
                <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                  <span className="text-xs font-bold text-gray-500">📄 Highest Purchase Bill</span>
                  <ArrowUpRight className="w-4 h-4 text-blue-600 bg-blue-50 rounded" />
                </div>
                <div className="pt-2">
                  <h4 className="text-sm font-bold text-gray-900 truncate">
                    Bill #{insightsMetrics.highestBillNo}
                  </h4>
                  <p className="text-xs font-bold text-blue-600 mt-1">
                    Amount: {formatCurrency(insightsMetrics.highestBillAmount)}
                  </p>
                </div>
              </div>

              {/* Card 3: Purchase Summary */}
              <div className="bg-white rounded-xl border border-gray-155 p-5 shadow-sm flex flex-col justify-between min-h-[115px]">
                <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                  <span className="text-xs font-bold text-gray-550">Purchase Summary</span>
                  <Info className="w-4.5 h-4.5 text-blue-600" />
                </div>
                <div className="grid grid-cols-4 gap-2 pt-2 text-[10px] font-bold text-center">
                  <div className="bg-slate-50 border border-gray-100 rounded py-1 px-0.5">
                    <span className="text-slate-650 block text-xs">{insightsMetrics.totalCount}</span>
                    <span className="text-gray-400 block uppercase scale-90">Total</span>
                  </div>
                  <div className="bg-green-50/50 border border-green-100 rounded py-1 px-0.5">
                    <span className="text-green-700 block text-xs">{insightsMetrics.paidCount}</span>
                    <span className="text-green-550 block uppercase scale-90">Paid</span>
                  </div>
                  <div className="bg-orange-50/50 border border-orange-100 rounded py-1 px-0.5">
                    <span className="text-orange-700 block text-xs">{insightsMetrics.partialCount}</span>
                    <span className="text-orange-550 block uppercase scale-90">Partial</span>
                  </div>
                  <div className="bg-red-50/50 border border-red-100 rounded py-1 px-0.5">
                    <span className="text-red-700 block text-xs">{insightsMetrics.pendingCount}</span>
                    <span className="text-red-550 block uppercase scale-90">Pending</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Table Section ── */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-sm overflow-hidden flex flex-col">
        {purchasesLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-gray-150">
                  <th className="py-3 px-4 text-xs font-bold text-gray-655 uppercase">Bill No.</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-655 uppercase">Date</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-655 uppercase">Supplier</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-655 uppercase">Purchase Type</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-655 uppercase">Billing Type</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-655 uppercase">Bill Amount</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-655 uppercase">Paid Amount</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-655 uppercase">Outstanding</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-655 uppercase">Status</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-655 uppercase text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, idx) => <SkeletonRow key={idx} />)}
              </tbody>
            </table>
          </div>
        ) : processedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <span className="text-5xl mb-4 select-none">📦</span>
            <h3 className="text-base font-bold text-gray-800">No Purchase Records Found</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm select-none">
              Try changing your filters or selecting another date range.
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
                    <th 
                      onClick={() => handleSort('billNo')}
                      className="py-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Bill No.</span>
                        <span className="text-[10px] text-gray-400">
                          {sortConfig.key === 'billNo' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
                        </span>
                      </div>
                    </th>

                    <th 
                      onClick={() => handleSort('date')}
                      className="py-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Purchase Date</span>
                        <span className="text-[10px] text-gray-400">
                          {sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
                        </span>
                      </div>
                    </th>

                    <th className="py-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Supplier</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Purchase Type</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Billing Type</th>

                    <th 
                      onClick={() => handleSort('totalAmount')}
                      className="py-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none text-right"
                    >
                      <div className="flex items-center gap-1 justify-end">
                        <span>Bill Amount</span>
                        <span className="text-[10px] text-gray-400">
                          {sortConfig.key === 'totalAmount' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
                        </span>
                      </div>
                    </th>

                    <th className="py-3 px-4 text-xs font-bold text-gray-600 tracking-wider text-right">Paid Amount</th>

                    <th 
                      onClick={() => handleSort('unpaidAmount')}
                      className="py-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none text-right"
                    >
                      <div className="flex items-center gap-1 justify-end">
                        <span>Outstanding Amount</span>
                        <span className="text-[10px] text-gray-400">
                          {sortConfig.key === 'unpaidAmount' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
                        </span>
                      </div>
                    </th>
                    
                    <th className="py-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {paginatedData.map((item, index) => {
                    const totalAmt = Number(item.totalAmount || item.finalAmount || 0);
                    const recAmt = item.receivedAmount !== undefined 
                      ? Number(item.receivedAmount) 
                      : (item.billingType === 'Cash' ? totalAmt : 0);
                    const unpAmt = item.unpaidAmount !== undefined 
                      ? Number(item.unpaidAmount) 
                      : (item.billingType === 'Credit' ? (totalAmt - recAmt) : 0);

                    // Badge logic matching status rules
                    let badgeClass = 'bg-gray-55 text-gray-500 border-gray-150';
                    let statusLabel = item.status || 'Paid';

                    if (item.billingType === 'Credit' && unpAmt > 0) {
                      if (recAmt > 0) {
                        badgeClass = 'bg-orange-50 text-orange-700 border-orange-100';
                        statusLabel = 'Partial';
                      } else {
                        badgeClass = 'bg-red-50 text-red-700 border-red-100';
                        statusLabel = 'Pending';
                      }
                    } else if (String(item.status).toLowerCase().includes('cancel')) {
                      badgeClass = 'bg-gray-55 text-gray-550 border-gray-200';
                      statusLabel = 'Cancelled';
                    } else {
                      badgeClass = 'bg-green-50 text-green-700 border-green-100';
                      statusLabel = 'Paid';
                    }

                    const billNo = item.billNumber || item.billNo || item.orderNo || item.orderNumber || '—';

                    return (
                      <tr key={item._id || index} className="hover:bg-slate-50/45 transition-colors h-[52px] border-b border-gray-50 odd:bg-white even:bg-slate-50/10">
                        {/* Clickable Bill No */}
                        <td className="py-2.5 px-4 text-sm font-semibold text-[#15803D] hover:underline cursor-pointer">
                          <span onClick={() => alert(`View details of purchase bill: ${billNo}`)}>
                            {billNo}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="py-2.5 px-4 text-sm text-gray-550">
                          {(item.billDate || item.createdAt || item.date) ? new Date(item.billDate || item.createdAt || item.date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          }) : '—'}
                        </td>

                        {/* Supplier */}
                        <td className="py-2.5 px-4 text-sm">
                          <div className="font-semibold text-gray-900 leading-tight">
                            {item.supplierName || item.partyName || item.supplier?.name || item.party?.name || 'Walk-in Vendor'}
                          </div>
                          {(item.supplierPhone || item.party?.phone || item.party?.phoneNumber) && (
                            <div className="text-[10px] text-gray-400 font-medium">
                              {item.supplierPhone || item.party?.phone || item.party?.phoneNumber}
                            </div>
                          )}
                        </td>

                        {/* Purchase Type */}
                        <td className="py-2.5 px-4 text-xs font-bold text-gray-500" title="Type of transaction (BILL or ORDER)">
                          {item.purchaseType || 'BILL'}
                        </td>

                        {/* Billing Type */}
                        <td className="py-2.5 px-4 text-xs" title="Billing payment mode (Cash or Credit)">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                            item.billingType === 'Cash' 
                              ? 'bg-gray-50 text-gray-600 border-gray-200' 
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}>
                            {item.billingType || 'Cash'}
                          </span>
                        </td>

                        {/* Total (Right aligned) */}
                        <td className="py-2.5 px-4 text-sm font-medium text-gray-900 tabular-nums text-right">
                          {formatCurrency(totalAmt)}
                        </td>

                        {/* Paid Amount (Right aligned) */}
                        <td className="py-2.5 px-4 text-sm text-gray-600 tabular-nums text-right">
                          {formatCurrency(recAmt)}
                        </td>

                        {/* Outstanding Amount (Right aligned) */}
                        <td className={`py-2.5 px-4 text-sm font-bold tabular-nums text-right ${unpAmt > 0 ? 'text-red-650' : 'text-gray-500'}`}>
                          {unpAmt > 0 ? formatCurrency(unpAmt) : 'Fully Paid'}
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-4">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badgeClass}`}>
                            {statusLabel}
                          </span>
                        </td>

                        {/* Row action three dot menu */}
                        <td className="py-2.5 px-4 text-xs text-right relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenRowActionId(openRowActionId === item._id ? null : item._id);
                            }}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          
                          {openRowActionId === item._id && (
                            <div 
                              ref={rowMenuRef}
                              className="absolute right-6 top-2 w-38 bg-white border border-gray-200 rounded-lg shadow-lg py-1.5 z-30 text-left animate-fade-in"
                            >
                              <button
                                onClick={() => {
                                  setOpenRowActionId(null);
                                  alert(`Viewing purchase details for ${billNo}`);
                                }}
                                className="w-full px-4 py-1.5 text-xs text-gray-700 hover:bg-gray-50 font-semibold cursor-pointer"
                              >
                                View Bill
                              </button>

                              <button
                                onClick={() => {
                                  setOpenRowActionId(null);
                                  alert(`Opening print dialog for bill ${billNo}`);
                                }}
                                className="w-full px-4 py-1.5 text-xs text-gray-700 hover:bg-gray-50 font-semibold cursor-pointer"
                              >
                                Print Bill
                              </button>

                              <button
                                onClick={() => {
                                  setOpenRowActionId(null);
                                  handleDownloadIndividual(item);
                                }}
                                className="w-full px-4 py-1.5 text-xs text-gray-700 hover:bg-gray-50 font-semibold cursor-pointer"
                              >
                                Download PDF
                              </button>
                              
                              {item.billingType === 'Credit' && unpAmt > 0 && (
                                <button
                                  onClick={() => {
                                    setOpenRowActionId(null);
                                    alert(`Initiate payment of due outstanding amount ${formatCurrency(unpAmt)}`);
                                  }}
                                  className="w-full px-4 py-1.5 text-xs text-green-700 hover:bg-gray-55 font-bold cursor-pointer"
                                >
                                  Record Payment
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setOpenRowActionId(null);
                                  alert(`Edit details of purchase bill: ${billNo}`);
                                }}
                                className="w-full px-4 py-1.5 text-xs text-gray-750 hover:bg-gray-50 font-semibold cursor-pointer"
                              >
                                Edit Purchase
                              </button>

                              <button
                                onClick={() => {
                                  setOpenRowActionId(null);
                                  alert(`Delete purchase bill: ${billNo}`);
                                }}
                                className="w-full px-4 py-1.5 text-xs text-red-655 hover:bg-gray-50 font-bold cursor-pointer"
                              >
                                Delete Purchase
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

export default PurchaseReport;

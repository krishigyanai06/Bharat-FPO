import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders } from '../../store/thunks/procurementThunk';
import { fetchMembers } from '../../store/thunks/membersThunk';
import { downloadProcurementReport } from '../../store/thunks/reportsThunk';
import ReportTable from '../../components/reports/ReportTable';
import ErrorState from '../../components/ErrorState';
import { 
  RotateCw, 
  Search, 
  Download, 
  Loader2,
  FileText,
  ShoppingCart,
  User,
  MapPin
} from 'lucide-react';

const ProcurementReport = () => {
  const dispatch = useDispatch();

  // Selectors
  const { orders: procurementOrders, loading: ordersLoading, error: ordersError } = useSelector((state) => state.procurement);
  const { members, loading: membersLoading } = useSelector((state) => state.members);
  const { procurementDownloadLoading } = useSelector((state) => state.reports);

  // Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [farmer, setFarmer] = useState('');
  const [procurementCenter, setProcurementCenter] = useState('');
  const [search, setSearch] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Load initial data
  useEffect(() => {
    dispatch(fetchOrders());
    dispatch(fetchMembers());
  }, [dispatch]);

  // Derived Farmers list for dropdown filter
  const farmersList = useMemo(() => {
    if (!members) return [];
    return members.filter(m => {
      const role = String(m.role || '').toLowerCase();
      return role === 'farmer' || role === 'user' || !role;
    });
  }, [members]);

  // Derived unique procurement centers list for filter
  const centersList = useMemo(() => {
    if (!procurementOrders) return [];
    const centers = procurementOrders.map(o => o.procurementCenter).filter(Boolean);
    return Array.from(new Set(centers));
  }, [procurementOrders]);

  // Process data with filtering
  const processedData = useMemo(() => {
    if (!procurementOrders) return [];
    return procurementOrders.filter((order) => {
      // 1. Farmer Filter
      if (farmer && order.farmer?._id !== farmer) {
        return false;
      }

      // 2. Procurement Center Filter
      if (procurementCenter && order.procurementCenter !== procurementCenter) {
        return false;
      }

      // 3. Date Range Filter
      if (startDate) {
        const orderDate = new Date(order.procurementDate || order.createdAt);
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (orderDate < start) return false;
      }
      if (endDate) {
        const orderDate = new Date(order.procurementDate || order.createdAt);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (orderDate > end) return false;
      }

      // 4. Global Text Search
      if (search.trim()) {
        const query = search.toLowerCase();
        const firstCrop = order.crops?.[0];
        const cropName = String(firstCrop?.cropName || firstCrop?.crop || '').toLowerCase();
        const farmerName = `${order.farmer?.firstName ?? ''} ${order.farmer?.lastName ?? ''}`.toLowerCase();
        const idStr = String(order._id || '').toLowerCase();
        const purchaseIdStr = String(order.purchaseId || '').toLowerCase();
        const center = String(order.procurementCenter || '').toLowerCase();

        const matches = 
          cropName.includes(query) ||
          farmerName.includes(query) ||
          idStr.includes(query) ||
          purchaseIdStr.includes(query) ||
          center.includes(query);

        if (!matches) return false;
      }

      return true;
    });
  }, [procurementOrders, farmer, procurementCenter, startDate, endDate, search]);

  // Summary Metrics
  const summary = useMemo(() => {
    const totalOrders = processedData.length;
    let totalQuantity = 0;
    let totalValue = 0;

    processedData.forEach((order) => {
      totalValue += Number(order.totalAmount) || 0;
      order.crops?.forEach((c) => {
        totalQuantity += Number(c.quantity) || 0;
      });
    });

    return {
      totalOrders,
      totalQuantity: totalQuantity.toFixed(2),
      totalValue
    };
  }, [processedData]);

  // Reset Filters
  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setFarmer('');
    setProcurementCenter('');
    setSearch('');
    setCurrentPage(1);
  };

  // PDF Export Trigger
  const handleDownloadPdf = () => {
    const filters = {};
    if (farmer) filters.farmer = farmer;
    if (procurementCenter) filters.procurementCenter = procurementCenter;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (search) filters.search = search;

    dispatch(downloadProcurementReport(filters));
  };

  // Table columns definition
  const columns = [
    {
      key: 'purchaseId',
      label: 'ID / Date',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-bold text-gray-900">{row.purchaseId || row._id?.slice(-6).toUpperCase()}</p>
          <p className="text-gray-400 text-[10px] mt-0.5">
            {new Date(row.procurementDate || row.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </p>
        </div>
      )
    },
    {
      key: 'farmer',
      label: 'Farmer Details',
      render: (row) => (
        <div>
          <p className="font-bold text-gray-800">
            {row.farmer?.firstName ?? '—'} {row.farmer?.lastName ?? ''}
          </p>
          <p className="text-gray-400 text-[10px]">{row.farmer?.phone ?? '—'}</p>
        </div>
      )
    },
    {
      key: 'crops',
      label: 'Crop Variety',
      render: (row) => {
        const c = row.crops?.[0];
        if (!c) return <span className="text-gray-400">—</span>;
        return (
          <div>
            <p className="font-bold text-gray-800">{c.cropName || c.crop || 'Other'}</p>
            <p className="text-gray-400 text-[10px]">{c.variety || 'Standard'}</p>
          </div>
        );
      }
    },
    {
      key: 'quantity',
      label: 'Qty & Rate',
      render: (row) => {
        const c = row.crops?.[0];
        if (!c) return <span className="text-gray-400">—</span>;
        return (
          <div>
            <p className="font-bold text-gray-800">{c.quantity} {c.unit || 'qtl'}</p>
            <p className="text-gray-400 text-[10px]">₹{c.rate} / {c.unit || 'qtl'}</p>
          </div>
        );
      }
    },
    {
      key: 'logistics',
      label: 'Center & Storage',
      render: (row) => (
        <div>
          <p className="font-bold text-gray-800">{row.procurementCenter || '—'}</p>
          <p className="text-gray-400 text-[10px]">{row.godown || '—'}</p>
        </div>
      )
    },
    {
      key: 'totalAmount',
      label: 'Total Value',
      align: 'right',
      render: (row) => (
        <span className="font-bold text-emerald-600">
          ₹{Number(row.totalAmount || 0).toLocaleString('en-IN')}
        </span>
      )
    }
  ];

  // Paginate list
  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return processedData.slice(startIdx, startIdx + itemsPerPage);
  }, [processedData, currentPage]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);

  if (ordersError) {
    return (
      <div className="flex items-center justify-center py-12">
        <ErrorState
          title="Failed to load Procurement Report"
          error={ordersError}
          onRetry={() => dispatch(fetchOrders())}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-lg font-black text-gray-800">Procurement Report</h2>
          <p className="text-xs text-gray-400 font-medium mt-0.5">
            Monitor and export detailed agricultural crop collection statistics.
          </p>
        </div>
        
        <button
          onClick={handleDownloadPdf}
          disabled={procurementDownloadLoading || processedData.length === 0}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none rounded-xl transition-all shadow-sm shadow-emerald-600/10 cursor-pointer"
        >
          {procurementDownloadLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          Export Report
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Value</p>
            <h3 className="text-xl font-black text-gray-800 mt-0.5">
              ₹{Number(summary.totalValue).toLocaleString('en-IN')}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Quantity</p>
            <h3 className="text-xl font-black text-gray-800 mt-0.5">
              {summary.totalQuantity} qtl
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Orders</p>
            <h3 className="text-xl font-black text-gray-800 mt-0.5">
              {summary.totalOrders}
            </h3>
          </div>
        </div>
      </div>

      {/* Filter Options */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-gray-700">Filters</span>
          <button
            onClick={handleResetFilters}
            className="text-[10px] font-bold text-[#15803D] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCw className="w-3 h-3" /> Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Farmer select */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Farmer</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <select
                value={farmer}
                onChange={(e) => { setFarmer(e.target.value); setCurrentPage(1); }}
                className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
              >
                <option value="">All Farmers</option>
                {farmersList.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.firstName} {m.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Center select */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Procurement Center</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <select
                value={procurementCenter}
                onChange={(e) => { setProcurementCenter(e.target.value); setCurrentPage(1); }}
                className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
              >
                <option value="">All Centers</option>
                {centersList.map((center) => (
                  <option key={center} value={center}>
                    {center}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Start Date</label>
            <input
              type="date"
              value={startDate}
              max={new Date().toISOString().split('T')[0]}
              onClick={(e) => e.target.showPicker?.()}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase">End Date</label>
            <input
              type="date"
              value={endDate}
              max={new Date().toISOString().split('T')[0]}
              onClick={(e) => e.target.showPicker?.()}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by crop, variety, farmer name, center, ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Report Table */}
      <ReportTable
        columns={columns}
        data={paginatedData}
        loading={ordersLoading || membersLoading}
        pagination={{
          page: currentPage,
          totalPages: totalPages,
          totalRecords: processedData.length
        }}
        onPageChange={(p) => setCurrentPage(p)}
      />
    </div>
  );
};

export default ProcurementReport;

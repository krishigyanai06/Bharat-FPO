import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const getDashboardSummaryData = createAsyncThunk(
  'dashboard/getSummaryData',
  async (_, { rejectWithValue }) => {
    try {
      console.log('[getDashboardSummaryData] Starting dashboard summary fetch');
      
      let listingsRes, ordersRes, membersRes;
      
      // Try to get listings
      try {
        console.log('[getDashboardSummaryData] Fetching listings...');
        listingsRes = await api.get('/sell-crop/getListings');
      } catch (err) {
        console.error('[getDashboardSummaryData] ❌ Listings failed:', err.message);
        listingsRes = { data: { data: [] } };
      }
      
      // Try to get orders (procurement purchases)
      try {
        console.log('[getDashboardSummaryData] Fetching procurement purchases...');
        ordersRes = await api.get('/procurement/getPurchases');
      } catch (err) {
        console.error('[getDashboardSummaryData] ❌ Procurement purchases failed:', err.message);
        ordersRes = { data: { data: [] } };
      }
      
      // Try to get members
      try {
        console.log('[getDashboardSummaryData] Fetching members...');
        membersRes = await api.get('/user/getAllUsers');
      } catch (err) {
        console.error('[getDashboardSummaryData] ❌ Members failed:', err.message);
        try {
          console.log('[getDashboardSummaryData] Trying fallback /user/getAllFarmers...');
          membersRes = await api.get('/user/getAllFarmers');
        } catch (fallbackErr) {
          console.error('[getDashboardSummaryData] ❌ Fallback also failed:', fallbackErr.message);
          membersRes = { data: { data: [] } };
        }
      }
      
      const products = listingsRes.data?.data || [];
      const orders = ordersRes.data?.data || [];
      const membersData = membersRes.data?.data?.users || membersRes.data?.data || membersRes.data?.users || [];
      
      // Count only farmers
      const farmersOnly = membersData.filter((m) => {
        const role = String(m.role || '').toLowerCase();
        return role === 'farmer' || role === 'user' || !role;
      });
      const totalMembers = farmersOnly.length;
      
      const normalizeStatus = (status) => String(status || '').trim().toLowerCase();
      const pendingApprovals = products.filter((p) => normalizeStatus(p.status) === 'pending').length;
      const approvedListings = products.filter((p) => normalizeStatus(p.status) === 'approved').length;
      const totalOrders = orders.length;
      const totalProcurementValue = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
      
      const recentActivity = products.slice(0, 20).map((p) => ({
        firstName: p.userId?.firstName ?? '',
        lastName: p.userId?.lastName ?? '',
        cropName: p.cropName ?? '',
        status: p.status,
        createdAt: p.createdAt,
      }));
      
      const chartMap = new Map();
      products.forEach((p) => {
        const date = new Date(p.createdAt);
        const monthLabel = date.toLocaleString('default', { month: 'short' });
        const prev = chartMap.get(monthLabel) || {
          month: monthLabel,
          sales: 0,
        };
        chartMap.set(monthLabel, {
          month: monthLabel,
          sales: prev.sales + Number(p.quantity || 0),
        });
      });
      const chartData = Array.from(chartMap.values());
      
      const now = new Date();
      const monthlyRevenueMap = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const label = d.toLocaleString('default', { month: 'short' });
        monthlyRevenueMap[key] = { month: label, revenue: 0, orders: 0 };
      }
      orders.forEach((o) => {
        const d = new Date(o.createdAt);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (monthlyRevenueMap[key] !== undefined) {
          monthlyRevenueMap[key].revenue += Number(o.totalAmount) || 0;
          monthlyRevenueMap[key].orders += 1;
        }
      });
      const monthlyRevenue = Object.values(monthlyRevenueMap);
      const currentMonthRevenue = monthlyRevenue[monthlyRevenue.length - 1]?.revenue ?? 0;
      const prevMonthRevenue = monthlyRevenue[monthlyRevenue.length - 2]?.revenue ?? 0;
      
      return {
        stats: {
          pendingApprovals,
          approvedListings,
          totalOrders,
          totalProcurementValue,
          totalMembers,
        },
        recentActivity,
        chartData,
        dailyListings: [],
        monthlyRevenue,
        currentMonthRevenue,
        prevMonthRevenue,
        allListings: products,
        rawProcurementOrders: orders,
      };
    } catch (err) {
      console.error('[getDashboardSummaryData] ❌ CRITICAL Error:', err.message);
      return rejectWithValue(err.message || 'Failed to load summary');
    }
  },
  {
    condition: (arg, { getState }) => {
      const { summaryLoading, lastFetchedSummary, stats } = getState().dashboard;
      if (summaryLoading) return false;
      const hasData = stats && stats.totalOrders > 0;
      if (arg?.force !== true && hasData && lastFetchedSummary && (Date.now() - lastFetchedSummary < CACHE_TTL)) {
        console.log('[getDashboardSummaryData] Returning cached dashboard summary');
        return false;
      }
    }
  }
);

export const getDashboardChartsData = createAsyncThunk(
  'dashboard/getChartsData',
  async (_, { rejectWithValue }) => {
    try {
      console.log('[getDashboardChartsData] Starting heavy charts fetch');
      
      let salesOrdersRes, stockRes;
      
      try {
        console.log('[getDashboardChartsData] Fetching sales orders...');
        salesOrdersRes = await api.get('/order/allOrders');
      } catch (err) {
        console.error('[getDashboardChartsData] ❌ Sales orders failed:', err.message);
        salesOrdersRes = { data: { data: [] } };
      }
      
      try {
        console.log('[getDashboardChartsData] Fetching stock levels...');
        stockRes = await api.get('/inventory/stocks');
      } catch (err) {
        console.error('[getDashboardChartsData] ❌ Stock levels failed:', err.message);
        stockRes = { data: { data: [] } };
      }
      
      const salesOrders = salesOrdersRes.data?.data ?? salesOrdersRes.data ?? [];
      const salesOrdersArr = Array.isArray(salesOrders) ? salesOrders : [];
      const stockData = stockRes.data?.data ?? stockRes.data?.stocks ?? stockRes.data ?? [];
      const stockSummary = Array.isArray(stockData) ? stockData : [];
      
      const now = new Date();
      const monthlySalesMap = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const label = d.toLocaleString('default', { month: 'short' });
        monthlySalesMap[key] = { month: label, revenue: 0, orders: 0 };
      }
      salesOrdersArr.forEach((o) => {
        const d = new Date(o.placedAt || o.createdAt);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (monthlySalesMap[key] !== undefined) {
          monthlySalesMap[key].revenue += Number(o.finalAmount) || 0;
          monthlySalesMap[key].orders += 1;
        }
      });
      const monthlySalesRevenue = Object.values(monthlySalesMap);
      const currentMonthSales = monthlySalesRevenue[monthlySalesRevenue.length - 1]?.revenue ?? 0;
      const prevMonthSales = monthlySalesRevenue[monthlySalesRevenue.length - 2]?.revenue ?? 0;
      const totalSalesOrders = salesOrdersArr.length;
      
      const monthlyOrdersCountMap = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const label = d.toLocaleString('default', { month: 'short' });
        monthlyOrdersCountMap[key] = { month: label, orders: 0 };
      }
      salesOrdersArr.forEach((o) => {
        const d = new Date(o.placedAt || o.createdAt);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (monthlyOrdersCountMap[key] !== undefined) {
          monthlyOrdersCountMap[key].orders += 1;
        }
      });
      const monthlyOrdersCount = Object.values(monthlyOrdersCountMap);
      
      const thisMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
      const cropMap = {};
      salesOrdersArr.forEach((o) => {
        const d = new Date(o.placedAt || o.createdAt);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (key !== thisMonthKey) return;
        o.items?.forEach((it) => {
          const name = it.item?.itemName ?? 'Other';
          cropMap[name] = (cropMap[name] || 0) + 1;
        });
      });
      const totalCropOrders = Object.values(cropMap).reduce((s, v) => s + v, 0);
      const ordersByCrop = Object.entries(cropMap)
        .map(([name, count]) => ({
          name,
          count,
          share: totalCropOrders > 0 ? Math.round((count / totalCropOrders) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);
        
      const stockLevelsData = stockSummary
        .map((item) => ({
          name: item.item?.itemName ?? "—",
          available: item.availableQuantity ?? 0,
        }))
        .slice(0, 10);
        
      return {
        monthlySalesRevenue,
        currentMonthSales,
        prevMonthSales,
        totalSalesOrders,
        monthlyOrdersCount,
        ordersByCrop,
        stockLevelsData,
        rawSalesOrders: salesOrdersArr,
      };
    } catch (err) {
      console.error('[getDashboardChartsData] ❌ CRITICAL Error:', err.message);
      return rejectWithValue(err.message || 'Failed to load chart metrics');
    }
  },
  {
    condition: (arg, { getState }) => {
      const { chartsLoading, lastFetchedCharts, monthlySalesRevenue } = getState().dashboard;
      if (chartsLoading) return false;
      const hasData = monthlySalesRevenue && monthlySalesRevenue.length > 0;
      if (arg?.force !== true && hasData && lastFetchedCharts && (Date.now() - lastFetchedCharts < CACHE_TTL)) {
        console.log('[getDashboardChartsData] Returning cached dashboard charts');
        return false;
      }
    }
  }
);
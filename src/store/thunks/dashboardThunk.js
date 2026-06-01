import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

export const getDashboardData = createAsyncThunk(
  'dashboard/getDashboardData',
  async (_, { rejectWithValue }) => {
    try {
      console.log('[getDashboardData] Starting dashboard data fetch');
      console.log('[getDashboardData] Selected tenant:', localStorage.getItem('selectedTenantId'));
      
      // Make API calls individually to identify which one fails
      let listingsRes, ordersRes, membersRes, stockRes;
      
      // Try to get listings
      try {
        console.log('[getDashboardData] Fetching listings...');
        listingsRes = await api.get('/sell-crop/getListings');
        console.log('[getDashboardData] ✅ Listings response:', listingsRes.data);
      } catch (err) {
        console.error('[getDashboardData] ❌ Listings failed:', err.message);
        console.error('[getDashboardData] Listings error details:', {
          status: err.response?.status,
          message: err.response?.data?.message,
          url: err.config?.url,
          headers: err.config?.headers,
          params: err.config?.params
        });
        listingsRes = { data: { data: [] } }; // Fallback to empty
      }
      
      // Try to get orders
      try {
        console.log('[getDashboardData] Fetching orders...');
        ordersRes = await api.get('/procurement/getPurchases');
        console.log('[getDashboardData] ✅ Orders response:', ordersRes.data);
      } catch (err) {
        console.error('[getDashboardData] ❌ Orders failed:', err.message);
        console.error('[getDashboardData] Orders error details:', {
          status: err.response?.status,
          message: err.response?.data?.message,
          url: err.config?.url,
          headers: err.config?.headers,
          params: err.config?.params
        });
        ordersRes = { data: { data: [] } }; // Fallback to empty
      }
      
      // Try to get members - use getAllUsers like Members page does
      try {
        console.log('[getDashboardData] Fetching members...');
        membersRes = await api.get('/user/getAllUsers');
        console.log('[getDashboardData] ✅ Members response:', membersRes.data);
      } catch (err) {
        console.error('[getDashboardData] ❌ Members failed:', err.message);
        console.error('[getDashboardData] Members error details:', {
          status: err.response?.status,
          message: err.response?.data?.message,
          url: err.config?.url,
          headers: err.config?.headers,
          params: err.config?.params
        });
        // Try fallback endpoint
        try {
          console.log('[getDashboardData] Trying fallback /user/getAllFarmers...');
          membersRes = await api.get('/user/getAllFarmers');
          console.log('[getDashboardData] ✅ Fallback members response:', membersRes.data);
        } catch (fallbackErr) {
          console.error('[getDashboardData] ❌ Fallback also failed:', fallbackErr.message);
          membersRes = { data: { data: [] } };
        }
      }
      
      // Try to get stock summary for inventory data
      try {
        console.log('[getDashboardData] Fetching stock summary...');
        stockRes = await api.get('/inventory/stocks');
        console.log('[getDashboardData] ✅ Stock response:', stockRes.data);
        console.log('[getDashboardData] Stock response structure:', {
          hasData: !!stockRes.data?.data,
          hasStocks: !!stockRes.data?.stocks,
          directArray: Array.isArray(stockRes.data),
          keys: Object.keys(stockRes.data || {})
        });
      } catch (err) {
        console.error('[getDashboardData] ❌ Stock failed:', err.message);
        console.error('[getDashboardData] Stock error details:', {
          status: err.response?.status,
          message: err.response?.data?.message,
          url: err.config?.url,
          headers: err.config?.headers,
          params: err.config?.params
        });
        stockRes = { data: { data: [] } }; // Fallback to empty
      }
      
      const products = listingsRes.data?.data || [];
      const orders = ordersRes.data?.data || [];
      // Handle different response formats for members
      const membersData = membersRes.data?.data?.users || membersRes.data?.data || membersRes.data?.users || [];
      // Count only farmers (not Admin, Staff, etc.)
      const farmersOnly = membersData.filter((m) => {
        const role = String(m.role || '').toLowerCase();
        return role === 'farmer' || role === 'user' || !role;
      });
      const totalMembers = farmersOnly.length;
      
      // Handle stock data
      const stockData = stockRes.data?.data ?? stockRes.data?.stocks ?? stockRes.data ?? [];
      const stockSummary = Array.isArray(stockData) ? stockData : [];
      
      console.log('[getDashboardData] Final counts:');
      console.log('   Products:', products.length);
      console.log('   Orders:', orders.length);
      console.log('   Members:', totalMembers);
      console.log('   Stock items:', stockSummary.length);

      /* ===== STATS ===== */
      const normalizeStatus = (status) => String(status || '').trim().toLowerCase();

      const pendingApprovals = products.filter((p) => normalizeStatus(p.status) === 'pending').length;
      const approvedListings = products.filter((p) => normalizeStatus(p.status) === 'approved').length;
      const rejectedListings = products.filter((p) => normalizeStatus(p.status) === 'rejected').length;
      const totalOrders = orders.length;
      const totalProcurementValue = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

      /* ===== RECENT ACTIVITY ===== */
      const recentActivity = products.slice(0, 20).map((p) => ({
        firstName: p.userId?.firstName ?? '',
        lastName: p.userId?.lastName ?? '',
        cropName: p.cropName ?? '',
        status: p.status,
        createdAt: p.createdAt,
      }));

      /* ===== MONTHLY BAR GRAPH ===== */
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

      /* ===== MONTHLY REVENUE TREND (last 6 months) ===== */
      const now = new Date();

      /* ===== MONTHLY SALES REVENUE (from inventory orders, last 6 months) ===== */
      let salesOrdersRes;
      try {
        salesOrdersRes = await api.get('/order/allOrders');
      } catch {
        salesOrdersRes = { data: { data: [] } };
      }
      const salesOrders = salesOrdersRes.data?.data ?? salesOrdersRes.data ?? [];
      const salesOrdersArr = Array.isArray(salesOrders) ? salesOrders : [];

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

      /* ===== MONTHLY ORDERS COUNT (last 6 months) ===== */
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

      /* ===== ORDERS BY CROP THIS MONTH ===== */
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
      const monthlyRevenueMap = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${d.getMonth()}`; // unique per year+month
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

      const dailyListings = []; // kept for slice compatibility

      /* ===== STOCK LEVELS DATA ===== */
      console.log('[getDashboardData] Processing stock data:', {
        stockDataRaw: stockData,
        stockSummaryLength: stockSummary.length,
        firstItem: stockSummary[0]
      });
      
      const stockLevelsData = stockSummary
        .map((item) => {
          const result = {
            name: item.item?.itemName ?? "—",
            available: item.availableQuantity ?? 0,
          };
          console.log('[getDashboardData] Mapping stock item:', { item, result });
          return result;
        })
        .slice(0, 10);
        
      console.log('[getDashboardData] Final stockLevelsData:', stockLevelsData);

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
        dailyListings,
        monthlyRevenue,
        currentMonthRevenue,
        prevMonthRevenue,
        monthlySalesRevenue,
        currentMonthSales,
        prevMonthSales,
        totalSalesOrders,
        monthlyOrdersCount,
        ordersByCrop,
        rawProcurementOrders: orders,
        rawSalesOrders: salesOrdersArr,
        stockLevelsData,
        allListings: products,
      };
    } catch (err) {
      console.error('[getDashboardData] ❌ CRITICAL Error:', err.message);
      console.error('[getDashboardData] Error type:', err.name);
      console.error('[getDashboardData] Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        url: err.config?.url,
        headers: err.config?.headers,
        params: err.config?.params
      });
      
      // If it's a network error, provide more helpful message
      if (err.message === 'Network Error') {
        console.error('[getDashboardData] 🔴 Network Error - Possible causes:');
        console.error('   1. CORS issue - backend not allowing requests from this origin');
        console.error('   2. Backend server is down or unreachable');
        console.error('   3. API endpoint does not exist');
        console.error('   4. Firewall or network blocking the request');
        return rejectWithValue('Network Error: Cannot reach backend server. Check CORS settings or backend availability.');
      }
      
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to load dashboard'
      );
    }
  }
);
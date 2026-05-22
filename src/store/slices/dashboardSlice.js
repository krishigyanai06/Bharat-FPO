import { createSlice } from '@reduxjs/toolkit';
import { getDashboardData } from '../thunks/dashboardThunk';

const initialState = {
  stats: {
    pendingApprovals: 0,
    approvedListings: 0,
    totalOrders: 0,
    totalProcurementValue: 0,
    totalMembers: 0,
  },
  chartData: [],
  dailyListings: [],
  monthlyRevenue: [],
  currentMonthRevenue: 0,
  prevMonthRevenue: 0,
  monthlySalesRevenue: [],
  currentMonthSales: 0,
  prevMonthSales: 0,
  totalSalesOrders: 0,
  monthlyOrdersCount: [],
  ordersByCrop: [],
  rawProcurementOrders: [],
  rawSalesOrders: [],
  stockLevelsData: [],
  recentActivity: [],
  allListings: [], // ✅ ADD
  loading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getDashboardData.pending, (state) => {
        state.loading = true;
      })
      .addCase(getDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        console.log('[dashboardSlice] ✅ Dashboard data fulfilled');
        console.log('[dashboardSlice] Payload:', action.payload);
        console.log('[dashboardSlice] Stats:', action.payload.stats);
        console.log('[dashboardSlice] Total Members in payload:', action.payload.stats?.totalMembers);
        state.stats = action.payload.stats;
        state.chartData = action.payload.chartData;
        state.dailyListings = action.payload.dailyListings;
        state.monthlyRevenue = action.payload.monthlyRevenue || [];
        state.currentMonthRevenue = action.payload.currentMonthRevenue ?? 0;
        state.prevMonthRevenue = action.payload.prevMonthRevenue ?? 0;
        state.monthlySalesRevenue = action.payload.monthlySalesRevenue || [];
        state.currentMonthSales = action.payload.currentMonthSales ?? 0;
        state.prevMonthSales = action.payload.prevMonthSales ?? 0;
        state.totalSalesOrders = action.payload.totalSalesOrders ?? 0;
        state.monthlyOrdersCount = action.payload.monthlyOrdersCount || [];
        state.ordersByCrop = action.payload.ordersByCrop || [];
        state.rawProcurementOrders = action.payload.rawProcurementOrders || [];
        state.rawSalesOrders = action.payload.rawSalesOrders || [];
        state.stockLevelsData = action.payload.stockLevelsData || [];
        state.recentActivity = action.payload.recentActivity;
        state.allListings = action.payload.allListings;
      })
      .addCase(getDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        console.error('[dashboardSlice] getDashboardData rejected:', action.payload);
      });
  },
});

export default dashboardSlice.reducer;

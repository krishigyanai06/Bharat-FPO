import { createSlice } from '@reduxjs/toolkit';
import { getDashboardSummaryData, getDashboardChartsData } from '../thunks/dashboardThunk';

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
  allListings: [],
  loading: false,
  summaryLoading: false,
  chartsLoading: false,
  lastFetchedSummary: null,
  lastFetchedCharts: null,
  error: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Summary data actions
      .addCase(getDashboardSummaryData.pending, (state) => {
        state.summaryLoading = true;
        state.loading = true;
        state.error = null;
      })
      .addCase(getDashboardSummaryData.fulfilled, (state, action) => {
        state.summaryLoading = false;
        state.loading = state.chartsLoading;
        state.stats = action.payload.stats;
        state.chartData = action.payload.chartData;
        state.dailyListings = action.payload.dailyListings;
        state.monthlyRevenue = action.payload.monthlyRevenue || [];
        state.currentMonthRevenue = action.payload.currentMonthRevenue ?? 0;
        state.prevMonthRevenue = action.payload.prevMonthRevenue ?? 0;
        state.recentActivity = action.payload.recentActivity || [];
        state.allListings = action.payload.allListings || [];
        state.rawProcurementOrders = action.payload.rawProcurementOrders || [];
        state.lastFetchedSummary = Date.now();
        console.log('[dashboardSlice] ✅ Dashboard Summary loaded successfully');
      })
      .addCase(getDashboardSummaryData.rejected, (state, action) => {
        state.summaryLoading = false;
        state.loading = state.chartsLoading;
        state.error = action.payload;
        console.error('[dashboardSlice] ❌ Dashboard Summary rejected:', action.payload);
      })
      
      // Heavy charts data actions
      .addCase(getDashboardChartsData.pending, (state) => {
        state.chartsLoading = true;
        state.loading = true;
      })
      .addCase(getDashboardChartsData.fulfilled, (state, action) => {
        state.chartsLoading = false;
        state.loading = state.summaryLoading;
        state.monthlySalesRevenue = action.payload.monthlySalesRevenue || [];
        state.currentMonthSales = action.payload.currentMonthSales ?? 0;
        state.prevMonthSales = action.payload.prevMonthSales ?? 0;
        state.totalSalesOrders = action.payload.totalSalesOrders ?? 0;
        state.monthlyOrdersCount = action.payload.monthlyOrdersCount || [];
        state.ordersByCrop = action.payload.ordersByCrop || [];
        state.stockLevelsData = action.payload.stockLevelsData || [];
        state.rawSalesOrders = action.payload.rawSalesOrders || [];
        state.lastFetchedCharts = Date.now();
        console.log('[dashboardSlice] ✅ Dashboard Charts loaded successfully');
      })
      .addCase(getDashboardChartsData.rejected, (state, action) => {
        state.chartsLoading = false;
        state.loading = state.summaryLoading;
        console.error('[dashboardSlice] ❌ Dashboard Charts rejected:', action.payload);
      });
  },
});

export default dashboardSlice.reducer;

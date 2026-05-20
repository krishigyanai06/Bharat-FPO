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

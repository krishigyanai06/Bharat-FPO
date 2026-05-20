import { createSlice } from '@reduxjs/toolkit';
import {
  fetchReports,
  fetchFarmers,
  fetchPrivateFiles,
} from '../thunks/reportsThunk';

const initialState = {
  /* PURCHASE REPORTS */
  purchases: [],

  /* FARMERS */
  farmers: [],

  /* PRIVATE FILES
     structure:
     {
       farmerId: {
         soilHealthCard: [],
         labReport: [],
         govtSchemeDocs: []
       }
     }
  */
  files: {},

  loading: false,
  error: null,
};

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder

      /* ================= PURCHASE REPORTS ================= */
      .addCase(fetchReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.loading = false;
        state.purchases = action.payload;
        console.log('[reportsSlice] ✅ Purchases loaded:', action.payload?.length || 0);
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ================= FARMERS ================= */
      .addCase(fetchFarmers.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchFarmers.fulfilled, (state, action) => {
        state.loading = false;
        state.farmers = action.payload;
        console.log('[reportsSlice] ✅ Farmers loaded:', action.payload?.length || 0);
      })
      .addCase(fetchFarmers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ================= PRIVATE FILES ================= */
      .addCase(fetchPrivateFiles.pending, (state) => {
        // do NOT touch global loading — handled locally in the component
      })
      .addCase(fetchPrivateFiles.fulfilled, (state, action) => {
        const { farmerId, type, files } = action.payload;
        if (!state.files[farmerId]) state.files[farmerId] = {};
        state.files[farmerId][type] = files;
      })
      .addCase(fetchPrivateFiles.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export default reportsSlice.reducer;

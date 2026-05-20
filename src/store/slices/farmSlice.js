import { createSlice } from '@reduxjs/toolkit';
import { getFarmsByUserId, getFarmByFarmId } from '../thunks/farmThunk';

const farmSlice = createSlice({
  name: 'farm',
  initialState: { farms: [], selectedFarm: null, loading: false, detailLoading: false, error: null },
  reducers: {
    clearFarms: (state) => { state.farms = []; state.selectedFarm = null; },
    clearSelectedFarm: (state) => { state.selectedFarm = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getFarmsByUserId.pending, (state) => { state.loading = true; state.farms = []; })
      .addCase(getFarmsByUserId.fulfilled, (state, action) => { state.loading = false; state.farms = action.payload || []; })
      .addCase(getFarmsByUserId.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(getFarmByFarmId.pending, (state) => { state.detailLoading = true; })
      .addCase(getFarmByFarmId.fulfilled, (state, action) => { state.detailLoading = false; state.selectedFarm = action.payload; })
      .addCase(getFarmByFarmId.rejected, (state, action) => { state.detailLoading = false; state.error = action.payload; });
  },
});

export const { clearFarms, clearSelectedFarm } = farmSlice.actions;
export default farmSlice.reducer;

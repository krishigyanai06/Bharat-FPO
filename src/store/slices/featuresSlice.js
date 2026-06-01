import { createSlice } from '@reduxjs/toolkit';
import { fetchMyFeatures, updateTierFeatures } from '../thunks/featuresThunk';

const featuresSlice = createSlice({
  name: 'features',
  initialState: { tier: null, features: [], loading: false, saving: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyFeatures.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(fetchMyFeatures.fulfilled, (s, a) => { s.loading = false; s.tier = a.payload.tier; s.features = a.payload.features; })
      .addCase(fetchMyFeatures.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
      .addCase(updateTierFeatures.pending, (s) => { s.saving = true; })
      .addCase(updateTierFeatures.fulfilled, (s, a) => { s.saving = false; s.tier = a.payload.tier; s.features = a.payload.features; })
      .addCase(updateTierFeatures.rejected, (s) => { s.saving = false; });
  },
});

export default featuresSlice.reducer;

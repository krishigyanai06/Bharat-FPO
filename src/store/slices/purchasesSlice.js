import { createSlice } from '@reduxjs/toolkit';
import { fetchPurchases, createPurchase } from '../thunks/purchasesThunk';

const purchasesSlice = createSlice({
  name: 'purchases',
  initialState: {
    purchases: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPurchases.pending, (s) => {
        s.loading = true;
      })
      .addCase(fetchPurchases.fulfilled, (s, a) => {
        s.loading = false;
        s.purchases = a.payload; // ✅ IMPORTANT FIX
      })
      .addCase(fetchPurchases.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload;
      })
      .addCase(createPurchase.fulfilled, (s, a) => {
        s.purchases.unshift(a.payload);
      });
  },
});

export default purchasesSlice.reducer;

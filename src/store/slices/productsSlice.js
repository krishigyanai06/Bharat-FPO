import { createSlice } from '@reduxjs/toolkit';
import { fetchProducts, deleteListing, updateListing, approveListing, rejectListing } from '../thunks/productsThunk';

const initialState = {
  products: [],
  loading: false,
  error: null,
  lastFetched: null,
};

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteListing.fulfilled, (state, action) => {
        state.products = state.products.filter((p) => p._id !== action.payload);
        state.lastFetched = null; // Invalidate cache
      })
      .addCase(updateListing.fulfilled, (state, action) => {
        const idx = state.products.findIndex((p) => p._id === action.payload._id);
        if (idx !== -1) state.products[idx] = action.payload;
        state.lastFetched = null; // Invalidate cache
      })
      .addCase(approveListing.fulfilled, (state, action) => {
        const idx = state.products.findIndex((p) => p._id === action.payload._id);
        if (idx !== -1) state.products[idx] = { ...state.products[idx], ...action.payload };
        state.lastFetched = null; // Invalidate cache
      })
      .addCase(rejectListing.fulfilled, (state, action) => {
        const idx = state.products.findIndex((p) => p._id === action.payload._id);
        if (idx !== -1) state.products[idx] = { ...state.products[idx], ...action.payload };
        state.lastFetched = null; // Invalidate cache
      });
  },
});

export default productsSlice.reducer;

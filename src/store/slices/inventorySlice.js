import { createSlice } from '@reduxjs/toolkit';
import {
  fetchProducts,
  fetchStockSummary,
  deleteStockItem,
  addProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
} from '../thunks/inventoryThunk';

const initialState = {
  products: [],
  stockSummary: [],
  loading: false,
  error: null,
  lastFetchedProducts: null,
  lastFetchedStocks: null,
};

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending,   (state) => { state.loading = true; state.error = null; })
      .addCase(fetchProducts.fulfilled, (state, action) => { 
        state.loading = false; 
        state.products = action.payload;
        state.lastFetchedProducts = Date.now();
        console.log('[inventorySlice] ✅ Products loaded:', action.payload?.length || 0);
      })
      .addCase(fetchProducts.rejected,  (state, action) => { state.loading = false; state.error = action.payload; })

      .addCase(fetchStockSummary.pending,   (state) => { state.loading = true; state.error = null; })
      .addCase(fetchStockSummary.fulfilled, (state, action) => { 
        state.loading = false; 
        state.stockSummary = action.payload;
        state.lastFetchedStocks = Date.now();
        console.log('[inventorySlice] ✅ Stock summary loaded:', action.payload?.length || 0);
      })
      .addCase(fetchStockSummary.rejected,  (state, action) => { state.loading = false; state.error = action.payload; })

      .addCase(deleteStockItem.fulfilled, (state, action) => {
        state.stockSummary = state.stockSummary.filter((s) => s._id !== action.payload);
        state.lastFetchedStocks = null;
      })

      .addCase(addProduct.fulfilled, (state, action) => {
        state.lastFetchedProducts = null;
        state.lastFetchedStocks = null;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        if (!action.payload) return;
        const idx = state.products.findIndex((i) => i._id === action.payload._id);
        if (idx !== -1) state.products[idx] = action.payload;
        state.lastFetchedProducts = null;
        state.lastFetchedStocks = null;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.products = state.products.filter((i) => i._id !== action.payload);
        state.lastFetchedProducts = null;
        state.lastFetchedStocks = null;
      })
      .addCase(toggleProductStatus.fulfilled, (state, action) => {
        const payload = action.payload;
        if (!payload) return;
        const targetId = payload.id || payload.response?._id || payload.response?.product?._id;
        const newStatus = payload.response?.isActive !== undefined ? payload.response?.isActive : payload.isActive;
        const product = state.products.find((p) => p._id === targetId);
        if (product && newStatus !== undefined) {
          product.isActive = newStatus;
        }
        state.lastFetchedProducts = null;
      });
  },
});

export default inventorySlice.reducer;

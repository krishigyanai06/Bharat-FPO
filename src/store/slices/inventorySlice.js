import { createSlice } from '@reduxjs/toolkit';
import {
  fetchProducts,
  fetchStockSummary,
  deleteStockItem,
  addProduct,
  updateProduct,
  deleteProduct,
} from '../thunks/inventoryThunk';

const initialState = {
  products: [],
  stockSummary: [],
  loading: false,
  error: null,
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
        console.log('[inventorySlice] ✅ Products loaded:', action.payload?.length || 0);
      })
      .addCase(fetchProducts.rejected,  (state, action) => { state.loading = false; state.error = action.payload; })

      .addCase(fetchStockSummary.pending,   (state) => { state.loading = true; state.error = null; })
      .addCase(fetchStockSummary.fulfilled, (state, action) => { 
        state.loading = false; 
        state.stockSummary = action.payload;
        console.log('[inventorySlice] ✅ Stock summary loaded:', action.payload?.length || 0);
      })
      .addCase(fetchStockSummary.rejected,  (state, action) => { state.loading = false; state.error = action.payload; })

      .addCase(deleteStockItem.fulfilled, (state, action) => {
        state.stockSummary = state.stockSummary.filter((s) => s._id !== action.payload);
      })

      .addCase(addProduct.fulfilled, (state, action) => {
        // don't optimistically add — fetchProducts will refresh the list
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        if (!action.payload) return;
        const idx = state.products.findIndex((i) => i._id === action.payload._id);
        if (idx !== -1) state.products[idx] = action.payload;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.products = state.products.filter((i) => i._id !== action.payload);
      });
  },
});

export default inventorySlice.reducer;

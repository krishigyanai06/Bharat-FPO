import { createSlice } from '@reduxjs/toolkit';
import { fetchAllOrders, placeOrder, updateOrderStatus, updateOrderPrices, fetchAllReceipts } from '../thunks/orderThunk';

const orderSlice = createSlice({
  name: 'orders',
  initialState: { orders: [], receipts: [], loading: false, error: null, lastFetched: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllOrders.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(fetchAllOrders.fulfilled, (s, a) => { 
        s.loading = false; 
        s.orders = Array.isArray(a.payload) ? a.payload : []; 
        s.lastFetched = Date.now();
      })
      .addCase(fetchAllOrders.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
      .addCase(placeOrder.fulfilled, (s, a) => { 
        if (a.payload) s.orders.unshift(a.payload); 
        s.lastFetched = null; // Invalidate cache
      })
      .addCase(updateOrderStatus.fulfilled, (s, a) => {
        const idx = s.orders.findIndex((o) => o._id === a.payload?._id);
        if (idx !== -1) s.orders[idx] = { ...s.orders[idx], status: a.payload.status };
        s.lastFetched = null; // Invalidate cache
      })
      .addCase(updateOrderPrices.fulfilled, (s, a) => {
        const idx = s.orders.findIndex((o) => o._id === a.payload?._id);
        if (idx !== -1) s.orders[idx] = { ...s.orders[idx], ...a.payload };
        s.lastFetched = null; // Invalidate cache
      })
      .addCase(fetchAllReceipts.fulfilled, (s, a) => { s.receipts = Array.isArray(a.payload) ? a.payload : []; });
  },
});

export default orderSlice.reducer;

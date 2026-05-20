import { createSlice } from '@reduxjs/toolkit';
import { fetchOrders, createOrder, deleteOrder, updateOrder } from '../thunks/procurementThunk';

const initialState = {
  orders: [],
  loading: false,
  error: null,
};

const procurementSlice = createSlice({
  name: 'procurement',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (s) => {
        s.loading = true;
      })
      .addCase(fetchOrders.fulfilled, (s, a) => {
        s.loading = false;
        s.orders = a.payload;
      })
      .addCase(fetchOrders.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload;
      })
      .addCase(createOrder.fulfilled, (s, a) => {
        s.orders.unshift(a.payload);
      })
      .addCase(deleteOrder.fulfilled, (s, a) => {
        s.orders = s.orders.filter((o) => o._id !== a.payload);
      })
      .addCase(updateOrder.fulfilled, (s, a) => {
        const idx = s.orders.findIndex((o) => o._id === a.payload._id);
        if (idx !== -1) s.orders[idx] = a.payload;
      });
  },
});

export default procurementSlice.reducer;

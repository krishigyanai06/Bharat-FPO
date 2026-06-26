import { createSlice } from '@reduxjs/toolkit';
import {
  fetchSales,
  createSaleOrEstimate,
  updateSaleOrEstimate,
  convertToSale,
  deleteSale,
  fetchPaymentsIn,
  recordPaymentIn,
  updatePaymentIn,
  deletePaymentIn,
  fetchSalesReturns,
  recordSalesReturn,
  updateSalesReturn,
  deleteSalesReturn,
} from '../thunks/sellThunk';

const initialState = {
  sales: [],
  salesTotal: 0,
  payments: [],
  paymentsTotal: 0,
  returns: [],
  returnsTotal: 0,
  loading: false,
  error: null,
  success: false,
};

const sellSlice = createSlice({
  name: 'sell',
  initialState,
  reducers: {
    clearSellStatus: (state) => {
      state.error = null;
      state.success = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Sales
      .addCase(fetchSales.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSales.fulfilled, (state, action) => {
        state.loading = false;
        state.sales = action.payload.records;
        state.salesTotal = action.payload.total;
      })
      .addCase(fetchSales.rejected, (state, action) => {
        if (action.meta?.aborted) return;
        state.loading = false;
        state.error = action.payload;
      })

      // Create Sale or Estimate
      .addCase(createSaleOrEstimate.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createSaleOrEstimate.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        // The list will be refetched by the component
      })
      .addCase(createSaleOrEstimate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })

      // Update Sale or Estimate
      .addCase(updateSaleOrEstimate.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateSaleOrEstimate.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        // Reflect update in local list
        const idx = state.sales.findIndex((s) => s._id === action.payload?._id);
        if (idx !== -1) {
          state.sales[idx] = action.payload;
        }
      })
      .addCase(updateSaleOrEstimate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })

      // Convert Estimate to Sale
      .addCase(convertToSale.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(convertToSale.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        // Reflect update in local list
        const idx = state.sales.findIndex((s) => s._id === action.payload?._id);
        if (idx !== -1) {
          state.sales[idx] = action.payload;
        }
      })
      .addCase(convertToSale.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })

      // Delete Sale
      .addCase(deleteSale.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSale.fulfilled, (state, action) => {
        state.loading = false;
        state.sales = state.sales.filter((s) => s._id !== action.payload);
        state.salesTotal = Math.max(0, state.salesTotal - 1);
        state.success = true;
      })
      .addCase(deleteSale.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Payments In
      .addCase(fetchPaymentsIn.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentsIn.fulfilled, (state, action) => {
        state.loading = false;
        state.payments = action.payload.records;
        state.paymentsTotal = action.payload.total;
      })
      .addCase(fetchPaymentsIn.rejected, (state, action) => {
        if (action.meta?.aborted) return;
        state.loading = false;
        state.error = action.payload;
      })

      // Record Payment In
      .addCase(recordPaymentIn.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(recordPaymentIn.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(recordPaymentIn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })

      // Update Payment In
      .addCase(updatePaymentIn.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updatePaymentIn.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        // Reflect update in local list
        const idx = state.payments.findIndex((p) => p._id === action.payload?._id);
        if (idx !== -1) {
          state.payments[idx] = action.payload;
        }
      })
      .addCase(updatePaymentIn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })

      // Delete Payment In
      .addCase(deletePaymentIn.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deletePaymentIn.fulfilled, (state, action) => {
        state.loading = false;
        state.payments = state.payments.filter((p) => p._id !== action.payload);
        state.paymentsTotal = Math.max(0, state.paymentsTotal - 1);
        state.success = true;
      })
      .addCase(deletePaymentIn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Sales Returns
      .addCase(fetchSalesReturns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSalesReturns.fulfilled, (state, action) => {
        state.loading = false;
        state.returns = action.payload.records;
        state.returnsTotal = action.payload.total;
      })
      .addCase(fetchSalesReturns.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Record Sales Return
      .addCase(recordSalesReturn.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(recordSalesReturn.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(recordSalesReturn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })

      // Update Sales Return
      .addCase(updateSalesReturn.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateSalesReturn.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        // Reflect update in local list
        const idx = state.returns.findIndex((r) => r._id === action.payload?._id);
        if (idx !== -1) {
          state.returns[idx] = action.payload;
        }
      })
      .addCase(updateSalesReturn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })

      // Delete Sales Return
      .addCase(deleteSalesReturn.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSalesReturn.fulfilled, (state, action) => {
        state.loading = false;
        state.returns = state.returns.filter((r) => r._id !== action.payload);
        state.returnsTotal = Math.max(0, state.returnsTotal - 1);
        state.success = true;
      })
      .addCase(deleteSalesReturn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSellStatus } = sellSlice.actions;
export default sellSlice.reducer;

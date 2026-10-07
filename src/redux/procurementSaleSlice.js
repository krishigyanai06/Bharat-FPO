import { createSlice } from '@reduxjs/toolkit';
import {
  fetchProcurementSales,
  fetchProcurementSaleDetails,
  createProcurementSale,
  updateProcurementSale,
  deleteProcurementSale,
  generateProcurementEWayBill,
  fetchProcurementStock,
  fetchProcurementStockLogs,
  adjustProcurementStock,
} from './procurementSaleThunk';

const initialState = {
  sales: [],
  currentSale: null,
  stock: [],
  stockLogs: [],
  loading: false,
  logsLoading: false,
  error: null,
  submitting: false,
  submitError: null,
  ewayBillLoading: false,
  ewayBillError: null,
  adjusting: false,
  adjustError: null,
};

const procurementSaleSlice = createSlice({
  name: 'procurementSales',
  initialState,
  reducers: {
    clearCurrentSale: (state) => {
      state.currentSale = null;
    },
    clearErrors: (state) => {
      state.error = null;
      state.submitError = null;
      state.ewayBillError = null;
      state.adjustError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Sales
      .addCase(fetchProcurementSales.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProcurementSales.fulfilled, (state, action) => {
        state.loading = false;
        state.sales = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchProcurementSales.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Details
      .addCase(fetchProcurementSaleDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProcurementSaleDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSale = action.payload;
      })
      .addCase(fetchProcurementSaleDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Create Sale
      .addCase(createProcurementSale.pending, (state) => {
        state.submitting = true;
        state.submitError = null;
      })
      .addCase(createProcurementSale.fulfilled, (state, action) => {
        state.submitting = false;
        state.sales.unshift(action.payload);
      })
      .addCase(createProcurementSale.rejected, (state, action) => {
        state.submitting = false;
        state.submitError = action.payload;
      })

      // Update Sale
      .addCase(updateProcurementSale.pending, (state) => {
        state.submitting = true;
        state.submitError = null;
      })
      .addCase(updateProcurementSale.fulfilled, (state, action) => {
        state.submitting = false;
        const idx = state.sales.findIndex((s) => s._id === action.payload._id);
        if (idx !== -1) {
          state.sales[idx] = action.payload;
        }
        state.currentSale = action.payload;
      })
      .addCase(updateProcurementSale.rejected, (state, action) => {
        state.submitting = false;
        state.submitError = action.payload;
      })

      // Delete Sale
      .addCase(deleteProcurementSale.fulfilled, (state, action) => {
        state.sales = state.sales.filter((s) => s._id !== action.payload);
      })

      // Fetch Stock
      .addCase(fetchProcurementStock.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProcurementStock.fulfilled, (state, action) => {
        state.loading = false;
        state.stock = action.payload;
      })
      .addCase(fetchProcurementStock.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Stock Logs
      .addCase(fetchProcurementStockLogs.pending, (state) => {
        state.logsLoading = true;
        state.error = null;
      })
      .addCase(fetchProcurementStockLogs.fulfilled, (state, action) => {
        state.logsLoading = false;
        state.stockLogs = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchProcurementStockLogs.rejected, (state, action) => {
        state.logsLoading = false;
        state.error = action.payload;
      })

      // Adjust Stock
      .addCase(adjustProcurementStock.pending, (state) => {
        state.adjusting = true;
        state.adjustError = null;
      })
      .addCase(adjustProcurementStock.fulfilled, (state, action) => {
        state.adjusting = false;
        // Reloading stock is triggered after successful adjustment
      })
      .addCase(adjustProcurementStock.rejected, (state, action) => {
        state.adjusting = false;
        state.adjustError = action.payload;
      })

      // E-Way Bill Generation
      .addCase(generateProcurementEWayBill.pending, (state) => {
        state.ewayBillLoading = true;
        state.ewayBillError = null;
      })
      .addCase(generateProcurementEWayBill.fulfilled, (state, action) => {
        state.ewayBillLoading = false;
        if (state.currentSale && state.currentSale._id === action.payload._id) {
          state.currentSale = action.payload;
        }
        const idx = state.sales.findIndex((s) => s._id === action.payload._id);
        if (idx !== -1) {
          state.sales[idx] = action.payload;
        }
      })
      .addCase(generateProcurementEWayBill.rejected, (state, action) => {
        state.ewayBillLoading = false;
        state.ewayBillError = action.payload;
      });
  },
});

export const { clearCurrentSale, clearErrors } = procurementSaleSlice.actions;
export default procurementSaleSlice.reducer;

import { createSlice } from '@reduxjs/toolkit';
import {
  fetchPurchases,
  createPurchase,
  updatePurchase,
  deletePurchase,
  fetchPaymentsOut,
  createPaymentOut,
  updatePaymentOut,
  deletePaymentOut,
  fetchPurchaseReturns,
  createPurchaseReturn,
  deletePurchaseReturn,
  fetchExpenses,
  createExpense,
  deleteExpense,
  convertToPurchaseBill
} from '../thunks/purchaseThunk';

const initialState = {
  purchases: [],
  purchasesTotal: 0,
  payments: [],
  paymentsTotal: 0,
  returns: [],
  returnsTotal: 0,
  expenses: [],
  expensesTotal: 0,
  
  pagination: {
    page: 1,
    limit: 10,
    totalPages: 1,
    totalRecords: 0
  },
  
  loading: false,
  error: null,
  success: false
};

const purchaseSlice = createSlice({
  name: 'purchase',
  initialState,
  reducers: {
    clearPurchaseStatus: (state) => {
      state.error = null;
      state.success = false;
    },
    setPagination: (state, action) => {
      state.pagination = {
        ...state.pagination,
        ...action.payload
      };
    }
  },
  extraReducers: (builder) => {
    builder
      // ==========================================
      // 1. BILLS & ORDERS
      // ==========================================
      .addCase(fetchPurchases.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPurchases.fulfilled, (state, action) => {
        state.loading = false;
        state.purchases = action.payload?.records || action.payload?.data?.records || action.payload?.data || action.payload || [];
        state.purchasesTotal = action.payload?.total || action.payload?.totalRecords || state.purchases.length || 0;
        state.pagination = {
          page: action.payload?.page || action.payload?.pagination?.page || state.pagination.page,
          limit: action.payload?.limit || action.payload?.pagination?.limit || state.pagination.limit,
          totalPages: action.payload?.totalPages || action.payload?.pagination?.totalPages || Math.ceil(state.purchasesTotal / state.pagination.limit) || 1,
          totalRecords: state.purchasesTotal
        };
      })
      .addCase(fetchPurchases.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createPurchase.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createPurchase.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(createPurchase.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })

      .addCase(updatePurchase.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updatePurchase.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(updatePurchase.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })

      .addCase(deletePurchase.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deletePurchase.fulfilled, (state, action) => {
        state.loading = false;
        state.purchases = state.purchases.filter((p) => p._id !== action.payload);
        state.purchasesTotal = Math.max(0, state.purchasesTotal - 1);
        state.success = true;
      })
      .addCase(deletePurchase.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ==========================================
      // 2. PAYMENTS OUT
      // ==========================================
      .addCase(fetchPaymentsOut.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentsOut.fulfilled, (state, action) => {
        state.loading = false;
        state.payments = action.payload?.records || action.payload?.data?.records || action.payload?.data || action.payload || [];
        state.paymentsTotal = action.payload?.total || action.payload?.totalRecords || state.payments.length || 0;
        state.pagination = {
          page: action.payload?.page || action.payload?.pagination?.page || state.pagination.page,
          limit: action.payload?.limit || action.payload?.pagination?.limit || state.pagination.limit,
          totalPages: action.payload?.totalPages || action.payload?.pagination?.totalPages || Math.ceil(state.paymentsTotal / state.pagination.limit) || 1,
          totalRecords: state.paymentsTotal
        };
      })
      .addCase(fetchPaymentsOut.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createPaymentOut.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createPaymentOut.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(createPaymentOut.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })

      .addCase(updatePaymentOut.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updatePaymentOut.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(updatePaymentOut.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })

      .addCase(deletePaymentOut.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deletePaymentOut.fulfilled, (state, action) => {
        state.loading = false;
        state.payments = state.payments.filter((p) => p._id !== action.payload);
        state.paymentsTotal = Math.max(0, state.paymentsTotal - 1);
        state.success = true;
      })
      .addCase(deletePaymentOut.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ==========================================
      // 3. PURCHASE RETURNS
      // ==========================================
      .addCase(fetchPurchaseReturns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPurchaseReturns.fulfilled, (state, action) => {
        state.loading = false;
        state.returns = action.payload?.records || action.payload?.data?.records || action.payload?.data || action.payload || [];
        state.returnsTotal = action.payload?.total || action.payload?.totalRecords || state.returns.length || 0;
        state.pagination = {
          page: action.payload?.page || action.payload?.pagination?.page || state.pagination.page,
          limit: action.payload?.limit || action.payload?.pagination?.limit || state.pagination.limit,
          totalPages: action.payload?.totalPages || action.payload?.pagination?.totalPages || Math.ceil(state.returnsTotal / state.pagination.limit) || 1,
          totalRecords: state.returnsTotal
        };
      })
      .addCase(fetchPurchaseReturns.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createPurchaseReturn.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createPurchaseReturn.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(createPurchaseReturn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })

      .addCase(deletePurchaseReturn.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deletePurchaseReturn.fulfilled, (state, action) => {
        state.loading = false;
        state.returns = state.returns.filter((r) => r._id !== action.payload);
        state.returnsTotal = Math.max(0, state.returnsTotal - 1);
        state.success = true;
      })
      .addCase(deletePurchaseReturn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ==========================================
      // 4. EXPENSES
      // ==========================================
      .addCase(fetchExpenses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.loading = false;
        state.expenses = action.payload?.records || action.payload?.data?.records || action.payload?.data || action.payload || [];
        state.expensesTotal = action.payload?.total || action.payload?.totalRecords || state.expenses.length || 0;
        state.pagination = {
          page: action.payload?.page || action.payload?.pagination?.page || state.pagination.page,
          limit: action.payload?.limit || action.payload?.pagination?.limit || state.pagination.limit,
          totalPages: action.payload?.totalPages || action.payload?.pagination?.totalPages || Math.ceil(state.expensesTotal / state.pagination.limit) || 1,
          totalRecords: state.expensesTotal
        };
      })
      .addCase(fetchExpenses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createExpense.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createExpense.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(createExpense.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })

      .addCase(deleteExpense.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteExpense.fulfilled, (state, action) => {
        state.loading = false;
        state.expenses = state.expenses.filter((e) => e._id !== action.payload);
        state.expensesTotal = Math.max(0, state.expensesTotal - 1);
        state.success = true;
      })
      .addCase(deleteExpense.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Convert Purchase Order to Purchase Bill
      .addCase(convertToPurchaseBill.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(convertToPurchaseBill.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(convertToPurchaseBill.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      });
  }
});

export const { clearPurchaseStatus, setPagination } = purchaseSlice.actions;
export default purchaseSlice.reducer;

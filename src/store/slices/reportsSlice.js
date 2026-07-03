import { createSlice } from '@reduxjs/toolkit';
import {
  downloadSalesReport,
  downloadPurchaseReport,
  fetchBalanceSheet,
  downloadBalanceSheetPdf,
  downloadPaymentInReport,
  downloadPaymentOutReport,
  downloadExpenseReport,
  fetchPartySalePurchase,
  fetchItemwiseProfitLoss,
  downloadGstr1Report,
} from '../thunks/reportsThunk';

const initialState = {
  salesReportLoading: false,
  purchaseReportLoading: false,
  balanceSheetLoading: false,

  salesDownloadLoading: false,
  purchaseDownloadLoading: false,
  balanceSheetDownloadLoading: false,
  paymentInDownloadLoading: false,
  paymentOutDownloadLoading: false,
  expenseDownloadLoading: false,
  gstr1DownloadLoading: false,

  balanceSheet: null,
  error: null,

  partySalePurchase: [],
  partySalePurchaseLoading: false,
  itemwiseProfitLoss: [],
  itemwiseProfitLossLoading: false,
};

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    clearReportsError: (state) => {
      state.error = null;
    },
    resetBalanceSheetData: (state) => {
      state.balanceSheet = null;
    }
  },
  extraReducers: (builder) => {
    builder
      /* ================= DOWNLOAD SALES PDF ================= */
      .addCase(downloadSalesReport.pending, (state) => {
        state.salesDownloadLoading = true;
        state.error = null;
      })
      .addCase(downloadSalesReport.fulfilled, (state) => {
        state.salesDownloadLoading = false;
      })
      .addCase(downloadSalesReport.rejected, (state, action) => {
        state.salesDownloadLoading = false;
        state.error = action.payload;
      })

      /* ================= DOWNLOAD PURCHASE PDF ================= */
      .addCase(downloadPurchaseReport.pending, (state) => {
        state.purchaseDownloadLoading = true;
        state.error = null;
      })
      .addCase(downloadPurchaseReport.fulfilled, (state) => {
        state.purchaseDownloadLoading = false;
      })
      .addCase(downloadPurchaseReport.rejected, (state, action) => {
        state.purchaseDownloadLoading = false;
        state.error = action.payload;
      })

      /* ================= FETCH BALANCE SHEET JSON ================= */
      .addCase(fetchBalanceSheet.pending, (state) => {
        state.balanceSheetLoading = true;
        state.error = null;
      })
      .addCase(fetchBalanceSheet.fulfilled, (state, action) => {
        state.balanceSheetLoading = false;
        state.balanceSheet = action.payload;
      })
      .addCase(fetchBalanceSheet.rejected, (state, action) => {
        state.balanceSheetLoading = false;
        state.error = action.payload;
      })

      /* ================= DOWNLOAD BALANCE SHEET PDF ================= */
      .addCase(downloadBalanceSheetPdf.pending, (state) => {
        state.balanceSheetDownloadLoading = true;
        state.error = null;
      })
      .addCase(downloadBalanceSheetPdf.fulfilled, (state) => {
        state.balanceSheetDownloadLoading = false;
      })
      .addCase(downloadBalanceSheetPdf.rejected, (state, action) => {
        state.balanceSheetDownloadLoading = false;
        state.error = action.payload;
      })

      /* ================= DOWNLOAD PAYMENT IN PDF ================= */
      .addCase(downloadPaymentInReport.pending, (state) => {
        state.paymentInDownloadLoading = true;
        state.error = null;
      })
      .addCase(downloadPaymentInReport.fulfilled, (state) => {
        state.paymentInDownloadLoading = false;
      })
      .addCase(downloadPaymentInReport.rejected, (state, action) => {
        state.paymentInDownloadLoading = false;
        state.error = action.payload;
      })

      /* ================= DOWNLOAD PAYMENT OUT PDF ================= */
      .addCase(downloadPaymentOutReport.pending, (state) => {
        state.paymentOutDownloadLoading = true;
        state.error = null;
      })
      .addCase(downloadPaymentOutReport.fulfilled, (state) => {
        state.paymentOutDownloadLoading = false;
      })
      .addCase(downloadPaymentOutReport.rejected, (state, action) => {
        state.paymentOutDownloadLoading = false;
        state.error = action.payload;
      })

      /* ================= DOWNLOAD EXPENSE PDF ================= */
      .addCase(downloadExpenseReport.pending, (state) => {
        state.expenseDownloadLoading = true;
        state.error = null;
      })
      .addCase(downloadExpenseReport.fulfilled, (state) => {
        state.expenseDownloadLoading = false;
      })
      .addCase(downloadExpenseReport.rejected, (state, action) => {
        state.expenseDownloadLoading = false;
        state.error = action.payload;
      })

      /* ================= PARTY SALE PURCHASE ================= */
      .addCase(fetchPartySalePurchase.pending, (state) => {
        state.partySalePurchaseLoading = true;
        state.error = null;
      })
      .addCase(fetchPartySalePurchase.fulfilled, (state, action) => {
        state.partySalePurchaseLoading = false;
        state.partySalePurchase = action.payload;
      })
      .addCase(fetchPartySalePurchase.rejected, (state, action) => {
        if (action.meta?.aborted) return;
        state.partySalePurchaseLoading = false;
        state.error = action.payload;
      })

      /* ================= ITEMWISE PROFIT LOSS ================= */
      .addCase(fetchItemwiseProfitLoss.pending, (state) => {
        state.itemwiseProfitLossLoading = true;
        state.error = null;
      })
      .addCase(fetchItemwiseProfitLoss.fulfilled, (state, action) => {
        state.itemwiseProfitLossLoading = false;
        state.itemwiseProfitLoss = action.payload;
      })
      .addCase(fetchItemwiseProfitLoss.rejected, (state, action) => {
        if (action.meta?.aborted) return;
        state.itemwiseProfitLossLoading = false;
        state.error = action.payload;
      })

      /* ================= DOWNLOAD GSTR-1 REPORT ================= */
      .addCase(downloadGstr1Report.pending, (state) => {
        state.gstr1DownloadLoading = true;
        state.error = null;
      })
      .addCase(downloadGstr1Report.fulfilled, (state) => {
        state.gstr1DownloadLoading = false;
      })
      .addCase(downloadGstr1Report.rejected, (state, action) => {
        state.gstr1DownloadLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearReportsError, resetBalanceSheetData } = reportsSlice.actions;
export default reportsSlice.reducer;

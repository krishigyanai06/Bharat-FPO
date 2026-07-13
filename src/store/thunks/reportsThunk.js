import { createAsyncThunk } from '@reduxjs/toolkit';
import reportService from '../../services/reportService';
import { downloadBlob } from '../../utils/downloadFile';

const parseBlobError = async (err, defaultMsg) => {
  if (err.response?.data instanceof Blob) {
    try {
      const text = await err.response.data.text();
      const parsed = JSON.parse(text);
      return parsed.message || parsed.error || defaultMsg;
    } catch (_) {}
  }
  return err.response?.data?.message || err.response?.data?.error || defaultMsg;
};

export const downloadSalesReport = createAsyncThunk(
  'reports/downloadSalesPdf',
  async (filters, { rejectWithValue }) => {
    try {
      console.log('[reportsThunk] Downloading sales PDF with filters:', filters);
      const blob = await reportService.downloadSalesReport(filters);
      
      const startDateStr = filters.startDate || 'start';
      const endDateStr = filters.endDate || 'end';
      const filename = `Sales_Report_${startDateStr}_to_${endDateStr}.pdf`;
      
      // Auto trigger file save
      downloadBlob(blob, filename);
      return { success: true };
    } catch (err) {
      console.error('[reportsThunk] downloadSalesReport error:', err);
      const msg = await parseBlobError(err, 'Failed to download Sales Report PDF');
      return rejectWithValue(msg);
    }
  }
);

export const downloadPurchaseReport = createAsyncThunk(
  'reports/downloadPurchasePdf',
  async (filters, { rejectWithValue }) => {
    try {
      console.log('[reportsThunk] Downloading purchase PDF with filters:', filters);
      const blob = await reportService.downloadPurchaseReport(filters);
      
      const startDateStr = filters.startDate || 'start';
      const endDateStr = filters.endDate || 'end';
      const filename = `Purchase_Report_${startDateStr}_to_${endDateStr}.pdf`;
      
      // Auto trigger file save
      downloadBlob(blob, filename);
      return { success: true };
    } catch (err) {
      console.error('[reportsThunk] downloadPurchaseReport error:', err);
      const msg = await parseBlobError(err, 'Failed to download Purchase Report PDF');
      return rejectWithValue(msg);
    }
  }
);

export const fetchBalanceSheet = createAsyncThunk(
  'reports/fetchBalanceSheet',
  async (date, { rejectWithValue }) => {
    try {
      console.log('[reportsThunk] Fetching balance sheet JSON for date:', date);
      const data = await reportService.fetchBalanceSheet(date);
      return data?.data || data || null;
    } catch (err) {
      console.error('[reportsThunk] fetchBalanceSheet error:', err);
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch Balance Sheet details');
    }
  }
);

export const downloadBalanceSheetPdf = createAsyncThunk(
  'reports/downloadBalanceSheetPdf',
  async (date, { rejectWithValue }) => {
    try {
      console.log('[reportsThunk] Downloading balance sheet PDF for date:', date);
      const blob = await reportService.downloadBalanceSheetPdf(date);
      const filename = `Balance_Sheet_${date}.pdf`;
      
      // Auto trigger file save
      downloadBlob(blob, filename);
      return { success: true };
    } catch (err) {
      console.error('[reportsThunk] downloadBalanceSheetPdf error:', err);
      const msg = await parseBlobError(err, 'Failed to download Balance Sheet PDF');
      return rejectWithValue(msg);
    }
  }
);

export const downloadPaymentInReport = createAsyncThunk(
  'reports/downloadPaymentInPdf',
  async (filters, { rejectWithValue }) => {
    try {
      console.log('[reportsThunk] Downloading payment-in PDF with filters:', filters);
      const blob = await reportService.downloadPaymentInReport(filters);
      const startDateStr = filters.startDate || 'start';
      const endDateStr = filters.endDate || 'end';
      const filename = `PaymentIn_Report_${startDateStr}_to_${endDateStr}.pdf`;
      downloadBlob(blob, filename);
      return { success: true };
    } catch (err) {
      console.error('[reportsThunk] downloadPaymentInReport error:', err);
      const msg = await parseBlobError(err, 'Failed to download Payment In Report PDF');
      return rejectWithValue(msg);
    }
  }
);

export const downloadPaymentOutReport = createAsyncThunk(
  'reports/downloadPaymentOutPdf',
  async (filters, { rejectWithValue }) => {
    try {
      console.log('[reportsThunk] Downloading payment-out PDF with filters:', filters);
      const blob = await reportService.downloadPaymentOutReport(filters);
      const startDateStr = filters.startDate || 'start';
      const endDateStr = filters.endDate || 'end';
      const filename = `PaymentOut_Report_${startDateStr}_to_${endDateStr}.pdf`;
      downloadBlob(blob, filename);
      return { success: true };
    } catch (err) {
      console.error('[reportsThunk] downloadPaymentOutReport error:', err);
      const msg = await parseBlobError(err, 'Failed to download Payment Out Report PDF');
      return rejectWithValue(msg);
    }
  }
);

export const downloadExpenseReport = createAsyncThunk(
  'reports/downloadExpensePdf',
  async (filters, { rejectWithValue }) => {
    try {
      console.log('[reportsThunk] Downloading expense PDF with filters:', filters);
      const blob = await reportService.downloadExpenseReport(filters);
      const startDateStr = filters.startDate || 'start';
      const endDateStr = filters.endDate || 'end';
      const filename = `Expense_Report_${startDateStr}_to_${endDateStr}.pdf`;
      downloadBlob(blob, filename);
      return { success: true };
    } catch (err) {
      console.error('[reportsThunk] downloadExpenseReport error:', err);
      const msg = await parseBlobError(err, 'Failed to download Expense Report PDF');
      return rejectWithValue(msg);
    }
  }
);

export const fetchPartySalePurchase = createAsyncThunk(
  'reports/fetchPartySalePurchase',
  async (filters, { rejectWithValue }) => {
    try {
      console.log('[reportsThunk] Fetching party sale-purchase report JSON:', filters);
      const data = await reportService.fetchPartySalePurchaseReport(filters);
      return data?.data || data?.records || data || [];
    } catch (err) {
      console.error('[reportsThunk] fetchPartySalePurchase error:', err);
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch Party Sale-Purchase details');
    }
  }
);

export const fetchItemwiseProfitLoss = createAsyncThunk(
  'reports/fetchItemwiseProfitLoss',
  async (filters, { rejectWithValue }) => {
    try {
      console.log('[reportsThunk] Fetching itemwise profit-loss report JSON:', filters);
      const data = await reportService.fetchItemwiseProfitLossReport(filters);
      return data?.data || data?.records || data || [];
    } catch (err) {
      console.error('[reportsThunk] fetchItemwiseProfitLoss error:', err);
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch Itemwise Profit-Loss details');
    }
  }
);

export const downloadGstr1Report = createAsyncThunk(
  'reports/downloadGstr1Report',
  async (filters, { rejectWithValue }) => {
    try {
      console.log('[reportsThunk] Downloading GSTR-1 report with filters:', filters);
      const blob = await reportService.downloadGstr1Report(filters);
      
      let ext = 'json';
      if (filters.format === 'csv') {
        ext = 'csv';
      } else if (filters.format === 'excel' || filters.format === 'xlsx') {
        ext = 'xlsx';
      }
      let filename = 'GSTR1';
      
      if (filters.month && filters.year) {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthIdx = parseInt(filters.month, 10) - 1;
        const monthName = monthNames[monthIdx] || filters.month;
        filename = `GSTR1_${monthName}_${filters.year}.${ext}`;
      } else if (filters.startDate && filters.endDate) {
        filename = `GSTR1_${filters.startDate}_to_${filters.endDate}.${ext}`;
      } else {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const now = new Date();
        const monthName = monthNames[now.getMonth()];
        const year = now.getFullYear();
        filename = `GSTR1_${monthName}_${year}.${ext}`;
      }
      
      downloadBlob(blob, filename);
      return { success: true };
    } catch (err) {
      console.error('[reportsThunk] downloadGstr1Report error:', err);
      const msg = await parseBlobError(err, 'Failed to download GSTR-1 Report');
      return rejectWithValue(msg);
    }
  }
);

export const downloadGstr3bReport = createAsyncThunk(
  'reports/downloadGstr3bReport',
  async (filters, { rejectWithValue }) => {
    try {
      console.log('[reportsThunk] Downloading GSTR-3B report with filters:', filters);
      const blob = await reportService.downloadGstr3bReport(filters);
      
      let ext = 'json';
      if (filters.format === 'excel' || filters.format === 'xlsx') {
        ext = 'xlsx';
      }
      let filename = 'GSTR3B';
      
      if (filters.month && filters.year) {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthIdx = parseInt(filters.month, 10) - 1;
        const monthName = monthNames[monthIdx] || filters.month;
        filename = `GSTR3B_${monthName}_${filters.year}.${ext}`;
      } else if (filters.startDate && filters.endDate) {
        filename = `GSTR3B_${filters.startDate}_to_${filters.endDate}.${ext}`;
      } else {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const now = new Date();
        const monthName = monthNames[now.getMonth()];
        const year = now.getFullYear();
        filename = `GSTR3B_${monthName}_${year}.${ext}`;
      }
      
      downloadBlob(blob, filename);
      return { success: true };
    } catch (err) {
      console.error('[reportsThunk] downloadGstr3bReport error:', err);
      const msg = await parseBlobError(err, 'Failed to download GSTR-3B Report');
      return rejectWithValue(msg);
    }
  }
);

export const fetchGstr3bReport = createAsyncThunk(
  'reports/fetchGstr3bReport',
  async (filters, { rejectWithValue }) => {
    try {
      console.log('[reportsThunk] Fetching GSTR-3B report JSON with filters:', filters);
      const data = await reportService.fetchGstr3bReport(filters);
      return data?.data || data || null;
    } catch (err) {
      console.error('[reportsThunk] fetchGstr3bReport error:', err);
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch GSTR-3B details');
    }
  }
);

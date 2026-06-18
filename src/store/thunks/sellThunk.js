import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

// Helper to extract array from paginated response
const extractData = (res) => {
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.data)) return res.data.data;
  if (Array.isArray(res.data?.records)) return res.data.records;
  if (Array.isArray(res.data?.results)) return res.data.results;
  return [];
};

// GET /sell/ — Fetch all sales & estimates
export const fetchSales = createAsyncThunk(
  'sell/fetchSales',
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await api.get('/sell/', { params });
      return {
        records: extractData(res),
        total: res.data?.total || res.data?.count || 0,
        page: params.page || 1,
      };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch sales records');
    }
  }
);

// POST /sell/sell-items — Record a new direct sale or estimate
export const createSaleOrEstimate = createAsyncThunk(
  'sell/createSaleOrEstimate',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post('/sell/sell-items', payload);
      return res.data?.data || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to record transaction');
    }
  }
);

// PATCH /sell/:id — Update a sell record (adjusts stock dynamically)
export const updateSaleOrEstimate = createAsyncThunk(
  'sell/updateSaleOrEstimate',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/sell/${id}`, payload);
      return res.data?.data || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update transaction');
    }
  }
);

// POST /sell/convert-to-sale/:id — Convert Estimate to Sale
export const convertToSale = createAsyncThunk(
  'sell/convertToSale',
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.post(`/sell/convert-to-sale/${id}`);
      return res.data?.data || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to convert estimate to sale');
    }
  }
);

// DELETE /sell/:id — Delete sale/estimate
export const deleteSale = createAsyncThunk(
  'sell/deleteSale',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/sell/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete sale record');
    }
  }
);

// GET /sell/payment-in — Fetch all payment-in receipts
export const fetchPaymentsIn = createAsyncThunk(
  'sell/fetchPaymentsIn',
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await api.get('/sell/payment-in', { params });
      return {
        records: extractData(res),
        total: res.data?.total || res.data?.count || 0,
        page: params.page || 1,
      };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch payment receipts');
    }
  }
);

// POST /sell/payment-in — Record customer payment-in
export const recordPaymentIn = createAsyncThunk(
  'sell/recordPaymentIn',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post('/sell/payment-in', payload);
      return res.data?.data || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to record payment-in');
    }
  }
);

// PATCH /sell/payment-in/:id — Update a payment-in receipt
export const updatePaymentIn = createAsyncThunk(
  'sell/updatePaymentIn',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/sell/payment-in/${id}`, payload);
      return res.data?.data || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update payment receipt');
    }
  }
);

// DELETE /sell/payment-in/:id — Delete payment-in
export const deletePaymentIn = createAsyncThunk(
  'sell/deletePaymentIn',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/sell/payment-in/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete payment receipt');
    }
  }
);

// GET /sell/sell-return — Fetch all credit notes/sales returns
export const fetchSalesReturns = createAsyncThunk(
  'sell/fetchSalesReturns',
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await api.get('/sell/sell-return', { params });
      return {
        records: extractData(res),
        total: res.data?.total || res.data?.count || 0,
        page: params.page || 1,
      };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch sales returns');
    }
  }
);

// POST /sell/sell-return — Record a sales return
export const recordSalesReturn = createAsyncThunk(
  'sell/recordSalesReturn',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post('/sell/sell-return', payload);
      return res.data?.data || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to record sales return');
    }
  }
);

// PATCH /sell/sell-return/:id — Update a sales return
export const updateSalesReturn = createAsyncThunk(
  'sell/updateSalesReturn',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/sell/sell-return/${id}`, payload);
      return res.data?.data || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update sales return');
    }
  }
);

// DELETE /sell/sell-return/:id — Delete sales return
export const deleteSalesReturn = createAsyncThunk(
  'sell/deleteSalesReturn',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/sell/sell-return/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete sales return');
    }
  }
);

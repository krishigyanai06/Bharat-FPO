import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

// ==========================================
// 1. BILLS & ORDERS
// ==========================================

export const fetchPurchases = createAsyncThunk(
  'purchase/fetchPurchases',
  async (filters, { rejectWithValue }) => {
    try {
      const res = await api.get('/purchase/list', { params: filters });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch purchases');
    }
  }
);

export const createPurchase = createAsyncThunk(
  'purchase/createPurchase',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post('/purchase/add', payload);
      return res.data?.data || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create purchase');
    }
  }
);

export const getPurchaseById = createAsyncThunk(
  'purchase/getPurchaseById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`/purchase/${id}`);
      return res.data?.data || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch purchase details');
    }
  }
);

export const updatePurchase = createAsyncThunk(
  'purchase/updatePurchase',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/purchase/update/${id}`, payload);
      return res.data?.data || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update purchase');
    }
  }
);

export const deletePurchase = createAsyncThunk(
  'purchase/deletePurchase',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/purchase/delete/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete purchase');
    }
  }
);

// ==========================================
// 2. PAYMENTS OUT
// ==========================================

export const fetchPaymentsOut = createAsyncThunk(
  'purchase/fetchPaymentsOut',
  async (filters, { rejectWithValue }) => {
    try {
      const res = await api.get('/purchase/payment-out/list', { params: filters });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch payments out');
    }
  }
);

export const createPaymentOut = createAsyncThunk(
  'purchase/createPaymentOut',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post('/purchase/payment-out', payload);
      return res.data?.data || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to record payment out');
    }
  }
);

export const getPaymentOutById = createAsyncThunk(
  'purchase/getPaymentOutById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`/purchase/payment-out/${id}`);
      return res.data?.data || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch payment out details');
    }
  }
);

export const updatePaymentOut = createAsyncThunk(
  'purchase/updatePaymentOut',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/purchase/payment-out/update/${id}`, payload);
      return res.data?.data || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update payment out');
    }
  }
);

export const deletePaymentOut = createAsyncThunk(
  'purchase/deletePaymentOut',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/purchase/payment-out/delete/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete payment out');
    }
  }
);

// ==========================================
// 3. PURCHASE RETURNS
// ==========================================

export const fetchPurchaseReturns = createAsyncThunk(
  'purchase/fetchPurchaseReturns',
  async (filters, { rejectWithValue }) => {
    try {
      const res = await api.get('/purchase/return/list', { params: filters });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch purchase returns');
    }
  }
);

export const createPurchaseReturn = createAsyncThunk(
  'purchase/createPurchaseReturn',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post('/purchase/return', payload);
      return res.data?.data || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to record purchase return');
    }
  }
);

export const deletePurchaseReturn = createAsyncThunk(
  'purchase/deletePurchaseReturn',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/purchase/return/delete/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete purchase return');
    }
  }
);

// ==========================================
// 4. EXPENSES
// ==========================================

export const fetchExpenses = createAsyncThunk(
  'purchase/fetchExpenses',
  async (filters, { rejectWithValue }) => {
    try {
      const res = await api.get('/purchase/expense/list', { params: filters });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch expenses');
    }
  }
);

export const createExpense = createAsyncThunk(
  'purchase/createExpense',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post('/purchase/expense', payload);
      return res.data?.data || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create expense');
    }
  }
);

export const deleteExpense = createAsyncThunk(
  'purchase/deleteExpense',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/purchase/expense/delete/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete expense');
    }
  }
);

// Convert Purchase Order to Purchase Bill
export const convertToPurchaseBill = createAsyncThunk(
  'purchase/convertToPurchaseBill',
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.post(`/purchase/convert-to-purchase/${id}`);
      return res.data?.data || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to convert purchase order to bill');
    }
  }
);

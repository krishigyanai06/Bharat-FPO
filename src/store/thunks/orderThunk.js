import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

export const fetchAllOrders = createAsyncThunk('orders/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('order/allOrders');
    const payload = res.data.data ?? res.data;
    return Array.isArray(payload) ? payload : [];
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch orders');
  }
});

export const placeOrder = createAsyncThunk('orders/place', async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post('order/place', payload);
    return res.data.data ?? res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to place order');
  }
});

export const updateOrderStatus = createAsyncThunk('orders/updateStatus', async ({ id, status }, { rejectWithValue }) => {
  try {
    await api.put(`order/updateOrderStatus/${id}`, { status });
    // return the id + status so slice can update locally without a refetch
    return { _id: id, status };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update status');
  }
});

export const updateOrderPrices = createAsyncThunk('orders/updatePrices', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.patch(`order/${id}/update-prices`, data);
    return res.data.data ?? res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update prices');
  }
});

export const generateReceipt = createAsyncThunk('orders/generateReceipt', async (order, { rejectWithValue }) => {
  try {
    const body = {
      paymentMethod: order.paymentMethod,
      creditDays: order.creditDays ?? 0,
      dueDate: order.dueDate ?? null,
      referenceType: 'SALE',
    };
    const res = await api.post(`order/generateReceipt/${order._id}`, body);
    return res.data.data ?? res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to generate receipt');
  }
});

export const fetchReceiptById = createAsyncThunk('orders/fetchReceiptById', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`order/receipt/${id}`);
    return res.data.data ?? res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch receipt');
  }
});

export const fetchAllReceipts = createAsyncThunk('orders/fetchReceipts', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('order/allReceipts');
    const payload = res.data.data ?? res.data;
    return Array.isArray(payload) ? payload : [];
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch receipts');
  }
});

export const downloadReceipt = createAsyncThunk('orders/downloadReceipt', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`order/downloadReceipt/${id}`, { responseType: 'blob' });
    const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to download receipt');
  }
});

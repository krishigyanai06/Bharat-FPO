// src/store/thunks/purchasesThunk.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

export const fetchPurchases = createAsyncThunk(
  'purchases/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/product/getProducts');
      return res.data.data; // ✅ THIS IS REQUIRED
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to fetch purchases'
      );
    }
  }
);

export const createPurchase = createAsyncThunk(
  'purchases/create',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post('/product/addProduct', payload);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to create purchase'
      );
    }
  }
);

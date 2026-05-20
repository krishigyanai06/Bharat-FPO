import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

export const fetchProducts = createAsyncThunk(
  'products/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/sell-crop/getListings');
      return res.data?.data || [];
    } catch (err) {
      return rejectWithValue('Failed to fetch products');
    }
  }
);

export const deleteListing = createAsyncThunk(
  'products/delete',
  async ({ id, userId }, { rejectWithValue }) => {
    try {
      await api.delete(`/sell-crop/delete/${id}`, { data: { userId } });
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete listing');
    }
  }
);

export const updateListing = createAsyncThunk(
  'products/update',
  async ({ id, data }, { rejectWithValue, getState }) => {
    try {
      const userId = getState().auth.user?._id;
      const res = await api.put(`/sell-crop/update/${id}`, { ...data, userId });
      return res.data?.data ?? res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update listing');
    }
  }
);

export const approveListing = createAsyncThunk(
  'products/approve',
  async (id, { rejectWithValue, getState }) => {
    try {
      const userId = getState().auth.user?._id;
      const res = await api.put(`/sell-crop/update/${id}`, { userId, status: 'approved' });
      return res.data?.data ?? { _id: id, status: 'approved' };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to approve listing');
    }
  }
);

export const rejectListing = createAsyncThunk(
  'products/reject',
  async (id, { rejectWithValue, getState }) => {
    try {
      const userId = getState().auth.user?._id;
      const res = await api.put(`/sell-crop/update/${id}`, { userId, status: 'rejected' });
      return res.data?.data ?? { _id: id, status: 'rejected' };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to reject listing');
    }
  }
);
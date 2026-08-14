import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const fetchProducts = createAsyncThunk(
  'products/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/sell-crop/getListings');
      return res.data?.data || [];
    } catch (err) {
      return rejectWithValue('Failed to fetch products');
    }
  },
  {
    condition: (arg, { getState }) => {
      const { products, loading, lastFetched } = getState().products;
      if (loading) return false;
      if (arg?.force !== true && products && products.length > 0 && lastFetched && (Date.now() - lastFetched < CACHE_TTL)) {
        console.log('[fetchProducts/listings] Returning cached products list');
        return false;
      }
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
      const apiStatus = data.status === 'rejected' ? 'reject' : data.status;
      const res = await api.patch(`/sell-crop/update/${id}`, { ...data, status: apiStatus, userId });
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
      const res = await api.patch(`/sell-crop/update/${id}`, { userId, status: 'approved' });
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
      const res = await api.patch(`/sell-crop/update/${id}`, { userId, status: 'reject' });
      return res.data?.data ?? { _id: id, status: 'reject' };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to reject listing');
    }
  }
);
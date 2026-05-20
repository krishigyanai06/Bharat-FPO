import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

export const fetchCoupons = createAsyncThunk(
  'coupons/fetchCoupons',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('coupons/get-all');
      return data.coupons || data.data || data || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch coupons');
    }
  }
);

export const createCoupon = createAsyncThunk(
  'coupons/createCoupon',
  async (couponData, { rejectWithValue }) => {
    try {
      const { data } = await api.post('coupons/add', couponData);
      return data.coupon || data.data || data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to create coupon');
    }
  }
);

export const updateCoupon = createAsyncThunk(
  'coupons/updateCoupon',
  async ({ id, couponData }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`coupons/update/${id}`, couponData);
      return data.coupon || data.data || data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update coupon');
    }
  }
);

export const deleteCoupon = createAsyncThunk(
  'coupons/deleteCoupon',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.delete(`coupons/delete/${id}`);
      return { id, ...data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete coupon');
    }
  }
);

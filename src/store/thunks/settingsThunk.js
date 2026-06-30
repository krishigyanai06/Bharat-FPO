import {  createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

/* ================= FETCH PROFILE ================= */
export const fetchProfile = createAsyncThunk(
  'settings/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/user/getUserDetails');
      return res.data.data?.user ?? res.data.data ?? res.data.user ?? res.data ?? null;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to load profile'
      );
    }
  }
);

/* ================= UPDATE PROFILE ================= */
export const updateProfile = createAsyncThunk(
  'settings/updateProfile',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.patch('/user/update-profile', payload);
      return res.data.data; // updated profile
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Profile update failed'
      );
    }
  }
);

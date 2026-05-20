import {  createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

/* ================= FETCH PROFILE ================= */
export const fetchProfile = createAsyncThunk(
  'settings/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/user/getUserDetails');
      return res.data.data; // ✅ actual data object
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
      const res = await api.put('/user/update-profile', payload);
      return res.data.data; // updated profile
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Profile update failed'
      );
    }
  }
);

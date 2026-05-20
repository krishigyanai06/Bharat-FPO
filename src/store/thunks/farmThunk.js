import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

export const getFarmsByUserId = createAsyncThunk(
  'farm/byUser',
  async (userId, { rejectWithValue }) => {
    try {
      const res = await api.get(`/farm/getFarmsByUserId/${userId}`);
      return res.data.data || [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch farms');
    }
  }
);

export const getFarmByFarmId = createAsyncThunk(
  'farm/byId',
  async (farmId, { rejectWithValue }) => {
    try {
      const res = await api.get(`/farm/getFarmByFarmId/${farmId}`);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch farm');
    }
  }
);

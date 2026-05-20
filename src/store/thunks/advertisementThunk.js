import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

export const fetchPosters = createAsyncThunk('advertisement/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/advertisement-posters/');
    return res.data;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Failed to fetch posters');
  }
});

export const uploadPoster = createAsyncThunk('advertisement/upload', async (formData, { rejectWithValue }) => {
  try {
    const res = await api.post('/advertisement-posters/upload-poster', formData);
    return res.data;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Failed to upload poster');
  }
});

export const deletePoster = createAsyncThunk('advertisement/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/advertisement-posters/${id}/delete`);
    return id;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Failed to delete poster');
  }
});

import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

// ===================== SUPER ADMIN THUNKS =====================

// GET /superadmin/advertisement-posters
export const fetchSuperAdminPosters = createAsyncThunk(
  'advertisement/fetchSuperAdminPosters',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/superadmin/advertisement-posters');
      return res.data;
    } catch (e) {
      const errData = e.response?.data;
      const errorMsg = errData?.error || errData?.message || 'Failed to fetch SuperAdmin posters';
      return rejectWithValue(errorMsg);
    }
  }
);

// POST /superadmin/advertisement-posters
export const uploadSuperAdminPoster = createAsyncThunk(
  'advertisement/uploadSuperAdminPoster',
  async (formData, { rejectWithValue }) => {
    try {
      const res = await api.post('/superadmin/advertisement-posters', formData);
      return res.data;
    } catch (e) {
      const errData = e.response?.data;
      const errorMsg = errData?.error || errData?.message || 'Failed to upload SuperAdmin poster';
      return rejectWithValue(errorMsg);
    }
  }
);

// DELETE /superadmin/advertisement-posters/:id
export const deleteSuperAdminPoster = createAsyncThunk(
  'advertisement/deleteSuperAdminPoster',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/superadmin/advertisement-posters/${id}`);
      return id;
    } catch (e) {
      const errData = e.response?.data;
      const errorMsg = errData?.error || errData?.message || 'Failed to delete SuperAdmin poster';
      return rejectWithValue(errorMsg);
    }
  }
);

// PATCH /superadmin/advertisement-posters/:id
export const updateSuperAdminPosterTargeting = createAsyncThunk(
  'advertisement/updateSuperAdminPosterTargeting',
  async ({ id, visibleToAll, visibleToTenants }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/superadmin/advertisement-posters/${id}`, {
        visibleToAll,
        visibleToTenants,
      });
      return res.data;
    } catch (e) {
      const errData = e.response?.data;
      const errorMsg = errData?.error || errData?.message || 'Failed to update poster targeting';
      return rejectWithValue(errorMsg);
    }
  }
);

// ===================== FPO / TENANT ADMIN THUNKS =====================

// GET /advertisement-posters/ (supports ?type=superadmin or ?type=fpo or combined)
export const fetchPosters = createAsyncThunk(
  'advertisement/fetchAll',
  async (filterType, { rejectWithValue }) => {
    try {
      const params = {};
      if (filterType && filterType !== 'all') {
        params.type = filterType;
      }
      const res = await api.get('/advertisement-posters/', { params });
      return res.data;
    } catch (e) {
      const errData = e.response?.data;
      const errorMsg = errData?.error || errData?.message || 'Failed to fetch posters';
      return rejectWithValue(errorMsg);
    }
  }
);

// POST /advertisement-posters/upload-poster
export const uploadPoster = createAsyncThunk(
  'advertisement/upload',
  async (formData, { rejectWithValue }) => {
    try {
      const res = await api.post('/advertisement-posters/upload-poster', formData);
      return res.data;
    } catch (e) {
      const errData = e.response?.data;
      const errorMsg = errData?.error || errData?.message || 'Failed to upload poster';
      return rejectWithValue(errorMsg);
    }
  }
);

// DELETE /advertisement-posters/:id/delete
export const deletePoster = createAsyncThunk(
  'advertisement/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/advertisement-posters/${id}/delete`);
      return id;
    } catch (e) {
      const errData = e.response?.data;
      const errorMsg = errData?.error || errData?.message || 'Failed to delete poster';
      return rejectWithValue(errorMsg);
    }
  }
);

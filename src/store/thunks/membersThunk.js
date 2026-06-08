import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';
import theme from '../../config/theme';

export const fetchMembers = createAsyncThunk(
  'members/fetch',
  async (_, { rejectWithValue }) => {
    try {
      console.log('[fetchMembers] 🔄 Fetching members from /user/getAllUsers');
      const res = await api.get('/user/getAllUsers');
      console.log('[fetchMembers] ✅ Response status:', res.status);
      console.log('[fetchMembers] 📦 Response data:', res.data);
      
      // Response is { success: true, data: { users: [...] } }
      const members = res.data?.data?.users || res.data?.data || res.data?.users || [];
      console.log('[fetchMembers] 👥 Parsed members count:', members.length);
      
      if (members.length > 0) {
        console.log('[fetchMembers] 📋 First 3 members:', members.slice(0, 3).map(m => ({ 
          role: m.role, 
          name: `${m.firstName} ${m.lastName}`,
          id: m._id 
        })));
      } else {
        console.warn('[fetchMembers] ⚠️ No members returned from API');
      }
      
      return members;
    } catch (err) {
      console.error('[fetchMembers] ❌ Error:', err.message);
      console.error('[fetchMembers] 📍 Response data:', err.response?.data);
      console.error('[fetchMembers] 📍 Status:', err.response?.status);
      return rejectWithValue(
        err.response?.data?.message || 'Failed to fetch members'
      );
    }
  }
);

export const updateMember = createAsyncThunk(
  'members/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/admin/update-user/${id}`, data);
      return res.data?.data ?? res.data?.user ?? { _id: id, ...data };
    } catch (err) {
      // fallback: optimistic update with local data
      if (err.response?.status === 404) return { _id: id, ...data };
      return rejectWithValue(err.response?.data?.message || 'Failed to update member');
    }
  }
);

export const updateKyc = createAsyncThunk(
  'members/updateKyc',
  async ({ id, kycStatus }, { rejectWithValue }) => {
    return rejectWithValue('Admin KYC update endpoint not available. Contact backend developer to add PUT /admin/update-user/:id');
  }
);

export const fetchMemberDocs = createAsyncThunk(
  'members/fetchDocs',
  async ({ type, userId }, { rejectWithValue }) => {
    try {
      const res = await api.get(`/admin/files/private?type=${type}&userId=${userId}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch documents');
    }
  }
);

export const fetchMemberCrops = createAsyncThunk(
  'members/fetchCrops',
  async (userId, { rejectWithValue }) => {
    try {
      const res = await api.get(`/crop/getCropsByUser`);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch crops');
    }
  }
);

export const fetchMemberListings = createAsyncThunk(
  'members/fetchListings',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`/sell-crop/getListings`);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch listings');
    }
  }
);

export const fetchMemberPurchases = createAsyncThunk(
  'members/fetchPurchases',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`/procurement/getPurchases`);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch purchases');
    }
  }
);
export const createStaff = createAsyncThunk(
  'members/createStaff',
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.post('/admin/create-staff', data);
      return res.data.data ?? res.data.user ?? res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to create staff'
      );
    }
  }
);

export const createFarmer = createAsyncThunk(
  'members/createFarmer',
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.post('/admin/create-farmer', data);
      return res.data?.user ?? res.data?.data ?? res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message
          ? `${err.response.data.message} ${err.response.data.error || JSON.stringify(err.response.data.errors || {})}`
          : 'Failed to create farmer'
      );
    }
  }
);

export const deleteMember = createAsyncThunk(
  'members/delete',
  async (id, { rejectWithValue }) => {
    try {
      // try admin route first, fall back to user route
      try {
        await api.delete(`/admin/deleteUser/${id}`);
      } catch (e) {
        if (e.response?.status === 404) {
          await api.delete(`/admin/delete-user/${id}`);
        } else throw e;
      }
      return id;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to delete member'
      );
    }
  }
);
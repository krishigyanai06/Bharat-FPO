import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

/* ================= PURCHASE REPORTS ================= */
export const fetchReports = createAsyncThunk(
  'reports/fetchPurchases',
  async (_, { rejectWithValue }) => {
    try {
      console.log('[fetchReports] Fetching purchase reports...');
      const res = await api.get('/procurement/getPurchases');
      console.log('[fetchReports] ✅ Response:', res.data);
      return res.data.data || [];
    } catch (err) {
      console.error('[fetchReports] ❌ Error:', err.message);
      console.error('[fetchReports] Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        url: err.config?.url,
        tenantId: err.config?.params?.tenantId,
        xTenantId: err.config?.headers?.['x-tenant-id']
      });
      return rejectWithValue(
        err.response?.data?.message || 'Failed to load reports'
      );
    }
  }
);

/* ================= FARMERS ================= */
export const fetchFarmers = createAsyncThunk(
  'reports/fetchFarmers',
  async (_, { rejectWithValue }) => {
    try {
      console.log('[fetchFarmers] Fetching farmers...');
      // Use getAllUsers endpoint (same as Members page)
      const res = await api.get('/user/getAllUsers');
      console.log('[fetchFarmers] ✅ Response:', res.data);
      // Handle different response formats
      const farmers = res.data?.data?.users || res.data?.data || res.data?.users || [];
      console.log('[fetchFarmers] Farmers count:', farmers.length);
      return farmers;
    } catch (err) {
      console.error('[fetchFarmers] ❌ Error:', err.message);
      console.error('[fetchFarmers] Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        url: err.config?.url,
        tenantId: err.config?.params?.tenantId,
        xTenantId: err.config?.headers?.['x-tenant-id']
      });
      // Try fallback endpoint
      try {
        console.log('[fetchFarmers] Trying fallback /user/getAllFarmers...');
        const fallbackRes = await api.get('/user/getAllFarmers');
        console.log('[fetchFarmers] ✅ Fallback response:', fallbackRes.data);
        return fallbackRes.data?.data || [];
      } catch (fallbackErr) {
        console.error('[fetchFarmers] ❌ Fallback also failed:', fallbackErr.message);
        return rejectWithValue('Failed to fetch farmers');
      }
    }
  }
);

/* ================= PRIVATE FILES ================= */
export const fetchPrivateFiles = createAsyncThunk(
  'reports/fetchPrivateFiles',
  async ({ farmerId, type }, { rejectWithValue }) => {
    try {
      const res = await api.get(
        `/admin/files/private?type=${type}&userId=${farmerId}`
      );

      return {
        farmerId,
        type,
        files: res.data.files || [],
      };
    } catch (err) {
      return rejectWithValue('Failed to fetch files');
    }
  }
);

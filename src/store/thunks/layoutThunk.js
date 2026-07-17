// store/thunks/layoutThunk.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const fetchMe = createAsyncThunk(
  'layout/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/user/getUserDetails');
      console.log('[fetchMe] Response:', res.data);

      // API shape: { success, data: { user: {...} } }
      // Extract user from nested structure or fallback to data directly
      const userData = res.data?.data?.user || res.data?.data;
      console.log('[fetchMe] Extracted user data:', userData);
      
      // If user has tenant info, log it
      if (userData?.tenant) {
        console.log('[fetchMe] User has tenant info:', userData.tenant);
      }
      
      return userData;
    } catch (err) {
      console.error('[fetchMe] Error:', err.response?.data);
      console.error('[fetchMe] Full error:', err.message);
      return rejectWithValue(
        err.response?.data?.message || 'Failed to load user'
      );
    }
  },
  {
    condition: (arg, { getState }) => {
      const { me, loading, lastFetchedMe } = getState().layout;
      if (loading) return false;
      if (arg?.force !== true && me && lastFetchedMe && (Date.now() - lastFetchedMe < CACHE_TTL)) {
        console.log('[fetchMe] Returning cached user details');
        return false;
      }
    }
  }
);

export const fetchTenants = createAsyncThunk(
  'layout/fetchTenants',
  async (_, { rejectWithValue }) => {
    try {
      console.log('[fetchTenants] Starting request to /superadmin/tenants');
      const res = await api.get('/superadmin/tenants');
      console.log('[fetchTenants] Raw response:', res.data);

      // Handle multiple response shapes from backend
      const tenants =
        res.data?.data?.tenants ||  // { success: true, data: { tenants: [...] } } ← NEW FORMAT
        res.data?.data ||           // { success: true, data: [...] }
        res.data?.tenants ||        // { success: true, tenants: [...] }
        (Array.isArray(res.data) ? res.data : []); // direct array

      console.log('[fetchTenants] ✅ Resolved tenants count:', tenants.length);
      console.log('[fetchTenants] Tenants:', tenants);
      return tenants;
    } catch (err) {
      console.error('[fetchTenants] ❌ Error caught:', err.response?.status, err.response?.data || err.message);
      console.error('[fetchTenants] Full error object:', err);
      console.error('[fetchTenants] Request URL:', err.config?.url);
      console.error('[fetchTenants] Request headers:', err.config?.headers);
      
      // Log more details
      if (err.response?.status === 401) {
        console.error('[fetchTenants] 🔴 Authentication error - check if token is valid');
        console.error('[fetchTenants] Response message:', err.response?.data?.message);
      } else if (err.message === 'Network Error') {
        console.error('[fetchTenants] 🔴 Network Error - endpoint might not exist or CORS issue');
        console.error('[fetchTenants] Trying alternative endpoint: /tenant/getAllTenants');
        
        // Try alternative endpoint
        try {
          const altRes = await api.get('/tenant/getAllTenants');
          console.log('[fetchTenants] Alternative endpoint response:', altRes.data);
          const tenants = altRes.data?.data?.tenants || altRes.data?.data || altRes.data?.tenants || (Array.isArray(altRes.data) ? altRes.data : []);
          console.log('[fetchTenants] ✅ Resolved tenants from alternative endpoint:', tenants.length);
          return tenants;
        } catch (altErr) {
          console.error('[fetchTenants] Alternative endpoint also failed:', altErr.message);
        }
      }
      
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to fetch tenants'
      );
    }
  },
  {
    condition: (arg, { getState }) => {
      const { tenants, loading, lastFetchedTenants } = getState().layout;
      if (loading) return false;
      if (arg?.force !== true && tenants && tenants.length > 0 && lastFetchedTenants && (Date.now() - lastFetchedTenants < CACHE_TTL)) {
        console.log('[fetchTenants] Returning cached tenants list');
        return false;
      }
    }
  }
);



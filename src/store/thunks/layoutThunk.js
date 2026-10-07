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
  async (arg = {}, { rejectWithValue }) => {
    try {
      const page = typeof arg === 'number' ? arg : (arg?.page || 1);
      const search = typeof arg === 'object' && arg?.search ? arg.search : '';

      const queryParams = { page };
      if (search && search.trim()) {
        queryParams.search = search.trim();
      }

      console.log(`[fetchTenants] Starting request for page ${page} with params:`, queryParams);
      let res;
      try {
        res = await api.get('/superadmin/tenants', { params: queryParams });
      } catch (err) {
        if (err.message === 'Network Error' || err.response?.status === 404) {
          console.warn('[fetchTenants] Primary endpoint failed, trying alternative /tenant/list');
          try {
            res = await api.get('/tenant/list', { params: queryParams });
          } catch (altErr) {
            console.warn('[fetchTenants] /tenant/list failed, trying alternative /tenant/getAllTenants');
            res = await api.get('/tenant/getAllTenants', { params: queryParams });
          }
        } else {
          throw err;
        }
      }

      console.log('[fetchTenants] Raw response:', res.data);

      const dataObj = res.data?.data || res.data || {};

      const tenants =
        dataObj.tenants ||
        res.data?.data?.tenants ||
        res.data?.tenants ||
        (Array.isArray(dataObj) ? dataObj : null) ||
        (Array.isArray(res.data) ? res.data : []);

      const totalPages = dataObj.totalPages ?? res.data?.totalPages ?? 1;
      const currentPage = dataObj.currentPage ?? res.data?.currentPage ?? page;
      const totalTenants = dataObj.totalTenants ?? res.data?.totalTenants ?? (Array.isArray(tenants) ? tenants.length : 0);

      console.log('[fetchTenants] ✅ Resolved pagination:', {
        tenantsCount: Array.isArray(tenants) ? tenants.length : 0,
        currentPage,
        totalPages,
        totalTenants,
      });

      return {
        tenants: Array.isArray(tenants) ? tenants : [],
        currentPage: Number(currentPage) || 1,
        totalPages: Number(totalPages) || 1,
        totalTenants: Number(totalTenants) || 0,
      };
    } catch (err) {
      console.error('[fetchTenants] ❌ Error caught:', err.response?.status, err.response?.data || err.message);
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to fetch tenants'
      );
    }
  },
  {
    condition: (arg, { getState }) => {
      const { tenants, loading, lastFetchedTenants, currentPage: statePage } = getState().layout;
      if (loading) return false;

      const reqPage = typeof arg === 'number' ? arg : (arg?.page || 1);
      const reqSearch = typeof arg === 'object' && arg?.search ? arg.search : '';
      const force = arg?.force === true;

      // Bypass cache if forcing, or requesting a different page or with a search query
      if (force) return true;
      if (reqPage !== statePage) return true;
      if (reqSearch && reqSearch.trim().length > 0) return true;

      if (tenants && tenants.length > 0 && lastFetchedTenants && (Date.now() - lastFetchedTenants < CACHE_TTL)) {
        console.log('[fetchTenants] Returning cached tenants list');
        return false;
      }
    }
  }
);

export const fetchAllTenants = createAsyncThunk(
  'layout/fetchAllTenants',
  async (arg = {}, { rejectWithValue }) => {
    try {
      console.log('[fetchAllTenants] Starting request for full tenant list');
      let res;
      try {
        res = await api.get('/superadmin/tenants', { params: { limit: 1000, all: true } });
      } catch (err) {
        if (err.message === 'Network Error' || err.response?.status === 404) {
          console.warn('[fetchAllTenants] /superadmin/tenants failed, trying /tenant/getAllTenants');
          try {
            res = await api.get('/tenant/getAllTenants', { params: { limit: 1000, all: true } });
          } catch (altErr) {
            console.warn('[fetchAllTenants] /tenant/getAllTenants failed, trying /tenant/list');
            res = await api.get('/tenant/list', { params: { limit: 1000, all: true } });
          }
        } else {
          throw err;
        }
      }

      console.log('[fetchAllTenants] Raw response:', res.data);

      const dataObj = res.data?.data || res.data || {};
      let tenants =
        dataObj.tenants ||
        res.data?.data?.tenants ||
        res.data?.tenants ||
        (Array.isArray(dataObj) ? dataObj : null) ||
        (Array.isArray(res.data) ? res.data : []);

      let tenantsList = Array.isArray(tenants) ? [...tenants] : [];
      const totalPages = Number(dataObj.totalPages ?? res.data?.totalPages ?? 1);
      const totalTenants = Number(dataObj.totalTenants ?? res.data?.totalTenants ?? tenantsList.length);

      // If backend returned paginated page 1 and there are more pages, fetch remaining pages
      if (totalPages > 1 && tenantsList.length < totalTenants) {
        console.log(`[fetchAllTenants] Backend returned page 1 of ${totalPages}. Fetching remaining pages...`);
        for (let p = 2; p <= totalPages; p++) {
          try {
            const pageRes = await api.get('/superadmin/tenants', { params: { page: p, limit: 1000 } });
            const pageData = pageRes.data?.data || pageRes.data || {};
            const pageTenants =
              pageData.tenants ||
              pageRes.data?.data?.tenants ||
              pageRes.data?.tenants ||
              (Array.isArray(pageData) ? pageData : []);
            if (Array.isArray(pageTenants)) {
              tenantsList = tenantsList.concat(pageTenants);
            }
          } catch (pageErr) {
            console.warn(`[fetchAllTenants] Error fetching page ${p}:`, pageErr.message);
          }
        }
      }

      // Deduplicate by tenant ID or tenantCode
      const uniqueTenants = [];
      const seenIds = new Set();
      for (const t of tenantsList) {
        const id = t._id || t.id || t.tenantCode;
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          uniqueTenants.push(t);
        }
      }

      console.log('[fetchAllTenants] ✅ Resolved total unique tenants count:', uniqueTenants.length);
      return uniqueTenants;
    } catch (err) {
      console.error('[fetchAllTenants] ❌ Error:', err);
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to fetch all tenants'
      );
    }
  },
  {
    condition: (arg, { getState }) => {
      const { allTenants, lastFetchedAllTenants } = getState().layout;
      if (arg?.force !== true && allTenants && allTenants.length > 0 && lastFetchedAllTenants && (Date.now() - lastFetchedAllTenants < CACHE_TTL)) {
        console.log('[fetchAllTenants] Returning cached allTenants list');
        return false;
      }
    }
  }
);



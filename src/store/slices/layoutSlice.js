// store/slices/layoutSlice.js
import { createSlice } from '@reduxjs/toolkit';
import { fetchMe, fetchTenants, fetchAllTenants } from '../thunks/layoutThunk';

const initialState = {
  me: null,
  tenants: [],
  allTenants: [],
  currentPage: 1,
  totalPages: 1,
  totalTenants: 0,
  selectedTenantId: localStorage.getItem('selectedTenantId') || null, // Try to restore from localStorage
  loading: false,
  error: null,
  lastFetchedMe: null,
  lastFetchedTenants: null,
  lastFetchedAllTenants: null,
};

const layoutSlice = createSlice({
  name: 'layout',
  initialState,
  reducers: {
    clearMe: (state) => {
      state.me = null;
      state.tenants = [];
      state.allTenants = [];
      state.currentPage = 1;
      state.totalPages = 1;
      state.totalTenants = 0;
      state.selectedTenantId = null;
      state.lastFetchedMe = null;
      state.lastFetchedTenants = null;
      state.lastFetchedAllTenants = null;
      localStorage.removeItem('selectedTenantId');
    },
    setSelectedTenant: (state, action) => {
      const tenantId = action.payload;
      console.log('[layoutSlice] setSelectedTenant called with:', tenantId);
      
      // Validate tenantId is a non-empty string
      if (tenantId && typeof tenantId === 'string' && tenantId.trim().length > 0) {
        state.selectedTenantId = tenantId;
        localStorage.setItem('selectedTenantId', tenantId);
        console.log('[layoutSlice] ✅ Tenant ID saved to localStorage:', tenantId);
      } else {
        console.warn('[layoutSlice] ⚠️ Invalid tenantId provided:', tenantId);
        state.selectedTenantId = null;
        localStorage.removeItem('selectedTenantId');
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMe.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.loading = false;
        state.me = action.payload;
        state.lastFetchedMe = Date.now();
        console.log('[layoutSlice] fetchMe fulfilled, payload:', action.payload);
      })
      .addCase(fetchMe.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchTenants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTenants.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload;

        if (Array.isArray(payload)) {
          state.tenants = payload;
          state.currentPage = 1;
          state.totalPages = 1;
          state.totalTenants = payload.length;
        } else if (payload && typeof payload === 'object') {
          state.tenants = payload.tenants || [];
          state.currentPage = payload.currentPage || 1;
          state.totalPages = payload.totalPages || 1;
          state.totalTenants = payload.totalTenants ?? (payload.tenants ? payload.tenants.length : 0);
        }

        state.lastFetchedTenants = Date.now();
        console.log('[layoutSlice] fetchTenants fulfilled, count:', state.tenants.length, 'page:', state.currentPage, 'totalPages:', state.totalPages);
        
        // Auto-select first tenant immediately if none selected
        if (state.tenants.length > 0 && !state.selectedTenantId) {
          const defaultTenant = state.tenants.find(t => t.tenantCode === 'MAR4UP') || state.tenants[0];
          state.selectedTenantId = defaultTenant._id;
          localStorage.setItem('selectedTenantId', defaultTenant._id);
          console.log('[layoutSlice] ✅ Auto-selected tenant on fetch:', defaultTenant._id, defaultTenant.name || defaultTenant.businessName);
        }
      })
      .addCase(fetchTenants.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        console.error('[layoutSlice] fetchTenants failed:', action.payload);
        // If fetch fails and no tenants exist, set default MAR4UP tenant
        if (!state.tenants || state.tenants.length === 0) {
          const defaultTenant = {
            _id: '69fc8edf068c8a5b5626a014',  // ✅ Real MAR4UP tenant ID
            tenantCode: 'MAR4UP',
            businessName: 'Marjeevi Pragatisheel FPO',
            name: 'Marjeevi Pragatisheel FPO',
            status: 'active'
          };
          state.tenants = [defaultTenant];
          state.currentPage = 1;
          state.totalPages = 1;
          state.totalTenants = 1;
          state.selectedTenantId = defaultTenant._id;
          localStorage.setItem('selectedTenantId', defaultTenant._id);
          console.warn('[layoutSlice] Using default MAR4UP tenant (fetchTenants failed):', defaultTenant);
        }
      })
      .addCase(fetchAllTenants.fulfilled, (state, action) => {
        const list = action.payload || [];
        state.allTenants = list;
        state.lastFetchedAllTenants = Date.now();
        console.log('[layoutSlice] fetchAllTenants fulfilled, allTenants count:', state.allTenants.length);
        if (state.allTenants.length > 0 && !state.selectedTenantId) {
          const defaultTenant = state.allTenants.find(t => t.tenantCode === 'MAR4UP') || state.allTenants[0];
          state.selectedTenantId = defaultTenant._id;
          localStorage.setItem('selectedTenantId', defaultTenant._id);
        }
      });
  },
});

export const { clearMe, setSelectedTenant } = layoutSlice.actions;
export default layoutSlice.reducer;

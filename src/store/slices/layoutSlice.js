// store/slices/layoutSlice.js
import { createSlice } from '@reduxjs/toolkit';
import { fetchMe, fetchTenants } from '../thunks/layoutThunk';

const initialState = {
  me: null,
  tenants: [],
  selectedTenantId: localStorage.getItem('selectedTenantId') || null, // Try to restore from localStorage
  loading: false,
  error: null,
  lastFetchedMe: null,
  lastFetchedTenants: null,
};

const layoutSlice = createSlice({
  name: 'layout',
  initialState,
  reducers: {
    clearMe: (state) => {
      state.me = null;
      state.tenants = [];
      state.selectedTenantId = null;
      state.lastFetchedMe = null;
      state.lastFetchedTenants = null;
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
      .addCase(fetchTenants.fulfilled, (state, action) => {
        state.tenants = action.payload || [];
        state.lastFetchedTenants = Date.now();
        console.log('[layoutSlice] fetchTenants fulfilled, tenants count:', state.tenants.length);
        console.log('[layoutSlice] Tenants data:', state.tenants);
        
        // Auto-select first tenant immediately if none selected
        if (state.tenants.length > 0 && !state.selectedTenantId) {
          const defaultTenant = state.tenants.find(t => t.tenantCode === 'MAR4UP') || state.tenants[0];
          state.selectedTenantId = defaultTenant._id;
          localStorage.setItem('selectedTenantId', defaultTenant._id);
          console.log('[layoutSlice] ✅ Auto-selected tenant on fetch:', defaultTenant._id, defaultTenant.name || defaultTenant.businessName);
        }
      })
      .addCase(fetchTenants.rejected, (state, action) => {
        console.error('[layoutSlice] fetchTenants failed:', action.payload);
        // If fetch fails, use the default MAR4UP tenant
        // This allows SuperAdmin to still function even if the tenants endpoint fails
        const defaultTenant = {
          _id: '69fc8edf068c8a5b5626a014',  // ✅ Real MAR4UP tenant ID
          tenantCode: 'MAR4UP',
          businessName: 'Marjeevi Pragatisheel FPO',
          name: 'Marjeevi Pragatisheel FPO',
          status: 'active'
        };
        state.tenants = [defaultTenant];
        // Immediately select the default tenant
        state.selectedTenantId = defaultTenant._id;
        localStorage.setItem('selectedTenantId', defaultTenant._id);
        console.warn('[layoutSlice] Using default MAR4UP tenant (fetchTenants failed):', defaultTenant);
      });
  },
});

export const { clearMe, setSelectedTenant } = layoutSlice.actions;
export default layoutSlice.reducer;

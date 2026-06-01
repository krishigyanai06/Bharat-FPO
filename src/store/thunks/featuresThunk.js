import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export const fetchMyFeatures = createAsyncThunk(
  'features/fetchMyFeatures',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const userRole = String(state.auth?.user?.role || state.layout?.me?.role || '')
        .replace(/\s+/g, '')
        .toLowerCase();
      const selectedTenantId = state.layout?.selectedTenantId;

      // Interceptor skips /tenant/my-features, so we set x-tenant-id manually for superadmin
      const config = userRole === 'superadmin' && selectedTenantId
        ? { headers: { 'x-tenant-id': selectedTenantId } }
        : {};

      const res = await api.get('/tenant/my-features', config);
      const d = res.data?.data || res.data;
      return { tier: d.tier || 'FREE', features: d.features || [] };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load features');
    }
  }
);

export const updateTierFeatures = createAsyncThunk(
  'features/updateTierFeatures',
  async ({ tenantId, tier, features }, { rejectWithValue }) => {
    try {
      console.log('[updateTierFeatures] Sending:', { tenantId, tier, features });
      const res = await api.put(
        `/superadmin/tenants/${tenantId}/tier-features`,
        { tier, features }
      );
      const d = res.data?.data || res.data;
      toast.success('Tier & features updated successfully!');
      return { tier: d.tier ?? tier, features: d.features ?? features };
    } catch (err) {
      console.error('[updateTierFeatures] Error:', err.response?.status, err.response?.data);
      toast.error(err.response?.data?.message || 'Failed to update');
      return rejectWithValue(err.response?.data?.message || 'Failed to update');
    }
  }
);

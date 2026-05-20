import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

const TYPES = ['labReport', 'soilHealthCard', 'govtSchemeDocs'];

export const fetchDocuments = createAsyncThunk(
  'documents/fetch',
  async (userId, { rejectWithValue }) => {
    if (!userId) return rejectWithValue('userId is required');
    try {
      const results = await Promise.allSettled(
        TYPES.map((type) => api.get(`/admin/files/private?type=${type}&userId=${userId}`))
      );
      return results.flatMap((result, i) => {
        if (result.status !== 'fulfilled') return [];
        const data = result.value.data;
        return (data?.files || data || []).map((doc) => ({
          ...doc,
          document_type: TYPES[i],
        }));
      });
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load documents');
    }
  }
);

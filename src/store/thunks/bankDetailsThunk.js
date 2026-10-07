import { createAsyncThunk } from '@reduxjs/toolkit';
import bankDetailsService from '../../services/bankDetailsService';

export const fetchBankDetails = createAsyncThunk(
  'bankDetails/fetchBankDetails',
  async (_, { rejectWithValue }) => {
    try {
      const data = await bankDetailsService.getBankDetails();
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to fetch bank details'
      );
    }
  }
);

export const updateBankDetails = createAsyncThunk(
  'bankDetails/updateBankDetails',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await bankDetailsService.updateBankDetails(payload);
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to update bank details'
      );
    }
  }
);

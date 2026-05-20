import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

const extractEntries = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.ledgers)) return data.ledgers;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.entries)) return data.entries;
  return [];
};

export const fetchAllLedgers = createAsyncThunk(
  'ledger/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('ledger/');
      return extractEntries(res.data);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch ledgers');
    }
  }
);

export const fetchPaymentBalance = createAsyncThunk(
  'ledger/paymentBalance',
  async (farmerId, { rejectWithValue }) => {
    try {
      const res = await api.get(`payment/balance/${farmerId}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch balance');
    }
  }
);

export const recordFarmerPayment = createAsyncThunk(
  'ledger/farmerPayment',
  async ({ farmerId, amount, paymentMethod }, { rejectWithValue }) => {
    try {
      const res = await api.post('payment/farmer-payment', { farmerId, amount, paymentMethod });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Payment failed');
    }
  }
);

export const recordFpoPayment = createAsyncThunk(
  'ledger/fpoPayment',
  async ({ farmerId, amount, paymentMethod }, { rejectWithValue }) => {
    try {
      const res = await api.post('payment/fpo-payment', { farmerId, amount, paymentMethod });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Payment failed');
    }
  }
);

export const fetchLedgerByType = createAsyncThunk(
  'ledger/fetchByType',
  async (type, { rejectWithValue }) => {
    try {
      const res = await api.get(`ledger/reference/${type}`);
      return extractEntries(res.data);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch ledger');
    }
  }
);

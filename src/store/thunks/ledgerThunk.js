import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

const extractEntries = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.entries)) return data.entries;
  if (Array.isArray(data?.ledgers)) return data.ledgers;
  if (Array.isArray(data?.ledger)) return data.ledger;
  if (Array.isArray(data?.transactions)) return data.transactions;
  if (Array.isArray(data?.statement)) return data.statement;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.history)) return data.history;
  if (Array.isArray(data?.docs)) return data.docs;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.results)) return data.results;

  if (data?.data) {
    if (Array.isArray(data.data)) return data.data;
    if (typeof data.data === 'object') {
      const nested = extractEntries(data.data);
      if (nested.length > 0) return nested;
    }
  }

  // Check any array property on data
  if (typeof data === 'object') {
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key]) && data[key].length > 0) {
        return data[key];
      }
    }
  }

  return [];
};

export const fetchAllLedgers = createAsyncThunk(
  'ledger/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      let res;
      try {
        res = await api.get('ledger/');
      } catch (e1) {
        try {
          res = await api.get('/ledger');
        } catch (e2) {
          res = await api.get('/ledger/');
        }
      }
      return extractEntries(res.data);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch ledgers');
    }
  }
);


export const fetchLedgerByParty = createAsyncThunk(
  'ledger/fetchByParty',
  async (partyId, { rejectWithValue }) => {
    try {
      let res;
      try {
        res = await api.get(`ledger/party/${partyId}`);
      } catch (err) {
        if (err.response?.status === 404 || err.response?.data?.message?.toLowerCase().includes('not found')) {
          res = await api.get(`ledger/${partyId}`);
        } else {
          throw err;
        }
      }

      const rawData = res.data?.data || res.data || {};
      const entries = extractEntries(rawData);
      
      const balanceDetails = rawData?.balanceDetails || res.data?.balanceDetails || null;
      const party = rawData?.party || rawData?.user || res.data?.party || res.data?.user || null;

      return {
        entries,
        balanceDetails,
        party,
      };
    } catch (err) {
      console.warn('fetchLedgerByParty API error:', err.message);
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch party ledger');
    }
  }
);

export const fetchLedgerByUser = createAsyncThunk(
  'ledger/fetchByUser',
  async (userId, { rejectWithValue }) => {
    try {
      let res;
      try {
        res = await api.get(`ledger/${userId}`);
      } catch (err) {
        if (err.response?.status === 404 || err.response?.data?.message?.toLowerCase().includes('not found')) {
          try {
            res = await api.get(`ledger/user/${userId}`);
          } catch (err2) {
            res = await api.get(`ledger/party/${userId}`);
          }
        } else {
          throw err;
        }
      }

      const rawData = res.data?.data || res.data || {};
      const entries = extractEntries(rawData);
      
      const balanceDetails = rawData?.balanceDetails || res.data?.balanceDetails || null;
      const user = rawData?.user || rawData?.farmer || rawData?.party || res.data?.user || res.data?.farmer || res.data?.party || null;

      return {
        entries,
        balanceDetails,
        party: user,
      };
    } catch (err) {
      console.warn('fetchLedgerByUser API error:', err.message);
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch user ledger');
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

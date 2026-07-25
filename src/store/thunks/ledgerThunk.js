import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

const extractEntries = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.entries)) return data.entries;
  if (Array.isArray(data?.ledgers)) return data.ledgers;
  if (Array.isArray(data?.transactions)) return data.transactions;
  if (Array.isArray(data?.statement)) return data.statement;
  if (Array.isArray(data?.ledger)) return data.ledger;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.history)) return data.history;
  if (Array.isArray(data?.data)) return extractEntries(data.data);
  if (Array.isArray(data?.data?.entries)) return data.data.entries;
  if (Array.isArray(data?.data?.ledgers)) return data.data.ledgers;
  if (Array.isArray(data?.data?.transactions)) return data.data.transactions;
  if (Array.isArray(data?.result)) return data.result;
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

export const fetchLedgerByParty = createAsyncThunk(
  'ledger/fetchByParty',
  async (partyId, { rejectWithValue, getState }) => {
    try {
      const res = await api.get(`ledger/party/${partyId}`);
      const rawData = res.data?.data || res.data || {};
      const entries = extractEntries(rawData);
      
      const balanceDetails = rawData?.balanceDetails || res.data?.balanceDetails || null;
      const party = rawData?.party || res.data?.party || null;

      if (entries.length > 0 || balanceDetails || party) {
        return {
          entries,
          balanceDetails,
          party,
        };
      }
      
      const current = getState().ledger?.entries || [];
      return {
        entries: current,
        balanceDetails: null,
        party: null,
      };
    } catch (err) {
      console.warn("fetchLedgerByParty API call fallback:", err.message);
      const current = getState().ledger?.entries || [];
      return {
        entries: current,
        balanceDetails: null,
        party: null,
      };
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

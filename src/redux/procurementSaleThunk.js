import { createAsyncThunk } from '@reduxjs/toolkit';
import procurementSaleService from '../services/procurementSaleService';

export const fetchProcurementSales = createAsyncThunk(
  'procurementSale/fetchSales',
  async (params, { rejectWithValue }) => {
    try {
      const data = await procurementSaleService.getSales(params);
      return data.data || data || [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to fetch sales');
    }
  }
);

export const fetchProcurementSaleDetails = createAsyncThunk(
  'procurementSale/fetchDetails',
  async (id, { rejectWithValue }) => {
    try {
      const data = await procurementSaleService.getSaleById(id);
      return data.data || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to fetch sale details');
    }
  }
);

export const createProcurementSale = createAsyncThunk(
  'procurementSale/createSale',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await procurementSaleService.addSale(payload);
      return data.data || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to save sale');
    }
  }
);

export const updateProcurementSale = createAsyncThunk(
  'procurementSale/updateSale',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const data = await procurementSaleService.updateSale(id, payload);
      return data.data || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to update sale');
    }
  }
);

export const deleteProcurementSale = createAsyncThunk(
  'procurementSale/deleteSale',
  async (id, { rejectWithValue }) => {
    try {
      await procurementSaleService.deleteSale(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to delete sale');
    }
  }
);

export const generateProcurementEWayBill = createAsyncThunk(
  'procurementSale/generateEWayBill',
  async ({ id, body, token }, { rejectWithValue }) => {
    try {
      const data = await procurementSaleService.generateEWayBill(id, body, token);
      return data.data || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to generate e-Way Bill');
    }
  }
);

export const fetchProcurementStock = createAsyncThunk(
  'procurementSale/fetchStock',
  async (_, { rejectWithValue }) => {
    try {
      const data = await procurementSaleService.getProcurementStock();
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to fetch stock');
    }
  }
);

export const fetchProcurementStockLogs = createAsyncThunk(
  'procurementSale/fetchStockLogs',
  async (_, { rejectWithValue }) => {
    try {
      const data = await procurementSaleService.getStockLogs();
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to fetch stock logs');
    }
  }
);

export const adjustProcurementStock = createAsyncThunk(
  'procurementSale/adjustStock',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await procurementSaleService.adjustStock(payload);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to adjust stock');
    }
  }
);

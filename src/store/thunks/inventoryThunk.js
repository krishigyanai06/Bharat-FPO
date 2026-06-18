import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

// GET /product/getProducts
export const fetchProducts = createAsyncThunk(
  'inventory/fetchProducts',
  async (_, { rejectWithValue }) => {
    try {
      console.log('[fetchProducts] Fetching products...');
      const res = await api.get('/product/getProducts');
      console.log('[fetchProducts] ✅ Response:', res.data);
      const products = res.data.data || [];
      console.log('[fetchProducts] Products count:', products.length);
      return products;
    } catch (err) {
      console.error('[fetchProducts] ❌ Error:', err.message);
      console.error('[fetchProducts] Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        url: err.config?.url,
        tenantId: err.config?.params?.tenantId,
        xTenantId: err.config?.headers?.['x-tenant-id']
      });
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch products');
    }
  }
);

// GET /inventory/stocks  — current stock levels per product
export const fetchStockSummary = createAsyncThunk(
  'inventory/fetchStockSummary',
  async (_, { rejectWithValue }) => {
    try {
      console.log('[fetchStockSummary] Fetching stock summary...');
      const res = await api.get('/inventory/stocks');
      console.log('[fetchStockSummary] ✅ Response:', res.data);
      const payload = res.data?.data ?? res.data?.stocks ?? res.data ?? [];
      console.log('[fetchStockSummary] Stock items count:', Array.isArray(payload) ? payload.length : 0);
      return Array.isArray(payload) ? payload : [];
    } catch (err) {
      console.error('[fetchStockSummary] ❌ Error:', err.message);
      console.error('[fetchStockSummary] Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        url: err.config?.url,
        tenantId: err.config?.params?.tenantId,
        xTenantId: err.config?.headers?.['x-tenant-id']
      });
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch stock summary');
    }
  }
);

// POST /product/addProduct
export const addProduct = createAsyncThunk(
  'inventory/addProduct',
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.post('/product/addProduct', data);
      console.log('addProduct success:', res.data);
      return res.data.data ?? res.data;
    } catch (err) {
      console.log('addProduct error full:', err.response?.data);
      return rejectWithValue(err.response?.data?.message || 'Failed to add product');
    }
  }
);

// PATCH /product/updateProduct/:id
export const updateProduct = createAsyncThunk(
  'inventory/updateProduct',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/product/updateProduct/${id}`, data);
      return res.data.data ?? res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update product');
    }
  }
);

// PATCH /product/toggleProductStatus/:id — toggle active status
export const toggleProductStatus = createAsyncThunk(
  'inventory/toggleProductStatus',
  async ({ id, isActive }, { rejectWithValue }) => {
    try {
      await api.patch(`/product/toggleProductStatus/${id}`, { isActive });
      return { id, isActive };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update status');
    }
  }
);

// DELETE /product/deleteProduct/:id
export const deleteProduct = createAsyncThunk(
  'inventory/deleteProduct',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/product/deleteProduct/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete product');
    }
  }
);

// DELETE /inventory/stock/:itemId
export const deleteStockItem = createAsyncThunk(
  'inventory/deleteStock',
  async (itemId, { rejectWithValue }) => {
    try {
      await api.delete(`/inventory/stock/${itemId}`);
      return itemId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete stock item');
    }
  }
);

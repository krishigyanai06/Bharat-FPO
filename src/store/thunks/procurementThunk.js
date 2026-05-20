import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

export const fetchOrders = createAsyncThunk(
  'procurement/fetchOrders',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/procurement/getPurchases');
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to fetch orders'
      );
    }
  }
);

export const createOrder = createAsyncThunk(
  'procurement/createOrder',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post('/procurement/addPurchase', payload);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to create order'
      );
    }
  }
);

export const deleteOrder = createAsyncThunk(
  'procurement/deleteOrder',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/procurement/deletePurchase/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to delete order'
      );
    }
  }
);

export const updateOrder = createAsyncThunk(
  'procurement/updateOrder',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      // If only status is being updated, send minimal payload
      if (Object.keys(data).length === 1 && data.status) {
        const res = await api.put(`/procurement/updatePurchase/${id}`, { status: data.status });
        return res.data?.data ?? res.data;
      }

      // Full update flow
      let purchaseId = data.purchaseId;
      if (!purchaseId) {
        try {
          const getRes = await api.get(`/procurement/getPurchaseById/${id}`);
          const existingOrder = getRes.data?.data ?? getRes.data;
          purchaseId = existingOrder?.purchaseId;
        } catch (getErr) {
        }
      }

      const payload = {
        ...(purchaseId && { purchaseId }),
        farmer: data.farmer,
        crops: data.crops.map((c) => ({
          cropName: c.cropName,
          variety: c.variety ?? '',
          rate: Number(c.rate),
          quantity: Number(c.quantity),
        })),
        procurementDate: data.procurementDate,
        procurementCenter: data.procurementCenter,
        godown: data.godown ?? '',
        vehicle: data.vehicle ?? '',
        remarks: data.remarks ?? '',
        previousDues: Number(data.previousDues) || 0,
        status: data.status || 'pending',
      };

      const res = await api.put(`/procurement/updatePurchase/${id}`, payload);
      return res.data?.data ?? res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to update order'
      );
    }
  }
);
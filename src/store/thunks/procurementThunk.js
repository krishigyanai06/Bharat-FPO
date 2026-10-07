import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
  },
  {
    condition: (arg, { getState }) => {
      const { orders, loading, lastFetched } = getState().procurement;
      if (loading) return false;
      if (arg?.force !== true && orders && orders.length > 0 && lastFetched && (Date.now() - lastFetched < CACHE_TTL)) {
        console.log('[fetchOrders/procurement] Returning cached procurement orders');
        return false;
      }
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
        let res;
        try {
          res = await api.patch(`/procurement/updatePurchase/${id}`, { status: data.status });
        } catch (err) {
          if (err.response?.status === 404) {
            try {
              res = await api.patch(`/procurement/updatePurchase/${id}`, { status: data.status });
            } catch (err2) {
              try {
                res = await api.patch(`/procurement/update/${id}`, { status: data.status });
              } catch (err3) {
                res = await api.patch(`/procurement/update/${id}`, { status: data.status });
              }
            }
          } else {
            throw err;
          }
        }
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

      const farmerId = typeof data.farmer === 'object' && data.farmer !== null
        ? (data.farmer._id || data.farmer.id)
        : data.farmer;

      const payload = {
        ...(purchaseId && { purchaseId }),
        farmer: farmerId,
        crops: data.crops.map((c) => ({
          crop: c.cropName || c.crop || '',
          cropName: c.cropName || c.crop || '',
          variety: c.variety ?? '',
          rate: Number(c.rate),
          quantity: Number(c.quantity),
          unit: c.unit || 'qtl',
          ...(c._id && { _id: c._id }),
          ...(c.id && { id: c.id }),
        })),
        procurementDate: data.procurementDate,
        procurementCenter: data.procurementCenter || 'Main Yard',
        godown: data.godown ?? '',
        vehicle: data.vehicle ?? '',
        remarks: data.remarks ?? '',
        previousDues: Number(data.previousDues) || 0,
        status: data.status || 'pending',
      };

      let res;
      try {
        res = await api.patch(`/procurement/updatePurchase/${id}`, payload);
      } catch (err) {
        if (err.response?.status === 404) {
          try {
            console.log('[updateOrder] PATCH /procurement/updatePurchase failed with 404, trying PUT...');
            res = await api.put(`/procurement/updatePurchase/${id}`, payload);
          } catch (putErr) {
            if (putErr.response?.status === 404) {
              try {
                console.log('[updateOrder] PUT /procurement/updatePurchase failed with 404, trying PATCH /procurement/update...');
                res = await api.patch(`/procurement/update/${id}`, payload);
              } catch (patchUpdateErr) {
                if (patchUpdateErr.response?.status === 404) {
                  console.log('[updateOrder] PATCH /procurement/update failed, trying PUT /procurement/update...');
                  res = await api.put(`/procurement/update/${id}`, payload);
                } else {
                  throw patchUpdateErr;
                }
              }
            } else {
              throw putErr;
            }
          }
        } else {
          throw err;
        }
      }

      return res.data?.data ?? res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to update order'
      );
    }
  }
);
import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

// 1. Fetch All Parties
export const fetchParties = createAsyncThunk(
    'party/fetchParties',
    async (_, { rejectWithValue }) => {
        try {
            const res = await api.get('/party/getAllParties');
            // Adjust standard return based on backend format
            return res.data?.data || res.data?.parties || res.data || [];
        } catch (err) {
            return rejectWithValue(
                err.response?.data?.message || 'Failed to fetch parties'
            );
        }
    }
);

// 2. Add New Party
export const addParty = createAsyncThunk(
    'party/addParty',
    async (payload, { rejectWithValue }) => {
        try {
            const res = await api.post('/party/addParty', payload);
            return res.data?.data || res.data?.party || res.data;
        } catch (err) {
            return rejectWithValue(
                err.response?.data?.message || 'Failed to create party'
            );
        }
    }
);

// 3. Update Existing Party
export const updateParty = createAsyncThunk(
    'party/updateParty',
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const res = await api.put(`/party/updateParty/${id}`, data);
            return res.data?.data || res.data?.party || res.data;
        } catch (err) {
            return rejectWithValue(
                err.response?.data?.message || 'Failed to update party'
            );
        }
    }
);

// 4. Soft-delete a Party
export const deleteParty = createAsyncThunk(
    'party/deleteParty',
    async (id, { rejectWithValue }) => {
        try {
            const res = await api.delete(`/party/${id}`);
            return { id, data: res.data?.data || res.data };
        } catch (err) {
            return rejectWithValue(
                err.response?.data?.message || 'Failed to delete party'
            );
        }
    }
);

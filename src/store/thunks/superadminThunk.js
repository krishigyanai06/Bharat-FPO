import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';
import toast from 'react-hot-toast';

/**
 * Fetch all admin users (SuperAdmin)
 * GET /api/user/getAllAdmins
 */
export const fetchAllAdmins = createAsyncThunk(
  'superadmin/fetchAllAdmins',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/user/getAllAdmins');
      const data = response.data?.data || response.data?.users || response.data || [];
      return Array.isArray(data) ? data : (data.admins || data.users || []);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to fetch admin users';
      toast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

/**
 * Send WhatsApp campaign to a single recipient (SuperAdmin)
 * POST /api/superadmin/whatsapp/send-campaign
 */
export const sendWhatsAppCampaign = createAsyncThunk(
  'superadmin/sendWhatsAppCampaign',
  async (campaignData, { rejectWithValue }) => {
    try {
      const payload = {
        campaignName: campaignData.campaignName || 'bharatfpo_connect_marketing',
        destination: String(campaignData.destination || '').trim(),
        userName: campaignData.userName || 'Admin User',
        source: campaignData.source || 'Bharat_FPO_Connect_App',
        templateParams: campaignData.templateParams || [],
      };

      const response = await api.post('/superadmin/whatsapp/send-campaign', payload);
      
      const resData = response.data;
      const submittedId = 
        resData?.data?.data?.submitted_message_id || 
        resData?.data?.submitted_message_id || 
        resData?.submitted_message_id || 
        'N/A';

      toast.success(`WhatsApp campaign submitted! ID: ${submittedId}`);
      
      return {
        submittedMessageId: submittedId,
        response: resData,
        recipient: payload.userName,
        destination: payload.destination,
        campaignName: payload.campaignName,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to send WhatsApp campaign';
      toast.error(msg);
      return rejectWithValue({
        message: msg,
        recipient: campaignData.userName,
        destination: campaignData.destination,
      });
    }
  }
);

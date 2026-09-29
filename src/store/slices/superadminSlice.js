import { createSlice } from '@reduxjs/toolkit';
import { fetchAllAdmins, sendWhatsAppCampaign } from '../thunks/superadminThunk';

const initialState = {
  adminsList: [],
  loadingAdmins: false,
  sendingCampaign: false,
  selectedAdmins: [],
  campaignHistory: [],
  error: null,
  lastSubmittedMessageId: null,
};

const superadminSlice = createSlice({
  name: 'superadmin',
  initialState,
  reducers: {
    setSelectedAdmins: (state, action) => {
      state.selectedAdmins = action.payload;
    },
    toggleSelectAdmin: (state, action) => {
      const admin = action.payload;
      const extractId = (a) => {
        const raw = a._id || a.id || a.phone || a.destination;
        return typeof raw === 'object' ? raw._id || raw.id || raw.name || JSON.stringify(raw) : String(raw);
      };
      const idKey = extractId(admin);
      const index = state.selectedAdmins.findIndex((a) => extractId(a) === idKey);
      if (index >= 0) {
        state.selectedAdmins.splice(index, 1);
      } else {
        state.selectedAdmins.push(admin);
      }
    },
    selectAllAdmins: (state) => {
      state.selectedAdmins = [...state.adminsList];
    },
    clearSelectedAdmins: (state) => {
      state.selectedAdmins = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchAllAdmins
      .addCase(fetchAllAdmins.pending, (state) => {
        state.loadingAdmins = true;
        state.error = null;
      })
      .addCase(fetchAllAdmins.fulfilled, (state, action) => {
        state.loadingAdmins = false;
        state.adminsList = action.payload;
      })
      .addCase(fetchAllAdmins.rejected, (state, action) => {
        state.loadingAdmins = false;
        state.error = action.payload;
      })

      // sendWhatsAppCampaign
      .addCase(sendWhatsAppCampaign.pending, (state) => {
        state.sendingCampaign = true;
        state.error = null;
      })
      .addCase(sendWhatsAppCampaign.fulfilled, (state, action) => {
        state.sendingCampaign = false;
        state.lastSubmittedMessageId = action.payload.submittedMessageId;
        state.campaignHistory.unshift({
          id: Date.now().toString(),
          status: 'Success',
          submittedMessageId: action.payload.submittedMessageId,
          recipient: action.payload.recipient,
          destination: action.payload.destination,
          campaignName: action.payload.campaignName,
          timestamp: action.payload.timestamp,
        });
      })
      .addCase(sendWhatsAppCampaign.rejected, (state, action) => {
        state.sendingCampaign = false;
        state.error = action.payload?.message || action.payload;
        if (action.payload?.recipient) {
          state.campaignHistory.unshift({
            id: Date.now().toString(),
            status: 'Failed',
            submittedMessageId: 'FAILED',
            recipient: action.payload.recipient,
            destination: action.payload.destination,
            error: action.payload.message,
            timestamp: new Date().toISOString(),
          });
        }
      });
  },
});

export const {
  setSelectedAdmins,
  toggleSelectAdmin,
  selectAllAdmins,
  clearSelectedAdmins,
  clearError,
} = superadminSlice.actions;

export default superadminSlice.reducer;

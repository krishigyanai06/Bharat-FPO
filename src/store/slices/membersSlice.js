import { createSlice } from '@reduxjs/toolkit';
import { fetchMembers, deleteMember, updateMember, createStaff, createFarmer, updateKyc, updateFarmerDue, fetchFarmerDue } from '../thunks/membersThunk';

const membersSlice = createSlice({
  name: 'members',
  initialState: { members: [], loading: false, error: null, lastFetched: null },
  reducers: {
    updateMemberLocal(state, action) {
      const idx = state.members.findIndex((m) => m._id === action.payload._id);
      if (idx !== -1) state.members[idx] = { ...state.members[idx], ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMembers.pending, (state) => { state.loading = true; })
      .addCase(fetchMembers.fulfilled, (state, action) => {
        state.loading = false;
        state.members = Array.isArray(action.payload) ? action.payload : [];
        state.lastFetched = Date.now();
      })
      .addCase(fetchMembers.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(deleteMember.fulfilled, (state, action) => {
        state.members = state.members.filter((m) => m._id !== action.payload);
        state.lastFetched = null; // Invalidate cache on deletion
      })
      .addCase(updateMember.fulfilled, (state, action) => {
        const idx = state.members.findIndex((m) => m._id === action.payload._id);
        if (idx !== -1) state.members[idx] = action.payload;
        state.lastFetched = null; // Invalidate cache on update
      })
      .addCase(updateKyc.fulfilled, (state, action) => {
        const idx = state.members.findIndex((m) => m._id === action.payload.id);
        if (idx !== -1) state.members[idx].kycStatus = action.payload.kycStatus;
        state.lastFetched = null; // Invalidate cache on KYC status change
      })
      .addCase(createStaff.fulfilled, (state, action) => {
        if (action.payload?._id || action.payload?.id) state.members.unshift(action.payload);
        state.lastFetched = null; // Invalidate cache on creation
      })
      .addCase(createFarmer.fulfilled, (state, action) => {
        const member = action.payload?.user ?? action.payload?.data ?? action.payload;
        if (member?._id || member?.id) {
          state.members.unshift(member);
        }
        state.lastFetched = null; // Invalidate cache on creation
      })
      .addCase(fetchFarmerDue.fulfilled, (state, action) => {
        const data = action.payload;
        if (data && data.farmerId) {
          const idx = state.members.findIndex((m) => m._id === data.farmerId);
          if (idx !== -1) {
            state.members[idx].dueAmount = data.dueAmount;
            state.members[idx].dueAmountNote = data.dueAmountNote;
            state.members[idx].dueAmountUpdatedAt = data.dueAmountUpdatedAt;
            state.members[idx].dueAmountUpdatedBy = data.dueAmountUpdatedBy;
          }
        }
      })
      .addCase(updateFarmerDue.fulfilled, (state, action) => {
        const data = action.payload;
        const farmerId = data?.farmerId || action.meta?.arg?.farmerId;
        if (farmerId) {
          const idx = state.members.findIndex((m) => m._id === farmerId);
          if (idx !== -1) {
            if (data.dueAmount !== undefined) state.members[idx].dueAmount = data.dueAmount;
            if (data.dueAmountNote !== undefined) state.members[idx].dueAmountNote = data.dueAmountNote;
            if (data.dueAmountUpdatedAt !== undefined) state.members[idx].dueAmountUpdatedAt = data.dueAmountUpdatedAt;
          }
        }
      });
  },
});

export const { updateMemberLocal } = membersSlice.actions;
export default membersSlice.reducer;

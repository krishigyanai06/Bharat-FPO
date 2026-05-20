import { createSlice } from '@reduxjs/toolkit';
import { fetchMembers, deleteMember, updateMember, createStaff, createFarmer, updateKyc } from '../thunks/membersThunk';

const membersSlice = createSlice({
  name: 'members',
  initialState: { members: [], loading: false, error: null },
  reducers: {
    updateMemberLocal(state, action) {
      const idx = state.members.findIndex((m) => m._id === action.payload._id);
      if (idx !== -1) state.members[idx] = { ...state.members[idx], ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMembers.pending, (state) => { state.loading = true; })
      .addCase(fetchMembers.fulfilled, (state, action) => { state.loading = false; state.members = Array.isArray(action.payload) ? action.payload : []; })
      .addCase(fetchMembers.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(deleteMember.fulfilled, (state, action) => {
        state.members = state.members.filter((m) => m._id !== action.payload);
      })
      .addCase(updateMember.fulfilled, (state, action) => {
        const idx = state.members.findIndex((m) => m._id === action.payload._id);
        if (idx !== -1) state.members[idx] = action.payload;
      })
      .addCase(updateKyc.fulfilled, (state, action) => {
        const idx = state.members.findIndex((m) => m._id === action.payload.id);
        if (idx !== -1) state.members[idx].kycStatus = action.payload.kycStatus;
      })
      .addCase(createStaff.fulfilled, (state, action) => {
        if (action.payload?._id || action.payload?.id) state.members.unshift(action.payload);
      })
      .addCase(createFarmer.fulfilled, (state, action) => {
        if (action.payload?._id || action.payload?.id) state.members.unshift(action.payload);
      });
  },
});

export const { updateMemberLocal } = membersSlice.actions;
export default membersSlice.reducer;

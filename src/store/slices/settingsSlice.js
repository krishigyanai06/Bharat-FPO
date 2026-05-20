
import { createSlice } from '@reduxjs/toolkit';
import { fetchProfile, updateProfile } from '../thunks/settingsThunk';

const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    profile: null,
    loading: false,
    error: null,
    success: false,
  },
  reducers: {
    clearStatus: (state) => {
      state.success = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* FETCH */
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* UPDATE */
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.success = false;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
        state.success = true;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearStatus } = settingsSlice.actions;
export default settingsSlice.reducer;

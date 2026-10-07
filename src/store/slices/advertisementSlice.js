import { createSlice } from '@reduxjs/toolkit';
import {
  fetchPosters,
  uploadPoster,
  deletePoster,
  fetchSuperAdminPosters,
  uploadSuperAdminPoster,
  deleteSuperAdminPoster,
  updateSuperAdminPosterTargeting,
} from '../thunks/advertisementThunk';

const advertisementSlice = createSlice({
  name: 'advertisement',
  initialState: {
    posters: [],
    loading: false,
    uploading: false,
    updatingTargeting: false,
    error: null,
    activeFilter: 'all',
  },
  reducers: {
    setActiveFilter: (state, action) => {
      state.activeFilter = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // FPO / Shared Fetch
      .addCase(fetchPosters.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPosters.fulfilled, (state, action) => {
        state.loading = false;
        const p = action.payload;
        const rawList = Array.isArray(p) ? p : (p?.data ?? p?.posters ?? []);
        state.posters = Array.isArray(rawList) ? rawList : [];
      })
      .addCase(fetchPosters.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // SuperAdmin Fetch
      .addCase(fetchSuperAdminPosters.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSuperAdminPosters.fulfilled, (state, action) => {
        state.loading = false;
        const p = action.payload;
        const rawList = Array.isArray(p) ? p : (p?.data ?? p?.posters ?? []);
        state.posters = Array.isArray(rawList) ? rawList : [];
      })
      .addCase(fetchSuperAdminPosters.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // FPO Upload
      .addCase(uploadPoster.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(uploadPoster.fulfilled, (state, action) => {
        state.uploading = false;
        const payloadData = action.payload?.data ?? action.payload?.posters ?? action.payload?.poster ?? action.payload;
        if (Array.isArray(payloadData)) {
          state.posters = [...payloadData, ...state.posters];
        } else if (payloadData && typeof payloadData === 'object' && (payloadData._id || payloadData.id)) {
          state.posters.unshift(payloadData);
        }
      })
      .addCase(uploadPoster.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload;
      })

      // SuperAdmin Upload
      .addCase(uploadSuperAdminPoster.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(uploadSuperAdminPoster.fulfilled, (state, action) => {
        state.uploading = false;
        const payloadData = action.payload?.data ?? action.payload?.posters ?? action.payload?.poster ?? action.payload;
        if (Array.isArray(payloadData)) {
          state.posters = [...payloadData, ...state.posters];
        } else if (payloadData && typeof payloadData === 'object' && (payloadData._id || payloadData.id)) {
          state.posters.unshift(payloadData);
        }
      })
      .addCase(uploadSuperAdminPoster.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload;
      })

      // FPO Delete
      .addCase(deletePoster.fulfilled, (state, action) => {
        state.posters = state.posters.filter((p) => (p._id || p.id) !== action.payload);
      })

      // SuperAdmin Delete
      .addCase(deleteSuperAdminPoster.fulfilled, (state, action) => {
        state.posters = state.posters.filter((p) => (p._id || p.id) !== action.payload);
      })

      // SuperAdmin Update Targeting
      .addCase(updateSuperAdminPosterTargeting.pending, (state) => {
        state.updatingTargeting = true;
      })
      .addCase(updateSuperAdminPosterTargeting.fulfilled, (state, action) => {
        state.updatingTargeting = false;
        const updatedPoster = action.payload?.data ?? action.payload?.poster ?? action.payload;
        if (updatedPoster && (updatedPoster._id || updatedPoster.id)) {
          const uId = updatedPoster._id || updatedPoster.id;
          state.posters = state.posters.map((p) =>
            (p._id || p.id) === uId ? { ...p, ...updatedPoster } : p
          );
        }
      })
      .addCase(updateSuperAdminPosterTargeting.rejected, (state, action) => {
        state.updatingTargeting = false;
        state.error = action.payload;
      });
  },
});

export const { setActiveFilter, clearError } = advertisementSlice.actions;
export default advertisementSlice.reducer;

import { createSlice } from '@reduxjs/toolkit';
import { fetchPosters, uploadPoster, deletePoster } from '../thunks/advertisementThunk';

const advertisementSlice = createSlice({
  name: 'advertisement',
  initialState: { posters: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPosters.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchPosters.fulfilled, (state, action) => {
        state.loading = false;
        const p = action.payload;
        state.posters = Array.isArray(p) ? p : (p?.data ?? p?.posters ?? []);
      })
      .addCase(fetchPosters.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

      .addCase(uploadPoster.pending, (state) => { state.loading = true; })
      .addCase(uploadPoster.fulfilled, (state, action) => {
        state.loading = false;
        const poster = action.payload?.data ?? action.payload;
        if (poster?._id) state.posters.unshift(poster);
      })
      .addCase(uploadPoster.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

      .addCase(deletePoster.fulfilled, (state, action) => {
        state.posters = state.posters.filter((p) => p._id !== action.payload);
      });
  },
});

export default advertisementSlice.reducer;

import { createSlice } from '@reduxjs/toolkit';
import { fetchDocuments } from '../thunks/documentsThunk';

const documentsSlice = createSlice({
  name: 'documents',
  initialState: { documents: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDocuments.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchDocuments.fulfilled, (state, action) => { state.loading = false; state.documents = action.payload; })
      .addCase(fetchDocuments.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
  },
});

export default documentsSlice.reducer;

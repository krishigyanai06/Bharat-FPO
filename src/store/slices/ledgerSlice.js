import { createSlice } from '@reduxjs/toolkit';
import { fetchAllLedgers, fetchLedgerByType } from '../thunks/ledgerThunk';

const ledgerSlice = createSlice({
  name: 'ledger',
  initialState: { entries: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllLedgers.pending, (s) => { s.loading = true; })
      .addCase(fetchAllLedgers.fulfilled, (s, a) => { s.loading = false; s.entries = a.payload; })
      .addCase(fetchAllLedgers.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
      .addCase(fetchLedgerByType.pending, (s) => { s.loading = true; })
      .addCase(fetchLedgerByType.fulfilled, (s, a) => { s.loading = false; s.entries = a.payload; })
      .addCase(fetchLedgerByType.rejected, (s, a) => { s.loading = false; s.error = a.payload; });
  },
});

export default ledgerSlice.reducer;

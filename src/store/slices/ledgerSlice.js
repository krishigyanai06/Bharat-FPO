import { createSlice } from '@reduxjs/toolkit';
import { fetchAllLedgers, fetchLedgerByType, fetchLedgerByParty } from '../thunks/ledgerThunk';

const ledgerSlice = createSlice({
  name: 'ledger',
  initialState: {
    entries: [],
    partyBalanceDetails: null,
    partyInfo: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllLedgers.pending, (s) => {
        s.loading = true;
      })
      .addCase(fetchAllLedgers.fulfilled, (s, a) => {
        s.loading = false;
        s.entries = a.payload;
        s.partyBalanceDetails = null;
        s.partyInfo = null;
      })
      .addCase(fetchAllLedgers.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload;
      })
      .addCase(fetchLedgerByType.pending, (s) => {
        s.loading = true;
      })
      .addCase(fetchLedgerByType.fulfilled, (s, a) => {
        s.loading = false;
        s.entries = a.payload;
        s.partyBalanceDetails = null;
        s.partyInfo = null;
      })
      .addCase(fetchLedgerByType.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload;
      })
      .addCase(fetchLedgerByParty.pending, (s) => {
        s.loading = true;
      })
      .addCase(fetchLedgerByParty.fulfilled, (s, a) => {
        s.loading = false;
        if (Array.isArray(a.payload)) {
          s.entries = a.payload;
          s.partyBalanceDetails = null;
          s.partyInfo = null;
        } else if (a.payload && typeof a.payload === 'object') {
          s.entries = a.payload.entries || [];
          s.partyBalanceDetails = a.payload.balanceDetails || null;
          s.partyInfo = a.payload.party || null;
        }
      })
      .addCase(fetchLedgerByParty.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload;
      });
  },
});

export default ledgerSlice.reducer;

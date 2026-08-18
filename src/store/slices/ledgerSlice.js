import { createSlice } from '@reduxjs/toolkit';
import {
  fetchAllLedgers,
  fetchLedgerByType,
  fetchLedgerByParty,
  fetchLedgerByUser,
} from '../thunks/ledgerThunk';

const ledgerSlice = createSlice({
  name: 'ledger',
  initialState: {
    entries: [],
    partyBalanceDetails: null,
    partyInfo: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearPartyDetails: (s) => {
      s.partyBalanceDetails = null;
      s.partyInfo = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllLedgers.pending, (s) => {
        s.loading = true;
        s.error = null;
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
        s.error = null;
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
        s.error = null;
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
      })
      .addCase(fetchLedgerByUser.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(fetchLedgerByUser.fulfilled, (s, a) => {
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
      .addCase(fetchLedgerByUser.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload;
      });
  },
});

export const { clearPartyDetails } = ledgerSlice.actions;
export default ledgerSlice.reducer;


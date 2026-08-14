import { createSlice } from '@reduxjs/toolkit';
import { fetchBankDetails, updateBankDetails } from '../thunks/bankDetailsThunk';

const initialState = {
  bankDetails: {
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    upiId: '',
  },
  loading: false,
  saving: false,
  error: null,
  saveError: null,
};

const bankDetailsSlice = createSlice({
  name: 'bankDetails',
  initialState,
  reducers: {
    clearBankDetailsStatus: (state) => {
      state.error = null;
      state.saveError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* FETCH BANK DETAILS */
      .addCase(fetchBankDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBankDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        if (action.payload) {
          state.bankDetails = {
            bankName: action.payload.bankName || '',
            accountNumber: action.payload.accountNumber || '',
            ifscCode: action.payload.ifscCode || '',
            accountHolderName: action.payload.accountHolderName || '',
            upiId: action.payload.upiId || '',
          };
        }
      })
      .addCase(fetchBankDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* UPDATE BANK DETAILS */
      .addCase(updateBankDetails.pending, (state) => {
        state.saving = true;
        state.saveError = null;
      })
      .addCase(updateBankDetails.fulfilled, (state, action) => {
        state.saving = false;
        state.saveError = null;
        if (action.payload) {
          state.bankDetails = {
            bankName: action.payload.bankName ?? state.bankDetails.bankName,
            accountNumber: action.payload.accountNumber ?? state.bankDetails.accountNumber,
            ifscCode: action.payload.ifscCode ?? state.bankDetails.ifscCode,
            accountHolderName: action.payload.accountHolderName ?? state.bankDetails.accountHolderName,
            upiId: action.payload.upiId ?? state.bankDetails.upiId,
          };
        }
      })
      .addCase(updateBankDetails.rejected, (state, action) => {
        state.saving = false;
        state.saveError = action.payload;
      });
  },
});

export const { clearBankDetailsStatus } = bankDetailsSlice.actions;
export default bankDetailsSlice.reducer;

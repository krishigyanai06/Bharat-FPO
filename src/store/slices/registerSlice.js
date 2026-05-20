import { createSlice } from "@reduxjs/toolkit";
import { registerUser } from "../thunks/registerThunk";

const initialState = {
  loading: false,
  error: null,
  registerSuccess: false,
};

const registerSlice = createSlice({
  name: "register", // ✅ FIXED
  initialState,
  reducers: {
    clearAuthState: (state) => {
      state.loading = false;
      state.error = null;
      state.registerSuccess = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.registerSuccess = false;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false;
        state.registerSuccess = true;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearAuthState } = registerSlice.actions;
export default registerSlice.reducer;

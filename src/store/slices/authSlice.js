import { createSlice } from "@reduxjs/toolkit";
import { sendOtp, verifyOtp } from "../thunks/authThunk";
import { getToken, setToken, clearToken } from "../../lib/tokenStorage";

// ✅ SAFE JSON PARSER
const safeParse = (key) => {
  try {
    const value = localStorage.getItem(key);
    if (!value || value === "undefined") return null;
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const rawToken = getToken();
console.log('[authSlice] Initial token:', rawToken ? 'YES' : 'NO');
const validToken = rawToken && rawToken !== "undefined" ? rawToken : null;
console.log('[authSlice] validToken:', validToken ? 'YES' : 'NO');

const initialState = {
  token: validToken,
  user: safeParse("user"),
  profile: safeParse("profile"),
  isAuthenticated: !!validToken,
  loading: false,
  error: null,
  otpSent: false, // ✅ REQUIRED
};

const authSlice = createSlice({
  name: "auth",
  initialState,

  reducers: {
    logout: (state) => {
      state.user = null;
      state.profile = null;
      state.token = null;
      state.isAuthenticated = false;
      state.otpSent = false; // ✅ add this
      clearToken();
      localStorage.removeItem("user");
      localStorage.removeItem("profile");
    },

    clearAuthState: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder

      /**
       * =========================
       * SEND OTP
       * =========================
       */
      .addCase(sendOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(sendOtp.fulfilled, (state) => {
        state.loading = false;
        state.otpSent = true; // move to OTP screen
      })

      .addCase(sendOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to send OTP";
      })

      /**
       * =========================
       * VERIFY OTP (LOGIN)
       * =========================
       */
      .addCase(verifyOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(verifyOtp.fulfilled, (state, action) => {
        const { token, user, profile } = action.payload;

        console.log("[verifyOtp.fulfilled] Token:", token ? "YES" : "NO", "User role:", user?.role);

        if (!token) {
          state.loading = false;
          state.error = "Login failed: no token received";
          console.error("[verifyOtp.fulfilled] Token is missing from response!");
          return;
        }

        // ✅ Validate token is a string and not empty
        if (typeof token !== 'string' || token.trim() === '') {
          state.loading = false;
          state.error = "Login failed: invalid token format";
          console.error("[verifyOtp.fulfilled] Token is not a valid string:", typeof token);
          return;
        }

        // ✅ Save to state
        state.loading = false;
        state.token = token;
        state.user = user;
        state.profile = profile;
        state.isAuthenticated = true;
        state.otpSent = false;

        // ✅ Persist data
        setToken(token);
        localStorage.setItem("user", JSON.stringify(user ?? null));
        localStorage.setItem("profile", JSON.stringify(profile ?? null));
        
        // ✅ Layout.jsx handles dynamic default tenant selection for SuperAdmin now
        
        console.log("[verifyOtp.fulfilled] State saved, isAuthenticated:", true, "Token length:", token.length);
      })

      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "OTP verification failed";
      });
  },
});

export const { logout, clearAuthState } = authSlice.actions;
export default authSlice.reducer;

import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../lib/api";
import theme from "../../config/theme";

/**
 * =========================
 * LOGIN (Email OR Phone)
 * =========================
 */
export const sendOtp = createAsyncThunk(
  "auth/sendOtp",
  async ({ mobile, role }, { rejectWithValue }) => {
    try {
      if (!mobile) {
        return rejectWithValue("Mobile is required");
      }

      const payload = {
        mobile,
        role: role || theme.defaultRole, // "Admin" or "SuperAdmin"
      };

      if (payload.role !== "SuperAdmin" && theme.tenantCode) {
        payload.tenantCode = theme.tenantCode;
      }

      const res = await api.post("/otp/send-otp", payload);

      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to send OTP",
      );
    }
  },
);

export const verifyOtp = createAsyncThunk(
  "auth/verifyOtp",
  async ({ mobile, otp, role }, { rejectWithValue }) => {
    try {
      const payload = {
        mobile,
        otp,
        role: role || theme.defaultRole,
      };

      if (payload.role !== "SuperAdmin" && theme.tenantCode) {
        payload.tenantCode = theme.tenantCode;
      }

      const res = await api.post("/otp/verify-otp", payload);

      console.log("FULL RESPONSE:", res);
      console.log("DATA ONLY:", res.data);
      console.log("TOKEN:", res.data?.token);
      console.log("USER DATA:", res.data?.data);

      // Validate token exists
      const token = res.data?.token;
      if (!token || typeof token !== 'string' || token.trim() === '') {
        console.error("[verifyOtp] ERROR: Token missing or invalid in response:", token);
        return rejectWithValue("Login failed: server did not return a valid token");
      }

      // Get role from response - check multiple possible locations
      const resolvedRole = res.data.data?.role || res.data.role || payload.role;
      console.log("Resolved role from response:", resolvedRole);
      
      const userData = {
        ...res.data.data,
        role: String(resolvedRole).replace(/\s+/g, '').toLowerCase(),
      };
      
      console.log("[verifyOtp] ✅ Preparing to return token (length:", token.length, ") and user:", userData.role);
      
      return {
        token,
        user: userData,
        profile: null,
      };
    } catch (err) {
      console.error("[verifyOtp] Exception:", err);
      return rejectWithValue(err.response?.data?.message || "Invalid OTP");
    }
  },
);

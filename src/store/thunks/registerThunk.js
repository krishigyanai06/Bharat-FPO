import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../lib/api";


export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post("/user/register", userData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Registration failed"
      );
    }
  }
);

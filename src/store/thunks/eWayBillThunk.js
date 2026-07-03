import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../lib/api";

// Authenticate session with NIC credentials for E-Way Bill
export const authenticateEWayBillSession = createAsyncThunk(
  "eWayBill/authenticateSession",
  async (credentials, { getState, rejectWithValue }) => {
    try {
      // credentials can be { username, password, gstin }
      const response = await api.post("/e-invoice/e-way-bill/session/authenticate", credentials);
      const resData = response.data?.data || response.data;

      // Dynamically resolve the GSTIN associated with the session token
      const state = getState();
      const profileGstin =
        state.settings?.profile?.gstNumber ||
        state.settings?.profile?.eInvoiceGstin ||
        state.auth?.user?.gstNumber ||
        state.auth?.user?.gstin;

      const resolvedGstin =
        credentials?.gstin ||
        credentials?.gstNumber ||
        resData?.gstNumber ||
        resData?.gstin ||
        resData?.taxpayerGstin ||
        profileGstin;

      if (resolvedGstin) {
        sessionStorage.setItem("ewaybill_token_gstin", resolvedGstin);
      }

      return resData;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to authenticate E-Way Bill session"
      );
    }
  }
);

// Generate E-Way Bill by IRN
export const generateEWayBillByIrn = createAsyncThunk(
  "eWayBill/generateByIrn",
  async ({ irn, payload }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/e-invoice/e-way-bill/generate-by-irn/${irn}`, payload, {
        governmentToken: "einvoice",
      });
      return response.data?.data || response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.response?.data?.error || err.message || "Failed to generate E-Way Bill by IRN"
      );
    }
  }
);

// Generate Standalone E-Way Bill
export const generateStandaloneEWayBill = createAsyncThunk(
  "eWayBill/generateStandalone",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post("/e-invoice/e-way-bill/generate-standalone", payload, {
        governmentToken: "ewaybill",
      });
      return response.data?.data || response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.response?.data?.error || err.message || "Failed to generate standalone E-Way Bill"
      );
    }
  }
);

// Cancel E-Way Bill
export const cancelEWayBill = createAsyncThunk(
  "eWayBill/cancel",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post("/e-invoice/e-way-bill/cancel", payload, {
        governmentToken: "ewaybill",
      });
      return response.data?.data || response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.response?.data?.error || err.message || "Failed to cancel E-Way Bill"
      );
    }
  }
);

// Extend E-Way Bill validity
export const extendEWayBill = createAsyncThunk(
  "eWayBill/extend",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post("/e-invoice/e-way-bill/extend", payload, {
        governmentToken: "ewaybill",
      });
      return response.data?.data || response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.response?.data?.error || err.message || "Failed to extend E-Way Bill"
      );
    }
  }
);

// Update Vehicle details on E-Way Bill
export const updateEWayBillVehicle = createAsyncThunk(
  "eWayBill/updateVehicle",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.put("/e-invoice/e-way-bill/vehicle", payload, {
        governmentToken: "ewaybill",
      });
      return response.data?.data || response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.response?.data?.error || err.message || "Failed to update E-Way Bill vehicle"
      );
    }
  }
);

// Update Transporter details on E-Way Bill
export const updateEWayBillTransporter = createAsyncThunk(
  "eWayBill/updateTransporter",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.put("/e-invoice/e-way-bill/transporter", payload, {
        governmentToken: "ewaybill",
      });
      return response.data?.data || response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.response?.data?.error || err.message || "Failed to update E-Way Bill transporter"
      );
    }
  }
);

// Generate PDF of E-Way Bill
export const generateEWayBillPdf = createAsyncThunk(
  "eWayBill/generatePdf",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post("/e-invoice/e-way-bill/pdf/generate", payload, {
        responseType: "blob",
        governmentToken: "ewaybill",
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to generate E-Way Bill PDF"
      );
    }
  }
);

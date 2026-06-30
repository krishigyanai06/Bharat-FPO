import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../lib/api";

// 1. Search taxpayer data by GSTIN
export const searchGstin = createAsyncThunk(
  "eInvoice/searchGstin",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post("/e-invoice/gstin/search", payload);
      return response.data?.data || response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to fetch taxpayer data"
      );
    }
  }
);

// 2. Authenticate session with NIC credentials
export const authenticateSession = createAsyncThunk(
  "eInvoice/authenticateSession",
  async (credentials, { getState, rejectWithValue }) => {
    try {
      // credentials can be { username, password, gstin }
      const response = await api.post("/e-invoice/session/authenticate", credentials);
      const resData = response.data?.data || response.data;

      // Dynamically resolve the GSTIN associated with the session token
      const state = getState();
      const profileGstin = state.settings?.profile?.gstNumber || state.settings?.profile?.eInvoiceGstin || state.auth?.user?.gstNumber || state.auth?.user?.gstin;
      const resolvedGstin = credentials?.gstin || credentials?.gstNumber || resData?.gstNumber || resData?.gstin || resData?.taxpayerGstin || profileGstin;

      if (resolvedGstin) {
        sessionStorage.setItem("einvoice_token_gstin", resolvedGstin);
      }

      return resData;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to authenticate session"
      );
    }
  }
);

// 3. Generate registered E-Invoice
export const generateEInvoice = createAsyncThunk(
  "eInvoice/generate",
  async ({ invoiceData }, { rejectWithValue }) => {
    try {
      const response = await api.post("/e-invoice/generate", invoiceData);
      return response.data?.data || response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.response?.data?.error || err.message || "Failed to generate E-Invoice"
      );
    }
  }
);

// 4. Generate downloadable PDF of registered e-Invoice
export const generateEInvoicePdf = createAsyncThunk(
  "eInvoice/generatePdf",
  async (pdfPayload, { rejectWithValue }) => {
    try {
      // pdfPayload: { signed_qr_code, irn, signed_invoice }
      // API returns JSON: { code, data: { irn, "e-invoice_pdf_url": "https://..." }, transaction_id }
      const response = await api.post("/e-invoice/pdf/generate", pdfPayload);
      const pdfUrl = response.data?.data?.["e-invoice_pdf_url"];
      if (!pdfUrl) {
        return rejectWithValue("Backend did not return a PDF URL");
      }
      return pdfUrl; // returns the S3 PDF URL string
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to generate E-Invoice PDF"
      );
    }
  }
);

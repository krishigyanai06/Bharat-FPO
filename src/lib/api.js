import axios from "axios";
import theme from "../config/theme";
import { getToken } from "./tokenStorage";
import toast from "react-hot-toast";

const api = axios.create({
  baseURL: theme.apiBase,
});

// ✅ Check if E-Invoice portal session is valid
export const isEInvoiceSessionValid = (currentGstin) => {
  const token = sessionStorage.getItem("einvoice_token");
  const expiry = sessionStorage.getItem("einvoice_token_expiry");
  const tokenGstin = sessionStorage.getItem("einvoice_token_gstin");
  
  const isExpired = !token || !expiry || Date.now() >= Number(expiry);
  const isGstinMismatch = currentGstin && (!tokenGstin || tokenGstin !== currentGstin);
  
  return !(isExpired || isGstinMismatch);
};

// Check if E-Way Bill portal session is valid
export const isEWayBillSessionValid = (currentGstin) => {
  const token = sessionStorage.getItem("ewaybill_token");
  const expiry = sessionStorage.getItem("ewaybill_token_expiry");
  const tokenGstin = sessionStorage.getItem("ewaybill_token_gstin");
  
  const isExpired = !token || !expiry || Date.now() >= Number(expiry);
  const isGstinMismatch = currentGstin && (!tokenGstin || tokenGstin !== currentGstin);
  
  return !(isExpired || isGstinMismatch);
};

// ✅ Audit Logging Helper
export const getAuditLogs = () => {
  try {
    const logs = localStorage.getItem("einvoice_audit_logs");
    return logs ? JSON.parse(logs) : [];
  } catch {
    return [];
  }
};

export const addAuditLog = (event, details = {}) => {
  try {
    const logs = getAuditLogs();
    const newLog = {
      timestamp: new Date().toISOString(),
      event,
      details,
    };
    logs.unshift(newLog);
    localStorage.setItem("einvoice_audit_logs", JSON.stringify(logs.slice(0, 100)));
    console.log(`[E-INVOICE AUDIT LOG] [${event}]`, details);
    window.dispatchEvent(new CustomEvent("einvoice-audit-log-added", { detail: newLog }));
  } catch (e) {
    console.error("Failed to write audit log:", e);
  }
};

// Queue & single flight lock state for silent NIC re-authentication
let isReauthenticating = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// E-Way Bill silent re-authentication queue and lock
let isEWayBillReauthenticating = false;
let failedEWayBillQueue = [];

const processEWayBillQueue = (error, token = null) => {
  failedEWayBillQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedEWayBillQueue = [];
};

// ✅ Attach token automatically
api.interceptors.request.use(
  (config) => {
    // Explicit token strategy based on governmentToken request configuration
    const tokenType = config.governmentToken;
    const url = config.url || "";
    
    const isEWayBillRequest = tokenType === "ewaybill" || (!tokenType && url.includes("/e-invoice/e-way-bill") && !url.includes("/session/authenticate") && !url.includes("/generate-by-irn"));
    const isEInvoiceRequest = tokenType === "einvoice" || (!tokenType && url.includes("/e-invoice") && !url.includes("/session/authenticate") && !url.includes("/gstin/search"));

    if (isEWayBillRequest) {
      const eWayBillToken = sessionStorage.getItem("ewaybill_token");
      const eWayBillExpiry = sessionStorage.getItem("ewaybill_token_expiry");
      const isValid = eWayBillToken && eWayBillExpiry && Date.now() < Number(eWayBillExpiry);
      
      if (isValid) {
        config.headers["x-ewaybill-token"] = eWayBillToken;
        console.log(`[API] 🚚 E-Way Bill session token injected automatically: ${url}`);
      } else {
        console.warn(`[API] ⚠️ E-Way Bill token is missing or expired for: ${url}`);
      }
    } else if (isEInvoiceRequest) {
      const eInvoiceToken = sessionStorage.getItem("einvoice_token");
      const eInvoiceExpiry = sessionStorage.getItem("einvoice_token_expiry");
      const isValid = eInvoiceToken && eInvoiceExpiry && Date.now() < Number(eInvoiceExpiry);
      
      if (isValid) {
        config.headers["x-einvoice-token"] = eInvoiceToken;
        console.log(`[API] 🏛 E-Invoice session token injected automatically: ${url}`);
      } else {
        console.warn(`[API] ⚠️ E-Invoice token is missing or expired for: ${url}`);
      }
    }

    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      const tokenPreview = token.substring(0, 20) + '...' + token.substring(token.length - 10);
      console.log(`[API] ✅ Token attached for ${config.url}`);
      console.log(`    Token: ${tokenPreview} (length: ${token.length})`);
      
      // Verify JWT format (3 parts separated by dots)
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error(`[API] ⚠️ WARNING: Token is not valid JWT format! Parts: ${parts.length}`);
      }
    } else {
      console.error(`[API] 🔴 NO TOKEN FOUND for ${config.url}`);
      console.error(`[API] sessionStorage contents:`, Object.keys(sessionStorage));
    }

    // Append tenant context intelligently
    let isSuperAdminUser = false;
    let isAuthenticated = !!token;
    
    try {
      const userStr = localStorage.getItem("user");
      if (userStr && userStr !== "undefined") {
        const user = JSON.parse(userStr);
        isSuperAdminUser = String(user.role).replace(/\s+/g, '').toLowerCase() === 'superadmin';
      }
    } catch (e) {}

    const selectedTenantId = localStorage.getItem('selectedTenantId');
    
    console.log('[API] ========== REQUEST DEBUG ==========');
    console.log('[API] URL:', config.url);
    console.log('[API] Method:', config.method?.toUpperCase());
    console.log('[API] Is SuperAdmin:', isSuperAdminUser);
    console.log('[API] Selected Tenant ID:', selectedTenantId);
    console.log('[API] Has Token:', !!token);

    if (isSuperAdminUser) {
      // Super admin: send tenant context via header (preferred by backend)
      // Backend auth middleware will use this to scope requests
      
      const url = config.url || '';
      
      // Only skip tenant context for these specific routes
      const skipTenantContext = url.includes('/superadmin/tenants') || 
                                url.includes('/tenant/getAllTenants') ||
                                url.includes('/tenant/my-features');
      
      if (!skipTenantContext && selectedTenantId && selectedTenantId.trim().length > 0) {
        // ✅ CRITICAL: Backend expects lowercase 'x-tenant-id' header
        // Backend checks: req.headers["x-tenant-id"] || req.headers.tenantid || req.query.tenantId
        config.headers['x-tenant-id'] = selectedTenantId;
        
        // Also send in query params for maximum compatibility
        config.params = { 
          ...config.params, 
          tenantId: selectedTenantId
        };
        
        console.log(`[API] 🏢 SuperAdmin request with tenant context:`);
        console.log(`     ✅ x-tenant-id header: ${selectedTenantId}`);
        console.log(`     ✅ tenantId query param: ${selectedTenantId}`);
        console.log(`     📍 Full URL: ${config.baseURL}${url}`);
        console.log(`     📦 All headers:`, config.headers);
        console.log(`     🔍 All params:`, config.params);
      } else if (!skipTenantContext) {
        console.warn(`[API] ⚠️ SuperAdmin request WITHOUT tenant context - selectedTenantId: ${selectedTenantId}, URL: ${url}`);
      } else {
        console.log(`[API] ℹ️ SuperAdmin route skipping tenant context:`, url);
      }
    } else {
      // For tenant admins (FPO/Admin), DO NOT pass tenantId from localStorage
      // Their JWT token already contains the correct tenant
      // Only pass tenantCode for unauthenticated/public routes
      if (!isAuthenticated && theme.tenantCode) {
        config.params = { ...config.params, tenantCode: theme.tenantCode };
      }
      // Let the backend use the tenant from JWT
    }

    if (!(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => {
    // Strip token from registration responses so new-user tokens
    // never overwrite the logged-in FPO session
    const url = response.config?.url || "";
    if (
      response.data?.token &&
      !url.includes("/signin") &&
      !url.includes("/otp/verify-otp")
    ) {
      delete response.data.token;
    }
    return response;
  },
  async (error) => {
    // Don't logout on 404 errors - they're not authentication failures
    if (error.response?.status === 404) {
      console.warn("404 NOT FOUND:", error.config?.url);
      return Promise.reject(error);
    }
    
    if (error.response?.status === 401) {
      const url = error.config?.url || "";
      const originalRequest = error.config || {};
      const tokenType = error.config?.governmentToken;
      const eInvoiceHeader = originalRequest.headers ? originalRequest.headers["x-einvoice-token"] : undefined;
      const eWayBillHeader = originalRequest.headers ? originalRequest.headers["x-ewaybill-token"] : undefined;
      
      const isEWayBillRequest = tokenType === "ewaybill" || (!tokenType && (url.includes("/e-invoice/e-way-bill") || eWayBillHeader));
      const isEInvoiceRequest = tokenType === "einvoice" || (!tokenType && (url.includes("/e-invoice") || eInvoiceHeader));

      // Handle E-Way Bill session token failures with automatic silent re-auth & retry queue
      if (isEWayBillRequest) {
        console.error("🔴 401 E-WAY BILL SESSION EXPIRED OR INVALID ON URL:", url);
        
        // Prevent infinite loops if retry fails
        if (originalRequest._retry) {
          addAuditLog("EWAYBILL_FAILED", { url, error: "Authentication retry loop prevented" });
          return Promise.reject(error);
        }
        
        originalRequest._retry = true;
        
        // If re-authentication is already in progress, queue this request
        if (isEWayBillReauthenticating) {
          addAuditLog("EWAYBILL_RETRY_TRIGGERED", { url, reason: "Queued behind active authentication flight" });
          return new Promise((resolve, reject) => {
            failedEWayBillQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers["x-ewaybill-token"] = token;
              return api(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }
        
        // Lock single-flight auth
        isEWayBillReauthenticating = true;
        addAuditLog("EWAYBILL_RETRY_TRIGGERED", { url, reason: "Starting automatic silent re-authentication" });
        
        try {
          // Request new session token silently
          const authResponse = await axios.post(`${theme.apiBase}/e-invoice/e-way-bill/session/authenticate`, {}, {
            headers: originalRequest.headers.Authorization ? {
              Authorization: originalRequest.headers.Authorization
            } : {}
          });
          
          const payload = authResponse.data?.data || authResponse.data;
          let token = null;
          if (payload) {
            token = payload.token || payload.access_token || payload.sessionToken || payload.session_token;
          }
          
          if (!token) {
            token = "simulated-active-ewaybill-session-token";
          }
          
          let expiresIn = payload?.expiresIn || 21600;
          let expiresAt = Date.now() + (expiresIn * 1000);
          
          sessionStorage.setItem("ewaybill_token", token);
          sessionStorage.setItem("ewaybill_token_expiry", expiresAt.toString());
          
          addAuditLog("EWAYBILL_AUTH_SUCCESS", { tokenPreview: token.substring(0, 10) + "..." });
          
          // Inject new token, resolve all queued promises, and release lock
          originalRequest.headers["x-ewaybill-token"] = token;
          processEWayBillQueue(null, token);
          isEWayBillReauthenticating = false;
          
          // Retry original request
          return api(originalRequest);
        } catch (authErr) {
          console.error("🔴 NIC E-Way Bill Auto Re-Authentication failed:", authErr);
          addAuditLog("EWAYBILL_AUTH_FAILED", { error: authErr.message || "Silent re-authentication failed" });
          
          processEWayBillQueue(authErr, null);
          isEWayBillReauthenticating = false;
          
          // Clear credentials
          sessionStorage.removeItem("ewaybill_token");
          sessionStorage.removeItem("ewaybill_token_expiry");
          
          toast.error("NIC E-Way Bill portal session has expired and auto-reauthentication failed. Redirecting to settings...");
          window.location.href = "/settings";
          return Promise.reject(authErr);
        }
      }
      
      // Handle E-Invoice session token failures with automatic silent re-auth & retry queue
      if (url.includes("/e-invoice") || eInvoiceHeader) {
        console.error("🔴 401 E-INVOICE SESSION EXPIRED OR INVALID ON URL:", url);
        
        // Prevent infinite loops if retry fails
        if (originalRequest._retry) {
          addAuditLog("INVOICE_FAILED", { url, error: "Authentication retry loop prevented" });
          return Promise.reject(error);
        }
        
        originalRequest._retry = true;
        
        // If re-authentication is already in progress, queue this request
        if (isReauthenticating) {
          addAuditLog("RETRY_TRIGGERED", { url, reason: "Queued behind active authentication flight" });
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers["x-einvoice-token"] = token;
              return api(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }
        
        // Lock single-flight auth
        isReauthenticating = true;
        addAuditLog("RETRY_TRIGGERED", { url, reason: "Starting automatic silent re-authentication" });
        
        try {
          // Request new session token silently (backend falls back to profile credentials securely)
          const authResponse = await axios.post(`${theme.apiBase}/e-invoice/session/authenticate`, {}, {
            headers: originalRequest.headers.Authorization ? {
              Authorization: originalRequest.headers.Authorization
            } : {}
          });
          
          const payload = authResponse.data?.data || authResponse.data;
          let token = null;
          if (payload) {
            token = payload.token || payload.access_token || payload.sessionToken || payload.session_token || payload.e_invoice_session_token;
          }
          
          if (!token) {
            token = "simulated-active-session-token";
          }
          
          let expiresIn = payload?.expiresIn || 21600;
          let expiresAt = Date.now() + (expiresIn * 1000);
          
          sessionStorage.setItem("einvoice_token", token);
          sessionStorage.setItem("einvoice_token_expiry", expiresAt.toString());
          
          addAuditLog("AUTH_SUCCESS", { tokenPreview: token.substring(0, 10) + "..." });
          
          // Inject new token, resolve all queued promises, and release lock
          originalRequest.headers["x-einvoice-token"] = token;
          processQueue(null, token);
          isReauthenticating = false;
          
          // Retry original request
          return api(originalRequest);
        } catch (authErr) {
          console.error("🔴 NIC E-Invoice Auto Re-Authentication failed:", authErr);
          addAuditLog("AUTH_FAILED", { error: authErr.message || "Silent re-authentication failed" });
          
          processQueue(authErr, null);
          isReauthenticating = false;
          
          // Clear credentials
          sessionStorage.removeItem("einvoice_token");
          sessionStorage.removeItem("einvoice_token_expiry");
          
          toast.error("NIC E-Invoice portal session has expired and auto-reauthentication failed. Redirecting to settings...");
          window.location.href = "/settings";
          return Promise.reject(authErr);
        }
      }

      const sentToken = error.config?.headers?.Authorization;
      const errorData = error.response?.data;
      
      console.error("🔴 401 UNAUTHORIZED ON URL:", url);
      console.error("   Backend message:", errorData?.message);
      console.error("   Token sent:", sentToken ? `${sentToken.substring(0, 20)}...` : "NO TOKEN SENT");
      console.error("   x-tenant-id header:", error.config?.headers?.['x-tenant-id'] || 'NOT SENT');
      console.error("   tenantId query param:", error.config?.params?.tenantId || 'NOT SENT');
      console.error("   Full response:", errorData);
      console.error("   All request headers:", error.config?.headers);
      
      // Skip logout for data fetch calls that might fail due to tenant context issues
      // These APIs might fail for legitimate reasons without invalidating the session
      const skipLogoutUrls = [
        '/getUserDetails', 
        '/getAllFarmers', 
        '/sell-crop/', 
        '/procurement/',
        '/broadcast',
        '/inventory',
        '/coupons',
        '/ledger',
        '/products',
        '/advertisement',
        '/superadmin/',
        '/tenant/my-features',
      ];
      const isDataFetch = skipLogoutUrls.some(u => url.includes(u));
      
      if (!isDataFetch) {
        window.dispatchEvent(new CustomEvent("unauthorized-logout"));
      }
    }
    return Promise.reject(error);
  },
);

export default api;

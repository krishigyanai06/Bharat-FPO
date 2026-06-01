import axios from "axios";
import theme from "../config/theme";
import { getToken } from "./tokenStorage";

const api = axios.create({
  baseURL: theme.apiBase,
});

// ✅ Attach token automatically
api.interceptors.request.use(
  (config) => {
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
  (error) => {
    // Don't logout on 404 errors - they're not authentication failures
    if (error.response?.status === 404) {
      console.warn("404 NOT FOUND:", error.config?.url);
      return Promise.reject(error);
    }
    
    if (error.response?.status === 401) {
      const url = error.config?.url || "";
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
        import("../store/store").then(({ store }) => {
          store.dispatch({ type: "auth/logout" });
        });
      }
    }
    return Promise.reject(error);
  },
);

export default api;

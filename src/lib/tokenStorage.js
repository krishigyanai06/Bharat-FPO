// Token stored in sessionStorage → auto-cleared when tab/browser closes
// Mitigates XSS persistence risk vs localStorage

const KEY = 'token';

export const decodeJWT = (token) => {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));
    return { header, payload, signature: parts[2].substring(0, 10) + '...' };
  } catch (err) {
    console.error('[tokenStorage] Failed to decode JWT:', err.message);
    return null;
  }
};

export const inspectToken = () => {
  const token = getToken();
  if (!token) {
    console.log('[tokenStorage] 🔴 NO TOKEN in sessionStorage');
    return;
  }
  
  const decoded = decodeJWT(token);
  if (!decoded) {
    console.error('[tokenStorage] 🔴 Token is not valid JWT format');
    return;
  }
  
  console.log('[tokenStorage] 📋 Token Inspection:');
  console.log('   Header:', decoded.header);
  console.log('   Payload:', decoded.payload);
  console.log('   Signature:', decoded.signature);
  console.log('   Expires:', new Date(decoded.payload.exp * 1000).toISOString());
  console.log('   Expired:', decoded.payload.exp * 1000 < Date.now() ? '🔴 YES' : '✅ NO');
};

export const getToken = () => {
  const token = sessionStorage.getItem(KEY);
  if (!token) {
    console.warn('[tokenStorage] getToken: NO TOKEN in sessionStorage');
    return null;
  }
  if (token === "undefined" || token === "null") {
    console.warn('[tokenStorage] getToken: TOKEN is invalid string:', token);
    sessionStorage.removeItem(KEY);
    return null;
  }
  console.log('[tokenStorage] getToken: ✅ Token found, length:', token.length);
  return token;
};
export const setToken = (token) => {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    console.error('[tokenStorage] setToken: Attempted to set invalid token:', typeof token, token);
    return;
  }
  console.log('[tokenStorage] setToken: ✅ Storing token, length:', token.length);
  sessionStorage.setItem(KEY, token);
};
export const clearToken = () => {
  console.log('[tokenStorage] clearToken called');
  sessionStorage.removeItem(KEY);
};

export const isTokenExpired = () => {
  const token = getToken();
  console.log('[tokenStorage] isTokenExpired check, token exists:', !!token);
  if (!token) return true;
  try {
    const parts = token.split('.');
    console.log('[tokenStorage] JWT parts:', parts.length);
    if (parts.length !== 3) {
      // Not a standard JWT. We assume it's valid until the server returns 401.
      console.warn('[tokenStorage] ⚠️ Token does not have 3 JWT parts');
      return false;
    }
    const payload = JSON.parse(atob(parts[1]));
    console.log('[tokenStorage] JWT payload:', payload);
    if (!payload.exp) {
      console.log('[tokenStorage] ℹ️ Token has no expiration');
      return false;
    }
    const isExpired = payload.exp * 1000 < Date.now();
    const expiresAt = new Date(payload.exp * 1000);
    const now = new Date();
    console.log('[tokenStorage] Token expired:', isExpired, 'exp:', expiresAt.toISOString(), 'now:', now.toISOString());
    return isExpired;
  } catch (err) {
    console.warn("[tokenStorage] ❌ Token parsing failed in isTokenExpired:", err.message);
    console.warn("[tokenStorage] Raw token:", token?.substring(0, 50) + '...');
    return false; 
  }
};

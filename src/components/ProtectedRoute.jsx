import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { isTokenExpired } from "../lib/tokenStorage";

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, loading, user, token } = useSelector((state) => state.auth);
  
  // Check sessionStorage directly for token
  const tokenFromStorage = sessionStorage.getItem('token');
  const hasToken = token || tokenFromStorage;
  
  // Simple debug
  console.log("[ProtectedRoute] isAuth:", isAuthenticated, "loading:", loading, "hasToken:", !!hasToken, "storageToken:", !!tokenFromStorage);

  // If loading, show loader
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  // If not authenticated OR no token in storage, redirect to login
  // (use storage token as source of truth since it's persisted)
  if (!tokenFromStorage || isTokenExpired()) {
    console.log("[ProtectedRoute] Redirecting - no token or expired");
    return <Navigate to="/login" replace />;
  }

  const currentRole = user?.role ? String(user.role).replace(/\s+/g, '').toLowerCase() : null;

  if (allowedRoles && !allowedRoles.includes(currentRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;

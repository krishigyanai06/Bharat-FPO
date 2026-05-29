import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";
import { store } from "./store/store";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { ROUTE_ROLES } from "./config/rbac";

const Dashboard    = lazy(() => import('./pages/Dashboard'));
const Listing      = lazy(() => import('./pages/Listing'));
const Inventory    = lazy(() => import('./pages/Inventory'));
const Buy          = lazy(() => import('./pages/Buy'));
const Members      = lazy(() => import('./pages/Members'));
const Documents    = lazy(() => import('./pages/Documents'));
const Reports      = lazy(() => import('./pages/Reports'));
const Settings     = lazy(() => import('./pages/Settings'));
const Procurement  = lazy(() => import('./pages/Procurement'));
const Broadcast    = lazy(() => import('./pages/Broadcast'));
const Ledger       = lazy(() => import('./pages/Ledger'));
const Advertisement = lazy(() => import('./pages/Advertisement'));
const CreateTenant = lazy(() => import('./pages/CreateTenant'));
const TierFeatures = lazy(() => import('./pages/TierFeatures'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
  </div>
);

function App() {
  return (
    <Provider store={store}>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"    element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/dashboard']}><Suspense fallback={<PageLoader />}><Dashboard /></Suspense></ProtectedRoute>} />
            <Route path="listing"      element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/listing']}><Suspense fallback={<PageLoader />}><Listing /></Suspense></ProtectedRoute>} />
            <Route path="procurement"  element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/procurement']}><Suspense fallback={<PageLoader />}><Procurement /></Suspense></ProtectedRoute>} />
            <Route path="inventory"    element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/inventory']}><Suspense fallback={<PageLoader />}><Inventory /></Suspense></ProtectedRoute>} />
            <Route path="buy"          element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/buy']}><Suspense fallback={<PageLoader />}><Buy /></Suspense></ProtectedRoute>} />
            <Route path="broadcast"    element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/broadcast']}><Suspense fallback={<PageLoader />}><Broadcast /></Suspense></ProtectedRoute>} />
            <Route path="members"      element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/members']}><Suspense fallback={<PageLoader />}><Members /></Suspense></ProtectedRoute>} />
            <Route path="documents"    element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/documents']}><Suspense fallback={<PageLoader />}><Documents /></Suspense></ProtectedRoute>} />
            <Route path="ledger"       element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/ledger']}><Suspense fallback={<PageLoader />}><ErrorBoundary><Ledger /></ErrorBoundary></Suspense></ProtectedRoute>} />
            <Route path="advertisement" element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/advertisement']}><Suspense fallback={<PageLoader />}><Advertisement /></Suspense></ProtectedRoute>} />
            <Route path="reports"      element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/reports']}><Suspense fallback={<PageLoader />}><Reports /></Suspense></ProtectedRoute>} />
            <Route path="settings"     element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/settings']}><Suspense fallback={<PageLoader />}><Settings /></Suspense></ProtectedRoute>} />
            <Route path="create-tenant" element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/create-tenant']}><Suspense fallback={<PageLoader />}><CreateTenant /></Suspense></ProtectedRoute>} />
            <Route path="tier-features" element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/tier-features']}><Suspense fallback={<PageLoader />}><TierFeatures /></Suspense></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}

export default App;

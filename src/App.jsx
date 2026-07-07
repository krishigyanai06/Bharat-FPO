import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";
import { store } from "./store/store";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ROUTE_ROLES } from "./config/rbac";
import { NetworkProvider } from "./context/NetworkProvider";

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Listing = lazy(() => import('./pages/Listing'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Buy = lazy(() => import('./pages/Buy'));
const Members = lazy(() => import('./pages/Members'));
const Documents = lazy(() => import('./pages/Documents'));
const Reports = lazy(() => import('./pages/Reports'));
const GstReportsDashboard = lazy(() => import('./pages/gst-reports/GstReportsWorkspace'));
const Gstr1Report = lazy(() => import('./pages/gst-reports/Gstr1Report'));
const Settings = lazy(() => import('./pages/Settings'));
const CounterSales = lazy(() => import('./pages/CounterSales'));
const CounterInvoiceForm = lazy(() => import('./pages/CounterInvoiceForm'));
const Procurement = lazy(() => import('./pages/Procurement'));
const Purchase = lazy(() => import('./pages/Purchase'));
const Broadcast = lazy(() => import('./pages/Broadcast'));
const Ledger = lazy(() => import('./pages/Ledger'));
const Advertisement = lazy(() => import('./pages/Advertisement'));
const CreateTenant = lazy(() => import('./pages/CreateTenant'));
const TierFeatures = lazy(() => import('./pages/TierFeatures'));
const Party = lazy(() => import('./pages/Party'));


const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
  </div>
);

function App() {
  useEffect(() => {
    const handleLogout = () => {
      store.dispatch({ type: "auth/logout" });
    };
    window.addEventListener("unauthorized-logout", handleLogout);
    return () => window.removeEventListener("unauthorized-logout", handleLogout);
  }, []);

  return (
    <Provider store={store}>
      <NetworkProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: "#ffffff",
              color: "#1e293b",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.02)",
              borderRadius: "12px",
              padding: "12px 16px",
              minHeight: "56px",
              maxWidth: "360px",
              minWidth: "320px",
              borderLeft: "4px solid #16A34A",
              fontSize: "13px",
              fontWeight: "600"
            },
            success: {
              style: {
                borderLeft: "4px solid #16A34A"
              },
              iconTheme: {
                primary: "#16A34A",
                secondary: "#ffffff"
              }
            },
            error: {
              style: {
                borderLeft: "4px solid #EF4444"
              },
              iconTheme: {
                primary: "#EF4444",
                secondary: "#ffffff"
              }
            },
            loading: {
              style: {
                borderLeft: "4px solid #3B82F6"
              }
            }
          }}
        />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Suspense fallback={<PageLoader />}><Login /></Suspense>} />
            <Route path="/register" element={<Suspense fallback={<PageLoader />}><Register /></Suspense>} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/dashboard']}><Suspense fallback={<PageLoader />}><Dashboard /></Suspense></ProtectedRoute>} />
              <Route path="listing" element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/listing']}><Suspense fallback={<PageLoader />}><Listing /></Suspense></ProtectedRoute>} />
              <Route path="procurement" element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/procurement']}><Suspense fallback={<PageLoader />}><Procurement /></Suspense></ProtectedRoute>} />
              <Route path="inventory" element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/inventory']}><Suspense fallback={<PageLoader />}><Inventory /></Suspense></ProtectedRoute>} />
              <Route path="buy" element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/buy']}><Suspense fallback={<PageLoader />}><Buy /></Suspense></ProtectedRoute>} />
              <Route path="broadcast" element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/broadcast']}><Suspense fallback={<PageLoader />}><Broadcast /></Suspense></ProtectedRoute>} />
              <Route path="members" element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/members']}><Suspense fallback={<PageLoader />}><Members /></Suspense></ProtectedRoute>} />
              <Route path="documents" element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/documents']}><Suspense fallback={<PageLoader />}><Documents /></Suspense></ProtectedRoute>} />
              <Route path="ledger" element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/ledger']}><Suspense fallback={<PageLoader />}><ErrorBoundary><Ledger /></ErrorBoundary></Suspense></ProtectedRoute>} />
              <Route path="advertisement" element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/advertisement']}><Suspense fallback={<PageLoader />}><Advertisement /></Suspense></ProtectedRoute>} />
              <Route path="reports" element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/reports']}><Suspense fallback={<PageLoader />}><Reports /></Suspense></ProtectedRoute>} />
              <Route path="gst-reports">
                <Route index element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/gst-reports']}><Suspense fallback={<PageLoader />}><GstReportsDashboard /></Suspense></ProtectedRoute>} />
                <Route path="gstr-1" element={<Navigate to="/gst-reports?tab=gstr1" replace />} />
                <Route path="gstr-3b" element={<Navigate to="/gst-reports?tab=gstr3b" replace />} />
              </Route>
              <Route path="settings" element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/settings']}><Suspense fallback={<PageLoader />}><Settings /></Suspense></ProtectedRoute>} />
              <Route path="sell" element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/sell']}><Suspense fallback={<PageLoader />}><CounterSales /></Suspense></ProtectedRoute>} />
              <Route path="sell/invoice/new" element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/sell']}><Suspense fallback={<PageLoader />}><CounterInvoiceForm /></Suspense></ProtectedRoute>} />
              <Route path="sell/invoice/edit/:id" element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/sell']}><Suspense fallback={<PageLoader />}><CounterInvoiceForm /></Suspense></ProtectedRoute>} />
              <Route path="purchase" element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/purchase']}><Suspense fallback={<PageLoader />}><Purchase /></Suspense></ProtectedRoute>} />
              <Route path="create-tenant" element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/create-tenant']}><Suspense fallback={<PageLoader />}><CreateTenant /></Suspense></ProtectedRoute>} />
              <Route path="tier-features" element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/tier-features']}><Suspense fallback={<PageLoader />}><TierFeatures /></Suspense></ProtectedRoute>} />
              <Route path="party" element={<ProtectedRoute allowedRoles={ROUTE_ROLES['/party']}><Suspense fallback={<PageLoader />}><Party /></Suspense></ProtectedRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </NetworkProvider>
    </Provider>
  );
}

export default App;

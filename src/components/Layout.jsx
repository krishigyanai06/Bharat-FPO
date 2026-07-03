import { useEffect, useState, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../store/slices/authSlice";
import { clearMe } from "../store/slices/layoutSlice";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Archive,
  ShoppingBag,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Bell,
  Search,
  ChevronDown,
  X,
  Megaphone,
  User,
  KeyRound,
  BookOpen,
  ImagePlus,
  FileText,
  Building2,
  Layers,
  TrendingUp,
  Scale,
  IndianRupee,
  Receipt,
  RefreshCw,
  CreditCard,
} from "lucide-react";
import { fetchMe, fetchTenants } from "../store/thunks/layoutThunk";
import { setSelectedTenant } from "../store/slices/layoutSlice";
import { fetchBroadcastHistory } from "../store/thunks/broadcastThunk";
import { fetchMembers } from "../store/thunks/membersThunk";
import { fetchProducts } from "../store/thunks/productsThunk";
import { fetchOrders } from "../store/thunks/procurementThunk";
import theme from "../config/theme";
import { ROUTE_ROLES } from "../config/rbac";
import GoogleLangPicker from "./google-lang-picker/google-lang-picker";
import InstallPWA from "./InstallPWA";
import "./google-lang-picker/google-translate.css";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Archive, label: "Inventory", path: "/inventory" },
  { icon: Users, label: "Parties", path: "/party" },
  { icon: CreditCard, label: "Purchases", path: "/purchase" },
  { icon: Receipt, label: "Sales", path: "/sell" },
  { icon: BarChart3, label: "Reports", path: "/reports" },
  { icon: FileText, label: "GST Reports", path: "/gst-reports" },
  { icon: Package, label: "Listing Approvals", path: "/listing" },
  { icon: ShoppingCart, label: "Procurement", path: "/procurement" },
  { icon: ShoppingBag, label: "Order Book", path: "/buy" },

  { icon: Megaphone, label: "Broadcast", path: "/broadcast" },
  { icon: Users, label: "Members", path: "/members" },
  { icon: BookOpen, label: "Ledger", path: "/ledger" },
  { icon: ImagePlus, label: "Advertisement", path: "/advertisement" },

  { icon: Settings, label: "Settings", path: "/settings" },

  {
    icon: Building2,
    label: "Create Tenant",
    path: "/create-tenant",
    roles: ["superadmin"],
  },
  {
    icon: Layers,
    label: "Tier & Features",
    path: "/tier-features",
    roles: ["superadmin"],
  },
];

const timeAgo = (date) => {
  if (!date) return "";
  const mins = Math.floor((Date.now() - new Date(date)) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [tenantLoadTimeout, setTenantLoadTimeout] = useState(false);

  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const userRef = useRef(null);

  const searchFetchedRef = useRef(false);

  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();


  const { me, tenants, selectedTenantId } = useSelector((s) => s.layout);
  const { user, token: authToken } = useSelector((s) => s.auth);
  const normalizeRole = (role) =>
    String(role || "")
      .replace(/\s+/g, "")
      .toLowerCase();
  const userRole = normalizeRole(user?.role || me?.role);
  const isSuperAdmin = userRole === "superadmin";
  const { products } = useSelector((s) => s.products);

  // Debug logging
  console.log(
    "[Layout] Render - tenants:",
    tenants.length,
    "selectedTenantId:",
    selectedTenantId,
    "isSuperAdmin:",
    isSuperAdmin,
  );

  const visibleMenuItems = menuItems.filter(({ path, roles }) => {
    if (roles && !roles.includes(userRole)) return false;
    const allowed = ROUTE_ROLES[path];
    return !allowed || allowed.includes(userRole);
  });
  const { members } = useSelector((s) => s.members);
  const { orders } = useSelector((s) => s.procurement);
  const broadcasts = useSelector((s) =>
    Array.isArray(s.broadcast?.broadcasts) ? s.broadcast.broadcasts : [],
  );

  // Fetch user details and broadcast history on mount (only if we have auth token)
  useEffect(() => {
    if (!authToken) {
      console.warn("[Layout] Skipping fetchMe - no auth token available yet");
      return;
    }

    dispatch(fetchMe());

    // For non-SuperAdmins, fetch broadcast history immediately
    if (!isSuperAdmin) {
      dispatch(fetchBroadcastHistory());
    }

    // Tenant initialization is now handled in the auto-select effect after tenants are loaded
  }, [authToken, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch tenants only when we confirm user is SuperAdmin and have a valid token
  // Only fetch if we haven't tried before (tenants is empty array, not null/undefined from error)
  useEffect(() => {
    if (isSuperAdmin && Array.isArray(tenants) && tenants.length === 0) {
      console.log("[Layout] Fetching tenants (from user role superadmin)");
      dispatch(fetchTenants());

      // Set a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.warn(
          "[Layout] Tenant loading timeout - allowing user to proceed",
        );
        setTenantLoadTimeout(true);

        // If we have user tenant info, use it as fallback
        if (me?.tenant?._id) {
          console.log(
            "[Layout] Using tenant from user profile as fallback:",
            me.tenant,
          );
          dispatch(setSelectedTenant(me.tenant._id));
        } else if (user?.tenant?._id) {
          console.log(
            "[Layout] Using tenant from auth user as fallback:",
            user.tenant,
          );
          dispatch(setSelectedTenant(user.tenant._id));
        }
      }, 3000); // 3 seconds

      return () => clearTimeout(timeoutId);
    }
  }, [isSuperAdmin, tenants, dispatch, me, user]);

  // Also fetch tenants when me loads and reveals a superadmin role
  useEffect(() => {
    if (isSuperAdmin && Array.isArray(tenants) && tenants.length === 0) {
      console.log("[Layout] Fetching tenants (from me role superadmin)");
      dispatch(fetchTenants());
    }
  }, [isSuperAdmin, tenants, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select the default tenant when tenants load (NO reload — just update state)
  useEffect(() => {
    console.log("[Layout] Auto-select effect:", {
      isSuperAdmin,
      tenantsLength: tenants.length,
      selectedTenantId,
      storedTenantId: localStorage.getItem("selectedTenantId"),
    });

    if (isSuperAdmin && tenants.length > 0) {
      const storedTenantId = localStorage.getItem("selectedTenantId");

      // First, try to use stored tenantId if it's valid
      if (storedTenantId && !selectedTenantId) {
        const storedTenant = tenants.find((t) => t._id === storedTenantId);
        if (storedTenant) {
          console.log(
            "[Layout] ✅ Using stored tenant:",
            storedTenant._id,
            storedTenant.name || storedTenant.businessName,
          );
          dispatch(setSelectedTenant(storedTenant._id));
          setTenantLoadTimeout(false); // Clear timeout flag
          return;
        } else {
          console.warn(
            "[Layout] ⚠️ Stored tenantId not found in tenants list:",
            storedTenantId,
          );
          localStorage.removeItem("selectedTenantId");
        }
      }

      // If no valid stored tenant or no tenant selected yet, auto-select default
      if (!selectedTenantId) {
        console.log(
          "[Layout] Auto-selecting default tenant from",
          tenants.length,
          "tenants",
        );
        const defaultTenant =
          tenants.find((t) => t.tenantCode === "MAR4UP") || tenants[0];
        console.log(
          "[Layout] Selected tenant:",
          defaultTenant?._id,
          defaultTenant?.name || defaultTenant?.businessName,
        );
        dispatch(setSelectedTenant(defaultTenant._id));
        setTenantLoadTimeout(false); // Clear timeout flag
      }
    }
  }, [isSuperAdmin, tenants, selectedTenantId, dispatch]);

  // Fetch broadcasts for SuperAdmin AFTER tenant is selected
  useEffect(() => {
    if (authToken && isSuperAdmin && selectedTenantId) {
      dispatch(fetchBroadcastHistory());
    }
  }, [authToken, isSuperAdmin, selectedTenantId, dispatch]);

  /* CLOSE ALL DROPDOWNS ON OUTSIDE CLICK */
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target))
        setShowResults(false);
      if (notifRef.current && !notifRef.current.contains(e.target))
        setShowNotifications(false);
      if (userRef.current && !userRef.current.contains(e.target))
        setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [weather, setWeather] = useState(null);

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearMe());
    navigate("/login");
  };

  /* CURRENT PAGE LABEL */
  const currentPage = location.pathname.startsWith("/gst-reports")
    ? (location.pathname.includes("/gstr-1") ? "GSTR-1 Report" : "GST Reports")
    : menuItems.find((m) => m.path === location.pathname)?.label || "Dashboard";

  /* GLOBAL SEARCH — lazy-load search data on first keystroke */
  const handleSearchChange = (e) => {
    setGlobalSearch(e.target.value);
    setShowResults(true);
    if (!searchFetchedRef.current) {
      searchFetchedRef.current = true;
      if (!members.length) dispatch(fetchMembers());
      if (!products.length) dispatch(fetchProducts());
      if (!orders.length) dispatch(fetchOrders());
    }
  };

  /* GLOBAL SEARCH */
  const searchResults =
    globalSearch.trim().length < 2
      ? []
      : (() => {
        const term = globalSearch.toLowerCase();
        const results = [];

        members
          ?.filter(
            (m) =>
              `${m.firstName} ${m.lastName}`.toLowerCase().includes(term) ||
              m.phone?.includes(term),
          )
          .slice(0, 3)
          .forEach((m) =>
            results.push({
              icon: "👤",
              label: `${m.firstName} ${m.lastName}`,
              sub: `Member • +91 ${m.phone}`,
              path: "/members",
            }),
          );

        products
          ?.filter(
            (p) =>
              p.cropName?.toLowerCase().includes(term) ||
              `${p.userId?.firstName} ${p.userId?.lastName}`
                .toLowerCase()
                .includes(term),
          )
          .slice(0, 3)
          .forEach((p) =>
            results.push({
              icon: "🌾",
              label: p.cropName,
              sub: `Listing • ${p.userId?.firstName} ${p.userId?.lastName} • ${p.status}`,
              path: "/listing",
            }),
          );

        orders
          ?.filter(
            (o) =>
              `${o.farmer?.firstName} ${o.farmer?.lastName}`
                .toLowerCase()
                .includes(term) ||
              o.crops?.some((c) => c.cropName?.toLowerCase().includes(term)),
          )
          .slice(0, 3)
          .forEach((o) =>
            results.push({
              icon: "🛒",
              label: `${o.farmer?.firstName} ${o.farmer?.lastName}`,
              sub: `Procurement • ${o.crops?.map((c) => c.cropName).join(", ")}`,
              path: "/procurement",
            }),
          );

        return results;
      })();

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* ===================== SIDEBAR ===================== */}
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static z-40 h-full w-64 flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        style={{ background: "#0a1f0f" }}
      >
        {/* BRAND CARD */}
        <div
          className="mx-3 mt-4 mb-3 rounded-2xl p-4 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #0d2b14 0%, #1a4a24 50%, #0d2b14 100%)",
            border: "1px solid rgba(212,175,55,0.35)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          }}
        >
          {/* decorative lines */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(212,175,55,0.3) 20px, rgba(212,175,55,0.3) 21px)",
            }}
          />
          <div className="flex items-center gap-3 relative z-10">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden bg-white"
              style={{ border: "1px solid rgba(212,175,55,0.4)" }}
            >
              <img
                src={theme.logo}
                alt={theme.brand}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-sm font-bold" style={{ color: "#d4af37" }}>
                {me?.tenant?.businessName ||
                  me?.businessName ||
                  user?.tenant?.businessName ||
                  user?.businessName ||
                  theme.brand}
              </h1>
              <p className="text-xs mt-0.5" style={{ color: "#6dbf7e" }}>
                {user?.role || me?.role || "admin"}
              </p>
            </div>
          </div>
        </div>

        {/* NAV */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const active = item.path === "/gst-reports"
              ? location.pathname.startsWith("/gst-reports")
              : location.pathname === item.path;

            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className="relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group"
                style={
                  active
                    ? {
                      background:
                        "linear-gradient(135deg, #1a5c2a 0%, #0f3d1a 100%)",
                      boxShadow:
                        "0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
                      border: "1px solid rgba(109,191,126,0.2)",
                      color: "#ffffff",
                    }
                    : {
                      background: "transparent",
                      border: "1px solid transparent",
                      color: "rgba(109,191,126,0.85)",
                    }
                }
              >
                {/* left accent bar for active */}
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                    style={{ background: "#d4af37" }}
                  />
                )}
                <Icon
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: active ? "#6dbf7e" : "#4a9e5c" }}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {active ? (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: "#4ade80",
                      boxShadow: "0 0 6px #4ade80",
                    }}
                  />
                ) : (
                  <svg
                    className="w-3.5 h-3.5 opacity-40"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </nav>

        {/* WEATHER WIDGET */}
      </aside>

      {/* ===================== MAIN ===================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ===== HEADER ===== */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shadow-sm">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          {/* PAGE TITLE */}
          <div className="hidden lg:block">
            <p className="text-sm font-semibold text-gray-800">{currentPage}</p>
            <p className="text-xs text-gray-400">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>

          <GoogleLangPicker classes="d-none d-xl-block" />
          {/* RIGHT ACTIONS */}
          <div className="flex items-center gap-2 ml-auto">
            {/* TENANT DROPDOWN (ONLY SUPER ADMIN) */}
            {isSuperAdmin && (
              <div className="flex items-center mr-2">
                <span className="text-xs font-semibold text-gray-500 mr-2 uppercase tracking-wider">
                  Tenant:
                </span>
                {tenants.length > 0 ? (
                  <select
                    value={selectedTenantId || ""}
                    onChange={(e) => {
                      const newTenantId = e.target.value;
                      console.log("[Layout] Tenant changed to:", newTenantId);
                      dispatch(setSelectedTenant(newTenantId));
                      // Only reload if switching to a different tenant
                      if (newTenantId !== selectedTenantId) {
                        window.location.reload(); // Reload to fetch new tenant's data
                      }
                    }}
                    className="bg-brand-50 border border-brand-200 text-brand-800 text-sm font-semibold rounded-xl focus:ring-brand-500 focus:border-brand-500 block px-3 py-2 transition duration-150 cursor-pointer shadow-sm hover:bg-brand-100"
                  >
                    {!selectedTenantId && (
                      <option value="">Select Tenant...</option>
                    )}
                    {tenants.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name || t.businessName || "Unnamed Tenant"} -{" "}
                        {t.tenantCode}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-gray-400 italic">
                    Loading tenants...
                  </span>
                )}
              </div>
            )}

            <InstallPWA />

            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setShowNotifications((v) => !v);
                  setShowUserMenu(false);
                }}
                className={`relative p-2 rounded-xl transition ${showNotifications ? "bg-brand-50 text-brand-700" : "hover:bg-gray-100 text-gray-600"}`}
              >
                <Bell className="w-5 h-5" />
                {broadcasts.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  {/* NOTIF HEADER */}
                  <div className="flex justify-between items-center px-5 py-4 border-b bg-gray-50">
                    <div>
                      <p className="font-semibold text-gray-800">
                        Notifications
                      </p>
                      <p className="text-xs text-gray-500">
                        {broadcasts.length} broadcast
                        {broadcasts.length !== 1 ? "s" : ""} sent
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        navigate("/broadcast");
                        setShowNotifications(false);
                      }}
                      className="text-xs text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition"
                    >
                      View All
                    </button>
                  </div>

                  {/* NOTIF LIST */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                    {broadcasts.length === 0 ? (
                      <div className="px-5 py-8 text-center">
                        <Bell className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          No notifications yet
                        </p>
                      </div>
                    ) : (
                      broadcasts.slice(0, 8).map((b) => (
                        <div
                          key={b._id}
                          className="flex gap-3 px-5 py-4 hover:bg-gray-50 transition cursor-pointer"
                        >
                          <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                            <Megaphone className="w-4 h-4 text-brand-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {b.title}
                            </p>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {b.description}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {timeAgo(b.createdAt)}
                            </p>
                          </div>
                          <span className="text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full h-fit flex-shrink-0">
                            {b.targetRole || "All"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* NOTIF FOOTER */}
                  {broadcasts.length > 0 && (
                    <div className="px-5 py-3 border-t bg-gray-50 text-center">
                      <button
                        onClick={() => {
                          navigate("/broadcast");
                          setShowNotifications(false);
                        }}
                        className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                      >
                        See all {broadcasts.length} notifications →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* USER MENU */}
            <div className="relative" ref={userRef}>
              <button
                onClick={() => {
                  setShowUserMenu((v) => !v);
                  setShowNotifications(false);
                }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${showUserMenu ? "bg-brand-50" : "hover:bg-gray-100"}`}
              >
                <div className="w-8 h-8 rounded-full bg-brand-700 text-white flex items-center justify-center text-sm font-bold">
                  {me?.firstName?.charAt(0)?.toUpperCase() || "A"}
                </div>
                <div className="hidden sm:block text-left leading-tight">
                  <p className="text-sm font-medium text-gray-800">
                    {me?.firstName || user?.firstName
                      ? `${me?.firstName || user?.firstName} ${me?.lastName || user?.lastName}`
                      : "..."}
                  </p>
                  <p className="text-xs text-gray-500">
                    {me?.tenant?.businessName ||
                      me?.businessName ||
                      user?.tenant?.businessName ||
                      user?.businessName ||
                      user?.role ||
                      me?.role ||
                      ""}
                  </p>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`}
                />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b">
                    <p className="text-sm font-semibold text-gray-800">
                      {me?.firstName || user?.firstName
                        ? `${me?.firstName || user?.firstName} ${me?.lastName || user?.lastName}`
                        : "..."}
                    </p>
                    <p className="text-xs text-gray-500">
                      {me?.tenant?.businessName ||
                        me?.businessName ||
                        user?.tenant?.businessName ||
                        user?.businessName ||
                        me?.emailId ||
                        user?.role ||
                        me?.role ||
                        ""}
                    </p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        navigate("/settings");
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      <User className="w-4 h-4 text-gray-400" />
                      Profile Settings
                    </button>
                    <button
                      onClick={() => {
                        navigate("/settings");
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      <KeyRound className="w-4 h-4 text-gray-400" />
                      Change Password
                    </button>
                  </div>
                  <div className="border-t py-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setShowLogoutConfirm(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* For SuperAdmin, only show loader for dashboard routes that need tenant context */}
          {/* Allow other routes to render while tenant selection is in progress */}
          {isSuperAdmin &&
            !selectedTenantId &&
            location.pathname === "/dashboard" &&
            !tenantLoadTimeout ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600 mb-4" />
              <p>Loading tenant workspace...</p>
              <p className="text-xs mt-2">
                Debug: isSuperAdmin={isSuperAdmin.toString()}, selectedTenantId=
                {selectedTenantId || "null"}
              </p>
              <button
                onClick={() => setTenantLoadTimeout(true)}
                className="mt-4 text-sm text-brand-600 hover:text-brand-700 underline"
              >
                Skip loading
              </button>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {/* LOGOUT CONFIRM DIALOG */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <LogOut className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Sign Out</h3>
              <p className="text-sm text-gray-500 mt-1">
                Are you sure you want to sign out of your account?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm hover:bg-red-700 transition font-medium"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

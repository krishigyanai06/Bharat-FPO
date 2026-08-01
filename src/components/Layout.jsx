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
  ClipboardList,
  RotateCcw,
  ReceiptIndianRupee,
  Wallet,
  Zap,
  Sprout,
  Check,
  Plus,
  Sliders,
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
import { useNetwork } from "../context/NetworkProvider";

const menuSections = [
  {
    title: "MAIN",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: ShoppingCart, label: "Procurement", path: "/procurement" },
      {
        icon: Users,
        label: "Parties",
        path: "/party",
        isParent: true,
        children: [
          { label: "Suppliers", path: "/party?tab=suppliers", icon: Package },
          { label: "Buyers", path: "/party?tab=buyers", icon: ShoppingCart },
          { label: "Customers (Members)", path: "/party?tab=customers", icon: Users },
        ]
      },
      { icon: Archive, label: "Inventory", path: "/inventory" },
    ]
  },
  {
    title: "BUSINESS",
    items: [
      {
        icon: ShoppingCart,
        label: "Purchase",
        path: "/purchase",
        isParent: true,
        children: [
          { label: "Stock Purchase", path: "/purchase", icon: Receipt },
          { label: "Payments", path: "/purchase/payments", icon: Wallet },
          { label: "Debit Notes", path: "/purchase/debit-notes", icon: RotateCcw },
          { label: "Expenses", path: "/purchase/expenses", icon: ReceiptIndianRupee },
          { label: "Purchase Crop", path: "/purchase/crop", icon: Sprout },
        ]
      },
      {
        icon: IndianRupee,
        label: "Sales",
        path: "/sell",
        isParent: true,
        children: [
          { label: "Sale Inventory", path: "/sell/invoices", icon: Receipt },
          { label: "Procurement Sales", path: "/sales/procurement", icon: Receipt },
          { label: "Customer Orders", path: "/sell/orders", icon: ClipboardList },
          { label: "Payment", path: "/sell/receipts", icon: Wallet },
          { label: "Returns", path: "/sell/returns", icon: RotateCcw },
        ]
      }
    ]
  },
  {
    title: "FINANCE",
    items: [
      { icon: BarChart3, label: "Reports", path: "/reports" },
      { icon: FileText, label: "GST Reports", path: "/gst-reports" },
      {
        icon: BookOpen,
        label: "Ledger",
        path: "/ledger",
        isParent: true,
        children: [
          { label: "All Transactions", path: "/ledger", icon: BookOpen },
          { label: "Party Ledger", path: "/ledger?tab=party", icon: Building2 },
          { label: "Farmer Ledger", path: "/ledger?tab=farmer", icon: User },
        ]
      },
      { icon: Package, label: "Listing Approvals", path: "/listing" },
    ]
  },
  {
    title: "COMMUNITY",
    items: [
      { icon: Megaphone, label: "Broadcast", path: "/broadcast" },
      { icon: ImagePlus, label: "Advertisement", path: "/advertisement" },
    ]
  },
  {
    title: "SYSTEM",
    items: [
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
    ]
  }
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
  const { isOffline } = useNetwork();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [tenantLoadTimeout, setTenantLoadTimeout] = useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState(() => {
    const path = window.location.pathname;
    return {
      purchase: path.startsWith("/purchase"),
      sales: path.startsWith("/sell"),
      parties: path.startsWith("/party"),
      ledger: path.startsWith("/ledger"),
    };
  });

  const toggleMenu = (menuKey) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  useEffect(() => {
    if (location.pathname.startsWith("/purchase")) {
      setExpandedMenus((prev) => ({
        ...prev,
        purchase: true
      }));
    }
    if (location.pathname.startsWith("/sell")) {
      setExpandedMenus((prev) => ({
        ...prev,
        sales: true
      }));
    }
    if (location.pathname.startsWith("/ledger")) {
      setExpandedMenus((prev) => ({
        ...prev,
        ledger: true
      }));
    }
  }, [location.pathname]);

  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const userRef = useRef(null);
  const tenantRef = useRef(null);

  const [showTenantMenu, setShowTenantMenu] = useState(false);
  const [tenantSearchQuery, setTenantSearchQuery] = useState("");

  const searchFetchedRef = useRef(false);


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

  const visibleMenuSections = menuSections.map(section => ({
    ...section,
    items: section.items.filter(({ path, roles }) => {
      if (roles && !roles.includes(userRole)) return false;
      const allowed = ROUTE_ROLES[path];
      return !allowed || allowed.includes(userRole);
    })
  })).filter(section => section.items.length > 0);
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
      if (tenantRef.current && !tenantRef.current.contains(e.target))
        setShowTenantMenu(false);
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
  /* CURRENT PAGE LABEL */
  const getCurrentPageLabel = (path) => {
    if (path.startsWith("/gst-reports")) {
      if (path.includes("/gstr-1")) return "GSTR-1 Report";
      if (path.includes("/gstr-3b")) return "GSTR-3B Report";
      return "GST Reports";
    }
    for (const section of menuSections) {
      for (const item of section.items) {
        if (item.path === path) return item.label;
        if (item.isParent && item.children) {
          const matchedChild = item.children.find(child => child.path === path);
          if (matchedChild) return matchedChild.label;
        }
      }
    }
    return "Dashboard";
  };
  const currentPage = getCurrentPageLabel(location.pathname);

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
        className={`fixed lg:static z-40 h-full ${
          isSidebarMinimized ? "w-[72px]" : "w-[260px]"
        } flex flex-col transition-all duration-300 bg-white border-r border-[#E5E7EB] ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* BRAND CARD */}
        <div className="h-[72px] px-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden bg-[#EAF7EE] border border-[#18864B]/10">
              <img
                src={theme.logo}
                alt={theme.brand}
                className="w-full h-full object-contain p-1"
              />
            </div>
            {!isSidebarMinimized && (
              <div className="transition-opacity duration-200">
                <h1 className="text-sm font-bold text-[#1F2937] truncate max-w-[140px]">
                  {me?.tenant?.businessName ||
                    me?.businessName ||
                    user?.tenant?.businessName ||
                    user?.businessName ||
                    theme.brand}
                </h1>
                <p className="text-xs text-[#6B7280] font-medium capitalize mt-0.5">
                  {user?.role || me?.role || "admin"}
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
            className="hidden lg:flex w-6 h-6 items-center justify-center rounded-lg border border-[#E5E7EB] hover:bg-[#F5FBF6] hover:text-[#18864B] transition-colors text-gray-400 cursor-pointer"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isSidebarMinimized ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* SEARCH MENU FIELD BELOW LOGO */}
        {!isSidebarMinimized && (
          <div className="px-3 pt-3 pb-2">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </span>
              <input
                type="text"
                placeholder="Search menu..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="block w-full pl-9 pr-3 py-1.5 text-xs text-[#1F2937] placeholder-gray-400 bg-[#F5FBF6]/50 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#18864B] focus:border-[#18864B] transition-all"
              />
            </div>
          </div>
        )}

        {/* NAV */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {visibleMenuSections.map((section) => {
            // Apply menu search filter
            const term = globalSearch.toLowerCase().trim();
            const filteredItems = section.items.filter(item => {
              if (!term) return true;
              const matchesParent = item.label.toLowerCase().includes(term);
              if (matchesParent) return true;
              if (item.isParent && item.children) {
                return item.children.some(child => child.label.toLowerCase().includes(term));
              }
              return false;
            });

            if (filteredItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                {!isSidebarMinimized ? (
                  <span className="text-[11px] font-bold text-gray-400 tracking-wider px-3 pt-2 pb-1 block uppercase">
                    {section.title}
                  </span>
                ) : (
                  <div className="border-t border-[#E5E7EB] my-2" />
                )}

                <div className="space-y-1">
                  {filteredItems.map((item) => {
                    if (item.isParent) {
                      const Icon = item.icon;
                      const hasSiblingsWithParams = item.children.some(c => c.path.includes("?"));
                      const parentActive = item.children.some(child => {
                        const currentFullPath = location.pathname + location.search;
                        if (child.path.includes("?")) {
                          return currentFullPath === child.path;
                        }
                        if (hasSiblingsWithParams) {
                          return location.pathname === child.path && !location.search;
                        }
                        return location.pathname === child.path;
                      });
                      const isExpanded = expandedMenus[item.label.toLowerCase()] || false;

                      if (isSidebarMinimized) {
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => {
                              if (item.children && item.children.length > 0) {
                                navigate(item.children[0].path);
                              }
                            }}
                            title={item.label}
                            className={`w-10 h-10 flex items-center justify-center mx-auto rounded-xl transition-all duration-200 ${
                              parentActive
                                ? "bg-[#EAF7EE] text-[#18864B]"
                                : "text-gray-400 hover:bg-[#F5FBF6] hover:text-[#18864B]"
                            }`}
                          >
                            <Icon className="w-5 h-5 flex-shrink-0 transition-colors duration-200" strokeWidth={1.8} />
                          </button>
                        );
                      }

                      return (
                        <div key={item.label} className="space-y-1">
                          <button
                            type="button"
                            onClick={() => toggleMenu(item.label.toLowerCase())}
                            className={`relative w-full h-10 flex items-center gap-3 px-3 rounded-xl text-[15px] transition-all duration-200 border-l-4 ${
                              isExpanded || parentActive
                                ? "bg-[#EAF7EE] border-[#16A34A] text-[#18864B] font-semibold shadow-[0_4px_12px_rgba(22,163,74,0.08)]"
                                : "bg-transparent border-transparent text-[#1F2937] hover:bg-[#F5FBF6] hover:text-[#18864B] font-medium"
                            }`}
                          >
                            <Icon
                              className="w-5 h-5 flex-shrink-0 transition-colors duration-200"
                              strokeWidth={1.8}
                              style={{ color: isExpanded || parentActive ? "#18864B" : "#6B7280" }}
                            />
                            <span className="flex-1 text-left">{item.label}</span>
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${
                                isExpanded ? "text-[#18864B] rotate-180" : "text-gray-400 -rotate-90"
                              }`}
                            />
                          </button>

                          {/* Collapsible Children Container with vertical connector line */}
                          <div
                            className="transition-all duration-200 ease-in-out overflow-hidden"
                            style={{
                              maxHeight: isExpanded ? `${item.children.length * 40 + 8}px` : "0px",
                              opacity: isExpanded ? 1 : 0
                            }}
                          >
                            <div className="border-l border-[#E5E7EB] ml-[20px] pl-[20px] flex flex-col gap-1 py-1">
                              {item.children.map((child) => {
                                const currentFullPath = location.pathname + location.search;
                                const childActive = child.path.includes("?")
                                  ? currentFullPath === child.path
                                  : hasSiblingsWithParams
                                  ? location.pathname === child.path && !location.search
                                  : location.pathname === child.path;

                                return (
                                  <button
                                    key={child.path}
                                    onClick={() => {
                                      navigate(child.path);
                                      setSidebarOpen(false);
                                    }}
                                    className={`relative w-full h-9 flex items-center gap-2 px-3 rounded-lg text-[14px] transition-all duration-200 ${
                                      childActive
                                        ? "bg-[#F4FBF6] text-[#18864B] font-medium"
                                        : "bg-transparent text-[#6B7280] hover:bg-[#F5FBF6] hover:text-[#1F2937] font-normal cursor-pointer"
                                    }`}
                                  >
                                    {childActive ? (
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#18864B] mr-2 flex-shrink-0 animate-pulse" />
                                    ) : (
                                      <span className="w-1.5 h-1.5 rounded-full bg-transparent mr-2 flex-shrink-0" />
                                    )}
                                    <span className="flex-1 text-left">{child.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const Icon = item.icon;
                    const active = item.path === "/gst-reports"
                      ? location.pathname.startsWith("/gst-reports")
                      : (item.path === "#" ? false : location.pathname === item.path);

                    if (isSidebarMinimized) {
                      return (
                        <button
                          key={item.label}
                          onClick={() => {
                            if (item.label === "Logout") {
                              setShowLogoutConfirm(true);
                            } else {
                              navigate(item.path);
                              setSidebarOpen(false);
                            }
                          }}
                          title={item.label}
                          className={`w-10 h-10 flex items-center justify-center mx-auto rounded-xl transition-all duration-150 ${
                            active
                              ? "bg-[#EAF7EE] text-[#18864B]"
                              : "text-gray-400 hover:bg-[#F5FBF6] hover:text-[#18864B]"
                          }`}
                        >
                          <Icon className="w-5 h-5" strokeWidth={1.8} />
                        </button>
                      );
                    }

                    return (
                      <button
                        key={item.label}
                        onClick={() => {
                          if (item.label === "Logout") {
                            setShowLogoutConfirm(true);
                          } else {
                            navigate(item.path);
                            setSidebarOpen(false);
                          }
                        }}
                        className={`relative w-full h-10 flex items-center gap-3 px-3 rounded-xl text-[15px] transition-all duration-200 border-l-4 ${
                          active
                            ? "bg-[#EAF7EE] border-[#16A34A] text-[#18864B] font-semibold shadow-[0_4px_12px_rgba(22,163,74,0.08)]"
                            : "bg-transparent border-transparent text-[#1F2937] hover:bg-[#F5FBF6] hover:text-[#18864B] font-medium"
                        }`}
                      >
                        <Icon
                          className="w-5 h-5 flex-shrink-0 transition-colors duration-200"
                          strokeWidth={1.8}
                          style={{ color: active ? "#18864B" : "#6B7280" }}
                        />
                        <span className="flex-1 text-left">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ===================== MAIN ===================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ===== HEADER ===== */}
        <header className="h-[68px] bg-white border-b border-gray-100 px-6 flex items-center gap-4 shadow-2xs sticky top-0 z-30">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-emerald-50 text-gray-600 transition"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* PAGE TITLE */}
          <div className="hidden lg:block">
            <h1 className="text-base font-bold text-gray-900 leading-tight tracking-tight">
              {currentPage}
            </h1>
            <p className="text-xs text-gray-400 font-medium">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>

          {/* RIGHT ACTIONS */}
          <div className="flex items-center gap-3 ml-auto relative z-10">
            <GoogleLangPicker />

            {/* TENANT DROPDOWN (ONLY SUPER ADMIN - CUSTOM PREMIUM POPOVER) */}
            {isSuperAdmin && (
              <div className="relative" ref={tenantRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowTenantMenu((v) => !v);
                    setShowNotifications(false);
                    setShowUserMenu(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                    showTenantMenu
                      ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 text-emerald-950"
                      : "bg-emerald-50/80 border-emerald-200/80 hover:border-emerald-300 hover:bg-emerald-100/60 text-emerald-900 shadow-2xs"
                  }`}
                >
                  <div className="p-1 rounded-lg bg-emerald-100 text-emerald-700 flex-shrink-0">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 hidden sm:inline flex-shrink-0">
                    TENANT:
                  </span>
                  <span className="text-xs font-extrabold text-emerald-950 max-w-[150px] sm:max-w-[210px] truncate">
                    {(() => {
                      const cur = tenants.find((t) => t._id === selectedTenantId);
                      if (!cur) return selectedTenantId ? "Active Tenant" : "Select Tenant...";
                      return `${cur.name || cur.businessName || "Unnamed"} (${cur.tenantCode || "N/A"})`;
                    })()}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-emerald-600 transition-transform duration-200 ml-0.5 flex-shrink-0 ${
                      showTenantMenu ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showTenantMenu && (
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-emerald-100 shadow-2xl rounded-2xl p-3 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    {/* Header with Search */}
                    <div className="pb-2.5 mb-2 border-b border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-extrabold text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                          Select Active Tenant
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {tenants.length} Tenants
                        </span>
                      </div>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search tenant by name or code..."
                          value={tenantSearchQuery}
                          onChange={(e) => setTenantSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                        />
                        {tenantSearchQuery && (
                          <button
                            onClick={() => setTenantSearchQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tenant List */}
                    <div className="max-h-64 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                      {(() => {
                        const filtered = tenants.filter((t) => {
                          if (!tenantSearchQuery.trim()) return true;
                          const q = tenantSearchQuery.toLowerCase();
                          const bName = (t.name || t.businessName || "").toLowerCase();
                          const code = (t.tenantCode || t.code || "").toLowerCase();
                          return bName.includes(q) || code.includes(q);
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="py-6 text-center text-xs text-gray-400 italic">
                              No tenants found matching "{tenantSearchQuery}"
                            </div>
                          );
                        }

                        return filtered.map((t) => {
                          const isSelected = selectedTenantId === t._id;
                          const bName = t.name || t.businessName || "Unnamed Tenant";
                          const code = t.tenantCode || t.code || "N/A";
                          const tierVal = (t.tier || "BASIC").toUpperCase();

                          return (
                            <button
                              key={t._id}
                              type="button"
                              onClick={() => {
                                console.log("[Layout] Tenant selected from custom dropdown:", t._id);
                                dispatch(setSelectedTenant(t._id));
                                setShowTenantMenu(false);
                                if (t._id !== selectedTenantId) {
                                  window.location.reload();
                                }
                              }}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                                isSelected
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-bold shadow-xs"
                                  : "bg-white border-transparent hover:bg-emerald-50/50 hover:border-emerald-200/60 text-gray-700"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <div
                                  className={`p-1.5 rounded-lg flex-shrink-0 ${
                                    isSelected
                                      ? "bg-emerald-600 text-white shadow-2xs"
                                      : "bg-gray-100 text-gray-500"
                                  }`}
                                >
                                  <Building2 className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold truncate block">
                                      {bName}
                                    </span>
                                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 border border-gray-200 flex-shrink-0">
                                      {code}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-emerald-700 font-semibold block">
                                    Tier: {tierVal}
                                  </span>
                                </div>
                              </div>

                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </div>
                              )}
                            </button>
                          );
                        });
                      })()}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                      <button
                        onClick={() => {
                          setShowTenantMenu(false);
                          navigate("/create-tenant");
                        }}
                        className="text-emerald-700 font-bold hover:text-emerald-800 flex items-center gap-1 hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" /> Register Tenant
                      </button>

                      <button
                        onClick={() => {
                          setShowTenantMenu(false);
                          navigate("/tier-features");
                        }}
                        className="text-gray-500 font-semibold hover:text-emerald-700 flex items-center gap-1 hover:underline"
                      >
                        <Sliders className="w-3.5 h-3.5" /> Tier Features
                      </button>
                    </div>
                  </div>
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
                className={`relative p-2 rounded-xl transition ${
                  showNotifications
                    ? "bg-emerald-50 text-emerald-700"
                    : "hover:bg-emerald-50/60 text-gray-600 hover:text-emerald-700"
                }`}
              >
                <Bell className="w-5 h-5" />
                {broadcasts.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  {/* NOTIF HEADER */}
                  <div className="flex justify-between items-center px-5 py-4 border-b bg-emerald-50/50">
                    <div>
                      <p className="font-bold text-gray-900 text-sm">
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
                      className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-xl transition shadow-2xs"
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
                          className="flex gap-3 px-5 py-4 hover:bg-emerald-50/30 transition cursor-pointer"
                        >
                          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <Megaphone className="w-4 h-4 text-emerald-700" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {b.title}
                            </p>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {b.description}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-1">
                              {timeAgo(b.createdAt)}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full h-fit flex-shrink-0 border border-emerald-200">
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
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
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
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all ${
                  showUserMenu
                    ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                    : "bg-white border-gray-200/80 hover:border-emerald-300 hover:bg-emerald-50/50 text-gray-800 shadow-2xs"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-extrabold shadow-2xs">
                  {me?.firstName?.charAt(0)?.toUpperCase() || user?.firstName?.charAt(0)?.toUpperCase() || "B"}
                </div>
                <div className="hidden sm:block text-left leading-tight pr-1">
                  <p className="text-xs font-bold text-gray-900 truncate">
                    {me?.firstName || user?.firstName
                      ? `${me?.firstName || user?.firstName} ${me?.lastName || user?.lastName}`
                      : "Bharat-FPO"}
                  </p>
                  <p className="text-[10px] font-semibold text-emerald-700 capitalize truncate">
                    {me?.tenant?.businessName ||
                      me?.businessName ||
                      user?.tenant?.businessName ||
                      user?.businessName ||
                      user?.role ||
                      me?.role ||
                      "SuperAdmin"}
                  </p>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                    showUserMenu ? "rotate-180 text-emerald-600" : ""
                  }`}
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

        {/* FLOATING OFFLINE BANNER */}
        {isOffline && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-2.5 shadow-md flex items-center justify-between gap-3 border-b border-orange-500/20 backdrop-blur-md bg-opacity-95 font-medium text-xs transition-all duration-300 animate-slide-down">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <span>
                <strong>Offline Mode Active:</strong> You are currently disconnected. Changes may not be synced to the server.
              </span>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[10px] font-bold uppercase transition active:scale-95 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Check Status
            </button>
          </div>
        )}

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

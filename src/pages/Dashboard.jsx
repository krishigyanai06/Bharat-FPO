import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Package,
  ShoppingCart,
  CheckCircle,
  ClipboardList,
  Users,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getDashboardData } from "../store/thunks/dashboardThunk";
import { fetchStockSummary } from "../store/thunks/inventoryThunk";
import { useNavigate } from "react-router-dom";
import {
  SkeletonHeader,
  SkeletonStatCards,
  SkeletonTable,
} from "../components/Skeleton";
import theme from "../config/theme";

/* ================= HELPERS ================= */

const PAGE_SIZE = 4;

const getActionText = (status) => {
  switch (status?.toLowerCase()) {
    case "approved":
      return "Listing approved";
    case "pending":
      return "New listing submitted";
    case "rejected":
      return "Listing rejected";
    default:
      return "Activity updated";
  }
};

const timeAgo = (date) => {
  if (!date) return "";
  const mins = Math.floor((Date.now() - new Date(date)) / 60000);
  if (mins < 60) return `${mins} min${mins !== 1 ? "s" : ""} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(mins / 1440);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
};

/* ================= COMPONENT ================= */

function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    stats,
    chartData,
    dailyListings,
    stockLevelsData,
    recentActivity,
    allListings,
    loading,
    error,
  } = useSelector((state) => state.dashboard);

  const { user } = useSelector((state) => state.auth);
  const { selectedTenantId } = useSelector((state) => state.layout);
  const { stockSummary } = useSelector((state) => state.inventory);
  const normalizeRole = (role) =>
    String(role || "")
      .replace(/\s+/g, "")
      .toLowerCase();
  const isSuperAdmin = normalizeRole(user?.role) === "superadmin";

  const [view, setView] = useState("activity");
  const [page, setPage] = useState(1);

  // Compute stock levels data from inventory state (fallback to dashboard state)
  const computedStockLevelsData =
    stockSummary?.length > 0
      ? stockSummary
          .map((item) => ({
            name: item.item?.itemName ?? "—",
            available: item.availableQuantity ?? 0,
          }))
          .slice(0, 10)
      : stockLevelsData || [];

  useEffect(() => {
    // For SuperAdmin, wait for tenant selection before fetching data
    if (isSuperAdmin && !selectedTenantId) {
      console.log("[Dashboard] Waiting for tenant selection...");
      return;
    }

    console.log(
      "[Dashboard] Fetching dashboard data, tenantId:",
      selectedTenantId,
    );
    dispatch(getDashboardData());
    // Also fetch inventory data using the working inventory thunk
    dispatch(fetchStockSummary());
  }, [dispatch, isSuperAdmin, selectedTenantId]);

  // Log stats for debugging
  useEffect(() => {
    console.log("[Dashboard] Stats updated:", stats);
    console.log("[Dashboard] Total Members:", stats?.totalMembers);
  }, [stats]);

  // Debug logging for stock data
  useEffect(() => {
    console.log("[Dashboard] STOCK DEBUG:");
    console.log("   Role:", user?.role);
    console.log("   Is SuperAdmin:", isSuperAdmin);
    console.log("   Selected Tenant:", selectedTenantId);
    console.log("   Dashboard stockLevelsData:", stockLevelsData);
    console.log("   Inventory stockSummary:", stockSummary);
    console.log("   Computed stock data:", computedStockLevelsData);

    if (stockSummary?.length > 0) {
      console.log("   First inventory stock item:", stockSummary[0]);
      console.log("   Stock item structure:", {
        hasItem: !!stockSummary[0]?.item,
        hasItemName: !!stockSummary[0]?.item?.itemName,
        hasAvailableQuantity: !!stockSummary[0]?.availableQuantity,
        itemKeys: Object.keys(stockSummary[0]?.item || {}),
        stockKeys: Object.keys(stockSummary[0] || {}),
      });
    }
  }, [
    stockLevelsData,
    stockSummary,
    computedStockLevelsData,
    user,
    isSuperAdmin,
    selectedTenantId,
  ]);

  const pendingListings =
    allListings?.filter((l) => l.status?.toLowerCase() === "pending") || [];

  const totalPages = Math.ceil((recentActivity?.length || 0) / PAGE_SIZE);

  const paginatedActivity = recentActivity?.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  // Show loading while waiting for tenant selection (SuperAdmin only)
  if (isSuperAdmin && !selectedTenantId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600 mb-4" />
        <p>Waiting for tenant selection...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonHeader />
        <SkeletonStatCards count={4} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SkeletonTable rows={4} cols={2} />
          <SkeletonTable rows={4} cols={2} />
        </div>
      </div>
    );
  }

  // Show error message if data fetching failed
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Failed to Load Dashboard
          </h3>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={() => dispatch(getDashboardData())}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ================= HEADER ================= */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">
          Dashboard Overview
        </h1>
        <p className="text-sm text-gray-500">
          Welcome back! Here’s what’s happening with your FPO today.
        </p>
      </div>

      {/* ================= STATS ================= */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Pending Approvals",
            value: stats.pendingApprovals,
            icon: Package,
            path: "/listing",
            color: "bg-orange-50 text-orange-500",
          },
          {
            title: "Approved Listings",
            value: stats.approvedListings,
            icon: CheckCircle,
            path: "/listing",
            color: "bg-brand-50 text-brand-600",
          },
          {
            title: "Total Orders",
            value: stats.totalOrders,
            icon: ShoppingCart,
            path: "/procurement",
            color: "bg-blue-50 text-blue-500",
          },
          {
            title: "Total Members",
            value: stats.totalMembers,
            icon: Users,
            path: "/members",
            color: "bg-purple-50 text-purple-500",
          },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={i}
              onClick={() => navigate(s.path)}
              className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{s.title}</p>
                  <p className="mt-1 text-3xl font-bold">{s.value}</p>
                </div>
                <div className={`${s.color} p-3 rounded-xl`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ================= GRAPHS ================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* DOTTED LINE GRAPH */}
        <div className="p-6 bg-white shadow-sm rounded-xl">
          <h3 className="mb-3 font-semibold">Daily Listings Submitted</h3>
          {dailyListings.every((d) => d.count === 0) ? (
            <div className="flex flex-col items-center justify-center h-[260px] text-gray-400">
              <TrendingUp className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">No listings submitted yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailyListings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={theme.primary}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* BAR GRAPH */}
        <div className="p-6 bg-white shadow-sm rounded-xl">
          <h3 className="mb-3 font-semibold">Crop-wise Procurement Trend</h3>
          {chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[260px] text-gray-400">
              <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">No procurement data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="sales"
                  fill={theme.primary}
                  radius={[6, 6, 0, 0]}
                  barSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* STOCK LEVELS CHART */}
        <div className="p-6 bg-white shadow-sm rounded-xl">
          <h3 className="mb-3 font-semibold">Stock Levels</h3>
          {!computedStockLevelsData || computedStockLevelsData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[260px] text-gray-400">
              <Package className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">No stock data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={computedStockLevelsData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={48}
                />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(v) => [v, "Available Qty"]} />
                <Bar dataKey="available" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ================= ACTIONS + RIGHT PANEL ================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* QUICK ACTIONS */}
        <div className="p-6 space-y-3 bg-white shadow-sm rounded-xl">
          <h3 className="mb-2 font-semibold">Quick Actions</h3>

          {isSuperAdmin ? (
            <>
              <button
                onClick={() => navigate("/create-tenant")}
                className="flex items-center w-full gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
              >
                <Package size={18} />
                Create New Tenant
              </button>

              <button
                onClick={() => navigate("/members")}
                className="flex items-center w-full gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                <Users size={18} />
                Manage Members
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setView("review")}
                className="flex items-center w-full gap-2 px-4 py-2 border rounded-lg border-brand-600 text-brand-600 hover:bg-brand-50"
              >
                <ClipboardList size={18} />
                Review New Listings
              </button>

              <button
                onClick={() => navigate("/members")}
                className="flex items-center w-full gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                <Users size={18} />
                Manage Members
              </button>
            </>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="p-6 bg-white shadow-sm lg:col-span-2 rounded-xl">
          {/* ===== RECENT ACTIVITY ===== */}
          {view === "activity" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Recent Activity</h3>
                <button
                  onClick={() => navigate("/listing")}
                  className="text-sm text-brand-600 hover:underline"
                >
                  View All →
                </button>
              </div>

              <div className="space-y-4">
                {paginatedActivity?.map((a, i) => (
                  <div
                    key={i}
                    className="flex gap-3 pb-4 border-b last:border-b-0"
                  >
                    <div className="p-2 rounded-lg bg-brand-100">
                      <TrendingUp className="w-4 h-4 text-brand-600" />
                    </div>

                    <div>
                      <p className="text-sm font-medium">
                        {a.firstName} {a.lastName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {getActionText(a.status)} • {a.cropName}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {timeAgo(a.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}

                {!paginatedActivity?.length && (
                  <p className="text-sm text-gray-500">No recent activity</p>
                )}
              </div>

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1 text-sm border rounded disabled:opacity-40"
                  >
                    Prev
                  </button>

                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 text-sm border rounded disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}

          {/* ===== REVIEW LISTINGS ===== */}
          {view === "review" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Pending Listings</h3>
                <button
                  onClick={() => setView("activity")}
                  className="text-sm text-brand-600 hover:underline"
                >
                  Back →
                </button>
              </div>

              <div className="space-y-4">
                {pendingListings.map((p) => (
                  <div
                    key={p._id}
                    className="flex items-center justify-between pb-3 border-b"
                  >
                    {/* LEFT */}
                    <div>
                      <p className="text-sm font-medium">
                        {p.userId?.firstName} {p.userId?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {p.cropName} • {p.quantity} qtl
                      </p>
                    </div>

                    <button
                      onClick={() => navigate("/listing")}
                      className="text-sm font-medium text-brand-600 hover:underline"
                    >
                      Review →
                    </button>
                  </div>
                ))}

                {!pendingListings.length && (
                  <p className="text-sm text-gray-500">
                    No pending listings 🎉
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

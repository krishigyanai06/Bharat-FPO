import React, { useEffect, lazy, Suspense, useCallback, useMemo, memo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Package,
  ShoppingCart,
  CheckCircle,
  Users,
  Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getDashboardSummaryData,
  getDashboardChartsData,
} from "../store/thunks/dashboardThunk";
import {
  SkeletonHeader,
  SkeletonStatCards,
  SkeletonCharts,
} from "../components/Skeleton";
import ErrorState from "../components/ErrorState";

// Lazy-load the heavy charts component
const DashboardCharts = lazy(() => import("../components/dashboard/DashboardCharts"));

/* ================= SPARKLINE ================= */
const Sparkline = memo(({ color = "#16a34a" }) => {
  const w = 64,
    h = 28;
  const pts = [8, 14, 6, 18, 10, 22, 5, 16, 20, 12, 24];
  const max = Math.max(...pts),
    min = Math.min(...pts);
  const xs = pts.map((_, i) => (i / (pts.length - 1)) * w);
  const ys = pts.map((p) => h - ((p - min) / (max - min || 1)) * (h - 4) - 2);
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});
Sparkline.displayName = "Sparkline";

/* ================= COMPONENT ================= */

function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    stats,
    monthlyRevenue,
    currentMonthRevenue,
    prevMonthRevenue,
    monthlySalesRevenue,
    currentMonthSales,
    prevMonthSales,
    totalSalesOrders,
    monthlyOrdersCount,
    ordersByCrop,
    summaryLoading,
    chartsLoading,
    error,
  } = useSelector((state) => state.dashboard);

  const { user } = useSelector((state) => state.auth);
  const { selectedTenantId } = useSelector((state) => state.layout);

  const normalizeRole = useCallback((role) =>
    String(role || "")
      .replace(/\s+/g, "")
      .toLowerCase(),
    []
  );

  const isSuperAdmin = useMemo(() => 
    normalizeRole(user?.role) === "superadmin",
    [user?.role, normalizeRole]
  );

  const handleDownload = useCallback(async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Dashboard Report", 14, 18);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120);
      doc.setTextColor(0);

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Summary", 14, 36);

      autoTable(doc, {
        startY: 40,
        head: [["Metric", "Value"]],
        body: [
          ["Pending Approvals", String(stats.pendingApprovals ?? 0)],
          ["Approved Listings", String(stats.approvedListings ?? 0)],
          ["Total Orders", String(stats.totalOrders ?? 0)],
          ["Total Farmers", String(stats.totalMembers ?? 0)],
          [
            "This Month Procurement",
            `Rs.${currentMonthRevenue.toLocaleString("en-IN")}`,
          ],
          [
            "This Month Sales",
            `Rs.${currentMonthSales.toLocaleString("en-IN")}`,
          ],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [22, 163, 74] },
      });

      const y1 = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Monthly Procurement Amount", 14, y1);

      autoTable(doc, {
        startY: y1 + 4,
        head: [["Month", "Amount (Rs.)"]],
        body: monthlyRevenue.map((r) => [
          r.month,
          r.revenue.toLocaleString("en-IN"),
        ]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [22, 163, 74] },
      });

      const y2 = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Monthly Sales Revenue", 14, y2);

      autoTable(doc, {
        startY: y2 + 4,
        head: [["Month", "Revenue (Rs.)"]],
        body: monthlySalesRevenue.map((r) => [
          r.month,
          r.revenue.toLocaleString("en-IN"),
        ]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [22, 163, 74] },
      });

      if (ordersByCrop.length > 0) {
        const y3 = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Top Selling Products (This Month)", 14, y3);

        autoTable(doc, {
          startY: y3 + 4,
          head: [["Product", "Orders", "Share %"]],
          body: ordersByCrop.map((c) => [
            c.name,
            String(c.count),
            `${c.share}%`,
          ]),
          styles: { fontSize: 10 },
          headStyles: { fillColor: [22, 163, 74] },
        });
      }

      doc.save(`dashboard-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate report. Please try again.");
    }
  }, [stats, currentMonthRevenue, currentMonthSales, monthlyRevenue, monthlySalesRevenue, ordersByCrop]);

  useEffect(() => {
    if (isSuperAdmin && !selectedTenantId) return;
    dispatch(getDashboardSummaryData());
    dispatch(getDashboardChartsData());
  }, [dispatch, isSuperAdmin, selectedTenantId]);

  if (isSuperAdmin && !selectedTenantId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <div className="w-10 h-10 mb-4 border-b-2 rounded-full animate-spin border-brand-600" />
        <p>Waiting for tenant selection...</p>
      </div>
    );
  }

  // Render initial skeletons only if we have no stats yet and are loading
  const hasStats = stats && (stats.pendingApprovals > 0 || stats.approvedListings > 0 || stats.totalOrders > 0 || stats.totalMembers > 0);
  if (summaryLoading && !hasStats) {
    return (
      <div className="space-y-6">
        <SkeletonHeader />
        <SkeletonStatCards count={4} />
        <SkeletonCharts />
      </div>
    );
  }

  if (error && !hasStats) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <ErrorState
          title="Failed to Load Dashboard"
          error={error}
          onRetry={() => {
            dispatch(getDashboardSummaryData({ force: true }));
            dispatch(getDashboardChartsData({ force: true }));
          }}
          variant="page"
        />
      </div>
    );
  }

  // Prepare cards array stably
  const cards = [
    {
      title: "Pending Approvals",
      value: stats.pendingApprovals ?? 0,
      icon: Package,
      path: "/listing",
      iconBg: "bg-orange-50",
      iconColor: "text-orange-500",
      trend: "↑ 12% vs last week",
      trendUp: true,
      sparkColor: "#f97316",
    },
    {
      title: "Approved Listings",
      value: stats.approvedListings ?? 0,
      icon: CheckCircle,
      path: "/listing",
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      trend: "↑ 5% vs last week",
      trendUp: true,
      sparkColor: "#16a34a",
    },
    {
      title: "Total Orders",
      value: stats.totalOrders ?? 0,
      icon: ShoppingCart,
      path: "/buy",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
      trend: "↑ 8% vs last week",
      trendUp: true,
      sparkColor: "#3b82f6",
    },
    {
      title: "Total Farmers",
      value: stats.totalMembers ?? 0,
      icon: Users,
      path: "/members",
      iconBg: "bg-purple-50",
      iconColor: "text-purple-500",
      trend: "↑ +3 new this month",
      trendUp: true,
      sparkColor: "#a855f7",
    },
  ];

  return (
    <div className="space-y-6">
      {/* ================= HEADER ================= */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Dashboard Overview
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Welcome back! Here's what's happening with your FPO today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* DOWNLOAD REPORT */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-all bg-green-600 shadow-sm rounded-xl hover:bg-green-700 active:scale-95 animate-fade-in"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
        </div>
      </div>

      {/* ================= STAT CARDS ================= */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={i}
              onClick={() => navigate(s.path)}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`${s.iconBg} p-2.5 rounded-xl`}>
                    <Icon className={`w-5 h-5 ${s.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      {s.title}
                    </p>
                    <p className="text-3xl font-bold text-gray-800 leading-tight mt-0.5">
                      {s.value}
                    </p>
                  </div>
                </div>
                <Sparkline color={s.sparkColor} />
              </div>
              <p
                className={`text-xs mt-3 font-medium ${s.trendUp ? "text-green-600" : "text-red-500"}`}
              >
                {s.trend}
              </p>
            </div>
          );
        })}
      </div>

      {/* ================= LAZY LOADED CHARTS ================= */}
      <Suspense fallback={<SkeletonCharts />}>
        <DashboardCharts
          monthlyRevenue={monthlyRevenue}
          currentMonthRevenue={currentMonthRevenue}
          prevMonthRevenue={prevMonthRevenue}
          totalOrders={stats.totalOrders}
          monthlySalesRevenue={monthlySalesRevenue}
          currentMonthSales={currentMonthSales}
          prevMonthSales={prevMonthSales}
          totalSalesOrders={totalSalesOrders}
          monthlyOrdersCount={monthlyOrdersCount}
          ordersByCrop={ordersByCrop}
          chartsLoading={chartsLoading}
        />
      </Suspense>
    </div>
  );
}

export default Dashboard;

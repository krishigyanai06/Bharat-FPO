import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Package,
  ShoppingCart,
  CheckCircle,
  Users,
  TrendingUp,
  Wallet,
  CalendarDays,
  ShoppingBag,
  IndianRupee,
  Download,
  ChevronDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { getDashboardData } from "../store/thunks/dashboardThunk";
import { useNavigate } from "react-router-dom";
import {
  SkeletonHeader,
  SkeletonStatCards,
  SkeletonTable,
} from "../components/Skeleton";

/* ================= HELPERS ================= */

const CROP_COLORS = ["#16a34a", "#3b82f6", "#f97316", "#a855f7", "#ec4899", "#14b8a6"];

const fmtINR = (v) =>
  v >= 100000
    ? `₹${(v / 100000).toFixed(1)}L`
    : v >= 1000
    ? `₹${(v / 1000).toFixed(0)}K`
    : `₹${v}`;

const pctChange = (curr, prev) => {
  if (prev === 0 && curr === 0) return { label: "— 0% vs prev", up: null };
  if (prev === 0) return { label: `↑ 100% vs prev`, up: true };
  const p = Math.round(((curr - prev) / prev) * 100);
  return { label: `${p >= 0 ? "↑" : "↓"} ${Math.abs(p)}% vs prev`, up: p >= 0 };
};

/* ================= SPARKLINE ================= */
const Sparkline = ({ color = "#16a34a" }) => {
  const w = 64, h = 28;
  const pts = [8, 14, 6, 18, 10, 22, 5, 16, 20, 12, 24];
  const max = Math.max(...pts), min = Math.min(...pts);
  const xs = pts.map((_, i) => (i / (pts.length - 1)) * w);
  const ys = pts.map((p) => h - ((p - min) / (max - min || 1)) * (h - 4) - 2);
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* ================= CUSTOM TOOLTIP ================= */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="text-gray-500 mb-1">{label}</p>
      <p className="font-bold text-gray-800">₹{Number(payload[0].value).toLocaleString("en-IN")}</p>
    </div>
  );
};

/* ================= KPI CARD ================= */
const KpiCard = ({ icon: KIcon, label, value, sub, bg, iconColor }) => (
  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${bg} border-gray-100 min-w-[140px]`}>
    <div className="p-2 rounded-lg bg-white shadow-sm">
      <KIcon className={`w-4 h-4 ${iconColor}`} />
    </div>
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-800 leading-tight">{value}</p>
      <p className={`text-xs mt-0.5 ${sub.up === true ? "text-green-600" : sub.up === false ? "text-red-500" : "text-gray-400"}`}>
        {sub.label}
      </p>
    </div>
  </div>
);

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
    loading,
    error,
  } = useSelector((state) => state.dashboard);

  const { user } = useSelector((state) => state.auth);
  const { selectedTenantId } = useSelector((state) => state.layout);

  const normalizeRole = (role) =>
    String(role || "").replace(/\s+/g, "").toLowerCase();
  const isSuperAdmin = normalizeRole(user?.role) === "superadmin";

  const totalCropOrders = ordersByCrop.reduce((s, c) => s + c.count, 0);

  const PRESETS = [
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 },
    { label: "Last 90 days", days: 90 },
    { label: "This Month", days: 0 },
  ];

  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef(null);

  const dateLabel = (() => {
    const now = new Date();
    let start;
    if (selectedPreset.days === 0) {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      start = new Date(now);
      start.setDate(now.getDate() - (selectedPreset.days - 1));
    }
    const fmt = (d) =>
      `${d.getDate()} ${d.toLocaleString("default", { month: "short" })} ${d.getFullYear()}`;
    return `${fmt(start)} – ${fmt(now)}`;
  })();

  useEffect(() => {
    const handler = (e) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target))
        setShowDatePicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleDownload = async () => {
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
      doc.text(`Period: ${dateLabel}`, 14, 26);
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
          ["This Month Procurement", `Rs.${currentMonthRevenue.toLocaleString("en-IN")}`],
          ["This Month Sales", `Rs.${currentMonthSales.toLocaleString("en-IN")}`],
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
        body: monthlyRevenue.map((r) => [r.month, r.revenue.toLocaleString("en-IN")]),
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
        body: monthlySalesRevenue.map((r) => [r.month, r.revenue.toLocaleString("en-IN")]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [22, 163, 74] },
      });

      if (ordersByCrop.length > 0) {
        const y3 = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Orders by Crop (This Month)", 14, y3);

        autoTable(doc, {
          startY: y3 + 4,
          head: [["Crop", "Orders", "Share %"]],
          body: ordersByCrop.map((c) => [c.name, String(c.count), `${c.share}%`]),
          styles: { fontSize: 10 },
          headStyles: { fillColor: [22, 163, 74] },
        });
      }

      doc.save(`dashboard-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate report. Please try again.");
    }
  };

  useEffect(() => {
    if (isSuperAdmin && !selectedTenantId) return;
    dispatch(getDashboardData());
  }, [dispatch, isSuperAdmin, selectedTenantId]);

  if (isSuperAdmin && !selectedTenantId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <div className="w-10 h-10 mb-4 border-b-2 rounded-full animate-spin border-brand-600" />
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="max-w-md p-6 border border-red-200 bg-red-50 rounded-xl">
          <h3 className="mb-2 text-lg font-semibold text-red-800">Failed to Load Dashboard</h3>
          <p className="mb-4 text-sm text-red-600">{error}</p>
          <button
            onClick={() => dispatch(getDashboardData())}
            className="px-4 py-2 text-white transition bg-red-600 rounded-lg hover:bg-red-700"
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Welcome back! Here's what's happening with your FPO today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* DATE RANGE PICKER */}
          <div className="relative" ref={datePickerRef}>
            <button
              onClick={() => setShowDatePicker((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50"
            >
              <CalendarDays className="w-4 h-4 text-gray-500" />
              {dateLabel}
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDatePicker ? "rotate-180" : ""}`} />
            </button>
            {showDatePicker && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => { setSelectedPreset(p); setShowDatePicker(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition ${
                      selectedPreset.label === p.label ? "text-green-600 font-semibold bg-green-50" : "text-gray-700"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* DOWNLOAD REPORT */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-xl shadow-sm hover:bg-green-700 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
        </div>
      </div>

      {/* ================= STAT CARDS ================= */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
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
        ].map((s, i) => {
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
                    <p className="text-xs text-gray-500 font-medium">{s.title}</p>
                    <p className="text-3xl font-bold text-gray-800 leading-tight mt-0.5">{s.value}</p>
                  </div>
                </div>
                <Sparkline color={s.sparkColor} />
              </div>
              <p className={`text-xs mt-3 font-medium ${s.trendUp ? "text-green-600" : "text-red-500"}`}>
                {s.trend}
              </p>
            </div>
          );
        })}
      </div>

      {/* ================= GRAPHS ================= */}
      <div className="space-y-6">

        {/* ── PROCUREMENT BAR CHART ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-green-50">
                <ShoppingCart className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 text-base">Monthly Procurement Amount</h3>
                <p className="text-xs text-gray-400 mt-0.5">Total amount spent on procurement orders &bull; Last 6 months</p>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <KpiCard icon={Wallet} label="This Month" value={`₹${currentMonthRevenue.toLocaleString("en-IN")}`} sub={pctChange(currentMonthRevenue, prevMonthRevenue)} bg="bg-green-50" iconColor="text-green-600" />
              <KpiCard icon={CalendarDays} label="Prev Month" value={`₹${prevMonthRevenue.toLocaleString("en-IN")}`} sub={{ label: "— 0% vs prev", up: null }} bg="bg-gray-50" iconColor="text-gray-500" />
              <KpiCard icon={ShoppingBag} label="Total Orders" value={stats.totalOrders} sub={pctChange(currentMonthRevenue, prevMonthRevenue)} bg="bg-indigo-50" iconColor="text-indigo-500" />
            </div>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyRevenue} margin={{ top: 36, right: 20, left: 10, bottom: 0 }} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="4 4" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={fmtINR} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f9fafb" }} />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                {monthlyRevenue.map((entry, i) => (
                  <Cell key={i} fill={entry.revenue > 0 ? "url(#procurementBarGrad)" : "#e5e7eb"} />
                ))}
                <LabelList
                  dataKey="revenue"
                  content={(props) => {
                    const { x, y, width, value, index } = props;
                    const isActive = monthlyRevenue[index]?.revenue > 0;
                    return (
                      <text x={x + width / 2} y={y - 8} textAnchor="middle"
                        fill={isActive ? "#16a34a" : "#9ca3af"} fontSize={11} fontWeight={600}>
                        ₹{Number(value).toLocaleString("en-IN")}
                      </text>
                    );
                  }}
                />
              </Bar>
              <defs>
                <linearGradient id="procurementBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity={1} />
                  <stop offset="100%" stopColor="#bbf7d0" stopOpacity={0.6} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── SALES REVENUE AREA CHART ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-green-50">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 text-base">Monthly Sales Revenue Trend</h3>
                <p className="text-xs text-gray-400 mt-0.5">Total revenue earned from inventory orders &bull; Last 6 months</p>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <KpiCard icon={IndianRupee} label="This Month" value={`₹${currentMonthSales.toLocaleString("en-IN")}`} sub={pctChange(currentMonthSales, prevMonthSales)} bg="bg-green-50" iconColor="text-green-600" />
              <KpiCard icon={CalendarDays} label="Prev Month" value={`₹${prevMonthSales.toLocaleString("en-IN")}`} sub={{ label: "— 0% vs prev", up: null }} bg="bg-gray-50" iconColor="text-gray-500" />
              <KpiCard icon={ShoppingBag} label="Total Orders" value={totalSalesOrders} sub={pctChange(currentMonthSales, prevMonthSales)} bg="bg-indigo-50" iconColor="text-indigo-500" />
            </div>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlySalesRevenue} margin={{ top: 36, right: 20, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="salesAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={fmtINR} />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#16a34a"
                strokeWidth={2.5}
                fill="url(#salesAreaGrad)"
                dot={(props) => {
                  const { cx, cy, index } = props;
                  const isLast = index === monthlySalesRevenue.length - 1;
                  return (
                    <circle key={index} cx={cx} cy={cy} r={isLast ? 6 : 4}
                      fill={isLast ? "#16a34a" : "#fff"} stroke="#16a34a" strokeWidth={2} />
                  );
                }}
                label={(props) => {
                  const { x, y, value, index } = props;
                  const isLast = index === monthlySalesRevenue.length - 1;
                  if (!isLast || !value) return null;
                  return (
                    <g key={`label-${index}`}>
                      <rect x={x - 30} y={y - 32} width={60} height={22} rx={6} fill="#16a34a" />
                      <text x={x} y={y - 17} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={600}>
                        ₹{Number(value).toLocaleString("en-IN")}
                      </text>
                    </g>
                  );
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* ================= BOTTOM ROW ================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* MONTHLY ORDERS COUNT */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800">Monthly Orders Count</h3>
              <p className="text-xs text-gray-400 mt-0.5">Number of orders received &bull; Last 6 months</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
              <span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" />
              Orders
            </span>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyOrdersCount} margin={{ top: 28, right: 10, left: -10, bottom: 0 }} barCategoryGap="40%">
              <CartesianGrid strokeDasharray="4 4" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: 13 }}
                formatter={(v) => [v, "Orders"]}
              />
              <Bar dataKey="orders" radius={[5, 5, 0, 0]}>
                {monthlyOrdersCount.map((entry, i) => (
                  <Cell key={i} fill={entry.orders > 0 ? "url(#ordersBarGrad)" : "#e5e7eb"} />
                ))}
                <LabelList
                  dataKey="orders"
                  content={(props) => {
                    const { x, y, width, value } = props;
                    return (
                      <text x={x + width / 2} y={y - 6} textAnchor="middle"
                        fill={value > 0 ? "#16a34a" : "#9ca3af"} fontSize={11} fontWeight={600}>
                        {value}
                      </text>
                    );
                  }}
                />
              </Bar>
              <defs>
                <linearGradient id="ordersBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity={1} />
                  <stop offset="100%" stopColor="#bbf7d0" stopOpacity={0.6} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ORDERS BY CROP DONUT */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-800">Orders by Crop (This Month)</h3>
            <p className="text-xs text-gray-400 mt-0.5">Share of orders by crop type</p>
          </div>

          {ordersByCrop.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-gray-400">
              <ShoppingCart className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No orders this month</p>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <div className="relative flex-shrink-0">
                <PieChart width={180} height={180}>
                  <Pie
                    data={ordersByCrop}
                    dataKey="count"
                    nameKey="name"
                    cx={90} cy={90}
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={2}
                    label={({ percent }) => `${Math.round(percent * 100)}%`}
                    labelLine={false}
                  >
                    {ordersByCrop.map((_, i) => (
                      <Cell key={i} fill={CROP_COLORS[i % CROP_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [v, name]} />
                </PieChart>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-xl font-bold text-gray-800">{totalCropOrders}</p>
                  <p className="text-xs text-gray-400">Total Orders</p>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="grid grid-cols-3 text-xs font-semibold text-gray-400 uppercase mb-2 px-1">
                  <span>Crop</span>
                  <span className="text-center">Orders</span>
                  <span className="text-right">Share</span>
                </div>
                <div className="space-y-2.5">
                  {ordersByCrop.map((c, i) => (
                    <div key={i} className="grid grid-cols-3 items-center text-sm px-1">
                      <span className="flex items-center gap-2 truncate">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: CROP_COLORS[i % CROP_COLORS.length] }} />
                        {c.name}
                      </span>
                      <span className="text-center font-medium text-gray-700">{c.count}</span>
                      <span className="text-right text-gray-500">{c.share}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Dashboard;

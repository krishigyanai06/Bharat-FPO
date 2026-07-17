import React, { memo } from 'react';
import {
  ShoppingCart,
  Wallet,
  CalendarDays,
  ShoppingBag,
  TrendingUp,
  IndianRupee,
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

/* ================= CONSTANTS & HELPERS ================= */

const CROP_COLORS = [
  "#16a34a",
  "#3b82f6",
  "#f97316",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
];

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

/* ================= CUSTOM TOOLTIP ================= */
const ChartTooltip = memo(({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 text-sm bg-white border border-gray-200 shadow-lg rounded-xl">
      <p className="mb-1 text-gray-500">{label}</p>
      <p className="font-bold text-gray-800">
        ₹{Number(payload[0].value).toLocaleString("en-IN")}
      </p>
    </div>
  );
});
ChartTooltip.displayName = 'ChartTooltip';

/* ================= KPI CARD ================= */
const KpiCard = memo(({ icon: KIcon, label, value, sub, bg, iconColor }) => (
  <div
    className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${bg} border-gray-100 min-w-[140px]`}
  >
    <div className="p-2 bg-white rounded-lg shadow-sm">
      <KIcon className={`w-4 h-4 ${iconColor}`} />
    </div>
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold leading-tight text-gray-800">{value}</p>
      <p
        className={`text-xs mt-0.5 ${sub.up === true ? "text-green-600" : sub.up === false ? "text-red-500" : "text-gray-400"}`}
      >
        {sub.label}
      </p>
    </div>
  </div>
));
KpiCard.displayName = 'KpiCard';

/* ================= MAIN COMPONENT ================= */

const DashboardCharts = memo(({
  monthlyRevenue = [],
  currentMonthRevenue = 0,
  prevMonthRevenue = 0,
  totalOrders = 0,
  monthlySalesRevenue = [],
  currentMonthSales = 0,
  prevMonthSales = 0,
  totalSalesOrders = 0,
  monthlyOrdersCount = [],
  ordersByCrop = [],
  chartsLoading = false,
}) => {
  const totalCropOrders = ordersByCrop.reduce((s, c) => s + c.count, 0);

  if (chartsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <div className="w-8 h-8 border-b-2 border-green-600 rounded-full animate-spin mb-3" />
        <p className="text-sm">Loading dynamic charts & metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ================= GRAPHS ================= */}
      <div className="grid grid-cols-1 gap-6">
        {/* ── PROCUREMENT BAR CHART ── */}
        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-green-50">
                <ShoppingCart className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-800">
                  Monthly Procurement Amount
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Total amount spent on procurement orders &bull; Last 6 months
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <KpiCard
                icon={Wallet}
                label="This Month"
                value={`₹${currentMonthRevenue.toLocaleString("en-IN")}`}
                sub={pctChange(currentMonthRevenue, prevMonthRevenue)}
                bg="bg-green-50"
                iconColor="text-green-600"
              />
              <KpiCard
                icon={CalendarDays}
                label="Prev Month"
                value={`₹${prevMonthRevenue.toLocaleString("en-IN")}`}
                sub={{ label: "— 0% vs prev", up: null }}
                bg="bg-gray-50"
                iconColor="text-gray-500"
              />
              <KpiCard
                icon={ShoppingBag}
                label="Total Orders"
                value={totalOrders}
                sub={pctChange(currentMonthRevenue, prevMonthRevenue)}
                bg="bg-indigo-50"
                iconColor="text-indigo-500"
              />
            </div>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={monthlyRevenue}
              margin={{ top: 36, right: 20, left: 10, bottom: 0 }}
              barCategoryGap="35%"
            >
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="#f0f0f0"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmtINR}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: "#f9fafb" }}
              />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                {monthlyRevenue.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.revenue > 0 ? "url(#procurementBarGrad)" : "#e5e7eb"
                    }
                  />
                ))}
                <LabelList
                  dataKey="revenue"
                  content={(props) => {
                    const { x, y, width, value, index } = props;
                    const isActive = monthlyRevenue[index]?.revenue > 0;
                    return (
                      <text
                        x={x + width / 2}
                        y={y - 8}
                        textAnchor="middle"
                        fill={isActive ? "#16a34a" : "#9ca3af"}
                        fontSize={11}
                        fontWeight={600}
                      >
                        ₹{Number(value).toLocaleString("en-IN")}
                      </text>
                    );
                  }}
                />
              </Bar>
              <defs>
                <linearGradient
                  id="procurementBarGrad"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#16a34a" stopOpacity={1} />
                  <stop offset="100%" stopColor="#bbf7d0" stopOpacity={0.6} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── SALES REVENUE AREA CHART ── */}
        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-green-50">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-800">
                  Monthly Sales Revenue Trend
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Total revenue earned from inventory orders &bull; Last 6 months
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <KpiCard
                icon={IndianRupee}
                label="This Month"
                value={`₹${currentMonthSales.toLocaleString("en-IN")}`}
                sub={pctChange(currentMonthSales, prevMonthSales)}
                bg="bg-green-50"
                iconColor="text-green-600"
              />
              <KpiCard
                icon={CalendarDays}
                label="Prev Month"
                value={`₹${prevMonthSales.toLocaleString("en-IN")}`}
                sub={{ label: "— 0% vs prev", up: null }}
                bg="bg-gray-50"
                iconColor="text-gray-500"
              />
              <KpiCard
                icon={ShoppingBag}
                label="Total Orders"
                value={totalSalesOrders}
                sub={pctChange(currentMonthSales, prevMonthSales)}
                bg="bg-indigo-50"
                iconColor="text-indigo-500"
              />
            </div>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <AreaChart
              data={monthlySalesRevenue}
              margin={{ top: 36, right: 20, left: 10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="salesAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="#f0f0f0"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmtINR}
              />
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
                    <circle
                      key={index}
                      cx={cx}
                      cy={cy}
                      r={isLast ? 6 : 4}
                      fill={isLast ? "#16a34a" : "#fff"}
                      stroke="#16a34a"
                      strokeWidth={2}
                    />
                  );
                }}
                label={(props) => {
                  const { x, y, value, index } = props;
                  const isLast = index === monthlySalesRevenue.length - 1;
                  if (!isLast || !value) return null;
                  return (
                    <g key={`label-${index}`}>
                      <rect
                        x={x - 30}
                        y={y - 32}
                        width={60}
                        height={22}
                        rx={6}
                        fill="#16a34a"
                      />
                      <text
                        x={x}
                        y={y - 17}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={11}
                        fontWeight={600}
                      >
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
        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800">
                Monthly Orders Count
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Number of orders received &bull; Last 6 months
              </p>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
              <span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" />
              Orders
            </span>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={monthlyOrdersCount}
              margin={{ top: 28, right: 10, left: -10, bottom: 0 }}
              barCategoryGap="40%"
            >
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="#f0f0f0"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb",
                  fontSize: 13,
                }}
                formatter={(v) => [v, "Orders"]}
              />
              <Bar dataKey="orders" radius={[5, 5, 0, 0]}>
                {monthlyOrdersCount.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.orders > 0 ? "url(#ordersBarGrad)" : "#e5e7eb"}
                  />
                ))}
                <LabelList
                  dataKey="orders"
                  content={(props) => {
                    const { x, y, width, value } = props;
                    return (
                      <text
                        x={x + width / 2}
                        y={y - 6}
                        textAnchor="middle"
                        fill={value > 0 ? "#16a34a" : "#9ca3af"}
                        fontSize={11}
                        fontWeight={600}
                      >
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
        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-800">
              Top Selling Products (This Month)
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Share of orders by product
            </p>
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
                    cx={90}
                    cy={90}
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={2}
                    label={({ percent }) => `${Math.round(percent * 100)}%`}
                    labelLine={false}
                  >
                    {ordersByCrop.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CROP_COLORS[i % CROP_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [v, name]} />
                </PieChart>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-xl font-bold text-gray-800">
                    {totalCropOrders}
                  </p>
                  <p className="text-xs text-gray-400">Total Orders</p>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="grid grid-cols-3 px-1 mb-2 text-xs font-semibold text-gray-400 uppercase">
                  <span>Product</span>
                  <span className="text-center">Orders</span>
                  <span className="text-right">Share</span>
                </div>
                <div className="space-y-2.5">
                  {ordersByCrop.map((c, i) => (
                    <div
                      key={i}
                      className="grid items-center grid-cols-3 px-1 text-sm"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{
                            background: CROP_COLORS[i % CROP_COLORS.length],
                          }}
                        />
                        {c.name}
                      </span>
                      <span className="font-medium text-center text-gray-700">
                        {c.count}
                      </span>
                      <span className="text-right text-gray-500">
                        {c.share}%
                      </span>
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
});

DashboardCharts.displayName = 'DashboardCharts';

export default DashboardCharts;

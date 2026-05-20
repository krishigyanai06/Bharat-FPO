import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchFarmers,
  fetchPrivateFiles,
  fetchReports,
} from "../store/thunks/reportsThunk";
import api from "../lib/api";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  CartesianGrid,
} from "recharts";
import {
  Users,
  ShoppingCart,
  FileText,
  Download,
  Search,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

import theme from '../config/theme';

const PAGE_SIZE = 6;

/* ── Toast ── */
const Toast = ({ message, onClose }) => (
  <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg animate-fade-in">
    <CheckCircle className="w-4 h-4 text-brand-400 flex-shrink-0" />
    {message}
    <button onClick={onClose} className="ml-2 text-gray-400 hover:text-white">
      ✕
    </button>
  </div>
);

const FILE_TYPES = [
  {
    key: "soilHealthCard",
    label: "Soil Health Card",
    color: "bg-brand-100 text-brand-700",
  },
  { key: "labReport", label: "Lab Report", color: "bg-blue-100 text-blue-700" },
  {
    key: "govtSchemeDocs",
    label: "Govt Scheme Docs",
    color: "bg-purple-100 text-purple-700",
  },
];

const BAR_COLORS = [theme.primaryDark, theme.primary, '#22c55e', '#4ade80', '#86efac'];
const CROP_COLORS = [theme.primaryDark, '#0284c7', '#7c3aed', '#d97706', '#dc2626', '#0891b2', '#65a30d'];

const FarmerTooltip = ({ active, payload, totalQty }) => {
  if (!active || !payload?.length) return null;
  const { farmer, quantity, crops } = payload[0].payload;
  const share = totalQty > 0 ? ((quantity / totalQty) * 100).toFixed(1) : 0;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-sm min-w-[180px]">
      <p className="font-semibold text-gray-800 mb-2">{farmer}</p>
      <div className="flex justify-between gap-4">
        <span className="text-gray-400">Volume</span>
        <span className="font-bold text-brand-600">{quantity} qtl</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-gray-400">Share</span>
        <span className="font-semibold text-gray-700">{share}%</span>
      </div>
      <p className="text-gray-400 text-xs mt-2 border-t pt-2">🌾 {crops}</p>
    </div>
  );
};

const CropTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { crop, quantity } = payload[0].payload;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-800">{crop}</p>
      <p className="text-brand-600 font-bold mt-1">{quantity} qtl</p>
    </div>
  );
};

const CustomXTick = ({ x, y, payload, index }) => (
  <g transform={`translate(${x},${y})`}>
    <circle
      cx="0"
      cy="14"
      r="9"
      fill={BAR_COLORS[index] ?? BAR_COLORS[4]}
      opacity={0.2}
    />
    <text
      x="0"
      y="14"
      dy="4"
      textAnchor="middle"
      fontSize={10}
      fontWeight={700}
      fill={BAR_COLORS[index] ?? BAR_COLORS[4]}
    >
      {index + 1}
    </text>
    <text x="0" y="32" textAnchor="middle" fontSize={11} fill="#374151">
      {payload.value.split(" ")[0]}
    </text>
  </g>
);

const Initials = ({ name }) => {
  const parts = name.trim().split(" ");
  const initials = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return (
    <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 font-semibold flex items-center justify-center text-sm flex-shrink-0">
      {initials.toUpperCase()}
    </div>
  );
};

const Reports = () => {
  const dispatch = useDispatch();
  const [activeDoc, setActiveDoc] = useState({});
  const [search, setSearch] = useState("");
  const [fileLoading, setFileLoading] = useState({});
  const [cropFilter, setCropFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);
  const prefetchedRef = useRef(new Set());

  const { purchases, farmers, files, loading } = useSelector((s) => s.reports);
  const { user } = useSelector((s) => s.auth);
  const { selectedTenantId } = useSelector((s) => s.layout);
  const normalizeRole = (role) => String(role || "").replace(/\s+/g, "").toLowerCase();
  const isSuperAdmin = normalizeRole(user?.role) === "superadmin";

  // Debug logging
  useEffect(() => {
    console.log('[Reports] State updated:', {
      purchasesCount: purchases?.length,
      farmersCount: farmers?.length,
      loading,
      isSuperAdmin,
      selectedTenantId
    });
  }, [purchases, farmers, loading, isSuperAdmin, selectedTenantId]);

  const topFarmersData = useMemo(() => {
    if (!Array.isArray(purchases)) return [];
    const map = {};
    purchases.forEach((item) => {
      if (!item?.farmer) return;
      const name =
        `${item.farmer.firstName ?? ""} ${item.farmer.lastName ?? ""}`.trim();
      if (!map[name]) map[name] = { quantity: 0, crops: new Set() };
      map[name].quantity += item.quantity || 0;
      map[name].crops.add(item.crop);
    });
    return Object.entries(map)
      .map(([farmer, d]) => ({
        farmer,
        quantity: d.quantity,
        crops: [...d.crops].join(", "),
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [purchases]);

  const cropWiseData = useMemo(() => {
    if (!Array.isArray(purchases)) return [];
    const map = {};
    purchases.forEach((p) => {
      if (!p.crop) return;
      map[p.crop] = (map[p.crop] || 0) + (p.quantity || 0);
    });
    return Object.entries(map)
      .map(([crop, quantity]) => ({ crop, quantity }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [purchases]);

  useEffect(() => {
    // For SuperAdmin, wait for tenant selection before fetching data
    if (isSuperAdmin && !selectedTenantId) {
      console.log('[Reports] Waiting for tenant selection...');
      return;
    }
    
    console.log('[Reports] Fetching data, tenantId:', selectedTenantId, 'isSuperAdmin:', isSuperAdmin);
    dispatch(fetchReports());
    dispatch(fetchFarmers());
  }, [dispatch, isSuperAdmin, selectedTenantId]);

  /* unique crops from purchases for the filter pills */
  const allCrops = useMemo(() => {
    if (!Array.isArray(purchases)) return [];
    const crops = new Set();
    purchases.forEach((p) => {
      if (p.crop) crops.add(p.crop);
    });
    return [...crops].sort();
  }, [purchases]);

  /* farmers who sold the selected crop */
  const farmerIdsForCrop = useMemo(() => {
    if (cropFilter === "all") return null;
    if (!Array.isArray(purchases)) return null;
    const ids = new Set();
    purchases.forEach((p) => {
      if (p.crop === cropFilter && p.farmer?._id) ids.add(p.farmer._id);
    });
    return ids;
  }, [purchases, cropFilter]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleFetchFiles = async (farmerId, type) => {
    setActiveDoc((prev) => ({ ...prev, [farmerId]: type }));
    if (!files?.[farmerId]?.[type]) {
      setFileLoading((prev) => ({ ...prev, [`${farmerId}_${type}`]: true }));
      setFileLoading((prev) => ({ ...prev, [`${farmerId}_${type}`]: false }));
    }
  };

  /* pre-fetch all 3 types once per farmer to show counts */
  const prefetchAllTypes = useCallback(
    (farmerId) => {
      if (prefetchedRef.current.has(farmerId)) return;
      prefetchedRef.current.add(farmerId);
      FILE_TYPES.forEach(({ key }) => {
        dispatch(fetchPrivateFiles({ farmerId, type: key }));
      });
    },
    [dispatch],
  );

  const handleDownload = async (url, fileName) => {
    try {
      const isAbsolute = url?.startsWith("http");
      const res = isAbsolute
        ? await axios.get(url, { responseType: "blob" })
        : await api.get(url, { responseType: "blob" });
      const blob = new Blob([res.data], {
        type: res.headers["content-type"] || "application/octet-stream",
      });
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName || "document";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      showToast(`Downloaded "${fileName || "document"}"`);
    } catch (err) {
      // Last resort — open in new tab
      window.open(url, "_blank");
      showToast(`Opening "${fileName || "document"}"…`);
    }
  };

  const filteredFarmers = useMemo(() => {
    let list = Array.isArray(farmers) ? farmers : [];
    // Filter to only show farmers (not Admin, Staff, etc.)
    list = list.filter((f) => {
      const role = String(f.role || '').toLowerCase();
      return role === 'farmer' || role === 'user' || !role;
    });
    if (farmerIdsForCrop)
      list = list.filter((f) => farmerIdsForCrop.has(f._id));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) =>
          `${f.firstName} ${f.lastName}`.toLowerCase().includes(q) ||
          f.phone?.includes(q),
      );
    }
    return list;
  }, [farmers, search, farmerIdsForCrop]);

  /* reset to page 1 whenever filters change */
  useEffect(() => {
    setPage(1);
  }, [search, cropFilter]);

  const totalPages = Math.ceil((filteredFarmers?.length || 0) / PAGE_SIZE);
  const pagedFarmers = (filteredFarmers || []).slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const totalQty = useMemo(
    () =>
      Array.isArray(purchases)
        ? purchases.reduce((s, p) => s + (p.quantity || 0), 0)
        : 0,
    [purchases],
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">
          Reports & Analytics
        </h1>
        <p className="text-sm text-gray-500">
          View insights and download detailed reports
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: "Total Farmers",
            value: Array.isArray(farmers) ? farmers.length : 0,
            icon: Users,
            color: "bg-brand-50 text-brand-600",
          },
          {
            label: "Total Procurements",
            value: Array.isArray(purchases) ? purchases.length : 0,
            icon: ShoppingCart,
            color: "bg-blue-50 text-blue-600",
          },
          {
            label: "Total Volume (qtl)",
            value: totalQty.toFixed(1),
            icon: FileText,
            color: "bg-purple-50 text-purple-600",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4"
          >
            <div className={`${s.color} p-3 rounded-xl`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="text-2xl font-bold text-gray-800">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CHARTS ROW — Top Farmers + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Bar Chart */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-800">
                Top Farmers by Volume
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Quantity supplied in quintals
              </p>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 px-3 py-1.5 rounded-full">
              <TrendingUp className="w-3.5 h-3.5" /> Top {topFarmersData.length}
            </span>
          </div>
          {topFarmersData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">No data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={topFarmersData}
                margin={{ top: 20, right: 16, left: 0, bottom: 44 }}
              >
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke="#f3f4f6"
                />
                <XAxis
                  dataKey="farmer"
                  axisLine={false}
                  tickLine={false}
                  tick={<CustomXTick />}
                  interval={0}
                />
                <YAxis hide />
                <Tooltip
                  content={<FarmerTooltip totalQty={totalQty} />}
                  cursor={{ fill: "#f0fdf4" }}
                />
                <Bar
                  dataKey="quantity"
                  barSize={44}
                  radius={[6, 6, 0, 0]}
                  background={{ fill: "#f9fafb", radius: [6, 6, 0, 0] }}
                >
                  {topFarmersData.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i] ?? BAR_COLORS[4]} />
                  ))}
                  <LabelList
                    dataKey="quantity"
                    position="top"
                    formatter={(v) => `${v} qtl`}
                    style={{ fontSize: 11, fontWeight: 700, fill: "#374151" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Leaderboard */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm px-5 py-5 flex flex-col">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-800">
              Top Suppliers
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              By procurement volume
            </p>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-12 text-[10px] font-semibold uppercase tracking-wide text-gray-400 border-b pb-2 mb-1">
            <span className="col-span-1">#</span>
            <span className="col-span-7">Farmer</span>
            <span className="col-span-4 text-right">Volume</span>
          </div>

          {topFarmersData.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
              <Users className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No data</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {topFarmersData.map((row, i) => {
                const share =
                  totalQty > 0
                    ? ((row.quantity / totalQty) * 100).toFixed(1)
                    : 0;
                const initials = row.farmer
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <div
                    key={row.farmer}
                    className="grid grid-cols-12 items-center py-2.5 gap-1"
                  >
                    {/* Rank */}
                    <span className="col-span-1 text-xs font-bold text-gray-300">
                      {i + 1}
                    </span>

                    {/* Avatar + name + bar */}
                    <div className="col-span-7 flex items-center gap-2 min-w-0">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 text-white"
                        style={{
                          backgroundColor: BAR_COLORS[i] ?? BAR_COLORS[4],
                        }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate leading-tight">
                          {row.farmer}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate leading-tight">
                          {row.crops}
                        </p>
                        <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden w-full">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${share}%`,
                              backgroundColor: BAR_COLORS[i] ?? BAR_COLORS[4],
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="col-span-4 text-right">
                      <p className="text-sm font-bold text-gray-800">
                        {row.quantity}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        qtl · {share}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CROP-WISE BREAKDOWN */}
      {cropWiseData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm px-6 py-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-800">
              Crop-wise Procurement Breakdown
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Total volume procured per crop across all farmers
            </p>
          </div>
          <ResponsiveContainer
            width="100%"
            height={cropWiseData.length * 44 + 16}
          >
            <BarChart
              data={cropWiseData}
              layout="vertical"
              margin={{ top: 0, right: 64, left: 90, bottom: 0 }}
            >
              <CartesianGrid
                horizontal={false}
                strokeDasharray="3 3"
                stroke="#f3f4f6"
              />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="crop"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#374151" }}
              />
              <Tooltip content={<CropTooltip />} cursor={{ fill: "#f0fdf4" }} />
              <Bar
                dataKey="quantity"
                barSize={24}
                radius={[0, 6, 6, 0]}
                background={{ fill: "#f9fafb", radius: [0, 6, 6, 0] }}
              >
                {cropWiseData.map((_, i) => (
                  <Cell key={i} fill={CROP_COLORS[i % CROP_COLORS.length]} />
                ))}
                <LabelList
                  dataKey="quantity"
                  position="right"
                  formatter={(v) => `${v} qtl`}
                  style={{ fontSize: 11, fontWeight: 600, fill: "#374151" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* FARMER DOCUMENTS */}
      <div>
        {/* toolbar */}
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <h3 className="text-base font-semibold text-gray-800">
            Farmer Documents
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({filteredFarmers.length})
            </span>
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search farmers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 w-56"
            />
          </div>
        </div>

        {/* crop filter pills */}
        {allCrops.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setCropFilter("all")}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition ${
                cropFilter === "all"
                  ? "bg-brand-600 text-white border-transparent"
                  : "text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              All Crops
            </button>
            {allCrops.map((crop) => (
              <button
                key={crop}
                onClick={() => setCropFilter(crop)}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition ${
                  cropFilter === crop
                    ? "bg-brand-600 text-white border-transparent"
                    : "text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {crop}
              </button>
            ))}
          </div>
        )}

        {filteredFarmers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <Users className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">No farmers found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {pagedFarmers.map((farmer) => {
                const fullName = `${farmer.firstName} ${farmer.lastName}`;
                const selectedType = activeDoc[farmer._id];
                const selectedFiles = files?.[farmer._id]?.[selectedType] || [];
                const isLoadingFiles =
                  fileLoading[`${farmer._id}_${selectedType}`];

                return (
                  <div
                    key={farmer._id}
                    className="bg-white rounded-xl border shadow-sm p-5 flex flex-col gap-4"
                    onMouseEnter={() => prefetchAllTypes(farmer._id)}
                  >
                    {/* Farmer Info */}
                    <div className="flex items-center gap-3">
                      <Initials name={fullName} />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">
                          {fullName}
                        </p>
                        <p className="text-sm text-gray-500">{farmer.phone}</p>
                      </div>
                    </div>

                    {/* Doc Type Buttons with count badges */}
                    <div className="flex flex-wrap gap-2">
                      {FILE_TYPES.map((t) => {
                        const count = files?.[farmer._id]?.[t.key]?.length;
                        return (
                          <button
                            key={t.key}
                            onClick={() => handleFetchFiles(farmer._id, t.key)}
                            className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full border transition ${
                              selectedType === t.key
                                ? t.color + " border-transparent"
                                : "text-gray-600 border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            {t.label}
                            {count != null && (
                              <span
                                className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                  selectedType === t.key
                                    ? "bg-white/60"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Files */}
                    {selectedType && (
                      <div className="space-y-2">
                        {isLoadingFiles ? (
                          <div className="flex justify-center py-3">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-600" />
                          </div>
                        ) : selectedFiles.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-2">
                            No documents available
                          </p>
                        ) : (
                          selectedFiles.map((file, i) => (
                            <div
                              key={i}
                              className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="text-xs text-gray-700 truncate">
                                  {file.fileName ||
                                    file.name ||
                                    FILE_TYPES.find(
                                      (t) => t.key === selectedType,
                                    )?.label}
                                </span>
                              </div>
                              <button
                                onClick={() =>
                                  handleDownload(
                                    file.url,
                                    file.fileName || file.name,
                                  )
                                }
                                className="flex items-center gap-1 text-xs text-brand-600 font-medium hover:underline flex-shrink-0 ml-2"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Download
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-gray-500">
                  Showing {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, filteredFarmers.length)} of{" "}
                  {filteredFarmers.length} farmers
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="p-1.5 rounded-lg border disabled:opacity-40 hover:bg-gray-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 text-sm rounded-lg border transition ${
                          p === page
                            ? "bg-brand-600 text-white border-transparent"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    ),
                  )}
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="p-1.5 rounded-lg border disabled:opacity-40 hover:bg-gray-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* TOAST */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Reports;

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProducts, updateListing } from "../store/thunks/productsThunk";
import { fetchMembers } from "../store/thunks/membersThunk";
import {
  Search,
  Eye,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  ImageOff,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MoreVertical,
  Users,
  Phone,
  Tag,
  Layers,
  X,
  ExternalLink,
} from "lucide-react";
import { SkeletonHeader, SkeletonStatCards, SkeletonTable } from "../components/Skeleton";
import { usePermissions } from "../hooks/usePermissions";
import toast from "react-hot-toast";

const STATUS_TABS = [
  {
    value: "all",
    label: "All",
    icon: Package,
    color: "bg-gray-800 text-white",
    pill: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  },
  {
    value: "pending",
    label: "Pending",
    icon: Clock,
    color: "bg-orange-100 text-orange-700",
    pill: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  },
  {
    value: "approved",
    label: "Approved",
    icon: CheckCircle,
    color: "bg-brand-100 text-brand-700",
    pill: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  },
  {
    value: "rejected",
    label: "Rejected",
    icon: XCircle,
    color: "bg-red-100 text-red-700",
    pill: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  },
];

const normalizeStatus = (status) => {
  if (!status) return "pending";
  const s = String(status).trim().toLowerCase();
  if (s === "reject" || s === "rejected") return "rejected";
  if (s === "approve" || s === "approved") return "approved";
  if (s === "pending") return "pending";
  return s;
};

const statusBadge = (status) => {
  const norm = normalizeStatus(status);
  const cfg = STATUS_TABS.find((s) => s.value === norm);
  if (!cfg || cfg.value === "all") return null;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium ${cfg.color}`}
    >
      <Icon size={12} />
      {cfg.label}
    </span>
  );
};

const getCropImage = (p) => p.cropImages?.[0]?.url ?? null;

function Listing() {
  const dispatch = useDispatch();
  const { products, loading } = useSelector((state) => state.products);
  const { members } = useSelector((state) => state.members);
  const { isReadOnly } = usePermissions();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCrop, setSelectedCrop] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewProduct, setViewProduct] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const ITEMS_PER_PAGE = itemsPerPage;

  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchMembers());
  }, [dispatch]);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCrop, statusFilter]);

  const stats = products.reduce(
    (acc, p) => {
      const st = normalizeStatus(p.status);
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    },
    { pending: 0, approved: 0, rejected: 0 },
  );

  const cropOptions = [
    "all",
    ...Array.from(new Set(products.map((p) => p.cropName))).filter(Boolean),
  ];

  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      p.cropName?.toLowerCase().includes(term) ||
      p.userId?.firstName?.toLowerCase().includes(term) ||
      p.userId?.lastName?.toLowerCase().includes(term);
    const matchesCrop = selectedCrop === "all" || p.cropName === selectedCrop;
    const matchesStatus = statusFilter === "all" || normalizeStatus(p.status) === statusFilter;
    return matchesSearch && matchesCrop && matchesStatus;
  });

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonHeader />
        <SkeletonStatCards count={3} />
        <SkeletonTable rows={9} cols={10} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER + KPI CARDS */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            Listing Approvals
          </h1>
          <p className="text-sm text-gray-500">
            Review and approve farmer listings
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Pending",
              value: stats.pending || 0,
              icon: Clock,
              color: "bg-orange-50 text-orange-500",
            },
            {
              label: "Approved",
              value: stats.approved || 0,
              icon: CheckCircle,
              color: "bg-brand-50 text-brand-600",
            },
            {
              label: "Rejected",
              value: stats.rejected || 0,
              icon: XCircle,
              color: "bg-red-50 text-red-500",
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="bg-white rounded-xl shadow-sm p-4 flex justify-between items-center"
            >
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-2xl font-bold mt-0.5">{value}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${color}`}>
                <Icon size={18} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* STATUS FILTER TABS */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((s) => {
          const Icon = s.icon;
          const count =
            s.value === "all" ? products.length : stats[s.value] || 0;
          const active = statusFilter === s.value;
          return (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                active
                  ? s.value === "all"
                    ? "bg-gray-800 text-white"
                    : s.color
                  : s.pill
              }`}
            >
              <Icon size={15} />
              {s.label} ({count})
            </button>
          );
        })}
      </div>

      {/* SEARCH + CROP FILTER */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by crop, farmer name..."
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={selectedCrop}
          onChange={(e) => setSelectedCrop(e.target.value)}
          className="px-4 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {cropOptions.map((crop) => (
            <option key={crop} value={crop}>
              {crop === "all" ? "All Crops" : crop}
            </option>
          ))}
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["#", "Crop Details", "Farmer Details", "Quantity & Price", "Total Value", "Submitted On", "Status", "Actions"].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedProducts.map((p, i) => {
              const member = members.find((m) => m._id === (p.userId?._id ?? p.userId));
              const phone = member?.phone ?? p.userId?.phone ?? null;
              const city = p.location?.city ?? member?.city ?? null;
              const state = p.location?.state ?? member?.state ?? null;
              const locationStr = [city, state].filter(Boolean).join(", ");
              const submittedDate = new Date(p.createdAt);
              return (
                <tr
                  key={p._id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => { setViewProduct(p); setActiveImg(0); }}
                >
                  {/* # */}
                  <td className="px-5 py-4 text-gray-400 text-sm">{startIndex + i + 1}</td>

                  {/* Crop Details */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        {getCropImage(p) ? (
                          <img src={getCropImage(p)} alt={p.cropName} className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                            <ImageOff size={16} className="text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{p.cropName}</p>
                        {p.variety && <p className="text-xs text-gray-400 mt-0.5">{p.variety}</p>}
                        <div className="mt-1">{statusBadge(p.status)}</div>
                      </div>
                    </div>
                  </td>

                  {/* Farmer Details */}
                  <td className="px-5 py-4">
                    <p className="font-semibold text-gray-800">
                      {p.userId?.firstName} {p.userId?.lastName}
                    </p>
                    {phone && <p className="text-xs text-gray-500 mt-0.5">{phone}</p>}
                    {locationStr && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} className="text-gray-400" />{locationStr}
                      </p>
                    )}
                  </td>

                  {/* Quantity & Price */}
                  <td className="px-5 py-4">
                    <p className="flex items-center gap-1 text-gray-700">
                      <Users size={13} className="text-gray-400" />
                      {p.quantity} qtl
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">₹{Number(p.price).toLocaleString("en-IN")} / qtl</p>
                  </td>

                  {/* Total Value */}
                  <td className="px-5 py-4 font-bold text-brand-600 text-base">
                    ₹{(p.quantity * p.price).toLocaleString("en-IN")}
                  </td>

                  {/* Submitted On */}
                  <td className="px-5 py-4">
                    <p className="text-gray-700">
                      {submittedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {submittedDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    {statusBadge(p.status)}
                    <p className="text-xs text-gray-400 mt-1">
                      {{
                        approved: "Listed for sale",
                        rejected: "Not approved",
                        pending: "Awaiting review",
                      }[normalizeStatus(p.status)] ?? p.status}
                    </p>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setViewProduct(p); setActiveImg(0); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-green-500 text-green-600 rounded-lg hover:bg-green-50 transition font-medium"
                      >
                        <Eye size={12} /> {normalizeStatus(p.status) === "pending" ? "Review" : "View"}
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!filteredProducts.length && (
              <tr>
                <td colSpan="8" className="text-center py-14">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Package size={32} className="text-gray-300" />
                    <span>{statusFilter === "all" ? "No listings found" : `No ${statusFilter} listings`}</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* PAGINATION FOOTER */}
        <div className="flex items-center justify-between px-5 py-3 border-t bg-white">
          <p className="text-sm text-gray-500">
            Showing {filteredProducts.length === 0 ? 0 : startIndex + 1} to{" "}
            {Math.min(startIndex + ITEMS_PER_PAGE, filteredProducts.length)} of{" "}
            {filteredProducts.length} listings
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="w-8 h-8 flex items-center justify-center border rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: totalPages }, (_, idx) => idx + 1)
              .filter((pg) => pg === 1 || pg === totalPages || Math.abs(pg - currentPage) <= 1)
              .reduce((acc, pg, i, arr) => {
                if (i > 0 && pg - arr[i - 1] > 1) acc.push("...");
                acc.push(pg);
                return acc;
              }, [])
              .map((pg, idx) =>
                pg === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 text-sm">…</span>
                ) : (
                  <button
                    key={pg}
                    onClick={() => setCurrentPage(pg)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition ${
                      currentPage === pg
                        ? "bg-brand-600 text-white shadow-sm"
                        : "border text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {pg}
                  </button>
                )
              )}
            <button
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="w-8 h-8 flex items-center justify-center border rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={15} />
            </button>
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="ml-2 px-3 py-1.5 border rounded-lg text-sm text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>{n} per page</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* VIEW MODAL */}
      {viewProduct && (() => {
        const member = members.find((m) => m._id === (viewProduct.userId?._id ?? viewProduct.userId));
        const firstName = member?.firstName ?? viewProduct.userId?.firstName ?? "Unknown";
        const lastName = member?.lastName ?? viewProduct.userId?.lastName ?? "Farmer";
        const phone = member?.phone ?? viewProduct.userId?.phone ?? null;
        const city = viewProduct.location?.city ?? member?.city ?? null;
        const state = viewProduct.location?.state ?? member?.state ?? null;
        const locationStr = [city, state].filter(Boolean).join(", ");
        const totalValue = (viewProduct.quantity * viewProduct.price).toLocaleString("en-IN");
        const normSt = normalizeStatus(viewProduct.status);
        const statusColors = {
          approved: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
          rejected: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500" },
          pending:  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-400" },
        };
        const sc = statusColors[normSt] ?? statusColors.pending;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
            onClick={() => setViewProduct(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden"
              style={{ maxHeight: "92vh" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* HEADER */}
              <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center">
                    <Package size={18} className="text-brand-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-800">Listing Details</h2>
                    <p className="text-xs text-gray-400">ID: {viewProduct._id?.slice(-8).toUpperCase()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.border} ${sc.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {normSt === "rejected" ? "Rejected" : normSt === "approved" ? "Approved" : "Pending"}
                  </span>
                  <button onClick={() => setViewProduct(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* BODY — two columns */}
              <div className="flex flex-col md:flex-row overflow-y-auto flex-1">

                {/* LEFT — image gallery */}
                <div className="md:w-72 flex-shrink-0 bg-gray-50 border-r p-4 flex flex-col gap-3">
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-200">
                    {viewProduct.cropImages?.length > 0 ? (
                      <img src={viewProduct.cropImages[activeImg]?.url} alt="crop" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageOff size={36} className="text-gray-300" />
                      </div>
                    )}
                    {viewProduct.cropImages?.length > 1 && (
                      <>
                        <button onClick={() => setActiveImg((i) => (i - 1 + viewProduct.cropImages.length) % viewProduct.cropImages.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-md transition">
                          <ChevronLeft size={16} className="text-gray-700" />
                        </button>
                        <button onClick={() => setActiveImg((i) => (i + 1) % viewProduct.cropImages.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-md transition">
                          <ChevronRight size={16} className="text-gray-700" />
                        </button>
                        <span className="absolute bottom-2 right-2 bg-black/50 text-white text-[11px] px-2 py-0.5 rounded-full">
                          {activeImg + 1}/{viewProduct.cropImages.length}
                        </span>
                      </>
                    )}
                  </div>
                  {viewProduct.cropImages?.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {viewProduct.cropImages.map((img, i) => (
                        <button key={i} onClick={() => setActiveImg(i)}
                          className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition ${
                            activeImg === i ? "border-brand-500 shadow-sm" : "border-transparent opacity-50 hover:opacity-100"
                          }`}>
                          <img src={img.url} alt={`t-${i}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Total value card */}
                  <div className="mt-auto bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl p-4 text-white">
                    <p className="text-xs font-medium opacity-80">Total Value</p>
                    <p className="text-2xl font-bold mt-0.5">₹{totalValue}</p>
                    <p className="text-xs opacity-70 mt-1">{viewProduct.quantity} qtl × ₹{Number(viewProduct.price).toLocaleString("en-IN")}</p>
                  </div>
                </div>

                {/* RIGHT — details */}
                <div className="flex-1 p-6 space-y-5 overflow-y-auto">

                  {/* Crop info */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{viewProduct.cropName}</h3>
                    {viewProduct.variety && <p className="text-sm text-gray-500 mt-0.5">{viewProduct.variety}</p>}
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border rounded-xl p-3">
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                        <Layers size={12} /> Quantity
                      </div>
                      <p className="font-bold text-gray-800 text-base">{viewProduct.quantity} qtl</p>
                    </div>
                    <div className="border rounded-xl p-3">
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                        <Tag size={12} /> Price / qtl
                      </div>
                      <p className="font-bold text-gray-800 text-base">₹{Number(viewProduct.price).toLocaleString("en-IN")}</p>
                    </div>
                  </div>

                  {/* Farmer card */}
                  <div className="border rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Farmer</p>
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm flex-shrink-0">
                        {firstName[0]}{lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800">{firstName} {lastName}</p>
                        {phone ? (
                          <a href={`tel:${phone}`} className="flex items-center gap-1 text-xs text-brand-600 hover:underline mt-0.5">
                            <Phone size={11} /> +91 {phone}
                          </a>
                        ) : (
                          <p className="text-xs text-gray-400 mt-0.5">Phone not available</p>
                        )}
                        {locationStr && (
                          <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                            <MapPin size={11} /> {locationStr}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Location map link */}
                  {viewProduct.location?.coordinates && (
                    <a
                      href={`https://www.google.com/maps?q=${viewProduct.location.coordinates[1]},${viewProduct.location.coordinates[0]}`}
                      target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 border border-blue-100 bg-blue-50 hover:bg-blue-100 rounded-xl p-3 transition"
                    >
                      <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-base flex-shrink-0">📍</div>
                      <div>
                        <p className="text-sm font-medium text-blue-700">View Farm on Google Maps</p>
                        <p className="text-xs text-blue-400">{viewProduct.location.coordinates[1]}°N, {viewProduct.location.coordinates[0]}°E</p>
                      </div>
                      <ExternalLink size={14} className="ml-auto text-blue-400" />
                    </a>
                  )}

                  {/* Update Status */}
                  {!isReadOnly && (
                    <div className="border rounded-xl p-4 bg-gray-50">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Update Approval Status</p>
                      {normSt !== "pending" ? (
                        <div className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border ${
                          normSt === "approved"
                            ? "bg-emerald-50 border-emerald-200"
                            : "bg-red-50 border-red-200"
                        }`}>
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                            normSt === "approved" ? "bg-emerald-100" : "bg-red-100"
                          }`}>
                            {normSt === "approved"
                              ? <CheckCircle size={18} className="text-emerald-600" />
                              : <XCircle size={18} className="text-red-500" />}
                          </div>
                          <div>
                            <p className={`text-sm font-bold capitalize ${
                              normSt === "approved" ? "text-emerald-700" : "text-red-600"
                            }`}>
                              {normSt === "approved" ? "✓ Listing Approved" : "✕ Listing Rejected"}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">No further changes allowed</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <button
                            onClick={() =>
                              dispatch(updateListing({ id: viewProduct._id, data: { status: "approved" } }))
                                .unwrap()
                                .then(() => {
                                  setViewProduct((prev) => ({ ...prev, status: "approved" }));
                                  toast.success("Listing approved successfully!");
                                })
                                .catch((err) => toast.error(err || "Failed to approve listing"))
                            }
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white cursor-pointer"
                          >
                            <CheckCircle size={16} /> Approve
                          </button>
                          <button
                            onClick={() =>
                              dispatch(updateListing({ id: viewProduct._id, data: { status: "reject" } }))
                                .unwrap()
                                .then(() => {
                                  setViewProduct((prev) => ({ ...prev, status: "reject" }));
                                  toast.success("Listing rejected successfully!");
                                })
                                .catch((err) => toast.error(err || "Failed to reject listing"))
                            }
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition border-2 border-red-400 text-red-500 hover:bg-red-500 hover:text-white cursor-pointer"
                          >
                            <XCircle size={16} /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default Listing;

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProducts } from "../store/thunks/productsThunk";
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
} from "lucide-react";
import { SkeletonHeader, SkeletonStatCards, SkeletonTable } from "../components/Skeleton";
import { usePermissions } from "../hooks/usePermissions";

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

const statusBadge = (status) => {
  const cfg = STATUS_TABS.find((s) => s.value === status);
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
  const [statusFilter, setStatusFilter] = useState("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewProduct, setViewProduct] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const ITEMS_PER_PAGE = 9;

  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchMembers());
  }, [dispatch]);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCrop, statusFilter]);

  const stats = products.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
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
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
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
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 text-left">#</th>
              <th className="px-6 py-4 text-left">Image</th>
              <th className="px-6 py-4 text-left">Farmer</th>
              <th className="px-6 py-4 text-left">Crop</th>
              <th className="px-6 py-4 text-left">Quantity</th>
              <th className="px-6 py-4 text-left">Expected Price</th>
              <th className="px-6 py-4 text-left">Total Value</th>
              <th className="px-6 py-4 text-left">Submission Date</th>
              <th className="px-6 py-4 text-left">Status</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedProducts.map((p, i) => (
              <tr
                key={p._id}
                className="hover:bg-brand-50/40 cursor-pointer transition-colors"
                onClick={() => {
                  setViewProduct(p);
                  setActiveImg(0);
                }}
              >
                <td className="px-6 py-4 text-gray-400">
                  {startIndex + i + 1}
                </td>
                <td className="px-6 py-4">
                  <div className="relative w-10 h-10">
                    {getCropImage(p) ? (
                      <img
                        src={getCropImage(p)}
                        alt={p.cropName}
                        className="w-10 h-10 rounded-lg object-cover border"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <ImageOff size={14} className="text-gray-300" />
                      </div>
                    )}
                    {p.cropImages?.length > 1 && (
                      <span className="absolute -top-1 -right-1 bg-brand-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {p.cropImages.length}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-800">
                    {p.userId?.firstName} {p.userId?.lastName}
                  </p>
                  <p className="text-xs text-gray-400">Farmer</p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium">{p.cropName}</p>
                  {p.variety && (
                    <p className="text-xs text-gray-400">{p.variety}</p>
                  )}
                </td>
                <td className="px-6 py-4">{p.quantity} qtl</td>
                <td className="px-6 py-4">₹{p.price}/qtl</td>
                <td className="px-6 py-4 font-semibold text-brand-700">
                  ₹{(p.quantity * p.price).toLocaleString("en-IN")}
                </td>
                <td className="px-6 py-4">
                  {new Date(p.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">{statusBadge(p.status)}</td>
                <td
                  className="px-6 py-4 text-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      setViewProduct(p);
                      setActiveImg(0);
                    }}
                    className="px-3 py-1 text-xs border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center gap-1 mx-auto"
                  >
                    <Eye size={12} /> View
                  </button>
                </td>
              </tr>
            ))}
            {!filteredProducts.length && (
              <tr>
                <td colSpan="10" className="text-center py-14">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Package size={32} className="text-gray-300" />
                    <span>
                      {statusFilter === "all"
                        ? "No listings found"
                        : `No ${statusFilter} listings`}
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewProduct && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl flex flex-col"
            style={{ maxHeight: "90vh" }}
          >
            {/* MODAL HEADER */}
            <div className="flex justify-between items-center px-6 py-4 border-b flex-shrink-0">
              <h2 className="text-lg font-semibold">Listing Details</h2>
              <button
                onClick={() => setViewProduct(null)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            {/* SCROLLABLE BODY */}
            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* STATUS BANNER */}
              <div
                className={`rounded-xl px-4 py-3 flex items-center justify-between ${
                  viewProduct.status === "approved"
                    ? "bg-brand-50 border border-brand-200"
                    : viewProduct.status === "rejected"
                      ? "bg-red-50 border border-red-200"
                      : "bg-orange-50 border border-orange-200"
                }`}
              >
                <div>
                  <p
                    className={`text-xs font-medium ${
                      viewProduct.status === "approved"
                        ? "text-brand-500"
                        : viewProduct.status === "rejected"
                          ? "text-red-500"
                          : "text-orange-500"
                    }`}
                  >
                    Current Status
                  </p>
                  <p
                    className={`text-base font-bold capitalize mt-0.5 ${
                      viewProduct.status === "approved"
                        ? "text-brand-700"
                        : viewProduct.status === "rejected"
                          ? "text-red-700"
                          : "text-orange-700"
                    }`}
                  >
                    {viewProduct.status || "Pending"}
                  </p>
                </div>
                {statusBadge(viewProduct.status)}
              </div>

              {/* IMAGE SLIDER */}
              {viewProduct.cropImages?.length > 0 ? (
                <div>
                  <div className="relative w-full h-56 bg-gray-100 rounded-xl overflow-hidden">
                    <img
                      src={viewProduct.cropImages[activeImg]?.url}
                      alt={`crop-${activeImg}`}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                      {activeImg + 1} / {viewProduct.cropImages.length}
                    </span>
                    {viewProduct.cropImages.length > 1 && (
                      <>
                        <button
                          onClick={() =>
                            setActiveImg(
                              (i) =>
                                (i - 1 + viewProduct.cropImages.length) %
                                viewProduct.cropImages.length,
                            )
                          }
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1 shadow transition"
                        >
                          <ChevronLeft size={18} className="text-gray-700" />
                        </button>
                        <button
                          onClick={() =>
                            setActiveImg(
                              (i) => (i + 1) % viewProduct.cropImages.length,
                            )
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1 shadow transition"
                        >
                          <ChevronRight size={18} className="text-gray-700" />
                        </button>
                      </>
                    )}
                  </div>
                  {viewProduct.cropImages.length > 1 && (
                    <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                      {viewProduct.cropImages.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveImg(i)}
                          className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition ${
                            activeImg === i
                              ? "border-brand-500"
                              : "border-transparent opacity-60 hover:opacity-100"
                          }`}
                        >
                          <img
                            src={img.url}
                            alt={`thumb-${i}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-56 rounded-xl bg-gray-100 flex items-center justify-center">
                  <ImageOff size={32} className="text-gray-300" />
                </div>
              )}

              {/* CROP DETAILS */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Crop Details
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Crop Name</p>
                    <p className="font-semibold mt-0.5">
                      {viewProduct.cropName}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Variety</p>
                    <p className="font-semibold mt-0.5">
                      {viewProduct.variety || "—"}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Quantity</p>
                    <p className="font-semibold mt-0.5">
                      {viewProduct.quantity} qtl
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Expected Price</p>
                    <p className="font-semibold mt-0.5">
                      ₹{viewProduct.price}/qtl
                    </p>
                  </div>
                  <div className="bg-brand-50 rounded-lg p-3 col-span-2">
                    <p className="text-xs text-brand-600">Total Value</p>
                    <p className="font-bold text-brand-700 text-lg mt-0.5">
                      ₹
                      {(
                        viewProduct.quantity * viewProduct.price
                      ).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Harvest Date</p>
                    <p className="font-semibold mt-0.5">
                      {viewProduct.harvestDate
                        ? new Date(viewProduct.harvestDate).toLocaleDateString(
                            "en-IN",
                            { day: "numeric", month: "short", year: "numeric" },
                          )
                        : "—"}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Submitted On</p>
                    <p className="font-semibold mt-0.5">
                      {new Date(viewProduct.createdAt).toLocaleDateString(
                        "en-IN",
                        { day: "numeric", month: "short", year: "numeric" },
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* FARMER */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Farmer
                </p>
                <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                  {(() => {
                    const member = members.find(
                      (m) => m._id === viewProduct.userId?._id,
                    );
                    const firstName =
                      member?.firstName ??
                      viewProduct.userId?.firstName ??
                      "Unknown";
                    const lastName =
                      member?.lastName ??
                      viewProduct.userId?.lastName ??
                      "Farmer";
                    const phone =
                      member?.phone ?? viewProduct.userId?.phone ?? null;
                    return (
                      <>
                        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm flex-shrink-0">
                          {firstName[0]}
                          {lastName[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">
                            {firstName} {lastName}
                          </p>
                          {phone ? (
                            <a
                              href={`tel:${phone}`}
                              className="text-xs text-brand-600 hover:underline"
                            >
                              +91 {phone}
                            </a>
                          ) : (
                            <p className="text-xs text-gray-400">
                              Phone not available
                            </p>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* LOCATION */}
              {viewProduct.location?.coordinates && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Location
                  </p>
                  <a
                    href={`https://www.google.com/maps?q=${viewProduct.location.coordinates[1]},${viewProduct.location.coordinates[0]}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-lg p-3 hover:bg-blue-100 transition"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 text-lg">
                      📍
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-700">
                        View on Google Maps
                      </p>
                      <p className="text-xs text-blue-500">
                        {viewProduct.location.coordinates[1]}°N,{" "}
                        {viewProduct.location.coordinates[0]}°E
                      </p>
                    </div>
                    <span className="ml-auto text-blue-400 text-xs">↗</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Listing;

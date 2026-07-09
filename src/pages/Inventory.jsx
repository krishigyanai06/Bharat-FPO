import { useEffect, useMemo, useState, Fragment, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  Package,
  Download,
  Wallet,
  Plus,
  Pencil,
  CheckCircle,
  ImageOff,
  Trash2,
  Search,
  SlidersHorizontal,
  ChevronDown,
  MoreVertical,
  Leaf,
  ClipboardList,
  Percent,
  Image,
  Sprout,
  Save,
  X,
  Video,
  Info,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import {
  fetchProducts,
  fetchStockSummary,
  deleteStockItem,
  addProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
} from "../store/thunks/inventoryThunk";
import ConfirmDialog from "../components/ConfirmDialog";
import ProductDetailView from "../components/ProductDetailView";
import {
  SkeletonHeader,
  SkeletonStatCards,
  SkeletonTable,
} from "../components/Skeleton";
import { usePermissions } from "../hooks/usePermissions";
import api from "../lib/api";
import ProductModal from "../components/ProductModal";

const ITEMS_PER_PAGE = 8;

function StatusBadge({ isActive }) {
  return isActive ? (
    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-brand-100 text-brand-700">
      Active
    </span>
  ) : (
    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
      Inactive
    </span>
  );
}

function StockBadge({ qty, inStockSystem }) {
  if (!inStockSystem)
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-400 border border-gray-200">
        No Entry
      </span>
    );
  if (qty === 0)
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
        Out of Stock
      </span>
    );
  if (qty <= 5)
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-600 border border-orange-200">
        Low Stock
      </span>
    );
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
      In Stock
    </span>
  );
}

function StockBar({ qty, unit }) {
  return (
    <span className="font-semibold text-gray-700">
      {qty} {unit ?? ""}
    </span>
  );
}

function ExpiryCell({ date }) {
  if (!date) return <span className="text-gray-400">—</span>;
  const d = new Date(date);
  const now = new Date();
  const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  const label = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  if (diff < 0)
    return <span className="text-red-600 font-medium">{label}<br/><span className="text-red-400">(Expired)</span></span>;
  if (diff <= 30)
    return (
      <span className="text-gray-700">{label}<br/>
        <span className="text-orange-500 font-medium">({diff}d left)</span>
      </span>
    );
  return <span className="text-gray-600">{label}</span>;
}

function ProductImage({ url, name }) {
  const [err, setErr] = useState(false);
  if (!url || err)
    return (
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0">
        <ImageOff size={14} className="text-gray-400" />
      </div>
    );
  return (
    <img
      src={url}
      alt={name}
      className="w-11 h-11 rounded-xl object-cover border border-gray-100 shadow-sm flex-shrink-0"
      onError={() => setErr(true)}
    />
  );
}

const getMockRating = (name) => {
  if (!name) return { rating: "4.5", reviews: 5 };
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const rating = (4.0 + (Math.abs(hash) % 11) / 10).toFixed(1);
  const reviews = (Math.abs(hash) % 15) + 1;
  return { rating, reviews };
};

function ProductGridCard({ p, isReadOnly, expandedRowId, setExpandedRowId, setEditRow, setShowModal, setConfirmId, setConfirmType, setSelectedProductDetailId }) {
  const dispatch = useDispatch();
  const { stockSummary } = useSelector((s) => s.inventory);
  
  const [activeVariantIdx, setActiveVariantIdx] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  const activeVariant = p.products?.[activeVariantIdx] || p.products?.[0];
  
  const mrp = Number(activeVariant?.mrp ?? 0);
  const salePrice = Number(activeVariant?.salePrice ?? 0);
  const saveAmount = mrp > salePrice ? mrp - salePrice : 0;
  const discountPercentage = mrp > salePrice ? Math.round((saveAmount / mrp) * 100) : 0;

  const variantStock = (stockSummary || []).find(
    (s) => s.item?.variantId === activeVariant?._id || s.item?._id === activeVariant?._id || (
           s.item?.sourceRef === p._id &&
           String(s.item?.parameter).trim().toLowerCase() === String(activeVariant?.parameter).trim().toLowerCase() &&
           String(s.item?.unit).trim().toLowerCase() === String(activeVariant?.unit).trim().toLowerCase()
    )
  );
  const qty = variantStock ? (variantStock.availableQuantity ?? 0) : (activeVariant?.quantity ?? 0);

  const ratingData = useMemo(() => getMockRating(p.productName || p._id), [p.productName, p._id]);

  return (
    <div className="bg-white border border-gray-150 rounded-2xl p-4 shadow-sm flex flex-col justify-between relative hover:shadow-md hover:-translate-y-1 transition-all duration-300 ease-in-out w-full group/card min-h-[360px]">
      {/* Top Left Badge: Inactive or Discount */}
      {!p.isActive ? (
        <div className="absolute top-3 left-0 bg-gray-500 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-r-lg shadow-sm z-10">
          INACTIVE
        </div>
      ) : discountPercentage > 0 ? (
        <div className="absolute top-3 left-0 bg-[#ff8f17] text-white text-[10px] font-extrabold px-2.5 py-1 rounded-r-lg shadow-sm z-10">
          {discountPercentage}% OFF
        </div>
      ) : null}

      {/* Floating Action Buttons */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
        {!isReadOnly && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditRow(p);
                setShowModal(true);
              }}
              className="w-7 h-7 rounded-full bg-white/90 hover:bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-brand-600 shadow-xs transition"
              title="Edit Product"
            >
              <Pencil size={12} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmId(p._id);
                setConfirmType("product");
              }}
              className="w-7 h-7 rounded-full bg-white/90 hover:bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-red-500 shadow-xs transition"
              title="Delete Product"
            >
              <Trash2 size={12} />
            </button>
          </>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsFavorite(!isFavorite);
          }}
          className={`w-7 h-7 rounded-full bg-white/90 hover:bg-white border border-gray-200 flex items-center justify-center shadow-xs transition ${
            isFavorite ? "text-red-500" : "text-gray-400 hover:text-red-500"
          }`}
          title="Favorite"
        >
          <svg className={`w-3.5 h-3.5 ${isFavorite ? "fill-current" : "fill-none stroke-current"}`} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {/* Main Card Content Area (Clicking navigates to detailed view) */}
      <div
        onClick={() => setSelectedProductDetailId(p._id)}
        className="cursor-pointer flex flex-col flex-1"
      >
        {/* Product Image Frame */}
        <div className="w-full h-44 bg-gray-50/60 border border-gray-150 rounded-xl overflow-hidden flex items-center justify-center p-3 relative mt-2.5">
          {p.productImages?.[0]?.url ? (
            <img
              src={p.productImages[0].url}
              alt={p.productName}
              className="w-full h-full object-contain"
            />
          ) : (
            <ImageOff size={24} className="text-gray-300" />
          )}

          {/* Rating Badge Overlay */}
          <div className="absolute bottom-2.5 left-2.5 bg-[#15803d] text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
            <span>{ratingData.rating} ★</span>
            <span className="opacity-60">|</span>
            <span>{ratingData.reviews}</span>
          </div>
        </div>

        {/* Product Info (Left-Aligned) */}
        <div className="mt-3 flex-1 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-800 text-[14px] leading-snug line-clamp-2 h-10 overflow-hidden" title={p.productName}>
              {p.productName}
            </h3>
            <p className="text-[11px] text-gray-400 font-semibold mt-0.5 truncate">{p.brand || "No brand"}</p>
          </div>

          {/* Pricing Display */}
          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-extrabold text-gray-900">₹{salePrice}</span>
              {mrp > salePrice && (
                <span className="text-xs text-gray-400 line-through">₹{mrp}</span>
              )}
            </div>
            {saveAmount > 0 && (
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#15803d] mt-1">
                <div className="w-3.5 h-3.5 rounded-full bg-green-50 flex items-center justify-center">
                  <Percent size={8} className="text-[#15803d]" />
                </div>
                <span>Save ₹{saveAmount}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Size Selector & Stock */}
      <div className="flex items-center justify-between border-t border-gray-100 mt-3.5 pt-3.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs text-gray-450 font-semibold whitespace-nowrap">Size</span>
          {p.products?.length > 0 ? (
            <div className="relative flex-1 min-w-0">
              <select
                value={activeVariantIdx}
                onChange={(e) => setActiveVariantIdx(Number(e.target.value))}
                className="appearance-none border border-gray-250 rounded-lg pl-2 pr-7 py-1 text-xs text-gray-600 bg-white hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500 font-semibold max-w-[130px] truncate"
              >
                {p.products.map((v, index) => (
                  <option key={v._id || index} value={index}>
                    {v.parameter} {v.unit}
                  </option>
                ))}
              </select>
              <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          ) : (
            <span className="text-xs text-gray-400 font-semibold">—</span>
          )}
        </div>

        <div className="text-right flex-shrink-0">
          {qty === 0 ? (
            <span className="text-[10px] font-extrabold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
              Out of Stock
            </span>
          ) : qty <= 5 ? (
            <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
              Low Stock: {qty}
            </span>
          ) : (
            <span className="text-[10px] font-extrabold text-[#15803d] bg-green-50 px-2 py-0.5 rounded border border-green-100">
              Stock: {qty}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}


function exportCSV(data) {
  const headers = ["Product Name", "Brand", "Description", "Status"];
  const rows = data.map((r) => [
    r.productName ?? "—",
    r.brand ?? "—",
    r.description ?? "—",
    r.isActive ? "Active" : "Inactive",
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "products.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function Inventory() {
  const dispatch = useDispatch();
  const { products, stockSummary, loading } = useSelector((s) => s.inventory);
  const { isReadOnly, canCreate, canUpdate, canDelete } = usePermissions();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmId, setConfirmId] = useState(null);
  const [confirmType, setConfirmType] = useState("product");
  const [showModal, setShowModal] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [selectedProductDetailId, setSelectedProductDetailId] = useState(null);

  const { user } = useSelector((s) => s.auth);
  const { selectedTenantId } = useSelector((s) => s.layout);
  const normalizeRole = (role) =>
    String(role || "")
      .replace(/\s+/g, "")
      .toLowerCase();
  const isSuperAdmin = normalizeRole(user?.role) === "superadmin";

  useEffect(() => {
    // For SuperAdmin, wait for tenant selection before fetching data
    if (isSuperAdmin && !selectedTenantId) {
      console.log("[Inventory] Waiting for tenant selection...");
      return;
    }

    console.log(
      "[Inventory] Fetching data, tenantId:",
      selectedTenantId,
      "isSuperAdmin:",
      isSuperAdmin,
    );
    dispatch(fetchProducts());
    dispatch(fetchStockSummary());
  }, [dispatch, isSuperAdmin, selectedTenantId]);

  // Debug logging for SuperAdmin vs Tenant Admin data differences
  useEffect(() => {
    console.log("[Inventory] Data loaded:", {
      role: user?.role,
      productsCount: products.length,
      stockCount: stockSummary.length,
    });
  }, [products, stockSummary, user]);

  const kpi = useMemo(() => {
    const totalProducts = products.length;
    const activeProducts = products.filter((p) => p.isActive).length;
    const inactiveProducts = totalProducts - activeProducts;
    const getStockEntry = (p) =>
      stockSummary.find((s) => s.item?.sourceRef === p._id);
    const outOfStock = products.filter((p) => {
      const s = getStockEntry(p);
      return s && (s.availableQuantity ?? 0) === 0;
    }).length;
    const lowStock = products.filter((p) => {
      const s = getStockEntry(p);
      if (!s) return false;
      const q = s.availableQuantity ?? 0;
      return q > 0 && q <= 5;
    }).length;
    const stockValue = stockSummary.reduce(
      (sum, s) =>
        sum + (s.availableQuantity ?? 0) * (s.item?.purchasePrice ?? 0),
      0,
    );
    const now = new Date();
    const expiringSoon = stockSummary.filter((s) => {
      const d = s.item?.expiryDate;
      if (!d) return false;
      const diff = Math.ceil((new Date(d) - now) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 30;
    }).length;
    return {
      totalProducts,
      activeProducts,
      inactiveProducts,
      outOfStock,
      lowStock,
      stockValue,
      expiringSoon,
    };
  }, [products, stockSummary]);

  const monthlyStockData = useMemo(() => {
    return stockSummary
      .map((item) => ({
        name: item.item?.itemName ?? "—",
        available: item.availableQuantity ?? 0,
      }))
      .slice(0, 10);
  }, [stockSummary]);

  const stockMap = useMemo(() => {
    const map = {};
    stockSummary.forEach((s) => {
      const key = s.item?.sourceRef;
      if (key)
        map[typeof key === "object" ? key.toString() : key] =
          s.availableQuantity ?? 0;
    });
    return map;
  }, [stockSummary]);

  // merged rows: each product + its stock entry joined
  const mergedRows = useMemo(() => {
    console.log("[Inventory] Merging products with stock data...");
    console.log("   Products to merge:", products.length);
    console.log("   Stock items available:", stockSummary.length);

    return products.map((p, index) => {
      // Find all stock records for this product
      const productStocks = (stockSummary || []).filter((s) => s.item?.sourceRef === p._id);
      
      // Calculate total available quantity across all variants of this product
      const totalQty = productStocks.reduce((sum, s) => sum + (s.availableQuantity ?? 0), 0);
      
      // Find a base stock summary record for price / details if available
      const baseStock = productStocks[0] || null;
      
      // Create a merged stock object with total available quantity
      let stock = baseStock ? { ...baseStock, availableQuantity: totalQty } : null;

      // Method 2: If no match, try direct ID matching (in case structure is different)
      if (!stock) {
        stock = stockSummary.find(
          (s) => s._id === p._id || s.productId === p._id,
        );
      }

      // Method 3: Try name-based matching as fallback
      if (!stock && p.productName) {
        stock = stockSummary.find(
          (s) =>
            s.item?.itemName === p.productName ||
            s.productName === p.productName,
        );
      }

      if (index < 3) {
        // Log first 3 for debugging
        console.log(`   Product ${index + 1}:`, {
          productId: p._id,
          productName: p.productName,
          foundStock: !!stock,
          stockMethod: stock
            ? stockSummary.find((s) => s.item?.sourceRef === p._id)
              ? "sourceRef"
              : stockSummary.find(
                    (s) => s._id === p._id || s.productId === p._id,
                  )
                ? "directId"
                : "nameMatch"
            : "none",
          stockData: stock
            ? {
                availableQuantity: stock.availableQuantity,
                purchasePrice: stock.item?.purchasePrice || stock.purchasePrice,
                sourceRef: stock.item?.sourceRef || stock.sourceRef,
              }
            : null,
        });
      }

      return { ...p, _stock: stock };
    });
  }, [products, stockSummary]);

  const uniqueBrands = useMemo(() => {
    const brands = products.map((p) => p.brand).filter(Boolean);
    return Array.from(new Set(brands));
  }, [products]);

  const filteredData = useMemo(() => {
    return mergedRows.filter((p) => {
      const matchSearch =
        (p.productName ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (p.brand ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (p.productCategory ?? p.category ?? "").toLowerCase().includes(search.toLowerCase());
      
      const qty = p._stock?.availableQuantity ?? null;
      let matchStatus = true;
      if (statusFilter === "active") matchStatus = p.isActive === true;
      else if (statusFilter === "inactive") matchStatus = p.isActive === false;
      else if (statusFilter === "instock")
        matchStatus = qty !== null && qty > 0;
      else if (statusFilter === "outofstock")
        matchStatus = qty !== null && qty === 0;
      else if (statusFilter === "lowstock")
        matchStatus = qty !== null && qty > 0 && qty <= 5;
      else if (statusFilter === "expiring") {
        const now = new Date();
        const d = p._stock?.item?.expiryDate ?? p.products?.[0]?.expiryDate;
        if (d) {
          const diff = Math.ceil((new Date(d) - now) / (1000 * 60 * 60 * 24));
          matchStatus = diff >= 0 && diff <= 30;
        } else {
          matchStatus = false;
        }
      }

      let matchCategory = true;
      if (selectedCategoryFilter !== "all") {
        const pCat = (p.productCategory || p.category || "").toLowerCase();
        matchCategory = pCat === selectedCategoryFilter.toLowerCase();
      }

      let matchBrand = true;
      if (brandFilter !== "all") {
        matchBrand = (p.brand || "") === brandFilter;
      }

      return matchSearch && matchStatus && matchCategory && matchBrand;
    });
  }, [mergedRows, search, statusFilter, selectedCategoryFilter, brandFilter]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const outOfStockItems = stockSummary.filter(
    (p) => (p.availableQuantity ?? 0) === 0,
  );

  const confirmDelete = () => {
    if (confirmType === "product") {
      dispatch(deleteProduct(confirmId))
        .unwrap()
        .then(() => toast.success("Product deleted"))
        .catch(() => toast.error("Failed to delete product"))
        .finally(() => setConfirmId(null));
    } else {
      dispatch(deleteStockItem(confirmId))
        .unwrap()
        .then(() => toast.success("Stock item deleted"))
        .catch(() => toast.error("Failed to delete stock item"))
        .finally(() => setConfirmId(null));
    }
  };

  const handleSaveProduct = (form, variants, images, videos, selectedCrops) => {
    setSaving(true);

    const fileToBase64 = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
      });
    };

    const crops = selectedCrops || ["All"];

    const executeSave = async () => {
      try {
        const encodedImages = await Promise.all(
          (images || []).map(async (img) => {
            if (img.file) {
              return await fileToBase64(img.file);
            }
            return img.url;
          })
        );

        const encodedVideos = await Promise.all(
          (videos || []).map(async (vid) => {
            if (vid.file) {
              return await fileToBase64(vid.file);
            }
            return vid.url;
          })
        );

        const payload = {
          productName: form.productName,
          brand: form.brand || "",
          productCategory: form.productCategory,
          description: form.description || "",
          productTechnicalDetails: form.productTechnicalDetails || "",
          howToUse: form.howToUse || "",
          productBenefits: form.productBenefits || "",
          itemType: form.itemType || "PRODUCT",
          hsnCode: form.hsnCode || "",
          taxRate: form.taxRate !== "" && form.taxRate !== null ? String(form.taxRate) : "",
          targetCrops: crops,
          productImages: encodedImages,
          productVideos: encodedVideos,
          products: variants.map((variant) => {
            const mrpVal = Number(variant.mrp) || 0;
            const item = {
              ...(variant._id && { _id: variant._id }),
              unit: variant.unit,
              mrp: mrpVal,
              quantity: Number(variant.quantity) || 0,
              purchasePrice: variant.purchasePrice !== "" && variant.purchasePrice !== null ? Number(variant.purchasePrice) : 0,
              purchasePriceTaxType: variant.purchasePriceTaxType || "Without Tax",
              salePrice: variant.salePrice !== "" && variant.salePrice !== null ? Number(variant.salePrice) : mrpVal,
              salePriceTaxType: variant.salePriceTaxType || "Without Tax",
            };

            if (variant.purchaseDate) item.purchaseDate = variant.purchaseDate;
            if (variant.parameter) item.parameter = variant.parameter;
            if (variant.expiryDate) item.expiryDate = variant.expiryDate;
            if (variant.itemCode) item.itemCode = variant.itemCode;
            if (variant.location) item.location = variant.location;
            if (variant.asOfDate) item.asOfDate = variant.asOfDate;

            if (variant.discountOnSalePrice !== "" && variant.discountOnSalePrice !== null) {
              const disc = Number(variant.discountOnSalePrice);
              if (!isNaN(disc)) {
                item.discountOnSalePrice = disc;
                if (variant.discountType) item.discountType = variant.discountType;
              }
            }
            if (variant.wholesalePrice !== "" && variant.wholesalePrice !== null) {
              const wp = Number(variant.wholesalePrice);
              if (!isNaN(wp)) {
                item.wholesalePrice = wp;
                if (variant.wholesalePriceTaxType) item.wholesalePriceTaxType = variant.wholesalePriceTaxType;
              }
            }
            if (variant.minWholesaleQty !== "" && variant.minWholesaleQty !== null) {
              const mwq = Number(variant.minWholesaleQty);
              if (!isNaN(mwq)) item.minWholesaleQty = mwq;
            }
            if (variant.openingStockPrice !== "" && variant.openingStockPrice !== null) {
              const osp = Number(variant.openingStockPrice);
              if (!isNaN(osp)) item.openingStockPrice = osp;
            }
            if (variant.minStockToMaintain !== "" && variant.minStockToMaintain !== null) {
              const msm = Number(variant.minStockToMaintain);
              if (!isNaN(msm)) item.minStockToMaintain = msm;
            }

            return item;
          }),
        };

        if (editRow) {
          dispatch(updateProduct({ id: editRow._id, data: payload }))
            .unwrap()
            .then(() => {
              toast.success("Product updated successfully");
              setShowModal(false);
              setEditRow(null);
              setTimeout(() => {
                dispatch(fetchProducts());
                dispatch(fetchStockSummary());
              }, 1500);
            })
            .catch((err) => {
              console.error("Update product error:", err);
              toast.error(
                typeof err === "string"
                  ? err
                  : err?.message || "Failed to update product"
              );
            })
            .finally(() => setSaving(false));
        } else {
          dispatch(addProduct(payload))
            .unwrap()
            .then(() => {
              toast.success("Product added successfully");
              setShowModal(false);
              setTimeout(() => dispatch(fetchProducts()), 1500);
            })
            .catch((err) => {
              console.error("Add product error:", err);
              toast.error(
                typeof err === "string"
                  ? err
                  : err?.message || "Failed to add product"
              );
            })
            .finally(() => setSaving(false));
        }
      } catch (err) {
        console.error("Failed to process image file:", err);
        toast.error("Failed to process image file");
        setSaving(false);
      }
    };

    executeSave();
  };

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
        <SkeletonStatCards count={6} />
        <SkeletonTable rows={8} cols={11} />
      </div>
    );
  }

  if (showModal) {
    return (
      <ProductModal
        initial={editRow ?? null}
        onClose={() => {
          setShowModal(false);
          setEditRow(null);
        }}
        onSave={handleSaveProduct}
        saving={saving}
      />
    );
  }

  if (selectedProductDetailId) {
    const detailProduct = products.find((p) => p._id === selectedProductDetailId);
    return (
      <ProductDetailView
        productId={selectedProductDetailId}
        products={products}
        stockSummary={stockSummary}
        isReadOnly={isReadOnly}
        onBack={() => setSelectedProductDetailId(null)}
        onEdit={() => {
          if (detailProduct) {
            setEditRow(detailProduct);
            setShowModal(true);
          }
        }}
        onRefresh={() => {
          dispatch(fetchProducts());
          dispatch(fetchStockSummary());
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div 
        className="relative overflow-hidden rounded-2xl border border-gray-150 shadow-sm p-6 md:p-8 flex flex-col justify-between min-h-[260px] gap-6 bg-cover bg-no-repeat bg-[position:85%_center] sm:bg-right-center"
        style={{ backgroundImage: `url('/agricultural_banner_bg.png')` }}
      >
        {/* Soft white-to-transparent overlay on the left to ensure high readability of text and cards */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/85 to-transparent pointer-events-none z-0" />

        {/* Top title and actions row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center z-10 w-full gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Products</h1>
            <p className="text-sm text-gray-505 mt-1">Manage all your agricultural products & inventory</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportCSV(filteredData)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-250 bg-white rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition shadow-xs"
            >
              <Download size={13} /> Export
            </button>
            {!isReadOnly && (
              <button
                onClick={() => {
                  setEditRow(null);
                  setShowModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition shadow-sm"
              >
                <Plus size={14} /> Add Product
              </button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-5xl z-10 mt-2">
          {/* Stat Card 1: Total */}
          <div className="bg-white rounded-2xl border border-gray-150 shadow-xs p-4 flex items-center gap-4 hover:shadow-md transition duration-200">
            <div className="w-12 h-12 rounded-full bg-[#f4fbf7] text-[#16a34a] border border-[#e8f5e9] flex items-center justify-center flex-shrink-0">
              <Sprout size={20} className="text-[#16a34a]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-400">Total Products</p>
              <p className="text-3xl font-extrabold text-[#16a34a] leading-tight mt-0.5">{kpi.totalProducts}</p>
              <p className="text-xs text-[#16a34a] font-bold flex items-center gap-0.5 mt-0.5">
                <span>↑</span> 12 this month
              </p>
            </div>
          </div>

          {/* Stat Card 2: Active */}
          <div className="bg-white rounded-2xl border border-gray-150 shadow-xs p-4 flex items-center gap-4 hover:shadow-md transition duration-200">
            <div className="w-12 h-12 rounded-full bg-[#f4fbf7] text-[#16a34a] border border-[#e8f5e9] flex items-center justify-center flex-shrink-0">
              <CheckCircle size={20} className="text-[#16a34a]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-400">Active Products</p>
              <p className="text-3xl font-extrabold text-[#16a34a] leading-tight mt-0.5">{kpi.activeProducts}</p>
              <p className="text-xs text-gray-400 mt-0.5 font-medium">
                {Math.round(kpi.totalProducts > 0 ? (kpi.activeProducts / kpi.totalProducts) * 10000 : 0) / 100}% of total
              </p>
            </div>
          </div>

          {/* Stat Card 3: Low Stock */}
          <div 
            className="bg-white rounded-2xl border border-gray-150 shadow-xs p-4 flex items-center gap-4 hover:shadow-md transition duration-200 cursor-pointer relative"
            onClick={() => setStatusFilter("lowstock")}
          >
            <div className="w-12 h-12 rounded-full bg-[#fffbeb] text-[#d97706] border border-[#fef3c7] flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={20} className="text-[#d97706]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-400">Low Stock</p>
              <p className="text-3xl font-extrabold text-[#d97706] leading-tight mt-0.5">{kpi.lowStock}</p>
              <p className="text-xs text-gray-400 mt-0.5 font-medium">Need attention</p>
            </div>
            <svg className="absolute top-4 right-4 w-4 h-4 text-[#d97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>

          {/* Stat Card 4: Expiring */}
          <div 
            className="bg-white rounded-2xl border border-gray-150 shadow-xs p-4 flex items-center gap-4 hover:shadow-md transition duration-200 cursor-pointer"
            onClick={() => setStatusFilter("expiring")}
          >
            <div className="w-12 h-12 rounded-full bg-[#faf5ff] text-[#7c3aed] border border-[#f3e8ff] flex items-center justify-center flex-shrink-0">
              <svg className="w-5.5 h-5.5 text-[#7c3aed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-400">Expiring Soon</p>
              <p className="text-3xl font-extrabold text-[#7c3aed] leading-tight mt-0.5">{kpi.expiringSoon}</p>
              <p className="text-xs text-gray-400 mt-0.5 font-medium">Within 30 days</p>
            </div>
          </div>
        </div>
      </div>

      {/* OUT OF STOCK BANNER */}
      {outOfStockItems.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={15} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-700">
                {outOfStockItems.length} item
                {outOfStockItems.length > 1 ? "s" : ""} out of stock
              </p>
              <p className="text-xs text-red-400 mt-0.5">
                {outOfStockItems
                  .map((p) => p.item?.itemName ?? "—")
                  .join(" · ")}
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter("outofstock")}
            className="text-xs font-medium text-red-600 hover:text-red-700 whitespace-nowrap border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition"
          >
            View all →
          </button>
        </div>
      )}

      {/* FILTERS BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-5 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
        {/* Search and Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by product name, brand..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition bg-gray-50/50"
            />
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={selectedCategoryFilter}
              onChange={(e) => { setSelectedCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="appearance-none border border-gray-200 rounded-xl pl-4 pr-10 py-2.5 text-xs text-gray-600 bg-white hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 min-w-[150px]"
            >
              <option value="all">All Categories</option>
              <option value="fertilizers">Fertilizers</option>
              <option value="seeds">Seeds</option>
              <option value="insecticides">Insecticides</option>
              <option value="organic">Organic</option>
              <option value="pgr">PGR</option>
              <option value="animal_feed">Animal Feed</option>
              <option value="fungicides">Fungicides</option>
              <option value="herbicides">Herbicides</option>
              <option value="tools">Tools</option>
              <option value="other">Other</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="appearance-none border border-gray-200 rounded-xl pl-4 pr-10 py-2.5 text-xs text-gray-600 bg-white hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 min-w-[130px]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="lowstock">Low Stock</option>
              <option value="expiring">Expiring Soon</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Brands Dropdown */}
          <div className="relative">
            <select
              value={brandFilter}
              onChange={(e) => { setBrandFilter(e.target.value); setCurrentPage(1); }}
              className="appearance-none border border-gray-200 rounded-xl pl-4 pr-10 py-2.5 text-xs text-gray-600 bg-white hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 min-w-[130px]"
            >
              <option value="all">All Brands</option>
              {uniqueBrands.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* More Filters */}
          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-[#15803d] hover:bg-green-50/30 transition bg-white">
            <SlidersHorizontal size={14} className="text-[#15803d]" /> More Filters
          </button>
        </div>

        {/* Toggle View (Grid/List) */}
        <div className="flex items-center gap-1 border border-gray-200 p-1 rounded-xl bg-white shadow-xs">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition duration-150 ${
              viewMode === "grid"
                ? "bg-[#14532d] text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Grid
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition duration-150 ${
              viewMode === "list"
                ? "bg-[#14532d] text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            List
          </button>
        </div>
      </div>

      {/* STOCK LEVELS CHART
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="font-bold text-gray-850">Stock Levels</h2>
            <p className="text-xs text-gray-400 mt-0.5">Live available quantity per item</p>
          </div>
          <button className="flex items-center gap-1.5 text-xs text-gray-655 bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition shadow-xs">
            Top 10 items <ChevronDown size={13} />
          </button>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthlyStockData} barSize={32} barCategoryGap="35%" margin={{ top: 20, right: 10, left: -10, bottom: 40 }}>
            <defs>
              <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16a34a" stopOpacity={1} />
                <stop offset="100%" stopColor="#86efac" stopOpacity={0.7} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              interval={0}
              angle={0}
              textAnchor="middle"
              height={50}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => {
                const parts = v.split(" ");
                return parts.length > 2 ? parts.slice(0, 2).join(" ") + "..." : v;
              }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              tickCount={5}
            />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
              formatter={(v) => [v, "Available Qty"]}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
            />
            <Bar dataKey="available" fill="url(#greenGrad)" radius={[5, 5, 0, 0]} minPointSize={4}>
              <LabelList dataKey="available" position="top" style={{ fontSize: 11, fontWeight: 600, fill: "#374151" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      */}

      {/* MAIN PRODUCTS CONTENT */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {paginatedData.map((row, i) => (
            <ProductGridCard
              key={row._id || i}
              p={row}
              isReadOnly={isReadOnly}
              expandedRowId={expandedRowId}
              setExpandedRowId={setExpandedRowId}
              setEditRow={setEditRow}
              setShowModal={setShowModal}
              setConfirmId={setConfirmId}
              setConfirmType={setConfirmType}
              setSelectedProductDetailId={setSelectedProductDetailId}
            />
          ))}

          {/* Dotted "+" Card at the end of grid view */}
          {!isReadOnly && !search && statusFilter === "all" && selectedCategoryFilter === "all" && brandFilter === "all" && (
            <div 
              onClick={() => { setEditRow(null); setShowModal(true); }}
              className="bg-white border-2 border-dashed border-[#16a34a]/30 hover:border-[#16a34a] rounded-2xl p-6 flex flex-col items-center justify-between text-center cursor-pointer transition group min-h-[280px] relative overflow-hidden"
            >
              <div className="h-4" />
              
              <div className="flex flex-col items-center z-10">
                <div className="w-14 h-14 rounded-full bg-[#16a34a] text-white flex items-center justify-center mb-3 shadow-md group-hover:scale-105 transition">
                  <Plus size={24} strokeWidth={3} />
                </div>
                <h3 className="font-extrabold text-[#14532d] text-sm mt-2">Add New Product</h3>
                <p className="text-xs text-gray-400 font-medium mt-1">Click here to add product</p>
              </div>

              {/* Landscape agricultural pattern illustration at the bottom */}
              <svg className="w-full h-16 pointer-events-none mt-auto select-none" viewBox="0 0 400 100" preserveAspectRatio="none">
                <path d="M 0,65 Q 100,35 200,65 T 400,65 L 400,100 L 0,100 Z" fill="#f4fbf7" />
                <path d="M 0,75 Q 120,50 240,80 T 400,75 L 400,100 L 0,100 Z" fill="#e8f5e9" />
                <path d="M 0,85 Q 80,65 180,90 T 400,85 L 400,100 L 0,100 Z" fill="#c8e6c9" />
                <rect x="290" y="72" width="10" height="8" fill="#a1887f" />
                <polygon points="288,72 295,65 302,72" fill="#d84315" />
                <circle cx="80" cy="72" r="6" fill="#2e7d32" />
                <rect x="79" y="78" width="1.5" height="6" fill="#5d4037" />
                <circle cx="90" cy="76" r="4" fill="#1b5e20" />
                <rect x="89" y="80" width="1.5" height="4" fill="#5d4037" />
              </svg>
            </div>
          )}

          {!paginatedData.length && (
            <div className="col-span-full bg-white rounded-2xl p-20 text-center border border-gray-100 shadow-xs">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <Package size={24} className="text-gray-300" />
                </div>
                <p className="text-sm font-medium">No products found</p>
                <p className="text-xs text-gray-305">Try adjusting your search or filter options</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/30">
            <h2 className="font-bold text-gray-800 text-sm">Products & Live Stock</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-8">
                    #
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    MRP
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Live Qty
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Stock Value
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Expiry
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, i) => {
                  const stock = row._stock;
                  const inStockSystem = !!stock;
                  const qty = stock ? (stock.availableQuantity ?? 0) : null;

                  // Try multiple ways to get purchase price
                  const purchasePrice =
                    stock?.item?.purchasePrice ??
                    stock?.purchasePrice ??
                    stock?.item?.price ??
                    stock?.price ??
                    0;

                  const stockValue =
                    qty != null && purchasePrice ? qty * purchasePrice : 0;
                  const rawCat = row.productCategory || row.category || "";
                  const catLabel = rawCat ? rawCat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : null;
                  const catColors = {
                    insecticides: "bg-purple-50 text-purple-600 border-purple-100",
                    fungicides: "bg-blue-50 text-blue-600 border-blue-100",
                    fertilizers: "bg-green-50 text-green-700 border-green-100",
                    seeds: "bg-yellow-50 text-yellow-700 border-yellow-100",
                    herbicides: "bg-orange-50 text-orange-655 border-orange-105",
                    organic: "bg-teal-50 text-teal-650 border-teal-100",
                    animal_feed: "bg-amber-50 text-amber-700 border-amber-100",
                    tools: "bg-gray-100 text-gray-600 border-gray-200",
                    pgr: "bg-pink-50 text-pink-650 border-pink-100",
                    other: "bg-gray-50 text-gray-500 border-gray-200",
                  };
                  const catColorCls = catColors[rawCat.toLowerCase()] ?? "bg-indigo-50 text-indigo-650 border-indigo-100";
                  const isOOS = qty === 0;
                  const isLow = qty != null && qty > 0 && qty <= 5;
                  const rowBg = isOOS
                    ? "bg-red-50/30"
                    : isLow
                      ? "bg-orange-50/30"
                      : "";

                  // Debug log for first few rows if SuperAdmin
                  if (isSuperAdmin && i < 3) {
                    console.log(`[Inventory] Row ${i + 1} data:`, {
                      productName: row.productName,
                      hasStock: !!stock,
                      qty,
                      purchasePrice,
                      stockValue,
                      stockStructure: stock ? Object.keys(stock) : null,
                      itemStructure: stock?.item ? Object.keys(stock.item) : null,
                    });
                  }
                  return (
                    <Fragment key={row._id || i}>
                      <tr
                        className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${rowBg}`}
                      >
                        <td className="px-5 py-4 text-gray-400 text-xs font-medium cursor-pointer select-none" onClick={() => setExpandedRowId(expandedRowId === row._id ? null : row._id)}>
                          <div className="flex items-center gap-1.5 hover:text-brand-600 transition">
                            <span className={`text-[9px] transition-transform duration-200 ${expandedRowId === row._id ? "rotate-90 text-brand-500" : ""}`}>
                              ▶
                            </span>
                            {(currentPage - 1) * ITEMS_PER_PAGE + i + 1}
                          </div>
                        </td>
    
                        {/* Product */}
                        <td className="px-5 py-4 cursor-pointer" onClick={() => setSelectedProductDetailId(row._id)}>
                          <div className="flex items-center gap-3">
                            <ProductImage
                              url={row.productImages?.[0]?.url}
                              name={row.productName}
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-800 max-w-[200px] leading-snug">
                                {row.productName ?? "—"}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {row.brand ?? "No brand"}
                              </p>
                            </div>
                          </div>
                        </td>
    
                        {/* Category */}
                        <td className="px-5 py-4">
                          {catLabel ? (
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${catColorCls}`}>
                              {catLabel}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
    
                        {/* MRP */}
                        <td className="px-5 py-4 text-right">
                          <span className="font-semibold text-gray-800">
                            ₹{row.products?.[0]?.mrp ?? "—"}
                          </span>
                        </td>
    
                        {/* Live Qty */}
                        <td className="px-5 py-4 text-right">
                          {qty != null ? (
                            <div className="flex items-center justify-end gap-1">
                              <span
                                className={`text-base font-bold ${
                                  isOOS
                                    ? "text-red-500"
                                    : isLow
                                      ? "text-orange-500"
                                      : "text-brand-600"
                                }`}
                              >
                                {qty}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
    
                        {/* Stock Value */}
                        <td className="px-5 py-4 text-right">
                          {stockValue ? (
                            <span className="font-semibold text-gray-705">
                              ₹{stockValue.toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
    
                        {/* Expiry */}
                        <td className="px-5 py-4 text-xs">
                          <ExpiryCell date={stock?.item?.expiryDate ?? row.products?.[0]?.expiryDate} />
                        </td>
    
                        {/* Stock Badge */}
                        <td className="px-5 py-4 text-center">
                          <StockBadge
                            qty={qty ?? 0}
                            inStockSystem={inStockSystem}
                          />
                        </td>
    
                        {/* Status Badge */}
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                            row.isActive
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-gray-105 text-gray-550 border-gray-200"
                          }`}>
                            {row.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
    
                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelectedProductDetailId(row._id)}
                              className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600 transition"
                              title="View Details"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            {!isReadOnly && (
                              <button
                                onClick={() => {
                                  setConfirmId(row._id);
                                  setConfirmType("product");
                                }}
                                className="p-2 rounded-lg hover:bg-red-550/10 text-red-500 transition"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedRowId === row._id && (
                        <tr className="bg-gray-50/40">
                          <td colSpan="10" className="px-6 py-4 border-b border-gray-100">
                            <div className="space-y-4">
                              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                Product Variant Details ({row.products?.length || 0})
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(row.products || []).map((p, idx) => {
                                  const variantStock = (stockSummary || []).find(
                                    (s) => s.item?.variantId === p._id || s.item?._id === p._id || (
                                           s.item?.sourceRef === row._id &&
                                           String(s.item?.parameter).trim().toLowerCase() === String(p.parameter).trim().toLowerCase() &&
                                           String(s.item?.unit).trim().toLowerCase() === String(p.unit).trim().toLowerCase()
                                    )
                                  );
                                  const liveQty = variantStock ? (variantStock.availableQuantity ?? 0) : (p.quantity ?? 0);
                                  return (
                                    <div key={idx} className="bg-white border border-gray-150 rounded-xl p-4 shadow-sm space-y-3">
                                      <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                                        <div>
                                          <p className="font-bold text-gray-800 text-sm">
                                            {p.parameter || "Base"} {p.unit}
                                          </p>
                                          {p.itemCode && (
                                            <p className="text-xs text-gray-400 mt-0.5 font-mono">
                                              Item Code: {p.itemCode}
                                            </p>
                                          )}
                                        </div>
                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700">
                                          Stock: {liveQty}
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                        <div>
                                          <span className="text-gray-400 font-medium">MRP:</span>{" "}
                                          <span className="font-semibold text-gray-700">₹{p.mrp ?? "—"}</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-400 font-medium">Purchase Price:</span>{" "}
                                          <span className="font-semibold text-gray-700">₹{p.purchasePrice ?? "—"} ({p.purchasePriceTaxType || "Without Tax"})</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-400 font-medium">Sale Price:</span>{" "}
                                          <span className="font-semibold text-gray-700">₹{p.salePrice ?? "—"} ({p.salePriceTaxType || "Without Tax"})</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-400 font-medium">Discount:</span>{" "}
                                          <span className="font-semibold text-gray-700">
                                            {p.discountOnSalePrice ?? "0"}{p.discountType === "Percentage" ? "%" : " ₹"}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-400 font-medium">Wholesale Price:</span>{" "}
                                          <span className="font-semibold text-gray-700">₹{p.wholesalePrice ?? "—"} ({p.wholesalePriceTaxType || "Without Tax"})</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-400 font-medium">Min Wholesale Qty:</span>{" "}
                                          <span className="font-semibold text-gray-700">{p.minWholesaleQty ?? "—"}</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-400 font-medium">Min Stock level:</span>{" "}
                                          <span className="font-semibold text-gray-700">{p.minStockToMaintain ?? "—"}</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-400 font-medium">Location:</span>{" "}
                                          <span className="font-semibold text-gray-700">{p.location || "—"}</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-400 font-medium">Opening Cost:</span>{" "}
                                          <span className="font-semibold text-gray-700">₹{p.openingStockPrice ?? "—"}</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-400 font-medium">Valuation Date:</span>{" "}
                                          <span className="font-semibold text-gray-700">
                                            {p.asOfDate ? new Date(p.asOfDate).toLocaleDateString("en-IN") : "—"}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-400 font-medium">Purchase Date:</span>{" "}
                                          <span className="font-semibold text-gray-700">
                                            {p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString("en-IN") : "—"}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-400 font-medium">Expiry Date:</span>{" "}
                                          <span className="font-semibold text-gray-700">
                                            {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString("en-IN") : "—"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {!filteredData.length && (
                  <tr>
                    <td colSpan="11" className="text-center py-20">
                      <div className="flex flex-col items-center gap-3 text-gray-400">
                        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                          <Package size={24} className="text-gray-300" />
                        </div>
                        <p className="text-sm font-medium">No products found</p>
                        <p className="text-xs text-gray-300">
                          Try adjusting your search or filter
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAGINATION BAR */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3.5 bg-white rounded-2xl border border-gray-150 shadow-xs mt-4">
          <p className="text-xs font-medium text-gray-550">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} of{" "}
            {filteredData.length} products
          </p>
          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-gray-50 transition"
              title="Prev"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {(() => {
              const pages = [];
              if (totalPages <= 6) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                pages.push(1);
                if (currentPage > 3) {
                  pages.push("...");
                }
                const start = Math.max(2, currentPage - 1);
                const end = Math.min(totalPages - 1, currentPage + 1);
                for (let i = start; i <= end; i++) {
                  if (i !== 1 && i !== totalPages) {
                    if (pages[pages.length - 1] !== i) {
                      pages.push(i);
                    }
                  }
                }
                if (currentPage < totalPages - 2) {
                  if (pages[pages.length - 1] !== "...") {
                    pages.push("...");
                  }
                }
                if (pages[pages.length - 1] !== totalPages) {
                  pages.push(totalPages);
                }
              }

              return pages.map((p, idx) => {
                if (p === "...") {
                  return (
                    <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-gray-400 font-semibold select-none">
                      ...
                    </span>
                  );
                }
                return (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition duration-150 ${
                      p === currentPage
                        ? "bg-[#14532d] text-white shadow-sm"
                        : "border border-gray-200 hover:bg-gray-50 text-gray-700 bg-white"
                    }`}
                  >
                    {p}
                  </button>
                );
              });
            })()}

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p - 1 + 2)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-gray-50 transition"
              title="Next"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}


      {confirmId && (
        <ConfirmDialog
          message={
            confirmType === "product"
              ? "Delete this product?"
              : "Delete this stock item?"
          }
          subMessage="This action cannot be undone."
          onConfirm={confirmDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}

export default Inventory;

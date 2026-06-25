import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import {
  ChevronLeft,
  ChevronRight,
  ImageOff,
  RefreshCw,
  Tag,
  MapPin,
  Calendar,
  AlertTriangle,
  Layers,
  ArrowRight,
  ShoppingBag,
  Plus,
  Pencil,
  Video,
  Sprout,
  Play,
  CheckCircle,
  HelpCircle,
  Percent,
  FileText,
  TrendingUp,
  Shield,
  Leaf,
  Info,
  Heart,
  Settings
} from "lucide-react";
import { toggleProductStatus } from "../store/thunks/inventoryThunk";

const cropEmojis = {
  wheat: "🌾",
  rice: "🌾",
  paddy: "🌾",
  tomato: "🍅",
  potato: "🥔",
  chilli: "🌶️",
  grapes: "🍇",
  cotton: "☁️",
  maize: "🌽",
  corn: "🌽",
  onion: "🧅",
  garlic: "🧄",
  mustard: "🌱",
  sugarcane: "🎋"
};

const getCropEmoji = (cropName) => {
  const lower = String(cropName || "").toLowerCase().trim();
  return cropEmojis[lower] || "🌱";
};

// Target pests/crops helper based on category
const getTargetSpecs = (category, crops = []) => {
  const cat = String(category || "").toLowerCase();
  if (cat.includes("insect") || cat.includes("pest")) {
    return [
      { label: "Aphids", img: "https://images.unsplash.com/photo-1622839276536-6c1f1ec4b12b?auto=format&fit=crop&w=150&q=80" },
      { label: "Leafhoppers", img: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=150&q=80" },
      { label: "Caterpillars", img: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=150&q=80" }
    ];
  }
  if (cat.includes("fungi")) {
    return [
      { label: "Mildew", img: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=150&q=80" },
      { label: "Rust Disease", img: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=150&q=80" },
      { label: "Blight", img: "https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&w=150&q=80" }
    ];
  }
  if (cat.includes("fertil")) {
    return [
      { label: "Roots", img: "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=150&q=80" },
      { label: "Foliage", img: "https://images.unsplash.com/photo-1463171359919-31072989f438?auto=format&fit=crop&w=150&q=80" },
      { label: "Yield", img: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=150&q=80" }
    ];
  }
  return [
    { label: crops[0] || "Paddy", img: "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=150&q=80" },
    { label: crops[1] || "Wheat", img: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=150&q=80" },
    { label: crops[2] || "Cotton", img: "https://images.unsplash.com/photo-1594900508605-ff3605e5428a?auto=format&fit=crop&w=150&q=80" }
  ];
};

// Key benefits helper based on product name
const getBenefits = (productName) => {
  const name = String(productName || "").toLowerCase();
  if (name.includes("saaf") || name.includes("kem")) {
    return [
      {
        title: "Crop Protection",
        desc: "Protects crops from destructive fungal diseases.",
        icon: <Shield className="w-5 h-5 text-emerald-600" />
      },
      {
        title: "High Efficiency",
        desc: "Fast acting and long lasting effect.",
        icon: <TrendingUp className="w-5 h-5 text-emerald-600" />
      },
      {
        title: "Better Yield",
        desc: "Improves crop health and increases productivity.",
        icon: <Leaf className="w-5 h-5 text-emerald-600" />
      }
    ];
  }
  return [
    {
      title: "Crop Protection",
      desc: "Safeguards crops against critical agricultural threats.",
      icon: <Shield className="w-5 h-5 text-emerald-600" />
    },
    {
      title: "Eco Friendly",
      desc: "Gentle on soil profile and non-target organisms.",
      icon: <Leaf className="w-5 h-5 text-emerald-600" />
    },
    {
      title: "High Efficiency",
      desc: "Delivers maximum yield and uniform plant growth.",
      icon: <TrendingUp className="w-5 h-5 text-emerald-600" />
    }
  ];
};

export default function ProductDetailView({
  productId,
  products = [],
  stockSummary = [],
  isReadOnly = false,
  onBack,
  onEdit,
  onRefresh
}) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);
  const [viewingMediaType, setViewingMediaType] = useState("image");
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Find the active product
  const product = useMemo(() => {
    return products.find((p) => p._id === productId);
  }, [products, productId]);

  useEffect(() => {
    setActiveMediaIdx(0);
    setSelectedVariantIdx(0);
  }, [productId]);

  const variants = product?.products || [];
  const selectedVariant = variants[selectedVariantIdx] || null;

  // Resolve live stock for the selected variant
  const selectedVariantStock = useMemo(() => {
    if (!product || !selectedVariant) return null;
    return (stockSummary || []).find(
      (s) => s.item?.variantId === selectedVariant._id || s.item?._id === selectedVariant._id || (
         s.item?.sourceRef === product._id &&
         String(s.item?.parameter).trim().toLowerCase() === String(selectedVariant.parameter).trim().toLowerCase() &&
         String(s.item?.unit).trim().toLowerCase() === String(selectedVariant.unit).trim().toLowerCase()
      )
    );
  }, [stockSummary, product, selectedVariant]);

  const liveQty = selectedVariantStock ? (selectedVariantStock.availableQuantity ?? 0) : (selectedVariant?.quantity ?? 0);
  const isOOS = liveQty === 0;
  const isLow = liveQty > 0 && liveQty <= 5;

  const rawCat = product?.productCategory || product?.category || "";
  const catLabel = rawCat
    ? rawCat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "General";

  const handleToggleStatus = () => {
    if (!product) return;
    dispatch(toggleProductStatus({ id: product._id, isActive: !product.isActive }))
      .unwrap()
      .then(() => toast.success(`Marked ${!product.isActive ? "Active" : "Inactive"}`))
      .catch(() => toast.error("Failed to update status"));
  };

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <p className="text-gray-500 font-medium">Product details not found.</p>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-xl shadow-md hover:bg-brand-700 transition"
        >
          <ChevronLeft size={16} /> Back to Products
        </button>
      </div>
    );
  }

  // Unified Media compilation (images first, then videos)
  const images = product.productImages || [];
  const videos = product.productVideos || [];
  const totalMedia = [
    ...images.map(img => ({ type: 'image', url: img.url })),
    ...videos.map(vid => ({ type: 'video', url: vid.url }))
  ];

  const currentMedia = totalMedia[activeMediaIdx] || null;

  const handlePrevMedia = () => {
    if (totalMedia.length === 0) return;
    setActiveMediaIdx(prev => (prev - 1 + totalMedia.length) % totalMedia.length);
  };

  const handleNextMedia = () => {
    if (totalMedia.length === 0) return;
    setActiveMediaIdx(prev => (prev + 1) % totalMedia.length);
  };

  // Days left calculation
  const getDaysLeft = (expiryDateStr) => {
    if (!expiryDateStr) return "N/A";
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? `${diffDays} days left` : "Expired";
  };

  // Expiry Date Formatter
  const formatExpiryDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const targets = getTargetSpecs(rawCat, product.targetCrops);
  const benefits = getBenefits(product.productName);

  // Technical Details Split
  const techDetails = product.productTechnicalDetails
    ? product.productTechnicalDetails.split("\n").filter(line => line.trim())
    : ["Systemic fungicide", "Broad spectrum disease control", "Water soluble granules"];

  // How to use instructions
  const instructions = product.howToUse
    ? product.howToUse.split("\n").filter(line => line.trim())
    : [
        "Mix 2.5 gm per liter of water.",
        "Spray uniformly on the affected plant parts.",
        "Recommended during early signs of infection.",
        "Repeat after 10-14 days if required."
      ];

  const dynamicCrops = product.targetCrops && product.targetCrops.length > 0
    ? product.targetCrops
    : ["Wheat", "Rice", "Tomato", "Potato", "Chilli", "Grapes"];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 lg:px-4 py-4 animate-in fade-in duration-305 font-sans text-slate-805">
      
      {/* 1. Header Navigation */}
      <div className="flex flex-wrap justify-between items-center gap-4 py-1">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full border border-slate-205 flex items-center justify-center hover:bg-slate-50 transition active:scale-95 shadow-2xs bg-white"
            title="Go Back"
          >
            <ChevronLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              <span className="hover:text-slate-600 cursor-pointer" onClick={onBack}>Inventory</span>
              <span className="text-slate-300 font-light">&gt;</span>
              <span className="hover:text-slate-600 cursor-pointer" onClick={onBack}>{catLabel}</span>
              <span className="text-slate-300 font-light">&gt;</span>
              <span className="text-slate-550 font-extrabold">Product Details</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isReadOnly && (
            <>
              {/* Toggle Status Pill */}
              <button
                onClick={handleToggleStatus}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-55 text-xs font-extrabold text-slate-700 shadow-2xs transition"
              >
                <span className={`w-2.5 h-2.5 rounded-full ${product.isActive ? "bg-green-500" : "bg-slate-400"}`} />
                {product.isActive ? "Active" : "Inactive"}
              </button>

              {/* Edit Product */}
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-55 text-xs font-extrabold text-slate-700 bg-white transition shadow-2xs"
              >
                <Pencil size={13} className="text-slate-550" />
                Edit Product
              </button>
            </>
          )}

          {/* Three dots menu */}
          <button className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 text-slate-500 transition">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 2. Main split page container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Media Gallery Visual Card */}
        <div className="lg:col-span-4 bg-white border border-slate-150 rounded-3xl p-5 shadow-xs flex flex-col items-center">
          
          {/* Main Visual Box */}
          <div className="relative h-[300px] w-full bg-slate-50/50 border border-slate-100 rounded-2xl flex items-center justify-center overflow-hidden">
            
            {/* Main Visual Render */}
            {currentMedia?.type === "video" ? (
              <video
                src={currentMedia.url}
                controls
                className="max-h-[260px] max-w-[90%] object-contain rounded-xl bg-black pointer-events-auto"
              />
            ) : currentMedia?.type === "image" ? (
              <img
                src={currentMedia.url}
                alt={product.productName}
                className="max-h-[260px] max-w-[90%] object-contain mix-blend-multiply transition duration-300"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400">
                <ImageOff size={48} className="stroke-[1.5]" />
                <span className="text-xs font-bold mt-2">No Image Uploaded</span>
              </div>
            )}

            {/* Left/Right Navigation Chevrons */}
            {totalMedia.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevMedia}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-slate-200 bg-white/90 backdrop-blur-xs flex items-center justify-center text-slate-600 hover:bg-white hover:scale-105 active:scale-95 transition shadow-xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMedia}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-slate-200 bg-white/90 backdrop-blur-xs flex items-center justify-center text-slate-600 hover:bg-white hover:scale-105 active:scale-95 transition shadow-xs"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Gallery Thumbnails Strip */}
          {totalMedia.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {totalMedia.map((m, idx) => {
                const isSelected = activeMediaIdx === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveMediaIdx(idx)}
                    className={`w-12 h-12 rounded-lg border overflow-hidden transition relative ${
                      isSelected
                        ? "border-2 border-emerald-605 border-emerald-600 shadow-xs scale-102"
                        : "border-slate-200 hover:border-slate-350 hover:scale-102"
                    }`}
                  >
                    {m.type === "video" ? (
                      <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white relative">
                        <Play size={14} className="text-white fill-current" />
                        <span className="absolute bottom-0 right-0 bg-black/60 text-[7px] text-white px-0.5 font-bold uppercase rounded-tl-sm">Vid</span>
                      </div>
                    ) : (
                      <img src={m.url} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Camera & Video Count Footer Labels */}
          <div className="flex items-center justify-center gap-6 mt-4 pt-1 text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {images.length} Photo{images.length !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1.5">
              <Video className="w-4 h-4 text-slate-400" />
              {videos.length} Video{videos.length !== 1 ? "s" : ""}
            </span>
          </div>

        </div>

        {/* Right Side: Product Details Header, Metrics Grid & Action Buttons */}
        <div className="lg:col-span-8 bg-white border border-slate-150 rounded-3xl p-6 shadow-xs space-y-5">
          
          {/* Tag Pills, Title, Brand Subtitle & Heart Wishlist */}
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-bold text-emerald-705 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider border border-emerald-100">
                  {product.productName}
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">
                  {catLabel}
                </span>
              </div>
              <h2 className="text-3xl font-extrabold text-slate-905 tracking-tight leading-none uppercase">
                {product.productName}
              </h2>
              <p className="text-sm font-bold text-slate-400 mt-1">
                {product.brand || "Unknown"} Brand
              </p>

              {/* Trusted badge */}
              <div className="inline-flex items-center gap-1 bg-emerald-50/50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-lg text-[10px] font-bold mt-2">
                <Shield className="w-3.5 h-3.5 text-emerald-600 fill-emerald-50" />
                Trusted Product
              </div>
            </div>

            {/* Wishlist button */}
            <button
              onClick={() => {
                setIsWishlisted(!isWishlisted);
                toast.success(isWishlisted ? "Removed from Wishlist" : "Added to Wishlist");
              }}
              className={`flex items-center gap-1 px-3 py-1.5 border rounded-xl text-xs font-bold transition ${
                isWishlisted
                  ? "bg-red-50 border-red-200 text-red-600"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isWishlisted ? "fill-current" : ""}`} />
              Add to Wishlist
            </button>
          </div>

          {/* Four Metrics Summary Cards Grid */}
          {selectedVariant && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
              
              {/* Card 1: Selling Price */}
              <div className="bg-slate-50/40 border border-slate-150 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Selling Price</span>
                  <div className="flex items-baseline gap-1.5 flex-wrap mt-1">
                    <h3 className="text-2xl font-black text-emerald-650">
                      ₹{Number(selectedVariant.salePrice).toLocaleString("en-IN")}
                    </h3>
                    {Number(selectedVariant.mrp) > Number(selectedVariant.salePrice) && (
                      <span className="text-slate-400 text-xs line-through font-semibold">
                        ₹{Number(selectedVariant.mrp).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                  {Number(selectedVariant.mrp) > Number(selectedVariant.salePrice) && (
                    <span className="text-[9px] text-emerald-600 font-extrabold uppercase tracking-wider mt-0.5 block">
                      {Math.round(((Number(selectedVariant.mrp) - Number(selectedVariant.salePrice)) / Number(selectedVariant.mrp)) * 100)}% Off
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 font-semibold mt-1 font-bold">
                  ({selectedVariant.salePriceTaxType || "Without Tax"})
                </span>
              </div>

              {/* Card 2: Purchase Price */}
              <div className="bg-slate-50/40 border border-slate-150 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Purchase Price</span>
                  <h3 className="text-2xl font-black text-slate-900 mt-1.5">
                    ₹{Number(selectedVariant.purchasePrice).toLocaleString("en-IN")}
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold mt-1 font-bold">
                  ({selectedVariant.purchasePriceTaxType || "Without Tax"})
                </span>
              </div>

              {/* Card 3: Stock Available */}
              <div className="bg-slate-50/40 border border-slate-150 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Stock Available</span>
                  <h3 className="text-2xl font-black text-blue-600 mt-1.5">
                    {liveQty} <span className="text-xs font-bold text-slate-500">Units</span>
                  </h3>
                </div>
                <div className="mt-1">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                    isOOS 
                      ? "bg-red-50 text-red-750 border border-red-100" 
                      : isLow 
                        ? "bg-amber-50 text-amber-705 border border-amber-100" 
                        : "bg-green-50 text-green-705 border border-green-100"
                  }`}>
                    <CheckCircle className="w-2.5 h-2.5" />
                    {isOOS ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
                  </span>
                </div>
              </div>

              {/* Card 4: Expiry Date */}
              <div className="bg-slate-50/40 border border-slate-150 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Expiry Date</span>
                  <h3 className="text-sm font-black text-orange-655 mt-2.5 leading-snug">
                    {formatExpiryDate(selectedVariant.expiryDate)}
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 font-bold mt-1.5 truncate">
                  {getDaysLeft(selectedVariant.expiryDate)}
                </span>
              </div>

            </div>
          )}

          {/* Full Height Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <button
              onClick={() => navigate(`/purchase?action=new-bill&productId=${product._id}`)}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl transition shadow-xs active:scale-98 text-left"
            >
              <ShoppingBag size={20} className="stroke-[2] shrink-0" />
              <div>
                <div className="font-extrabold text-sm leading-tight">Purchase Stock</div>
                <div className="text-[10px] text-emerald-100 font-semibold mt-0.5">Add new stock</div>
              </div>
            </button>

            <button
              onClick={() => navigate(`/sell?productId=${product._id}`)}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-blue-650 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition shadow-xs active:scale-98 text-left"
            >
              <Tag size={20} className="stroke-[2] shrink-0" />
              <div>
                <div className="font-extrabold text-sm leading-tight">Create Sale</div>
                <div className="text-[10px] text-blue-105 text-blue-100 font-semibold mt-0.5">Sell this product</div>
              </div>
            </button>
          </div>

          {/* Variants Table list */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Available Variants ({variants.length})
              </h3>
              {!isReadOnly && (
                <button
                  onClick={onEdit}
                  className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-xl text-[10px] font-bold text-emerald-700 bg-white hover:bg-slate-50 transition shadow-2xs"
                >
                  <Settings size={12} className="text-slate-400" />
                  Manage Variants
                </button>
              )}
            </div>

            <div className="border border-slate-150 rounded-2xl overflow-hidden">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-150 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Pack Size</th>
                    <th className="px-4 py-3 text-right">MRP</th>
                    <th className="px-4 py-3 text-right">Sale Price</th>
                    <th className="px-4 py-3 text-right">Stock</th>
                    <th className="px-4 py-3 text-right">Min Stock</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Expiry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {variants.map((v, idx) => {
                    const isSelected = selectedVariantIdx === idx;
                    const vStock = (stockSummary || []).find(
                      (s) => s.item?.variantId === v._id || s.item?._id === v._id || (
                             s.item?.sourceRef === product._id &&
                             String(s.item?.parameter).trim().toLowerCase() === String(v.parameter).trim().toLowerCase() &&
                             String(s.item?.unit).trim().toLowerCase() === String(v.unit).trim().toLowerCase()
                      )
                    );
                    const vStockQty = vStock ? (vStock.availableQuantity ?? 0) : (v.quantity ?? 0);
                    return (
                      <tr
                        key={idx}
                        onClick={() => setSelectedVariantIdx(idx)}
                        className={`hover:bg-slate-50/50 cursor-pointer transition ${
                          isSelected ? "bg-emerald-50/30 hover:bg-emerald-50/45 font-bold" : ""
                        }`}
                      >
                        <td className="px-4 py-3 font-extrabold text-slate-808 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3h6M12 3v3M8 6h8v2a4 4 0 01-4 4H12a4 4 0 01-4-4V6z M7 11h10v10H7z" />
                          </svg>
                          {v.parameter} {v.unit}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 font-semibold">₹{v.mrp}</td>
                        <td className="px-4 py-3 text-right font-extrabold text-slate-805">₹{v.salePrice}</td>
                        <td className={`px-4 py-3 text-right font-bold ${vStockQty === 0 ? "text-red-500" : "text-emerald-700"}`}>
                          {vStockQty} Units
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 font-bold">{v.minStockToMaintain ?? "10"} Units</td>
                        <td className="px-4 py-3 text-slate-550 font-semibold">{v.location || "Aisle 3"}</td>
                        <td className="px-4 py-3 text-orange-655 font-bold">{formatExpiryDate(v.expiryDate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      {/* 3. Bottom Cards Section Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Card 1: Product Information */}
        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-xs flex flex-col space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Layers className="w-4.5 h-4.5 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-805 uppercase tracking-wider">Product Information</h3>
          </div>
          
          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <span className="text-slate-400 font-bold">Brand</span>
              <span className="font-extrabold text-slate-800">{product.brand || "—"}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <span className="text-slate-400 font-bold">Category</span>
              <span className="font-extrabold text-slate-800">{catLabel}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <span className="text-slate-400 font-bold">Item Type</span>
              <span className="font-extrabold text-slate-800 uppercase">{product.itemType || "PRODUCT"}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <span className="text-slate-400 font-bold">HSN Code</span>
              <span className="font-extrabold text-slate-800 font-mono">{product.hsnCode || "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-bold">Tax Rate</span>
              <span className="font-extrabold text-slate-800">
                {product.taxRate && product.taxRate !== "None" ? `${product.taxRate}%` : "0%"}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: About Product */}
        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-xs flex flex-col space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Info className="w-4.5 h-4.5 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-805 uppercase tracking-wider">About Product</h3>
          </div>
          <p className="text-slate-600 text-xs leading-relaxed font-semibold">
            {product.description || `${product.productName} is an FPO certified farming support item designed to increase yield efficiency and provide top class protection.`}
          </p>
          
          <div className="space-y-2.5 pt-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Technical Details</span>
            <ul className="list-disc pl-4 text-xs font-bold text-slate-700 space-y-1">
              {techDetails.map((td, idx) => (
                <li key={idx}>{td}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Card 3: Target Crops */}
        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-xs flex flex-col space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sprout className="w-4.5 h-4.5 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-805 uppercase tracking-wider">Target Crops</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            {dynamicCrops.map((crop, idx) => (
              <div key={idx} className="flex items-center gap-2 px-3 py-2 border border-slate-150 rounded-xl text-xs font-extrabold bg-slate-50/50 hover:bg-slate-55 transition">
                <span className="text-base">{getCropEmoji(crop)}</span>
                <span className="text-slate-750 truncate capitalize">{crop}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 4: How To Use */}
        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-xs flex flex-col space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <HelpCircle className="w-4.5 h-4.5 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-855 uppercase tracking-wider">How To Use</h3>
          </div>
          <div className="space-y-3.5 pt-1 text-xs">
            {instructions.map((inst, idx) => (
              <div key={idx} className="flex gap-2.5 items-start">
                <span className="w-5 h-5 rounded-full bg-emerald-650 bg-emerald-600 text-white font-extrabold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <p className="text-slate-600 leading-snug font-semibold">{inst}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 4. Key Benefits & Compliance Details Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Key Benefits Card */}
        <div className="lg:col-span-7 bg-white border border-slate-150 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Shield className="w-4.5 h-4.5 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-805 uppercase tracking-wider">Key Benefits</h3>
          </div>
          
          {product.productBenefits ? (
            <p className="text-slate-650 text-xs leading-relaxed whitespace-pre-line font-semibold bg-slate-50/50 p-4 border border-slate-150 rounded-2xl">
              {product.productBenefits}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {benefits.map((b, idx) => (
                <div key={idx} className="bg-slate-50/30 border border-slate-150 rounded-2xl p-4 flex flex-col items-start gap-3 transition duration-150 hover:bg-slate-50/40">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-50 text-emerald-650 shrink-0">
                    {b.icon}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-808 text-xs">{b.title}</h4>
                    <p className="text-slate-400 text-[10px] font-semibold leading-relaxed mt-1">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Compliance Details Card */}
        {selectedVariant && (
          <div className="lg:col-span-5 bg-white border border-slate-150 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="w-4.5 h-4.5 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-805 uppercase tracking-wider">Compliance Details</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs pt-1">
              <div className="flex flex-col gap-1 bg-slate-50/50 border border-slate-100 p-3 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Item Type</span>
                <span className="font-extrabold text-slate-705 uppercase leading-none mt-1">{product.itemType || "PRODUCT"}</span>
              </div>
              <div className="flex flex-col gap-1 bg-slate-50/50 border border-slate-100 p-3 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">HSN Code</span>
                <span className="font-extrabold text-slate-705 font-mono leading-none mt-1">{product.hsnCode || "—"}</span>
              </div>
              <div className="flex flex-col gap-1 bg-slate-50/50 border border-slate-100 p-3 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tax Rate</span>
                <span className="font-extrabold text-slate-705 leading-none mt-1">
                  {product.taxRate && product.taxRate !== "None" ? `${product.taxRate}%` : "0%"}
                </span>
              </div>
              <div className="flex flex-col gap-1 bg-slate-50/50 border border-slate-100 p-3 rounded-xl col-span-2 md:col-span-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Purchase Tax</span>
                <span className="font-extrabold text-slate-705 leading-none mt-1">{selectedVariant.purchasePriceTaxType || "Without Tax"}</span>
              </div>
              <div className="flex flex-col gap-1 bg-slate-50/50 border border-slate-100 p-3 rounded-xl col-span-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sale Tax</span>
                <span className="font-extrabold text-slate-705 leading-none mt-1">{selectedVariant.salePriceTaxType || "Without Tax"}</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 5. Footer Decorative Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-green-700 text-white rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center overflow-hidden relative shadow-md">
        
        {/* Content on left */}
        <div className="flex items-center gap-4 z-10">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 shadow-inner">
            <Sprout className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <div className="space-y-1">
            <h4 className="font-black text-sm md:text-base tracking-wide leading-tight">
              Supporting Farmers, Strengthening Communities
            </h4>
            <p className="text-emerald-100 text-[10px] md:text-xs font-semibold tracking-wide">
              Quality Products &bull; Fair Prices &bull; Better Yield
            </p>
          </div>
        </div>

        {/* Right Graphic element: Tractor */}
        <div className="hidden md:flex items-center gap-4 relative pr-4 z-10 mt-4 md:mt-0">
          <div className="text-right">
            <span className="text-emerald-200 text-[10px] font-black uppercase tracking-wider block">FPO Certified</span>
            <span className="text-white text-xs font-extrabold">Quality Assured</span>
          </div>
          <div className="w-12 h-12 bg-white/10 backdrop-blur-xs rounded-full flex items-center justify-center text-2xl shadow-inner border border-white/20 hover:scale-110 duration-350 transition select-none">
            🚜
          </div>
        </div>

        {/* Decorative backdrop hills/shapes */}
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-emerald-500/10 pointer-events-none skew-x-12 z-0" />
      </div>

    </div>
  );
}

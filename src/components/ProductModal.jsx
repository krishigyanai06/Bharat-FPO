import { useEffect, useState, useMemo, useRef, Fragment } from "react";
import toast from "react-hot-toast";
import {
  X,
  Trash2,
  Plus,
  Percent,
  Search,
  CheckCircle,
  Info,
  Leaf,
  ClipboardList,
  Image,
  Video,
  Sprout,
  Save,
  Download,
  Package
} from "lucide-react";
import api from "../lib/api";

const FIELD = ({ label, required, helperText, children }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1.5">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {helperText && (
      <p className="text-[10px] text-gray-400 mt-1 leading-normal">
        {helperText}
      </p>
    )}
  </div>
);

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition";

function VariantFormItem({ variant, index, isEdit, onUpdate, onRemove, showRemove }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Card Header */}
      <div className="flex justify-between items-center bg-gray-50 border-b border-gray-200 px-4 py-3">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 font-semibold text-sm text-gray-700 hover:text-brand-600 transition"
        >
          <span className={`text-[10px] text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}>
            ▶
          </span>
          Variant #{index + 1}
        </button>
        {showRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Card Body */}
      {isOpen && (
        <div className="p-4 space-y-4">
          {/* Row 1 (5 items) */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <FIELD label="Size / Measure" required helperText="Numeric measure (e.g. 500, 1)">
              <input
                value={variant.parameter}
                onChange={(e) => onUpdate("parameter", e.target.value)}
                className={inputCls}
                placeholder="e.g. 500"
              />
            </FIELD>
            <FIELD label="Unit" required helperText="Measurement unit (e.g. ml, kg)">
              <select
                value={variant.unit}
                onChange={(e) => onUpdate("unit", e.target.value)}
                className={inputCls}
              >
                <option value="">Select unit</option>
                <option value="ml">ml</option>
                <option value="L">L</option>
                <option value="kg">kg</option>
                <option value="gm">gm</option>
                <option value="pcs">pcs</option>
                <option value="box">box</option>
              </select>
            </FIELD>
            <FIELD label="MRP" required helperText="Max printed retail price">
              <input
                type="number"
                min="0"
                value={variant.mrp}
                onChange={(e) => onUpdate("mrp", e.target.value)}
                className={inputCls}
                placeholder="Enter MRP"
              />
            </FIELD>
            <FIELD label="Stock Quantity" required helperText="Available unit count">
              <input
                type="number"
                min="0"
                value={variant.quantity}
                onChange={(e) => onUpdate("quantity", e.target.value)}
                className={inputCls}
                placeholder="Enter quantity"
              />
            </FIELD>
            <FIELD label="Item Code / SKU" required helperText="Unique barcode identifier">
              <input
                value={variant.itemCode}
                onChange={(e) => onUpdate("itemCode", e.target.value)}
                className={inputCls}
                placeholder="Enter item code"
              />
            </FIELD>
          </div>
 
          {/* Row 2 (4 items) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <FIELD label="Purchase Price" required helperText="Cost price per unit paid">
              <input
                type="number"
                min="0"
                value={variant.purchasePrice}
                onChange={(e) => onUpdate("purchasePrice", e.target.value)}
                className={inputCls}
                placeholder="Purchase price"
              />
            </FIELD>
            <FIELD label="Purchase Tax Type" required helperText="Tax inclusion details">
              <select
                value={variant.purchasePriceTaxType}
                onChange={(e) => onUpdate("purchasePriceTaxType", e.target.value)}
                className={inputCls}
              >
                <option value="Without Tax">Without Tax</option>
                <option value="With Tax">With Tax</option>
              </select>
            </FIELD>
            <FIELD label="Purchase Date" required helperText="Date stock was acquired">
              <input
                type="date"
                value={variant.purchaseDate}
                onChange={(e) => onUpdate("purchaseDate", e.target.value)}
                className={inputCls}
              />
            </FIELD>
            <FIELD label="Expiry Date" required helperText="Variant shelf life limit">
              <input
                type="date"
                value={variant.expiryDate}
                onChange={(e) => onUpdate("expiryDate", e.target.value)}
                className={inputCls}
              />
            </FIELD>
          </div>
 
          {/* Row 3 (4 items) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <FIELD label="Sale Price" required helperText="Retail selling price per unit">
              <input
                type="number"
                min="0"
                value={variant.salePrice}
                onChange={(e) => onUpdate("salePrice", e.target.value)}
                className={inputCls}
                placeholder="Sale price"
              />
            </FIELD>
            <FIELD label="Sale Tax Type" required helperText="Tax inclusion details">
              <select
                value={variant.salePriceTaxType}
                onChange={(e) => onUpdate("salePriceTaxType", e.target.value)}
                className={inputCls}
              >
                <option value="Without Tax">Without Tax</option>
                <option value="With Tax">With Tax</option>
              </select>
            </FIELD>
            <FIELD label="Retail Discount" helperText="Discount value applied to sale">
              <input
                type="number"
                min="0"
                value={variant.discountOnSalePrice}
                onChange={(e) => onUpdate("discountOnSalePrice", e.target.value)}
                className={inputCls}
                placeholder="Discount value"
              />
            </FIELD>
            <FIELD label="Discount Type" helperText="Percentage or fixed amount">
              <select
                value={variant.discountType}
                onChange={(e) => onUpdate("discountType", e.target.value)}
                className={inputCls}
              >
                <option value="Percentage">Percentage</option>
                <option value="Fixed Amount">Fixed Amount</option>
              </select>
            </FIELD>
          </div>
 
          {/* Row 4 (3 items) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <FIELD label="Wholesale Price" helperText="Price charged for bulk quantity purchases">
                <input
                  type="number"
                  min="0"
                  value={variant.wholesalePrice}
                  onChange={(e) => onUpdate("wholesalePrice", e.target.value)}
                  className={inputCls}
                  placeholder="Wholesale price"
                />
              </FIELD>
            </div>
            <FIELD label="Wholesale Tax Type" helperText="Tax inclusion details">
              <select
                value={variant.wholesalePriceTaxType}
                onChange={(e) => onUpdate("wholesalePriceTaxType", e.target.value)}
                className={inputCls}
              >
                <option value="Without Tax">Without Tax</option>
                <option value="With Tax">With Tax</option>
              </select>
            </FIELD>
            <FIELD label="Min Wholesale Qty" helperText="Min units required for bulk price">
              <input
                type="number"
                min="0"
                value={variant.minWholesaleQty}
                onChange={(e) => onUpdate("minWholesaleQty", e.target.value)}
                className={inputCls}
                placeholder="Min qty"
              />
            </FIELD>
          </div>
 
          {/* Row 5 (4 items) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <FIELD label="Opening Stock Price" helperText="Cost valuation at initialization date">
              <input
                type="number"
                min="0"
                value={variant.openingStockPrice}
                onChange={(e) => onUpdate("openingStockPrice", e.target.value)}
                className={inputCls}
                placeholder="Opening stock price"
              />
            </FIELD>
            <FIELD label="As Of Date" helperText="Valuation date of opening stock">
              <input
                type="date"
                value={variant.asOfDate}
                onChange={(e) => onUpdate("asOfDate", e.target.value)}
                className={inputCls}
              />
            </FIELD>
            <FIELD label="Min Stock to Maintain" helperText="Notify when stock falls below this">
              <input
                type="number"
                min="0"
                value={variant.minStockToMaintain}
                onChange={(e) => onUpdate("minStockToMaintain", e.target.value)}
                className={inputCls}
                placeholder="Min stock level"
              />
            </FIELD>
            <FIELD label="Storage Location" helperText="Shelf/aisle in warehouse (e.g. Aisle 3)">
              <input
                value={variant.location}
                onChange={(e) => onUpdate("location", e.target.value)}
                className={inputCls}
                placeholder="e.g. Aisle 3"
              />
            </FIELD>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProductModal({ initial, onClose, onSave, saving }) {
  const p0 = initial?.products?.[0];

  const getInitialCategory = (initial) => {
    if (!initial) return "";
    const cat = (initial.productCategory || initial.category || "").toLowerCase();
    if (cat === "pesticides") return "insecticides";
    return cat;
  };

  const [form, setForm] = useState(
    initial
      ? {
          productName: initial.productName ?? "",
          description: initial.description ?? "",
          brand: initial.brand ?? "",
          productCategory: getInitialCategory(initial),
          productTechnicalDetails: initial.productTechnicalDetails ?? "",
          howToUse: initial.howToUse ?? "",
          productBenefits: initial.productBenefits ?? "",
          itemType: initial.itemType ?? "PRODUCT",
          hsnCode: initial.hsnCode ?? "",
          taxRate: initial.taxRate ?? "",
        }
      : {
          productName: "",
          description: "",
          brand: "",
          productCategory: "",
          productTechnicalDetails: "",
          howToUse: "",
          productBenefits: "",
          itemType: "PRODUCT",
          hsnCode: "",
          taxRate: "",
        },
  );

  // Product variants state
  const [variants, setVariants] = useState(() => {
    if (initial?.products?.length > 0) {
      return initial.products.map((p) => ({
        _id: p._id,
        unit: p.unit ?? "",
        parameter: p.parameter ?? p.sku ?? "",
        mrp: p.mrp ?? "",
        quantity: p.quantity ?? "",
        purchaseDate: p.purchaseDate ? p.purchaseDate.split("T")[0] : "",
        expiryDate: p.expiryDate ? p.expiryDate.split("T")[0] : "",
        itemCode: p.itemCode ?? "",
        purchasePrice: p.purchasePrice ?? "",
        purchasePriceTaxType: p.purchasePriceTaxType ?? "Without Tax",
        salePrice: p.salePrice ?? "",
        salePriceTaxType: p.salePriceTaxType ?? "Without Tax",
        discountOnSalePrice: p.discountOnSalePrice ?? "",
        discountType: p.discountType ?? "Percentage",
        wholesalePrice: p.wholesalePrice ?? "",
        wholesalePriceTaxType: p.wholesalePriceTaxType ?? "Without Tax",
        minWholesaleQty: p.minWholesaleQty ?? "",
        openingStockPrice: p.openingStockPrice ?? "",
        asOfDate: p.asOfDate ? p.asOfDate.split("T")[0] : "",
        minStockToMaintain: p.minStockToMaintain ?? "",
        location: p.location ?? "",
      }));
    }
    return [
      {
        unit: "",
        parameter: "",
        mrp: "",
        quantity: "",
        purchaseDate: "",
        expiryDate: "",
        itemCode: "",
        purchasePrice: "",
        purchasePriceTaxType: "Without Tax",
        salePrice: "",
        salePriceTaxType: "Without Tax",
        discountOnSalePrice: "",
        discountType: "Percentage",
        wholesalePrice: "",
        wholesalePriceTaxType: "Without Tax",
        minWholesaleQty: "",
        openingStockPrice: "",
        asOfDate: "",
        minStockToMaintain: "",
        location: "",
      },
    ];
  });

  const [images, setImages] = useState(() => {
    if (initial?.productImages?.length > 0) {
      return initial.productImages.map((img) => ({
        url: typeof img === "string" ? img : img.url,
        file: null,
      }));
    }
    return [];
  });
  const [dragOver, setDragOver] = useState(false);
  const [videos, setVideos] = useState(() => {
    if (initial?.productVideos?.length > 0) {
      return initial.productVideos.map((vid) => ({
        url: typeof vid === "string" ? vid : vid.url,
        file: null,
      }));
    }
    return [];
  });
  const [videoDragOver, setVideoDragOver] = useState(false);

  // Reset image/video state when modal opens
  useEffect(() => {
    if (!initial) {
      setImages([]);
      setVideos([]);
    } else {
      setImages(
        (initial.productImages || []).map((img) => ({
          url: typeof img === "string" ? img : img.url,
          file: null,
        }))
      );
      setVideos(
        (initial.productVideos || []).map((vid) => ({
          url: typeof vid === "string" ? vid : vid.url,
          file: null,
        }))
      );
    }
  }, [initial]);

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // HSN and GST integration states
  const [gstSlabs, setGstSlabs] = useState([0, 5, 12, 18, 28]);
  const [hsnSearchVal, setHsnSearchVal] = useState(initial?.hsnCode ?? "");
  const [hsnSuggestions, setHsnSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showBrowseModal, setShowBrowseModal] = useState(false);
  const hsnCache = useRef({});
  const [selectedHsnRecord, setSelectedHsnRecord] = useState(
    initial?.hsnCode ? { code: initial.hsnCode, description: initial.hsnDescription || "" } : null
  );

  // States for Browse Modal
  const [browseSearchVal, setBrowseSearchVal] = useState("");
  const [browseResults, setBrowseResults] = useState([]);
  const [loadingBrowse, setLoadingBrowse] = useState(false);
  const [browseCategory, setBrowseCategory] = useState("");
  const autocompleteRef = useRef(null);

  // Close autocomplete on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. Fetch dynamic GST rate slabs
  useEffect(() => {
    api.get("/hsn/gst-rates")
      .then(res => {
        const rates = res.data?.data || res.data;
        if (Array.isArray(rates)) {
          setGstSlabs(rates.map(Number));
        }
      })
      .catch(err => console.warn("Failed to fetch GST slabs, using defaults", err));
  }, []);

  // 2. Debounce HSN autocomplete query with caching and >=3 character length check
  useEffect(() => {
    const query = hsnSearchVal.trim();
    if (query.length < 3) {
      setHsnSuggestions([]);
      return;
    }
    
    // Check in-memory cache first
    if (hsnCache.current[query]) {
      setHsnSuggestions(hsnCache.current[query]);
      setShowSuggestions(true);
      return;
    }
    
    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await api.get(`/hsn/list?search=${query}&limit=50`); // fetch larger set to allow client-side filtering/ranking
        const list = res.data?.data || res.data || [];
        
        // 1. Filter out detailed child categories unless the user is specifically typing a long code
        const isNumericLongCode = /^\d+$/.test(query) && query.length >= 6;
        let filtered = list;
        if (!isNumericLongCode) {
          filtered = list.filter(item => 
            String(item.code).length <= 4 || 
            item.isParentCategory === true
          );
        }
        
        // 2. Rank results by exact code match, category relevance, and description match strength
        const scoreResult = (item, queryText, productCategory) => {
          let score = 0;
          const code = String(item.code);
          const desc = String(item.description).toLowerCase();
          const q = queryText.toLowerCase();
          
          // Exact code match
          if (code === q) score += 1000;
          else if (code.startsWith(q)) score += 500;
          
          // Category keyword match (e.g. insecticides, fertilizers, etc.)
          if (productCategory) {
            // Map common display categories to descriptions keywords
            const categoryKeywords = {
              "fertilizers": ["fertilizer", "manure", "phosphate", "nitrogen", "potash"],
              "seeds": ["seed", "grain", "sowing", "sprout"],
              "insecticides": ["insecticide", "pesticide", "disinfectant", "fungicide", "herbicide"],
              "organic": ["organic", "compost", "bio"],
              "animal_feed": ["feed", "fodder", "bran", "cake", "straw"],
              "fungicides": ["fungicide", "disinfectant"],
              "herbicides": ["herbicide", "weedicide"],
              "tools": ["tool", "implement", "machinery", "tractor", "plow"]
            };
            const keywords = categoryKeywords[String(productCategory).toLowerCase()] || [String(productCategory).toLowerCase().substring(0, 5)];
            const hasKeyword = keywords.some(k => desc.includes(k));
            if (hasKeyword) score += 200;
          }
          
          // Description match strength
          if (desc === q) score += 50;
          else if (desc.startsWith(q)) score += 30;
          else if (desc.includes(q)) score += 10;
          
          return score;
        };
        
        filtered.sort((a, b) => 
          scoreResult(b, query, form.productCategory) - 
          scoreResult(a, query, form.productCategory)
        );
        
        // Take top 8 ranked suggestions
        const topResults = filtered.slice(0, 8);
        
        // Cache results
        hsnCache.current[query] = topResults;
        setHsnSuggestions(topResults);
        setShowSuggestions(true);
      } catch (err) {
        console.warn("HSN search failed", err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [hsnSearchVal, form.productCategory]);

  // 3. Debounce HSN query for Browse Modal
  useEffect(() => {
    if (!showBrowseModal) return;
    
    const query = browseSearchVal.trim();
    
    if (query.length < 3 && !browseCategory) {
      setBrowseResults([]);
      return;
    }
    
    const searchParam = query || browseCategory;
    const timer = setTimeout(async () => {
      setLoadingBrowse(true);
      try {
        const res = await api.get(`/hsn/list?search=${searchParam}&limit=30`);
        const list = res.data?.data || res.data || [];
        setBrowseResults(list);
      } catch (err) {
        console.warn("Browse query failed", err);
      } finally {
        setLoadingBrowse(false);
      }
    }, 350);
    
    return () => clearTimeout(timer);
  }, [browseSearchVal, browseCategory, showBrowseModal]);

  // 4. Selection handler
  const handleSelectHsn = (item) => {
    setF("hsnCode", item.code);
    setF("taxRate", String(item.gstRate ?? item.taxRate ?? ""));
    setHsnSearchVal(item.code);
    setSelectedHsnRecord(item);
    setShowSuggestions(false);
    toast.success(`Selected HSN ${item.code} (${item.gstRate ?? item.taxRate}% GST)`);
  };

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        unit: "",
        parameter: "",
        mrp: "",
        quantity: "",
        purchaseDate: "",
        expiryDate: "",
        itemCode: "",
        purchasePrice: "",
        purchasePriceTaxType: "Without Tax",
        salePrice: "",
        salePriceTaxType: "Without Tax",
        discountOnSalePrice: "",
        discountType: "Percentage",
        wholesalePrice: "",
        wholesalePriceTaxType: "Without Tax",
        minWholesaleQty: "",
        openingStockPrice: "",
        asOfDate: "",
        minStockToMaintain: "",
        location: "",
      },
    ]);
  };

  const removeVariant = (index) => {
    if (variants.length > 1) {
      setVariants((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updateVariant = (index, field, value) => {
    setVariants((prev) =>
      prev.map((variant, i) =>
        i === index ? { ...variant, [field]: value } : variant,
      ),
    );
  };

  const handleImagesSelect = (filesList) => {
    if (!filesList) return;
    const array = Array.from(filesList);
    if (images.length + array.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }
    const newItems = array.map((file) => ({
      url: URL.createObjectURL(file),
      file,
    }));
    setImages((prev) => [...prev, ...newItems]);
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleVideosSelect = (filesList) => {
    if (!filesList) return;
    const array = Array.from(filesList);
    if (videos.length + array.length > 3) {
      toast.error("Maximum 3 videos allowed");
      return;
    }
    for (let file of array) {
      if (!file.type.startsWith("video/")) {
        toast.error("Please upload valid video files");
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error("Videos must be under 50MB");
        return;
      }
    }
    const newItems = array.map((file) => ({
      url: URL.createObjectURL(file),
      file,
    }));
    setVideos((prev) => [...prev, ...newItems]);
  };

  const removeVideo = (idx) => {
    setVideos((prev) => prev.filter((_, i) => i !== idx));
  };

  const [customCropText, setCustomCropText] = useState("");
  const [cropOptions, setCropOptions] = useState(["Cotton", "Wheat", "Soybean", "Maize", "Rice"]);
  const [selectedCrops, setSelectedCrops] = useState(() => {
    if (initial?.targetCrops?.length > 0) {
      return initial.targetCrops;
    }
    return ["Cotton", "Wheat"];
  });

  const toggleCrop = (crop) => {
    setSelectedCrops((prev) =>
      prev.includes(crop) ? prev.filter((c) => c !== crop) : [...prev, crop]
    );
  };

  const addCustomCrop = () => {
    if (!customCropText.trim()) return;
    const cleanCrop = customCropText.trim();
    if (!cropOptions.includes(cleanCrop)) {
      setCropOptions((prev) => [...prev, cleanCrop]);
    }
    if (!selectedCrops.includes(cleanCrop)) {
      setSelectedCrops((prev) => [...prev, cleanCrop]);
    }
    setCustomCropText("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const isEdit = !!initial;
    const missing = [];
    if (!form.productName.trim()) missing.push("Product Name");
    if (!form.brand.trim()) missing.push("Brand");
    if (!form.productCategory) missing.push("Category");
    
    if (!isEdit && images.length === 0) {
      missing.push("Product Image");
    }

    // Validate variants
    variants.forEach((variant, index) => {
      if (variant.mrp === "" || variant.mrp === null)
        missing.push(`Variant ${index + 1} MRP`);
      if (variant.quantity === "" || variant.quantity === null)
        missing.push(`Variant ${index + 1} Quantity`);
      if (!variant.unit.trim()) missing.push(`Variant ${index + 1} Unit`);
      if (variant.purchasePrice === "" || variant.purchasePrice === null)
        missing.push(`Variant ${index + 1} Purchase Price`);
      if (!variant.purchaseDate)
        missing.push(`Variant ${index + 1} Purchase Date`);
    });

    if (missing.length) {
      toast.error(`Required: ${missing.join(", ")}`);
      return;
    }

    // HSN Custom/Manual verification
    if (form.hsnCode.trim()) {
      const isResolved = selectedHsnRecord && selectedHsnRecord.code === form.hsnCode.trim();
      if (!isResolved) {
        const proceed = window.confirm(
          `Warning: The HSN code "${form.hsnCode}" was not resolved from the Indian master data. ` +
          "Are you sure you want to save this product with a custom/manual HSN code and Tax Rate?"
        );
        if (!proceed) return;
      }
    }

    onSave(form, variants, images, videos, selectedCrops);
  };

  const isEdit = !!initial;

  return (
    <div
      className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEdit ? "Edit Product" : "Add New Product"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Add product details, variants, images and other information.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-6 space-y-6">
            {/* Three Column Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column (spans 2) */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Product Information Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b pb-3 border-gray-100">
                    <Leaf size={16} className="text-brand-600" />
                    <h3 className="font-semibold text-gray-800 text-sm">Product Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FIELD label="Product Name" required helperText="The common or commercial name of the product">
                      <input
                        value={form.productName}
                        onChange={(e) => setF("productName", e.target.value)}
                        className={inputCls}
                        placeholder="Enter product name (e.g. Urea, Neem Oil)"
                      />
                    </FIELD>
                    <FIELD label="Brand" required helperText="Manufacturer or brand owner name">
                      <input
                        value={form.brand}
                        onChange={(e) => setF("brand", e.target.value)}
                        className={inputCls}
                        placeholder="Enter brand (e.g. IFFCO, Tata)"
                      />
                    </FIELD>
                    <FIELD label="Category" required helperText="Primary category classification">
                      <select
                        value={form.productCategory}
                        onChange={(e) => setF("productCategory", e.target.value)}
                        className={inputCls}
                      >
                        <option value="">Select category</option>
                        <option value="fertilizers">Fertilizers</option>
                        <option value="seeds">Seeds</option>
                        <option value="insecticides">Insecticides</option>
                        <option value="organic">Organic</option>
                        <option value="pgr">Plant Growth Regulator (PGR)</option>
                        <option value="animal_feed">Animal Feed</option>
                        <option value="fungicides">Fungicides</option>
                        <option value="herbicides">Herbicides</option>
                        <option value="tools">Tools</option>
                        <option value="other">Other</option>
                      </select>
                    </FIELD>
                    <FIELD label="Item Type" helperText="Physical product or non-physical service">
                      <select
                        value={form.itemType}
                        onChange={(e) => setF("itemType", e.target.value)}
                        className={inputCls}
                      >
                        <option value="PRODUCT">PRODUCT</option>
                        <option value="SERVICE">SERVICE</option>
                      </select>
                    </FIELD>
                    <div className="col-span-1 md:col-span-2">
                      <FIELD label="Description" helperText="Brief overview of product features, specifications, or packaging">
                        <textarea
                          value={form.description}
                          onChange={(e) => setF("description", e.target.value)}
                          className={inputCls + " resize-none"}
                          rows={3}
                          placeholder="Enter product description..."
                        />
                      </FIELD>
                    </div>
                  </div>
                </div>

                {/* Product Details Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b pb-3 border-gray-100">
                    <ClipboardList size={16} className="text-brand-600" />
                    <h3 className="font-semibold text-gray-800 text-sm">Product Details</h3>
                  </div>
                  <div className="space-y-4">
                    <FIELD label="Technical Details" helperText="Chemical formulation, ingredients, or scientific active components">
                      <textarea
                        value={form.productTechnicalDetails}
                        onChange={(e) => setF("productTechnicalDetails", e.target.value)}
                        className={inputCls + " resize-none"}
                        rows={2}
                        placeholder="Enter technical details..."
                      />
                    </FIELD>
                    <FIELD label="How To Use" helperText="Dosage recommendations, application methods, or safety precautions">
                      <textarea
                        value={form.howToUse}
                        onChange={(e) => setF("howToUse", e.target.value)}
                        className={inputCls + " resize-none"}
                        rows={2}
                        placeholder="Enter how to use..."
                      />
                    </FIELD>
                    <FIELD label="Benefits" helperText="Key advantages, target pests controlled, or crop yield improvements">
                      <textarea
                        value={form.productBenefits}
                        onChange={(e) => setF("productBenefits", e.target.value)}
                        className={inputCls + " resize-none"}
                        rows={2}
                        placeholder="Enter benefits..."
                      />
                    </FIELD>
                  </div>
                </div>

                {/* Tax Information Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="border-b pb-3 border-gray-100 space-y-1">
                    <div className="flex items-center gap-2">
                      <Percent size={18} className="text-emerald-600" />
                      <h3 className="font-semibold text-gray-800 text-sm">Tax Information</h3>
                    </div>
                    <p className="text-xs text-gray-400 pl-6.5">Select HSN code to auto-fill GST rate</p>
                  </div>
                  
                  {/* Category Pre-filter Chips */}
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-2">
                      Quick Agriculture Categories
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "🌾 Seeds", prefix: "1209" },
                        { label: "🧪 Pesticides", prefix: "3808" },
                        { label: "🌱 Fertilizers", prefix: "3101" },
                        { label: "🐄 Animal Feed", prefix: "2309" },
                        { label: "🚜 Equipment", prefix: "8432" }
                      ].map((chip) => (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() => {
                            setHsnSearchVal(chip.prefix);
                            setShowSuggestions(true);
                          }}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-55 transition flex items-center gap-1.5 shadow-sm"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative" ref={autocompleteRef}>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="flex items-center text-xs font-semibold text-gray-500">
                          HSN Code
                          <Info size={12} className="text-gray-400 ml-1 cursor-pointer" title="Search by HSN code or description text" />
                        </label>
                      </div>
                      
                      <div className="flex items-center border border-gray-200 rounded-xl bg-white focus-within:ring-2 focus-within:ring-green-600 focus-within:border-transparent transition overflow-hidden min-h-[42px] pr-1.5 pl-3">
                        <Search size={16} className="text-gray-400 mr-2 flex-shrink-0" />
                        <input
                          value={hsnSearchVal}
                          onChange={(e) => {
                            const val = e.target.value;
                            setHsnSearchVal(val);
                            setF("hsnCode", val);
                            // Invalidate selected record if user manually edits
                            if (selectedHsnRecord && selectedHsnRecord.code !== val) {
                              setSelectedHsnRecord(null);
                            }
                          }}
                          onFocus={() => setShowSuggestions(true)}
                          className="w-full text-sm focus:outline-none bg-transparent py-2 text-gray-800 placeholder-gray-400 font-semibold"
                          placeholder="Search code or description..."
                        />
                        {hsnSearchVal && (
                          <button
                            type="button"
                            onClick={() => {
                              setHsnSearchVal("");
                              setF("hsnCode", "");
                              setSelectedHsnRecord(null);
                              setHsnSuggestions([]);
                            }}
                            className="text-gray-400 hover:text-gray-600 p-1 mr-1.5 flex-shrink-0"
                          >
                            <X size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowBrowseModal(true)}
                          className="p-2 rounded-lg bg-emerald-55 hover:bg-emerald-100 text-emerald-700 transition flex-shrink-0 border border-emerald-200 flex items-center justify-center"
                          title="Browse HSN Database"
                        >
                          <Search size={16} />
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 leading-normal">
                        Search by HSN code or description (min 3 characters)
                      </p>
                      
                      {/* View Detailed Classifications link */}
                      {selectedHsnRecord && String(selectedHsnRecord.code).length <= 4 && (
                        <button
                          type="button"
                          onClick={() => {
                            setBrowseSearchVal(selectedHsnRecord.code);
                            setBrowseCategory("");
                            setShowBrowseModal(true);
                          }}
                          className="text-[11px] text-emerald-650 font-bold hover:text-emerald-700 hover:underline mt-2 flex items-center gap-1"
                        >
                          View Detailed Classifications for {selectedHsnRecord.code} →
                        </button>
                      )}

                      {/* HSN Selection Experience Banner */}
                      {selectedHsnRecord && (
                        <div className="mt-2.5 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-start gap-2.5 shadow-xs">
                          <CheckCircle size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                          <div className="text-left min-w-0">
                            <p className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider">✓ HSN Selected</p>
                            <div className="text-[11px] text-emerald-700 font-semibold mt-0.5 space-y-0.5">
                              <p><span className="font-extrabold text-emerald-800">Code:</span> {selectedHsnRecord.code}</p>
                              <p className="capitalize truncate" title={selectedHsnRecord.description}>
                                <span className="font-extrabold text-emerald-800">Category:</span> {selectedHsnRecord.description.toLowerCase()}
                              </p>
                              <p><span className="font-extrabold text-emerald-800">GST Rate:</span> {selectedHsnRecord.gstRate ?? selectedHsnRecord.taxRate}%</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Autocomplete Suggestions Menu */}
                      {showSuggestions && hsnSearchVal.trim().length >= 3 && (
                        <div className="absolute left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl mt-1.5 max-h-80 overflow-y-auto shadow-xl">
                          <div className="px-4 py-2.5 bg-gray-50/50 border-b border-gray-150 flex justify-between items-center text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">
                            <span>Suggestions</span>
                            <span>{hsnSuggestions.length} results found</span>
                          </div>
                          
                          {loadingSuggestions ? (
                            <div className="px-4 py-4 text-xs text-slate-400 font-bold flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                              <span>Searching HSN codes...</span>
                            </div>
                          ) : hsnSuggestions.length === 0 ? (
                            <div className="px-4 py-3 text-xs text-slate-400 font-bold flex justify-between items-center">
                              <span>No matching HSN codes found</span>
                              <button
                                type="button"
                                onClick={() => setShowSuggestions(false)}
                                className="text-gray-400 hover:text-gray-600 font-bold text-xs"
                              >
                                Close
                              </button>
                            </div>
                          ) : (
                            <div className="p-2.5 space-y-2">
                              {hsnSuggestions.map((item) => {
                                const getChapterName = (code) => {
                                  const prefix = String(code).substring(0, 2);
                                  const chapters = {
                                    "10": "Cereals",
                                    "12": "Vegetables, Seeds & Fruits",
                                    "23": "Animal Feed",
                                    "31": "Fertilizers",
                                    "38": "Pesticides & Chemicals",
                                    "84": "Machinery & Equipment"
                                  };
                                  return chapters[prefix] || "Agricultural Goods";
                                };
                                const shortDesc = item.description.length > 70 
                                  ? item.description.substring(0, 67) + "..." 
                                  : item.description;
                                  
                                return (
                                  <div
                                    key={item.code}
                                    onClick={() => handleSelectHsn(item)}
                                    className="p-3 bg-white hover:bg-slate-55 border border-slate-150 rounded-xl cursor-pointer transition flex justify-between items-start gap-3 shadow-xs hover:border-emerald-500 hover:shadow-sm"
                                  >
                                    <div className="min-w-0 pr-1">
                                      <span className="font-extrabold text-sm text-gray-800 block mb-0.5">{item.code}</span>
                                      <p className="text-[11px] text-gray-600 font-semibold capitalize leading-relaxed" title={item.description}>
                                        {shortDesc.toLowerCase()}
                                      </p>
                                      <span className="text-[9px] text-gray-400 font-normal mt-1 block">
                                        Chapter {item.code.substring(0, 2)} • {getChapterName(item.code)}
                                      </span>
                                    </div>
                                    <span className="text-emerald-700 font-extrabold text-[10px] bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md whitespace-nowrap">
                                      {item.gstRate ?? item.taxRate}% GST
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          
                          {/* Suggestions Footer Action button */}
                          <div
                            onClick={() => {
                              setShowBrowseModal(true);
                              setShowSuggestions(false);
                            }}
                            className="px-4 py-3 bg-slate-55/70 hover:bg-slate-100/80 border-t border-gray-150 cursor-pointer flex justify-between items-center transition text-xs font-bold text-emerald-700"
                          >
                            <div className="flex items-center gap-3">
                              <Search size={16} className="text-emerald-600" />
                              <div className="text-left">
                                <p className="font-bold text-emerald-600">Browse all HSN codes</p>
                                <p className="text-[10px] text-gray-400 font-normal mt-0.5">Open full HSN lookup to search and select</p>
                              </div>
                            </div>
                            <span className="text-emerald-600 text-sm">➔</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Editable Tax Rate Selector Slabs */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="flex items-center text-xs font-semibold text-gray-500">
                          Tax Rate (%)
                          <Info size={12} className="text-gray-400 ml-1 cursor-pointer" title="GST rate percentage (editable)" />
                        </label>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={form.taxRate}
                        onChange={(e) => setF("taxRate", e.target.value)}
                        className={inputCls + " font-semibold text-gray-700"}
                        placeholder="Enter tax rate"
                      />
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {gstSlabs.map((rate) => (
                          <button
                            key={rate}
                            type="button"
                            onClick={() => setF("taxRate", String(rate))}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition ${
                              String(form.taxRate) === String(rate)
                                ? "bg-emerald-600 text-white border-emerald-650"
                                : "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-600"
                            }`}
                          >
                            {rate}%
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 leading-normal">
                        GST rate percentage (editable)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Product Media Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b pb-3 border-gray-100">
                    <Image size={16} className="text-brand-600" />
                    <h3 className="font-semibold text-gray-800 text-sm">Product Media</h3>
                  </div>
                  
                  {/* Images Section */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-500">Product Images (Max 5)</p>
                    <div
                      className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition ${
                        dragOver ? "border-brand-500 bg-brand-50/20" : "border-gray-200 hover:border-brand-400 hover:bg-gray-50/50"
                      }`}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        handleImagesSelect(e.dataTransfer.files);
                      }}
                      onClick={() => document.getElementById("multi-img-input").click()}
                    >
                      <input
                        id="multi-img-input"
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImagesSelect(e.target.files)}
                      />
                      <Download size={20} className="text-brand-600" />
                      <p className="text-xs font-semibold text-brand-600 mt-1">Upload Images</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">or drag and drop files here</p>
                    </div>
                    
                    {images.length > 0 && (
                      <div className="grid grid-cols-5 gap-2 pt-2">
                        {images.map((img, idx) => (
                          <div key={idx} className="relative aspect-square border border-gray-200 rounded-lg overflow-hidden group">
                            <img src={img.url} alt="preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeImage(idx);
                              }}
                              className="absolute top-0.5 right-0.5 bg-black/60 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] hover:bg-red-600 transition"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <hr className="border-gray-100" />

                  {/* Videos Section */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-500">Product Videos (Max 3)</p>
                    <div
                      className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition ${
                        videoDragOver ? "border-brand-500 bg-brand-50/20" : "border-gray-200 hover:border-brand-400 hover:bg-gray-50/50"
                      }`}
                      onDragOver={(e) => { e.preventDefault(); setVideoDragOver(true); }}
                      onDragLeave={() => setVideoDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setVideoDragOver(false);
                        handleVideosSelect(e.dataTransfer.files);
                      }}
                      onClick={() => document.getElementById("multi-vid-input").click()}
                    >
                      <input
                        id="multi-vid-input"
                        type="file"
                        multiple
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => handleVideosSelect(e.target.files)}
                      />
                      <Video size={20} className="text-brand-600" />
                      <p className="text-xs font-semibold text-brand-600 mt-1">Upload Videos</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">or drag and drop files here</p>
                    </div>
                    
                    {videos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        {videos.map((vid, idx) => (
                          <div key={idx} className="relative aspect-video border border-gray-200 rounded-lg overflow-hidden group">
                            <video src={vid.url} className="w-full h-full object-cover" muted />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                              <span className="text-white text-xs">▶</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeVideo(idx);
                              }}
                              className="absolute top-0.5 right-0.5 bg-black/60 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] hover:bg-red-600 transition"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Target Crops Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b pb-3 border-gray-100">
                    <Sprout size={16} className="text-brand-600" />
                    <h3 className="font-semibold text-gray-800 text-sm">Target Crops</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        value={customCropText}
                        onChange={(e) => setCustomCropText(e.target.value)}
                        className={inputCls}
                        placeholder="Select crops"
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomCrop())}
                      />
                      <button
                        type="button"
                        onClick={addCustomCrop}
                        className="px-3 py-2 border border-brand-500 text-brand-600 rounded-lg hover:bg-brand-50 text-xs font-semibold whitespace-nowrap transition"
                      >
                        + Add Custom Crop
                      </button>
                    </div>

                    <div className="flex flex-col gap-2 pt-1 max-h-40 overflow-y-auto">
                      {cropOptions.map((crop) => (
                        <label key={crop} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={selectedCrops.includes(crop)}
                            onChange={() => toggleCrop(crop)}
                            className="rounded text-brand-600 focus:ring-brand-500 w-3.5 h-3.5"
                          />
                          {crop}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom full-width Variants Section */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-gray-100">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-brand-600" />
                  <h3 className="font-semibold text-gray-800 text-sm">Product Variants</h3>
                </div>
                <button
                  type="button"
                  onClick={addVariant}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition"
                >
                  <span>+</span> Add Variant
                </button>
              </div>

              <div className="space-y-4">
                {variants.map((variant, index) => (
                  <VariantFormItem
                    key={index}
                    variant={variant}
                    index={index}
                    isEdit={isEdit}
                    onUpdate={(field, val) => updateVariant(index, field, val)}
                    onRemove={() => removeVariant(index)}
                    showRemove={variants.length > 1}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-white transition"
            >
              Cancel
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={handleSubmit}
                className="px-5 py-2 border border-brand-500 text-brand-600 rounded-lg text-sm font-semibold hover:bg-brand-50 disabled:opacity-50 transition flex items-center gap-1.5"
              >
                <Save size={14} className="text-brand-600 mr-1.5" /> Save Draft
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : isEdit ? (
                  "Update Product"
                ) : (
                  "Add Product"
                )}
              </button>
            </div>
          </div>
        </form>
        
        {showBrowseModal && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh] border border-gray-100">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-150">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Browse HSN Directory</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Search master records or filter by quick category</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowBrowseModal(false);
                    setBrowseSearchVal("");
                    setBrowseCategory("");
                    setBrowseResults([]);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Search & Filter Section */}
              <div className="p-6 pb-4 border-b border-gray-100 space-y-4 bg-gray-55/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={browseSearchVal}
                    onChange={(e) => {
                      setBrowseSearchVal(e.target.value);
                      if (e.target.value) setBrowseCategory(""); // reset category if searching manually
                    }}
                    placeholder="Search by HSN Code number or description (min 3 chars)..."
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  />
                </div>

                {/* Category Pre-filter Chips */}
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-2">
                    Quick Agriculture Categories
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "🌾 Seeds", prefix: "12" },
                      { label: "🧪 Pesticides", prefix: "3808" },
                      { label: "🌱 Fertilizers", prefix: "31" },
                      { label: "🐄 Animal Feed", prefix: "23" },
                      { label: "🚜 Equipment", prefix: "84" }
                    ].map((chip) => {
                      const isSelected = browseCategory === chip.prefix;
                      return (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setBrowseCategory("");
                            } else {
                              setBrowseCategory(chip.prefix);
                              setBrowseSearchVal(""); // clear text input
                            }
                          }}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                            isSelected
                              ? "bg-brand-600 text-white border-brand-700 shadow-sm"
                              : "bg-white hover:bg-gray-50 border-gray-200 text-gray-600"
                          }`}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Results Container */}
              <div className="flex-1 overflow-y-auto p-6 min-h-[250px] max-h-[40vh]">
                {loadingBrowse ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-xs font-semibold">Searching HSN codes database...</p>
                  </div>
                ) : browseResults.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <ClipboardList className="mx-auto w-10 h-10 mb-2 opacity-50" />
                    <p className="text-xs font-bold">No HSN codes found</p>
                    <p className="text-[11px] mt-0.5">Type a search term or click a quick category chip above to search.</p>
                  </div>
                ) : (
                  <div className="border border-gray-150 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase font-bold tracking-wider border-b border-gray-150">
                        <tr>
                          <th className="px-4 py-3">HSN Code</th>
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3 text-right">GST Rate</th>
                          <th className="px-4 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                        {browseResults.map((item) => (
                          <tr key={item.code} className="hover:bg-gray-50 transition">
                            <td className="px-4 py-3 font-extrabold text-gray-900">{item.code}</td>
                            <td className="px-4 py-3 font-normal max-w-[280px] truncate capitalize" title={item.description}>
                              {item.description.toLowerCase()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-emerald-700 font-extrabold bg-emerald-55 px-2 py-0.5 rounded border border-emerald-100">
                                {item.gstRate ?? item.taxRate}% GST
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  handleSelectHsn(item);
                                  setShowBrowseModal(false);
                                  setBrowseSearchVal("");
                                  setBrowseCategory("");
                                  setBrowseResults([]);
                                }}
                                className="px-2.5 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded text-[11px] font-bold shadow-sm active:scale-95 transition"
                              >
                                Select
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-150 rounded-b-2xl text-right">
                <button
                  type="button"
                  onClick={() => {
                    setShowBrowseModal(false);
                    setBrowseSearchVal("");
                    setBrowseCategory("");
                    setBrowseResults([]);
                  }}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-white transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductModal;

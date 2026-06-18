import { useEffect, useMemo, useState, Fragment } from "react";
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
import {
  SkeletonHeader,
  SkeletonStatCards,
  SkeletonTable,
} from "../components/Skeleton";
import { usePermissions } from "../hooks/usePermissions";

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
}function ProductGridCard({ p, isReadOnly, expandedRowId, setExpandedRowId, setEditRow, setShowModal, setConfirmId, setConfirmType }) {
  const dispatch = useDispatch();
  const [showMenu, setShowMenu] = useState(false);
  
  const qty = p._stock?.availableQuantity ?? 0;
  const isOOS = qty === 0;
  const isLow = qty > 0 && qty <= 5;
  const hasExpiry = p.products?.some(v => {
    if (!v.expiryDate) return false;
    const diff = Math.ceil((new Date(v.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 30;
  });

  let minExpiryDiff = null;
  p.products?.forEach(v => {
    if (!v.expiryDate) return;
    const diff = Math.ceil((new Date(v.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (minExpiryDiff === null || diff < minExpiryDiff) {
      minExpiryDiff = diff;
    }
  });

  let badgeLabel = "Active";
  let badgeStyle = "bg-green-50 text-green-700 border border-green-200";
  let badgeIcon = <Leaf size={10} className="inline mr-1" />;
  
  if (!p.isActive) {
    badgeLabel = "Inactive";
    badgeStyle = "bg-gray-100 text-gray-500 border border-gray-200";
    badgeIcon = (
      <svg className="w-2.5 h-2.5 inline mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    );
  } else if (isOOS) {
    badgeLabel = "Out of Stock";
    badgeStyle = "bg-red-50 text-red-600 border border-red-200";
    badgeIcon = <AlertTriangle size={10} className="inline mr-1 text-red-500" />;
  } else if (isLow) {
    badgeLabel = "Low Stock";
    badgeStyle = "bg-amber-50 text-amber-700 border border-amber-200";
    badgeIcon = <AlertTriangle size={10} className="inline mr-1 text-amber-500" />;
  } else if (hasExpiry) {
    badgeLabel = "Expiring Soon";
    badgeStyle = "bg-purple-50 text-purple-700 border border-purple-200";
    badgeIcon = (
      <svg className="w-2.5 h-2.5 inline mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }

  const rawCat = p.productCategory || p.category || "";
  const catLabel = rawCat ? rawCat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : null;

  const minMrp = p.products?.length > 0 ? Math.min(...p.products.map(v => Number(v.mrp || 0)).filter(Boolean)) : 0;
  const maxMrp = p.products?.length > 0 ? Math.max(...p.products.map(v => Number(v.mrp || 0)).filter(Boolean)) : 0;
  const priceRangeText = minMrp === maxMrp ? `₹${minMrp}` : `₹${minMrp} - ₹${maxMrp}`;

  const variantsCountText = p.products?.length === 1 ? "1 Variant" : `${p.products?.length || 0} Variants`;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between relative hover:shadow-md transition duration-200">
      {/* Top Row: Badge & Heart */}
      <div className="flex justify-between items-center mb-3">
        <span className={`flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeStyle}`}>
          {badgeIcon}
          {badgeLabel}
        </span>
        <button className="text-gray-300 hover:text-red-500 transition">
          <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {/* Middle Content */}
      <div className="flex gap-4 items-stretch min-h-[120px] mb-4">
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div>
            <h3 className="font-bold text-gray-850 text-[15px] leading-snug truncate" title={p.productName}>
              {p.productName}
            </h3>
            <p className="text-xs text-gray-400 font-medium mt-0.5 truncate">{p.brand || "No brand"}</p>
          </div>
          
          <div className="mt-2 space-y-1.5">
            {catLabel && (
              <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-150">
                {catLabel}
              </span>
            )}
            <p className="text-[10px] text-gray-400 font-semibold">{variantsCountText}</p>
          </div>

          <p className="font-extrabold text-gray-900 text-base mt-2.5 leading-tight">
            {priceRangeText}
          </p>
        </div>

        <div className="w-24 h-28 flex-shrink-0 flex items-center justify-center bg-gray-50/50 rounded-xl border border-gray-150 overflow-hidden">
          {p.productImages?.[0]?.url ? (
            <img 
              src={p.productImages[0].url} 
              alt={p.productName} 
              className="w-full h-full object-contain hover:scale-105 transition duration-300"
            />
          ) : (
            <ImageOff size={24} className="text-gray-300" />
          )}
        </div>
      </div>

      {/* Bottom Actions Row */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-3.5 relative">
        <div className="flex items-center border border-gray-200 rounded-full px-2.5 py-1 bg-white shadow-xs z-10">
          <button 
            type="button"
            onClick={() => setExpandedRowId(expandedRowId === p._id ? null : p._id)}
            className={`p-1 rounded-full transition ${expandedRowId === p._id ? "text-brand-600 bg-brand-50" : "text-gray-400 hover:text-gray-600"}`}
            title="View Variants"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          
          <span className="h-3 w-[1px] bg-gray-200 mx-1.5" />
          
          {!isReadOnly ? (
            <>
              <button 
                type="button"
                onClick={() => { setEditRow(p); setShowModal(true); }}
                className="p-1 text-gray-400 hover:text-blue-500 transition"
                title="Edit Product"
              >
                <Pencil size={13} />
              </button>
              
              <span className="h-3 w-[1px] bg-gray-200 mx-1.5" />
              
              <button 
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className={`p-1 transition ${showMenu ? "text-brand-600" : "text-gray-400 hover:text-gray-600"}`}
                title="More Options"
              >
                <MoreVertical size={13} />
              </button>
            </>
          ) : (
            <span className="px-1 text-[9px] text-gray-400 font-medium">View</span>
          )}
        </div>

        {/* Local Dropdown Menu */}
        {showMenu && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
            <div className="absolute left-0 bottom-12 bg-white border border-gray-150 rounded-xl shadow-lg py-1.5 min-w-[130px] z-30 text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  dispatch(toggleProductStatus({ id: p._id, isActive: !p.isActive }))
                    .unwrap()
                    .then(() => toast.success(`Marked ${!p.isActive ? "Active" : "Inactive"}`))
                    .catch(() => toast.error("Failed to update status"));
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-50 font-medium text-gray-700 flex items-center gap-1.5"
              >
                {p.isActive ? "Mark Inactive" : "Mark Active"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  setConfirmId(p._id);
                  setConfirmType("product");
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-red-50 font-semibold text-red-650 flex items-center gap-1.5 border-t border-gray-100"
              >
                Delete Product
              </button>
            </div>
          </>
        )}

        {/* Stock Details */}
        <div className="text-right">
          {hasExpiry && minExpiryDiff !== null ? (
            <>
              <p className="text-[10px] text-red-500 font-bold leading-tight">Expires in {minExpiryDiff} day{minExpiryDiff !== 1 ? "s" : ""}</p>
              <p className="text-[10px] text-green-600 font-semibold mt-0.5">Stock: {qty} units</p>
            </>
          ) : isOOS ? (
            <span className="text-xs font-semibold text-gray-400">Stock: 0 units</span>
          ) : isLow ? (
            <span className="text-xs font-semibold text-red-500">Stock: {qty} units</span>
          ) : (
            <span className="text-xs font-semibold text-green-650">Stock: {qty} units</span>
          )}
        </div>
      </div>

      {/* Collapsible Variants Inline Detail inside the card */}
      {expandedRowId === p._id && (
        <div className="mt-4 border-t border-gray-100 pt-3 space-y-2 max-h-[180px] overflow-y-auto">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Variant Details</h4>
          {(p.products || []).map((v, idx) => (
            <div key={idx} className="bg-gray-50/50 rounded-lg p-2 flex justify-between items-center text-[11px] border border-gray-150">
              <div>
                <p className="font-bold text-gray-700">{v.parameter} {v.unit}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">MRP: ₹{v.mrp} | Sale: ₹{v.salePrice}</p>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-white border border-gray-200 text-[10px] font-bold text-gray-500">
                Qty: {v.quantity}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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

function ProductModal({ initial, onClose, onSave, saving }) {
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
                        placeholder="Enter product benefits..."
                      />
                    </FIELD>
                  </div>
                </div>

                {/* Tax Information Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b pb-3 border-gray-100">
                    <Percent size={16} className="text-brand-600" />
                    <h3 className="font-semibold text-gray-800 text-sm">Tax Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FIELD label="HSN Code" helperText="8-digit Harmonized System Nomenclature tax code">
                      <input
                        value={form.hsnCode}
                        onChange={(e) => setF("hsnCode", e.target.value)}
                        className={inputCls}
                        placeholder="Enter HSN code"
                      />
                    </FIELD>
                    <FIELD label="Tax Rate (%)" helperText="GST rate percentage (e.g. 5, 12, 18)">
                      <input
                        type="number"
                        value={form.taxRate}
                        onChange={(e) => setF("taxRate", e.target.value)}
                        className={inputCls}
                        placeholder="Enter tax rate"
                      />
                    </FIELD>
                  </div>
                </div>

              </div>

              {/* Right Column (spans 1) */}
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
      // Try multiple ways to find matching stock
      let stock = null;

      // Method 1: Standard sourceRef matching
      stock = stockSummary.find((s) => s.item?.sourceRef === p._id);

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
          products: variants.map((variant) => ({
            unit: variant.unit,
            mrp: Number(variant.mrp),
            quantity: Number(variant.quantity),
            purchaseDate: variant.purchaseDate,
            ...(variant.parameter && { parameter: variant.parameter }),
            ...(variant.expiryDate && { expiryDate: variant.expiryDate }),
            itemCode: variant.itemCode || "",
            purchasePrice: variant.purchasePrice !== "" && variant.purchasePrice !== null ? Number(variant.purchasePrice) : 0,
            purchasePriceTaxType: variant.purchasePriceTaxType || "Without Tax",
            salePrice: variant.salePrice !== "" && variant.salePrice !== null ? Number(variant.salePrice) : 0,
            salePriceTaxType: variant.salePriceTaxType || "Without Tax",
            discountOnSalePrice: variant.discountOnSalePrice !== "" && variant.discountOnSalePrice !== null ? Number(variant.discountOnSalePrice) : 0,
            discountType: variant.discountType || "Percentage",
            wholesalePrice: variant.wholesalePrice !== "" && variant.wholesalePrice !== null ? Number(variant.wholesalePrice) : 0,
            wholesalePriceTaxType: variant.wholesalePriceTaxType || "Without Tax",
            minWholesaleQty: variant.minWholesaleQty !== "" && variant.minWholesaleQty !== null ? Number(variant.minWholesaleQty) : 0,
            openingStockPrice: variant.openingStockPrice !== "" && variant.openingStockPrice !== null ? Number(variant.openingStockPrice) : 0,
            asOfDate: variant.asOfDate || "",
            minStockToMaintain: variant.minStockToMaintain !== "" && variant.minStockToMaintain !== null ? Number(variant.minStockToMaintain) : 0,
            location: variant.location || "",
          })),
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
                        <td className="px-5 py-4 cursor-pointer" onClick={() => setExpandedRowId(expandedRowId === row._id ? null : row._id)}>
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
    
                        {/* Status Toggle */}
                        <td className="px-5 py-4 text-center">
                          <button
                            onClick={() => {
                              if (isReadOnly) return;
                              dispatch(toggleProductStatus({ id: row._id, isActive: !row.isActive }))
                                .unwrap()
                                .then(() => toast.success(`Marked ${!row.isActive ? "Active" : "Inactive"}`))
                                .catch(() => toast.error("Failed to update status"));
                            }}
                            disabled={isReadOnly}
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                              row.isActive
                                ? "bg-green-50 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-655 hover:border-red-205"
                                : "bg-gray-105 text-gray-500 border-gray-200 hover:bg-green-50 hover:text-green-700"
                            } ${isReadOnly ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            {row.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
    
                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-1">
                            {!isReadOnly ? (
                              <>
                                <button
                                  onClick={() => { setEditRow(row); setShowModal(true); }}
                                  className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition"
                                  title="Edit"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button className="p-2 rounded-lg hover:bg-gray-105 text-gray-400 transition">
                                  <MoreVertical size={14} />
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-gray-400">View only</span>
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
                                {(row.products || []).map((p, idx) => (
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
                                        Stock: {p.quantity ?? 0}
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
                                ))}
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

      {showModal && (
        <ProductModal
          initial={editRow ?? null}
          onClose={() => {
            setShowModal(false);
            setEditRow(null);
          }}
          onSave={handleSaveProduct}
          saving={saving}
        />
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

import { useEffect, useState, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  createSaleOrEstimate,
  updateSaleOrEstimate,
} from "../store/thunks/sellThunk";
import { fetchParties, addParty } from "../store/thunks/partyThunk";
import { fetchProducts, fetchStockSummary } from "../store/thunks/inventoryThunk";
import { fetchMembers } from "../store/thunks/membersThunk";
import { clearSellStatus } from "../store/slices/sellSlice";
import { usePermissions } from "../hooks/usePermissions";
import api from "../lib/api";
import SearchableStateSelect from "../components/SearchableStateSelect";
import { searchGstin } from "../store/thunks/eInvoiceThunk";
import { normalizeGstinData } from "../utils/gstinNormalizer";
import {
  Plus,
  Trash2,
  Loader2,
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  X,
  ShoppingCart,
  Zap,
  User,
  Users,
  ShoppingBag,
  Pencil,
  ChevronDown,
  Search,
  Check,
  FlaskConical,
  Shield,
  Leaf,
  Package,
  Keyboard,
  Printer,
  SlidersHorizontal,
  Receipt,
  Calendar,
  CreditCard,
  Building2,
  Clock,
  Sparkles,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

export default function CounterInvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { isReadOnly } = usePermissions();

  const { parties, loading: partiesLoading } = useSelector((state) => state.party);
  const { products, stockSummary, loading: inventoryLoading } = useSelector((state) => state.inventory);
  const { loading: sellLoading } = useSelector((state) => state.sell);
  const { members } = useSelector((state) => state.members);

  const [editRecord, setEditRecord] = useState(null);
  const [recordLoading, setRecordLoading] = useState(false);

  useEffect(() => {
    dispatch(clearSellStatus());
    dispatch(fetchParties({ partyType: "BUYER" }));
    dispatch(fetchProducts());
    dispatch(fetchStockSummary());
    dispatch(fetchMembers());
  }, [dispatch]);

  useEffect(() => {
    if (id) {
      const loadRecord = async () => {
        try {
          setRecordLoading(true);
          const res = await api.get(`/sell/${id}`);
          setEditRecord(res.data?.data || res.data);
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to fetch sales bill details");
          navigate("/sell");
        } finally {
          setRecordLoading(false);
        }
      };
      loadRecord();
    }
  }, [id, navigate]);

  const isDataLoading =
    partiesLoading ||
    inventoryLoading ||
    recordLoading ||
    !products ||
    products.length === 0 ||
    (id && !editRecord);

  if (isDataLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-9 h-9 text-[#16A36A] animate-spin" />
        <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
          Loading Counter POS Register...
        </p>
      </div>
    );
  }

  if (isReadOnly) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-xl text-xs font-semibold border border-red-200 max-w-xl mx-auto mt-8 text-center shadow-xs">
        You do not have permission to create or edit counter sales.
      </div>
    );
  }

  return (
    <InvoiceFormInner
      editRecord={editRecord}
      parties={parties}
      products={products}
      stockSummary={stockSummary}
      sellLoading={sellLoading}
      members={members || []}
    />
  );
}

const getProductIcon = (category) => {
  const cat = String(category || "").toLowerCase();
  if (cat.includes("insecticide")) return FlaskConical;
  if (cat.includes("fungicide")) return Shield;
  if (cat.includes("fertilizer") || cat.includes("seed") || cat.includes("organic") || cat.includes("pgr")) return Leaf;
  return Package;
};

// ==================== SEARCHABLE PARTY SELECT (REGISTERED BUYERS) ====================
function SearchablePartySelect({
  value,
  onChange,
  parties = [],
  error = null,
  disabled = false,
  inputRef,
  onOpenQuickAdd
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredParties = useMemo(() => {
    if (!search.trim()) return parties;
    const term = search.toLowerCase();
    return parties.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const phone = (p.phoneNumber || "").toLowerCase();
      const gstin = (p.gstin || p.gstNumber || "").toLowerCase();
      return name.includes(term) || phone.includes(term) || gstin.includes(term);
    });
  }, [parties, search]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [search]);

  const selectedParty = parties.find((p) => p._id === value);

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % Math.max(1, filteredParties.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev - 1 + filteredParties.length) % Math.max(1, filteredParties.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredParties[highlightIndex]) {
        onChange(filteredParties[highlightIndex]._id);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`relative flex items-center justify-between border rounded-lg px-3 text-xs focus:outline-none transition-all cursor-pointer font-medium h-[42px] bg-white ${disabled
          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
          : isOpen
            ? "border-[#16A36A] ring-2 ring-[#16A36A]/20 text-[#172033]"
            : "border-[#DCE5EA] hover:border-slate-300 text-[#172033]"
          } ${error ? "border-red-400 focus:ring-red-400" : ""}`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <Search className={`w-4 h-4 shrink-0 ${isOpen ? "text-[#16A36A]" : "text-slate-400"}`} />
          {selectedParty ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-[#172033]">{selectedParty.name}</span>
              {selectedParty.phoneNumber && (
                <span className="text-[11px] text-slate-500 font-normal">
                  ({selectedParty.phoneNumber})
                </span>
              )}
              {selectedParty.gstType && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                  {selectedParty.gstType}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 font-normal">Search customer, mobile number or code... [F2]</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 text-slate-400 ${isOpen ? "rotate-180 text-[#16A36A]" : ""}`} />
      </div>

      {isOpen && (
        <div className="absolute z-[100] mt-1 w-full bg-white border border-[#DCE5EA] rounded-lg shadow-lg overflow-hidden animate-in fade-in duration-100">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search party by name, phone or GSTIN..."
              className="w-full bg-transparent border-none text-xs focus:outline-none focus:ring-0 font-medium text-[#172033] placeholder-slate-400 p-0"
              autoFocus
            />
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
            {onOpenQuickAdd && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenQuickAdd();
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-[#16A36A] hover:bg-[#E6F4EA]/50 flex items-center gap-2 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+ Register New Party [Alt+A]</span>
              </button>
            )}

            {filteredParties.length === 0 ? (
              <div className="px-3.5 py-4 text-xs text-slate-400 text-center font-medium">
                No party matches search criteria
              </div>
            ) : (
              filteredParties.map((p, idx) => {
                const isSelected = value === p._id;
                const isHighlighted = idx === highlightIndex;
                return (
                  <div
                    key={p._id}
                    onClick={() => {
                      onChange(p._id);
                      setIsOpen(false);
                    }}
                    className={`px-3.5 py-2.5 text-xs cursor-pointer transition-colors flex items-center justify-between ${isHighlighted
                      ? "bg-[#E6F4EA] text-[#16A36A] font-semibold"
                      : isSelected
                        ? "bg-[#E6F4EA]/70 text-[#16A36A] font-semibold"
                        : "text-[#172033] hover:bg-slate-50"
                      }`}
                  >
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-xs text-[#172033]">{p.name}</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        Phone: {p.phoneNumber || "N/A"} • GST: {p.gstin || p.gstNumber || "Unregistered"}
                      </span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#16A36A] shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== SEARCHABLE MEMBER SELECT (FPO FARMERS) ====================
function SearchableMemberSelect({
  value,
  onChange,
  members,
  error = null,
  disabled = false,
  inputRef
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const term = search.toLowerCase();
    return members.filter((m) => {
      const fullName = `${m.firstName || ""} ${m.lastName || ""}`.toLowerCase();
      const phone = (m.phone || "").toLowerCase();
      const role = (m.role || "").toLowerCase();
      return fullName.includes(term) || phone.includes(term) || role.includes(term);
    });
  }, [members, search]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [search]);

  const selectedMember = members.find((m) => m._id === value);
  const selectedName = selectedMember
    ? `${selectedMember.firstName} ${selectedMember.lastName}`
    : "";

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % Math.max(1, filteredMembers.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev - 1 + filteredMembers.length) % Math.max(1, filteredMembers.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredMembers[highlightIndex]) {
        onChange(filteredMembers[highlightIndex]._id);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`relative flex items-center justify-between border rounded-lg px-3 text-xs focus:outline-none transition-all cursor-pointer font-medium h-[42px] bg-white ${disabled
          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
          : isOpen
            ? "border-[#16A36A] ring-2 ring-[#16A36A]/20 text-[#172033]"
            : "border-[#DCE5EA] hover:border-slate-300 text-[#172033]"
          } ${error ? "border-red-400 focus:ring-red-400" : ""}`}
      >
        <div className="flex items-center gap-2 truncate">
          <User className={`w-4 h-4 shrink-0 ${isOpen ? "text-[#16A36A]" : "text-slate-400"}`} />
          {selectedMember ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-[#172033]">{selectedName}</span>
              <span className="text-[11px] text-slate-500 font-normal">+91 {selectedMember.phone} ({selectedMember.role})</span>
            </div>
          ) : (
            <span className="text-slate-400 font-normal">Select FPO Member... [F2]</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 text-slate-400 ${isOpen ? "rotate-180 text-[#16A36A]" : ""}`} />
      </div>

      {isOpen && (
        <div className="absolute z-[100] mt-1 w-full bg-white border border-[#DCE5EA] rounded-lg shadow-lg overflow-hidden animate-in fade-in duration-100">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search member by name, phone or role..."
              className="w-full bg-transparent border-none text-xs focus:outline-none focus:ring-0 font-medium text-[#172033] placeholder-slate-400 p-0"
              autoFocus
            />
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
            {filteredMembers.length === 0 ? (
              <div className="px-3.5 py-4 text-xs text-slate-400 text-center font-medium">
                No FPO member matches search criteria
              </div>
            ) : (
              filteredMembers.map((m, idx) => {
                const isSelected = value === m._id;
                const isHighlighted = idx === highlightIndex;
                const mName = `${m.firstName || ""} ${m.lastName || ""}`.trim();
                return (
                  <div
                    key={m._id}
                    onClick={() => {
                      onChange(m._id);
                      setIsOpen(false);
                    }}
                    className={`px-3.5 py-2 text-xs cursor-pointer transition-colors flex items-center justify-between ${isHighlighted
                      ? "bg-[#E6F4EA] text-[#16A36A] font-semibold"
                      : isSelected
                        ? "bg-[#E6F4EA]/70 text-[#16A36A] font-semibold"
                        : "text-[#172033] hover:bg-slate-50"
                      }`}
                  >
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-xs text-[#172033]">{mName}</span>
                      <span className="text-[10px] text-slate-500 font-normal">+91 {m.phone || "—"} • {m.role || "Farmer"}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#16A36A] shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== SEARCHABLE PRODUCT SELECT ====================
function SearchableProductSelect({
  value,
  onChange,
  products,
  stockSummary = [],
  placeholder = "Search product by name, SKU or barcode...",
  disabled = false,
  onCreateProduct,
  hideLabel = false,
  inputRef,
  onSelectProduct
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setProductDropdownOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setProductDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedProduct = products.find(p => p._id === value);

  useEffect(() => {
    if (!dropdownOpen) {
      setSearchQuery(selectedProduct ? selectedProduct.productName : "");
    }
  }, [value, selectedProduct, dropdownOpen]);

  const getProductStock = (product) => {
    if (!product?.products) return 0;
    return product.products.reduce((total, variant) => {
      const stockRecord = (stockSummary || []).find(s =>
        s.item?.variantId === variant?._id ||
        s.item?._id === variant?._id ||
        (s.item?.sourceRef === product?._id &&
          String(s.item?.parameter).trim().toLowerCase() === String(variant?.parameter).trim().toLowerCase() &&
          String(s.item?.unit).trim().toLowerCase() === String(variant?.unit).trim().toLowerCase())
      );
      return total + (stockRecord?.availableQuantity ?? variant?.quantity ?? 0);
    }, 0);
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(p =>
      p.productName?.toLowerCase().includes(q) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.productCategory && p.productCategory.toLowerCase().includes(q)) ||
      (p.products && p.products.some(v => (v.itemCode && v.itemCode.toLowerCase().includes(q)) || (v.hsnCode && v.hsnCode.toLowerCase().includes(q))))
    );
  }, [products, searchQuery]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [searchQuery]);

  const handleKeyDown = (e) => {
    if (!dropdownOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setProductDropdownOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % Math.max(1, filteredProducts.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev - 1 + filteredProducts.length) % Math.max(1, filteredProducts.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredProducts[highlightIndex]) {
        const picked = filteredProducts[highlightIndex];
        onChange(picked._id);
        setSearchQuery(picked.productName);
        setProductDropdownOpen(false);
        if (onSelectProduct) onSelectProduct(picked);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setProductDropdownOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="w-full relative">
      {!hideLabel && (
        <label className="block text-xs font-semibold text-[#172033] mb-1 flex items-center justify-between">
          <span>Product Search *</span>
          <span className="text-[#16A36A] font-semibold text-[11px]">[F3 Search]</span>
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={searchQuery}
          onFocus={() => {
            if (!disabled) {
              setProductDropdownOpen(true);
              setSearchQuery("");
            }
          }}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setProductDropdownOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`pl-9 pr-14 w-full border rounded-lg text-xs h-[42px] transition-all font-medium bg-white text-[#172033] placeholder-slate-400 ${dropdownOpen
            ? "border-[#16A36A] ring-2 ring-[#16A36A]/20"
            : "border-[#DCE5EA] hover:border-slate-300"
            }`}
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
          F3
        </span>
      </div>

      {dropdownOpen && (
        <div className="absolute left-0 right-0 z-[100] mt-1 bg-white border border-[#DCE5EA] rounded-lg shadow-lg overflow-hidden flex flex-col max-h-[300px] animate-in fade-in duration-100">
          <div className="overflow-y-auto divide-y divide-slate-100">
            <button
              type="button"
              onClick={() => {
                setProductDropdownOpen(false);
                if (onCreateProduct) onCreateProduct();
              }}
              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-[#16A36A] hover:bg-[#E6F4EA]/50 flex items-center gap-2 transition-colors border-b border-slate-100"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+ Create New Product Variant [Alt+N]</span>
            </button>

            {filteredProducts.length === 0 ? (
              <div className="px-3.5 py-4 text-xs text-slate-400 text-center font-medium">
                No matching product in inventory
              </div>
            ) : (
              filteredProducts.map((p, idx) => {
                const isSelected = value === p._id;
                const isHighlighted = idx === highlightIndex;
                const totalStock = getProductStock(p);
                const firstVar = p.products?.[0];
                const skuCode = firstVar?.itemCode || p._id?.slice(-6);
                const priceVal = firstVar?.salePrice ? `₹${firstVar.salePrice} / ${firstVar.unit || 'Unit'}` : '';

                return (
                  <div
                    key={p._id}
                    onClick={() => {
                      onChange(p._id);
                      setSearchQuery(p.productName);
                      setProductDropdownOpen(false);
                      if (onSelectProduct) onSelectProduct(p);
                    }}
                    className={`px-3.5 py-2.5 cursor-pointer transition-colors flex items-center justify-between ${isHighlighted
                      ? "bg-[#E6F4EA] text-[#16A36A]"
                      : isSelected
                        ? "bg-[#E6F4EA]/70 text-[#16A36A]"
                        : "hover:bg-slate-50 text-[#172033]"
                      }`}
                  >
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-xs text-[#172033]">{p.productName}</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        SKU: <b className="font-mono text-slate-600">{skuCode}</b> {priceVal ? `• ${priceVal}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${totalStock > 0
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-red-50 text-red-600 border-red-200"
                        }`}>
                        Stock: {totalStock}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-[#16A36A] shrink-0" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== MAIN INVOICE FORM INNER COMPONENT ====================
function InvoiceFormInner({ editRecord = null, parties, products, stockSummary = [], sellLoading, members }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showTaxSupplyDetails, setShowTaxSupplyDetails] = useState(false);

  const [saleType, setSaleType] = useState(editRecord ? editRecord.saleType : "SALE");
  const [billingType, setBillingType] = useState(editRecord ? editRecord.billingType : "Cash");
  const [selectedPartyId, setSelectedPartyId] = useState(editRecord ? (editRecord.party?._id || editRecord.party || "") : "");
  const [selectedMemberId, setSelectedMemberId] = useState("");

  const [invoiceNo, setInvoiceNo] = useState(editRecord ? (editRecord.billNumber || editRecord.invoiceNo || "") : "");
  const [billDate, setBillDate] = useState(editRecord ? (editRecord.billDate || (editRecord.createdAt ? new Date(editRecord.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0])) : new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(editRecord && editRecord.dueDate ? new Date(editRecord.dueDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
  const [paymentType, setPaymentType] = useState(editRecord ? (editRecord.paymentType || "Cash") : "Cash");
  const [referenceNo, setReferenceNo] = useState(editRecord ? (editRecord.referenceNo || "") : "");

  // Walk-in fields
  const [buyerName, setBuyerName] = useState(editRecord ? (editRecord.buyerName || "") : "");
  const [buyerPhone, setBuyerPhone] = useState(editRecord ? (editRecord.buyerPhone || "") : "");
  const [buyerAddress, setBuyerAddress] = useState(editRecord ? (editRecord.buyerAddress || "") : "");
  const [buyerType, setBuyerType] = useState(editRecord ? (editRecord.buyerType || "FARMER") : "FARMER");
  const [remarks, setRemarks] = useState(editRecord ? (editRecord.remarks || "") : "");

  const [stateOfSupply, setStateOfSupply] = useState(editRecord ? (editRecord.stateOfSupply || "Uttar Pradesh") : "Uttar Pradesh");
  const [supplyType, setSupplyType] = useState(editRecord ? (editRecord.supplyType || "Tax Invoice") : "Tax Invoice");
  const [termsAndConditions, setTermsAndConditions] = useState(editRecord ? (editRecord.termsAndConditions || "") : "");
  const [description, setDescription] = useState(editRecord ? (editRecord.description || "") : "");
  const [roundOff, setRoundOff] = useState(editRecord ? !!editRecord.roundOff : false);
  const [receivedAmount, setReceivedAmount] = useState(editRecord ? (editRecord.receivedAmount !== undefined ? editRecord.receivedAmount : 0) : 0);
  const [isReceivedManual, setIsReceivedManual] = useState(editRecord ? (editRecord.receivedAmount !== undefined) : false);

  const [customerType, setCustomerType] = useState(() => {
    if (editRecord) {
      return editRecord.party ? "registered" : "walkin";
    }
    return "registered";
  });
  const [buyerGstin, setBuyerGstin] = useState(editRecord ? (editRecord.buyerGstin || "") : "");
  const [errors, setErrors] = useState({});

  // Input Refs for Keyboard Navigation
  const formRef = useRef(null);
  const partySelectRef = useRef(null);
  const memberSelectRef = useRef(null);
  const buyerNameInputRef = useRef(null);
  const productSearchInputRef = useRef(null);
  const draftQtyRef = useRef(null);
  const draftPriceRef = useRef(null);
  const draftDiscountPercentRef = useRef(null);
  const addItemBtnRef = useRef(null);
  const receivedAmountInputRef = useRef(null);

  // Auto-detect member if editing
  useEffect(() => {
    if (editRecord && !editRecord.party && editRecord.buyerPhone && members?.length > 0) {
      const found = members.find((m) => m.phone === editRecord.buyerPhone);
      if (found) {
        setSelectedMemberId(found._id);
        setCustomerType("member");
      }
    }
  }, [editRecord, members]);

  // Global Keyboard Navigation Shortcuts Handler
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showShortcutsModal) {
          setShowShortcutsModal(false);
          return;
        }
        if (showProductModal) {
          setShowProductModal(false);
          return;
        }
        if (addVendorOpen) {
          setAddVendorOpen(false);
          return;
        }
      }

      if (showShortcutsModal || showProductModal || addVendorOpen) return;

      if (e.key === "F1") {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      } else if (e.key === "F2" || (e.altKey && e.key.toLowerCase() === "c")) {
        e.preventDefault();
        if (customerType === "registered" && partySelectRef.current) partySelectRef.current.focus();
        else if (customerType === "member" && memberSelectRef.current) memberSelectRef.current.focus();
        else if (buyerNameInputRef.current) buyerNameInputRef.current.focus();
      } else if (e.key === "F3" || (e.altKey && e.key.toLowerCase() === "i")) {
        e.preventDefault();
        if (productSearchInputRef.current) productSearchInputRef.current.focus();
      } else if (e.key === "F4" || (e.altKey && e.key.toLowerCase() === "p")) {
        e.preventDefault();
        if (receivedAmountInputRef.current) receivedAmountInputRef.current.focus();
      } else if (e.key === "F8") {
        e.preventDefault();
        setBillingType((prev) => {
          const next = prev === "Cash" ? "Credit" : "Cash";
          toast.success(`Switched billing mode to: ${next}`);
          return next;
        });
      } else if (e.key === "F9") {
        e.preventDefault();
        setSaleType((prev) => {
          const next = prev === "SALE" ? "ESTIMATE" : "SALE";
          toast.success(`Switched document type to: ${next}`);
          return next;
        });
      } else if ((e.ctrlKey && e.key === "s") || (e.ctrlKey && e.key === "Enter") || e.key === "F10") {
        e.preventDefault();
        if (formRef.current) {
          formRef.current.requestSubmit();
        }
      } else if (e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setShowProductModal(true);
      } else if (e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setAddVendorOpen(true);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [showShortcutsModal, showProductModal, addVendorOpen, customerType]);

  const handleCustomerTypeChange = (type) => {
    setCustomerType(type);
    setErrors({});
    if (type === "registered") {
      setBuyerName("");
      setBuyerPhone("");
      setBuyerAddress("");
      setBuyerGstin("");
      setBuyerType("FARMER");
      setSelectedMemberId("");
      setTimeout(() => partySelectRef.current?.focus(), 50);
    } else if (type === "member") {
      setSelectedPartyId("");
      setBuyerName("");
      setBuyerPhone("");
      setBuyerAddress("");
      setBuyerGstin("");
      setBuyerType("FARMER");
      setTimeout(() => memberSelectRef.current?.focus(), 50);
    } else {
      setSelectedPartyId("");
      setSelectedMemberId("");
      setBuyerName("");
      setBuyerPhone("");
      setBuyerAddress("");
      setBuyerGstin("");
      setBuyerType("FARMER");
      setTimeout(() => buyerNameInputRef.current?.focus(), 50);
    }
  };

  const handleMemberChange = (memberId) => {
    setSelectedMemberId(memberId);
    if (memberId) {
      const m = members.find((x) => x._id === memberId);
      if (m) {
        setBuyerName(`${m.firstName || ""} ${m.lastName || ""}`.trim());
        setBuyerPhone(m.phone || "");
        setBuyerAddress(`${m.district || ""}, ${m.state || ""}`.trim().replace(/^,\s*/, ""));
        setBuyerType(m.role?.toUpperCase() === "STAFF" ? "STAFF" : "FARMER");
      }
    } else {
      setBuyerName("");
      setBuyerPhone("");
      setBuyerAddress("");
      setBuyerType("FARMER");
    }
  };

  const [checkoutItems, setCheckoutItems] = useState(() => {
    if (editRecord && editRecord.items?.length > 0) {
      return editRecord.items.map((it) => {
        const targetItemId = it.item?._id || it.item;
        const stockRecord = stockSummary.find((s) => s.item?._id === targetItemId || s._id === targetItemId);
        let productId = stockRecord?.item?.sourceRef || "";

        if (!productId) {
          const matchedProd = products.find(p => p._id === targetItemId || p.products?.some(v => v._id === targetItemId));
          if (matchedProd) {
            productId = matchedProd._id;
          }
        }

        const prod = products.find(p => p._id === productId);
        let variantIndex = 0;
        if (prod?.products) {
          const vIdx = prod.products.findIndex(v => v._id === targetItemId || v.unit === it.unit);
          if (vIdx !== -1) variantIndex = vIdx;
        }

        const discType = it.discountType || (it.discountPercent > 0 ? "Percentage" : "Fixed Amount");

        return {
          productId,
          variantIndex,
          quantity: it.quantity,
          unit: it.unit || "pcs",
          pricePerUnit: it.pricePerUnit || it.rate || "",
          rate: it.rate || it.pricePerUnit || "",
          taxType: it.taxType || "Without Tax",
          discountType: discType,
          discountPercent: it.discountPercent || "",
          discountAmount: it.discountAmount || "",
          taxPercent: it.taxPercent || "",
          taxAmount: it.taxAmount || 0,
          amount: it.amount || 0,
        };
      });
    }
    return [];
  });

  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);

  const [draftProductId, setDraftProductId] = useState("");
  const [draftVariantIndex, setDraftVariantIndex] = useState(0);
  const [draftQty, setDraftQty] = useState(1);
  const [draftUnit, setDraftUnit] = useState("pcs");
  const [draftPrice, setDraftPrice] = useState("");
  const [draftTaxType, setDraftTaxType] = useState("Without Tax");
  const [draftDiscountType, setDraftDiscountType] = useState("Percentage");
  const [draftDiscountPercent, setDraftDiscountPercent] = useState("");
  const [draftDiscountAmount, setDraftDiscountAmount] = useState("");
  const [draftTaxPercent, setDraftTaxPercent] = useState("");

  const draftProd = useMemo(() => products.find((p) => p._id === draftProductId), [products, draftProductId]);
  const draftVariant = useMemo(() => draftProd?.products?.[draftVariantIndex], [draftProd, draftVariantIndex]);

  const variantStock = useMemo(() => {
    if (!draftVariant) return null;
    return (stockSummary || []).find(
      (s) => s.item?.variantId === draftVariant?._id || s.item?._id === draftVariant?._id || (
        s.item?.sourceRef === draftProd?._id &&
        String(s.item?.parameter).trim().toLowerCase() === String(draftVariant?.parameter).trim().toLowerCase() &&
        String(s.item?.unit).trim().toLowerCase() === String(draftVariant?.unit).trim().toLowerCase()
      )
    );
  }, [stockSummary, draftVariant, draftProd]);

  const availableQty = useMemo(() => {
    if (!draftProd) return 0;
    if (!draftVariant) return 0;
    return variantStock ? (variantStock.availableQuantity ?? 0) : (draftVariant?.quantity ?? 0);
  }, [draftProd, draftVariant, variantStock]);

  useEffect(() => {
    if (selectedPartyId) {
      const p = parties.find((party) => party._id === selectedPartyId);
      if (p && p.state) {
        setStateOfSupply(p.state);
      }
    }
  }, [selectedPartyId, parties]);

  useEffect(() => {
    if (draftProd) {
      const variant = draftProd.products?.[draftVariantIndex];
      setDraftPrice(variant?.salePrice || "");
      setDraftUnit(variant?.unit || "pcs");
      setDraftTaxPercent(draftProd.taxRate !== undefined && draftProd.taxRate !== null ? parseFloat(draftProd.taxRate) : 0);
      setDraftQty(1);
      setDraftDiscountPercent("");
      setDraftDiscountAmount("");
      setDraftDiscountType("Percentage");
      setDraftTaxType(variant?.salePriceTaxType || "Without Tax");
    } else {
      setDraftPrice("");
      setDraftUnit("pcs");
      setDraftTaxPercent("");
      setDraftQty(1);
      setDraftDiscountPercent("");
      setDraftDiscountAmount("");
      setDraftDiscountType("Percentage");
      setDraftTaxType("Without Tax");
    }
  }, [draftProductId, draftVariantIndex, draftProd]);

  const computedDraftDetails = useMemo(() => {
    const q = draftQty === "" ? 0 : parseFloat(draftQty) || 0;
    const price = draftPrice === "" ? 0 : parseFloat(draftPrice) || 0;
    const tPct = draftTaxPercent === "" ? 0 : parseFloat(draftTaxPercent) || 0;

    let rate = price;
    if (draftTaxType === "With Tax") {
      rate = price / (1 + tPct / 100);
    }
    rate = parseFloat(rate.toFixed(4));

    const base = q * price;
    let discAmt = 0;
    let discPct = 0;

    if (draftProductId) {
      if (draftDiscountType === "Fixed Amount") {
        const dAmt = draftDiscountAmount === "" ? 0 : parseFloat(draftDiscountAmount) || 0;
        discAmt = Math.min(base, Math.max(0, dAmt));
        discPct = base > 0 ? parseFloat(((discAmt / base) * 100).toFixed(2)) : 0;
      } else {
        const dPct = draftDiscountPercent === "" ? 0 : parseFloat(draftDiscountPercent) || 0;
        discPct = Math.min(100, Math.max(0, dPct));
        discAmt = parseFloat((base * (discPct / 100)).toFixed(2));
      }
    }

    const taxable = Math.max(0, base - discAmt);
    let taxAmt = 0;
    let amount = 0;

    if (draftTaxType === "With Tax") {
      amount = parseFloat(taxable.toFixed(2));
      const exclTax = amount / (1 + tPct / 100);
      taxAmt = parseFloat((amount - exclTax).toFixed(2));
    } else {
      taxAmt = parseFloat((taxable * (tPct / 100)).toFixed(2));
      amount = parseFloat((taxable + taxAmt).toFixed(2));
    }

    return {
      rate: parseFloat(rate.toFixed(2)),
      discountAmount: parseFloat(discAmt.toFixed(2)),
      discountPercent: parseFloat(discPct.toFixed(2)),
      taxAmount: parseFloat(taxAmt.toFixed(2)),
      amount: parseFloat(amount.toFixed(2))
    };
  }, [
    draftProductId,
    draftQty,
    draftPrice,
    draftTaxType,
    draftDiscountType,
    draftDiscountPercent,
    draftDiscountAmount,
    draftTaxPercent
  ]);

  const handleAddDraftItem = () => {
    if (!draftProductId) {
      toast.error("Please select a product first");
      return;
    }
    if (draftQty <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }

    if (saleType === "SALE") {
      const selectedVariant = draftVariant;
      const variantStock = (stockSummary || []).find(
        (s) => s.item?.variantId === selectedVariant?._id || s.item?._id === selectedVariant?._id || (
          s.item?.sourceRef === draftProd?._id &&
          String(s.item?.parameter).trim().toLowerCase() === String(selectedVariant?.parameter).trim().toLowerCase() &&
          String(s.item?.unit).trim().toLowerCase() === String(selectedVariant?.unit).trim().toLowerCase()
        )
      );
      const availableQty = variantStock ? (variantStock.availableQuantity ?? 0) : (selectedVariant?.quantity ?? 0);

      const alreadyAddedQty = checkoutItems
        .filter((item) => item.productId === draftProductId && item.variantIndex === draftVariantIndex)
        .reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);

      let originalQty = 0;
      if (editRecord) {
        const inventoryItemId = variantStock?.item?._id || selectedVariant?._id || draftProd?._id;
        const inventoryItemAltId = variantStock?._id;
        const origItem = editRecord.items?.find((o) => {
          const oId = o.item?._id || o.item;
          return oId === inventoryItemId || oId === inventoryItemAltId || oId === selectedVariant?._id || oId === draftProd?._id;
        });
        if (origItem) originalQty = origItem.quantity;
      }

      if ((parseFloat(draftQty) + alreadyAddedQty) > (availableQty + originalQty)) {
        toast.error(
          `Quantity exceeds available stock (${availableQty + originalQty}). You already have ${alreadyAddedQty} in the list.`
        );
        return;
      }
    }

    const existingIdx = checkoutItems.findIndex(
      (item) => item.productId === draftProductId && item.variantIndex === draftVariantIndex
    );

    if (existingIdx !== -1) {
      const existingItem = checkoutItems[existingIdx];
      const newQty = (parseFloat(existingItem.quantity) || 0) + parseFloat(draftQty);

      const q = newQty;
      const price = parseFloat(existingItem.pricePerUnit) || 0;
      const base = q * price;
      let discAmt = 0;
      let discPct = parseFloat(existingItem.discountPercent) || 0;

      if (existingItem.discountType === "Fixed Amount") {
        const dAmt = parseFloat(existingItem.discountAmount) || 0;
        discAmt = Math.min(base, Math.max(0, dAmt));
        discPct = base > 0 ? parseFloat(((discAmt / base) * 100).toFixed(2)) : 0;
      } else {
        discAmt = parseFloat((base * (discPct / 100)).toFixed(2));
      }

      const taxable = Math.max(0, base - discAmt);
      const tPct = parseFloat(existingItem.taxPercent) || 0;
      let taxAmt = 0;
      let totalAmt = 0;
      if (existingItem.taxType === "With Tax") {
        totalAmt = parseFloat(taxable.toFixed(2));
        const exclTax = totalAmt / (1 + tPct / 100);
        taxAmt = parseFloat((totalAmt - exclTax).toFixed(2));
      } else {
        taxAmt = parseFloat((taxable * (tPct / 100)).toFixed(2));
        totalAmt = parseFloat((taxable + taxAmt).toFixed(2));
      }

      let updatedRate = price;
      if (existingItem.taxType === "With Tax") {
        updatedRate = price / (1 + tPct / 100);
      }

      setCheckoutItems((prev) => {
        const copy = [...prev];
        copy[existingIdx] = {
          ...existingItem,
          quantity: newQty,
          rate: parseFloat(updatedRate.toFixed(2)),
          discountPercent: existingItem.discountPercent === "" ? "" : discPct,
          discountAmount: existingItem.discountAmount === "" ? "" : discAmt,
          taxAmount: taxAmt,
          amount: totalAmt
        };
        return copy;
      });
      toast.success("Updated item quantity!");
    } else {
      setCheckoutItems((prev) => {
        const cleanedPrev = prev.filter((i) => i.productId !== "");
        return [
          ...cleanedPrev,
          {
            productId: draftProductId,
            variantIndex: draftVariantIndex,
            quantity: parseFloat(draftQty),
            unit: draftUnit,
            pricePerUnit: draftPrice === "" ? 0 : parseFloat(draftPrice),
            rate: computedDraftDetails.rate,
            taxType: draftTaxType,
            discountPercent: computedDraftDetails.discountPercent,
            discountAmount: computedDraftDetails.discountAmount,
            discountType: draftDiscountType,
            taxPercent: draftTaxPercent === "" ? 0 : parseFloat(draftTaxPercent),
            taxAmount: computedDraftDetails.taxAmount,
            amount: computedDraftDetails.amount
          }
        ];
      });
      toast.success("Added item to POS bill!");
    }

    setDraftProductId("");
    setDraftVariantIndex(0);
    setDraftQty(1);
    setDraftUnit("pcs");
    setDraftPrice("");
    setDraftDiscountPercent("");
    setDraftDiscountAmount("");
    setDraftDiscountType("Percentage");
    setDraftTaxPercent("");
    setDraftTaxType("Without Tax");

    setTimeout(() => {
      productSearchInputRef.current?.focus();
    }, 50);
  };

  const handleEditItem = (idx) => {
    const item = checkoutItems[idx];
    setDraftProductId(item.productId);
    setDraftVariantIndex(item.variantIndex);
    setDraftQty(item.quantity);
    setDraftPrice(item.pricePerUnit);
    setDraftUnit(item.unit || "pcs");
    setDraftTaxType(item.taxType || "Without Tax");
    setDraftDiscountType(item.discountType || "Percentage");
    if (item.discountType === "Fixed Amount") {
      setDraftDiscountAmount(item.discountAmount);
      setDraftDiscountPercent("");
    } else {
      setDraftDiscountPercent(item.discountPercent);
      setDraftDiscountAmount("");
    }
    setDraftTaxPercent(item.taxPercent);

    setCheckoutItems((prev) => prev.filter((_, i) => i !== idx));
    setTimeout(() => {
      draftQtyRef.current?.focus();
    }, 50);
  };

  const handleUpdateItemInline = (idx, field, value) => {
    setCheckoutItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[idx] };

      if (field === "quantity" || field === "pricePerUnit") {
        if (value === "") {
          item[field] = "";
        } else {
          item[field] = parseFloat(value) || 0;
        }
      } else if (field === "discount") {
        if (item.discountType === "Fixed Amount") {
          item.discountAmount = value === "" ? "" : parseFloat(value) || 0;
          item.discountPercent = "";
        } else {
          item.discountPercent = value === "" ? "" : parseFloat(value) || 0;
          item.discountAmount = "";
        }
      } else if (field === "taxPercent") {
        item.taxPercent = value === "" ? "" : parseFloat(value) || 0;
      } else if (field === "unit") {
        item.unit = value;
      }

      const q = item.quantity === "" ? 0 : parseFloat(item.quantity) || 0;
      const price = item.pricePerUnit === "" ? 0 : parseFloat(item.pricePerUnit) || 0;
      const tPct = parseFloat(item.taxPercent) || 0;

      let rate = price;
      if (item.taxType === "With Tax") {
        rate = price / (1 + tPct / 100);
      }
      rate = parseFloat(rate.toFixed(4));
      item.rate = rate;

      const base = q * price;
      let discAmt = 0;
      let discPct = 0;

      if (item.discountType === "Fixed Amount") {
        const dAmt = item.discountAmount === "" ? 0 : parseFloat(item.discountAmount) || 0;
        discAmt = Math.min(base, Math.max(0, dAmt));
        discPct = base > 0 ? parseFloat(((discAmt / base) * 100).toFixed(2)) : 0;
        item.discountAmount = discAmt;
        item.discountPercent = discPct;
      } else {
        const dPct = item.discountPercent === "" ? 0 : parseFloat(item.discountPercent) || 0;
        discPct = Math.min(100, Math.max(0, dPct));
        discAmt = parseFloat((base * (discPct / 100)).toFixed(2));
        item.discountPercent = discPct;
        item.discountAmount = discAmt;
      }

      const taxable = Math.max(0, base - discAmt);
      let taxAmt = 0;
      let amount = 0;

      if (item.taxType === "With Tax") {
        amount = parseFloat(taxable.toFixed(2));
        const exclTax = amount / (1 + tPct / 100);
        taxAmt = parseFloat((amount - exclTax).toFixed(2));
      } else {
        taxAmt = parseFloat((taxable * (tPct / 100)).toFixed(2));
        amount = parseFloat((taxable + taxAmt).toFixed(2));
      }

      item.taxAmount = taxAmt;
      item.amount = amount;

      copy[idx] = item;
      return copy;
    });
  };

  const subTotal = parseFloat(checkoutItems.reduce((acc, item) => acc + ((item.quantity === "" ? 0 : (parseFloat(item.quantity) || 0)) * (item.pricePerUnit === "" ? 0 : (parseFloat(item.pricePerUnit) || 0))), 0).toFixed(2));
  const totalDiscounts = parseFloat(checkoutItems.reduce((acc, item) => acc + (item.discountAmount === "" ? 0 : (parseFloat(item.discountAmount) || 0)), 0).toFixed(2));
  const totalTaxes = parseFloat(checkoutItems.reduce((acc, item) => acc + (parseFloat(item.taxAmount) || 0), 0).toFixed(2));
  const grandTotal = parseFloat(checkoutItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0).toFixed(2));

  const roundOffAmount = roundOff ? parseFloat((Math.round(grandTotal) - grandTotal).toFixed(2)) : 0;
  const finalTotal = roundOff ? Math.round(grandTotal) : grandTotal;
  const unpaidAmount = parseFloat((finalTotal - (parseFloat(receivedAmount) || 0)).toFixed(2));

  useEffect(() => {
    if (!isReceivedManual) {
      if (billingType === "Cash") {
        setReceivedAmount(finalTotal);
      } else {
        setReceivedAmount(0);
      }
    }
  }, [billingType, finalTotal, isReceivedManual]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (customerType === "registered" && !selectedPartyId) {
      newErrors.selectedPartyId = "Party Profile is required.";
    }
    if (customerType === "member" && !selectedMemberId) {
      newErrors.selectedMemberId = "Member Profile is required.";
    }
    if (customerType === "walkin" && !buyerName.trim()) {
      newErrors.buyerName = "Buyer Name is required.";
    }
    if (billingType === "Credit" && !dueDate) {
      newErrors.dueDate = "Due Date is required for Credit (Udhar) transactions.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill in required customer details");
      return;
    }

    const validItems = checkoutItems.filter((i) => i.productId && (i.quantity === "" ? 0 : (parseFloat(i.quantity) || 0)) > 0);
    if (validItems.length === 0) {
      setErrors({ checkoutItems: "Please add at least one product item to bill." });
      toast.error("Please add at least one valid product line item");
      if (productSearchInputRef.current) productSearchInputRef.current.focus();
      return;
    }

    if (saleType === "SALE") {
      for (const item of validItems) {
        const prod = products.find((p) => p._id === item.productId);
        const variant = prod?.products?.[item.variantIndex];
        const variantStock = (stockSummary || []).find(
          (s) => s.item?.variantId === variant?._id || s.item?._id === variant?._id || (
            s.item?.sourceRef === prod?._id &&
            String(s.item?.parameter).trim().toLowerCase() === String(variant?.parameter).trim().toLowerCase() &&
            String(s.item?.unit).trim().toLowerCase() === String(variant?.unit).trim().toLowerCase()
          )
        );
        const availableQty = variantStock ? (variantStock.availableQuantity ?? 0) : (variant?.quantity ?? 0);
        let originalQty = 0;
        if (editRecord) {
          const inventoryItemId = variantStock?.item?._id || variant?._id || prod?._id;
          const inventoryItemAltId = variantStock?._id;
          const origItem = editRecord.items?.find((o) => {
            const oId = o.item?._id || o.item;
            return oId === inventoryItemId || oId === inventoryItemAltId || oId === variant?._id || oId === prod?._id;
          });
          if (origItem) originalQty = origItem.quantity;
        }
        if ((item.quantity === "" ? 0 : (parseFloat(item.quantity) || 0)) > (availableQty + originalQty)) {
          toast.error(
            `Quantity (${item.quantity}) for "${prod?.productName || "Product"}" exceeds stock (${availableQty + originalQty})`
          );
          return;
        }
      }
    }

    const payloadItems = validItems.map((item) => {
      const prod = products.find((p) => p._id === item.productId);
      const variant = prod?.products?.[item.variantIndex];
      const stockRecord = (stockSummary || []).find(
        (s) => s.item?.variantId === variant?._id || s.item?._id === variant?._id || (
          s.item?.sourceRef === prod?._id &&
          String(s.item?.parameter).trim().toLowerCase() === String(variant?.parameter).trim().toLowerCase() &&
          String(s.item?.unit).trim().toLowerCase() === String(variant?.unit).trim().toLowerCase()
        )
      );
      const inventoryItemId = stockRecord?.item?._id || variant?._id || prod?._id;
      return {
        item: inventoryItemId,
        quantity: item.quantity === "" ? 0 : (parseInt(item.quantity) || 0),
        unit: item.unit || variant?.unit || "pcs",
        pricePerUnit: parseFloat((parseFloat(item.pricePerUnit) || 0).toFixed(2)),
        rate: parseFloat((parseFloat(item.rate) || 0).toFixed(2)),
        taxType: item.taxType || "Without Tax",
        discountType: item.discountType || "Percentage",
        discountPercent: parseFloat((parseFloat(item.discountPercent) || 0).toFixed(2)),
        discountAmount: parseFloat((parseFloat(item.discountAmount) || 0).toFixed(2)),
        taxPercent: parseFloat((parseFloat(item.taxPercent) || 0).toFixed(2)),
        taxAmount: parseFloat((parseFloat(item.taxAmount) || 0).toFixed(2)),
        amount: parseFloat((parseFloat(item.amount) || 0).toFixed(2)),
      };
    });

    const payload = {
      saleType,
      billingType,
      billNumber: invoiceNo.trim() || undefined,
      invoiceNo: invoiceNo.trim() || undefined,
      billDate: billDate || undefined,
      dueDate: billingType === "Credit" ? (dueDate || undefined) : undefined,
      paymentType: (billingType === "Cash" || (billingType === "Credit" && (parseFloat(receivedAmount) || 0) > 0)) ? paymentType : undefined,
      referenceNo: (billingType === "Cash" || (billingType === "Credit" && (parseFloat(receivedAmount) || 0) > 0)) && paymentType !== "Cash" ? (referenceNo.trim() || undefined) : undefined,
      party: customerType === "registered" ? (selectedPartyId || null) : null,
      buyerName: customerType === "registered"
        ? (parties.find((p) => p._id === selectedPartyId)?.name || "")
        : buyerName.trim(),
      buyerPhone: customerType === "registered"
        ? (parties.find((p) => p._id === selectedPartyId)?.phoneNumber || "")
        : (buyerPhone.trim() || undefined),
      buyerAddress: customerType === "registered"
        ? (parties.find((p) => p._id === selectedPartyId)?.billingAddress || "")
        : (buyerAddress.trim() || undefined),
      buyerType: customerType === "registered" ? "FARMER" : buyerType,
      buyerGstin: customerType === "walkin" ? (buyerGstin.trim() || undefined) : undefined,
      items: payloadItems,
      subTotal,
      totalAmount: finalTotal,
      remarks,
      stateOfSupply,
      supplyType,
      termsAndConditions: termsAndConditions.trim() || undefined,
      description: description.trim() || undefined,
      roundOff,
      roundOffAmount,
      receivedAmount: parseFloat(receivedAmount) || 0,
      unpaidAmount: unpaidAmount >= 0 ? unpaidAmount : 0,
    };

    try {
      let savedSale = null;
      if (editRecord) {
        savedSale = await dispatch(updateSaleOrEstimate({ id: editRecord._id, payload })).unwrap();
        toast.success("Sales Bill updated successfully!");
      } else {
        savedSale = await dispatch(createSaleOrEstimate(payload)).unwrap();
        toast.success("Sales Bill created successfully!");
      }

      navigate("/sell?tab=sales");
    } catch (err) {
      toast.error(err || "Failed to submit transaction");
    }
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-12 select-none text-[#172033]">

      {/* HEADER BAR */}
      <div className="bg-white border border-[#DCE5EA] rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#172033] tracking-tight">
            {editRecord ? "Edit Counter Sales Invoice" : "Counter Sales (POS)"}
          </h1>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Create a new sale, add products and generate invoice
          </p>
        </div>

        {/* Hotkey Badges */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-400 flex items-center gap-1.5 font-medium">
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700 font-mono font-semibold">F9</kbd> New Sale
          </span>
          <span className="text-slate-400 flex items-center gap-1.5 font-medium">
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700 font-mono font-semibold">F10</kbd> Save
          </span>
          <span className="text-slate-400 flex items-center gap-1.5 font-medium">
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700 font-mono font-semibold">Ctrl + P</kbd> Print
          </span>
          <button
            type="button"
            onClick={() => setShowShortcutsModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-xs font-semibold transition"
          >
            <Keyboard className="w-3.5 h-3.5 text-[#16A36A]" />
            <span>F1 Shortcuts</span>
          </button>
        </div>
      </div>

      {/* FORM START */}
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">

        {/* SECTION 1: CUSTOMER & BILL HEADER BAR */}
        <div className="bg-white border border-[#DCE5EA] rounded-xl p-4 space-y-4">

          {/* Top Row: Segmented Controls + GST Settings toggle */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 pb-3 border-b border-slate-100">

            {/* Customer Type Segmented Control */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-[#F8FAFC] p-1 rounded-lg border border-[#DCE5EA]">
                <button
                  type="button"
                  onClick={() => handleCustomerTypeChange("registered")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${customerType === "registered"
                    ? "bg-[#E6F4EA] text-[#16A36A] shadow-2xs border border-[#16A36A]/20"
                    : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  <Users className="w-3.5 h-3.5 text-[#16A36A]" />
                  Registered Party
                </button>
                <button
                  type="button"
                  onClick={() => handleCustomerTypeChange("member")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${customerType === "member"
                    ? "bg-[#E6F4EA] text-[#16A36A] shadow-2xs border border-[#16A36A]/20"
                    : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  <User className="w-3.5 h-3.5 text-[#16A36A]" />
                  FPO Member
                </button>
                <button
                  type="button"
                  onClick={() => handleCustomerTypeChange("walkin")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${customerType === "walkin"
                    ? "bg-[#E6F4EA] text-[#16A36A] shadow-2xs border border-[#16A36A]/20"
                    : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#16A36A]" />
                  Walk-in Retail
                </button>
              </div>

              {/* Sale Type Segmented Control */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500">Sale Type:</span>
                <div className="flex bg-[#F8FAFC] p-1 rounded-lg border border-[#DCE5EA]">
                  <button
                    type="button"
                    onClick={() => setSaleType("SALE")}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${saleType === "SALE"
                      ? "bg-[#E6F4EA] text-[#16A36A] shadow-2xs border border-[#16A36A]/20"
                      : "text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    Direct Sale
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaleType("ESTIMATE")}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${saleType === "ESTIMATE"
                      ? "bg-[#E6F4EA] text-[#16A36A] shadow-2xs border border-[#16A36A]/20"
                      : "text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    Estimate
                  </button>
                </div>
              </div>

              {/* Payment Type Segmented Control */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500">Payment:</span>
                <div className="flex bg-[#F8FAFC] p-1 rounded-lg border border-[#DCE5EA]">
                  <button
                    type="button"
                    onClick={() => setBillingType("Cash")}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${billingType === "Cash"
                      ? "bg-[#E6F4EA] text-[#16A36A] shadow-2xs border border-[#16A36A]/20"
                      : "text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    Cash Bill
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingType("Credit")}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${billingType === "Credit"
                      ? "bg-[#E6F4EA] text-[#16A36A] shadow-2xs border border-[#16A36A]/20"
                      : "text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    Udhar / Credit
                  </button>
                </div>
              </div>
            </div>

            {/* GST / Tax Settings Collapsible Trigger */}
            <button
              type="button"
              onClick={() => setShowTaxSupplyDetails(!showTaxSupplyDetails)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-[#DCE5EA] transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#16A36A]" />
              <span>GST / Tax Settings</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showTaxSupplyDetails ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Customer Selection Fields */}
          {customerType === "registered" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#172033] mb-1">
                  Customer / Party <span className="text-red-500">*</span>
                </label>
                <SearchablePartySelect
                  value={selectedPartyId}
                  onChange={(val) => setSelectedPartyId(val)}
                  parties={parties}
                  error={errors.selectedPartyId}
                  inputRef={partySelectRef}
                  onOpenQuickAdd={() => setAddVendorOpen(true)}
                />
                {errors.selectedPartyId && (
                  <p className="text-red-500 text-[11px] font-semibold mt-1">{errors.selectedPartyId}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">Bill Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#DCE5EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A] bg-white h-[42px] font-medium text-[#172033] cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">
                  Due Date {billingType === "Credit" && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="date"
                  disabled={billingType === "Cash"}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A] h-[42px] font-medium transition-all ${billingType === "Cash"
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                    : errors.dueDate
                      ? "border-red-400 bg-white text-[#172033]"
                      : "border-[#DCE5EA] bg-white text-[#172033]"
                    }`}
                />
                {errors.dueDate && billingType === "Credit" && (
                  <p className="text-red-500 text-[11px] font-semibold mt-1">{errors.dueDate}</p>
                )}
              </div>
            </div>
          )}

          {customerType === "member" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#172033] mb-1">
                  FPO Member (Farmer) <span className="text-red-500">*</span>
                </label>
                <SearchableMemberSelect
                  value={selectedMemberId}
                  onChange={handleMemberChange}
                  members={members}
                  error={errors.selectedMemberId}
                  inputRef={memberSelectRef}
                />
                {errors.selectedMemberId && (
                  <p className="text-red-500 text-[11px] font-semibold mt-1">{errors.selectedMemberId}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">Bill Date</label>
                <input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#DCE5EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A] bg-white h-[42px] font-medium text-[#172033] cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">
                  Due Date {billingType === "Credit" && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="date"
                  disabled={billingType === "Cash"}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A] h-[42px] font-medium transition-all ${billingType === "Cash"
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                    : errors.dueDate
                      ? "border-red-400 bg-white text-[#172033]"
                      : "border-[#DCE5EA] bg-white text-[#172033]"
                    }`}
                />
                {errors.dueDate && billingType === "Credit" && (
                  <p className="text-red-500 text-[11px] font-semibold mt-1">{errors.dueDate}</p>
                )}
              </div>
            </div>
          )}

          {customerType === "walkin" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-start">
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={buyerNameInputRef}
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Enter customer name"
                    className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A] bg-white h-[42px] font-medium text-[#172033] ${errors.buyerName ? "border-red-400" : "border-[#DCE5EA]"
                      }`}
                  />
                  {errors.buyerName && (
                    <p className="text-red-500 text-[11px] font-semibold mt-1">{errors.buyerName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">Mobile Number</label>
                  <input
                    type="text"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="9876543210"
                    maxLength={10}
                    className="w-full px-3 py-2 text-xs border border-[#DCE5EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A] bg-white h-[42px] font-medium text-[#172033]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={buyerGstin}
                    onChange={(e) => setBuyerGstin(e.target.value.toUpperCase())}
                    placeholder="22AAAAA0000A1Z5"
                    className="w-full px-3 py-2 text-xs border border-[#DCE5EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A] bg-white h-[42px] font-medium text-[#172033] uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">Address</label>
                  <input
                    type="text"
                    value={buyerAddress}
                    onChange={(e) => setBuyerAddress(e.target.value)}
                    placeholder="Village / Town"
                    className="w-full px-3 py-2 text-xs border border-[#DCE5EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A] bg-white h-[42px] font-medium text-[#172033]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">Buyer Segment</label>
                  <select
                    value={buyerType}
                    onChange={(e) => setBuyerType(e.target.value)}
                    className="w-full border border-[#DCE5EA] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A] bg-white h-[42px] font-medium text-[#172033]"
                  >
                    <option value="FARMER">Farmer</option>
                    <option value="RETAILER">Retailer</option>
                    <option value="DISTRIBUTOR">Distributor</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">Bill Date</label>
                  <input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#DCE5EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A] bg-white h-[42px] font-medium text-[#172033] cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Due Date {billingType === "Credit" && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="date"
                    disabled={billingType === "Cash"}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A] h-[42px] font-medium transition-all ${billingType === "Cash"
                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                      : errors.dueDate
                        ? "border-red-400 bg-white text-[#172033]"
                        : "border-[#DCE5EA] bg-white text-[#172033]"
                      }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* GST & Supply Settings Collapsible Drawer */}
          {showTaxSupplyDetails && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 bg-slate-50/70 p-3 rounded-lg">
              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">State of Supply</label>
                <SearchableStateSelect
                  value={stateOfSupply}
                  onChange={(val) => setStateOfSupply(val)}
                  height="h-[40px]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">Supply Type</label>
                <select
                  value={supplyType}
                  onChange={(e) => setSupplyType(e.target.value)}
                  className="w-full border border-[#DCE5EA] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#16A36A] bg-white h-[40px] font-medium text-[#172033]"
                >
                  <option value="Tax Invoice">Tax Invoice</option>
                  <option value="Exempted Supply">Exempted Supply</option>
                  <option value="Zero Rated">Zero Rated</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2 & SIDEBAR GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">

          {/* Left Column (75% width): Add Product & Cart Table */}
          <div className="lg:col-span-3 space-y-4">

            {/* ADD PRODUCT SECTION (SINGLE COMPACT ROW) */}
            <div className="bg-white border border-[#DCE5EA] rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#172033] flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-[#16A36A]" />
                  <span>Add Product</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowProductModal(true)}
                  className="text-xs text-[#16A36A] hover:text-[#138A59] font-semibold bg-[#E6F4EA] px-2.5 py-1 rounded-md transition"
                >
                  + New Product [Alt+N]
                </button>
              </div>

              {/* Single Compact Row Structure */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">

                {/* Product Search (Primary width) */}
                <div className="md:col-span-4">
                  <label className="block text-xs font-semibold text-[#172033] mb-1">Product Search</label>
                  <SearchableProductSelect
                    value={draftProductId}
                    onChange={(newVal) => setDraftProductId(newVal)}
                    products={products}
                    stockSummary={stockSummary}
                    placeholder="Search product by name, SKU or barcode..."
                    onCreateProduct={() => setShowProductModal(true)}
                    hideLabel={true}
                    inputRef={productSearchInputRef}
                    onSelectProduct={() => {
                      setTimeout(() => draftQtyRef.current?.focus(), 50);
                    }}
                  />
                </div>

                {/* Qty (Numeric input, right-aligned) */}
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-[#172033] mb-1">Qty</label>
                  <input
                    ref={draftQtyRef}
                    type="number"
                    min="1"
                    value={draftQty}
                    onChange={(e) => setDraftQty(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        draftPriceRef.current?.focus();
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-2.5 py-2 border border-[#DCE5EA] rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A] bg-white text-right h-[42px] text-[#172033]"
                  />
                </div>

                {/* Unit Select */}
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-[#172033] mb-1">Unit</label>
                  <select
                    disabled={!draftProductId}
                    value={draftVariantIndex}
                    onChange={(e) => setDraftVariantIndex(parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-2 border border-[#DCE5EA] rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A] bg-white h-[42px] text-[#172033] truncate"
                  >
                    {draftProd?.products?.map((v, vIdx) => (
                      <option key={vIdx} value={vIdx}>
                        {v.unit} {v.parameter ? `(${v.parameter})` : ""}
                      </option>
                    ))}
                    {!draftProd && <option value="0">Pcs ▾</option>}
                  </select>
                </div>

                {/* Rate (₹) */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-[#172033] mb-1">Rate (₹)</label>
                  <input
                    ref={draftPriceRef}
                    type="number"
                    min="0"
                    step="any"
                    disabled={!draftProductId}
                    value={draftPrice}
                    onChange={(e) => setDraftPrice(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        draftDiscountPercentRef.current?.focus();
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    placeholder="0.00"
                    className="w-full px-2.5 py-2 border border-[#DCE5EA] rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A] bg-white text-right h-[42px] text-[#172033]"
                  />
                </div>

                {/* Disc (%) */}
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-[#172033] mb-1">Disc (%)</label>
                  <input
                    ref={draftDiscountPercentRef}
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    disabled={!draftProductId}
                    value={draftDiscountPercent}
                    onChange={(e) => setDraftDiscountPercent(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddDraftItem();
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                    className="w-full px-2 py-2 border border-[#DCE5EA] rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A] bg-white text-right h-[42px] text-[#172033]"
                  />
                </div>

                {/* GST (%) */}
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-[#172033] mb-1">GST (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    disabled={!draftProductId}
                    value={draftTaxPercent}
                    onChange={(e) => setDraftTaxPercent(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                    placeholder="0%"
                    className="w-full px-2 py-2 border border-[#DCE5EA] rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A] bg-white text-right h-[42px] text-[#172033]"
                  />
                </div>

                {/* Add Item Button */}
                <div className="md:col-span-2">
                  <button
                    ref={addItemBtnRef}
                    type="button"
                    onClick={handleAddDraftItem}
                    disabled={!draftProductId}
                    className="w-full flex items-center justify-center gap-1.5 h-[42px] px-3 bg-[#16A36A] hover:bg-[#138A59] active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg font-semibold text-xs transition shadow-xs whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 shrink-0 stroke-[2.5]" />
                    <span> Add Item</span>
                  </button>
                </div>
              </div>

              {/* Draft Live Summary Line */}
              {draftProductId && (
                <div className="flex justify-between items-center bg-[#E6F4EA]/60 px-3 py-2 rounded-lg border border-[#16A36A]/20 text-xs font-medium text-[#172033]">
                  <span>Line Item Amount: <b className="text-[#16A36A]">₹{computedDraftDetails.amount.toFixed(2)}</b> (Base Rate: ₹{computedDraftDetails.rate} | GST: ₹{computedDraftDetails.taxAmount})</span>
                  <span className="text-[11px] text-slate-500">Available Stock: {availableQty} {draftUnit}</span>
                </div>
              )}
            </div>

            {/* PRODUCT CART TABLE */}
            <div className="bg-white border border-[#DCE5EA] rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-semibold text-[#172033] flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-[#16A36A]" />
                  <span>Product Cart ({checkoutItems.filter(i => i.productId).length} Items)</span>
                </h3>
                {errors.checkoutItems && (
                  <p className="text-red-500 text-xs font-semibold">{errors.checkoutItems}</p>
                )}
              </div>

              {checkoutItems.filter(i => i.productId).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 border border-dashed border-[#DCE5EA] rounded-lg bg-[#F8FAFC]">
                  <FileSpreadsheet className="w-8 h-8 text-slate-300 mb-1.5" />
                  <p className="font-semibold text-slate-600 text-xs">No products in cart</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Use product search above to add items [Press F3]</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-[#DCE5EA] rounded-lg">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#DCE5EA] text-slate-600 text-[11px] font-semibold">
                        <th className="px-3 py-2.5 w-10 text-center">#</th>
                        <th className="px-3 py-2.5">Product</th>
                        <th className="px-3 py-2.5 text-center w-20">HSN</th>
                        <th className="px-3 py-2.5 text-right w-20">Qty</th>
                        <th className="px-3 py-2.5 text-center w-20">Unit</th>
                        <th className="px-3 py-2.5 text-right w-24">Rate (₹)</th>
                        <th className="px-3 py-2.5 text-right w-20">Disc (%)</th>
                        <th className="px-3 py-2.5 text-right w-20">GST (%)</th>
                        <th className="px-3.5 py-2.5 text-right w-28 font-semibold">Amount (₹)</th>
                        <th className="px-3 py-2.5 text-center w-20">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DCE5EA] text-[#172033]">
                      {checkoutItems.filter(i => i.productId).map((item, idx) => {
                        const prod = products.find(p => p._id === item.productId);
                        const variant = prod?.products?.[item.variantIndex];
                        const hsnCode = variant?.hsnCode || prod?.hsnCode || "3102";
                        const skuCode = variant?.itemCode || prod?._id?.slice(-6);

                        return (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-3 py-2 text-center text-slate-400 text-[11px] font-mono">{idx + 1}</td>

                            <td className="px-3 py-2">
                              <p className="font-semibold text-[#172033] text-xs leading-tight">{prod?.productName}</p>
                              <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                                SKU: {skuCode}
                              </p>
                            </td>

                            <td className="px-3 py-2 text-center text-slate-500 text-[11px] font-mono">{hsnCode}</td>

                            {/* Editable Qty */}
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdateItemInline(idx, "quantity", e.target.value)}
                                className="w-16 text-right text-xs font-semibold border border-[#DCE5EA] rounded px-2 py-1 focus:border-[#16A36A] focus:ring-1 focus:ring-[#16A36A] bg-white text-[#172033]"
                              />
                            </td>

                            <td className="px-3 py-2 text-center text-slate-600 text-xs">{item.unit || variant?.unit}</td>

                            {/* Editable Rate */}
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.pricePerUnit}
                                onChange={(e) => handleUpdateItemInline(idx, "pricePerUnit", e.target.value)}
                                className="w-20 text-right text-xs font-semibold border border-[#DCE5EA] rounded px-2 py-1 focus:border-[#16A36A] focus:ring-1 focus:ring-[#16A36A] bg-white text-[#172033]"
                              />
                            </td>

                            {/* Editable Disc */}
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                min="0"
                                value={item.discountType === "Fixed Amount" ? item.discountAmount : item.discountPercent}
                                onChange={(e) => handleUpdateItemInline(idx, "discount", e.target.value)}
                                className="w-16 text-right text-xs font-semibold border border-[#DCE5EA] rounded px-2 py-1 focus:border-[#16A36A] focus:ring-1 focus:ring-[#16A36A] bg-white text-[#172033]"
                              />
                            </td>

                            <td className="px-3 py-2 text-right text-slate-600 font-medium">{item.taxPercent}%</td>

                            <td className="px-3.5 py-2 text-right font-semibold text-[#172033] text-xs">
                              ₹{(parseFloat(item.amount) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>

                            <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleEditItem(idx)}
                                  className="text-slate-400 hover:text-[#16A36A] hover:bg-emerald-50 p-1 rounded transition"
                                  title="Edit Item"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCheckoutItems((prev) => prev.filter((_, i) => i !== idx))}
                                  className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition"
                                  title="Delete Item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Cart Footer Summary Row */}
                  <div className="bg-[#F8FAFC] border-t border-[#DCE5EA] px-4 py-2.5 flex justify-between items-center text-xs text-slate-600 font-semibold">
                    <span>Items: {checkoutItems.filter(i => i.productId).length}</span>
                    <div className="flex items-center gap-3">
                      <span>Total Amount (₹)</span>
                      <span className="text-[#172033] font-bold text-sm">
                        {subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ADDITIONAL BILL DETAILS COLLAPSIBLE */}
            <div className="bg-white border border-[#DCE5EA] rounded-xl overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setShowAdditionalDetails(!showAdditionalDetails)}
                className="w-full px-4 py-3 flex items-center justify-between font-semibold text-[#172033] text-xs hover:bg-slate-50 transition border-0 focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#16A36A]" />
                  <span>Additional Bill Details (Notes, Terms, Remarks)</span>
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showAdditionalDetails ? 'rotate-180' : ''}`} />
              </button>

              {showAdditionalDetails && (
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 bg-slate-50/40">
                  <div>
                    <label className="block text-xs font-semibold text-[#172033] mb-1">Notes / Description</label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add seasonal discount notes..."
                      className="w-full border border-[#DCE5EA] rounded-lg p-2.5 text-xs font-normal bg-white text-[#172033] focus:border-[#16A36A] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#172033] mb-1">Terms & Conditions</label>
                    <textarea
                      rows={2}
                      value={termsAndConditions}
                      onChange={(e) => setTermsAndConditions(e.target.value)}
                      placeholder="Goods once sold will not be taken back..."
                      className="w-full border border-[#DCE5EA] rounded-lg p-2.5 text-xs font-normal bg-white text-[#172033] focus:border-[#16A36A] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#172033] mb-1">Remarks</label>
                    <textarea
                      rows={2}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Enter internal shop remarks..."
                      className="w-full border border-[#DCE5EA] rounded-lg p-2.5 text-xs font-normal bg-white text-[#172033] focus:border-[#16A36A] focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (25-30% width): ACCOUNTING SUMMARY */}
          <div className="lg:col-span-1 space-y-4 sticky top-4">
            <div className="bg-white border border-[#DCE5EA] rounded-xl p-4 shadow-xs space-y-4">

              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="text-xs font-semibold text-[#172033] flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-[#16A36A]" />
                  <span>Accounting Summary</span>
                </span>
              </div>

              {/* Financial Summary Rows */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Sub Total</span>
                  <span className="text-[#172033] font-semibold">
                    ₹{subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-[#16A36A] font-medium">
                  <span>Discount</span>
                  <span>
                    ₹{totalDiscounts.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Tax (GST)</span>
                  <span className="text-[#172033] font-semibold">
                    ₹{totalTaxes.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Round Off Toggle */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-slate-600 font-medium">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roundOff}
                      onChange={(e) => setRoundOff(e.target.checked)}
                      className="rounded border-slate-300 text-[#16A36A] focus:ring-[#16A36A] w-3.5 h-3.5"
                    />
                    <span>Round Off</span>
                  </label>
                  <span className="text-[#172033] font-semibold">
                    ₹{roundOffAmount >= 0 ? "+" : ""}{roundOffAmount.toFixed(2)}
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-2" />

                {/* GRAND TOTAL HIGHLIGHT BOX */}
                <div className="bg-[#E6F4EA] border border-[#16A36A]/20 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-xs font-bold text-[#16A36A]">Grand Total</span>
                  <span className="text-xl font-bold text-[#16A36A]">
                    ₹{finalTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* AMOUNT RECEIVED FIELD */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Amount Received
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-xs">₹</span>
                    <input
                      ref={receivedAmountInputRef}
                      type="number"
                      min="0"
                      step="any"
                      value={receivedAmount === "" ? "" : receivedAmount}
                      onChange={(e) => {
                        setReceivedAmount(e.target.value === "" ? "" : parseFloat(e.target.value) || 0);
                        setIsReceivedManual(true);
                      }}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                      className="w-full bg-white border border-[#DCE5EA] rounded-lg pl-7 pr-3 py-2 text-sm font-semibold text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A] h-[42px]"
                    />
                  </div>

                  {/* Quick Amount Buttons */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReceivedAmount((prev) => (parseFloat(prev) || 0) + 500);
                        setIsReceivedManual(true);
                      }}
                      className="flex-1 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition"
                    >
                      +500
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReceivedAmount((prev) => (parseFloat(prev) || 0) + 1000);
                        setIsReceivedManual(true);
                      }}
                      className="flex-1 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition"
                    >
                      +1,000
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReceivedAmount((prev) => (parseFloat(prev) || 0) + 2000);
                        setIsReceivedManual(true);
                      }}
                      className="flex-1 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition"
                    >
                      +2,000
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReceivedAmount(finalTotal);
                        setIsReceivedManual(true);
                      }}
                      className="flex-1 py-1 bg-[#E6F4EA] hover:bg-emerald-100 text-[#16A36A] rounded text-[11px] font-semibold transition"
                    >
                      Exact
                    </button>
                  </div>
                </div>

                {/* UNPAID BALANCE HIGHLIGHT BOX */}
                <div className="bg-[#FCE8E6] border border-red-200 rounded-lg p-3 flex justify-between items-center mt-2">
                  <span className="text-xs font-semibold text-[#DC2626]">Unpaid Balance</span>
                  <span className="text-sm font-bold text-[#DC2626]">
                    ₹{unpaidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Payment Method Selector */}
                {(billingType === "Cash" || (billingType === "Credit" && (parseFloat(receivedAmount) || 0) > 0)) && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="block text-xs font-semibold text-[#172033]">Payment Mode</label>
                    <select
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value)}
                      className="w-full bg-white border border-[#DCE5EA] rounded-lg px-3 py-2 text-xs font-medium text-[#172033] focus:outline-none focus:border-[#16A36A] h-[38px]"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI Digital</option>
                      <option value="Card">Card</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>

                    {paymentType !== "Cash" && (
                      <input
                        type="text"
                        value={referenceNo}
                        onChange={(e) => setReferenceNo(e.target.value)}
                        placeholder="Transaction / UPI Ref No..."
                        className="w-full bg-white border border-[#DCE5EA] rounded-lg px-3 py-1.5 text-xs font-medium text-[#172033] focus:outline-none focus:border-[#16A36A] mt-1"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* PRIMARY SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={sellLoading}
                className="w-full py-3 bg-[#16A36A] hover:bg-[#138A59] disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-all shadow-sm flex items-center justify-center gap-2 h-[46px]"
              >
                {sellLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    <span>Save & Print Invoice</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* QUICK ADD VENDOR MODAL */}
      {addVendorOpen && (
        <QuickAddVendorModal
          onClose={() => setAddVendorOpen(false)}
          onSuccess={(newPartyId) => {
            setAddVendorOpen(false);
            setSelectedPartyId(newPartyId);
          }}
        />
      )}

      {/* QUICK ADD PRODUCT MODAL */}
      {showProductModal && (
        <QuickAddProductModal
          onClose={() => setShowProductModal(false)}
          onSuccess={(newProductId, newVariantIndex) => {
            setShowProductModal(false);
            setDraftProductId(newProductId);
            setDraftVariantIndex(newVariantIndex);
          }}
        />
      )}

      {/* KEYBOARD SHORTCUTS CHEATSHEET MODAL */}
      {showShortcutsModal && (
        <KeyboardShortcutsModal onClose={() => setShowShortcutsModal(false)} />
      )}
    </div>
  );
}

// ==================== LIGHT KEYBOARD SHORTCUTS MODAL ====================
function KeyboardShortcutsModal({ onClose }) {
  const shortcuts = [
    { key: "F1", desc: "Open / Close Shortcuts Help" },
    { key: "F2 or Alt+C", desc: "Focus Customer / Party Selector" },
    { key: "F3 or Alt+I", desc: "Focus Product Search Input" },
    { key: "F4 or Alt+P", desc: "Focus Payment / Received Amount" },
    { key: "F8", desc: "Toggle Cash / Udhar (Credit) Mode" },
    { key: "F9", desc: "Toggle Direct Sale / Estimate Mode" },
    { key: "Ctrl + S / F10", desc: "Instant Save & Print Invoice" },
    { key: "Alt + N", desc: "Quick Create New Product" },
    { key: "Alt + A", desc: "Quick Register New Party" },
    { key: "Enter", desc: "Jump next field / Add item to bill" },
    { key: "Escape", desc: "Close popup modals or exit" },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-100">
        <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-[#16A36A]" />
            <h2 className="text-sm font-semibold text-[#172033]">Keyboard Shortcuts Reference</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
          {shortcuts.map((s, idx) => (
            <div key={idx} className="py-2 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">{s.desc}</span>
              <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-[#16A36A] font-mono font-semibold rounded text-[11px]">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
        <div className="px-5 py-2.5 bg-slate-50 text-center text-[11px] text-slate-500 border-t border-slate-100 font-medium">
          Press <kbd className="text-[#16A36A] font-semibold">Esc</kbd> to close this window.
        </div>
      </div>
    </div>
  );
}

// ==================== QUICK ADD VENDOR / PARTY MODAL ====================
function QuickAddVendorModal({ onClose, onSuccess }) {
  const dispatch = useDispatch();
  const { parties } = useSelector((state) => state.party);
  const { gstinLoading } = useSelector((s) => s.eInvoice);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phoneNumber: "",
    gstType: "Unregistered/Consumer",
    gstin: "",
    state: "Uttar Pradesh",
    email: "",
    billingAddress: "",
    shippingAddress: "",
    openingBalance: "",
    openingBalanceType: "CREDIT"
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const temp = {};
    if (!form.name.trim()) temp.name = "Party Name is required";
    if (!form.phoneNumber) {
      temp.phoneNumber = "Phone number is required";
    } else if (!/^\d{10}$/.test(form.phoneNumber)) {
      temp.phoneNumber = "Phone number must be exactly 10 digits";
    }
    setErrors(temp);
    return Object.keys(temp).length === 0;
  };

  const handleVerifyGstin = () => {
    const trimmedGstin = (form.gstin || "").replace(/\s+/g, "").toUpperCase();
    if (trimmedGstin.length !== 15) {
      toast.error("Please enter a valid 15-character GSTIN");
      return;
    }

    dispatch(searchGstin({ gstin: trimmedGstin }))
      .unwrap()
      .then((res) => {
        const normalized = normalizeGstinData(res);
        if (!normalized) {
          toast.error("Failed to parse GSTIN details.");
          return;
        }
        toast.success("GSTIN verified!");
        setForm((prev) => ({
          ...prev,
          gstin: normalized.gstin,
          name: normalized.tradeName || normalized.legalName || prev.name,
          billingAddress: normalized.billingAddress || prev.billingAddress,
          gstType: "Registered-Regular",
        }));
      })
      .catch((err) => {
        toast.error(err || "GSTIN verification failed.");
      });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!validate()) return;

    setLoading(true);
    const payload = { ...form };
    payload.openingBalance = payload.openingBalance === "" || payload.openingBalance === null ? 0 : Number(payload.openingBalance);

    try {
      const res = await dispatch(addParty(payload)).unwrap();
      toast.success("Party added successfully!");
      let refreshedParties = parties || [];
      try {
        refreshedParties = await dispatch(fetchParties({ partyType: "BUYER", force: true })).unwrap();
      } catch (e) {
        if (!String(e?.message || e).includes("condition callback")) throw e;
      }
      const match = (refreshedParties || []).find(p => p.name === payload.name || p._id === res._id);
      onSuccess(match?._id || res._id);
    } catch (err) {
      toast.error(err || "Failed to create party");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-semibold text-[#172033]">Quick Register Party [Alt+A]</h2>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Party Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#DCE5EA] rounded-lg font-medium text-[#172033] focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A]"
                placeholder="Ramesh Traders"
                autoFocus
              />
              {errors.name && <p className="text-red-500 text-[11px] font-semibold mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
              <input
                type="text"
                maxLength={10}
                value={form.phoneNumber}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value.replace(/\D/g, "") })}
                className="w-full px-3 py-2 text-xs border border-[#DCE5EA] rounded-lg font-medium text-[#172033] focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A]"
                placeholder="9876543210"
              />
              {errors.phoneNumber && <p className="text-red-500 text-[11px] font-semibold mt-1">{errors.phoneNumber}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN (Optional)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={15}
                  value={form.gstin}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 text-xs border border-[#DCE5EA] rounded-lg font-medium uppercase text-[#172033] focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A]"
                  placeholder="22AAAAA0000A1Z5"
                />
                <button
                  type="button"
                  onClick={handleVerifyGstin}
                  disabled={gstinLoading || form.gstin.length !== 15}
                  className="px-3 py-1.5 bg-[#E6F4EA] text-[#16A36A] text-xs font-semibold rounded-lg border border-[#16A36A]/20 shrink-0 hover:bg-emerald-100 transition"
                >
                  Verify
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <SearchableStateSelect
                value={form.state}
                onChange={(val) => setForm({ ...form, state: val })}
                height="h-[38px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition">Cancel</button>
            <button type="submit" disabled={loading} className="px-5 py-2 bg-[#16A36A] hover:bg-[#138A59] text-white rounded-lg text-xs font-semibold shadow-xs transition">
              {loading ? "Adding..." : "Register Party"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== QUICK ADD PRODUCT MODAL ====================
function QuickAddProductModal({ onClose, onSuccess }) {
  const dispatch = useDispatch();
  const { products } = useSelector((state) => state.inventory);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    productName: "",
    brand: "",
    productCategory: "Fertilizers",
    unit: "Kg",
    parameter: "50",
    mrp: "",
    salePrice: "",
    purchasePrice: "",
    quantity: "100"
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const temp = {};
    if (!form.productName.trim()) temp.productName = "Product Name is required";
    if (!form.parameter.trim()) temp.parameter = "Size / Parameter is required";
    if (!form.salePrice || Number(form.salePrice) <= 0) temp.salePrice = "Sale price required";
    setErrors(temp);
    return Object.keys(temp).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!validate()) return;

    setLoading(true);
    const payload = {
      productName: form.productName.trim(),
      brand: form.brand.trim() || "General",
      productCategory: form.productCategory,
      unit: form.unit,
      parameter: form.parameter.trim(),
      mrp: Number(form.mrp || form.salePrice),
      salePrice: Number(form.salePrice),
      purchasePrice: Number(form.purchasePrice || form.salePrice),
      quantity: Number(form.quantity || 0)
    };

    try {
      const res = await api.post("/product/quickAdd", payload);
      const resData = res.data?.data || res.data;
      toast.success("Product variant created successfully!");

      let refreshedProds = products || [];
      try {
        refreshedProds = await dispatch(fetchProducts({ force: true })).unwrap();
      } catch (e) {
        if (!String(e?.message || e).includes("condition callback")) throw e;
      }
      try {
        await dispatch(fetchStockSummary({ force: true })).unwrap();
      } catch (e) {
        if (!String(e?.message || e).includes("condition callback")) throw e;
      }

      const match = (refreshedProds || []).find(
        (p) => p.productName?.toLowerCase() === payload.productName.toLowerCase() || p._id === resData?._id
      );

      if (match) {
        const vIdx = match.products?.findIndex(
          (v) => String(v.parameter) === String(payload.parameter) && String(v.unit) === String(payload.unit)
        );
        onSuccess(match._id, vIdx !== -1 ? vIdx : 0);
      } else {
        onSuccess("", 0);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-semibold text-[#172033]">Quick Create Product [Alt+N]</h2>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Product Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name *</label>
              <input
                type="text"
                value={form.productName}
                onChange={(e) => setForm({ ...form, productName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#DCE5EA] rounded-lg font-medium text-[#172033] focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A]"
                placeholder="e.g. Urea Coarse"
                autoFocus
              />
              {errors.productName && <p className="text-red-500 text-[11px] font-semibold mt-1">{errors.productName}</p>}
            </div>

            {/* Brand */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Brand</label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#DCE5EA] rounded-lg font-medium text-[#172033] focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A]"
                placeholder="e.g. IFFCO"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={form.productCategory}
                onChange={(e) => setForm({ ...form, productCategory: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#DCE5EA] rounded-lg font-medium text-[#172033] focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A]"
              >
                <option value="Fertilizers">Fertilizers</option>
                <option value="Insecticides">Insecticides</option>
                <option value="Fungicides">Fungicides</option>
                <option value="Herbicides">Herbicides</option>
                <option value="Seeds">Seeds</option>
                <option value="Organic">Organic</option>
                <option value="Pgr">Pgr</option>
                <option value="Tools">Tools</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Size / Parameter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Size / Parameter *</label>
              <input
                type="text"
                value={form.parameter}
                onChange={(e) => setForm({ ...form, parameter: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#DCE5EA] rounded-lg font-medium text-[#172033] focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A]"
                placeholder="e.g. 50"
              />
              {errors.parameter && <p className="text-red-500 text-[11px] font-semibold mt-1">{errors.parameter}</p>}
            </div>

            {/* Unit */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Unit</label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#DCE5EA] rounded-lg font-medium text-[#172033] focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A]"
              >
                <option value="Kg">Kg</option>
                <option value="L">L</option>
                <option value="ml">ml</option>
                <option value="gm">gm</option>
                <option value="pcs">pcs</option>
                <option value="bag">bag</option>
                <option value="box">box</option>
              </select>
            </div>

            {/* MRP */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">MRP (₹)</label>
              <input
                type="number"
                step="any"
                value={form.mrp}
                onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#DCE5EA] rounded-lg font-medium text-[#172033] focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A]"
                placeholder="0.00"
              />
            </div>

            {/* Purchase Price */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Price (₹)</label>
              <input
                type="number"
                step="any"
                value={form.purchasePrice}
                onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#DCE5EA] rounded-lg font-medium text-[#172033] focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A]"
                placeholder="0.00"
              />
            </div>

            {/* Sale Price */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sale Price (₹) *</label>
              <input
                type="number"
                step="any"
                value={form.salePrice}
                onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#DCE5EA] rounded-lg font-medium text-[#172033] focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A]"
                placeholder="0.00"
              />
              {errors.salePrice && <p className="text-red-500 text-[11px] font-semibold mt-1">{errors.salePrice}</p>}
            </div>

            {/* Opening Quantity */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Quantity</label>
              <input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#DCE5EA] rounded-lg font-medium text-[#172033] focus:ring-2 focus:ring-[#16A36A]/20 focus:border-[#16A36A]"
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition">Cancel</button>
            <button type="submit" disabled={loading} className="px-5 py-2 bg-[#16A36A] hover:bg-[#138A59] text-white rounded-lg text-xs font-semibold shadow-xs transition">
              {loading ? "Creating..." : "Save Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

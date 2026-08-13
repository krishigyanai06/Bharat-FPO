import { useEffect, useState, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  createSaleOrEstimate,
  updateSaleOrEstimate,
} from "../store/thunks/sellThunk";
import { fetchParties, addParty } from "../store/thunks/partyThunk";
import { fetchProducts, fetchStockSummary, addProduct } from "../store/thunks/inventoryThunk";
import { fetchMembers } from "../store/thunks/membersThunk";
import { clearSellStatus } from "../store/slices/sellSlice";
import { usePermissions } from "../hooks/usePermissions";
import api from "../lib/api";
import SearchableStateSelect from "../components/SearchableStateSelect";
import ProductModal from "../components/ProductModal";
import { searchGstin } from "../store/thunks/eInvoiceThunk";
import { normalizeGstinData } from "../utils/gstinNormalizer";
import {
  Plus,
  Trash2,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Building,
  Phone,
  Mail,
  FileSpreadsheet,
  FileText,
  MapPin,
  Copy,
  X,
  ShoppingCart,
  Zap,
  Calendar,
  Info,
  User,
  Users,
  ShoppingBag,
  Minus,
  Pencil,
  ChevronDown,
  Search,
  Check,
  FlaskConical,
  Shield,
  Leaf,
  Package,
  RefreshCw,
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
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
      </div>
    );
  }

  if (isReadOnly) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-200">
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

function SearchableMemberSelect({
  value,
  onChange,
  members,
  error = null,
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
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

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
    }
  }, [isOpen]);

  const filteredMembers = members.filter((m) => {
    const fullName = `${m.firstName || ""} ${m.lastName || ""}`.toLowerCase();
    const phone = (m.phone || "").toLowerCase();
    const role = (m.role || "").toLowerCase();
    const term = search.toLowerCase();
    return fullName.includes(term) || phone.includes(term) || role.includes(term);
  });

  const selectedMember = members.find((m) => m._id === value);
  const selectedName = selectedMember
    ? `${selectedMember.firstName} ${selectedMember.lastName}`
    : "";

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`relative flex items-center justify-between border rounded-xl px-3 text-xs focus:outline-none transition-all cursor-pointer font-bold h-[42px] ${disabled
          ? "bg-slate-100/60 text-slate-400 border-slate-200 cursor-not-allowed"
          : isOpen
            ? "border-emerald-500 bg-white ring-4 ring-emerald-500/10 text-slate-800"
            : "border-slate-200 hover:border-slate-350 bg-white text-slate-800"
          } ${error ? "border-red-400 focus:ring-red-400" : ""}`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <User className={`w-4.5 h-4.5 shrink-0 ${disabled ? "text-slate-350" : isOpen ? "text-emerald-600" : "text-slate-400"}`} />
          {selectedMember ? (
            <div className="flex flex-col text-left">
              <span className="font-extrabold text-gray-800 leading-tight">{selectedName}</span>
              <span className="text-[9px] text-gray-400 font-bold tracking-wide mt-0.5">+91 {selectedMember.phone} ({selectedMember.role})</span>
            </div>
          ) : (
            <span className="text-gray-450 font-semibold">Select FPO Member...</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 text-slate-450 ${isOpen ? "rotate-180 text-emerald-600" : ""}`} />
      </div>

      {isOpen && (
        <div className="absolute z-[100] mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-1 duration-150 overflow-hidden">
          {/* Search Box */}
          <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone or role..."
              className="w-full bg-transparent border-none text-xs focus:outline-none focus:ring-0 font-medium text-slate-850 placeholder-slate-400 p-0"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>

          {/* List items */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
            {filteredMembers.length === 0 ? (
              <div className="px-3.5 py-4 text-xs text-slate-400 text-center font-medium">
                No FPO member matches search criteria
              </div>
            ) : (
              filteredMembers.map((m) => {
                const isSelected = value === m._id;
                const mName = `${m.firstName || ""} ${m.lastName || ""}`.trim();
                const initials = `${m.firstName?.[0] || ""}${m.lastName?.[0] || ""}`.toUpperCase();
                return (
                  <div
                    key={m._id}
                    onClick={() => {
                      onChange(m._id);
                      setIsOpen(false);
                    }}
                    className={`px-3.5 py-2.5 text-xs font-semibold cursor-pointer transition-colors flex items-center justify-between hover:bg-slate-50 ${isSelected ? "bg-emerald-50/40 text-emerald-800 hover:bg-emerald-50/50" : "text-slate-700 hover:text-slate-900"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar initials badge */}
                      <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                        {initials}
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="font-extrabold text-gray-950 text-xs leading-none">{mName}</span>
                        <span className="text-[10px] text-gray-400 font-bold tracking-wide mt-1">+91 {m.phone || "—"} • {m.role || "Farmer"}</span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
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

function InvoiceFormInner({ editRecord = null, parties, products, stockSummary = [], sellLoading, members }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();


  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [saleType, setSaleType] = useState(editRecord ? editRecord.saleType : "SALE");
  const [billingType, setBillingType] = useState(editRecord ? editRecord.billingType : "Credit");
  const [selectedPartyId, setSelectedPartyId] = useState(editRecord ? (editRecord.party?._id || editRecord.party || "") : "");
  const [selectedMemberId, setSelectedMemberId] = useState("");

  const [invoiceNo, setInvoiceNo] = useState(editRecord ? (editRecord.billNumber || editRecord.invoiceNo || "") : "");
  const [billDate, setBillDate] = useState(editRecord ? (editRecord.billDate || (editRecord.createdAt ? new Date(editRecord.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0])) : new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(editRecord && editRecord.dueDate ? new Date(editRecord.dueDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
  const [paymentType, setPaymentType] = useState(editRecord ? (editRecord.paymentType || "Cash") : "Cash");
  const [referenceNo, setReferenceNo] = useState(editRecord ? (editRecord.referenceNo || "") : "");

  // Manual Entry walk-in fields
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

  const [activeStep, setActiveStep] = useState(1);
  const [customerType, setCustomerType] = useState(() => {
    if (editRecord) {
      return editRecord.party ? "registered" : "walkin";
    }
    return "registered";
  });
  const [buyerGstin, setBuyerGstin] = useState(editRecord ? (editRecord.buyerGstin || "") : "");
  const [errors, setErrors] = useState({});

  const partySelectRef = useRef(null);
  const memberSelectRef = useRef(null);
  const buyerNameInputRef = useRef(null);
  const dueDateInputRef = useRef(null);

  // Auto-detect member if editing and matching member found
  useEffect(() => {
    if (editRecord && !editRecord.party && editRecord.buyerPhone && members?.length > 0) {
      const found = members.find((m) => m.phone === editRecord.buyerPhone);
      if (found) {
        setSelectedMemberId(found._id);
        setCustomerType("member");
      }
    }
  }, [editRecord, members]);

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
      setTimeout(() => {
        partySelectRef.current?.focus();
      }, 50);
    } else if (type === "member") {
      setSelectedPartyId("");
      setBuyerName("");
      setBuyerPhone("");
      setBuyerAddress("");
      setBuyerGstin("");
      setBuyerType("FARMER");
      setTimeout(() => {
        memberSelectRef.current?.focus();
      }, 50);
    } else {
      setSelectedPartyId("");
      setSelectedMemberId("");
      setBuyerName("");
      setBuyerPhone("");
      setBuyerAddress("");
      setBuyerGstin("");
      setBuyerType("FARMER");
      setTimeout(() => {
        buyerNameInputRef.current?.focus();
      }, 50);
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

  const handleNextStep = () => {
    setErrors({});
    if (activeStep === 1) {
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
        newErrors.dueDate = "Due Date is required for Credit transactions.";
      }
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setActiveStep(2);
    } else if (activeStep === 2) {
      const validItems = checkoutItems.filter((i) => i.productId && (i.quantity === "" ? 0 : (parseFloat(i.quantity) || 0)) > 0);
      if (validItems.length === 0) {
        setErrors({ checkoutItems: "Please add at least one valid product line item with quantity > 0." });
        toast.error("Please add at least one valid product line item");
        return;
      }
      setActiveStep(3);
    }
  };

  const handlePrevStep = () => {
    setErrors({});
    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
    }
  };

  useEffect(() => {
    if (editRecord) {
      setCustomerType(editRecord.party ? "registered" : "walkin");
      if (editRecord.buyerGstin) {
        setBuyerGstin(editRecord.buyerGstin);
      }
    }
  }, [editRecord]);

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

  const productSearchInputRef = useRef(null);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [showAdvancedProductOptions, setShowAdvancedProductOptions] = useState(false);

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
      toast.success("Updated quantity of existing item in checklist!");
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
      toast.success("Added item to list!");
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
      }

      // Re-run calculations
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

    if (activeStep < 3) {
      handleNextStep();
      return;
    }

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
      newErrors.dueDate = "Due Date is required for Credit transactions.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setActiveStep(1);
      toast.error("Please resolve step 1 verification errors.");
      return;
    }

    const validItems = checkoutItems.filter((i) => i.productId && (i.quantity === "" ? 0 : (parseFloat(i.quantity) || 0)) > 0);
    if (validItems.length === 0) {
      setErrors({ checkoutItems: "Please add at least one valid product line item" });
      setActiveStep(2);
      toast.error("Please add at least one valid inventory item");
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
            `Quantity (${item.quantity}) for "${prod?.productName || "Product"} - ${variant?.parameter || ""} ${variant?.unit || ""}" exceeds available stock (${availableQty + originalQty})`
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
        toast.success("Transaction updated successfully!");
      } else {
        savedSale = await dispatch(createSaleOrEstimate(payload)).unwrap();
        toast.success("Transaction recorded successfully!");
      }

      if (saleType !== "SALE") {
        navigate("/sell?tab=sales");
        return;
      }

      const partyId = typeof savedSale?.party === "string"
        ? savedSale.party
        : (savedSale?.party && typeof savedSale?.party === "object" ? savedSale.party._id : null);

      const resolvedParty = partyId
        ? (parties.find(p => p._id === partyId) || (typeof savedSale?.party === "object" ? savedSale.party : null))
        : (savedSale?.party && typeof savedSale?.party === "object" ? savedSale.party : null);

      const isB2B = resolvedParty && (resolvedParty.gstin || resolvedParty.gstNumber || resolvedParty.gstType?.startsWith("Registered"));

      const irnVal = savedSale?.eInvoiceIrn || savedSale?.irn || savedSale?.eInvoiceInfo?.irn;
      const ewbNoVal = savedSale?.ewayBillNo || savedSale?.eWayBillNo || savedSale?.eInvoiceInfo?.ewayBillNo || savedSale?.eInvoiceInfo?.eWayBillNo;

      const isComplianceDone = isB2B
        ? (irnVal && ewbNoVal)
        : ewbNoVal;

      if (isComplianceDone) {
        navigate("/sell?tab=sales");
      } else {
        navigate(`/sell/compliance/${savedSale._id || savedSale.id}`);
      }
    } catch (err) {
      toast.error(err || "Failed to submit transaction");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 select-none">
      {/* Breadcrumbs & Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <span className="cursor-pointer hover:text-emerald-700 font-semibold" onClick={() => navigate("/sell")}>Sales</span>
            <ChevronRight className="w-3 h-3 text-gray-400" />
            <span className="text-gray-950 font-bold">{editRecord ? "Edit Sales Bill" : "New Sales Bill"}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-950 tracking-tight">
            {editRecord ? "Edit Counter Sales Bill" : "Create Counter Sales Bill"}
          </h1>
          <p className="text-xs text-gray-500 font-semibold mt-0.5">
            Record walk-in sales, estimates, and customer billing
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/sell")}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:bg-gray-55 text-gray-700 rounded-xl text-xs font-bold transition-all shadow-xs bg-white active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to List
        </button>
      </div>

      {/* Stepper Progress Indicator */}
      <div className="bg-white border border-gray-150 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold w-full md:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => activeStep > 1 && setActiveStep(1)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all whitespace-nowrap ${activeStep === 1
              ? "text-emerald-700 bg-emerald-50 border border-emerald-200 shadow-2xs animate-pulse"
              : activeStep > 1
                ? "text-emerald-600 hover:bg-gray-50"
                : "text-gray-400 cursor-not-allowed"
              }`}
          >
            <span>{activeStep > 1 ? "✓" : "①"} Customer & Details</span>
          </button>

          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />

          <button
            type="button"
            onClick={() => {
              if (activeStep > 2) {
                setActiveStep(2);
              } else if (activeStep === 1) {
                handleNextStep();
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all whitespace-nowrap ${activeStep === 2
              ? "text-emerald-700 bg-emerald-50 border border-emerald-200 shadow-2xs"
              : activeStep > 2
                ? "text-emerald-600 hover:bg-gray-50"
                : "text-gray-400 cursor-not-allowed"
              }`}
            disabled={activeStep < 2 && !selectedPartyId && !buyerName.trim()}
          >
            <span>{activeStep > 2 ? "✓" : "②"} Add Products</span>
          </button>

          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />

          <button
            type="button"
            onClick={() => {
              if (activeStep === 2) {
                handleNextStep();
              } else if (activeStep === 1) {
                const newErrors = {};
                if (customerType === "registered" && !selectedPartyId) {
                  newErrors.selectedPartyId = "Party Profile is required.";
                }
                if (customerType === "walkin" && !buyerName.trim()) {
                  newErrors.buyerName = "Buyer Name is required.";
                }
                if (billingType === "Credit" && !dueDate) {
                  newErrors.dueDate = "Due Date is required for Credit transactions.";
                }
                if (Object.keys(newErrors).length > 0) {
                  setErrors(newErrors);
                  return;
                }
                const validItems = checkoutItems.filter((i) => i.productId && (i.quantity === "" ? 0 : (parseFloat(i.quantity) || 0)) > 0);
                if (validItems.length > 0) {
                  setActiveStep(3);
                } else {
                  setActiveStep(2);
                  toast.error("Please add at least one product first");
                }
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all whitespace-nowrap ${activeStep === 3
              ? "text-emerald-700 bg-emerald-50 border border-emerald-200 shadow-2xs"
              : "text-gray-400 cursor-not-allowed"
              }`}
            disabled={activeStep < 3 && checkoutItems.length === 0}
          >
            <span>③ Review & Submit</span>
          </button>
        </div>

        {activeStep > 1 && (
          <div className="hidden md:flex items-center gap-4 text-[10px] text-gray-500 font-bold uppercase tracking-wider select-none bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-1.5">
            <span>
              Customer: <b className="text-gray-800">{customerType === "registered" ? (parties.find(p => p._id === selectedPartyId)?.name || "None") : (buyerName || "Walk-in")}</b>
            </span>
            <span>•</span>
            <span>
              Bill: <b className="text-gray-800">{invoiceNo || "Draft (Auto)"}</b>
            </span>
          </div>
        )}
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ==================== STEP 1: CUSTOMER & INVOICE DETAILS ==================== */}
        {activeStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-200">
            {/* Customer Type Selector Card */}
            <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-gray-500 mb-3 uppercase tracking-wider">Customer Type Selector</label>
                <div role="radiogroup" aria-label="Customer Type" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Registered Party Card */}
                  <div
                    role="radio"
                    aria-checked={customerType === "registered"}
                    tabIndex={0}
                    onClick={() => handleCustomerTypeChange("registered")}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        handleCustomerTypeChange("registered");
                      }
                    }}
                    className={`relative flex items-start gap-3 p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${customerType === "registered"
                      ? "border-emerald-600 bg-emerald-50/10 shadow-md scale-[1.01]"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                      }`}
                  >
                    {/* Hidden Native Input */}
                    <input
                      type="radio"
                      name="customerType"
                      value="registered"
                      checked={customerType === "registered"}
                      onChange={() => handleCustomerTypeChange("registered")}
                      className="sr-only"
                      tabIndex={-1}
                    />

                    {/* Selection Checkmark */}
                    {customerType === "registered" && (
                      <div className="absolute top-4 right-4 bg-emerald-600 text-white rounded-full p-0.5 shadow-xs animate-in fade-in zoom-in-75 duration-150">
                        <Check className="w-3 h-3 stroke-[3.5]" />
                      </div>
                    )}

                    {/* Icon */}
                    <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${customerType === "registered" ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-500"
                      }`}>
                      <Users className="w-[26px] h-[26px]" />
                    </div>

                    {/* Content */}
                    <div className="flex flex-col pr-6">
                      <span className="text-base font-semibold text-gray-900 leading-tight">Registered Party</span>
                      <span className="text-[13px] text-gray-500 mt-1 leading-snug">
                        Registered suppliers, buyers and accounts.
                      </span>
                    </div>
                  </div>

                  {/* FPO Member (Farmer) Card */}
                  <div
                    role="radio"
                    aria-checked={customerType === "member"}
                    tabIndex={0}
                    onClick={() => handleCustomerTypeChange("member")}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        handleCustomerTypeChange("member");
                      }
                    }}
                    className={`relative flex items-start gap-3 p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${customerType === "member"
                      ? "border-emerald-600 bg-emerald-50/10 shadow-md scale-[1.01]"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                      }`}
                  >
                    {/* Hidden Native Input */}
                    <input
                      type="radio"
                      name="customerType"
                      value="member"
                      checked={customerType === "member"}
                      onChange={() => handleCustomerTypeChange("member")}
                      className="sr-only"
                      tabIndex={-1}
                    />

                    {/* Selection Checkmark */}
                    {customerType === "member" && (
                      <div className="absolute top-4 right-4 bg-emerald-600 text-white rounded-full p-0.5 shadow-xs animate-in fade-in zoom-in-75 duration-150">
                        <Check className="w-3 h-3 stroke-[3.5]" />
                      </div>
                    )}

                    {/* Icon */}
                    <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${customerType === "member" ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-500"
                      }`}>
                      <User className="w-[26px] h-[26px]" />
                    </div>

                    {/* Content */}
                    <div className="flex flex-col pr-6">
                      <span className="text-base font-semibold text-gray-900 leading-tight">FPO Member (Farmer)</span>
                      <span className="text-[13px] text-gray-500 mt-1 leading-snug">
                        Shareholding FPO farmers and staff.
                      </span>
                    </div>
                  </div>

                  {/* Walk-in Customer Card */}
                  <div
                    role="radio"
                    aria-checked={customerType === "walkin"}
                    tabIndex={0}
                    onClick={() => handleCustomerTypeChange("walkin")}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        handleCustomerTypeChange("walkin");
                      }
                    }}
                    className={`relative flex items-start gap-3 p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${customerType === "walkin"
                      ? "border-emerald-600 bg-emerald-50/10 shadow-md scale-[1.01]"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                      }`}
                  >
                    {/* Hidden Native Input */}
                    <input
                      type="radio"
                      name="customerType"
                      value="walkin"
                      checked={customerType === "walkin"}
                      onChange={() => handleCustomerTypeChange("walkin")}
                      className="sr-only"
                      tabIndex={-1}
                    />

                    {/* Selection Checkmark */}
                    {customerType === "walkin" && (
                      <div className="absolute top-4 right-4 bg-emerald-600 text-white rounded-full p-0.5 shadow-xs animate-in fade-in zoom-in-75 duration-150">
                        <Check className="w-3 h-3 stroke-[3.5]" />
                      </div>
                    )}

                    {/* Icon */}
                    <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${customerType === "walkin" ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-500"
                      }`}>
                      <ShoppingBag className="w-[26px] h-[26px]" />
                    </div>

                    {/* Content */}
                    <div className="flex flex-col pr-6">
                      <span className="text-base font-semibold text-gray-900 leading-tight">Walk-in Customer</span>
                      <span className="text-[13px] text-gray-500 mt-1 leading-snug">
                        Quick billing for cash and retail customers.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Details Card */}
            <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600 border border-emerald-100">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-extrabold text-gray-800 text-sm">
                    {customerType === "registered"
                      ? "Registered Party Details"
                      : customerType === "member"
                        ? "FPO Member Details"
                        : "Walk-in Customer Details"}
                  </h3>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                    Provide client billing profile information
                  </span>
                </div>
              </div>

              {customerType === "registered" ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-500 mb-2 uppercase tracking-wider">Party Profile *</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <select
                          ref={partySelectRef}
                          value={selectedPartyId}
                          onChange={(e) => setSelectedPartyId(e.target.value)}
                          className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[42px] cursor-pointer font-bold text-gray-800 appearance-none pr-8 transition-all ${errors.selectedPartyId ? "border-red-400 focus:ring-red-400" : "border-gray-200 hover:border-gray-300"
                            }`}
                        >
                          <option value="">-- Select Registered Party --</option>
                          {parties.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.name} - +91 {p.phoneNumber || "No Phone"} ({p.gstType})
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-gray-400">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAddVendorOpen(true)}
                        className="px-3.5 bg-emerald-50/40 hover:bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl active:scale-95 transition-all h-[42px] flex items-center justify-center shadow-2xs"
                        title="Quick Add Party"
                      >
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                    {errors.selectedPartyId && (
                      <p className="text-red-500 text-[10px] font-bold mt-1.5">{errors.selectedPartyId}</p>
                    )}

                    {/* Registered B2B or B2C Visual Indicators */}
                    {selectedPartyId && (
                      <div className="mt-3.5">
                        {(() => {
                          const p = parties.find((party) => party._id === selectedPartyId);
                          const isRegistered = p && (p.gstin || p.gstType?.startsWith("Registered"));
                          if (isRegistered) {
                            return (
                              <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-xl p-3.5 flex flex-col gap-1 shadow-2xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">✓</span>
                                  <span className="font-extrabold text-[10px] text-emerald-805 uppercase tracking-wider">Registered (B2B Transaction)</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500 font-medium pt-1.5 border-t border-emerald-100/30 mt-1">
                                  <div>
                                    <span className="text-gray-400 font-semibold block text-[8px] uppercase tracking-wider">GSTIN</span>
                                    <span className="font-bold text-gray-700">{p.gstin || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400 font-semibold block text-[8px] uppercase tracking-wider">GST Type</span>
                                    <span className="font-bold text-gray-700">{p.gstType || "—"}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div className="bg-gray-50 border border-gray-200/60 rounded-xl p-3.5 flex flex-col gap-1 shadow-2xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-700 text-[10px] font-bold">👤</span>
                                  <span className="font-extrabold text-[10px] text-gray-700 uppercase tracking-wider">Farmer / Unregistered (B2C)</span>
                                </div>
                                {p?.phoneNumber && (
                                  <div className="text-[10px] text-gray-500 font-medium pt-1.5 border-t border-gray-150/40 mt-1">
                                    <span className="text-gray-400 font-semibold text-[8px] uppercase tracking-wider block">Phone Number</span>
                                    <span className="font-bold text-gray-700">+91 {p.phoneNumber}</span>
                                  </div>
                                )}
                              </div>
                            );
                          }
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              ) : customerType === "member" ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in duration-200">
                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-500 mb-2 uppercase tracking-wider">FPO Member Profile *</label>
                    <SearchableMemberSelect
                      value={selectedMemberId}
                      onChange={handleMemberChange}
                      members={members}
                      error={errors.selectedMemberId}
                    />
                    {errors.selectedMemberId && (
                      <p className="text-red-500 text-[10px] font-bold mt-1.5">{errors.selectedMemberId}</p>
                    )}

                    {selectedMemberId && (
                      <div className="mt-3.5">
                        {(() => {
                          const m = members.find((x) => x._id === selectedMemberId);
                          return (
                            <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-xl p-3.5 flex flex-col gap-1 shadow-2xs">
                              <div className="flex items-center gap-1.5">
                                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">👤</span>
                                <span className="font-extrabold text-[10px] text-emerald-800 uppercase tracking-wider">FPO {m?.role || "Member"} Registered</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500 font-medium pt-1.5 border-t border-emerald-100/30 mt-1">
                                <div>
                                  <span className="text-gray-400 font-semibold block text-[8px] uppercase tracking-wider">Phone</span>
                                  <span className="font-bold text-gray-700">+91 {m?.phone || "—"}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 font-semibold block text-[8px] uppercase tracking-wider">Location</span>
                                  <span className="font-bold text-gray-700 truncate block max-w-[120px]">{m?.district || m?.state || "—"}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                  {/* Customer Name */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Customer Name *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        ref={buyerNameInputRef}
                        type="text"
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className={`w-full pl-10 pr-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[42px] transition-all font-semibold text-gray-800 ${errors.buyerName ? "border-red-400 focus:ring-red-400" : "border-gray-200"
                          }`}
                      />
                    </div>
                    {errors.buyerName && (
                      <p className="text-red-500 text-[10px] font-bold mt-1.5">{errors.buyerName}</p>
                    )}
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Mobile Number</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <Phone className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value)}
                        placeholder="9876543210"
                        className="w-full pl-10 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[42px] transition-all font-semibold text-gray-800"
                      />
                    </div>
                  </div>

                  {/* GSTIN */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">GSTIN (Optional)</label>
                    <input
                      type="text"
                      value={buyerGstin}
                      onChange={(e) => setBuyerGstin(e.target.value.toUpperCase())}
                      placeholder="22AAAAA0000A1Z5"
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[42px] transition-all font-semibold text-gray-800 uppercase"
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Address</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <MapPin className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={buyerAddress}
                        onChange={(e) => setBuyerAddress(e.target.value)}
                        placeholder="e.g. Village Deoria"
                        className="w-full pl-10 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[42px] transition-all font-semibold text-gray-800"
                      />
                    </div>
                  </div>

                  {/* Buyer Segment */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Buyer Segment</label>
                    <div className="relative">
                      <select
                        value={buyerType}
                        onChange={(e) => setBuyerType(e.target.value)}
                        className="w-full border border-gray-200 hover:border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[42px] cursor-pointer font-bold text-gray-800 appearance-none pr-8 transition-all"
                      >
                        <option value="FARMER">Farmer</option>
                        <option value="RETAILER">Retailer</option>
                        <option value="DISTRIBUTOR">Distributor</option>
                        <option value="OTHER">Other</option>
                      </select>
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Toggles: Sale Type & Billing Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-gray-100">
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-500 mb-2 uppercase tracking-wider">Sale Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSaleType("SALE")}
                      className={`flex-1 flex items-center justify-center gap-2 h-[42px] px-4 rounded-xl text-xs font-bold transition-all border ${saleType === "SALE"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                        }`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Direct Sale
                    </button>
                    <button
                      type="button"
                      onClick={() => setSaleType("ESTIMATE")}
                      className={`flex-1 flex items-center justify-center gap-2 h-[42px] px-4 rounded-xl text-xs font-bold transition-all border ${saleType === "ESTIMATE"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                        }`}
                    >
                      <FileText className="w-4 h-4" />
                      Estimate / Quotation
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-gray-500 mb-2 uppercase tracking-wider">Payment</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBillingType("Cash")}
                      className={`flex-1 flex items-center justify-center gap-2 h-[42px] px-4 rounded-xl text-xs font-bold transition-all border ${billingType === "Cash"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                        }`}
                    >
                      <Zap className="w-4 h-4" />
                      Cash Bill
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingType("Credit")}
                      className={`flex-1 flex items-center justify-center gap-2 h-[42px] px-4 rounded-xl text-xs font-bold transition-all border ${billingType === "Credit"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                        }`}
                    >
                      <Calendar className="w-4 h-4" />
                      Udhar (Credit)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sales Bill Details Card */}
            <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600 border border-emerald-100">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-extrabold text-gray-800 text-sm">Sales Bill Details</h3>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                    Fill in the billing information
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Sales Bill Number</label>
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    placeholder="e.g. INV-2026-0001"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[42px] transition-all font-semibold"
                  />
                  <span className="text-[10px] text-gray-400 mt-1.5 block">(Auto-generated if empty)</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Bill Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={billDate}
                      onChange={(e) => setBillDate(e.target.value)}
                      className="w-full pl-3 pr-10 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[42px] cursor-pointer transition-all font-semibold text-gray-800"
                    />
                    <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {billingType === "Credit" && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Due Date *</label>
                    <div className="relative">
                      <input
                        ref={dueDateInputRef}
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className={`w-full pl-3 pr-10 py-2 text-xs border rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[42px] cursor-pointer transition-all font-semibold text-gray-800 ${errors.dueDate ? "border-red-400 focus:ring-red-400" : "border-gray-200"
                          }`}
                        required
                      />
                      <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                    {errors.dueDate && (
                      <p className="text-red-500 text-[10px] font-bold mt-1.5">{errors.dueDate}</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">State of Supply</label>
                  <SearchableStateSelect
                    value={stateOfSupply}
                    onChange={(val) => setStateOfSupply(val)}
                    height="h-[42px]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Supply Type</label>
                  <div className="relative">
                    <select
                      value={supplyType}
                      onChange={(e) => setSupplyType(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[42px] cursor-pointer font-semibold text-gray-800 appearance-none pr-8 transition-all"
                    >
                      <option value="Tax Invoice">Tax Invoice</option>
                      <option value="Exempted Supply">Exempted Supply</option>
                      <option value="Zero Rated">Zero Rated</option>
                    </select>
                    <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-gray-400">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {billingType === "Credit" && (
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Amount Received Now</label>
                      {isReceivedManual && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsReceivedManual(false);
                            if (billingType === "Cash") {
                              setReceivedAmount(finalTotal);
                            } else {
                              setReceivedAmount(0);
                            }
                          }}
                          className="text-[10px] text-emerald-600 hover:underline font-bold bg-transparent border-0 cursor-pointer p-0"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={receivedAmount === "" ? "" : receivedAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setReceivedAmount(val === "" ? "" : parseFloat(val) || 0);
                        setIsReceivedManual(true);
                      }}
                      placeholder="0.00"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[42px] transition-all font-semibold text-gray-800"
                    />
                  </div>
                )}

                {(billingType === "Cash" || billingType === "Credit") && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Payment Method</label>
                      <div className="relative">
                        <select
                          value={paymentType}
                          onChange={(e) => setPaymentType(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[42px] cursor-pointer font-semibold text-gray-800 appearance-none pr-8 transition-all"
                        >
                          <option value="Cash">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="Card">Card</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                        </select>
                        <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-gray-400">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {paymentType !== "Cash" && (
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Reference Number</label>
                        <input
                          type="text"
                          value={referenceNo}
                          onChange={(e) => setReferenceNo(e.target.value)}
                          placeholder="e.g. TXN123456789"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[42px] transition-all font-semibold text-gray-800"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== STEPS 2 & 3: GRID LAYOUT ==================== */}
        {(activeStep === 2 || activeStep === 3) && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">

            {/* Left Column (spans 3 columns) */}
            <div className="lg:col-span-3 space-y-6">

              {activeStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-200">
                  {/* Unified Billing Workspace Card */}
                  <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                      <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600 border border-emerald-100">
                        <ShoppingCart className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="font-extrabold text-gray-800 text-sm">Add Item</h3>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                          Search and add items to this sales bill
                        </span>
                      </div>
                    </div>

                    {/* SECTION 1: SEARCH & QUICK ENTRY */}
                    <div className="space-y-5">
                      {/* Product Search Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                        <div className="sm:col-span-9">
                          <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Search Product (Name / Code / Barcode) *</label>
                          <SearchableProductSelect
                            value={draftProductId}
                            onChange={(newVal) => setDraftProductId(newVal)}
                            products={products}
                            stockSummary={stockSummary}
                            placeholder="Search item by name, brand, item code, SKU, or barcode..."
                            onCreateProduct={() => setShowProductModal(true)}
                            hideLabel={true}
                            inputRef={productSearchInputRef}
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <button
                            type="button"
                            onClick={() => setShowProductModal(true)}
                            className="w-full border border-emerald-600 text-emerald-600 hover:bg-emerald-50 bg-white rounded-xl h-[42px] font-bold text-xs flex items-center justify-center gap-1.5 transition-all shrink-0 active:scale-95 shadow-xs"
                          >
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                            New Product
                          </button>
                        </div>
                      </div>

                      {/* Quick Entry fields row */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 items-start pt-1">
                        {/* Quantity Counter */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                            Quantity <span className="text-red-500">*</span>
                          </label>

                          <div
                            className={`flex h-10 overflow-hidden rounded-md border bg-white transition-all focus-within:ring-1 ${draftQty > availableQty
                              ? "border-red-400 focus-within:border-red-500 focus-within:ring-red-500/20"
                              : "border-gray-300 focus-within:border-emerald-500 focus-within:ring-emerald-500/20"
                              }`}
                          >
                            {/* Minus */}
                            <button
                              type="button"
                              disabled={!draftProductId || draftQty <= 1}
                              onClick={() => setDraftQty(prev => Math.max(1, prev - 1))}
                              className="w-9 flex items-center justify-center border-r border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Minus className="h-3 w-3" />
                            </button>

                            {/* Quantity */}
                            <input
                              type="number"
                              min="1"
                              value={draftQty}
                              onChange={(e) => {
                                const value = e.target.value;

                                // Allow empty input while editing
                                if (value === "") {
                                  setDraftQty("");
                                  return;
                                }

                                const qty = parseInt(value, 10);

                                if (!Number.isNaN(qty)) {
                                  setDraftQty(qty);
                                }
                              }}
                              onBlur={() => {
                                // Restore minimum quantity when user leaves empty
                                if (draftQty === "" || draftQty < 1) {
                                  setDraftQty(1);
                                }
                              }}
                              className={`w-full min-w-0 border-0 bg-white p-0 text-center text-sm font-semibold tabular-nums focus:outline-none ${draftQty > availableQty ? "text-red-600" : "text-gray-800"
                                }`}
                            />
                            {/* Plus */}
                            <button
                              type="button"
                              disabled={!draftProductId || draftQty >= availableQty}
                              onClick={() =>
                                setDraftQty(prev => Math.min(prev + 1, availableQty))
                              }
                              className="w-9 flex items-center justify-center border-l border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Stock */}
                          {draftProductId && (
                            <div className="flex items-center justify-between px-0.5 pt-0.5">
                              <span className="text-[10px] font-medium text-gray-400">
                                Available Stock
                              </span>

                              <span
                                className={`text-[10px] font-semibold tabular-nums ${draftQty > availableQty
                                  ? "text-red-600"
                                  : "text-gray-700"
                                  }`}
                              >
                                {availableQty}
                              </span>
                            </div>
                          )}

                          {/* Validation */}
                          {draftProductId && draftQty > availableQty && (
                            <p className="flex items-center gap-1 text-[10px] font-medium text-red-600">
                              <span>⚠</span>
                              Only {availableQty} units available in stock.
                            </p>
                          )}
                        </div>

                        {/* Unit variant selection */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Unit / Variant *</label>
                          <div className="relative">
                            <select
                              disabled={!draftProductId}
                              value={draftVariantIndex}
                              onChange={(e) => setDraftVariantIndex(parseInt(e.target.value) || 0)}
                              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 bg-white h-10 disabled:bg-gray-50 disabled:text-gray-450 font-bold text-gray-850 appearance-none pr-8 transition-all cursor-pointer shadow-2xs"
                            >
                              {draftProd?.products?.map((v, vIdx) => (
                                <option key={vIdx} value={vIdx}>
                                  {v.unit} {v.parameter ? `(${v.parameter})` : ""}
                                </option>
                              ))}
                              {!draftProd && <option value="0">pcs</option>}
                            </select>
                            <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-gray-400">
                              <ChevronDown className="w-4 h-4" />
                            </div>
                          </div>
                        </div>

                        {/* Price per unit (Rate) */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rate / Unit (₹) *</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            disabled={!draftProductId}
                            value={draftPrice}
                            onChange={(e) => setDraftPrice(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 disabled:bg-gray-50 disabled:text-gray-450 h-10 font-bold text-gray-850 transition-all text-right shadow-2xs"
                          />
                        </div>

                        {/* Discount value/percent */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            {draftDiscountType === "Percentage" ? "Discount (%)" : "Discount (₹)"}
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max={draftDiscountType === "Percentage" ? "100" : undefined}
                              step="any"
                              disabled={!draftProductId}
                              value={draftDiscountType === "Percentage" ? draftDiscountPercent : draftDiscountAmount}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (draftDiscountType === "Percentage") {
                                  setDraftDiscountPercent(val === "" ? "" : parseFloat(val) || 0);
                                } else {
                                  setDraftDiscountAmount(val === "" ? "" : parseFloat(val) || 0);
                                }
                              }}
                              placeholder="0"
                              className="w-full border border-gray-200 rounded-xl pl-3 pr-7 py-2 text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 disabled:bg-gray-50 disabled:text-gray-450 h-10 font-bold text-gray-850 transition-all text-center shadow-2xs"
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-450 font-bold text-xs">
                              {draftDiscountType === "Percentage" ? "%" : "₹"}
                            </span>
                          </div>
                        </div>

                        {/* GST % */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">GST (%) *</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              disabled={!draftProductId}
                              value={draftTaxPercent}
                              onChange={(e) => setDraftTaxPercent(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              className="w-full border border-gray-200 rounded-xl pl-3 pr-7 py-2 text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 disabled:bg-gray-50 disabled:text-gray-455 h-10 font-bold text-gray-850 transition-all text-center shadow-2xs"
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-455 font-bold text-xs">%</span>
                          </div>
                        </div>
                      </div>

                      {/* Advanced Options Grid (Always Visible) */}
                      <div className="pt-2">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border border-gray-150 rounded-xl bg-gray-50/30 mt-1 text-xs font-semibold text-gray-700">
                          {/* Discount Type selection */}
                          <div className="space-y-1">
                            <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider">Discount Type</label>
                            <select
                              value={draftDiscountType}
                              onChange={(e) => {
                                const newType = e.target.value;
                                setDraftDiscountType(newType);
                                setDraftDiscountPercent("");
                                setDraftDiscountAmount("");
                              }}
                              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 bg-white font-medium"
                            >
                              <option value="Percentage">Percentage (%)</option>
                              <option value="Fixed Amount">Fixed Amount (₹)</option>
                            </select>
                          </div>

                          {/* Tax Type selection */}
                          <div className="space-y-1">
                            <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider">Tax Type</label>
                            <select
                              value={draftTaxType}
                              onChange={(e) => setDraftTaxType(e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 bg-white font-medium"
                            >
                              <option value="Without Tax">Without Tax</option>
                              <option value="With Tax">With Tax</option>
                            </select>
                          </div>

                          {/* Calculated rate details */}
                          <div className="space-y-1">
                            <span className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider">Base Rate (₹)</span>
                            <div className="py-1.5 px-3 bg-gray-100 rounded-lg font-bold text-gray-700 text-center">
                              ₹{draftProductId ? (computedDraftDetails.rate || "0.00") : "0.00"}
                            </div>
                          </div>

                          {/* Calculated tax amount details */}
                          <div className="space-y-1">
                            <span className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider">Tax Amount (₹)</span>
                            <div className="py-1.5 px-3 bg-gray-100 rounded-lg font-bold text-gray-700 text-center">
                              ₹{draftProductId ? (computedDraftDetails.taxAmount || "0.00") : "0.00"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Add Product actions row */}
                      <div className="flex justify-between items-center pt-2">
                        <div>
                          {draftProductId && (
                            <div className="text-xs font-semibold text-gray-700">
                              Estimated Line Total: <span className="font-black text-emerald-700 bg-emerald-50/50 px-2 py-0.5 rounded border border-emerald-100">₹{computedDraftDetails.amount || "0.00"}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setDraftProductId("");
                              setDraftVariantIndex(0);
                              setDraftQty(1);
                              setDraftUnit("pcs");
                              setDraftPrice("");
                              setDraftTaxType("Without Tax");
                              setDraftDiscountType("Percentage");
                              setDraftDiscountPercent("");
                              setDraftDiscountAmount("");
                              setDraftTaxPercent("");
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 border border-gray-255 hover:bg-gray-50 text-gray-650 bg-white rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-xs"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                            Clear
                          </button>
                          <button
                            type="button"
                            onClick={handleAddDraftItem}
                            disabled={!draftProductId}
                            className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-150 disabled:text-gray-400 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95"
                          >
                            <Plus className="w-4 h-4" />
                            Add Product
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: ADDED PRODUCTS TABLE */}
                    <hr className="border-gray-100" />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-gray-800 text-xs uppercase tracking-wider">
                          Current Bill ({checkoutItems.filter(i => i.productId).length} Items)
                        </span>
                        {errors.checkoutItems && (
                          <p className="text-red-500 text-xs font-bold">{errors.checkoutItems}</p>
                        )}
                      </div>

                      {checkoutItems.filter(i => i.productId).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-gray-200 rounded-2xl bg-gray-55/10">
                          <FileSpreadsheet className="w-10 h-10 text-gray-300 mb-2" />
                          <p className="font-bold text-gray-600 text-xs">No products added yet</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Type in the search field above to find and add products.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-gray-150 rounded-2xl shadow-2xs">
                          <table className="w-full border-collapse text-left bg-white text-xs">
                            <thead>
                              <tr className="bg-gray-55/35 border-b border-gray-150 text-[10px] font-extrabold text-gray-455 uppercase tracking-wider">
                                <th className="px-4 py-2.5">Item</th>
                                <th className="px-4 py-2.5 text-center w-24">Qty</th>
                                <th className="px-4 py-2.5 text-center">Unit</th>
                                <th className="px-4 py-2.5 text-right w-28">Rate (₹)</th>
                                <th className="px-4 py-2.5 text-center w-24">Discount</th>
                                <th className="px-4 py-2.5 text-center">GST %</th>
                                <th className="px-4 py-2.5 text-right">Amount</th>
                                <th className="px-4 py-2.5 text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-semibold">
                              {checkoutItems.filter(i => i.productId).map((item, idx) => {
                                const prod = products.find(p => p._id === item.productId);
                                const variant = prod?.products?.[item.variantIndex];
                                return (
                                  <tr key={idx} className="hover:bg-gray-55/30 transition-colors">
                                    {/* Product Name */}
                                    <td className="px-4 py-2">
                                      <p className="font-bold text-gray-900 text-xs">{prod?.productName}</p>
                                      <p className="text-[9px] text-gray-400 font-semibold mt-0.5">
                                        {variant?.itemCode ? `${variant.itemCode} • ` : ""}
                                        {variant?.parameter ? `${variant.parameter} (${variant.unit})` : variant?.unit || "pcs"}
                                      </p>
                                    </td>

                                    {/* Inline Quantity input */}
                                    <td className="px-4 py-2 text-center">
                                      <div className="flex items-center justify-center border border-gray-200 rounded-lg overflow-hidden bg-white h-7 shadow-2xs">
                                        <input
                                          type="number"
                                          min="1"
                                          value={item.quantity}
                                          onChange={(e) => handleUpdateItemInline(idx, "quantity", e.target.value)}
                                          className="w-full text-center text-xs font-bold focus:outline-none border-0 p-0 text-gray-800 bg-transparent h-full"
                                        />
                                      </div>
                                    </td>

                                    {/* Unit */}
                                    <td className="px-4 py-2 text-center text-gray-500 font-semibold text-[11px]">{item.unit || variant?.unit}</td>

                                    {/* Inline Rate input */}
                                    <td className="px-4 py-2 text-right">
                                      <div className="flex items-center justify-end border border-gray-200 rounded-lg overflow-hidden bg-white h-7 shadow-2xs pr-1.5">
                                        <input
                                          type="number"
                                          min="0"
                                          step="any"
                                          value={item.pricePerUnit}
                                          onChange={(e) => handleUpdateItemInline(idx, "pricePerUnit", e.target.value)}
                                          className="w-full text-right text-xs font-bold focus:outline-none border-0 p-0 text-gray-800 bg-transparent h-full pr-0.5"
                                        />
                                      </div>
                                    </td>

                                    {/* Inline Discount input */}
                                    <td className="px-4 py-2 text-right">
                                      <div className="flex items-center justify-center border border-gray-200 rounded-lg overflow-hidden bg-white h-7 shadow-2xs">
                                        <input
                                          type="number"
                                          min="0"
                                          value={item.discountType === "Fixed Amount" ? item.discountAmount : item.discountPercent}
                                          onChange={(e) => handleUpdateItemInline(idx, "discount", e.target.value)}
                                          className="w-full text-center text-xs font-bold focus:outline-none border-0 p-0 text-gray-800 bg-transparent h-full"
                                        />
                                        <span className="text-[10px] text-gray-400 font-bold px-1 select-none">
                                          {item.discountType === "Fixed Amount" ? "₹" : "%"}
                                        </span>
                                      </div>
                                    </td>

                                    {/* GST % */}
                                    <td className="px-4 py-2 text-center">
                                      <p className="text-gray-800 font-bold text-xs">{item.taxPercent}%</p>
                                      <p className="text-[8px] text-gray-450 font-semibold uppercase">{item.taxType === "With Tax" ? "Incl" : "Excl"}</p>
                                    </td>

                                    {/* Total Amount */}
                                    <td className="px-4 py-2 text-right font-bold text-emerald-700 text-xs animate-in fade-in">
                                      ₹{(parseFloat(item.amount) || 0).toFixed(2)}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleEditItem(idx)}
                                          className="text-gray-400 hover:text-emerald-600 transition p-1 hover:bg-gray-100 rounded-md"
                                          title="Load back to search editor"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setCheckoutItems((prev) => prev.filter((_, i) => i !== idx));
                                          }}
                                          className="text-gray-400 hover:text-red-500 transition p-1 hover:bg-gray-100 rounded-md"
                                          title="Remove item"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot className="bg-gray-55/20 border-t border-gray-150 text-xs font-bold text-gray-700">
                              <tr>
                                <td colSpan={6} className="px-4 py-2.5 text-right font-semibold text-gray-500">Sub Total:</td>
                                <td className="px-4 py-2.5 text-right font-bold text-gray-850">₹{subTotal.toFixed(2)}</td>
                                <td></td>
                              </tr>
                              <tr>
                                <td colSpan={6} className="px-4 py-2.5 text-right font-semibold text-red-550">Discount Total:</td>
                                <td className="px-4 py-2.5 text-right font-bold text-red-650">-₹{totalDiscounts.toFixed(2)}</td>
                                <td></td>
                              </tr>
                              <tr>
                                <td colSpan={6} className="px-4 py-2.5 text-right font-semibold text-gray-500">Tax Total:</td>
                                <td className="px-4 py-2.5 text-right font-bold text-gray-850">+₹{totalTaxes.toFixed(2)}</td>
                                <td></td>
                              </tr>
                              <tr className="bg-emerald-50/20">
                                <td colSpan={6} className="px-4 py-3 text-right font-extrabold text-emerald-900">Grand Total:</td>
                                <td className="px-4 py-3 text-right">
                                  <span className="inline-block px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-2xs">
                                    ₹{grandTotal.toFixed(2)}
                                  </span>
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Collapsible Additional Details accordion */}
                  <div className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden transition-all">
                    <button
                      type="button"
                      onClick={() => setShowAdditionalDetails(!showAdditionalDetails)}
                      className="w-full px-6 py-4 flex items-center justify-between font-bold text-gray-800 text-xs uppercase tracking-wider hover:bg-gray-50/50 transition-colors border-0 focus:outline-none"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        Additional Details (Description, Terms, Remarks)
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showAdditionalDetails ? 'rotate-180' : ''}`} />
                    </button>

                    {showAdditionalDetails && (
                      <div className="px-6 pb-6 pt-2 grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-gray-100 animate-in fade-in duration-200">
                        {/* Description */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sales Bill Description</label>
                          <textarea
                            rows={3}
                            maxLength={200}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g. Standard seasonal sale, seeds and fertilizers..."
                            className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-semibold text-gray-800"
                          />
                          <div className="text-right text-[10px] text-gray-400 font-bold">
                            {description.length} / 200
                          </div>
                        </div>

                        {/* Terms */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Terms & Conditions</label>
                          <textarea
                            rows={3}
                            maxLength={200}
                            value={termsAndConditions}
                            onChange={(e) => setTermsAndConditions(e.target.value)}
                            placeholder="e.g. Goods once sold will not be taken back."
                            className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-semibold text-gray-800"
                          />
                          <div className="text-right text-[10px] text-gray-400 font-bold">
                            {termsAndConditions.length} / 200
                          </div>
                        </div>

                        {/* Remarks */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sales Bill Notes / Remarks</label>
                          <textarea
                            rows={3}
                            maxLength={200}
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="e.g. Paid via digital UPI, credit details logged to ledger..."
                            className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-semibold text-gray-800"
                          />
                          <div className="text-right text-[10px] text-gray-400 font-bold">
                            {remarks.length} / 200
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3 CONTENT: REVIEW & SUBMIT */}
              {activeStep === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-200">

                  {/* Invoice Summary Card */}
                  <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-5">
                    <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                      <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600 border border-emerald-100">
                        <Info className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="font-extrabold text-gray-800 text-sm">Invoice Summary Details</h3>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                          Review customer and billing metadata
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs leading-relaxed font-semibold">
                      <div>
                        <span className="text-gray-400 font-bold text-[9px] uppercase tracking-wider block">Customer Type</span>
                        <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wide">
                          {customerType === "registered" ? "Registered Party" : "Walk-in Customer"}
                        </span>
                      </div>

                      {customerType === "registered" ? (
                        <div>
                          <span className="text-gray-400 font-bold text-[9px] uppercase tracking-wider block">Selected Party</span>
                          <span className="text-xs font-extrabold text-gray-805">
                            {parties.find((p) => p._id === selectedPartyId)?.name || "—"}
                          </span>
                        </div>
                      ) : (
                        <>
                          <div>
                            <span className="text-gray-400 font-bold text-[9px] uppercase tracking-wider block">Customer Name</span>
                            <span className="text-xs font-extrabold text-gray-805">{buyerName}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 font-bold text-[9px] uppercase tracking-wider block">Mobile Number</span>
                            <span className="text-xs font-extrabold text-gray-805">{buyerPhone || "—"}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 font-bold text-[9px] uppercase tracking-wider block">GSTIN</span>
                            <span className="text-xs font-extrabold text-gray-805 uppercase">{buyerGstin || "—"}</span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-gray-400 font-bold text-[9px] uppercase tracking-wider block">Address</span>
                            <span className="text-xs font-semibold text-gray-700">{buyerAddress || "—"}</span>
                          </div>
                        </>
                      )}

                      <div>
                        <span className="text-gray-400 font-bold text-[9px] uppercase tracking-wider block">Bill Number</span>
                        <span className="text-xs font-extrabold text-gray-850">{invoiceNo || "Draft (Auto-generated)"}</span>
                      </div>

                      <div>
                        <span className="text-gray-400 font-bold text-[9px] uppercase tracking-wider block">Bill Date</span>
                        <span className="text-xs font-extrabold text-gray-850">{billDate}</span>
                      </div>

                      {billingType === "Credit" && (
                        <div>
                          <span className="text-gray-400 font-bold text-[9px] uppercase tracking-wider block">Due Date</span>
                          <span className="text-xs font-extrabold text-gray-850">{dueDate}</span>
                        </div>
                      )}

                      <div>
                        <span className="text-gray-400 font-bold text-[9px] uppercase tracking-wider block">Sale Type</span>
                        <span className="text-xs font-extrabold text-gray-850 uppercase tracking-wider">
                          {saleType}
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-400 font-bold text-[9px] uppercase tracking-wider block">Billing Type</span>
                        <span className="text-xs font-extrabold text-emerald-750">
                          {billingType === "Cash" ? "Cash Bill" : "Udhar (Credit)"}
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-400 font-bold text-[9px] uppercase tracking-wider block">State of Supply</span>
                        <span className="text-xs font-extrabold text-gray-850">{stateOfSupply}</span>
                      </div>

                      <div>
                        <span className="text-gray-400 font-bold text-[9px] uppercase tracking-wider block">Supply Type</span>
                        <span className="text-xs font-extrabold text-gray-850">{supplyType}</span>
                      </div>

                      {(billingType === "Cash" || (billingType === "Credit" && receivedAmount > 0)) && (
                        <>
                          <div>
                            <span className="text-gray-400 font-bold text-[9px] uppercase tracking-wider block">Payment Method</span>
                            <span className="text-xs font-extrabold text-gray-850">{paymentType}</span>
                          </div>
                          {referenceNo && (
                            <div>
                              <span className="text-gray-400 font-bold text-[9px] uppercase tracking-wider block">Reference No</span>
                              <span className="text-xs font-extrabold text-gray-850">{referenceNo}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Read-Only Added Items Table Card */}
                  <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                      <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600 border border-emerald-100">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <h3 className="font-extrabold text-gray-800 text-sm">Review Product Line Items</h3>
                    </div>

                    <div className="overflow-x-auto border border-gray-150 rounded-2xl">
                      <table className="w-full border-collapse text-left bg-white text-xs">
                        <thead>
                          <tr className="bg-gray-55/40 border-b border-gray-150 text-[10px] font-extrabold text-gray-455 uppercase tracking-wider">
                            <th className="px-4 py-3">Item</th>
                            <th className="px-4 py-3 text-center">Qty</th>
                            <th className="px-4 py-3 text-center">Unit</th>
                            <th className="px-4 py-3 text-right">Price / Unit</th>
                            <th className="px-4 py-3 text-right">Discount</th>
                            <th className="px-4 py-3 text-center">GST %</th>
                            <th className="px-4 py-3 text-right">Tax Amt.</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-semibold">
                          {checkoutItems.filter((i) => i.productId).map((item, idx) => {
                            const prod = products.find((p) => p._id === item.productId);
                            const variant = prod?.products?.[item.variantIndex];
                            return (
                              <tr key={idx} className="hover:bg-gray-55/20 transition-colors">
                                <td className="px-4 py-3">
                                  <p className="font-extrabold text-gray-900">{prod?.productName}</p>
                                  <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                                    {variant?.parameter ? `${variant.parameter} (${variant.unit})` : variant?.unit || "pcs"}
                                  </p>
                                </td>
                                <td className="px-4 py-3 text-center text-gray-800 font-bold">{item.quantity}</td>
                                <td className="px-4 py-3 text-center text-gray-500 font-semibold">{item.unit || variant?.unit}</td>
                                <td className="px-4 py-3 text-right text-gray-700">₹{(parseFloat(item.pricePerUnit) || 0).toFixed(2)}</td>
                                <td className="px-4 py-3 text-right text-red-650">
                                  {item.discountAmount > 0 ? `-₹${(parseFloat(item.discountAmount) || 0).toFixed(2)}` : "—"}
                                </td>
                                <td className="px-4 py-3 text-center font-bold">{item.taxPercent}%</td>
                                <td className="px-4 py-3 text-right text-gray-700">₹{(parseFloat(item.taxAmount) || 0).toFixed(2)}</td>
                                <td className="px-4 py-3 text-right font-extrabold text-emerald-700">₹{(parseFloat(item.amount) || 0).toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {(description.trim() || termsAndConditions.trim() || remarks.trim()) && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-gray-100">
                        {description.trim() && (
                          <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl text-xs font-semibold text-gray-700">
                            <span className="text-[9px] uppercase tracking-wider block font-bold text-gray-400 mb-1">Description</span>
                            <p className="whitespace-pre-line leading-relaxed">{description}</p>
                          </div>
                        )}
                        {termsAndConditions.trim() && (
                          <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl text-xs font-semibold text-gray-700">
                            <span className="text-[9px] uppercase tracking-wider block font-bold text-gray-400 mb-1">Terms & Conditions</span>
                            <p className="whitespace-pre-line leading-relaxed">{termsAndConditions}</p>
                          </div>
                        )}
                        {remarks.trim() && (
                          <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl text-xs font-semibold text-gray-700">
                            <span className="text-[9px] uppercase tracking-wider block font-bold text-gray-400 mb-1">Remarks / Notes</span>
                            <p className="whitespace-pre-line leading-relaxed">{remarks}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column (spans 1 column) - visible on Step 2 and Step 3 */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-5 sticky top-6">
                <div className="flex items-center gap-2 pb-3.5 border-b border-gray-100">
                  <div className="bg-emerald-50 p-1.5 rounded-lg text-emerald-600 border border-emerald-100">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-gray-800 text-sm">Sales Bill Summary</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between text-xs font-semibold text-gray-500">
                    <span>Total Items</span>
                    <span className="text-gray-800 font-bold">{checkoutItems.filter((i) => i.productId).length} items</span>
                  </div>

                  <div className="flex justify-between text-xs font-semibold text-gray-500">
                    <span>Subtotal (Base Bill)</span>
                    <span className="text-gray-800 font-bold">₹{subTotal.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="flex justify-between text-xs font-semibold text-red-655">
                    <span>Discounts Applied</span>
                    <span className="font-bold text-red-650">-₹{totalDiscounts.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="flex justify-between text-xs font-semibold text-gray-500">
                    <span>Taxes & GST</span>
                    <span className="text-gray-800 font-bold">+₹{totalTaxes.toLocaleString("en-IN")}</span>
                  </div>

                  {/* Round Off Checkbox and Value */}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-550 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={roundOff}
                        onChange={(e) => setRoundOff(e.target.checked)}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                      />
                      <span>Round Off</span>
                      <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" title="Round bill amount to the nearest rupee" />
                    </label>
                    <span className="text-xs font-bold text-gray-850">
                      {roundOffAmount >= 0 ? "+" : ""}₹{roundOffAmount.toFixed(2)}
                    </span>
                  </div>

                  {/* Grand Total box */}
                  <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-900 uppercase tracking-wider">Grand Total</span>
                    <span className="text-xl font-black text-emerald-950">₹{finalTotal.toLocaleString("en-IN")}</span>
                  </div>

                  {/* Unpaid Amount */}
                  <div className="flex justify-between border-t border-gray-100 pt-4 font-bold text-sm text-gray-805">
                    <span>Unpaid Amount</span>
                    <span className={`font-black ${unpaidAmount > 0 ? "text-amber-600" : "text-emerald-700"}`}>
                      ₹{unpaidAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions Footer */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 md:px-6 shadow-sm flex justify-between items-center mt-6">
          <div>
            {(activeStep === 2 || activeStep === 3) ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Grand Total:</span>
                <span className="text-base font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100/50">
                  ₹{finalTotal.toLocaleString("en-IN")}
                </span>
              </div>
            ) : (
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                Step 1 of 3: Customer & Invoice Details
              </div>
            )}
          </div>

          <div className="flex gap-3 items-center">
            {activeStep === 1 && (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/sell")}
                  disabled={sellLoading}
                  className="px-5 py-2.5 border border-gray-250 rounded-xl text-xs font-bold text-gray-650 hover:bg-gray-50 bg-white disabled:opacity-50 transition-all active:scale-95 shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
                >
                  Next Step →
                </button>
              </>
            )}

            {activeStep === 2 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={sellLoading}
                  className="px-5 py-2.5 border border-gray-250 rounded-xl text-xs font-bold text-gray-650 hover:bg-gray-50 bg-white disabled:opacity-50 transition-all active:scale-95 shadow-xs"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
                >
                  Next Step →
                </button>
              </>
            )}

            {activeStep === 3 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={sellLoading}
                  className="px-5 py-2.5 border border-gray-250 rounded-xl text-xs font-bold text-gray-650 hover:bg-gray-50 bg-white disabled:opacity-50 transition-all active:scale-95 shadow-xs"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={sellLoading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
                >
                  {sellLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editRecord
                    ? (sellLoading ? "Saving..." : "Save Changes")
                    : (sellLoading ? "Creating..." : `Create Sales Bill`)}
                </button>
              </>
            )}
          </div>
        </div>
      </form>

      {/* QUICK ADD PARTY/VENDOR MODAL */}
      {addVendorOpen && (
        <QuickAddVendorModal
          onClose={() => setAddVendorOpen(false)}
          onSuccess={(newPartyId) => {
            setAddVendorOpen(false);
            setSelectedPartyId(newPartyId);
          }}
        />
      )}

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

    </div>
  );
}

const GST_TYPES = [
  "Unregistered/Consumer",
  "Registered-Regular",
  "Registered-Composition",
  "Overseas",
  "SEZ"
];

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi"
];

function QuickAddVendorModal({ onClose, onSuccess }) {
  const dispatch = useDispatch();
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
  const [verifiedGstinDetails, setVerifiedGstinDetails] = useState(null);
  const [gstinError, setGstinError] = useState(null);
  const [hasAttemptedGstin, setHasAttemptedGstin] = useState(false);
  const [shippingSameAsBilling, setShippingSameAsBilling] = useState(true);
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  const validate = () => {
    const temp = {};
    if (!form.name.trim()) temp.name = "Party Name is required";

    if (!form.phoneNumber) {
      temp.phoneNumber = "Phone number is required";
    } else if (!/^\d{10}$/.test(form.phoneNumber)) {
      temp.phoneNumber = "Phone number must be exactly 10 digits";
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      temp.email = "Please enter a valid email address";
    }

    // GSTIN required if registered
    if (form.gstType.startsWith("Registered")) {
      if (!form.gstin) {
        temp.gstin = "GSTIN is required for registered parties";
      } else if (form.gstin.length !== 15) {
        temp.gstin = "GSTIN must be exactly 15 alphanumeric characters";
      }
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

    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(trimmedGstin)) {
      setGstinError("Invalid GSTIN format. The 14th character must be 'Z' (e.g. 29AAACQ3770E1Z5).");
      setVerifiedGstinDetails(null);
      setHasAttemptedGstin(true);
      return;
    }

    setGstinError(null);
    setVerifiedGstinDetails(null);
    setHasAttemptedGstin(true);

    dispatch(searchGstin({ gstin: trimmedGstin }))
      .unwrap()
      .then((res) => {
        const normalized = normalizeGstinData(res);
        if (!normalized) {
          setGstinError("Failed to parse Government GSTIN response.");
          return;
        }

        toast.success("GSTIN verified successfully!");
        setVerifiedGstinDetails(normalized);

        // Map registration type from taxpayer type
        let resolvedGstType = "Registered-Regular";
        if (normalized.taxpayerType?.toLowerCase().includes("composition")) {
          resolvedGstType = "Registered-Composition";
        }

        // Match state name
        let matchedState = form.state;
        if (normalized.state) {
          const matched = STATES.find(s => s.toLowerCase() === normalized.state.toLowerCase());
          if (matched) matchedState = matched;
        }

        setForm((prev) => ({
          ...prev,
          gstin: normalized.gstin,
          name: normalized.tradeName || normalized.legalName || prev.name,
          billingAddress: normalized.billingAddress || prev.billingAddress,
          shippingAddress: normalized.shippingAddress || prev.shippingAddress,
          state: matchedState || prev.state,
          gstType: resolvedGstType,
        }));
      })
      .catch((err) => {
        setGstinError(err || "GSTIN not found or inactive. Please check and try again.");
      });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!validate()) return;

    setLoading(true);
    const payload = { ...form };
    payload.openingBalance = payload.openingBalance === "" || payload.openingBalance === null ? 0 : Number(payload.openingBalance);
    if (!payload.gstType.startsWith("Registered")) {
      payload.gstin = "";
    }

    try {
      const res = await dispatch(addParty(payload)).unwrap();
      toast.success("Party added successfully");

      // Reload overall lists in Redux
      let refreshedParties = parties || [];
      try {
        refreshedParties = await dispatch(fetchParties({ partyType: "BUYER", force: true })).unwrap();
      } catch (e) {
        if (!String(e?.message || e).includes("condition callback")) throw e;
      }
      const match = (refreshedParties || []).find(
        p => p.name === payload.name || p._id === res._id || p._id === res.data?._id
      );

      onSuccess(match?._id || res._id || res.data?._id);
    } catch (err) {
      console.error("[QuickAddVendorModal submit error]:", err);
      toast.error(err || "Failed to create party");
    } finally {
      setLoading(false);
    }
  };

  const isNameAutofilled = !!verifiedGstinDetails && (form.name === verifiedGstinDetails.tradeName || form.name === verifiedGstinDetails.legalName);
  const isAddressAutofilled = !!verifiedGstinDetails && form.billingAddress === verifiedGstinDetails.billingAddress;
  const isStateAutofilled = !!verifiedGstinDetails && form.state === verifiedGstinDetails.state;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white">
          <h2 className="text-lg font-bold text-gray-900">Register New Party</h2>
          <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-650 rounded-lg transition hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 bg-gray-55/30 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

          {/* DYNAMIC FLOW */}
          {form.gstType.startsWith("Registered") ? (
            <>
              {/* SECTION 1: GST Registration Verification */}
              <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-l-4 border-emerald-600 pl-2">
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">🛡 GST Registration</h3>
                    <p className="text-[11px] text-gray-500">Verify and fetch business details from Government GST Portal</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  {/* GST Type */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">GST Type</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <FileSpreadsheet className="w-4 h-4" />
                      </span>
                      <select
                        value={form.gstType}
                        onChange={(e) => setForm({ ...form, gstType: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white appearance-none cursor-pointer h-[38px] font-bold text-gray-800"
                      >
                        {GST_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>

                  {/* GSTIN input & Verify Button */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      GSTIN <span className="text-red-505">*</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                          <FileText className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          maxLength={15}
                          value={form.gstin}
                          onChange={(e) => {
                            setForm({ ...form, gstin: e.target.value.toUpperCase() });
                            if (verifiedGstinDetails) setVerifiedGstinDetails(null);
                            if (gstinError) setGstinError(null);
                            if (hasAttemptedGstin) setHasAttemptedGstin(false);
                          }}
                          className={`w-full pl-10 pr-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white h-[38px] ${errors.gstin ? "border-red-400 focus:ring-red-400" : "border-gray-200"
                            }`}
                          placeholder="22AAAAA0000A1Z5"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={gstinLoading || form.gstin.length !== 15}
                        onClick={handleVerifyGstin}
                        className={`px-3.5 py-2 disabled:opacity-50 text-xs font-bold rounded-lg border transition shrink-0 flex items-center gap-1.5 h-[38px] ${verifiedGstinDetails
                          ? "bg-emerald-50 border-emerald-250 text-emerald-700 hover:bg-emerald-100"
                          : "bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100"
                          }`}
                      >
                        {gstinLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {gstinLoading ? "Fetching..." : verifiedGstinDetails ? "Re-Verify" : "Verify GSTIN"}
                      </button>
                    </div>
                  </div>
                </div>

                {errors.gstin && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.gstin}</p>
                )}

                {/* SKELETON LOADING CARD */}
                {gstinLoading && (
                  <div className="bg-gray-55/40 border border-gray-150 rounded-xl p-5 space-y-4 animate-pulse shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
                      <div className="h-3.5 bg-gray-200 rounded-md w-40"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded-md w-3/4"></div>
                      <div className="h-3 bg-gray-150 rounded-md w-1/2"></div>
                    </div>
                  </div>
                )}

                {/* SUCCESS VERIFICATION CARD */}
                {verifiedGstinDetails && !gstinLoading && (
                  <div className="bg-emerald-50/20 border border-emerald-200 rounded-xl p-5 space-y-4 text-xs animate-in fade-in duration-200 shadow-xs">
                    <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-850 font-bold text-[9px]">✓</span>
                        <span className="font-bold text-emerald-900 text-xs">🛡 GST Registration Verified</span>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-medium">Verified just now</span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-extrabold text-sm text-gray-900 leading-tight">{verifiedGstinDetails.tradeName}</h4>
                      {verifiedGstinDetails.legalName && verifiedGstinDetails.legalName !== verifiedGstinDetails.tradeName && (
                        <p className="text-gray-500 font-medium text-[11px]">({verifiedGstinDetails.legalName})</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-805 text-[9px] font-bold uppercase tracking-wider">
                        {verifiedGstinDetails.gstStatus}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-855 text-[9px] font-bold uppercase tracking-wider">
                        {verifiedGstinDetails.taxpayerType}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-805 text-[9px] font-bold uppercase tracking-wider">
                        {verifiedGstinDetails.einvoiceStatus?.toLowerCase()?.includes("elig") ||
                          verifiedGstinDetails.einvoiceStatus?.toLowerCase()?.includes("enab") ||
                          verifiedGstinDetails.einvoiceStatus?.toLowerCase() === "yes" ||
                          verifiedGstinDetails.einvoiceStatus?.toLowerCase() === "y"
                          ? "E-Invoice Enabled"
                          : "E-Invoice Disabled"}
                      </span>
                    </div>

                    <div className="bg-white/60 p-3 rounded-lg border border-emerald-100/50 space-y-2">
                      <div>
                        <span className="text-gray-400 font-semibold block text-[10px] uppercase tracking-wider">GSTIN</span>
                        <span className="font-bold text-gray-800 text-[11px]">{verifiedGstinDetails.gstin}</span>
                      </div>

                      <div className="pt-2 border-t border-gray-150 flex items-start gap-2">
                        <span className="text-emerald-700 text-xs shrink-0 mt-0.5">📍</span>
                        <div>
                          <span className="text-gray-400 font-bold block text-[10px] uppercase tracking-wider">Registered Address</span>
                          <p className="text-gray-750 leading-relaxed text-[11px] mt-0.5">{verifiedGstinDetails.billingAddress}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-emerald-100/50 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setShowMoreDetails(!showMoreDetails)}
                        className="text-emerald-700 hover:text-emerald-800 text-[11px] font-bold flex items-center gap-1 focus:outline-none mt-1 bg-transparent border-0 cursor-pointer text-left"
                      >
                        {showMoreDetails ? "▲ Hide Details" : "▼ Show More Details"}
                      </button>

                      {showMoreDetails && (
                        <div className="grid grid-cols-2 gap-3 pt-2 text-[11px] leading-relaxed border-t border-emerald-100/30 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div>
                            <span className="text-gray-450 font-semibold uppercase tracking-wider block text-[9px]">Registration Date</span>
                            <p className="font-bold text-gray-850">{verifiedGstinDetails.registrationDate || "—"}</p>
                          </div>
                          <div>
                            <span className="text-gray-455 font-semibold uppercase tracking-wider block text-[9px]">Constitution</span>
                            <p className="font-bold text-gray-850">{verifiedGstinDetails.constitution || "—"}</p>
                          </div>
                          {verifiedGstinDetails.legalName && verifiedGstinDetails.legalName !== verifiedGstinDetails.tradeName && (
                            <div className="col-span-2">
                              <span className="text-gray-450 font-semibold uppercase tracking-wider block text-[9px]">Legal Name</span>
                              <p className="font-bold text-gray-850">{verifiedGstinDetails.legalName}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ERROR CARD */}
                {gstinError && !gstinLoading && (
                  <div className="bg-rose-50/30 border border-rose-150 rounded-xl p-4 text-xs text-rose-955 animate-in fade-in duration-200 shadow-xs flex items-start gap-3">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-bold shrink-0">✕</span>
                    <div className="space-y-1 flex-1">
                      <h5 className="font-bold text-rose-900 text-sm">GST Verification Failed</h5>
                      <p className="text-[11px] text-rose-800 leading-relaxed">{gstinError}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}

          {/* 1. Basic Information Section */}
          <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 mb-2 border-l-4 border-brand-600 pl-2">
              <h3 className="font-bold text-gray-800 text-sm">Basic Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Unregistered GST Type Selection dropdown inside Business Info if Unregistered */}
              {!form.gstType.startsWith("Registered") && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">GST Type</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <FileSpreadsheet className="w-4 h-4" />
                    </span>
                    <select
                      value={form.gstType}
                      onChange={(e) => setForm({ ...form, gstType: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white appearance-none cursor-pointer h-[38px] font-bold text-gray-800"
                    >
                      {GST_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>
              )}

              {/* Party / Business Name */}
              <div>
                <label className="flex items-center text-xs font-semibold text-gray-500 mb-1">
                  Party / Business Name <span className="text-red-500 ml-0.5">*</span>
                  {isNameAutofilled && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded ml-1.5 animate-pulse shrink-0">Auto-filled</span>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Building className={`w-4 h-4 ${isNameAutofilled ? "text-emerald-500" : ""}`} />
                  </span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={`w-full pl-10 pr-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 bg-white h-[38px] ${errors.name
                      ? "border-red-400 focus:ring-red-400"
                      : isNameAutofilled
                        ? "border-emerald-300 focus:ring-emerald-450 focus:border-emerald-450 bg-emerald-50/5 text-emerald-950"
                        : "border-gray-200 focus:ring-brand-500"
                      }`}
                    placeholder="Mahadev Traders"
                  />
                </div>
                {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>}
              </div>

              {/* State */}
              <div>
                <label className="flex items-center text-xs font-semibold text-gray-500 mb-1">
                  State
                  {isStateAutofilled && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded ml-1.5 animate-pulse shrink-0">Verified</span>
                  )}
                </label>
                <SearchableStateSelect
                  value={form.state}
                  onChange={(val) => setForm({ ...form, state: val })}
                  height="h-[38px]"
                  className={isStateAutofilled ? "border-emerald-300 focus:border-emerald-450 focus:ring-emerald-450 bg-emerald-50/5" : ""}
                />
                {isStateAutofilled && (
                  <p className="text-[10px] text-emerald-600 mt-1 font-semibold">✓ Government Verified</p>
                )}
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Mobile Number <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    maxLength={10}
                    value={form.phoneNumber}
                    onChange={(e) => setForm({ ...form, phoneNumber: e.target.value.replace(/\D/g, "") })}
                    className={`w-full pl-10 pr-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white h-[38px] ${errors.phoneNumber ? "border-red-400 focus:ring-red-400 bg-white" : "border-gray-200 bg-white"
                      }`}
                    placeholder="9876543210"
                  />
                </div>
                {errors.phoneNumber && <p className="text-[11px] text-red-500 mt-1">{errors.phoneNumber}</p>}
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={`w-full pl-10 pr-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white h-[38px] ${errors.email ? "border-red-400 focus:ring-red-400 bg-white" : "border-gray-200 bg-white"
                      }`}
                    placeholder="mahadevtraders@example.com"
                  />
                </div>
                {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email}</p>}
              </div>
            </div>
          </div>

          {/* SECTION 3: Address Details */}
          <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-l-4 border-brand-600 pl-2 gap-2">
              <div>
                <h3 className="font-bold text-gray-800 text-sm">2. Address Details</h3>
                <p className="text-[11px] text-gray-500">Billing and shipping addresses</p>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shippingSameAsBilling}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setShippingSameAsBilling(checked);
                    if (checked) {
                      setForm(prev => ({ ...prev, shippingAddress: prev.billingAddress }));
                    }
                  }}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                Shipping address is same as billing
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Billing Address */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Billing Address</label>
                <div className="relative">
                  <span className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none text-gray-400">
                    <MapPin className={`w-4 h-4 ${isAddressAutofilled ? "text-emerald-500" : ""}`} />
                  </span>
                  <textarea
                    value={form.billingAddress}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm(prev => ({
                        ...prev,
                        billingAddress: val,
                        shippingAddress: shippingSameAsBilling ? val : prev.shippingAddress
                      }));
                    }}
                    rows={3}
                    className={`w-full pl-10 pr-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 bg-white ${isAddressAutofilled
                      ? "border-emerald-300 focus:ring-emerald-450 focus:border-emerald-450 bg-emerald-50/5 text-emerald-950"
                      : "border-gray-200 focus:ring-brand-500 bg-white"
                      }`}
                    placeholder="Main Road, Deoria"
                  />
                </div>
                {isAddressAutofilled && (
                  <p className="text-[10px] text-emerald-600 mt-1 font-semibold">✓ Verified from GST</p>
                )}
              </div>

              {/* Shipping Address */}
              {!shippingSameAsBilling && (
                <div className="animate-in fade-in duration-200">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Shipping Address</label>
                  <div className="relative">
                    <span className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none text-gray-400">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <textarea
                      value={form.shippingAddress}
                      onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })}
                      rows={3}
                      className="w-full pl-10 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                      placeholder="Main Road, Deoria"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: Financial Settings */}
          <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 mb-2 border-l-4 border-brand-600 pl-2">
              <div>
                <h3 className="font-bold text-gray-800 text-sm">3. Financial Settings</h3>
                <p className="text-[11px] text-gray-500">Configure accounting preferences</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Opening Balance */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Opening Balance</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-505 font-semibold text-xs">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={form.openingBalance === "" ? "" : form.openingBalance}
                    onChange={(e) => setForm({ ...form, openingBalance: e.target.value === "" ? "" : Number(e.target.value) })}
                    className="w-full pl-10 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white h-[38px]"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Balance Type Radio Group */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">Balance Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Credit Option */}
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${form.openingBalanceType === "CREDIT"
                    ? "bg-emerald-50/20 border-emerald-500 ring-1 ring-emerald-500"
                    : "bg-white border-gray-200 hover:bg-gray-50/50"
                    }`}>
                    <input
                      type="radio"
                      name="openingBalanceTypeQuick"
                      value="CREDIT"
                      checked={form.openingBalanceType === "CREDIT"}
                      onChange={() => setForm({ ...form, openingBalanceType: "CREDIT" })}
                      className="mt-1 text-emerald-605 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="block text-xs font-bold text-gray-900">Credit (Payable)</span>
                      <span className="block text-[10px] text-gray-500 mt-0.5">Money owed TO suppliers</span>
                    </div>
                  </label>

                  {/* Debit Option */}
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${form.openingBalanceType === "DEBIT"
                    ? "bg-emerald-50/20 border-emerald-500 ring-1 ring-emerald-500"
                    : "bg-white border-gray-200 hover:bg-gray-50/50"
                    }`}>
                    <input
                      type="radio"
                      name="openingBalanceTypeQuick"
                      value="DEBIT"
                      checked={form.openingBalanceType === "DEBIT"}
                      onChange={() => setForm({ ...form, openingBalanceType: "DEBIT" })}
                      className="mt-1 text-emerald-605 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="block text-xs font-bold text-gray-900">Debit (Receivable)</span>
                      <span className="block text-[10px] text-gray-500 mt-0.5">Money owed BY customers</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-150 bg-white">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <span className="text-emerald-605">🛡</span>
              <span>GST data is securely verified through the Government GST Portal</span>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-5 py-2.5 text-xs font-semibold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition shadow-sm"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {loading ? "Creating Party..." : "✓ Register Party"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuickAddProductModal({ onClose, onSuccess }) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    productName: "",
    brand: "",
    productCategory: "Fertilizers",
    unit: "Kg",
    parameter: "",
    mrp: "",
    salePrice: "",
    purchasePrice: "",
    quantity: ""
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const temp = {};
    if (!form.productName.trim()) temp.productName = "Product Name is required";
    if (!form.parameter.trim()) temp.parameter = "Size / Parameter is required";
    if (form.mrp === "" || Number(form.mrp) <= 0) temp.mrp = "MRP must be greater than zero";
    if (form.purchasePrice === "" || Number(form.purchasePrice) < 0) temp.purchasePrice = "Purchase Price is required";
    if (form.salePrice === "" || Number(form.salePrice) <= 0) temp.salePrice = "Sale Price must be greater than zero";
    if (form.quantity === "" || Number(form.quantity) < 0) temp.quantity = "Quantity is required";

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
      brand: form.brand.trim() || undefined,
      productCategory: form.productCategory,
      unit: form.unit,
      parameter: form.parameter.trim(),
      mrp: Number(form.mrp),
      salePrice: Number(form.salePrice),
      purchasePrice: Number(form.purchasePrice),
      quantity: Number(form.quantity)
    };

    try {
      const res = await api.post("/product/quickAdd", payload);
      const resData = res.data?.data || res.data;
      toast.success("Product variant created successfully!");

      // Refresh product lists in store
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

      // Find match to select newly created product
      const match = (refreshedProds || []).find(
        (p) => p.productName?.toLowerCase() === payload.productName.toLowerCase() || p._id === resData?._id || p._id === resData?.productId
      );

      if (match) {
        // Find variant matching parameter & unit
        const vIdx = match.products?.findIndex(
          (v) => String(v.parameter) === String(payload.parameter) && String(v.unit) === String(payload.unit)
        );
        onSuccess(match._id, vIdx !== -1 ? vIdx : 0);
      } else {
        onSuccess("", 0);
      }
    } catch (err) {
      console.error("[QuickAddProductModal submit error]:", err);
      toast.error(err?.response?.data?.message || err || "Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white">
          <h2 className="text-lg font-bold text-gray-900">Quick Add Product</h2>
          <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-650 rounded-lg transition hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 bg-gray-55/30 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Product Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.productName}
                onChange={(e) => setForm({ ...form, productName: e.target.value })}
                className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white h-[38px] font-semibold text-gray-805 ${errors.productName ? "border-red-400 focus:ring-red-450" : "border-gray-200"
                  }`}
                placeholder="e.g. Urea Coarse"
              />
              {errors.productName && <p className="text-[11px] text-red-500 mt-1">{errors.productName}</p>}
            </div>

            {/* Brand */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Brand</label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white h-[38px] font-semibold text-gray-805"
                placeholder="e.g. IFFCO"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Category *</label>
              <div className="relative">
                <select
                  value={form.productCategory}
                  onChange={(e) => setForm({ ...form, productCategory: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white appearance-none cursor-pointer h-[38px] font-bold text-gray-850"
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
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Size / Parameter */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Size / Parameter <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.parameter}
                onChange={(e) => setForm({ ...form, parameter: e.target.value })}
                className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white h-[38px] font-semibold text-gray-805 ${errors.parameter ? "border-red-400 focus:ring-red-450" : "border-gray-200"
                  }`}
                placeholder="e.g. 50"
              />
              {errors.parameter && <p className="text-[11px] text-red-500 mt-1">{errors.parameter}</p>}
            </div>

            {/* Unit */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Unit *</label>
              <div className="relative">
                <select
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white appearance-none cursor-pointer h-[38px] font-bold text-gray-850"
                >
                  <option value="Kg">Kg</option>
                  <option value="L">L</option>
                  <option value="ml">ml</option>
                  <option value="gm">gm</option>
                  <option value="pcs">pcs</option>
                  <option value="bag">bag</option>
                  <option value="box">box</option>
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* MRP */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                MRP (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.mrp}
                onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white h-[38px] font-semibold text-gray-855 ${errors.mrp ? "border-red-400 focus:ring-red-450" : "border-gray-200"
                  }`}
                placeholder="0.00"
              />
              {errors.mrp && <p className="text-[11px] text-red-500 mt-1">{errors.mrp}</p>}
            </div>

            {/* Purchase Price */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Purchase Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.purchasePrice}
                onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white h-[38px] font-semibold text-gray-855 ${errors.purchasePrice ? "border-red-400 focus:ring-red-450" : "border-gray-200"
                  }`}
                placeholder="0.00"
              />
              {errors.purchasePrice && <p className="text-[11px] text-red-500 mt-1">{errors.purchasePrice}</p>}
            </div>

            {/* Sale Price */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Sale Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.salePrice}
                onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white h-[38px] font-semibold text-gray-855 ${errors.salePrice ? "border-red-400 focus:ring-red-450" : "border-gray-200"
                  }`}
                placeholder="0.00"
              />
              {errors.salePrice && <p className="text-[11px] text-red-500 mt-1">{errors.salePrice}</p>}
            </div>

            {/* Opening Quantity */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Opening Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white h-[38px] font-semibold text-gray-855 ${errors.quantity ? "border-red-400 focus:ring-red-450" : "border-gray-200"
                  }`}
                placeholder="0"
              />
              {errors.quantity && <p className="text-[11px] text-red-500 mt-1">{errors.quantity}</p>}
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-150 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg transition"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {loading ? "Adding..." : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SearchableProductSelect({ value, onChange, products, stockSummary = [], placeholder = "Search product by name or category...", disabled = false, onCreateProduct, hideLabel = false, inputRef }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setProductDropdownOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setProductDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get selected product
  const selectedProduct = products.find(p => p._id === value);

  // Sync search input with selection when not focused
  useEffect(() => {
    if (!dropdownOpen) {
      setSearchQuery(selectedProduct ? selectedProduct.productName : "");
    }
  }, [value, selectedProduct, dropdownOpen]);

  // Get total stock for a product
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

  // Filter products based on search query (support name, brand, category, SKU, itemCode, barcode)
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(p =>
      p.productName?.toLowerCase().includes(q) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.productCategory && p.productCategory.toLowerCase().includes(q)) ||
      (p.products && p.products.some(v => v.itemCode && v.itemCode.toLowerCase().includes(q)))
    );
  }, [products, searchQuery]);

  return (
    <div ref={containerRef} className="w-full relative">
      {!hideLabel && <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Product *</label>}
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
          placeholder={placeholder}
          className={`pl-10 pr-10 w-full border rounded-xl text-xs h-[42px] transition-all font-semibold ${dropdownOpen
            ? "border-emerald-500 bg-white ring-4 ring-emerald-500/10 text-gray-850"
            : "border-gray-200 hover:border-gray-350 bg-white text-gray-700"
            }`}
        />
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <ChevronDown
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) setProductDropdownOpen(!dropdownOpen);
          }}
          className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 cursor-pointer transition-transform duration-200 text-gray-400 ${dropdownOpen ? "rotate-180 text-emerald-600" : ""
            }`}
        />
      </div>

      {dropdownOpen && (
        <div className="absolute left-0 right-0 z-[100] mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[300px]">
          <div className="overflow-y-auto divide-y divide-gray-100 pointer-events-auto">
            {/* Create New Product Option */}
            <button
              type="button"
              onClick={() => {
                setProductDropdownOpen(false);
                if (onCreateProduct) onCreateProduct();
              }}
              className="w-full px-3.5 py-3 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50/30 flex items-center gap-2 border-b border-gray-100 bg-transparent cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Create New Product</span>
            </button>

            {filteredProducts.length === 0 ? (
              <div className="px-3.5 py-4 text-xs text-gray-400 text-center font-medium">
                No products found
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isSelected = value === p._id;
                const categoryLabel = p.productCategory ? p.productCategory.charAt(0).toUpperCase() + p.productCategory.slice(1) : "General";
                const packsList = p.products?.map(v => `${v.parameter} ${v.unit}`).join(", ") || "N/A";
                const totalStock = getProductStock(p);
                const ProductIcon = getProductIcon(p.productCategory);

                return (
                  <div
                    key={p._id}
                    onClick={() => {
                      onChange(p._id);
                      setSearchQuery(p.productName);
                      setProductDropdownOpen(false);
                    }}
                    className={`px-3.5 py-2.5 cursor-pointer transition-colors flex items-center gap-3 hover:bg-gray-50 ${isSelected ? "bg-emerald-50/30 hover:bg-emerald-50/40" : ""
                      }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                      <ProductIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-850 text-xs truncate">{p.productName}</span>
                        {isSelected && <Check className="w-5 h-5 text-emerald-600 shrink-0 ml-2" />}
                      </div>
                      <div className="text-[10px] text-gray-500 font-semibold flex flex-wrap gap-x-3 gap-y-0.5">
                        <span>Category: <b className="text-gray-600">{categoryLabel}</b></span>
                        <span>Packs: <b className="text-gray-600">{packsList}</b></span>
                        <span>Stock: <b className="text-gray-600">{totalStock}</b></span>
                      </div>
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

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
import { clearSellStatus } from "../store/slices/sellSlice";
import { usePermissions } from "../hooks/usePermissions";
import api from "../lib/api";
import SearchableStateSelect from "../components/SearchableStateSelect";
import ProductModal from "../components/ProductModal";
import { searchGstin } from "../store/thunks/eInvoiceThunk";
import { normalizeGstinData } from "../utils/gstinNormalizer";
import GovernmentComplianceModal from "../components/GovernmentComplianceModal";
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

  const [editRecord, setEditRecord] = useState(null);
  const [recordLoading, setRecordLoading] = useState(false);

  useEffect(() => {
    dispatch(clearSellStatus());
    dispatch(fetchParties());
    dispatch(fetchProducts());
    dispatch(fetchStockSummary());
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

function InvoiceFormInner({ editRecord = null, parties, products, stockSummary = [], sellLoading }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [savedSaleForCompliance, setSavedSaleForCompliance] = useState(null);
  const [isComplianceModalOpen, setIsComplianceModalOpen] = useState(false);

  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [saleType, setSaleType] = useState(editRecord ? editRecord.saleType : "SALE");
  const [billingType, setBillingType] = useState(editRecord ? editRecord.billingType : "Credit");
  const [selectedPartyId, setSelectedPartyId] = useState(editRecord ? (editRecord.party?._id || editRecord.party || "") : "");

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

  // Items checkout array
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
          unit: it.unit || variant?.unit || "pcs",
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

  // Draft Item state for product configuration row
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

  // Auto-select state of supply when party profile is selected
  useEffect(() => {
    if (selectedPartyId) {
      const p = parties.find((party) => party._id === selectedPartyId);
      if (p && p.state) {
        setStateOfSupply(p.state);
      }
    }
  }, [selectedPartyId, parties]);

  // Sync draft price and tax rate when draft product/variant changes
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

  const handleSaveProduct = (form, variants, images, videos, selectedCrops) => {
    setSavingProduct(true);

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

        const res = await dispatch(addProduct(payload)).unwrap();
        toast.success("Product added successfully");
        setShowProductModal(false);

        // Reload lists in Redux
        const refreshedProds = await dispatch(fetchProducts()).unwrap();
        await dispatch(fetchStockSummary()).unwrap();

        // Try to find the matching product in the refreshed list
        const match = refreshedProds.find(p => p.productName === payload.productName || p._id === res._id || p._id === res.data?._id);
        if (match) {
          setDraftProductId(match._id);
          // Set first variant as default index
          setDraftVariantIndex(0);
        }
      } catch (err) {
        console.error("Add product error:", err);
        toast.error(
          typeof err === "string"
            ? err
            : err?.message || "Failed to add product"
        );
      } finally {
        setSavingProduct(false);
      }
    };

    executeSave();
  };

  // Compute draft math details
  const computedDraftDetails = useMemo(() => {
    const q = draftQty === "" ? 0 : parseFloat(draftQty) || 0;
    const price = draftPrice === "" ? 0 : parseFloat(draftPrice) || 0;
    const tPct = draftTaxPercent === "" ? 0 : parseFloat(draftTaxPercent) || 0;

    // 1. Rate calculation (unit price excluding tax if inclusive)
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

  // Add draft to checklist
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

    // Reset draft fields
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
  };

  // Load item back into draft fields for editing
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

  // Compute Grand Totals for UI display
  const subTotal = parseFloat(checkoutItems.reduce((acc, item) => acc + ((item.quantity === "" ? 0 : (parseFloat(item.quantity) || 0)) * (item.pricePerUnit === "" ? 0 : (parseFloat(item.pricePerUnit) || 0))), 0).toFixed(2));
  const totalDiscounts = parseFloat(checkoutItems.reduce((acc, item) => acc + (item.discountAmount === "" ? 0 : (parseFloat(item.discountAmount) || 0)), 0).toFixed(2));
  const totalTaxes = parseFloat(checkoutItems.reduce((acc, item) => acc + (parseFloat(item.taxAmount) || 0), 0).toFixed(2));
  const grandTotal = parseFloat(checkoutItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0).toFixed(2));

  const roundOffAmount = roundOff ? parseFloat((Math.round(grandTotal) - grandTotal).toFixed(2)) : 0;
  const finalTotal = roundOff ? Math.round(grandTotal) : grandTotal;
  const unpaidAmount = parseFloat((finalTotal - (parseFloat(receivedAmount) || 0)).toFixed(2));

  // Sync receivedAmount with billing type & finalTotal
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

    // Validations
    if (!selectedPartyId && !buyerName.trim()) {
      toast.error("Please select a registered party or enter Walk-in Buyer Name");
      return;
    }

    const validItems = checkoutItems.filter((i) => i.productId && (i.quantity === "" ? 0 : (parseFloat(i.quantity) || 0)) > 0);
    if (validItems.length === 0) {
      toast.error("Please add at least one valid inventory item");
      return;
    }

    // Stock quantity validation for SALE type
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
        // In edit mode, allow the existing qty to not trigger stock violation since it's already deducted from stock
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
      // Find the correct inventory item ID from stockSummary matching the specific variant
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
      party: selectedPartyId || null,
      buyerName: selectedPartyId ? parties.find((p) => p._id === selectedPartyId)?.name : buyerName,
      buyerPhone: selectedPartyId ? parties.find((p) => p._id === selectedPartyId)?.phoneNumber : buyerPhone,
      buyerAddress: selectedPartyId ? parties.find((p) => p._id === selectedPartyId)?.billingAddress : buyerAddress,
      buyerType: selectedPartyId ? "FARMER" : buyerType,
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

      // Check if compliance is already done
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
        setSavedSaleForCompliance(savedSale);
        setIsComplianceModalOpen(true);
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
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold transition-all shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to List
        </button>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Top Parameters (Sale Type, Payment, Party Profile) */}
        <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
          <div>
            <label className="block text-[10px] font-extrabold text-gray-500 mb-2 uppercase tracking-wider">Party Profile</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={selectedPartyId}
                  onChange={(e) => setSelectedPartyId(e.target.value)}
                  className="w-full border border-gray-200 hover:border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[42px] cursor-pointer font-bold text-gray-800 appearance-none pr-8 transition-all"
                >
                  <option value="">-- Direct Walk-In (Manual Entry) --</option>
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

            {/* Registered B2B or B2C Visual Indicators */}
            {selectedPartyId ? (
              <div className="mt-2.5">
                {(() => {
                  const p = parties.find((party) => party._id === selectedPartyId);
                  const isRegistered = p && (p.gstin || p.gstType?.startsWith("Registered"));
                  if (isRegistered) {
                    return (
                      <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-xl p-3 flex flex-col gap-1 shadow-2xs">
                        <div className="flex items-center gap-1.5">
                          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">✓</span>
                          <span className="font-extrabold text-[10px] text-emerald-805 uppercase tracking-wider">Registered (B2B Transaction)</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500 font-medium pt-1 border-t border-emerald-100/30">
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
                      <div className="bg-gray-50 border border-gray-200/60 rounded-xl p-3 flex flex-col gap-1 shadow-2xs">
                        <div className="flex items-center gap-1.5">
                          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-700 text-[10px] font-bold">👤</span>
                          <span className="font-extrabold text-[10px] text-gray-700 uppercase tracking-wider">Farmer / Unregistered (B2C)</span>
                        </div>
                        {p?.phoneNumber && (
                          <div className="text-[10px] text-gray-500 font-medium pt-1 border-t border-gray-150/40">
                            <span className="text-gray-400 font-semibold text-[8px] uppercase tracking-wider block">Phone Number</span>
                            <span className="font-bold text-gray-700">+91 {p.phoneNumber}</span>
                          </div>
                        )}
                      </div>
                    );
                  }
                })()}
              </div>
            ) : (
              <div className="mt-2.5 bg-gray-55 border border-gray-200/60 rounded-xl p-3 flex items-center gap-1.5 shadow-2xs">
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-750 text-[10px] font-bold">👤</span>
                <span className="font-extrabold text-[10px] text-gray-750 uppercase tracking-wider">Walk-in Customer (B2C)</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-gray-500 mb-2 uppercase tracking-wider">Sale Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSaleType("SALE")}
                className={`flex-1 flex items-center justify-center gap-2 h-[42px] px-4 rounded-xl text-xs font-bold transition-all border ${
                  saleType === "SALE"
                    ? "bg-emerald-605 text-white bg-emerald-600 border-emerald-600 shadow-sm"
                    : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                Direct Sale
              </button>
              <button
                type="button"
                onClick={() => setSaleType("ESTIMATE")}
                className={`flex-1 flex items-center justify-center gap-2 h-[42px] px-4 rounded-xl text-xs font-bold transition-all border ${
                  saleType === "ESTIMATE"
                    ? "bg-emerald-605 text-white bg-emerald-600 border-emerald-600 shadow-sm"
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
                className={`flex-1 flex items-center justify-center gap-2 h-[42px] px-4 rounded-xl text-xs font-bold transition-all border ${
                  billingType === "Cash"
                    ? "bg-emerald-650 text-white bg-emerald-600 border-emerald-600 shadow-sm"
                    : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                <Zap className="w-4 h-4" />
                Money Received
              </button>
              <button
                type="button"
                onClick={() => setBillingType("Credit")}
                className={`flex-1 flex items-center justify-center gap-2 h-[42px] px-4 rounded-xl text-xs font-bold transition-all border ${
                  billingType === "Credit"
                    ? "bg-emerald-650 text-white bg-emerald-600 border-emerald-600 shadow-sm"
                    : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                <Calendar className="w-4 h-4" />
                Udhar (Credit)
              </button>
            </div>
          </div>
        </div>

        {/* Two-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Left Column (spans 3 columns) */}
          <div className="lg:col-span-3 space-y-6">

            {/* Invoice Details Card */}
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
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full pl-3 pr-10 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[42px] cursor-pointer transition-all font-semibold text-gray-800"
                        required
                      />
                      <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
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

            {/* Customer Details Card (Only shown if manual walk-in is selected) */}
            {!selectedPartyId && (
              <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 pb-3.5 border-b border-gray-100">
                  <div className="bg-emerald-50 p-1.5 rounded-lg text-emerald-600 border border-emerald-100">
                    <User className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-gray-800 text-sm">Customer Details</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Buyer Name *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full pl-10 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[42px] transition-all font-semibold text-gray-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Buyer Phone</label>
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

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Buyer Address</label>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-start-3">
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
              </div>
            )}

            {/* Products Selection Card */}
            <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-6">
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

              {/* Add Item Form Controls */}
              <div className="space-y-8">
                {/* SECTION 1: PRODUCT DETAILS */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-extrabold text-[10px]">
                      1
                    </div>
                    <span className="font-bold text-gray-800 text-xs uppercase tracking-wider">Product Details</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
                    <div className="md:col-span-8">
                      <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Product *</label>
                      <div className="flex gap-2 items-center">
                        <div className="flex-1">
                          <SearchableProductSelect
                            value={draftProductId}
                            onChange={(newVal) => setDraftProductId(newVal)}
                            products={products}
                            stockSummary={stockSummary}
                            placeholder="Search item by name / code"
                            onCreateProduct={() => setShowProductModal(true)}
                            hideLabel={true}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowProductModal(true)}
                          className="px-4 border border-emerald-600 text-emerald-600 hover:bg-emerald-50 rounded-xl h-[42px] font-bold text-xs flex items-center justify-center gap-1.5 transition-all shrink-0 active:scale-95 bg-white"
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                          New Product
                        </button>
                      </div>
                    </div>
                  </div>

                  {draftProductId && (
                    <div className="bg-gray-55/40 border border-gray-150 rounded-xl p-3 flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-gray-500 font-semibold animate-in fade-in duration-200">
                      <span>Pack Size: <b className="text-gray-700">{draftVariant?.parameter || draftVariant?.unit || "N/A"}</b></span>
                      <span>Available Stock: <b className="text-gray-700">{availableQty} {draftUnit}</b></span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Quantity *</label>
                      <div className="flex border border-emerald-600 rounded-xl overflow-hidden bg-white h-[42px] w-full focus-within:ring-1 focus-within:ring-emerald-600 shadow-2xs">
                        <button
                          type="button"
                          disabled={!draftProductId}
                          onClick={() => setDraftQty(prev => Math.max(1, prev - 1))}
                          className="px-4 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-700 font-extrabold h-full border-r border-gray-200 disabled:opacity-50 transition-colors flex items-center justify-center"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          disabled={!draftProductId}
                          value={draftQty}
                          onChange={(e) => setDraftQty(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full text-center text-xs font-bold focus:ring-0 focus:outline-none border-0 p-0 text-gray-850 bg-transparent h-full"
                          style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                        />
                        <button
                          type="button"
                          disabled={!draftProductId}
                          onClick={() => setDraftQty(prev => prev + 1)}
                          className="px-4 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-700 font-extrabold h-full border-l border-gray-200 disabled:opacity-50 transition-colors flex items-center justify-center"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[10px] text-gray-450 mt-1.5 block">Available: {availableQty} {draftUnit}</span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Unit *</label>
                      <div className="relative">
                        <select
                          disabled={!draftProductId}
                          value={draftVariantIndex}
                          onChange={(e) => setDraftVariantIndex(parseInt(e.target.value) || 0)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white h-[42px] disabled:bg-gray-50 disabled:text-gray-400 font-bold text-gray-800 appearance-none pr-8 transition-all cursor-pointer shadow-2xs"
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
                      <span className="text-[10px] text-gray-450 mt-1.5 block">Unit: {draftUnit}</span>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: PRICING & DISCOUNT */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-extrabold text-[10px]">
                      2
                    </div>
                    <span className="font-bold text-gray-800 text-xs uppercase tracking-wider">Pricing & Discount</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Price Per Unit (₹) *</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        disabled={!draftProductId}
                        value={draftPrice}
                        onChange={(e) => setDraftPrice(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 disabled:bg-gray-50 disabled:text-gray-400 h-[42px] font-bold text-gray-800 text-center shadow-2xs"
                      />
                      <span className="text-[10px] text-gray-400 mt-1.5 block">Price for 1 unit</span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Discount Type *</label>
                      <div className="relative">
                        <select
                          disabled={!draftProductId}
                          value={draftDiscountType}
                          onChange={(e) => {
                            const newType = e.target.value;
                            setDraftDiscountType(newType);
                            if (newType === "Percentage") {
                              setDraftDiscountPercent("");
                              setDraftDiscountAmount("");
                            } else {
                              setDraftDiscountAmount("");
                              setDraftDiscountPercent("");
                            }
                          }}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white h-[42px] disabled:bg-gray-50 disabled:text-gray-400 font-bold text-gray-800 appearance-none pr-8 transition-all cursor-pointer shadow-2xs"
                        >
                          <option value="Percentage">Percentage (%)</option>
                          <option value="Fixed Amount">Fixed Amount (₹)</option>
                        </select>
                        <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-gray-400">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-455 mt-1.5 block">Select discount type</span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                        {draftDiscountType === "Percentage" ? "Discount Percent (%) *" : "Discount Value (₹) *"}
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
                          className="w-full border border-gray-200 rounded-xl pl-3 pr-7 py-2 text-xs focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 disabled:bg-gray-50 disabled:text-gray-400 h-[42px] font-bold text-gray-800 text-center shadow-2xs"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-450 font-bold text-xs">
                          {draftDiscountType === "Percentage" ? "%" : "₹"}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-455 mt-1.5 block">
                        {draftDiscountType === "Percentage" ? "Discount percentage" : "Discount value"}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Discount Amount (₹)</label>
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={draftProductId ? (computedDraftDetails.discountAmount || "0.00") : "0.00"}
                        className="w-full border border-dashed border-gray-200 bg-slate-50 text-gray-400 rounded-xl px-3 py-2 text-xs h-[42px] font-bold text-center shadow-2xs cursor-not-allowed"
                      />
                      <span className="text-[10px] text-slate-500 mt-1.5 block">Auto calculated</span>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: TAX & CALCULATIONS */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-extrabold text-[10px]">
                      3
                    </div>
                    <span className="font-bold text-gray-800 text-xs uppercase tracking-wider">Tax & Calculations</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-5 items-end">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Tax Type *</label>
                      <div className="relative">
                        <select
                          disabled={!draftProductId}
                          value={draftTaxType}
                          onChange={(e) => setDraftTaxType(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white h-[42px] disabled:bg-gray-50 disabled:text-gray-400 font-bold text-gray-800 appearance-none pr-8 transition-all cursor-pointer shadow-2xs"
                        >
                          <option value="Without Tax">Without Tax</option>
                          <option value="With Tax">With Tax</option>
                        </select>
                        <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-gray-400">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-455 mt-1.5 block">Select tax type</span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">GST % *</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          disabled={!draftProductId}
                          value={draftTaxPercent}
                          onChange={(e) => setDraftTaxPercent(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full border border-gray-200 rounded-xl pl-3 pr-7 py-2 text-xs focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 disabled:bg-gray-50 disabled:text-gray-400 h-[42px] font-bold text-gray-800 text-center shadow-2xs"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-455 font-bold text-xs">%</span>
                      </div>
                      <span className="text-[10px] text-gray-455 mt-1.5 block">GST percentage</span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Rate (₹)</label>
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={draftProductId ? (computedDraftDetails.rate || "0.00") : "0.00"}
                        className="w-full border border-dashed border-gray-200 bg-slate-50 text-gray-400 rounded-xl px-3 py-2 text-xs h-[42px] font-bold text-center shadow-2xs cursor-not-allowed"
                      />
                      <span className="text-[10px] text-slate-500 mt-1.5 block">Calculated rate</span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Tax Amount (₹)</label>
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={draftProductId ? (computedDraftDetails.taxAmount || "0.00") : "0.00"}
                        className="w-full border border-dashed border-gray-200 bg-slate-50 text-gray-400 rounded-xl px-3 py-2 text-xs h-[42px] font-bold text-center shadow-2xs cursor-not-allowed"
                      />
                      <span className="text-[10px] text-slate-500 mt-1.5 block">Auto calculated</span>
                    </div>

                    {/* Estimated Total Card */}
                    <div className="bg-emerald-50/20 border border-emerald-200 rounded-xl p-3 flex flex-col justify-between min-h-[42px] h-[62px]">
                      <span className="block text-[9px] font-extrabold text-emerald-800 uppercase tracking-wider text-center">Total Amount (₹)</span>
                      <span className="block text-emerald-700 font-extrabold text-lg text-center leading-none mt-0.5">
                        ₹{draftProductId ? (computedDraftDetails.amount || "0.00") : "0.00"}
                      </span>
                      <span className="block text-[9px] text-emerald-600/85 font-semibold text-center mt-0.5">Final amount</span>
                    </div>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex justify-end gap-3 pt-2">
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
                    className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 bg-white"
                  >
                    <RefreshCw className="w-4 h-4 text-gray-500" />
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleAddDraftItem}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>
              </div>
            </div>

            {/* Added Items List Table */}
            <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600 border border-emerald-100">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-extrabold text-gray-800 text-sm">Added Items</h3>
                  </div>
                </div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                  {checkoutItems.filter((i) => i.productId).length}
                </span>
              </div>

              {checkoutItems.filter((i) => i.productId).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border border-dashed border-gray-200 rounded-2xl bg-gray-55/10">
                  <FileSpreadsheet className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="font-bold text-gray-700 text-sm">No items added yet</p>
                  <p className="text-xs text-gray-450 mt-1">Search and add products above to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-150 rounded-2xl shadow-2xs">
                  <table className="w-full border-collapse text-left bg-white text-xs">
                    <thead>
                      <tr className="bg-gray-55/40 border-b border-gray-150 text-[10px] font-extrabold text-gray-455 uppercase tracking-wider">
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3 text-center">Qty</th>
                        <th className="px-4 py-3 text-center">Unit</th>
                        <th className="px-4 py-3 text-right">Price / Unit</th>
                        <th className="px-4 py-3 text-right">Rate</th>
                        <th className="px-4 py-3 text-right">Discount %</th>
                        <th className="px-4 py-3 text-right">Discount Amt.</th>
                        <th className="px-4 py-3 text-center">Tax %</th>
                        <th className="px-4 py-3 text-right">Tax Amt.</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-semibold">
                      {checkoutItems.filter((i) => i.productId).map((item, idx) => {
                        const prod = products.find((p) => p._id === item.productId);
                        const variant = prod?.products?.[item.variantIndex];
                        return (
                          <tr key={idx} className="hover:bg-gray-55/30 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-extrabold text-gray-900">{prod?.productName}</p>
                              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                                {variant?.itemCode ? `${variant.itemCode} • ` : ""}
                                {variant?.parameter ? `${variant.parameter} (${variant.unit})` : variant?.unit || "pcs"}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-center text-gray-800 font-bold">{item.quantity}</td>
                            <td className="px-4 py-3 text-center text-gray-500 font-semibold">{item.unit || variant?.unit}</td>
                            <td className="px-4 py-3 text-right text-gray-700">₹{(parseFloat(item.pricePerUnit) || 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right text-gray-700">₹{(parseFloat(item.rate) || parseFloat(item.pricePerUnit) || 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              {item.discountPercent > 0 ? `${item.discountPercent}%` : "—"}
                            </td>
                            <td className="px-4 py-3 text-right text-red-600">
                              {item.discountAmount > 0 ? `-₹${(parseFloat(item.discountAmount) || 0).toFixed(2)}` : "—"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <p className="text-gray-800 font-bold">{item.taxPercent}%</p>
                              <p className="text-[9px] text-gray-450 font-semibold">{item.taxType || "Without Tax"}</p>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-700">₹{(parseFloat(item.taxAmount) || 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-extrabold text-emerald-700">₹{(parseFloat(item.amount) || 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleEditItem(idx)}
                                  className="text-gray-400 hover:text-emerald-600 transition p-1.5 hover:bg-gray-100 rounded-lg"
                                  title="Edit row item"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCheckoutItems((prev) => prev.filter((_, i) => i !== idx));
                                  }}
                                  className="text-gray-400 hover:text-red-500 transition p-1.5 hover:bg-gray-100 rounded-lg"
                                  title="Delete row item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50/50 border-t border-gray-150 text-xs font-bold text-gray-700">
                      <tr>
                        <td colSpan={9} className="px-4 py-2.5 text-right font-semibold text-gray-500">Sub Total:</td>
                        <td className="px-4 py-2.5 text-right font-bold text-gray-800">₹{subTotal.toFixed(2)}</td>
                        <td></td>
                      </tr>
                      <tr>
                        <td colSpan={9} className="px-4 py-2.5 text-right font-semibold text-red-500">Discount Total:</td>
                        <td className="px-4 py-2.5 text-right font-bold text-red-650">-₹{totalDiscounts.toFixed(2)}</td>
                        <td></td>
                      </tr>
                      <tr>
                        <td colSpan={9} className="px-4 py-2.5 text-right font-semibold text-gray-500">Tax Total:</td>
                        <td className="px-4 py-2.5 text-right font-bold text-gray-800">+₹{totalTaxes.toFixed(2)}</td>
                        <td></td>
                      </tr>
                      <tr className="bg-emerald-50/30">
                        <td colSpan={9} className="px-4 py-3.5 text-right font-extrabold text-emerald-900">Grand Total:</td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="inline-block px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-black text-sm shadow-xs">
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


            {/* Three-Column Description / Terms / Notes Textareas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Sales Bill Description</label>
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

              <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Terms & Conditions</label>
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

              <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Sales Bill Notes / Remarks</label>
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
          </div>

          {/* Right Column (spans 1 column) */}
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
                  <span>Subtotal (Base Bill)</span>
                  <span className="text-gray-800 font-bold">₹{subTotal.toLocaleString("en-IN")}</span>
                </div>
                
                <div className="flex justify-between text-xs font-semibold text-red-650">
                  <span>Discounts Applied</span>
                  <span className="font-bold">-₹{totalDiscounts.toLocaleString("en-IN")}</span>
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
                  <span className="text-xs font-bold text-gray-800">
                    {roundOffAmount >= 0 ? "+" : ""}₹{roundOffAmount.toFixed(2)}
                  </span>
                </div>

                {/* Grand Total box */}
                <div className="bg-emerald-50/40 rounded-xl p-4 flex items-center justify-between border border-emerald-100">
                  <span className="text-xs font-black text-emerald-900 uppercase tracking-wider">Grand Total</span>
                  <span className="text-xl font-black text-emerald-950">₹{finalTotal.toLocaleString("en-IN")}</span>
                </div>


                {/* Unpaid Amount */}
                <div className="flex justify-between border-t border-gray-100 pt-4 font-bold text-sm text-gray-800">
                  <span>Unpaid Amount</span>
                  <span className={`font-black ${unpaidAmount > 0 ? "text-amber-600" : "text-emerald-700"}`}>
                    ₹{unpaidAmount.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions Footer */}
        <div className="flex justify-end gap-3 p-4 bg-white border border-gray-150 rounded-2xl shadow-sm items-center">
          <button
            type="button"
            onClick={() => navigate("/sell")}
            disabled={sellLoading}
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-650 hover:bg-gray-50 bg-white disabled:opacity-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={sellLoading}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            {sellLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {editRecord
              ? (sellLoading ? "Saving..." : "Save Changes")
              : (sellLoading ? "Creating..." : `Create Sales Bill`)}
          </button>
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

      <GovernmentComplianceModal
        isOpen={isComplianceModalOpen}
        sale={savedSaleForCompliance}
        onClose={() => {
          setIsComplianceModalOpen(false);
          navigate("/sell?tab=sales");
        }}
      />
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
      const refreshedParties = await dispatch(fetchParties()).unwrap();
      const match = refreshedParties.find(
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
                          className={`w-full pl-10 pr-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white h-[38px] ${
                            errors.gstin ? "border-red-400 focus:ring-red-400" : "border-gray-200"
                          }`}
                          placeholder="22AAAAA0000A1Z5"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={gstinLoading || form.gstin.length !== 15}
                        onClick={handleVerifyGstin}
                        className={`px-3.5 py-2 disabled:opacity-50 text-xs font-bold rounded-lg border transition shrink-0 flex items-center gap-1.5 h-[38px] ${
                          verifiedGstinDetails
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
                    className={`w-full pl-10 pr-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 bg-white h-[38px] ${
                      errors.name 
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
                    className={`w-full pl-10 pr-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white h-[38px] ${
                      errors.phoneNumber ? "border-red-400 focus:ring-red-400 bg-white" : "border-gray-200 bg-white"
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
                    className={`w-full pl-10 pr-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white h-[38px] ${
                      errors.email ? "border-red-400 focus:ring-red-400 bg-white" : "border-gray-200 bg-white"
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
                    className={`w-full pl-10 pr-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 bg-white ${
                      isAddressAutofilled
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
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    form.openingBalanceType === "CREDIT"
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
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    form.openingBalanceType === "DEBIT"
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
      const refreshedProds = await dispatch(fetchProducts()).unwrap();
      await dispatch(fetchStockSummary()).unwrap();

      // Find match to select newly created product
      const match = refreshedProds.find(
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
                className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white h-[38px] font-semibold text-gray-805 ${
                  errors.productName ? "border-red-400 focus:ring-red-450" : "border-gray-200"
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
                className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white h-[38px] font-semibold text-gray-805 ${
                  errors.parameter ? "border-red-400 focus:ring-red-450" : "border-gray-200"
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
                className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white h-[38px] font-semibold text-gray-855 ${
                  errors.mrp ? "border-red-400 focus:ring-red-450" : "border-gray-200"
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
                className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white h-[38px] font-semibold text-gray-855 ${
                  errors.purchasePrice ? "border-red-400 focus:ring-red-450" : "border-gray-200"
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
                className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white h-[38px] font-semibold text-gray-855 ${
                  errors.salePrice ? "border-red-400 focus:ring-red-450" : "border-gray-200"
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
                className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white h-[38px] font-semibold text-gray-855 ${
                  errors.quantity ? "border-red-400 focus:ring-red-450" : "border-gray-200"
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

function SearchableProductSelect({ value, onChange, products, stockSummary = [], placeholder = "Search product by name or category...", disabled = false, onCreateProduct, hideLabel = false }) {
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

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(p =>
      p.productName?.toLowerCase().includes(q) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.productCategory && p.productCategory.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  return (
    <div ref={containerRef} className="w-full relative">
      {!hideLabel && <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Product *</label>}
      <div className="relative">
        <input
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
          className={`pl-10 pr-10 w-full border rounded-xl text-xs h-[42px] transition-all font-semibold ${
            dropdownOpen
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
          className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 cursor-pointer transition-transform duration-200 text-gray-400 ${
            dropdownOpen ? "rotate-180 text-emerald-600" : ""
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
                    className={`px-3.5 py-2.5 cursor-pointer transition-colors flex items-center gap-3 hover:bg-gray-50 ${
                      isSelected ? "bg-emerald-50/30 hover:bg-emerald-50/40" : ""
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

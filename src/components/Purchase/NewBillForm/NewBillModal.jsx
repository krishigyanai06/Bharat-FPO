import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { X, CalendarCheck, CheckCircle, Loader2 } from "lucide-react";
import {
  createPurchase,
  updatePurchase,
} from "../../../store/thunks/purchaseThunk";
import { fetchParties } from "../../../store/thunks/partyThunk";
import { fetchProducts, fetchStockSummary, updateProduct } from "../../../store/thunks/inventoryThunk";
import QuickAddVendorModal from "../Modals/QuickAddVendorModal";
import QuickAddProductModal from "../Modals/QuickAddProductModal";
import SupplierDetailsStep from "./SupplierDetailsStep";
import ItemsEntryStep from "./ItemsEntryStep";
import SummaryPaymentStep from "./SummaryPaymentStep";

export default function NewBillModal({
  editRecord = null,
  parties = [],
  products = [],
  stockSummary = [],
  onClose,
  onSuccess,
}) {
  const dispatch = useDispatch();

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    return isNaN(d.getTime())
      ? "—"
      : d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  };

  const getLiveVariantStock = (p, v) => {
    if (!p || !v) return 0;
    const stockRecord = (stockSummary || []).find(
      (s) =>
        s.item?.variantId === v._id ||
        s.item?._id === v._id ||
        (s.item?.sourceRef === p._id &&
          String(s.item?.parameter).trim().toLowerCase() === String(v.parameter).trim().toLowerCase() &&
          String(s.item?.unit).trim().toLowerCase() === String(v.unit).trim().toLowerCase())
    );
    return stockRecord ? stockRecord.availableQuantity ?? 0 : v.quantity ?? 0;
  };

  const getLiveProductStock = (p) => {
    if (!p?.products) return 0;
    return p.products.reduce((sum, v) => sum + getLiveVariantStock(p, v), 0);
  };

  // Basic Header Fields
  const [purchaseType, setPurchaseType] = useState(editRecord ? editRecord.purchaseType : "BILL");
  const [billNumber, setBillNumber] = useState(editRecord ? editRecord.billNumber || "" : "");
  const [billingType, setBillingType] = useState(editRecord ? editRecord.billingType : "Credit");
  const [selectedParty, setSelectedParty] = useState(
    editRecord ? editRecord.party?._id || editRecord.party || "" : ""
  );
  const [billDate, setBillDate] = useState(
    editRecord ? editRecord.billDate?.split("T")[0] : new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState(editRecord ? editRecord.dueDate?.split("T")[0] || "" : "");
  const [stateOfSupply, setStateOfSupply] = useState(
    editRecord ? editRecord.stateOfSupply || "Uttar Pradesh" : "Uttar Pradesh"
  );
  const [remarks, setRemarks] = useState(editRecord ? editRecord.remarks || "" : "");

  // Paid Payment Workflows Fields
  const [paymentType, setPaymentType] = useState(editRecord ? editRecord.paymentType || "Cash" : "Cash");
  const [referenceNo, setReferenceNo] = useState(editRecord ? editRecord.referenceNo || "" : "");
  const [paidAmount, setPaidAmount] = useState(editRecord ? editRecord.paidAmount ?? 0 : 0);

  // File Upload State
  const [uploadedFile, setUploadedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(
    editRecord ? editRecord.invoiceFile || editRecord.image || null : null
  );
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [inlineRowData, setInlineRowData] = useState(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);

  // Quick modals triggers
  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);

  // Table items rows checkout
  const [items, setItems] = useState(() => {
    if (editRecord && editRecord.items?.length > 0) {
      return editRecord.items.map((it) => {
        const targetItemId = it.item?._id || it.item;
        let matchedProd = null;

        if (targetItemId && targetItemId !== "null" && targetItemId !== "undefined") {
          matchedProd = products.find(
            (p) => p._id === targetItemId || p.products?.some((v) => v._id === targetItemId)
          );
        }

        if (!matchedProd && it.unit && it.pricePerUnit) {
          matchedProd = products.find((p) =>
            p.products?.some(
              (v) =>
                String(v.unit).toLowerCase() === String(it.unit).toLowerCase() &&
                Number(v.purchasePrice) === Number(it.pricePerUnit)
            )
          );
        }

        let productId = matchedProd?._id || "";
        let variantParameter = "";
        let unit = it.unit || "pcs";
        let stock = 0;

        if (matchedProd?.products) {
          let matchedVar = matchedProd.products.find((v) => v._id === targetItemId);
          if (!matchedVar && it.unit && it.pricePerUnit) {
            matchedVar = matchedProd.products.find(
              (v) =>
                String(v.unit).toLowerCase() === String(it.unit).toLowerCase() &&
                Number(v.purchasePrice) === Number(it.pricePerUnit)
            );
          }
          if (matchedVar) {
            variantParameter = matchedVar.parameter || "";
            stock = matchedVar.quantity ?? 0;
            unit = matchedVar.unit || "pcs";
          }
        }

        return {
          productId,
          variantParameter,
          availableStock: stock,
          quantity: it.quantity || 1,
          unit: unit,
          pricePerUnit: it.pricePerUnit || "",
          taxType: it.taxType || "Without Tax",
          discountPercent: it.discountPercent || "",
          discountAmount: it.discountAmount || 0,
          taxPercent: it.taxPercent || "",
          taxAmount: it.taxAmount || 0,
          amount: it.amount || 0,
        };
      });
    }
    return [];
  });

  // Form states for the "Add Product" card
  const [formProductId, setFormProductId] = useState("");
  const [formVariantParameter, setFormVariantParameter] = useState("");
  const [formAvailableStock, setFormAvailableStock] = useState(0);
  const [formQuantity, setFormQuantity] = useState(1);
  const [formUnit, setFormUnit] = useState("kg");
  const [formPricePerUnit, setFormPricePerUnit] = useState("");
  const [discountType, setDiscountType] = useState("percentage");
  const [formDiscountValue, setFormDiscountValue] = useState("");
  const [taxInputType, setTaxInputType] = useState("percentage");
  const [formTaxValue, setFormTaxValue] = useState("");
  const [formTaxType, setFormTaxType] = useState("Without Tax");

  const [editingIndex, setEditingIndex] = useState(null);

  const [formHsnCode, setFormHsnCode] = useState("");
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const productDropdownRef = useRef(null);

  // Refs for UI navigation
  const searchInputRef = useRef(null);
  const quantityInputRef = useRef(null);
  const activeItemRef = useRef(null);
  const partySelectRef = useRef(null);
  const dueDateInputRef = useRef(null);
  const paidAmountInputRef = useRef(null);
  const priceInputRef = useRef(null);

  const [errors, setErrors] = useState({});

  // Debounced search query
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(productSearchQuery);
    }, 150);
    return () => clearTimeout(handler);
  }, [productSearchQuery]);

  // Recent products
  const [recentProductIds, setRecentProductIds] = useState(() => {
    try {
      const stored = localStorage.getItem("purchase_recent_products");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const addToRecentProducts = (productId) => {
    if (!productId) return;
    setRecentProductIds((prev) => {
      const filtered = prev.filter((id) => id !== productId);
      const updated = [productId, ...filtered].slice(0, 15);
      localStorage.setItem("purchase_recent_products", JSON.stringify(updated));
      return updated;
    });
  };

  const recentProducts = useMemo(() => {
    return recentProductIds.map((id) => products.find((p) => p._id === id)).filter(Boolean);
  }, [recentProductIds, products]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(30);

  useEffect(() => {
    setActiveIndex(0);
    setVisibleCount(30);
  }, [debouncedSearchQuery]);

  const [expandedRows, setExpandedRows] = useState(new Set());

  // Search filtering
  const filteredProducts = useMemo(() => {
    const query = debouncedSearchQuery.trim().toLowerCase();
    const selectedProd = products.find((p) => p._id === formProductId);
    if (selectedProd && selectedProd.productName.toLowerCase() === query) {
      return products;
    }
    if (!query) return products;

    return products.filter((p) => {
      const name = String(p.productName || "").toLowerCase();
      const cat = String(p.productCategory || "").toLowerCase();
      const brand = String(p.brand || "").toLowerCase();
      const hsn = String(p.hsnCode || "").toLowerCase();

      if (name.includes(query) || cat.includes(query) || brand.includes(query) || hsn.includes(query)) {
        return true;
      }

      if (p.products && Array.isArray(p.products)) {
        return p.products.some((v) => {
          const itemCode = String(v.itemCode || "").toLowerCase();
          const parameter = String(v.parameter || "").toLowerCase();
          const unit = String(v.unit || "").toLowerCase();
          return itemCode.includes(query) || parameter.includes(query) || unit.includes(query);
        });
      }
      return false;
    });
  }, [debouncedSearchQuery, products, formProductId]);

  const searchResults = useMemo(() => {
    const list = [];
    filteredProducts.forEach((p) => {
      if (p.products && p.products.length > 0) {
        p.products.forEach((v) => {
          list.push({
            product: p,
            variant: v,
            key: `${p._id}-${v._id || v.parameter}-${v.unit}`,
          });
        });
      } else {
        list.push({
          product: p,
          variant: null,
          key: p._id,
        });
      }
    });
    return list;
  }, [filteredProducts]);

  const handleProductVariantSelect = (product, variant) => {
    setFormProductId(product._id);
    setFormVariantParameter(variant.parameter || "");
    setFormUnit(variant.unit || "pcs");
    setFormAvailableStock(getLiveVariantStock(product, variant));
    setFormPricePerUnit(variant.purchasePrice || "");
    setTaxInputType("percentage");
    setFormTaxValue(product.taxRate !== undefined ? parseFloat(product.taxRate) : "");
    setFormTaxType(variant.purchasePriceTaxType || "Without Tax");
    setDiscountType("percentage");
    setFormDiscountValue("");
    setFormQuantity(1);
    setFormHsnCode(product.hsnCode || "");
    setProductSearchQuery(product.productName);

    setErrors((prev) => {
      const next = { ...prev };
      delete next.formProductId;
      delete next.formVariantParameter;
      return next;
    });

    addToRecentProducts(product._id);
  };

  useEffect(() => {
    if (activeStep === 2 && searchInputRef.current) {
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
  }, [activeStep]);

  useEffect(() => {
    if (formProductId && quantityInputRef.current) {
      setTimeout(() => {
        if (quantityInputRef.current) {
          quantityInputRef.current.focus();
          quantityInputRef.current.select();
        }
      }, 50);
    }
  }, [formProductId]);

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeIndex]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setAddProductOpen(true);
        setProductDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (selectedParty) {
      const vendorObj = parties.find((p) => p._id === selectedParty);
      if (vendorObj && vendorObj.state) {
        setStateOfSupply(vendorObj.state);
      }
    }
  }, [selectedParty, parties]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target)) {
        setProductDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!productDropdownOpen) {
      const selectedProd = products.find((p) => p._id === formProductId);
      setProductSearchQuery(selectedProd ? selectedProd.productName : "");
    }
  }, [productDropdownOpen, formProductId, products]);

  useEffect(() => {
    if (formProductId) {
      const prod = products.find((p) => p._id === formProductId);
      if (prod && prod.products?.length === 1) {
        const singleVar = prod.products[0];
        setFormVariantParameter(singleVar.parameter || "");
        setFormUnit(singleVar.unit || "pcs");
        setFormAvailableStock(getLiveVariantStock(prod, singleVar));
        setFormPricePerUnit(singleVar.purchasePrice || "");
        setFormTaxType(singleVar.purchasePriceTaxType || "Without Tax");
        setFormHsnCode(prod.hsnCode || "");
      }
    }
  }, [formProductId, products]);

  const handleProductChange = (productId) => {
    setFormProductId(productId);
    if (productId) {
      addToRecentProducts(productId);
    }
    const prod = products.find((p) => p._id === productId);
    if (prod) {
      const defaultVar = prod.products?.[0];
      setFormVariantParameter(defaultVar?.parameter || "");
      setFormAvailableStock(getLiveVariantStock(prod, defaultVar));
      setFormUnit(defaultVar?.unit || "pcs");
      setFormPricePerUnit(defaultVar?.purchasePrice || "");
      setTaxInputType("percentage");
      setFormTaxValue(prod.taxRate !== undefined ? parseFloat(prod.taxRate) : "");
      setFormTaxType(defaultVar?.purchasePriceTaxType || "Without Tax");
      setDiscountType("percentage");
      setFormDiscountValue("");
      setFormQuantity(1);
      setFormHsnCode(prod.hsnCode || "");
      setProductSearchQuery(prod.productName);
    } else {
      setFormVariantParameter("");
      setFormAvailableStock(0);
      setFormUnit("kg");
      setFormPricePerUnit("");
      setTaxInputType("percentage");
      setFormTaxValue("");
      setFormTaxType("Without Tax");
      setDiscountType("percentage");
      setFormDiscountValue("");
      setFormQuantity(1);
      setFormHsnCode("");
      setProductSearchQuery("");
    }
  };

  useEffect(() => {
    const handleTableKeys = (e) => {
      if (activeStep !== 2 || items.length === 0) return;
      const isEditing = editingRowIndex !== null;
      if (e.key === "ArrowDown" && !isEditing) {
        e.preventDefault();
        setSelectedRowIndex((prev) => {
          if (prev === null) return 0;
          return Math.min(items.length - 1, prev + 1);
        });
      } else if (e.key === "ArrowUp" && !isEditing) {
        e.preventDefault();
        setSelectedRowIndex((prev) => {
          if (prev === null) return 0;
          return Math.max(0, prev - 1);
        });
      } else if (e.key === "Escape" && isEditing) {
        e.preventDefault();
        setEditingRowIndex(null);
        setInlineRowData(null);
      } else if (e.key === "Delete" && !isEditing && selectedRowIndex !== null) {
        e.preventDefault();
        if (window.confirm("Are you sure you want to delete the selected item?")) {
          handleDeleteProductFromList(selectedRowIndex);
          setSelectedRowIndex(null);
        }
      }
    };
    window.addEventListener("keydown", handleTableKeys);
    return () => window.removeEventListener("keydown", handleTableKeys);
  }, [activeStep, items, editingRowIndex, selectedRowIndex]);

  const recalculateRowData = (updatedRow) => {
    const qty = parseFloat(updatedRow.quantity) || 0;
    const price = parseFloat(updatedRow.pricePerUnit) || 0;
    const base = qty * price;

    const discPct = parseFloat(updatedRow.discountPercent) || 0;
    const discountAmount = parseFloat((base * (discPct / 100)).toFixed(2));
    const afterDiscount = Math.max(0, base - discountAmount);

    const taxPct = parseFloat(updatedRow.taxPercent) || 0;
    let taxAmount = 0;
    let amount = 0;

    if (updatedRow.taxType === "With Tax") {
      amount = parseFloat(afterDiscount.toFixed(2));
      const taxable = amount / (1 + taxPct / 100);
      taxAmount = parseFloat((amount - taxable).toFixed(2));
    } else {
      const taxable = afterDiscount;
      taxAmount = parseFloat((taxable * (taxPct / 100)).toFixed(2));
      amount = parseFloat((taxable + taxAmount).toFixed(2));
    }

    return {
      ...updatedRow,
      quantity: qty,
      pricePerUnit: price,
      discountPercent: discPct,
      discountAmount,
      taxPercent: taxPct,
      taxAmount,
      amount,
    };
  };

  const handleInlineChange = (field, value) => {
    setInlineRowData((prev) => {
      if (!prev) return null;
      const updated = { ...prev, [field]: value };
      return recalculateRowData(updated);
    });
  };

  const handleSaveInlineRow = (idx) => {
    if (!inlineRowData) return;
    const finalRow = recalculateRowData(inlineRowData);
    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = finalRow;
      return copy;
    });
    setEditingRowIndex(null);
    setInlineRowData(null);
  };

  const handleAddProductToList = () => {
    const newErrors = {};
    if (!formProductId) {
      newErrors.formProductId = "Please select a product.";
    }
    if (!formVariantParameter || !formVariantParameter.trim()) {
      newErrors.formVariantParameter = "Variant pack selection is required.";
    }
    const qty = parseFloat(formQuantity) || 0;
    if (qty <= 0) {
      newErrors.formQuantity = "Quantity must be greater than zero.";
    }
    const price = parseFloat(formPricePerUnit);
    if (isNaN(price) || price < 0) {
      newErrors.formPricePerUnit = "Price cannot be negative.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTimeout(() => {
        if (newErrors.formProductId) {
          searchInputRef.current?.focus();
          searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (newErrors.formQuantity) {
          quantityInputRef.current?.focus();
          quantityInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (newErrors.formPricePerUnit) {
          priceInputRef.current?.focus();
          priceInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
      return;
    }

    setErrors({});

    const base = qty * price;

    let discPct = 0;
    let discountAmount = 0;
    const rawDisc = parseFloat(formDiscountValue) || 0;

    if (discountType === "percentage") {
      discPct = rawDisc;
      discountAmount = parseFloat((base * (discPct / 100)).toFixed(2));
    } else {
      discountAmount = rawDisc;
      discPct = base > 0 ? parseFloat(((discountAmount / base) * 100).toFixed(2)) : 0;
    }

    const afterDiscount = Math.max(0, base - discountAmount);

    let taxPct = 0;
    let taxAmount = 0;
    let amount = 0;
    const rawTax = parseFloat(formTaxValue) || 0;

    if (taxInputType === "percentage") {
      taxPct = rawTax;
      if (formTaxType === "With Tax") {
        amount = parseFloat(afterDiscount.toFixed(2));
        const taxable = amount / (1 + taxPct / 100);
        taxAmount = parseFloat((amount - taxable).toFixed(2));
      } else {
        const taxable = afterDiscount;
        taxAmount = parseFloat((taxable * (taxPct / 100)).toFixed(2));
        amount = parseFloat((taxable + taxAmount).toFixed(2));
      }
    } else {
      taxAmount = rawTax;
      if (formTaxType === "With Tax") {
        amount = parseFloat(afterDiscount.toFixed(2));
        const taxable = Math.max(0, amount - taxAmount);
        taxPct = taxable > 0 ? parseFloat(((taxAmount / taxable) * 100).toFixed(2)) : 0;
      } else {
        const taxable = afterDiscount;
        amount = parseFloat((taxable + taxAmount).toFixed(2));
        taxPct = taxable > 0 ? parseFloat(((taxAmount / taxable) * 100).toFixed(2)) : 0;
      }
    }

    const newItem = {
      productId: formProductId,
      variantParameter: formVariantParameter,
      availableStock: parseFloat(formAvailableStock) || 0,
      quantity: qty,
      unit: formUnit,
      pricePerUnit: price,
      taxType: formTaxType,
      discountPercent: discPct,
      discountAmount,
      taxPercent: taxPct,
      taxAmount,
      amount,
      hsnCode: formHsnCode || products.find((p) => p._id === formProductId)?.hsnCode || "",
    };

    setItems((prev) => {
      const copy = [...prev];
      if (editingIndex !== null) {
        copy[editingIndex] = newItem;
      } else {
        copy.push(newItem);
      }
      return copy;
    });

    setFormProductId("");
    setFormVariantParameter("");
    setFormAvailableStock(0);
    setFormQuantity(1);
    setFormUnit("kg");
    setFormPricePerUnit("");
    setDiscountType("percentage");
    setFormDiscountValue("");
    setTaxInputType("percentage");
    setFormTaxValue("");
    setFormTaxType("Without Tax");
    setFormHsnCode("");
    setEditingIndex(null);
  };

  const handleDeleteProductFromList = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
    if (editingIndex === idx) {
      setFormProductId("");
      setFormVariantParameter("");
      setFormAvailableStock(0);
      setFormQuantity(1);
      setFormUnit("kg");
      setFormPricePerUnit("");
      setDiscountType("percentage");
      setFormDiscountValue("");
      setTaxInputType("percentage");
      setFormTaxValue("");
      setFormTaxType("Without Tax");
      setFormHsnCode("");
      setEditingIndex(null);
    } else if (editingIndex !== null && editingIndex > idx) {
      setEditingIndex(editingIndex - 1);
    }
  };

  const formatPackSize = (parameter, unit) => {
    const u = String(unit || "").toLowerCase().trim();
    const p = String(parameter || "").trim();
    if (u === "kg" || u === "bag" || u === "bags" || u === "gm" || u === "g") {
      return `${p} ${unit} Bag`;
    }
    if (u === "ml" || u === "l" || u === "litres" || u === "litre") {
      return `${p} ${unit} Bottle`;
    }
    return `${p} ${unit}`;
  };

  const estimatedTotal = useMemo(() => {
    const qty = parseFloat(formQuantity) || 0;
    const price = parseFloat(formPricePerUnit) || 0;
    const base = qty * price;

    let discountAmount = 0;
    const rawDisc = parseFloat(formDiscountValue) || 0;
    if (discountType === "percentage") {
      discountAmount = base * (rawDisc / 100);
    } else {
      discountAmount = rawDisc;
    }
    const afterDiscount = Math.max(0, base - discountAmount);

    let taxAmount = 0;
    let amount = 0;
    const rawTax = parseFloat(formTaxValue) || 0;
    if (taxInputType === "percentage") {
      if (formTaxType === "With Tax") {
        amount = afterDiscount;
      } else {
        taxAmount = afterDiscount * (rawTax / 100);
        amount = afterDiscount + taxAmount;
      }
    } else {
      taxAmount = rawTax;
      if (formTaxType === "With Tax") {
        amount = afterDiscount;
      } else {
        amount = afterDiscount + taxAmount;
      }
    }
    return amount;
  }, [formQuantity, formPricePerUnit, formDiscountValue, discountType, formTaxValue, taxInputType, formTaxType]);

  const totalQty = useMemo(() => {
    return items.reduce((sum, line) => sum + (line.quantity === "" ? 0 : parseFloat(line.quantity) || 0), 0);
  }, [items]);

  const totalDiscount = useMemo(() => {
    return parseFloat(items.reduce((sum, line) => sum + (parseFloat(line.discountAmount) || 0), 0).toFixed(2));
  }, [items]);

  const totalTax = useMemo(() => {
    return parseFloat(items.reduce((sum, line) => sum + (parseFloat(line.taxAmount) || 0), 0).toFixed(2));
  }, [items]);

  const subTotal = useMemo(() => {
    return parseFloat(
      items.reduce((sum, item) => {
        const q = item.quantity === "" ? 0 : parseFloat(item.quantity) || 0;
        const p = item.pricePerUnit === "" ? 0 : parseFloat(item.pricePerUnit) || 0;
        return sum + q * p;
      }, 0).toFixed(2)
    );
  }, [items]);

  const grandTotal = useMemo(() => {
    return parseFloat(items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toFixed(2));
  }, [items]);

  useEffect(() => {
    if (billingType === "Cash") {
      setPaidAmount(grandTotal);
    }
  }, [billingType, grandTotal]);

  const unpaidAmount = useMemo(() => {
    if (billingType === "Cash") return 0;
    return Math.max(0, parseFloat((grandTotal - (parseFloat(paidAmount) || 0)).toFixed(2)));
  }, [billingType, grandTotal, paidAmount]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setFilePreview(null);
  };

  const handleNextStep = () => {
    setErrors({});
    if (activeStep === 1) {
      const newErrors = {};
      if (!selectedParty) {
        newErrors.selectedParty = "Supplier/Vendor field is required.";
      }
      if (billingType === "Credit" && !dueDate) {
        newErrors.dueDate = "Due Date is required for Credit transactions.";
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setTimeout(() => {
          if (newErrors.selectedParty) {
            partySelectRef.current?.focus();
            partySelectRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          } else if (newErrors.dueDate) {
            dueDateInputRef.current?.focus();
            dueDateInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
        return;
      }
      setActiveStep(2);
    } else if (activeStep === 2) {
      const validLines = items.filter((it) => it.productId && (parseFloat(it.quantity) || 0) > 0);
      if (validLines.length === 0) {
        setErrors({ items: "Please add at least one valid product line item with quantity > 0." });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setErrors({});

    const newErrors = {};
    if (!selectedParty) {
      newErrors.selectedParty = "Supplier/Vendor field is required.";
    }
    if (billingType === "Credit" && !dueDate) {
      newErrors.dueDate = "Due Date is required for Credit transactions.";
    }
    if (billingType === "Credit") {
      const pAmt = parseFloat(paidAmount) || 0;
      if (pAmt < 0) {
        newErrors.paidAmount = "Paid amount cannot be negative.";
      }
      if (pAmt > grandTotal) {
        newErrors.paidAmount = `Paid amount (₹${pAmt}) cannot exceed the grand total (₹${grandTotal}).`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setActiveStep(1);
      setTimeout(() => {
        if (newErrors.selectedParty) {
          partySelectRef.current?.focus();
          partySelectRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (newErrors.dueDate) {
          dueDateInputRef.current?.focus();
          dueDateInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (newErrors.paidAmount) {
          paidAmountInputRef.current?.focus();
          paidAmountInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
      return;
    }

    const validLines = items.filter((it) => it.productId && (parseFloat(it.quantity) || 0) > 0);
    if (validLines.length === 0) {
      setErrors({ items: "Please add at least one valid product line item with quantity > 0." });
      setActiveStep(2);
      return;
    }

    for (let i = 0; i < validLines.length; i++) {
      const it = validLines[i];
      if (parseFloat(it.quantity) <= 0) {
        setErrors({ items: `Quantity in Row #${i + 1} must be greater than zero.` });
        setActiveStep(2);
        return;
      }
      if (parseFloat(it.pricePerUnit) < 0) {
        setErrors({ items: `Price in Row #${i + 1} cannot be negative.` });
        setActiveStep(2);
        return;
      }
    }

    setLoading(true);
    const loadingToast = toast.loading(editRecord ? "Updating purchase..." : "Recording purchase...");

    try {
      // Execute product variant updates concurrently for fast submission
      const payloadItems = await Promise.all(
        validLines.map(async (it, i) => {
          const prod = products.find((p) => p._id === it.productId);
          if (!prod) {
            throw new Error(`Product not found for line #${i + 1}`);
          }

          const existingVariant = prod.products?.find(
            (v) =>
              String(v.parameter).trim().toLowerCase() === String(it.variantParameter).trim().toLowerCase() &&
              String(v.unit).trim().toLowerCase() === String(it.unit).trim().toLowerCase()
          );

          let variantId = "";
          const isNew = !existingVariant;
          const isChanged =
            existingVariant &&
            (existingVariant.quantity !== (parseFloat(it.availableStock) || 0) ||
              existingVariant.purchasePrice !== (parseFloat(it.pricePerUnit) || 0) ||
              existingVariant.purchasePriceTaxType !== it.taxType);

          if (isNew || isChanged) {
            let updatedVariants = [];
            if (isNew) {
              const newVar = {
                parameter: it.variantParameter,
                unit: it.unit,
                quantity: parseFloat(it.availableStock) || 0,
                purchasePrice: parseFloat(it.pricePerUnit) || 0,
                purchasePriceTaxType: it.taxType || "Without Tax",
                mrp: 0,
                salePrice: 0,
                salePriceTaxType: "Without Tax",
                wholesalePrice: 0,
                wholesalePriceTaxType: "Without Tax",
                purchaseDate: new Date().toISOString().split("T")[0],
              };
              updatedVariants = [...(prod.products || []), newVar];
            } else {
              updatedVariants = prod.products.map((v) => {
                if (v._id === existingVariant._id) {
                  return {
                    ...v,
                    quantity: parseFloat(it.availableStock) || 0,
                    purchasePrice: parseFloat(it.pricePerUnit) || 0,
                    purchasePriceTaxType: it.taxType || "Without Tax",
                  };
                }
                return v;
              });
            }

            const updatePayload = {
              productName: prod.productName,
              brand: prod.brand || "",
              productCategory: prod.productCategory,
              description: prod.description || "",
              itemType: prod.itemType || "PRODUCT",
              hsnCode: prod.hsnCode || "",
              taxRate: prod.taxRate !== undefined ? String(prod.taxRate) : "",
              products: updatedVariants,
            };

            const updatedProd = await dispatch(updateProduct({ id: prod._id, data: updatePayload })).unwrap();

            const matchedVar = updatedProd?.products?.find(
              (v) =>
                String(v.parameter).trim().toLowerCase() === String(it.variantParameter).trim().toLowerCase() &&
                String(v.unit).trim().toLowerCase() === String(it.unit).trim().toLowerCase()
            );
            variantId = matchedVar?._id || updatedProd?.products?.[updatedProd?.products?.length - 1]?._id;
          } else {
            variantId = existingVariant._id;
          }

          const stockRecord = (stockSummary || []).find(
            (s) =>
              s.item?.sourceRef === prod._id &&
              String(s.item?.parameter).trim().toLowerCase() === String(it.variantParameter).trim().toLowerCase() &&
              String(s.item?.unit).trim().toLowerCase() === String(it.unit).trim().toLowerCase()
          );
          const inventoryItemId = stockRecord?.item?._id || variantId;

          return {
            item: inventoryItemId,
            itemName: prod.productName,
            quantity: parseInt(it.quantity),
            unit: it.unit,
            pricePerUnit: parseFloat(it.pricePerUnit),
            taxType: it.taxType,
            discountPercent: parseFloat(it.discountPercent) || 0,
            discountAmount: parseFloat(it.discountAmount) || 0,
            taxPercent: parseFloat(it.taxPercent) || 0,
            taxAmount: parseFloat(it.taxAmount) || 0,
            amount: parseFloat(it.amount),
          };
        })
      );

      const paidVal = billingType === "Cash" ? grandTotal : parseFloat(paidAmount) || 0;
      const unpaidVal = billingType === "Cash" ? 0 : Math.max(0, parseFloat((grandTotal - paidVal).toFixed(2)));
      const pType = paidVal > 0 ? paymentType : "Cash";

      let savedPurchase = null;

      if (!uploadedFile) {
        const jsonPayload = {
          purchaseType,
          billNumber: billNumber.trim() || undefined,
          billingType,
          paymentType: pType,
          paidAmount: Number(paidVal),
          unpaidAmount: Number(unpaidVal),
          party: selectedParty,
          billDate,
          stateOfSupply,
          subTotal: Number(subTotal),
          totalAmount: Number(grandTotal),
          items: payloadItems,
        };
        if (referenceNo) jsonPayload.referenceNo = referenceNo;
        if (dueDate && billingType === "Credit") jsonPayload.dueDate = dueDate;
        if (remarks) jsonPayload.remarks = remarks;

        if (editRecord) {
          const res = await dispatch(updatePurchase({ id: editRecord._id, payload: jsonPayload })).unwrap();
          savedPurchase = res?.data || res;
          toast.success("Purchase bill updated successfully!", { id: loadingToast });
        } else {
          const res = await dispatch(createPurchase(jsonPayload)).unwrap();
          savedPurchase = res?.data || res;
          toast.success("Purchase bill logged successfully!", { id: loadingToast });
        }
      } else {
        const data = new FormData();
        data.append("purchaseType", purchaseType);
        if (billNumber.trim()) data.append("billNumber", billNumber.trim());
        data.append("billingType", billingType);
        data.append("paymentType", pType);
        if (referenceNo) data.append("referenceNo", referenceNo);
        data.append("paidAmount", paidVal);
        data.append("unpaidAmount", unpaidVal);
        data.append("party", selectedParty);
        data.append("billDate", billDate);
        if (dueDate && billingType === "Credit") data.append("dueDate", dueDate);
        data.append("stateOfSupply", stateOfSupply);
        data.append("subTotal", subTotal);
        data.append("totalAmount", grandTotal);
        if (remarks) data.append("remarks", remarks);
        payloadItems.forEach((item, idx) => {
          data.append(`items[${idx}][item]`, item.item);
          data.append(`items[${idx}][itemName]`, item.itemName || "");
          data.append(`items[${idx}][quantity]`, String(item.quantity));
          data.append(`items[${idx}][unit]`, item.unit || "");
          data.append(`items[${idx}][pricePerUnit]`, String(item.pricePerUnit));
          data.append(`items[${idx}][taxType]`, item.taxType || "");
          data.append(`items[${idx}][discountPercent]`, String(item.discountPercent || 0));
          data.append(`items[${idx}][discountAmount]`, String(item.discountAmount || 0));
          data.append(`items[${idx}][taxPercent]`, String(item.taxPercent || 0));
          data.append(`items[${idx}][taxAmount]`, String(item.taxAmount || 0));
          data.append(`items[${idx}][amount]`, String(item.amount || 0));
        });
        data.append("image", uploadedFile);

        if (editRecord) {
          const res = await dispatch(updatePurchase({ id: editRecord._id, payload: data })).unwrap();
          savedPurchase = res?.data || res;
          toast.success("Purchase bill updated successfully!", { id: loadingToast });
        } else {
          const res = await dispatch(createPurchase(data)).unwrap();
          savedPurchase = res?.data || res;
          toast.success("Purchase bill logged successfully!", { id: loadingToast });
        }
      }

      // Complete modal flow immediately for instant user feedback
      onSuccess(savedPurchase);

      // Trigger background sync asynchronously without blocking UI
      dispatch(fetchProducts({ force: true })).catch(() => {});
      dispatch(fetchStockSummary({ force: true })).catch(() => {});
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Failed to save purchase details", { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-[#F8FAFC] flex flex-col overflow-hidden animate-in fade-in duration-200 select-none">
      <div className="bg-white w-full flex-1 flex flex-col overflow-hidden">
        {/* 1. Header Area */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-8 py-4 border-b border-slate-100 bg-white gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition cursor-pointer"
              title="Close Form"
            >
              <X size={20} />
            </button>
            <div className="bg-[#16A34A] p-2.5 rounded-xl text-white shadow-md">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="leading-tight text-slate-800 font-black text-lg">Purchase Entry</span>
                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                    editRecord ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {editRecord ? "Saved" : "Draft"}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-bold flex items-center gap-3 mt-1 uppercase tracking-wide">
                <span>
                  Supplier:{" "}
                  <b className="text-slate-700">
                    {parties.find((p) => p._id === selectedParty)?.name || "None selected"}
                  </b>
                </span>
                <span>•</span>
                <span>
                  Invoice: <b className="text-slate-700">{billNumber || "Draft (Auto-generated)"}</b>
                </span>
              </div>
            </div>
          </div>

          {/* Stepper Progress Indicator */}
          <div className="flex items-center gap-4 text-xs font-bold">
            <button
              type="button"
              onClick={() => activeStep > 1 && setActiveStep(1)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeStep === 1 ? "text-[#16A34A] bg-[#DCFCE7]" : "text-slate-400 hover:text-slate-655"
              }`}
            >
              <span>{activeStep > 1 ? "✓" : "①"} Invoice Details</span>
            </button>
            <span className="text-slate-200">|</span>
            <button
              type="button"
              onClick={() => {
                if (activeStep > 2) {
                  setActiveStep(2);
                } else if (activeStep === 1) {
                  handleNextStep();
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeStep === 2
                  ? "text-[#16A34A] bg-[#DCFCE7]"
                  : activeStep > 2
                  ? "text-[#16A34A]"
                  : "text-slate-400 hover:text-slate-655"
              }`}
            >
              <span>{activeStep > 2 ? "✓" : "②"} Products</span>
            </button>
            <span className="text-slate-200">|</span>
            <button
              type="button"
              onClick={() => {
                if (activeStep === 2) {
                  handleNextStep();
                } else if (activeStep === 1) {
                  const newErrors = {};
                  if (!selectedParty) {
                    newErrors.selectedParty = "Supplier/Vendor field is required.";
                  }
                  if (billingType === "Credit" && !dueDate) {
                    newErrors.dueDate = "Due Date is required for Credit transactions.";
                  }

                  if (Object.keys(newErrors).length > 0) {
                    setErrors(newErrors);
                    setTimeout(() => {
                      if (newErrors.selectedParty) {
                        partySelectRef.current?.focus();
                        partySelectRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                      } else if (newErrors.dueDate) {
                        dueDateInputRef.current?.focus();
                        dueDateInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }
                    }, 100);
                    return;
                  }

                  const validLines = items.filter((it) => it.productId && (parseFloat(it.quantity) || 0) > 0);
                  if (validLines.length > 0) {
                    setErrors({});
                    setActiveStep(3);
                  } else {
                    setErrors({ items: "Please add at least one valid product line item with quantity > 0." });
                    setActiveStep(2);
                  }
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeStep === 3 ? "text-[#16A34A] bg-[#DCFCE7]" : "text-slate-400 hover:text-slate-655"
              }`}
            >
              <span>③ Review</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition ml-2 cursor-pointer"
              title="Close Form"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 2. Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/50">
          {/* STEP 1: INVOICE DETAILS */}
          {activeStep === 1 && (
            <SupplierDetailsStep
              parties={parties}
              selectedParty={selectedParty}
              setSelectedParty={setSelectedParty}
              setAddVendorOpen={setAddVendorOpen}
              stateOfSupply={stateOfSupply}
              setStateOfSupply={setStateOfSupply}
              billNumber={billNumber}
              setBillNumber={setBillNumber}
              billDate={billDate}
              setBillDate={setBillDate}
              purchaseType={purchaseType}
              setPurchaseType={setPurchaseType}
              billingType={billingType}
              setBillingType={setBillingType}
              dueDate={dueDate}
              setDueDate={setDueDate}
              paidAmount={paidAmount}
              setPaidAmount={setPaidAmount}
              paymentType={paymentType}
              setPaymentType={setPaymentType}
              referenceNo={referenceNo}
              setReferenceNo={setReferenceNo}
              grandTotal={grandTotal}
              errors={errors}
              setErrors={setErrors}
              partySelectRef={partySelectRef}
              dueDateInputRef={dueDateInputRef}
              paidAmountInputRef={paidAmountInputRef}
            />
          )}

          {/* STEP 2: ADD PRODUCTS */}
          {activeStep === 2 && (
            <ItemsEntryStep
              products={products}
              formProductId={formProductId}
              setFormProductId={setFormProductId}
              formVariantParameter={formVariantParameter}
              setFormVariantParameter={setFormVariantParameter}
              formAvailableStock={formAvailableStock}
              setFormAvailableStock={setFormAvailableStock}
              formQuantity={formQuantity}
              setFormQuantity={setFormQuantity}
              formUnit={formUnit}
              setFormUnit={setFormUnit}
              formPricePerUnit={formPricePerUnit}
              setFormPricePerUnit={setFormPricePerUnit}
              discountType={discountType}
              setDiscountType={setDiscountType}
              formDiscountValue={formDiscountValue}
              setFormDiscountValue={setFormDiscountValue}
              taxInputType={taxInputType}
              setTaxInputType={setTaxInputType}
              formTaxValue={formTaxValue}
              setFormTaxValue={setFormTaxValue}
              formTaxType={formTaxType}
              setFormTaxType={setFormTaxType}
              formHsnCode={formHsnCode}
              setFormHsnCode={setFormHsnCode}
              editingIndex={editingIndex}
              setEditingIndex={setEditingIndex}
              productDropdownOpen={productDropdownOpen}
              setProductDropdownOpen={setProductDropdownOpen}
              productSearchQuery={productSearchQuery}
              setProductSearchQuery={setProductSearchQuery}
              productDropdownRef={productDropdownRef}
              searchInputRef={searchInputRef}
              quantityInputRef={quantityInputRef}
              priceInputRef={priceInputRef}
              activeItemRef={activeItemRef}
              errors={errors}
              setErrors={setErrors}
              debouncedSearchQuery={debouncedSearchQuery}
              searchResults={searchResults}
              visibleCount={visibleCount}
              setVisibleCount={setVisibleCount}
              activeIndex={activeIndex}
              setActiveIndex={setActiveIndex}
              recentProducts={recentProducts}
              addToRecentProducts={addToRecentProducts}
              items={items}
              setItems={setItems}
              editingRowIndex={editingRowIndex}
              setEditingRowIndex={setEditingRowIndex}
              inlineRowData={inlineRowData}
              setInlineRowData={setInlineRowData}
              selectedRowIndex={selectedRowIndex}
              setSelectedRowIndex={setSelectedRowIndex}
              expandedRows={expandedRows}
              setExpandedRows={setExpandedRows}
              formatPackSize={formatPackSize}
              getLiveVariantStock={getLiveVariantStock}
              getLiveProductStock={getLiveProductStock}
              estimatedTotal={estimatedTotal}
              totalQty={totalQty}
              totalDiscount={totalDiscount}
              totalTax={totalTax}
              subTotal={subTotal}
              grandTotal={grandTotal}
              handleAddProductToList={handleAddProductToList}
              handleProductChange={handleProductChange}
              handleProductVariantSelect={handleProductVariantSelect}
              handleDeleteProductFromList={handleDeleteProductFromList}
              handleSaveInlineRow={handleSaveInlineRow}
              handleInlineChange={handleInlineChange}
              setAddProductOpen={setAddProductOpen}
              loading={loading}
            />
          )}

          {/* STEP 3: REVIEW & SUBMIT */}
          {activeStep === 3 && (
            <SummaryPaymentStep
              parties={parties}
              products={products}
              selectedParty={selectedParty}
              billingType={billingType}
              billNumber={billNumber}
              billDate={billDate}
              stateOfSupply={stateOfSupply}
              purchaseType={purchaseType}
              dueDate={dueDate}
              formatDate={formatDate}
              items={items}
              formatPackSize={formatPackSize}
              remarks={remarks}
              setRemarks={setRemarks}
              filePreview={filePreview}
              uploadedFile={uploadedFile}
              handleFileChange={handleFileChange}
              handleRemoveFile={handleRemoveFile}
              subTotal={subTotal}
              totalDiscount={totalDiscount}
              totalTax={totalTax}
              grandTotal={grandTotal}
              paidAmount={paidAmount}
              unpaidAmount={unpaidAmount}
            />
          )}
        </div>

        {/* 3. Sticky Bottom Action Footer */}
        <div className="bg-white border-t border-slate-200 px-8 py-4 flex items-center justify-between shadow-md select-none shrink-0 z-50 sticky bottom-0">
          <div>
            <button
              type="button"
              disabled={activeStep === 1}
              onClick={handlePrevStep}
              className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 active:scale-95 bg-white disabled:opacity-0 disabled:pointer-events-none hover:bg-slate-50 cursor-pointer"
            >
              ← Previous
            </button>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 border border-slate-200 hover:border-slate-350 bg-white text-slate-700 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 active:scale-95 shadow-3xs cursor-pointer"
            >
              Cancel
            </button>
            {activeStep === 3 ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2.5 bg-[#16A34A] hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Submit Purchase
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-2.5 bg-[#16A34A] hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                Next Step →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* QUICK ADD VENDOR MODAL */}
      {addVendorOpen && (
        <QuickAddVendorModal
          onClose={() => setAddVendorOpen(false)}
          onSuccess={async (newVendorId) => {
            try {
              await dispatch(fetchParties({ partyType: "SUPPLIER", force: true })).unwrap();
            } catch (e) {
              if (!String(e?.message || e).includes("condition callback")) throw e;
            }
            setAddVendorOpen(false);
            setSelectedParty(newVendorId);
          }}
        />
      )}

      {/* QUICK ADD PRODUCT MODAL */}
      {addProductOpen && (
        <QuickAddProductModal
          defaultName={productSearchQuery}
          onClose={() => {
            setAddProductOpen(false);
          }}
          onSuccess={async (newProductId) => {
            try {
              await dispatch(fetchProducts({ force: true })).unwrap();
            } catch (e) {
              if (!String(e?.message || e).includes("condition callback")) throw e;
            }
            setAddProductOpen(false);
            handleProductChange(newProductId);
          }}
        />
      )}
    </div>
  );
}

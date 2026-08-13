import React, { Fragment } from "react";
import {
  ShoppingBag,
  Search,
  ChevronDown,
  Plus,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";

export default function ItemsEntryStep({
  products = [],
  formProductId,
  setFormProductId,
  formVariantParameter,
  setFormVariantParameter,
  formAvailableStock,
  setFormAvailableStock,
  formQuantity,
  setFormQuantity,
  formUnit,
  setFormUnit,
  formPricePerUnit,
  setFormPricePerUnit,
  discountType,
  setDiscountType,
  formDiscountValue,
  setFormDiscountValue,
  taxInputType,
  setTaxInputType,
  formTaxValue,
  setFormTaxValue,
  formTaxType,
  setFormTaxType,
  formHsnCode,
  setFormHsnCode,
  editingIndex,
  productDropdownOpen,
  setProductDropdownOpen,
  productSearchQuery,
  setProductSearchQuery,
  productDropdownRef,
  searchInputRef,
  quantityInputRef,
  priceInputRef,
  activeItemRef,
  errors = {},
  setErrors,
  searchResults = [],
  visibleCount,
  setVisibleCount,
  activeIndex,
  setActiveIndex,
  items = [],
  editingRowIndex,
  setEditingRowIndex,
  inlineRowData,
  setInlineRowData,
  selectedRowIndex,
  setSelectedRowIndex,
  expandedRows = new Set(),
  setExpandedRows,
  formatPackSize,
  getLiveVariantStock,
  estimatedTotal,
  totalQty,
  totalTax,
  subTotal,
  grandTotal,
  handleAddProductToList,
  handleProductChange,
  handleProductVariantSelect,
  handleDeleteProductFromList,
  handleSaveInlineRow,
  handleInlineChange,
  setAddProductOpen,
  loading,
  isReadOnly = false,
}) {
  const toggleRow = (idx) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Two-Column Desktop Product Entry Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Form fields card - takes 2/3 width on large screen */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 lg:col-span-2">
          <div className="text-[11px] font-extrabold text-[#16A34A] uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4" />
            Product Details
          </div>

          <div className="space-y-3">
            {/* Search Select dropdown */}
            <div ref={productDropdownRef} className="w-full relative">
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                PRODUCT *
              </label>
              <div className="flex gap-2 items-center">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    ref={searchInputRef}
                    value={productSearchQuery}
                    onFocus={() => setProductDropdownOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setProductDropdownOpen(true);
                        setActiveIndex((prev) => {
                          const max = Math.min(searchResults.length, visibleCount) - 1;
                          const next = prev + 1;
                          if (next > max) {
                            if (visibleCount < searchResults.length) {
                              setVisibleCount((v) => Math.min(searchResults.length, v + 30));
                            }
                            return Math.min(searchResults.length - 1, next);
                          }
                          return next;
                        });
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
                      } else if (e.key === "Enter") {
                        if (productDropdownOpen && searchResults.length > 0 && activeIndex >= 0) {
                          e.preventDefault();
                          const activeItem = searchResults[activeIndex];
                          if (activeItem) {
                            const { product, variant } = activeItem;
                            if (variant) {
                              handleProductVariantSelect(product, variant);
                            } else {
                              handleProductChange(product._id);
                            }
                            setProductDropdownOpen(false);
                          }
                        }
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        setProductDropdownOpen(false);
                      }
                    }}
                    onChange={(e) => {
                      setProductSearchQuery(e.target.value);
                      setProductDropdownOpen(true);
                      if (e.target.value) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.formProductId;
                          return next;
                        });
                      }
                    }}
                    placeholder="Search item by name / code"
                    aria-invalid={errors.formProductId ? "true" : "false"}
                    aria-describedby={errors.formProductId ? "product-search-error" : undefined}
                    className={`pl-10 pr-10 w-full border rounded-xl text-xs h-[46px] transition-all font-semibold ${
                      errors.formProductId
                        ? "border-[#EF4444] bg-[#FEF2F2] focus:ring-red-500/10 focus:border-[#EF4444] text-slate-855"
                        : productDropdownOpen
                        ? "border-emerald-500 bg-white ring-4 ring-emerald-500/10 text-slate-855"
                        : "border-slate-200 hover:border-slate-355 bg-white text-slate-700"
                    }`}
                  />
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <ChevronDown
                    onClick={(e) => {
                      e.stopPropagation();
                      setProductDropdownOpen(!productDropdownOpen);
                    }}
                    className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 cursor-pointer transition-transform duration-200 text-slate-400 ${
                      productDropdownOpen ? "rotate-180 text-emerald-600" : ""
                    }`}
                  />

                  {productDropdownOpen && (
                    <div className="absolute left-0 right-0 z-[100] mt-1 bg-white border border-slate-200 rounded-[8px] shadow-sm overflow-hidden flex flex-col max-h-[350px]">
                      {/* List container */}
                      <div
                        onScroll={(e) => {
                          const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                          if (scrollHeight - scrollTop <= clientHeight + 50) {
                            if (visibleCount < searchResults.length) {
                              setVisibleCount((v) => Math.min(searchResults.length, v + 30));
                            }
                          }
                        }}
                        className="overflow-y-auto divide-y divide-slate-100 flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                      >
                        {searchResults.length === 0 ? (
                          <div className="p-8 text-center text-slate-400">
                            <ShoppingBag className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                            <p className="font-bold text-xs">No products matched</p>
                            <button
                              type="button"
                              onClick={() => {
                                setAddProductOpen(true);
                                setProductDropdownOpen(false);
                              }}
                              className="mt-2 text-emerald-600 hover:text-emerald-700 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1 mx-auto transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                              + New Product
                            </button>
                          </div>
                        ) : (
                          searchResults.slice(0, visibleCount).map((item, index) => {
                            const { product, variant } = item;
                            const isSelected = index === activeIndex;

                            const pName = product.productName || "Product";
                            const pBrand = product.brand || "Generic";
                            const categoryLabel = product.productCategory
                              ? String(product.productCategory).toUpperCase()
                              : "GENERAL";
                            const packLabel = variant ? formatPackSize(variant.parameter, variant.unit) : "Standard Pack";
                            const hsnCode = product.hsnCode || "—";
                            const skuCode = variant?.sku || variant?.itemCode || product.sku || product.itemCode || "—";
                            const liveStock = variant ? getLiveVariantStock(product, variant) : (product.products?.reduce((s, v) => s + getLiveVariantStock(product, v), 0) || 0);

                            const stockVal = Number(liveStock || 0);
                            let stockColor = "text-emerald-600";
                            if (stockVal <= 0) {
                              stockColor = "text-rose-600 font-bold";
                            } else if (stockVal < 50) {
                              stockColor = "text-amber-600";
                            }

                            const priceVal = variant
                              ? variant.purchasePrice || variant.pricePerUnit || 0
                              : product.purchasePrice || product.pricePerUnit || 0;

                            return (
                              <div
                                key={`${product._id}-${variant?._id || "main"}-${index}`}
                                ref={isSelected ? activeItemRef : null}
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => {
                                  if (variant) {
                                    handleProductVariantSelect(product, variant);
                                  } else {
                                    handleProductChange(product._id);
                                  }
                                  setProductDropdownOpen(false);
                                }}
                                className={`px-4 py-3 cursor-pointer transition flex flex-col gap-1.5 ${
                                  isSelected ? "bg-emerald-50/40" : "bg-white hover:bg-slate-50/50"
                                }`}
                              >
                                <div className="flex justify-between items-start gap-4">
                                  <div className="font-bold text-slate-800 leading-tight text-xs">
                                    {pName} <span className="text-[10px] text-slate-400 font-semibold">({pBrand})</span>
                                  </div>
                                  {Number(priceVal) > 0 && (
                                    <span className="text-[12px] font-semibold text-slate-800 shrink-0">
                                      ₹{Number(priceVal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </span>
                                  )}
                                </div>

                                <div className="text-[10px] text-slate-505 font-medium leading-none">
                                  {categoryLabel} • {packLabel} • HSN: {hsnCode}
                                </div>

                                <div className="flex justify-between text-[10px] font-medium leading-none mt-0.5">
                                  <span className={stockColor}>Stock: {liveStock}</span>
                                  <span className="text-slate-500">SKU: {skuCode}</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                      <div className="bg-slate-50 border-t border-slate-100 px-4 py-2 flex items-center justify-center text-[10px] text-slate-400 font-bold select-none shrink-0">
                        <span>↑↓ Navigate | Enter Select | Ctrl+N New Product | Esc Close</span>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAddProductOpen(true);
                    setProductDropdownOpen(false);
                  }}
                  className="px-4 border border-emerald-600 text-emerald-600 hover:bg-emerald-50 rounded-xl h-[46px] font-bold text-xs flex items-center justify-center gap-1.5 transition-all shrink-0 active:scale-95 bg-white cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  New Product
                </button>
              </div>
              {errors.formProductId && (
                <p id="product-search-error" className="text-xs text-[#DC2626] font-medium mt-1 select-none animate-in fade-in duration-200">
                  ⚠ {errors.formProductId}
                </p>
              )}
            </div>

            {formProductId && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-3.5 border-t border-slate-100 animate-in fade-in duration-200">
                {/* Pack Selection */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Available Packs *
                  </label>
                  <div className={`grid grid-cols-2 gap-2 p-1 rounded-xl transition ${errors.formVariantParameter ? "border border-[#EF4444] bg-[#FEF2F2]" : ""}`}>
                    {(() => {
                      const selectedProduct = products.find((p) => p._id === formProductId);
                      return selectedProduct?.products?.map((v) => {
                        const packLabel = formatPackSize(v.parameter, v.unit);
                        const isSelected = formVariantParameter === v.parameter && formUnit === v.unit;
                        const liveStock = getLiveVariantStock(selectedProduct, v);
                        const priceVal = v.purchasePrice || v.pricePerUnit || 0;

                        const stockVal = Number(liveStock || 0);
                        let stockColorClass = "text-emerald-600";
                        if (stockVal <= 0) {
                          stockColorClass = "text-rose-600";
                        } else if (stockVal < 50) {
                          stockColorClass = "text-amber-600";
                        }

                        return (
                          <button
                            key={v._id || `${v.parameter}-${v.unit}`}
                            type="button"
                            onClick={() => {
                              setFormVariantParameter(v.parameter || "");
                              setFormUnit(v.unit || "pcs");
                              setFormAvailableStock(liveStock);
                              setFormPricePerUnit(priceVal);
                              setFormTaxType(v.purchasePriceTaxType || "Without Tax");
                              setFormHsnCode(selectedProduct?.hsnCode || "");
                              setErrors((prev) => {
                                const next = { ...prev };
                                delete next.formVariantParameter;
                                return next;
                              });
                            }}
                            className={`p-2.5 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between gap-1 shadow-3xs min-h-[82px] cursor-pointer ${
                              isSelected
                                ? "border-[#16A34A] bg-[#DCFCE7] text-emerald-900 ring-2 ring-emerald-500/10"
                                : "border-slate-200 hover:border-slate-350 bg-white text-slate-700"
                            }`}
                          >
                            <span className="font-black text-xs leading-tight">{packLabel}</span>
                            <span className="font-extrabold text-slate-800 text-[11px]">
                              ₹{Number(priceVal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                            <span className={`text-[10px] font-semibold ${stockColorClass}`}>
                              Stock: {liveStock}
                            </span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                  {errors.formVariantParameter && (
                    <p className="text-xs text-[#DC2626] font-medium mt-1 select-none animate-in fade-in duration-200">
                      ⚠ {errors.formVariantParameter}
                    </p>
                  )}
                </div>

                {/* Quantity Purchased */}
                <div className="space-y-1.5 flex flex-col justify-end">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Quantity Purchased
                  </label>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => {
                        setFormQuantity((q) => {
                          const nextVal = Math.max(1, (parseFloat(q) || 1) - 1);
                          if (nextVal > 0) {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.formQuantity;
                              return next;
                            });
                          }
                          return nextVal;
                        });
                      }}
                      className="w-12 h-[48px] bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-655 rounded-l-xl flex items-center justify-center font-bold text-xl transition active:scale-95 select-none cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      ref={quantityInputRef}
                      value={formQuantity}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                          setFormQuantity("");
                        } else {
                          const parsed = parseFloat(val);
                          setFormQuantity(isNaN(parsed) ? "" : parsed);
                          if (parsed > 0) {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.formQuantity;
                              return next;
                            });
                          }
                        }
                      }}
                      onBlur={() => {
                        const qtyVal = parseFloat(formQuantity);
                        if (isNaN(qtyVal) || qtyVal <= 0) {
                          setFormQuantity(1);
                        }
                      }}
                      onWheel={(e) => e.target.blur()}
                      aria-invalid={errors.formQuantity ? "true" : "false"}
                      aria-describedby={errors.formQuantity ? "quantity-error" : undefined}
                      className={`w-20 h-[48px] border-y text-center text-sm focus:outline-none focus:ring-0 font-bold ${
                        errors.formQuantity
                          ? "border-red-500 bg-red-50 text-red-800"
                          : "border-slate-200 text-slate-855"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormQuantity((q) => {
                          const nextVal = (parseFloat(q) || 0) + 1;
                          if (nextVal > 0) {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.formQuantity;
                              return next;
                            });
                          }
                          return nextVal;
                        });
                      }}
                      className="w-12 h-[48px] bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-655 rounded-r-xl flex items-center justify-center font-bold text-xl transition active:scale-95 select-none cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  {errors.formQuantity && (
                    <p id="quantity-error" className="text-xs text-[#DC2626] font-medium mt-1 select-none animate-in fade-in duration-200">
                      ⚠ {errors.formQuantity}
                    </p>
                  )}
                </div>

                {/* Purchase Price */}
                <div className="flex flex-col">
                  <div className="flex justify-between items-center mb-1.5 font-semibold text-slate-500">
                    <label className="block text-[11px] font-bold uppercase tracking-wider">Purchase Price *</label>
                    <div className="flex bg-[#F1F5F9] rounded-full p-[3px] select-none w-10 h-8 items-center justify-center">
                      <span className="w-8 h-[26px] rounded-full flex items-center justify-center bg-white text-[#16A34A] text-[12px] font-bold shadow-xs">
                        ₹
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₹</span>
                    <input
                      type="number"
                      ref={priceInputRef}
                      value={formPricePerUnit}
                      onChange={(e) => {
                        const val = e.target.value === "" ? "" : parseFloat(e.target.value);
                        setFormPricePerUnit(val);
                        if (val === "" || val >= 0) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.formPricePerUnit;
                            return next;
                          });
                        }
                      }}
                      placeholder="0.00"
                      aria-invalid={errors.formPricePerUnit ? "true" : "false"}
                      aria-describedby={errors.formPricePerUnit ? "price-error" : undefined}
                      className={`w-full border rounded-xl pl-7 pr-3 text-xs focus:outline-none focus:ring-4 h-[38px] transition-all font-semibold text-right ${
                        errors.formPricePerUnit
                          ? "border-[#EF4444] bg-[#FEF2F2] focus:ring-red-500/10 focus:border-[#EF4444] text-slate-800"
                          : "border-slate-200 hover:border-slate-355 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white text-slate-800"
                      }`}
                    />
                  </div>
                  {errors.formPricePerUnit && (
                    <p id="price-error" className="text-xs text-[#DC2626] font-medium mt-1 select-none animate-in fade-in duration-200">
                      ⚠ {errors.formPricePerUnit}
                    </p>
                  )}
                </div>

                {/* GST */}
                <div className="flex flex-col">
                  <div className="flex justify-between items-center mb-1.5 font-semibold text-slate-500">
                    <label className="block text-[11px] font-bold uppercase tracking-wider">GST</label>
                    <div className="flex bg-[#F1F5F9] rounded-full p-[3px] select-none w-[72px] h-8 items-center">
                      <button
                        type="button"
                        onClick={() => setTaxInputType("amount")}
                        className={`flex-1 text-[11px] font-extrabold h-[26px] rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer ${
                          taxInputType === "amount"
                            ? "bg-white text-[#16A34A] shadow-xs"
                            : "text-slate-450 hover:text-slate-655"
                        }`}
                      >
                        ₹
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaxInputType("percentage")}
                        className={`flex-1 text-[11px] font-extrabold h-[26px] rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer ${
                          taxInputType === "percentage"
                            ? "bg-white text-[#16A34A] shadow-xs"
                            : "text-slate-450 hover:text-slate-655"
                        }`}
                      >
                        %
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={formTaxValue}
                      onChange={(e) => setFormTaxValue(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full border border-slate-200 hover:border-slate-355 rounded-xl pl-3 pr-7 text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 h-[38px] transition-all font-semibold text-slate-805 text-left"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">
                      {taxInputType === "percentage" ? "%" : "₹"}
                    </span>
                  </div>
                </div>

                {/* Discount */}
                <div className="flex flex-col">
                  <div className="flex justify-between items-center mb-1.5 font-semibold text-slate-500">
                    <label className="block text-[11px] font-bold uppercase tracking-wider">Discount</label>
                    <div className="flex bg-[#F1F5F9] rounded-full p-[3px] select-none w-[72px] h-8 items-center">
                      <button
                        type="button"
                        onClick={() => setDiscountType("amount")}
                        className={`flex-1 text-[11px] font-extrabold h-[26px] rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer ${
                          discountType === "amount"
                            ? "bg-white text-[#16A34A] shadow-xs"
                            : "text-slate-450 hover:text-slate-655"
                        }`}
                      >
                        ₹
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType("percentage")}
                        className={`flex-1 text-[11px] font-extrabold h-[26px] rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer ${
                          discountType === "percentage"
                            ? "bg-white text-[#16A34A] shadow-xs"
                            : "text-slate-450 hover:text-slate-655"
                        }`}
                      >
                        %
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={formDiscountValue}
                      onChange={(e) => setFormDiscountValue(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full border border-slate-200 hover:border-slate-355 rounded-xl pl-3 pr-7 text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 h-[38px] transition-all font-semibold text-slate-805 text-left"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">
                      {discountType === "percentage" ? "%" : "₹"}
                    </span>
                  </div>
                </div>

                {/* GST Type */}
                <div className="flex flex-col">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">GST Calculation</label>
                  <div className="flex bg-[#F1F5F9] rounded-full p-[3px] select-none h-8 items-center w-full">
                    <button
                      type="button"
                      onClick={() => setFormTaxType("With Tax")}
                      className={`flex-1 text-[11px] font-extrabold h-[26px] rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer ${
                        formTaxType === "With Tax"
                          ? "bg-white text-[#16A34A] shadow-xs"
                          : "text-slate-450 hover:text-slate-655"
                      }`}
                    >
                      GST Included
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormTaxType("Without Tax")}
                      className={`flex-1 text-[11px] font-extrabold h-[26px] rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer ${
                        formTaxType === "Without Tax"
                          ? "bg-white text-[#16A34A] shadow-xs"
                          : "text-slate-450 hover:text-slate-655"
                      }`}
                    >
                      GST Extra
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-450 mt-1.5 leading-normal">
                    {formTaxType === "With Tax"
                      ? "GST Included: The entered purchase price already includes GST."
                      : "GST Extra: GST will be calculated and added to the entered purchase price."}
                  </p>
                </div>

                {/* HSN Code */}
                <div className="flex flex-col max-w-[150px]">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">HSN Code</label>
                  <input
                    type="text"
                    value={formHsnCode}
                    onChange={(e) => setFormHsnCode(e.target.value)}
                    placeholder="e.g. 3102"
                    className="w-full border border-slate-200 hover:border-slate-355 rounded-xl px-3 text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 h-[38px] transition-all font-semibold text-slate-805"
                  />
                </div>

                <div></div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Purchase Preview card */}
        {formVariantParameter ? (
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-150 shrink-0 sticky top-4 min-h-[380px] max-w-sm w-full">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Purchase Preview</div>
            <div className="space-y-0.5">
              {(() => {
                const selectedProduct = products.find((p) => p._id === formProductId);
                return (
                  <>
                    <div className="font-semibold text-[16px] text-slate-800 leading-tight">
                      {selectedProduct?.productName}
                      {selectedProduct?.brand && <span className="text-xs text-slate-450 font-normal ml-1">[{selectedProduct.brand}]</span>}
                    </div>
                    <div className="text-[13px] text-slate-500 font-medium">
                      {selectedProduct?.productCategory
                        ? selectedProduct.productCategory.charAt(0).toUpperCase() + selectedProduct.productCategory.slice(1)
                        : ""}
                      {" • "}
                      {formatPackSize(formVariantParameter, formUnit)}
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="text-[13px] text-slate-500 font-medium space-y-2 border-t border-b border-slate-100 py-3">
              <div className="flex justify-between items-baseline">
                <span className="w-28 shrink-0">Pack Size</span>
                <span className="text-slate-800 font-semibold text-[14px] text-right">{formatPackSize(formVariantParameter, formUnit)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="w-28 shrink-0">Stock</span>
                <span className="text-slate-800 font-semibold text-[14px] text-right">{formAvailableStock}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="w-28 shrink-0">Purchase Price</span>
                <span className="text-slate-800 font-semibold text-[14px] text-right">
                  ₹{parseFloat(formPricePerUnit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="w-28 shrink-0">Quantity</span>
                <span className="text-slate-800 font-semibold text-[14px] text-right">{formQuantity}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="w-28 shrink-0">GST</span>
                <span className="text-slate-800 font-semibold text-[14px] text-right">
                  {formTaxValue ? `${formTaxValue}%` : "0%"} ({formTaxType})
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="w-28 shrink-0">Discount</span>
                <span className={`font-semibold text-[14px] text-right ${parseFloat(formDiscountValue || 0) > 0 ? "text-rose-600" : "text-slate-800"}`}>
                  {parseFloat(formDiscountValue || 0) > 0
                    ? discountType === "percentage"
                      ? `${formDiscountValue}%`
                      : `₹${formDiscountValue}`
                    : "0%"}
                </span>
              </div>
            </div>

            <div className="bg-[#F0FDF4] rounded-[10px] p-3.5 flex flex-col items-center justify-center">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest mb-1">Estimated Total</span>
              <span className="text-[30px] font-bold text-[#16A34A] leading-none">
                ₹{estimatedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="mt-auto pt-1">
              <button
                type="button"
                onClick={handleAddProductToList}
                disabled={!formProductId || !formVariantParameter || loading}
                className="w-full h-[44px] bg-[#16A34A] hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-450 text-white rounded-lg font-bold text-xs transition-colors duration-150 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                )}
                {editingIndex !== null ? "Update Item" : "Add Item"}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50/50 border border-slate-200 border-dashed rounded-xl p-6 text-center text-slate-400 text-xs py-14 sticky top-4 flex flex-col items-center justify-center gap-2 h-full min-h-[380px] max-w-sm w-full">
            <span className="font-bold text-slate-750">No Product Configured</span>
            <p className="max-w-[200px] text-[10px] text-slate-400 font-medium leading-relaxed">
              Search and select a product to see estimated purchase summary.
            </p>
          </div>
        )}
      </div>

      {/* Sticky Summary Bar & Items Added Checkout List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-xs space-y-4">
        {errors.items && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-semibold select-none animate-in fade-in duration-200">
            <span className="text-sm">⚠</span>
            <span>{errors.items}</span>
          </div>
        )}

        {/* Compact summary bar */}
        <div className="sticky top-0 z-15 bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-emerald-800 font-bold select-none shadow-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <span>
              Items: <span className="text-slate-800 font-extrabold">{items.length}</span>
            </span>
            <span className="h-3 w-px bg-emerald-200" />
            <span>
              Qty: <span className="text-slate-800 font-extrabold">{totalQty}</span>
            </span>
            <span className="h-3 w-px bg-emerald-200" />
            <span>
              Subtotal: <span className="text-slate-800 font-extrabold">₹{subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </span>
            <span className="h-3 w-px bg-emerald-200" />
            <span>
              GST: <span className="text-slate-800 font-extrabold">₹{totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </span>
          </div>
          <div className="text-sm font-black text-[#16A34A] bg-[#DCFCE7] px-3 py-1 rounded-md shrink-0">
            Total: ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center justify-between">
          <span>Items Added</span>
          <span className="text-[9px] text-gray-400 font-normal uppercase tracking-normal hidden md:inline">
            Double-click a row to edit inline • Tab/Enter to navigate
          </span>
        </div>

        {/* Checkout items table */}
        <div className="hidden md:block overflow-auto border border-slate-200 rounded-xl max-h-[350px]">
          <table className="w-full text-xs text-left border-collapse min-w-[700px] table-fixed">
            <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200 shadow-3xs">
              <tr className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3 bg-slate-50 w-[24%]">Product</th>
                <th className="py-2.5 px-3 bg-slate-50 w-[10%]">Pack</th>
                <th className="py-2.5 px-3 text-right bg-slate-50 w-[10%]">Qty</th>
                <th className="py-2.5 px-3 text-right bg-slate-50 w-[12%]">Rate</th>
                <th className="py-2.5 px-3 text-right bg-slate-50 w-[10%]">GST</th>
                <th className="py-2.5 px-3 text-right bg-slate-50 w-[10%]">Discount</th>
                <th className="py-2.5 px-3 text-right bg-slate-50 w-[11%]">Total</th>
                <th className="py-2.5 px-3 text-center bg-slate-50 w-[10%]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center bg-slate-50/20">
                    <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto p-4 text-slate-400">
                      <span className="text-3xl">📦</span>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800 text-xs">No products added yet.</h4>
                        <p className="text-[10px] text-slate-400 font-semibold">
                          Search and add a product to begin creating the purchase invoice.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          searchInputRef.current?.focus();
                          searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }}
                        className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        Add Product
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((line, idx) => {
                  const prod = products.find((p) => p._id === line.productId);
                  const productName = prod ? prod.productName : "Unknown Product";
                  const packLabel = formatPackSize(line.variantParameter, line.unit);
                  const isExpanded = expandedRows.has(idx);
                  const isEditing = editingRowIndex === idx;
                  const isSelected = selectedRowIndex === idx;

                  return (
                    <Fragment key={idx}>
                      <tr
                        onDoubleClick={() => {
                          if (!isReadOnly) {
                            setEditingRowIndex(idx);
                            setInlineRowData({ ...line });
                          }
                        }}
                        onClick={() => setSelectedRowIndex(idx)}
                        className={`transition-colors group hover:bg-slate-50/70 select-none animate-in fade-in slide-in-from-left-2 duration-150 ${
                          isEditing ? "bg-emerald-50/10" : isSelected ? "bg-slate-50/50" : ""
                        }`}
                      >
                        {/* Product info */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRow(idx);
                              }}
                              className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900 transition shrink-0 cursor-pointer"
                              title={isExpanded ? "Collapse Details" : "Expand Details"}
                            >
                              <span className={`inline-block transition-transform text-[10px] ${isExpanded ? "rotate-90" : ""}`}>
                                ▶
                              </span>
                            </button>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-800 leading-tight truncate" title={productName}>
                                {productName}
                              </span>
                              <span className="text-[9px] text-slate-400 font-semibold mt-0.5 truncate">
                                {prod?.productCategory
                                  ? prod.productCategory.charAt(0).toUpperCase() + prod.productCategory.slice(1)
                                  : "General"}
                                {" • "}
                                {packLabel}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Pack size badge */}
                        <td className="py-2 px-3">
                          <span className="bg-emerald-50/80 text-emerald-700 border border-emerald-100/50 px-2 py-0.5 rounded text-[10px] font-bold inline-block">
                            {line.variantParameter} {line.unit}
                          </span>
                        </td>

                        {/* Qty */}
                        <td className="py-2 px-3 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={inlineRowData.quantity}
                              onChange={(e) => handleInlineChange("quantity", e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleSaveInlineRow(idx);
                                }
                              }}
                              className="w-16 h-8 text-right border border-gray-300 rounded px-1.5 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/10 font-bold bg-white"
                            />
                          ) : (
                            <span className="font-bold text-slate-805 text-xs">{line.quantity}</span>
                          )}
                        </td>

                        {/* Rate */}
                        <td className="py-2 px-3 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={inlineRowData.pricePerUnit}
                              onChange={(e) => handleInlineChange("pricePerUnit", e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleSaveInlineRow(idx);
                                }
                              }}
                              className="w-20 h-8 text-right border border-gray-300 rounded px-1.5 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/10 font-bold bg-white"
                            />
                          ) : (
                            <span className="text-slate-700 font-semibold">
                              ₹{parseFloat(line.pricePerUnit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </td>

                        {/* GST */}
                        <td className="py-2 px-3 text-right">
                          {isEditing ? (
                            <select
                              value={inlineRowData.taxPercent}
                              onChange={(e) => handleInlineChange("taxPercent", e.target.value)}
                              className="w-16 h-8 border border-gray-300 rounded px-1 focus:border-brand-600 focus:outline-none bg-white font-semibold text-slate-700 text-xs"
                            >
                              {[0, 5, 12, 18, 28].map((pct) => (
                                <option key={pct} value={pct}>
                                  {pct}%
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-600 font-semibold">{line.taxPercent}%</span>
                          )}
                        </td>

                        {/* Discount */}
                        <td className="py-2 px-3 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={inlineRowData.discountPercent}
                              onChange={(e) => handleInlineChange("discountPercent", e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleSaveInlineRow(idx);
                                }
                              }}
                              className="w-16 h-8 text-right border border-gray-300 rounded px-1.5 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/10 font-semibold bg-white"
                            />
                          ) : (
                            <span className="text-slate-600 font-semibold">{line.discountPercent || 0}%</span>
                          )}
                        </td>

                        {/* Total */}
                        <td className="py-2 px-3 text-right font-extrabold text-slate-900 text-xs">
                          ₹{(line.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSaveInlineRow(idx)}
                                  className="p-1 hover:bg-emerald-50 text-emerald-650 rounded border border-emerald-200 transition cursor-pointer"
                                  title="Save Row"
                                >
                                  ✓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingRowIndex(null);
                                    setInlineRowData(null);
                                  }}
                                  className="p-1 hover:bg-red-50 text-red-650 rounded border border-red-200 transition cursor-pointer"
                                  title="Cancel"
                                >
                                  ✕
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingRowIndex(idx);
                                    setInlineRowData({ ...line });
                                  }}
                                  className="p-1.5 hover:bg-slate-100 text-gray-500 hover:text-brand-600 rounded transition shrink-0 cursor-pointer"
                                  title="Edit Item Inline"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteProductFromList(idx);
                                  }}
                                  className="p-1.5 hover:bg-slate-100 text-gray-500 hover:text-red-600 rounded transition shrink-0 cursor-pointer"
                                  title="Delete Item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable details */}
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan="8" className="px-6 py-2 border-y border-slate-150">
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                              <div>
                                <span className="block text-slate-400 text-[9px]">HSN Code</span>
                                <span className="text-slate-805">{line.hsnCode || "—"}</span>
                              </div>
                              <div>
                                <span className="block text-slate-400 text-[9px]">GST Rate</span>
                                <span className="text-slate-805">{line.taxPercent}%</span>
                              </div>
                              <div>
                                <span className="block text-slate-400 text-[9px]">GST Type</span>
                                <span className="text-slate-805">{line.taxType}</span>
                              </div>
                              <div>
                                <span className="block text-slate-400 text-[9px]">Discount Amount</span>
                                <span className="text-slate-850">₹{line.discountAmount}</span>
                              </div>
                              <div>
                                <span className="block text-slate-400 text-[9px]">Tax Amount</span>
                                <span className="text-slate-850">₹{line.taxAmount}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards Layout */}
        <div className="block md:hidden space-y-3">
          {items.length === 0 ? (
            <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-8 text-center text-slate-455">
              <ShoppingBag className="w-7 h-7 text-slate-400 mx-auto mb-2" />
              <h4 className="font-bold text-slate-850 text-xs">No products added yet</h4>
            </div>
          ) : (
            items.map((line, idx) => {
              const prod = products.find((p) => p._id === line.productId);
              const productName = prod ? prod.productName : "Unknown Product";
              const packLabel = formatPackSize(line.variantParameter, line.unit);
              const isEditing = editingRowIndex === idx;

              return (
                <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col min-w-0">
                      <h4 className="font-bold text-slate-855 text-xs leading-tight truncate">{productName}</h4>
                      <span className="inline-block bg-slate-50 border border-slate-155 text-slate-650 font-bold text-[9px] px-2 py-0.5 rounded-md mt-1 w-fit">
                        {packLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSaveInlineRow(idx)}
                            className="p-1 hover:bg-emerald-50 text-emerald-650 rounded border border-emerald-200 transition text-[10px] font-bold cursor-pointer"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRowIndex(null);
                              setInlineRowData(null);
                            }}
                            className="p-1 hover:bg-red-50 text-red-655 rounded border border-red-200 transition text-[10px] font-bold cursor-pointer"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRowIndex(idx);
                              setInlineRowData({ ...line });
                            }}
                            className="p-1.5 border border-emerald-250 text-emerald-600 rounded-lg hover:bg-emerald-50 transition cursor-pointer"
                            title="Edit Item"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProductFromList(idx)}
                            className="p-1.5 border border-red-250 text-red-655 rounded-lg hover:bg-red-50 transition cursor-pointer"
                            title="Delete Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-gray-400 font-extrabold uppercase">Qty</label>
                        <input
                          type="number"
                          value={inlineRowData.quantity}
                          onChange={(e) => handleInlineChange("quantity", e.target.value)}
                          className="w-full h-8 border border-gray-350 rounded px-1.5 focus:border-brand-600 focus:outline-none text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-gray-400 font-extrabold uppercase">Rate</label>
                        <input
                          type="number"
                          value={inlineRowData.pricePerUnit}
                          onChange={(e) => handleInlineChange("pricePerUnit", e.target.value)}
                          className="w-full h-8 border border-gray-350 rounded px-1.5 focus:border-brand-600 focus:outline-none text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-gray-400 font-extrabold uppercase">GST</label>
                        <select
                          value={inlineRowData.taxPercent}
                          onChange={(e) => handleInlineChange("taxPercent", e.target.value)}
                          className="w-full h-8 border border-gray-350 rounded px-1 focus:border-brand-600 focus:outline-none text-xs bg-white"
                        >
                          {[0, 5, 12, 18, 28].map((pct) => (
                            <option key={pct} value={pct}>
                              {pct}%
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-gray-400 font-extrabold uppercase">Discount %</label>
                        <input
                          type="number"
                          value={inlineRowData.discountPercent}
                          onChange={(e) => handleInlineChange("discountPercent", e.target.value)}
                          className="w-full h-8 border border-gray-350 rounded px-1.5 focus:border-brand-600 focus:outline-none text-xs"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between text-[11px] font-bold border-t border-slate-100 pt-2 text-slate-500">
                      <span>
                        Qty: <b className="text-slate-800">{line.quantity}</b>
                      </span>
                      <span>
                        Rate: <b className="text-slate-800">₹{line.pricePerUnit}</b>
                      </span>
                      <span>
                        Total: <b className="text-slate-800">₹{line.amount}</b>
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { X, ChevronDown, Loader2 } from "lucide-react";
import api from "../../../lib/api";
import { fetchProducts, fetchStockSummary } from "../../../store/thunks/inventoryThunk";

export default function QuickAddProductModal({ onClose, onSuccess, defaultName = "", products = [] }) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    productName: defaultName || "",
    brand: "",
    productCategory: "Fertilizers",
    unit: "Kg",
    parameter: "",
    mrp: "",
    salePrice: "",
    purchasePrice: "",
    quantity: "",
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
      quantity: Number(form.quantity),
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
        (p) => p.productName?.toLowerCase() === payload.productName.toLowerCase() || p._id === resData?._id || p._id === resData?.productId
      );

      onSuccess(match?._id || resData?._id || resData?.productId);
    } catch (err) {
      console.error("[QuickAddProductModal submit error]:", err);
      toast.error(err?.response?.data?.message || err || "Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 text-xs">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white">
          <h2 className="text-lg font-bold text-gray-900">Quick Add Product</h2>
          <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-655 rounded-lg transition hover:bg-gray-100 cursor-pointer">
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
              className="px-5 py-2.5 text-xs font-semibold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition bg-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg transition cursor-pointer"
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

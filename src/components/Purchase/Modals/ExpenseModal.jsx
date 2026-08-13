import React, { useState, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { X, Trash2, Loader2, DollarSign, ListFilter } from "lucide-react";
import { createExpense } from "../../../store/thunks/purchaseThunk";
import SearchableStateSelect from "../../SearchableStateSelect";
import { EXPENSE_CATEGORIES, PAYMENT_TYPES } from "../utils/purchaseHelpers";

export default function ExpenseModal({ parties = [], onClose, onSuccess }) {
  const dispatch = useDispatch();

  // Mode: "flat" (simple amount) vs "itemized" (line items breakdown)
  const [expenseMode, setExpenseMode] = useState("flat");

  const [gstEnabled, setGstEnabled] = useState(false);
  const [selectedParty, setSelectedParty] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Office Supplies");
  const [expenseNo, setExpenseNo] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [stateOfSupply, setStateOfSupply] = useState("Uttar Pradesh");
  const [paymentType, setPaymentType] = useState("Cash");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  // Flat Amount state
  const [flatTotalAmount, setFlatTotalAmount] = useState("");

  // Itemized Lines state
  const [items, setItems] = useState([
    { itemName: "", quantity: 1, pricePerUnit: "", discountPercent: 0, taxPercent: 18, amount: 0 },
  ]);

  const handleAddLine = () => {
    setItems((prev) => [
      ...prev,
      { itemName: "", quantity: 1, pricePerUnit: "", discountPercent: 0, taxPercent: 18, amount: 0 },
    ]);
  };

  const handleRemoveLine = (idx) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const updateLineItem = (idx, field, value) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[idx], [field]: value };

      const qty = item.quantity === "" ? 0 : parseFloat(item.quantity) || 0;
      const price = item.pricePerUnit === "" ? 0 : parseFloat(item.pricePerUnit) || 0;
      const base = qty * price;

      const discPct = parseFloat(item.discountPercent) || 0;
      const taxable = Math.max(0, base - base * (discPct / 100));

      if (gstEnabled) {
        const taxPct = parseFloat(item.taxPercent) || 0;
        item.amount = parseFloat((taxable * (1 + taxPct / 100)).toFixed(2));
      } else {
        item.amount = parseFloat(taxable.toFixed(2));
      }

      copy[idx] = item;
      return copy;
    });
  };

  useEffect(() => {
    setItems((prev) => {
      return prev.map((item) => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.pricePerUnit) || 0;
        const base = qty * price;
        const discPct = parseFloat(item.discountPercent) || 0;
        const taxable = Math.max(0, base - base * (discPct / 100));

        let amount = taxable;
        if (gstEnabled) {
          const taxPct = parseFloat(item.taxPercent) || 0;
          amount = taxable * (1 + taxPct / 100);
        }
        return { ...item, amount: parseFloat(amount.toFixed(2)) };
      });
    });
  }, [gstEnabled]);

  const subTotal = useMemo(() => {
    return parseFloat(
      items
        .reduce((sum, it) => {
          const q = it.quantity === "" ? 0 : parseFloat(it.quantity) || 0;
          const p = it.pricePerUnit === "" ? 0 : parseFloat(it.pricePerUnit) || 0;
          return sum + q * p;
        }, 0)
        .toFixed(2)
    );
  }, [items]);

  const itemizedTotalAmount = useMemo(() => {
    return parseFloat(items.reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0).toFixed(2));
  }, [items]);

  const finalTotalAmount = expenseMode === "flat" ? parseFloat(flatTotalAmount) || 0 : itemizedTotalAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (expenseMode === "flat") {
      const amount = parseFloat(flatTotalAmount);
      if (!amount || amount <= 0) {
        toast.error("Please enter a valid expense total amount");
        return;
      }
    } else {
      const validLines = items.filter((it) => it.itemName.trim() && (parseFloat(it.pricePerUnit) || 0) > 0);
      if (validLines.length === 0) {
        toast.error("Please enter at least one item line with a name and price");
        return;
      }
    }

    setLoading(true);

    let payload = {};

    if (expenseMode === "flat") {
      // Simple Flat-Amount Expense
      payload = {
        expenseCategory,
        billDate,
        paymentType,
        totalAmount: parseFloat(flatTotalAmount),
        ...(gstEnabled ? { gstEnabled: true } : {}),
        ...(selectedParty ? { party: selectedParty } : {}),
        ...(expenseNo.trim() ? { expenseNo: expenseNo.trim() } : {}),
        ...(stateOfSupply ? { stateOfSupply } : {}),
        ...(referenceNo.trim() ? { referenceNo: referenceNo.trim() } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
      };
    } else {
      // Itemized Breakdown Expense
      const validLines = items.filter((it) => it.itemName.trim() && (parseFloat(it.pricePerUnit) || 0) > 0);
      payload = {
        gstEnabled,
        expenseCategory,
        billDate,
        stateOfSupply,
        items: validLines.map((it) => ({
          itemName: it.itemName,
          quantity: parseInt(it.quantity),
          pricePerUnit: parseFloat(it.pricePerUnit),
          discountPercent: parseFloat(it.discountPercent) || 0,
          taxPercent: gstEnabled ? parseFloat(it.taxPercent) || 0 : 0,
          amount: parseFloat(it.amount),
        })),
        subTotal,
        totalAmount: itemizedTotalAmount,
        paymentType,
        ...(selectedParty ? { party: selectedParty } : {}),
        ...(expenseNo.trim() ? { expenseNo: expenseNo.trim() } : {}),
        ...(referenceNo.trim() ? { referenceNo: referenceNo.trim() } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
      };
    }

    try {
      await dispatch(createExpense(payload)).unwrap();
      toast.success("Expense recorded successfully!");
      onSuccess();
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Failed to record expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-905">Record Business Expense</h2>
            {/* Mode Switcher */}
            <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setExpenseMode("flat")}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  expenseMode === "flat"
                    ? "bg-white text-brand-700 shadow-2xs"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                Flat Amount
              </button>
              <button
                type="button"
                onClick={() => setExpenseMode("itemized")}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  expenseMode === "itemized"
                    ? "bg-white text-brand-700 shadow-2xs"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                Itemized Breakdown
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 bg-gray-50/30 select-none">
          {/* Row 1: Common Metadata */}
          <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Expense Category *</label>
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white h-[38px] cursor-pointer font-semibold text-gray-800"
                required
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Payment Mode *</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white h-[38px] cursor-pointer font-semibold text-gray-800"
                required
              >
                {PAYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Reference No (Optional)</label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="E.g. TXN987654321, CHQ#102"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 h-[38px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Expense Voucher No (Optional)</label>
              <input
                type="text"
                value={expenseNo}
                onChange={(e) => setExpenseNo(e.target.value)}
                placeholder="E.g. EXP-2026-001"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 h-[38px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Expense Date</label>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 h-[38px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Linked Party / Vendor (Optional)</label>
              <select
                value={selectedParty}
                onChange={(e) => setSelectedParty(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white h-[38px] cursor-pointer"
              >
                <option value="">-- No Party --</option>
                {parties.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">State of Supply</label>
              <SearchableStateSelect
                value={stateOfSupply}
                onChange={(val) => setStateOfSupply(val)}
                height="h-[38px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">GST Enable Status</label>
              <div className="flex items-center h-[38px]">
                <input
                  type="checkbox"
                  id="gstEnabled"
                  checked={gstEnabled}
                  onChange={(e) => setGstEnabled(e.target.checked)}
                  className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500 cursor-pointer"
                />
                <label htmlFor="gstEnabled" className="ml-2 text-xs font-bold text-gray-600 cursor-pointer select-none">
                  Enable GST Scopes
                </label>
              </div>
            </div>
          </div>

          {/* Row 2: Mode-based Body */}
          {expenseMode === "flat" ? (
            /* Flat Amount Field */
            <div className="bg-white border border-gray-150 rounded-xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex-1 w-full">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Total Expense Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={flatTotalAmount}
                    onChange={(e) => setFlatTotalAmount(e.target.value)}
                    placeholder="Enter total amount (e.g. 25000)"
                    className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50/50"
                    required
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  For flat-amount expenses like rent or staff salaries, backend will auto-generate the single item line for <b>{expenseCategory}</b>.
                </p>
              </div>
            </div>
          ) : (
            /* Itemized Breakdown Table */
            <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h3 className="font-bold text-gray-800 text-sm border-l-4 border-brand-600 pl-2">
                  Expense Item Lines
                </h3>
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="text-xs text-brand-600 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                >
                  + Add Line
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end bg-gray-50/50 p-3 rounded-lg border border-gray-150 relative"
                  >
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="absolute top-2 right-2 md:static text-gray-400 hover:text-red-500 p-1 md:mb-2 cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1">Item Name *</label>
                      <input
                        type="text"
                        value={item.itemName}
                        onChange={(e) => updateLineItem(idx, "itemName", e.target.value)}
                        placeholder="E.g. Printing Paper, Cleaning Service"
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(idx, "quantity", e.target.value === "" ? "" : parseInt(e.target.value) || 0)
                        }
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1">Price Per Unit *</label>
                      <input
                        type="number"
                        min="1"
                        value={item.pricePerUnit}
                        onChange={(e) =>
                          updateLineItem(idx, "pricePerUnit", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                        required
                      />
                    </div>

                    {gstEnabled && (
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-400 mb-1">GST rate %</label>
                        <input
                          type="number"
                          min="0"
                          value={item.taxPercent}
                          onChange={(e) =>
                            updateLineItem(idx, "taxPercent", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)
                          }
                          placeholder="18%"
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                        />
                      </div>
                    )}

                    <div className="text-right">
                      <span className="block text-[9px] text-gray-400 uppercase">Subtotal</span>
                      <span className="font-bold text-gray-800 text-sm">
                        ₹{(item.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Row 3: Memo & Grand Total */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Description / Note</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add payment notes, staff salary month, invoice remarks..."
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs flex flex-col justify-center items-center text-center">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total Expense Amount</span>
              <span className="font-extrabold text-brand-700 text-3xl mt-1">
                ₹{finalTotalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100 bg-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-1.5 px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold shadow-sm cursor-pointer"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save Expense
          </button>
        </div>
      </div>
    </div>
  );
}

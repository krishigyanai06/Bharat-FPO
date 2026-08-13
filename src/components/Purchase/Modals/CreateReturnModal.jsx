import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { X, Loader2 } from "lucide-react";
import api from "../../../lib/api";
import { createPurchaseReturn } from "../../../store/thunks/purchaseThunk";
import { resolveVariantId, resolveItemLabel } from "../utils/purchaseHelpers";

export default function CreateReturnModal({ onClose, onSuccess }) {
  const dispatch = useDispatch();
  const { products } = useSelector((state) => state.inventory);
  const [returnNo, setReturnNo] = useState("");
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  // Bill-linking states
  const [billList, setBillList] = useState([]);
  const [selectedBillId, setSelectedBillId] = useState("");
  const [selectedBillDetails, setSelectedBillDetails] = useState(null);
  const [loadingBillDetails, setLoadingBillDetails] = useState(false);
  const [returnItems, setReturnItems] = useState([]);

  // Load purchase bills of type BILL for linking
  useEffect(() => {
    const fetchBills = async () => {
      try {
        const res = await api.get('/purchase/list?purchaseType=BILL&limit=100');
        setBillList(res.data?.records || res.data?.data?.records || res.data?.data || res.data || []);
      } catch (err) {
        console.error("Failed to load bills", err);
      }
    };
    fetchBills();
  }, []);

  const handleBillSelectChange = async (e) => {
    const billId = e.target.value;
    setSelectedBillId(billId);
    if (!billId) {
      setSelectedBillDetails(null);
      setReturnItems([]);
      return;
    }

    setLoadingBillDetails(true);
    try {
      const res = await api.get(`/purchase/${billId}`);
      const bill = res.data?.data || res.data;
      setSelectedBillDetails(bill);

      if (bill?.items?.length > 0) {
        const itemsMapped = bill.items.map((it) => {
          const itemId = resolveVariantId(it, products);
          return {
            item: itemId,
            productName: resolveItemLabel(it, products),
            purchasedQty: it.quantity || 0,
            returnQty: 0,
            unit: it.unit || "pcs",
            pricePerUnit: it.pricePerUnit || 0,
            taxType: it.taxType || "Without Tax",
            discountPercent: it.discountPercent || 0,
            taxPercent: it.taxPercent || 0,
            taxAmount: 0,
            amount: 0,
          };
        });
        setReturnItems(itemsMapped);
      } else {
        setReturnItems([]);
      }
    } catch (err) {
      toast.error("Failed to load bill items details");
      console.error(err);
    } finally {
      setLoadingBillDetails(false);
    }
  };

  const updateReturnQty = (idx, qtyVal) => {
    setReturnItems((prev) => {
      const copy = [...prev];
      const line = { ...copy[idx] };
      const maxQty = line.purchasedQty;

      if (qtyVal === "") {
        line.returnQty = "";
        line.taxAmount = 0;
        line.amount = 0;
      } else {
        let q = parseInt(qtyVal) || 0;
        if (q < 0) q = 0;
        if (q > maxQty) {
          toast.error(`Cannot return quantity (${q}) greater than purchased quantity (${maxQty})`);
          q = maxQty;
        }
        line.returnQty = q;

        const price = line.pricePerUnit;
        const base = q * price;
        const discountAmt = parseFloat((base * (line.discountPercent / 100)).toFixed(2));
        const afterDiscount = Math.max(0, base - discountAmt);
        const taxPct = line.taxPercent;

        if (line.taxType === "With Tax") {
          line.amount = parseFloat(afterDiscount.toFixed(2));
          const taxable = line.amount / (1 + taxPct / 100);
          line.taxAmount = parseFloat((line.amount - taxable).toFixed(2));
        } else {
          const taxable = afterDiscount;
          line.taxAmount = parseFloat((taxable * (taxPct / 100)).toFixed(2));
          line.amount = parseFloat((taxable + line.taxAmount).toFixed(2));
        }
      }

      copy[idx] = line;
      return copy;
    });
  };

  const subTotal = useMemo(() => {
    return parseFloat(returnItems.reduce((sum, line) => {
      const q = line.returnQty === "" ? 0 : parseFloat(line.returnQty) || 0;
      return sum + (q * line.pricePerUnit);
    }, 0).toFixed(2));
  }, [returnItems]);

  const totalAmount = useMemo(() => {
    return parseFloat(returnItems.reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0).toFixed(2));
  }, [returnItems]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!selectedBillId) {
      toast.error("Please select a linked purchase bill invoice");
      return;
    }
    if (!returnNo.trim()) {
      toast.error("Debit note return number is required");
      return;
    }

    const activeReturns = returnItems.filter(l => (parseInt(l.returnQty) || 0) > 0);
    if (activeReturns.length === 0) {
      toast.error("At least one item must have a return quantity greater than 0");
      return;
    }

    for (const it of activeReturns) {
      if (it.returnQty <= 0) {
        toast.error(`Return quantity for ${it.productName} must be greater than 0`);
        return;
      }
      if (it.returnQty > it.purchasedQty) {
        toast.error(`Return quantity for ${it.productName} exceeds original purchased quantity (${it.purchasedQty})`);
        return;
      }
    }

    setLoading(true);
    const payloadItems = activeReturns.map((it) => {
      const base = it.returnQty * it.pricePerUnit;
      const discountAmount = parseFloat((base * (it.discountPercent / 100)).toFixed(2));
      return {
        item: it.item,
        quantity: parseInt(it.returnQty),
        unit: it.unit,
        pricePerUnit: it.pricePerUnit,
        taxType: it.taxType,
        discountPercent: it.discountPercent,
        discountAmount,
        taxPercent: it.taxPercent,
        taxAmount: it.taxAmount,
        amount: it.amount
      };
    });

    const payload = {
      purchase: selectedBillId,
      party: selectedBillDetails?.party?._id || selectedBillDetails?.party,
      returnNo,
      returnDate,
      items: payloadItems,
      subTotal,
      totalAmount,
      description
    };

    try {
      await dispatch(createPurchaseReturn(payload)).unwrap();
      toast.success("Debit note logged successfully!");
      onSuccess();
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Failed to register purchase return");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white">
          <h2 className="text-lg font-bold text-gray-900">Create Purchase Return (Debit Note)</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 bg-gray-50/30 select-none">
          <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Link Purchase Bill *</label>
              <select
                value={selectedBillId}
                onChange={handleBillSelectChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white h-[38px] cursor-pointer"
                required
              >
                <option value="">-- Choose Purchase Bill --</option>
                {billList.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.billNumber} - Vendor: {b.party?.name || "N/A"} (₹{b.totalAmount || 0})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Debit Note / Return No *</label>
              <input
                type="text"
                value={returnNo}
                onChange={(e) => setReturnNo(e.target.value)}
                placeholder="RET-2026-001"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 h-[38px]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Return Date</label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 h-[38px]"
              />
            </div>
          </div>

          {selectedBillId && (
            <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-gray-800 text-sm border-l-4 border-red-650 pl-2">Linked Bill Items</h3>
              {loadingBillDetails ? (
                <div className="py-8 text-center text-gray-400 flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                  <span>Loading bill lines details...</span>
                </div>
              ) : returnItems.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No products found inside the selected bill.</p>
              ) : (
                <div className="space-y-3">
                  {returnItems.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center bg-gray-50/50 p-3 rounded-lg border border-gray-150">
                      <div className="md:col-span-2">
                        <span className="block text-xs font-bold text-gray-800">{line.productName}</span>
                        <span className="text-[10px] text-gray-500">
                          Price: ₹{line.pricePerUnit} | Tax: {line.taxPercent}% ({line.taxType}) | Disc: {line.discountPercent}%
                        </span>
                      </div>

                      <div>
                        <span className="block text-[10px] text-gray-400 font-semibold">Purchased Qty</span>
                        <span className="font-semibold text-gray-700 text-sm">{line.purchasedQty} {line.unit}</span>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-gray-400 mb-1">Return Qty *</label>
                        <input
                          type="number"
                          min="0"
                          max={line.purchasedQty}
                          value={line.returnQty}
                          onChange={(e) => updateReturnQty(idx, e.target.value)}
                          placeholder="0"
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                        />
                      </div>

                      <div>
                        <span className="block text-[10px] text-gray-400 font-semibold">Tax Refunded</span>
                        <span className="font-semibold text-gray-700 text-xs">₹{(line.taxAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>

                      <div className="text-right">
                        <span className="block text-[9px] text-gray-400 uppercase">Return Subtotal</span>
                        <span className="font-bold text-gray-800 text-sm">₹{(line.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Return Reason / Memo</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe reason for returning items..."
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs flex flex-col justify-center items-center text-center">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Debit Note Total Refund</span>
              <span className="font-extrabold text-red-650 text-3xl mt-1">₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100 bg-white disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Processing..." : "Log Return"}
          </button>
        </div>
      </div>
    </div>
  );
}

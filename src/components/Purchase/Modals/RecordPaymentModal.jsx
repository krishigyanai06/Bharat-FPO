import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { IndianRupee, X, Loader2, AlertTriangle } from "lucide-react";
import { createPaymentOut, updatePaymentOut } from "../../../store/thunks/purchaseThunk";
import api from "../../../lib/api";
import { PAYMENT_TYPES } from "../utils/purchaseHelpers";

export default function RecordPaymentModal({ editRecord = null, parties, onClose, onSuccess }) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  const [partyId, setPartyId] = useState(editRecord ? (editRecord.party?._id || editRecord.party || "") : "");
  const [purchaseId, setPurchaseId] = useState(
    editRecord
      ? (editRecord.linkedBill?._id || editRecord.linkedBill || editRecord.linkedPurchaseBill?._id || editRecord.linkedPurchaseBill || editRecord.purchase?._id || editRecord.purchase || "")
      : ""
  );
  const [paymentAmount, setPaymentAmount] = useState(editRecord ? (editRecord.paidAmount || editRecord.payments?.[0]?.amount || "") : "");
  const [paymentType, setPaymentType] = useState(editRecord ? (editRecord.paymentType || editRecord.payments?.[0]?.paymentType || "Cash") : "Cash");
  const [referenceNo, setReferenceNo] = useState(editRecord ? (editRecord.referenceNo || editRecord.payments?.[0]?.referenceNo || "") : "");
  const [paymentDate, setPaymentDate] = useState(editRecord ? (editRecord.date?.split("T")[0] || editRecord.paymentDate?.split("T")[0]) : new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState(editRecord ? (editRecord.description || "") : "");

  const [unpaidBills, setUnpaidBills] = useState([]);
  const [fetchingBills, setFetchingBills] = useState(false);

  useEffect(() => {
    if (!editRecord || !editRecord._id) return;
    const fetchPaymentDetails = async () => {
      try {
        const res = await api.get(`/purchase/payment-out/${editRecord._id}`);
        const data = res.data?.data || res.data;
        if (data) {
          const fetchedPartyId = data.party?._id || data.party || "";
          const fetchedPurchaseId = data.linkedBill?._id || data.linkedBill || data.linkedPurchaseBill?._id || data.linkedPurchaseBill || data.purchase?._id || data.purchase || "";
          const fetchedAmount = data.paidAmount || data.payments?.[0]?.amount || "";
          const fetchedType = data.paymentType || data.payments?.[0]?.paymentType || "Cash";
          const fetchedRef = data.referenceNo || data.payments?.[0]?.referenceNo || "";
          const fetchedDate = (data.date || data.paymentDate || "").split("T")[0];
          const fetchedNotes = data.description || "";

          if (fetchedPartyId) setPartyId(fetchedPartyId);
          if (fetchedPurchaseId) setPurchaseId(fetchedPurchaseId);
          if (fetchedAmount) setPaymentAmount(fetchedAmount);
          if (fetchedType) setPaymentType(fetchedType);
          if (fetchedRef) setReferenceNo(fetchedRef);
          if (fetchedDate) setPaymentDate(fetchedDate);
          if (fetchedNotes) setNotes(fetchedNotes);
        }
      } catch (err) {
        console.error("Failed to load payment details:", err);
      }
    };
    fetchPaymentDetails();
  }, [editRecord]);

  useEffect(() => {
    if (!partyId) {
      setUnpaidBills([]);
      return;
    }
    const loadBills = async () => {
      setFetchingBills(true);
      try {
        const res = await api.get(`/purchase/list?party=${partyId}&limit=100`);
        const all = res.data?.records || res.data?.data?.records || res.data?.data || res.data || [];
        const filtered = all.filter(
          (b) => b.unpaidAmount > 0 || b._id === purchaseId
        );

        if (purchaseId && !filtered.some(b => b._id === purchaseId)) {
          try {
            const singleRes = await api.get(`/purchase/${purchaseId}`);
            const singleBill = singleRes.data?.data || singleRes.data;
            if (singleBill) {
              filtered.push(singleBill);
            }
          } catch (singleErr) {
            console.error("Failed to fetch linked purchase bill", singleErr);
          }
        }

        setUnpaidBills(filtered);
      } catch (err) {
        console.error("Failed to load supplier bills", err);
      } finally {
        setFetchingBills(false);
      }
    };
    loadBills();
  }, [partyId, purchaseId]);

  const selectedBill = unpaidBills.find(b => b._id === purchaseId);
  const allowance = editRecord ? (editRecord.paidAmount || editRecord.payments?.[0]?.amount || 0) : 0;
  const maxAmount = selectedBill ? (selectedBill.unpaidAmount + allowance) : Infinity;

  const amt = parseFloat(paymentAmount) || 0;
  const originalPaid = editRecord ? (editRecord.paidAmount || editRecord.payments?.[0]?.amount || 0) : 0;
  const isCurrentlyLinked = editRecord && selectedBill && (
    (editRecord.linkedBill?._id || editRecord.linkedBill) === selectedBill._id ||
    (editRecord.linkedPurchaseBill?._id || editRecord.linkedPurchaseBill) === selectedBill._id ||
    (editRecord.purchase?._id || editRecord.purchase) === selectedBill._id
  );
  const baseOutstanding = isCurrentlyLinked ? (selectedBill.unpaidAmount + originalPaid) : (selectedBill ? selectedBill.unpaidAmount : 0);
  const newOutstanding = Math.max(0, baseOutstanding - amt);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!partyId) {
      toast.error("Please select a vendor");
      return;
    }
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Payment amount must be greater than zero");
      return;
    }

    if (selectedBill && amt > maxAmount) {
      toast.error(`Payment amount cannot exceed the outstanding balance of ₹${maxAmount}`);
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading(editRecord ? "Updating payment out record..." : "Recording payment out...");

    const payload = {
      party: partyId,
      linkedBill: purchaseId || undefined,
      linkedPurchaseBill: purchaseId || undefined,
      purchase: purchaseId || undefined,
      paidAmount: amt,
      payments: [{ paymentType, amount: amt, referenceNo: referenceNo || undefined }],
      paymentType,
      referenceNo: referenceNo || undefined,
      date: paymentDate,
      description: notes,
      receiptNo: editRecord?.receiptNo || `PAY-${Date.now()}`,
      isAutoGenerated: false
    };

    try {
      if (editRecord && editRecord._id) {
        await dispatch(updatePaymentOut({ id: editRecord._id, payload })).unwrap();
        toast.success("Payment Out updated successfully!", { id: loadingToast });
      } else {
        await dispatch(createPaymentOut(payload)).unwrap();
        toast.success("Payment Out recorded successfully!", { id: loadingToast });
      }
      onSuccess();
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Failed to save payment out details", { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-150 bg-white">
          <h2 className="text-lg font-bold text-gray-905 flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-red-655" />
            {editRecord ? "Edit Payment Out" : "Record Supplier Payment Out"}
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 bg-gray-50/20 text-xs select-none">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Select Party/Supplier *</label>
            <select
              value={partyId}
              onChange={(e) => {
                setPartyId(e.target.value);
                setPurchaseId("");
              }}
              disabled={!!editRecord}
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white cursor-pointer h-[36px]"
              required
            >
              <option value="">-- Choose Party --</option>
              {parties.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Link Purchase Bill (Optional)</label>
            <div className="relative">
              <select
                value={purchaseId}
                onChange={(e) => setPurchaseId(e.target.value)}
                disabled={!partyId || fetchingBills}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white cursor-pointer h-[36px] disabled:bg-gray-100 disabled:cursor-not-allowed font-medium text-gray-800"
              >
                {fetchingBills ? (
                  <option value="">-- Loading supplier bills... --</option>
                ) : !partyId ? (
                  <option value="">-- Choose Party First --</option>
                ) : unpaidBills.length === 0 ? (
                  <option value="">-- No outstanding bills found --</option>
                ) : (
                  <>
                    <option value="">-- Select Bill invoice --</option>
                    {unpaidBills.map((b) => (
                      <option key={b._id} value={b._id}>
                        [{b.purchaseType === "ORDER" ? "Purchase Order" : "Purchase Bill"}] {b.billNumber || "Ref #" + b._id.substring(b._id.length - 8)} (Date: {new Date(b.billDate).toLocaleDateString("en-IN")} - Outstanding: ₹{b.unpaidAmount + (editRecord && (editRecord.linkedBill?._id || editRecord.linkedBill || editRecord.linkedPurchaseBill?._id || editRecord.linkedPurchaseBill || editRecord.purchase?._id || editRecord.purchase) === b._id ? allowance : 0)})
                      </option>
                    ))}
                  </>
                )}
              </select>
              {fetchingBills && (
                <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                </div>
              )}
            </div>
            {partyId && !fetchingBills && unpaidBills.length === 0 && (
              <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <div className="space-y-0.5">
                  <p className="font-bold text-[10px] uppercase tracking-wider text-amber-700">No Unpaid Bills</p>
                  <p className="text-[11px] font-medium leading-tight text-amber-600">This supplier has no outstanding balances or pending bills to settle.</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Payment Amount (₹) *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={maxAmount}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 h-[36px] font-bold text-gray-800"
                required
              />
              {selectedBill && (
                <>
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Max Payable: ₹{maxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                  <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 animate-in fade-in duration-150">
                    <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                      <span>Outstanding Balance:</span>
                      <span>₹{selectedBill.unpaidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    {editRecord && isCurrentlyLinked && (
                      <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                        <span>Original Paid Amount:</span>
                        <span>₹{originalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[10px] text-slate-650 font-bold border-t pt-1 border-slate-200">
                      <span>New Outstanding Dues:</span>
                      <span className="font-extrabold text-slate-900">₹{newOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    {editRecord && isCurrentlyLinked && amt !== originalPaid && (
                      <div className="text-[9px] font-extrabold mt-1">
                        {amt > originalPaid ? (
                          <span className="text-emerald-700">▲ Reducing dues by a delta of ₹{(amt - originalPaid).toLocaleString("en-IN")}</span>
                        ) : (
                          <span className="text-amber-700">▼ Adding ₹{(originalPaid - amt).toLocaleString("en-IN")} back to dues</span>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Payment Method *</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white cursor-pointer h-[36px]"
                required
              >
                {PAYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Reference Number</label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="TXN / Cheque ID"
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 h-[36px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 h-[36px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Notes / Description</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record any details regarding transaction settlement..."
              className="w-full border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </form>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border rounded-lg text-sm text-gray-655 hover:bg-gray-100 bg-white cursor-pointer"
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
            Save Payment
          </button>
        </div>
      </div>
    </div>
  );
}

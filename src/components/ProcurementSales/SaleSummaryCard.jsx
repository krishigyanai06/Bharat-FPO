import React from "react";
import { Save, Loader2, IndianRupee } from "lucide-react";
import { formatINR } from "./procurementSaleHelpers";

export default function SaleSummaryCard({
  buyerDetails,
  invoiceNumber = "",
  crops = [],
  grandTotal = 0,
  subtotal = 0,
  taxAmount = 0,
  submitting = false,
  isEdit = false,
  onCancel,
}) {
  const totalQuantitySum = crops.reduce(
    (sum, c) => sum + (Number(c.quantity) || 0),
    0
  );
  const receivedNum = Number(buyerDetails.receivedAmount) || 0;
  const outstanding = Math.max(0, grandTotal - receivedNum);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5 sticky top-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <IndianRupee size={15} />
          </div>
          <span>Sale Summary</span>
        </h3>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          INR (₹)
        </span>
      </div>

      {/* Invoice No. & Buyer Preview */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">
            Invoice No.
          </span>
          <span className="text-xs font-black font-mono text-emerald-700 block truncate">
            {invoiceNumber ? invoiceNumber.toUpperCase() : (isEdit ? "Existing Invoice" : "Auto-Generated")}
          </span>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">
            Target Buyer
          </span>
          <span className="text-xs font-black text-slate-900 block truncate">
            {buyerDetails.buyerName || "No Buyer Selected"}
          </span>
        </div>
      </div>


      {/* Metrics breakdown */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">
            Crop Lines
          </span>
          <span className="text-sm font-black text-slate-800 block">
            {crops.length} Items
          </span>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">
            Total Quantity
          </span>
          <span className="text-sm font-black text-slate-800 block">
            {totalQuantitySum}
          </span>
        </div>
      </div>

      <div className="space-y-3 pt-2 text-xs border-t border-slate-100">
        <div className="flex justify-between items-center text-slate-600 font-semibold">
          <span>Crop Subtotal:</span>
          <span className="font-bold text-slate-900 text-sm">
            {formatINR(subtotal)}
          </span>
        </div>

        {taxAmount > 0 && (
          <div className="flex justify-between items-center text-slate-600 font-semibold">
            <span>GST Tax ({taxAmount > 0 ? "5%" : "0%"}):</span>
            <span className="font-bold text-slate-900 text-sm">
              {formatINR(taxAmount)}
            </span>
          </div>
        )}

        <div className="flex justify-between items-center text-slate-600 font-semibold">
          <span>Received Amount:</span>
          <span className="font-bold text-slate-900 text-sm">
            {formatINR(receivedNum)}
          </span>
        </div>

        <div className="flex justify-between items-center text-slate-600 font-semibold pb-2 border-b border-slate-100">
          <span>Outstanding Due:</span>
          <span
            className={`font-bold text-sm ${
              outstanding > 0 ? "text-amber-600" : "text-slate-800"
            }`}
          >
            {formatINR(outstanding)}
          </span>
        </div>

        {/* Grand Total Display */}
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1 mt-2">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
            Invoice Grand Total
          </span>
          <span className="text-2xl font-black text-emerald-800 block">
            {formatINR(grandTotal)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-extrabold text-xs transition-all shadow-md hover:shadow-xl active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Saving Crop Sale...</span>
            </>
          ) : (
            <>
              <Save size={16} />
              <span>{isEdit ? "Update Crop Sale" : "Confirm & Save Sale"}</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="w-full py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs transition cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

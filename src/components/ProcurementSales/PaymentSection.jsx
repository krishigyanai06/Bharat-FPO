import React from "react";
import { CreditCard, Wallet, IndianRupee } from "lucide-react";
import { formatINR } from "./procurementSaleHelpers";

export default function PaymentSection({
  buyerDetails,
  setBuyerDetails,
  grandTotal = 0,
}) {
  const receivedNum = Number(buyerDetails.receivedAmount) || 0;
  const outstanding = Math.max(0, grandTotal - receivedNum);

  const handleBillingTypeChange = (type) => {
    let nextReceived = buyerDetails.receivedAmount;
    if (type === "Cash") {
      nextReceived = grandTotal;
    } else if (type === "Credit") {
      nextReceived = 0;
    }
    setBuyerDetails({
      ...buyerDetails,
      billingType: type,
      receivedAmount: nextReceived,
    });
  };

  const isCredit = buyerDetails.billingType === "Credit";

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
            <CreditCard size={15} />
          </div>
          <span>C. Payment & Billing Terms</span>
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Billing Type Picker - Matches API enum ["Cash", "Credit"] */}
        <div>
          <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
            Billing Type
          </label>
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => handleBillingTypeChange("Cash")}
              className={`py-2 rounded-lg transition text-center ${
                !isCredit
                  ? "bg-white shadow-3xs text-emerald-700 font-extrabold"
                  : "hover:text-slate-900"
              }`}
            >
              Cash
            </button>
            <button
              type="button"
              onClick={() => handleBillingTypeChange("Credit")}
              className={`py-2 rounded-lg transition text-center ${
                isCredit
                  ? "bg-white shadow-3xs text-rose-700 font-extrabold"
                  : "hover:text-slate-900"
              }`}
            >
              Credit
            </button>
          </div>
        </div>

        {/* Received Amount Input */}
        <div>
          <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
            Received Amount (₹)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
            <input
              type="number"
              min={0}
              max={grandTotal}
              value={buyerDetails.receivedAmount}
              onChange={(e) => {
                const val = e.target.value;
                setBuyerDetails({
                  ...buyerDetails,
                  receivedAmount: val,
                  billingType: Number(val) === 0 ? "Credit" : "Cash",
                });
              }}
              placeholder="0"
              className="w-full pl-7 pr-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 h-[38px]"
            />
          </div>
        </div>

        {/* Outstanding Balance Badge */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">
            Outstanding Due
          </span>
          <span className={`text-base font-black block ${outstanding > 0 ? "text-amber-600" : "text-slate-700"}`}>
            {formatINR(outstanding)}
          </span>
        </div>
      </div>
    </div>
  );
}

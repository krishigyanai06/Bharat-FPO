import React from "react";

export default function InvoiceSummary({ subtotal, taxAmount, grandTotal, receivedAmount, billingType }) {
  const balance = grandTotal - receivedAmount;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4 sticky top-6">
      <h3 className="font-bold text-gray-800 text-sm tracking-wide uppercase border-b border-gray-100 pb-3">
        Invoice Summary
      </h3>

      <div className="space-y-2.5 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="font-bold text-gray-800">
            ₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between">
          <span>GST / Tax Amount</span>
          <span className="font-bold text-gray-800">
            ₹{taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="border-t border-gray-100 my-2 pt-2 flex justify-between text-sm">
          <span className="font-bold text-gray-900">Grand Total</span>
          <span className="font-extrabold text-brand-600">
            ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Billing Type</span>
          <span className="font-bold text-gray-800 capitalize">{billingType || "Cash"}</span>
        </div>
        <div className="flex justify-between">
          <span>Received Amount</span>
          <span className="font-bold text-gray-800">
            ₹{Number(receivedAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="border-t border-gray-100 my-2 pt-2 flex justify-between">
          <span className="font-bold text-gray-900">Outstanding Balance</span>
          <span className={`font-bold ${balance > 0 ? "text-orange-600" : "text-gray-800"}`}>
            ₹{Math.max(0, balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { FileText, Upload } from "lucide-react";

export default function SummaryPaymentStep({
  parties = [],
  products = [],
  selectedParty,
  billingType,
  billNumber,
  billDate,
  stateOfSupply,
  purchaseType,
  dueDate,
  formatDate,
  items = [],
  formatPackSize,
  remarks,
  setRemarks,
  filePreview,
  uploadedFile,
  handleFileChange,
  handleRemoveFile,
  subTotal,
  totalDiscount,
  totalTax,
  grandTotal,
  paidAmount,
  unpaidAmount,
}) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
        {/* Header title */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <h3 className="font-extrabold text-slate-905 text-base uppercase tracking-wider">Purchase Summary Confirmation</h3>
          <span className="bg-[#DCFCE7] text-[#16A34A] px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
            {billingType === "Cash" ? "Cash Invoice" : "Credit Invoice"}
          </span>
        </div>

        {/* Top: Supplier vs Invoice details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50/50 p-5 rounded-2xl border border-slate-100 text-xs">
          {/* Supplier details card */}
          <div className="space-y-2">
            <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Supplier Information</div>
            {(() => {
              const vendor = parties.find((p) => p._id === selectedParty);
              return vendor ? (
                <div className="space-y-1.5 font-semibold text-slate-500">
                  <div className="font-black text-slate-800 text-sm leading-tight">{vendor.name}</div>
                  {vendor.phone && <div className="flex items-center gap-1.5 mt-1"><span>📞</span> {vendor.phone}</div>}
                  {vendor.email && <div className="flex items-center gap-1.5"><span>✉️</span> {vendor.email}</div>}
                  {vendor.state && <div className="flex items-center gap-1.5"><span>📍</span> {vendor.state}</div>}
                </div>
              ) : (
                <div className="font-bold text-slate-500">No party selected</div>
              );
            })()}
          </div>

          {/* Invoice metadata grid */}
          <div className="space-y-2">
            <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Invoice Overview</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-semibold text-slate-600">
              <div>Invoice Number:</div>
              <div className="font-bold text-slate-800">{billNumber || "Draft (Auto-generated)"}</div>
              <div>Bill Date:</div>
              <div className="text-slate-800 font-bold">{formatDate(billDate)}</div>
              <div>Supply State:</div>
              <div className="text-slate-800">{stateOfSupply}</div>
              <div>Purchase Type:</div>
              <div className="text-slate-800">{purchaseType === "BILL" ? "Purchase Bill" : "Purchase Order"}</div>
              {billingType === "Credit" && (
                <>
                  <div>Due Date:</div>
                  <div className="text-rose-600 font-bold">{formatDate(dueDate)}</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Middle: Compact Product Items List Table */}
        <div className="space-y-2">
          <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Product Items List</div>
          <div className="border border-slate-150 rounded-2xl overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-150 text-slate-500 font-bold uppercase text-[9px] bg-slate-50">
                  <th className="py-2.5 px-4">Item Details</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                  <th className="py-2.5 px-3 text-right">Discount</th>
                  <th className="py-2.5 px-3 text-right">GST Rate</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((line, idx) => {
                  const prod = products.find((p) => p._id === line.productId);
                  const categoryLabel = prod?.productCategory
                    ? prod.productCategory.charAt(0).toUpperCase() + prod.productCategory.slice(1)
                    : "General";
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{line.itemName || prod?.productName || "Product"}</span>
                          <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            {categoryLabel} • {formatPackSize(line.variantParameter, line.unit)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-700">{line.quantity}</td>
                      <td className="py-3 px-3 text-right text-slate-600">₹{parseFloat(line.pricePerUnit || 0).toFixed(2)}</td>
                      <td className="py-3 px-3 text-right text-rose-600 font-semibold">
                        {line.discountPercent > 0 ? `₹${line.discountAmount} (${line.discountPercent}%)` : "—"}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600">{line.taxPercent}% ({line.taxType})</td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-800">
                        ₹{parseFloat(line.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Left remarks/attachments vs Bottom Right billing summary card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          {/* Notes & File attachments */}
          <div className="space-y-4">
            {/* Remarks input */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 space-y-2">
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Transaction Remarks</label>
              <textarea
                rows={2}
                maxLength={250}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="batch details, transport costs, comments..."
                className="w-full border border-slate-200 hover:border-slate-350 focus:border-emerald-500 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 text-slate-800 transition-all font-semibold"
              />
            </div>

            {/* File upload drag & drop */}
            <div className="space-y-2">
              <label className="block text-[10px] text-slate-455 font-bold uppercase tracking-wider">Invoice Document Upload</label>
              <div className="border border-slate-200 border-dashed rounded-xl p-4 bg-slate-50/20 hover:bg-slate-50 transition cursor-pointer text-center flex flex-col items-center justify-center">
                {filePreview ? (
                  <div className="relative inline-block">
                    <div className="flex items-center gap-3">
                      {uploadedFile?.type?.startsWith("image/") || (typeof filePreview === "string" && !filePreview.endsWith(".pdf")) ? (
                        <img src={filePreview} alt="Invoice preview" className="max-h-16 rounded object-contain border border-slate-150 shadow-3xs" />
                      ) : (
                        <FileText className="w-8 h-8 text-emerald-600" />
                      )}
                      <div className="text-left">
                        <p className="text-xs text-slate-700 font-extrabold max-w-[150px] truncate">
                          {uploadedFile ? uploadedFile.name : "invoice_document.pdf"}
                        </p>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="text-[10px] text-rose-600 font-bold hover:underline mt-0.5 cursor-pointer"
                        >
                          Remove file
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer w-full h-full flex flex-col items-center py-1">
                    <Upload className="w-5 h-5 text-emerald-600 mb-1 pointer-events-none" />
                    <span className="text-xs text-slate-755 font-bold">Upload Invoice Document</span>
                    <span className="text-[9px] text-slate-400 mt-1">PDF, JPG, PNG (Max 5MB)</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Calculations Summary card */}
          <div className="bg-emerald-50/15 border border-emerald-100 rounded-2xl p-5 space-y-3 max-w-sm ml-auto w-full text-xs h-fit">
            <div className="flex items-center gap-1.5 pb-2 border-b border-emerald-100">
              <span className="text-emerald-700 font-extrabold text-[10px] uppercase tracking-wider">Billing Breakdown</span>
            </div>
            <div className="space-y-2.5 font-semibold text-slate-605">
              <div className="flex justify-between">
                <span>Subtotal (Base Price)</span>
                <span className="text-slate-800 font-bold">₹{subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-rose-650">
                  <span>Total Discount</span>
                  <span>-₹{totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Total GST Tax</span>
                <span>+₹{totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="border-t border-emerald-100 my-2.5 pt-3 flex justify-between font-black text-slate-850 items-baseline">
                <span className="text-sm">Grand Total</span>
                <span className="text-2xl text-[#16A34A] font-black">
                  ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {billingType === "Credit" && (
                <>
                  <div className="flex justify-between text-slate-500 pt-2 border-t border-slate-100">
                    <span>Amount Paid Now</span>
                    <span className="text-slate-805 font-bold">₹{parseFloat(paidAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-800 font-bold">
                    <span>Outstanding Balance Due</span>
                    <span className="text-rose-655 font-black">₹{unpaidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

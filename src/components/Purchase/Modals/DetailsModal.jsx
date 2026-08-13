import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { X, Paperclip, Download } from "lucide-react";
import api from "../../../lib/api";
import { resolveReturnItemLabel, resolveItemLabel } from "../utils/purchaseHelpers";

export default function DetailsModal({
  item,
  type,
  onClose,
  handleDownloadPurchaseReceipt,
  handleDownloadPaymentOutReceipt,
  handleDownloadPurchaseReturnReceipt,
}) {
  const { products } = useSelector((state) => state.inventory);
  const [linkedBill, setLinkedBill] = useState(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (type === "return" && item.purchase) {
      const billId = typeof item.purchase === 'object' ? item.purchase?._id : item.purchase;
      if (billId && billId.length === 24) {
        api.get(`/purchase/${billId}`)
          .then(res => {
            setLinkedBill(res.data?.data || res.data);
          })
          .catch(err => {
            console.error("Failed to load linked purchase bill details:", err);
          });
      }
    }
  }, [item, type]);

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const isImageFile = (fileUrl) => {
    if (!fileUrl) return false;
    const url = String(fileUrl).toLowerCase();
    if (url.includes(".pdf")) return false;
    return url.includes(".png") || url.includes(".jpg") || url.includes(".jpeg") || url.includes(".webp") || url.includes(".gif") || url.startsWith("data:image/");
  };

  const totalVal = item.totalAmount || 0;
  const billingTypeVal = item.billingType || "Credit";

  let paidVal = 0;
  let unpaidVal = 0;

  if (billingTypeVal === "Cash") {
    paidVal = totalVal;
    unpaidVal = 0;
  } else {
    if (item.paidAmount !== undefined && item.paidAmount !== null) {
      paidVal = item.paidAmount;
      unpaidVal = item.unpaidAmount !== undefined && item.unpaidAmount !== null ? item.unpaidAmount : Math.max(0, totalVal - paidVal);
    } else if (item.unpaidAmount !== undefined && item.unpaidAmount !== null) {
      unpaidVal = item.unpaidAmount;
      paidVal = Math.max(0, totalVal - unpaidVal);
    } else {
      paidVal = 0;
      unpaidVal = totalVal;
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-150 bg-white">
          <h2 className="text-lg font-bold text-gray-905">Transaction Details</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-gray-50/20 select-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border border-gray-150 p-4 rounded-xl shadow-xs">
            {type === "bill" && (
              <>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Invoice ID / Number</span>
                  <span className="font-bold text-gray-800 text-sm">{item.billNumber}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Supplier Vendor</span>
                  <span className="font-bold text-gray-800 text-sm">{item.party?.name || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Bill Date</span>
                  <span className="text-gray-650 text-xs font-semibold">{formatDate(item.billDate)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Payment Terms</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                      {item.billingType === "Cash" ? "Cash Bill" : "Credit"}
                    </span>
                    {item.purchaseType === "BILL" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-150">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Purchase Bill
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-150">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Purchase Order
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}

            {type === "payment" && (
              <>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Payment Receipt No</span>
                  <span className="font-bold text-gray-850 text-sm">{item.receiptNo}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Vendor Partner</span>
                  <span className="font-bold text-gray-800 text-sm">{item.party?.name || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Date Logged</span>
                  <span className="text-gray-650 text-xs font-semibold">{formatDate(item.date)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Total Amount Paid</span>
                  <span className="text-sm font-extrabold text-red-655">₹{item.paidAmount?.toLocaleString("en-IN")}</span>
                </div>
                <div className="md:col-span-2 border-t pt-3 mt-1">
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Payment Type / Origin</span>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {item.isAutoGenerated ? (
                      <>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-150">
                          Auto-Generated
                        </span>
                        {(item.linkedBill || item.linkedPurchaseBill || item.purchase) && (
                          <span className="text-xs text-gray-500">
                            Linked to Bill: <span className="font-mono font-bold text-gray-700">
                              {(item.linkedBill?.billNumber || item.linkedPurchaseBill?.billNumber || item.purchase?.billNumber ||
                                (typeof item.linkedBill === 'object' ? item.linkedBill?._id : item.linkedBill) ||
                                (typeof item.linkedPurchaseBill === 'object' ? item.linkedPurchaseBill?._id : item.linkedPurchaseBill) ||
                                (typeof item.purchase === 'object' ? item.purchase?._id : item.purchase))}
                            </span>
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-gray-150 text-gray-700 border border-gray-250">
                          Manual Payment (Pay Dues)
                        </span>
                        {(item.linkedBill || item.linkedPurchaseBill || item.purchase) && (
                          <span className="text-xs text-gray-500">
                            Applied to Bill: <span className="font-mono font-bold text-gray-700">
                              {(item.linkedBill?.billNumber || item.linkedPurchaseBill?.billNumber || item.purchase?.billNumber ||
                                (typeof item.linkedBill === 'object' ? item.linkedBill?._id : item.linkedBill) ||
                                (typeof item.linkedPurchaseBill === 'object' ? item.linkedPurchaseBill?._id : item.linkedPurchaseBill) ||
                                (typeof item.purchase === 'object' ? item.purchase?._id : item.purchase))}
                            </span>
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {type === "return" && (
              <>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Debit Note Voucher</span>
                  <span className="font-bold text-gray-900 text-sm">{item.returnNo}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Supplier Vendor</span>
                  <span className="font-bold text-gray-800 text-sm">{item.party?.name || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Return Date</span>
                  <span className="text-gray-650 text-xs font-semibold">{formatDate(item.returnDate)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Linked Original Purchase Invoice</span>
                  <span className="text-xs font-mono text-gray-700 bg-gray-105 px-2.5 py-0.5 rounded-full inline-block mt-0.5">{linkedBill?.billNumber || item.purchase?.billNumber || item.purchase || "N/A"}</span>
                </div>
              </>
            )}

            {type === "expense" && (
              <>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Expense Voucher No</span>
                  <span className="font-bold text-gray-950 text-sm">{item.expenseNo}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Expense Category</span>
                  <span className="font-bold text-brand-700 text-sm bg-brand-50 px-2.5 py-0.5 rounded-full inline-block mt-0.5">{item.expenseCategory}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Expense Date</span>
                  <span className="text-gray-650 text-xs font-semibold">{formatDate(item.billDate)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Settlement Method</span>
                  <span className="text-xs font-bold text-gray-700 bg-gray-105 px-2 py-0.5 rounded-full inline-block mt-0.5">{item.paymentType}</span>
                </div>
              </>
            )}
          </div>

          {(type === "bill" || type === "return" || type === "expense") && (
            <div className="bg-white border border-gray-150 rounded-xl shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/60 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Line Item</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3 text-right">Unit Price</th>
                    <th className="px-4 py-3 text-right">Discount</th>
                    <th className="px-4 py-3 text-right">GST Rate</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {item.items?.map((it, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-semibold text-gray-850">
                        {type === "return"
                          ? resolveReturnItemLabel(it, products, linkedBill)
                          : resolveItemLabel(it, products)
                        }
                      </td>
                      <td className="px-4 py-3 text-right">{it.quantity} {it.unit || "pcs"}</td>
                      <td className="px-4 py-3 text-right">₹{it.pricePerUnit?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right">
                        {it.discountPercent ? `${it.discountPercent}%` : `₹${it.discountAmount || 0}`}
                      </td>
                      <td className="px-4 py-3 text-right">{it.taxPercent || 0}% ({it.taxType || "Without Tax"})</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">₹{it.amount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {type === "payment" && (
            <div className="bg-white border border-gray-150 rounded-xl shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/60 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Payment Method</th>
                    <th className="px-4 py-3">Reference No</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                  {item.payments?.map((py, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 uppercase">{py.paymentType}</td>
                      <td className="px-4 py-3 font-mono text-gray-500">{py.referenceNo || "—"}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">₹{py.amount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {type === "bill" && (item.invoiceFile || item.image) && (() => {
            const fileUrl = item.invoiceFile?.url || item.image?.url || (typeof item.invoiceFile === 'string' ? item.invoiceFile : '') || (typeof item.image === 'string' ? item.image : '');
            if (!fileUrl) return null;
            return (
              <div className="bg-white border border-gray-150 p-4 rounded-xl shadow-xs space-y-2">
                <span className="block text-[10px] text-gray-400 font-semibold uppercase">Uploaded Bill Document</span>
                {isImageFile(fileUrl) && !imageError ? (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-fit cursor-zoom-in"
                  >
                    <img
                      src={fileUrl}
                      alt="Supplier Invoice Document"
                      onError={() => setImageError(true)}
                      className="max-h-64 rounded-lg object-contain border shadow-sm hover:opacity-90 transition"
                    />
                  </a>
                ) : (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-bold text-brand-700 bg-brand-50 px-4 py-2 border border-brand-200 rounded-lg hover:bg-brand-100"
                  >
                    <Paperclip className="w-4 h-4" />
                    Download/View Invoice Document
                  </a>
                )}
              </div>
            );
          })()}

          {(item.remarks || item.description) && (
            <div className="bg-white border border-gray-150 p-4 rounded-xl shadow-xs space-y-1">
              <span className="block text-[10px] text-gray-400 font-semibold uppercase">Notes / Descriptions</span>
              <p className="text-xs text-gray-600 whitespace-pre-wrap">{item.remarks || item.description}</p>
            </div>
          )}

          {(type === "bill" || type === "return" || type === "expense") && (
            <div className="flex flex-col items-end space-y-1.5 pr-2 text-xs w-full">
              <div className="flex justify-between w-64 text-gray-500">
                <span>Subtotal (Base value)</span>
                <span>₹{(item.subTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              {type === "bill" && (
                <>
                  <div className="flex justify-between w-64 text-gray-500">
                    <span>Paid Amount</span>
                    <span className="text-emerald-700 font-semibold">₹{paidVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between w-64 text-gray-500">
                    <span>Due Amount</span>
                    <span className="text-red-655 font-semibold">₹{unpaidVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between w-64 border-t border-gray-150 pt-2 font-extrabold text-sm text-gray-900">
                <span>Grand Total</span>
                <span>₹{totalVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
          {type === "bill" && (
            <button
              onClick={() => handleDownloadPurchaseReceipt(item._id)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-brand-500 text-brand-650 hover:bg-brand-50 font-bold rounded-lg text-xs transition bg-white cursor-pointer"
            >
              <Download size={13} /> Print/Download PDF
            </button>
          )}
          {type === "payment" && (
            <button
              onClick={() => handleDownloadPaymentOutReceipt(item._id)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-brand-500 text-brand-650 hover:bg-brand-50 font-bold rounded-lg text-xs transition bg-white cursor-pointer"
            >
              <Download size={13} /> Print/Download PDF
            </button>
          )}
          {type === "return" && (
            <button
              onClick={() => handleDownloadPurchaseReturnReceipt(item._id)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-brand-500 text-brand-650 hover:bg-brand-50 font-bold rounded-lg text-xs transition bg-white cursor-pointer"
            >
              <Download size={13} /> Print/Download PDF
            </button>
          )}
          <button
            onClick={onClose}
            className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-sm transition ml-auto cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}

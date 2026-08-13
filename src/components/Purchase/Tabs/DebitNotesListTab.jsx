import React from "react";
import { Eye, Download, Trash2 } from "lucide-react";
import { EmptyState, LinkedBillCell } from "../utils/purchaseHelpers";

export default function DebitNotesListTab({
  displayedReturns = [],
  getPartyName,
  formatDate,
  isReadOnly,
  handleOpenDetailModal,
  handleDownloadPurchaseReturnReceipt,
  setDeleteConfirmId,
  setDeleteConfirmType,
}) {
  return (
    <table className="w-full border-collapse text-left text-sm">
      <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-650 uppercase font-semibold">
        <tr>
          <th className="px-6 py-3">Debit Note #</th>
          <th className="px-6 py-3">Date</th>
          <th className="px-6 py-3">Party/Supplier</th>
          <th className="px-6 py-3">Linked Bill</th>
          <th className="px-6 py-3 text-right">Returned Amount</th>
          <th className="px-6 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {displayedReturns.length === 0 ? (
          <tr className="hover:bg-transparent">
            <td colSpan={6} className="px-6 py-16 text-center">
              <EmptyState
                title="No Purchase Returns Found"
                description="Log debit notes for returns of damaged inventory items, matching items directly with bills."
              />
            </td>
          </tr>
        ) : (
          displayedReturns.map((item) => (
            <tr key={item._id} className="hover:bg-gray-50 transition">
              <td className="px-6 py-2.5 font-bold text-gray-900">
                {item.returnNo || item._id.substring(0, 8).toUpperCase()}
              </td>
              <td className="px-6 py-2.5 text-gray-505 whitespace-nowrap">{formatDate(item.returnDate)}</td>
              <td className="px-6 py-2.5 font-semibold text-gray-805 truncate max-w-[220px]" title={getPartyName(item) || "Unknown Party"}>
                {getPartyName(item) || "Unknown Party"}
              </td>
              <td className="px-6 py-2.5 text-gray-505 font-mono text-xs">
                <LinkedBillCell billId={item.purchase} />
              </td>
              <td className="px-6 py-2.5 text-right font-extrabold text-red-655">
                ₹{(item.totalAmount || 0).toLocaleString("en-IN")}
              </td>
              <td className="px-6 py-2.5 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => handleOpenDetailModal(item, "return")}
                    className="p-2 text-gray-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition cursor-pointer"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDownloadPurchaseReturnReceipt(item._id)}
                    className="p-2 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                    title="Download Purchase Return PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  {!isReadOnly && (
                    <button
                      onClick={() => {
                        setDeleteConfirmId(item._id);
                        setDeleteConfirmType("return");
                      }}
                      className="p-2 text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                      title="Delete Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

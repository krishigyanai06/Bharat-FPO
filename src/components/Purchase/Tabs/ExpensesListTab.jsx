import React from "react";
import { Eye, Trash2 } from "lucide-react";
import { EmptyState } from "../utils/purchaseHelpers";

export default function ExpensesListTab({
  displayedExpenses = [],
  formatDate,
  isReadOnly,
  handleOpenDetailModal,
  setDeleteConfirmId,
  setDeleteConfirmType,
}) {
  return (
    <table className="w-full border-collapse text-left text-sm">
      <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-655 uppercase font-semibold">
        <tr>
          <th className="px-6 py-3">Expense No</th>
          <th className="px-6 py-3">Category</th>
          <th className="px-6 py-3">Date</th>
          <th className="px-6 py-3">Payment Method</th>
          <th className="px-6 py-3">GST Details</th>
          <th className="px-6 py-3 text-right">Total Amount</th>
          <th className="px-6 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {displayedExpenses.length === 0 ? (
          <tr className="hover:bg-transparent">
            <td colSpan={7} className="px-6 py-16 text-center">
              <EmptyState
                title="No Expenses Recorded"
                description="Log custom expenses (rent, stationery, services) with or without GST options."
              />
            </td>
          </tr>
        ) : (
          displayedExpenses.map((item) => (
            <tr key={item._id} className="hover:bg-gray-50 transition">
              <td className="px-6 py-2.5 font-bold text-gray-900">
                {item.expenseNo || item._id.substring(0, 8).toUpperCase()}
              </td>
              <td className="px-6 py-2.5 font-medium text-gray-800">{item.expenseCategory}</td>
              <td className="px-6 py-2.5 text-gray-505 whitespace-nowrap">{formatDate(item.billDate)}</td>
              <td className="px-6 py-2.5">
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700">
                  {item.paymentType}
                </span>
              </td>
              <td className="px-6 py-2.5">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  item.gstEnabled
                    ? "bg-purple-50 text-purple-705 border border-purple-100"
                    : "bg-gray-50 text-gray-400 border border-gray-250"
                }`}>
                  {item.gstEnabled ? "GST Enabled" : "Without GST"}
                </span>
              </td>
              <td className="px-6 py-2.5 text-right font-extrabold text-gray-950">
                ₹{(item.totalAmount || 0).toLocaleString("en-IN")}
              </td>
              <td className="px-6 py-2.5 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => handleOpenDetailModal(item, "expense")}
                    className="p-2 text-gray-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition cursor-pointer"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {!isReadOnly && (
                    <button
                      onClick={() => {
                        setDeleteConfirmId(item._id);
                        setDeleteConfirmType("expense");
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

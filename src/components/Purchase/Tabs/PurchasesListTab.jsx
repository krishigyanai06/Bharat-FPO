import React from "react";
import { MoreVertical } from "lucide-react";
import { EmptyState } from "../utils/purchaseHelpers";

export default function PurchasesListTab({
  displayedPurchases = [],
  getPartyName,
  formatDate,
  isReadOnly,
  activeMenuId,
  menuDirection,
  handleToggleMenu,
  setActiveMenuId,
  handleOpenDetailModal,
  handleDownloadPurchaseReceipt,
  handleConvertOrderToBill,
  setEditPaymentRecord,
  setPaymentModalOpen,
  setEditBillRecord,
  setBillModalOpen,
  setDeleteConfirmId,
  setDeleteConfirmType,
}) {
  return (
    <table className="w-full border-collapse text-left text-sm table-fixed">
      <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-655 uppercase font-semibold">
        <tr>
          <th className="px-3 py-3 w-[11%]">Bill Number</th>
          <th className="px-3 py-3 w-[24%]">Vendor</th>
          <th className="px-3 py-3 w-[10%]">Date</th>
          <th className="px-3 py-3 w-[11%]">Type</th>
          <th className="px-3 py-3 w-[10%] text-right">Total Amount</th>
          <th className="px-3 py-3 w-[10%] text-right">Paid Amount</th>
          <th className="px-3 py-3 w-[10%] text-right">Due Amount</th>
          <th className="px-3 py-3 w-[8%]">Status</th>
          <th className="px-3 py-3 w-[6%] text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {displayedPurchases.length === 0 ? (
          <tr className="hover:bg-transparent">
            <td colSpan={9} className="px-6 py-16 text-center">
              <EmptyState
                title="No Purchase Bills Found"
                description="Manage supplier invoices and procurement bills here to track item inventory and credits."
              />
            </td>
          </tr>
        ) : (
          displayedPurchases.map((item) => {
            const paid = item.paidAmount || 0;
            const unpaid = item.unpaidAmount || 0;
            return (
              <tr key={item._id} className="hover:bg-gray-50 transition">
                <td className="px-3 py-2.5 font-bold text-gray-900 truncate" title={item.billNumber || item._id.substring(0, 8).toUpperCase()}>
                  {item.billNumber || item._id.substring(0, 8).toUpperCase()}
                </td>
                <td className="px-3 py-2.5 font-semibold text-gray-805 truncate" title={getPartyName(item) || "Unknown Vendor"}>
                  {getPartyName(item) || "Unknown Vendor"}
                </td>
                <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                  {formatDate(item.billDate)}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border transition ${
                    item.purchaseType === "BILL"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-250"
                      : "bg-amber-50 text-amber-700 border-amber-250"
                  }`}>
                    {item.purchaseType === "BILL" ? "Purchase Bill" : "Purchase Order"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right font-bold text-gray-955 whitespace-nowrap">₹{(item.totalAmount || 0).toLocaleString("en-IN")}</td>
                <td className="px-3 py-2.5 text-right text-slate-700 whitespace-nowrap">₹{paid.toLocaleString("en-IN")}</td>
                <td className="px-3 py-2.5 text-right text-rose-600 font-semibold whitespace-nowrap">₹{unpaid.toLocaleString("en-IN")}</td>
                <td className="px-3 py-2.5">
                  {unpaid === 0 ? (
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                      Paid
                    </span>
                  ) : paid === 0 ? (
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-250">
                      Unpaid
                    </span>
                  ) : (
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-250">
                      Due
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <div className="relative inline-block text-left purchase-action-menu-container">
                    <button
                      onClick={(e) => handleToggleMenu(e, item._id)}
                      className="p-2 text-gray-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 active:scale-95 cursor-pointer"
                      aria-haspopup="true"
                      aria-expanded={activeMenuId === item._id ? "true" : "false"}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {activeMenuId === item._id && (
                      <div
                        className={`absolute right-0 z-50 w-[130px] bg-white rounded-2xl border border-slate-200 shadow-xl py-2 focus:outline-none animate-in fade-in zoom-in-95 duration-150 ${
                          menuDirection === "up" ? "bottom-full mb-2" : "top-full mt-2"
                        }`}
                        role="menu"
                      >
                        <div className="flex flex-col px-1">
                          <button
                            role="menuitem"
                            onClick={() => {
                              handleOpenDetailModal(item, "bill");
                              setActiveMenuId(null);
                            }}
                            className="w-full py-2 text-center text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                          >
                            View Bill
                          </button>

                          <button
                            role="menuitem"
                            onClick={() => {
                              handleDownloadPurchaseReceipt(item._id);
                              setActiveMenuId(null);
                            }}
                            className="w-full py-2 text-center text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                          >
                            Print Bill
                          </button>

                          <button
                            role="menuitem"
                            onClick={() => {
                              handleDownloadPurchaseReceipt(item._id);
                              setActiveMenuId(null);
                            }}
                            className="w-full py-2 text-center text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors leading-tight cursor-pointer"
                          >
                            Download<br />PDF
                          </button>

                          {item.purchaseType === "ORDER" && !isReadOnly && (
                            <button
                              role="menuitem"
                              onClick={() => {
                                handleConvertOrderToBill(item._id);
                                setActiveMenuId(null);
                              }}
                              className="w-full py-2 text-center text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                            >
                              Convert to Bill
                            </button>
                          )}

                          {unpaid > 0 && !isReadOnly && (
                            <button
                              role="menuitem"
                              onClick={() => {
                                setEditPaymentRecord({
                                  party: item.party?._id || item.party,
                                  linkedBill: item._id,
                                  linkedPurchaseBill: item._id,
                                  purchase: item._id,
                                  paidAmount: unpaid
                                });
                                setPaymentModalOpen(true);
                                setActiveMenuId(null);
                              }}
                              className="w-full py-2 text-center text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                            >
                              Pay Dues
                            </button>
                          )}

                          {!isReadOnly && (
                            <button
                              role="menuitem"
                              onClick={() => {
                                setEditBillRecord(item);
                                setBillModalOpen(true);
                                setActiveMenuId(null);
                              }}
                              className="w-full py-2 text-center text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                            >
                              Edit Purchase
                            </button>
                          )}

                          {!isReadOnly && (
                            <button
                              role="menuitem"
                              onClick={() => {
                                setDeleteConfirmId(item._id);
                                setDeleteConfirmType("bill");
                                setActiveMenuId(null);
                              }}
                              className="w-full py-2 text-center text-[13px] font-bold text-slate-950 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            >
                              Delete Purchase
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

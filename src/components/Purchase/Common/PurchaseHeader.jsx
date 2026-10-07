import React from "react";
import { Plus } from "lucide-react";
import { TABS } from "../utils/purchaseHelpers";

export default function PurchaseHeader({
  activeTab,
  isReadOnly,
  navigate,
  setCurrentPage,
  onOpenNewBill,
  onOpenRecordPayment,
  onOpenCreateReturn,
  onOpenExpenseModal,
  setEditBillRecord,
  setBillModalOpen,
  setEditPaymentRecord,
  setPaymentModalOpen,
  setReturnModalOpen,
  setExpenseModalOpen,
}) {
  const handleNewBill = () => {
    if (onOpenNewBill) {
      onOpenNewBill();
    } else if (setBillModalOpen) {
      if (setEditBillRecord) setEditBillRecord(null);
      setBillModalOpen(true);
    }
  };

  const handleRecordPayment = () => {
    if (onOpenRecordPayment) {
      onOpenRecordPayment();
    } else if (setPaymentModalOpen) {
      if (setEditPaymentRecord) setEditPaymentRecord(null);
      setPaymentModalOpen(true);
    }
  };

  const handleCreateReturn = () => {
    if (onOpenCreateReturn) {
      onOpenCreateReturn();
    } else if (setReturnModalOpen) {
      setReturnModalOpen(true);
    }
  };

  const handleExpenseModal = () => {
    if (onOpenExpenseModal) {
      onOpenExpenseModal();
    } else if (setExpenseModalOpen) {
      setExpenseModalOpen(true);
    }
  };

  return (
    <>
      {/* Header Title & Actions Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">Purchases Workspace</h1>
          <p className="text-sm text-gray-500">
            Manage vendor purchase bills, orders, cash payment outs, returns, and expense records
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {!isReadOnly && (
            <>
              {activeTab === "purchases" && (
                <button
                  type="button"
                  onClick={handleNewBill}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition shadow-sm active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  New Purchase
                </button>
              )}
              {activeTab === "payments" && (
                <button
                  type="button"
                  onClick={handleRecordPayment}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition shadow-sm active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Record Payment
                </button>
              )}
              {activeTab === "returns" && (
                <button
                  type="button"
                  onClick={handleCreateReturn}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-medium text-sm shadow-md hover:shadow-xl transition-all duration-300 active:scale-95 cursor-pointer"
                >
                  <Plus size={16} />
                  Create Return
                </button>
              )}
              {activeTab === "expenses" && (
                <button
                  type="button"
                  onClick={handleExpenseModal}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition shadow-sm active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Expense
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs Switcher Navigation Bar */}
      <div className="flex border-b border-gray-200">
        {TABS.map((t) => {
          const isSelected = activeTab === t.key;
          const TabIcon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                if (t.key === "purchases") navigate("/purchase");
                else if (t.key === "payments") navigate("/purchase/payments");
                else if (t.key === "returns") navigate("/purchase/debit-notes");
                else if (t.key === "expenses") navigate("/purchase/expenses");
                if (setCurrentPage) setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all duration-150 cursor-pointer ${
                isSelected
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
              }`}
            >
              <TabIcon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>
    </>
  );
}

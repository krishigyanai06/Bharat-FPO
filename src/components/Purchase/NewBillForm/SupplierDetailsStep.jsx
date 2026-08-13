import React from "react";
import {
  User,
  FileText,
  Plus,
  Hash,
  Calendar,
  CalendarCheck,
  Coins,
  CreditCard,
  IndianRupee,
} from "lucide-react";
import SearchableStateSelect from "../../SearchableStateSelect";
import { PAYMENT_TYPES } from "../utils/purchaseHelpers";

export default function SupplierDetailsStep({
  parties = [],
  selectedParty,
  setSelectedParty,
  setAddVendorOpen,
  stateOfSupply,
  setStateOfSupply,
  billNumber,
  setBillNumber,
  billDate,
  setBillDate,
  purchaseType,
  setPurchaseType,
  billingType,
  setBillingType,
  dueDate,
  setDueDate,
  paidAmount,
  setPaidAmount,
  paymentType,
  setPaymentType,
  referenceNo,
  setReferenceNo,
  grandTotal,
  errors = {},
  setErrors,
  partySelectRef,
  dueDateInputRef,
  paidAmountInputRef,
}) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 align-start divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          {/* Supplier Column */}
          <div className="space-y-4 pr-0 lg:pr-4">
            <h4 className="text-[11px] font-extrabold text-[#16A34A] uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <User className="w-4 h-4" />
              Supplier Details
            </h4>

            {/* Party Selector */}
            <div className="group">
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Party/Supplier *
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    ref={partySelectRef}
                    value={selectedParty}
                    onChange={(e) => {
                      setSelectedParty(e.target.value);
                      if (e.target.value) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.selectedParty;
                          return next;
                        });
                      }
                    }}
                    aria-invalid={errors.selectedParty ? "true" : "false"}
                    aria-describedby={errors.selectedParty ? "party-error" : undefined}
                    className={`pl-9 pr-8 w-full border rounded-xl text-xs focus:outline-none focus:ring-4 h-[40px] transition-all font-semibold cursor-pointer ${
                      errors.selectedParty
                        ? "border-[#EF4444] bg-[#FEF2F2] focus:ring-red-500/10 focus:border-[#EF4444]"
                        : "border-slate-200 hover:border-slate-350 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white text-slate-800"
                    }`}
                    required
                  >
                    <option value="">-- Choose Party --</option>
                    {parties.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                <button
                  type="button"
                  onClick={() => setAddVendorOpen(true)}
                  className="px-3 bg-emerald-50/40 hover:bg-emerald-50 text-emerald-600 border border-emerald-250 rounded-xl active:scale-95 transition-all h-[40px] flex items-center justify-center shrink-0 cursor-pointer"
                  title="Quick Add Vendor"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
              {errors.selectedParty && (
                <p id="party-error" className="text-xs text-[#DC2626] font-medium mt-1 select-none animate-in fade-in duration-200">
                  ⚠ {errors.selectedParty}
                </p>
              )}
            </div>

            {/* State of Supply */}
            <div className="group">
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                State of Supply
              </label>
              <SearchableStateSelect
                value={stateOfSupply}
                onChange={(val) => setStateOfSupply(val)}
              />
            </div>
          </div>

          {/* Invoice Column */}
          <div className="space-y-4 pt-4 lg:pt-0 pl-0 lg:pl-6 pr-0 lg:pr-4">
            <h4 className="text-[11px] font-extrabold text-[#16A34A] uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              Invoice Details
            </h4>

            {/* Invoice number */}
            <div className="group">
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Bill / Invoice Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  placeholder="PUR-2026-001"
                  className="pl-9 pr-3 w-full border border-slate-200 hover:border-slate-355 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-[#16A34A]/10 focus:border-[#16A34A] bg-white h-[40px] transition-all font-semibold text-slate-800"
                />
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Bill Date */}
            <div className="group">
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Bill Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="pl-9 pr-3 w-full border border-slate-200 hover:border-slate-355 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-[#16A34A]/10 focus:border-[#16A34A] bg-white h-[40px] cursor-pointer transition-all font-semibold text-slate-800"
                  required
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Purchase Type */}
            <div className="group">
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Purchase Type
              </label>
              <div className="flex gap-2.5 h-[40px]">
                <button
                  type="button"
                  onClick={() => setPurchaseType("ORDER")}
                  className={`flex-1 rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2 border cursor-pointer ${
                    purchaseType === "ORDER"
                      ? "bg-emerald-50/50 border-emerald-600 text-emerald-750 shadow-sm"
                      : "bg-slate-100/60 hover:bg-slate-100 border-transparent text-slate-500"
                  }`}
                >
                  <CalendarCheck className={`w-4 h-4 ${purchaseType === "ORDER" ? "text-emerald-600" : "text-slate-400"}`} />
                  Purchase Order
                </button>
                <button
                  type="button"
                  onClick={() => setPurchaseType("BILL")}
                  className={`flex-1 rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2 border cursor-pointer ${
                    purchaseType === "BILL"
                      ? "bg-emerald-50/50 border-emerald-600 text-emerald-750 shadow-sm"
                      : "bg-slate-100/60 hover:bg-slate-100 border-transparent text-slate-500"
                  }`}
                >
                  <FileText className={`w-4 h-4 ${purchaseType === "BILL" ? "text-emerald-600" : "text-slate-400"}`} />
                  Purchase Bill
                </button>
              </div>
            </div>
          </div>

          {/* Payment Column */}
          <div className="space-y-4 pt-4 lg:pt-0 pl-0 lg:pl-6">
            <h4 className="text-[11px] font-extrabold text-[#16A34A] uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <IndianRupee className="w-4 h-4" />
              Payment Details
            </h4>

            {/* Pay Mode Toggle */}
            <div className="group">
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Payment</label>
              <div className="flex gap-2.5 h-[40px]">
                <button
                  type="button"
                  onClick={() => setBillingType("Cash")}
                  className={`flex-1 rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2 border cursor-pointer ${
                    billingType === "Cash"
                      ? "bg-emerald-50/50 border-emerald-600 text-emerald-750 shadow-sm"
                      : "bg-slate-100/60 hover:bg-slate-100 border-transparent text-slate-500"
                  }`}
                >
                  <Coins className={`w-4 h-4 ${billingType === "Cash" ? "text-emerald-600" : "text-slate-400"}`} />
                  Cash Bill
                </button>
                <button
                  type="button"
                  onClick={() => setBillingType("Credit")}
                  className={`flex-1 rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2 border cursor-pointer ${
                    billingType === "Credit"
                      ? "bg-emerald-50/50 border-emerald-600 text-emerald-750 shadow-sm"
                      : "bg-slate-100/60 hover:bg-slate-100 border-transparent text-slate-500"
                  }`}
                >
                  <CreditCard className={`w-4 h-4 ${billingType === "Credit" ? "text-emerald-600" : "text-slate-400"}`} />
                  Credit
                </button>
              </div>
            </div>

            {/* Conditional Pay Later Fields */}
            {billingType === "Credit" ? (
              <>
                <div className="group animate-in fade-in duration-150">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Due Date *</label>
                  <div className="relative">
                    <input
                      type="date"
                      ref={dueDateInputRef}
                      value={dueDate}
                      onChange={(e) => {
                        setDueDate(e.target.value);
                        if (e.target.value) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.dueDate;
                            return next;
                          });
                        }
                      }}
                      aria-invalid={errors.dueDate ? "true" : "false"}
                      aria-describedby={errors.dueDate ? "due-date-error" : undefined}
                      className={`pl-9 pr-3 w-full border rounded-xl text-xs focus:outline-none focus:ring-4 h-[40px] cursor-pointer transition-all font-semibold ${
                        errors.dueDate
                          ? "border-[#EF4444] bg-[#FEF2F2] focus:ring-red-500/10 focus:border-[#EF4444] text-slate-800"
                          : "border-slate-200 hover:border-slate-350 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white text-slate-800"
                      }`}
                      required
                    />
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  {errors.dueDate && (
                    <p id="due-date-error" className="text-xs text-[#DC2626] font-medium mt-1 select-none animate-in fade-in duration-200">
                      ⚠ {errors.dueDate}
                    </p>
                  )}
                </div>

                <div className="group animate-in fade-in duration-150">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Amount Paid Now</label>
                  <div className="relative">
                    <input
                      type="number"
                      ref={paidAmountInputRef}
                      min="0"
                      value={paidAmount || ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? "" : parseFloat(e.target.value);
                        setPaidAmount(val === "" ? 0 : val);
                        if (val === "" || (val >= 0 && val <= grandTotal)) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.paidAmount;
                            return next;
                          });
                        }
                      }}
                      placeholder="₹0"
                      aria-invalid={errors.paidAmount ? "true" : "false"}
                      aria-describedby={errors.paidAmount ? "paid-amount-error" : undefined}
                      className={`pl-9 pr-3 w-full border rounded-xl text-xs focus:outline-none focus:ring-4 h-[40px] transition-all font-semibold ${
                        errors.paidAmount
                          ? "border-[#EF4444] bg-[#FEF2F2] focus:ring-red-500/10 focus:border-[#EF4444] text-slate-800"
                          : "border-slate-200 hover:border-slate-350 focus:ring-[#16A34A]/10 focus:border-[#16A34A] bg-white text-slate-800"
                      }`}
                    />
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  {errors.paidAmount && (
                    <p id="paid-amount-error" className="text-xs text-[#DC2626] font-medium mt-1 select-none animate-in fade-in duration-200">
                      ⚠ {errors.paidAmount}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="group animate-in fade-in duration-150">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Payment Mode</label>
                  <div className="relative">
                    <select
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value)}
                      className="pl-9 pr-8 w-full border border-slate-200 hover:border-slate-355 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[40px] cursor-pointer transition-all font-semibold text-slate-800"
                    >
                      {PAYMENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="group animate-in fade-in duration-150">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Reference No / Txn ID</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      placeholder="e.g. TXN123456"
                      className="pl-9 pr-3 w-full border border-slate-200 hover:border-slate-355 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[40px] transition-all font-semibold text-slate-800"
                    />
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </>
            )}

            {/* Paid portion under Pay Later mode */}
            {billingType === "Credit" && parseFloat(paidAmount) > 0 && (
              <>
                <div className="group animate-in fade-in duration-150">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Payment Mode</label>
                  <div className="relative">
                    <select
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value)}
                      className="pl-9 pr-8 w-full border border-slate-200 hover:border-slate-355 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[40px] cursor-pointer transition-all font-semibold text-slate-800"
                    >
                      {PAYMENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="group animate-in fade-in duration-150">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Reference No / Txn ID</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      placeholder="e.g. TXN123456"
                      className="pl-9 pr-3 w-full border border-slate-200 hover:border-slate-355 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white h-[40px] transition-all font-semibold text-slate-800"
                    />
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

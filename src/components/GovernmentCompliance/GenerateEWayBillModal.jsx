import React, { useState, useEffect } from "react";
import { AlertCircle, ArrowLeft, Loader2, ShieldCheck, Truck, HelpCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function GenerateEWayBillModal({
  isOpen,
  item,
  isB2B,
  irn,
  resolvedParty,
  onClose,
  onSubmit,
  loading,
  error
}) {
  const [step, setStep] = useState(1); // 1-Form, 2-Review, 3-Loading
  const [form, setForm] = useState({
    Distance: "",
    TransMode: "1",
    TransId: "",
    TransName: "",
    TrnDocNo: "",
    TrnDocDt: "",
    VehNo: "",
    VehType: "R",
  });
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      // Pre-fill defaults
      setForm({
        Distance: item.distance || item.eInvoiceInfo?.distance || "",
        TransMode: "1",
        TransId: "",
        TransName: "",
        TrnDocNo: "",
        TrnDocDt: "",
        VehNo: "",
        VehType: "R",
      });
      setStep(1);
      setValidationErrors({});
    }
  }, [isOpen, item]);

  if (!isOpen) return null;

  const validateStep1 = () => {
    const errs = {};
    if (!form.Distance) {
      errs.Distance = "Distance is required";
    } else if (Number(form.Distance) <= 0 || Number(form.Distance) > 4000) {
      errs.Distance = "Distance must be between 1 and 4000 KM";
    }

    if (form.VehNo) {
      const cleanVeh = form.VehNo.toUpperCase().replace(/\s/g, "");
      const vehRegex = /^[A-Z]{2}[0-9]{2}[A-Z]{0,2}[0-9]{4}$|^[A-Z]{2}[0-9]{2}[0-9]{4}$|^[0-9]{2}[A-Z]{2}[0-9]{4}$/;
      if (!vehRegex.test(cleanVeh)) {
        errs.VehNo = "Invalid Indian Vehicle Number format (e.g. KA51MC1234 or MH12AB1234)";
      }
    }

    if (form.TransId) {
      const cleanGstin = form.TransId.toUpperCase();
      if (cleanGstin.length !== 15) {
        errs.TransId = "Transporter GSTIN must be exactly 15 characters";
      }
    }

    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
    } else {
      toast.error("Please correct the highlighted validation errors.");
    }
  };

  const handleGenerate = async () => {
    setStep(3); // Enter verbose loading state
    try {
      await onSubmit(form);
    } catch (e) {
      // Keep modal open, set step to 1 (with pre-entered data)
      setStep(1);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-xs font-sans">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col mx-4 animate-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-150 bg-gray-50/50 flex justify-between items-center">
          <div>
            <h4 className="font-bold text-gray-900 text-sm tracking-wide uppercase">Generate E-Way Bill</h4>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">
              {step === 1 && "Step 1: Transport Logistics Details"}
              {step === 2 && "Step 2: Review & Submit Confirmation"}
              {step === 3 && "Step 3: Portal API Registration"}
            </p>
          </div>
          {step !== 3 && (
            <button 
              type="button" 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer text-sm font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Form Details (Step 1) */}
        {step === 1 && (
          <div className="p-5 space-y-4 flex-1 overflow-y-auto max-h-[70vh]">
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                  Distance (in KM) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={4000}
                  value={form.Distance}
                  onChange={(e) => setForm({ ...form, Distance: e.target.value })}
                  placeholder="e.g. 250"
                  className={`w-full border px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 ${
                    validationErrors.Distance ? "border-rose-450" : "border-gray-205"
                  }`}
                />
                {validationErrors.Distance && (
                  <p className="text-[9px] text-rose-600 font-bold mt-1">{validationErrors.Distance}</p>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                  Transport Mode *
                </label>
                <select
                  value={form.TransMode}
                  onChange={(e) => setForm({ ...form, TransMode: e.target.value })}
                  className="w-full border border-gray-250 bg-white px-3 py-2 rounded-xl text-xs focus:outline-none"
                >
                  <option value="1">Road</option>
                  <option value="2">Rail</option>
                  <option value="3">Air</option>
                  <option value="4">Ship</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                  Transporter GSTIN / ID
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={form.TransId}
                  onChange={(e) => setForm({ ...form, TransId: e.target.value.toUpperCase() })}
                  placeholder="e.g. 27AAACQ3770E004"
                  className={`w-full border px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono ${
                    validationErrors.TransId ? "border-rose-450" : "border-gray-205"
                  }`}
                />
                {validationErrors.TransId && (
                  <p className="text-[9px] text-rose-600 font-bold mt-1">{validationErrors.TransId}</p>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                  Transporter Name
                </label>
                <input
                  type="text"
                  value={form.TransName}
                  onChange={(e) => setForm({ ...form, TransName: e.target.value })}
                  placeholder="e.g. XYZ Logistics"
                  className="w-full border border-gray-205 px-3 py-2 rounded-xl text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                  Transport Doc Number
                </label>
                <input
                  type="text"
                  value={form.TrnDocNo}
                  onChange={(e) => setForm({ ...form, TrnDocNo: e.target.value })}
                  placeholder="e.g. LR-1002"
                  className="w-full border border-gray-205 px-3 py-2 rounded-xl text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                  Transport Doc Date
                </label>
                <input
                  type="date"
                  value={form.TrnDocDt}
                  onChange={(e) => setForm({ ...form, TrnDocDt: e.target.value })}
                  className="w-full border border-gray-205 px-3 py-2 rounded-xl text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  value={form.VehNo}
                  onChange={(e) => setForm({ ...form, VehNo: e.target.value.toUpperCase().replace(/\s/g, "") })}
                  placeholder="e.g. KA51MC1234"
                  className={`w-full border px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono ${
                    validationErrors.VehNo ? "border-rose-450" : "border-gray-205"
                  }`}
                />
                {validationErrors.VehNo && (
                  <p className="text-[9px] text-rose-600 font-bold mt-1">{validationErrors.VehNo}</p>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                  Vehicle Type
                </label>
                <select
                  value={form.VehType}
                  onChange={(e) => setForm({ ...form, VehType: e.target.value })}
                  className="w-full border border-gray-250 bg-white px-3 py-2 rounded-xl text-xs focus:outline-none"
                >
                  <option value="R">Regular</option>
                  <option value="O">Over Dimensional Cargo (ODC)</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-800 leading-relaxed font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">E-Way Bill Generation Failed</p>
                  <p className="text-[11px] text-rose-700 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg text-xs transition border-0 cursor-pointer shadow-sm"
              >
                Continue to Review →
              </button>
            </div>
          </div>
        )}

        {/* Review details (Step 2) */}
        {step === 2 && (
          <div className="p-5 space-y-4 flex-1">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-150 space-y-3">
              <h5 className="font-bold text-gray-900 text-xs tracking-wider uppercase border-b border-gray-200 pb-1.5">
                Government Submission Review
              </h5>
              
              <div className="grid grid-cols-2 gap-3 text-xs leading-relaxed">
                <div>
                  <span className="text-gray-400 font-semibold block text-[10px]">Invoice Number</span>
                  <p className="font-bold text-gray-800">{item.invoiceNo || "—"}</p>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold block text-[10px]">Customer / FPO Buyer</span>
                  <p className="font-bold text-gray-800">{resolvedParty?.name || item.buyerName || "Walk-in"}</p>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold block text-[10px]">Invoice Total Amount</span>
                  <p className="font-bold text-gray-800">₹{(item.totalAmount || 0).toLocaleString()}</p>
                </div>
                {isB2B && irn && (
                  <div>
                    <span className="text-gray-400 font-semibold block text-[10px]">Government IRN</span>
                    <p className="font-bold text-gray-800 font-mono truncate max-w-[150px]">{irn}</p>
                  </div>
                )}
                <div>
                  <span className="text-gray-400 font-semibold block text-[10px]">Transport Distance</span>
                  <p className="font-bold text-gray-800">{form.Distance} KM</p>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold block text-[10px]">Vehicle Number</span>
                  <p className="font-bold text-gray-800 font-mono">{form.VehNo || "—"}</p>
                </div>
                {form.TransName && (
                  <div className="col-span-2">
                    <span className="text-gray-400 font-semibold block text-[10px]">Transporter details</span>
                    <p className="font-bold text-gray-800">
                      {form.TransName} {form.TransId ? `(GSTIN: ${form.TransId})` : ""}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Warning confirmation box */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-[11px] text-amber-850 leading-relaxed font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Generate Government E-Way Bill?</strong>
                <p className="text-[10px] text-amber-700 mt-0.5 leading-relaxed font-medium">
                  This action will submit a live record to the official GST NIC portal. Please confirm that all logistics and vehicle values are correct.
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-gray-200 text-gray-700 font-bold rounded-lg text-xs transition bg-white hover:bg-gray-50 cursor-pointer"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition border-0 cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                ⚡ Register E-Way Bill
              </button>
            </div>
          </div>
        )}

        {/* Verbose Generating Loader (Step 3) */}
        {step === 3 && (
          <div className="p-8 flex flex-col items-center justify-center space-y-5 flex-1 select-none">
            <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
            <div className="text-center space-y-1">
              <h5 className="font-bold text-gray-900 text-sm">Generating E-Way Bill...</h5>
              <p className="text-[11px] text-gray-400 font-semibold">Please don't close this window.</p>
            </div>
            <div className="w-full max-w-xs bg-gray-50 border border-gray-150 rounded-xl p-4 text-[10px] text-gray-500 font-semibold space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-600">
                <ShieldCheck className="w-4 h-4" />
                <span>✓ Validating data entries</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-600 animate-pulse">
                <div className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin"></div>
                <span>Connecting to NIC Portal Gateway...</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

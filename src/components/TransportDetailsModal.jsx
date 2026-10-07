import React, { useState, useEffect } from "react";
import { X, Truck, Landmark, Calendar, FileText, Navigation, ArrowRight } from "lucide-react";

export default function TransportDetailsModal({
  isOpen,
  onClose,
  onSubmit,
  submitLoading,
  initialValues = {}
}) {
  const [form, setForm] = useState({
    Distance: "",
    TransMode: "1", // 1-Road, 2-Rail, 3-Air, 4-Ship
    TransId: "", // Transporter GSTIN
    TransName: "", // Transporter Name
    TrnDocNo: "", // Document Number
    TrnDocDt: "", // Document Date (DD/MM/YYYY)
    VehNo: "", // Vehicle Number
    VehType: "R", // R-Regular, O-Over Dimensional Cargo
  });

  useEffect(() => {
    if (isOpen) {
      setForm({
        Distance: initialValues?.Distance || initialValues?.distance || "",
        TransMode: initialValues?.TransMode || "1",
        TransId: initialValues?.TransId || "",
        TransName: initialValues?.TransName || "",
        TrnDocNo: initialValues?.TrnDocNo || "",
        TrnDocDt: initialValues?.TrnDocDt || "",
        VehNo: initialValues?.VehNo || "",
        VehType: initialValues?.VehType || "R",
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Format distance to integer
    const payload = {
      ...form,
      Distance: Number(form.Distance) || 0,
    };
    
    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-gray-150 overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-5 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-700">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Transport / Vehicle Details</h3>
              <p className="text-xs text-gray-500 mt-0.5">Provide logistical details for E-Way Bill generation.</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-xl transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-y-auto">
          <div className="p-6 space-y-5 flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Distance */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-gray-400" />
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
                  className="w-full border border-gray-205 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
                />
              </div>

              {/* Trans Mode */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Transport Mode *
                </label>
                <select
                  value={form.TransMode}
                  onChange={(e) => setForm({ ...form, TransMode: e.target.value })}
                  className="w-full border border-gray-205 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
                >
                  <option value="1">Road</option>
                  <option value="2">Rail</option>
                  <option value="3">Air</option>
                  <option value="4">Ship</option>
                </select>
              </div>

              {/* Transporter GSTIN */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-gray-400" />
                  Transporter GSTIN
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={form.TransId}
                  onChange={(e) => setForm({ ...form, TransId: e.target.value.toUpperCase() })}
                  placeholder="e.g. 27AAACQ3770E004"
                  className="w-full border border-gray-205 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
                />
              </div>

              {/* Transporter Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Transporter Name
                </label>
                <input
                  type="text"
                  value={form.TransName}
                  onChange={(e) => setForm({ ...form, TransName: e.target.value })}
                  placeholder="e.g. XYZ Transport"
                  className="w-full border border-gray-205 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
                />
              </div>

              {/* Doc Number */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-gray-400" />
                  Doc/Challan/Lorry No
                </label>
                <input
                  type="text"
                  value={form.TrnDocNo}
                  onChange={(e) => setForm({ ...form, TrnDocNo: e.target.value })}
                  placeholder="e.g. TR-10023"
                  className="w-full border border-gray-205 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
                />
              </div>

              {/* Doc Date */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  Doc Date (DD/MM/YYYY)
                </label>
                <input
                  type="text"
                  value={form.TrnDocDt}
                  onChange={(e) => setForm({ ...form, TrnDocDt: e.target.value })}
                  placeholder="DD/MM/YYYY (e.g. 29/06/2026)"
                  className="w-full border border-gray-205 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
                />
              </div>

              {/* Vehicle Number */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-gray-400" />
                  Vehicle Number
                </label>
                <input
                  type="text"
                  value={form.VehNo}
                  onChange={(e) => setForm({ ...form, VehNo: e.target.value.toUpperCase().replace(/\s/g, '') })}
                  placeholder="e.g. KA51MC1234"
                  className="w-full border border-gray-205 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
                />
              </div>

              {/* Vehicle Type */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Vehicle Type
                </label>
                <select
                  value={form.VehType}
                  onChange={(e) => setForm({ ...form, VehType: e.target.value })}
                  className="w-full border border-gray-205 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
                >
                  <option value="R">Regular</option>
                  <option value="O">Over Dimensional Cargo (ODC)</option>
                </select>
              </div>

            </div>

            <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3.5 text-[11px] text-amber-800 leading-relaxed">
              <strong>💡 Validation Tip:</strong> Either **Vehicle Number** or **Transporter GSTIN** is mandatory. If you do not have your own vehicle, provide the transporter's GSTIN so they can assign a vehicle later.
            </div>
          </div>

          {/* Footer Actions */}
          <div className="border-t border-gray-100 p-4 bg-gray-50 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={submitLoading}
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-205 text-gray-700 hover:bg-gray-100 text-sm font-semibold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitLoading}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white text-sm font-semibold rounded-xl transition shadow-sm select-none"
            >
              {submitLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0"></div>
                  Submitting to Portal...
                </>
              ) : (
                <>
                  Proceed
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { generateProcurementEWayBill } from "../../redux/procurementSaleThunk";
import { authenticateEWayBillSession } from "../../store/thunks/eWayBillThunk";
import { isEWayBillSessionValid } from "../../lib/api";
import { Truck, X, ShieldCheck, Loader2, CheckCircle2, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { VEHICLE_TYPES, TRANSPORT_MODES, STATE_CODES } from "./procurementSaleHelpers";

export default function EWayBillModal({ sale, onClose, onSuccess }) {
  const dispatch = useDispatch();

  const [isAuthenticated, setIsAuthenticated] = useState(() => isEWayBillSessionValid());
  const [showAuthForm, setShowAuthForm] = useState(!isAuthenticated);

  const [authForm, setAuthForm] = useState({ username: "", password: "", gstin: "" });
  const [ewbLoading, setEwbLoading] = useState(false);
  const [ewbError, setEwbError] = useState(null);

  const [ewbForm, setEwbForm] = useState({
    hsnCode: "1001",
    toPlace: sale?.address || sale?.buyer?.address || "Delivery Yard",
    toPincode: "400001",
    toStateCode: "27",
    vehicleType: "R", // Regular -> R
    transMode: "1", // Road -> 1
  });

  const handleNICAuth = async (e) => {
    e.preventDefault();
    try {
      setEwbLoading(true);
      setEwbError(null);
      await dispatch(authenticateEWayBillSession(authForm)).unwrap();
      toast.success("Authenticated with NIC portal successfully!");
      setIsAuthenticated(true);
      setShowAuthForm(false);
    } catch (err) {
      setEwbError(err || "NIC Authentication failed");
      toast.error(err || "NIC Authentication failed");
    } finally {
      setEwbLoading(false);
    }
  };

  const handleGenerateEWayBill = async (e) => {
    e.preventDefault();
    const token = sessionStorage.getItem("ewaybill_token");
    if (!token) {
      toast.error("Session expired. Please re-authenticate.");
      setIsAuthenticated(false);
      setShowAuthForm(true);
      return;
    }

    const payload = {
      hsnCode: ewbForm.hsnCode,
      toPlace: ewbForm.toPlace,
      toPincode: Number(ewbForm.toPincode),
      toStateCode: Number(ewbForm.toStateCode),
      vehicleType: ewbForm.vehicleType,
      transMode: ewbForm.transMode,
    };

    try {
      setEwbLoading(true);
      setEwbError(null);
      const updated = await dispatch(
        generateProcurementEWayBill({
          id: sale._id,
          body: payload,
          token,
        })
      ).unwrap();
      toast.success("E-Way Bill generated successfully!");
      if (onSuccess) onSuccess(updated);
      onClose();
    } catch (err) {
      setEwbError(err || "E-Way Bill generation failed");
      toast.error(err || "E-Way Bill generation failed");
    } finally {
      setEwbLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shadow-3xs">
              <Truck size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Generate E-Way Bill</h2>
              <p className="text-xs text-slate-500 font-semibold">
                Invoice: {sale?.invoiceNumber || sale?.invoiceNo || sale?._id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* NIC Portal Auth Form if session is expired */}
          {showAuthForm ? (
            <form onSubmit={handleNICAuth} className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1 text-xs text-amber-800">
                <span className="font-extrabold flex items-center gap-1.5">
                  <Lock size={14} /> NIC E-Way Bill Credentials Required
                </span>
                <p className="font-semibold text-amber-700">
                  Authenticate with NIC e-way bill sandbox credentials to generate compliance transit document.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">
                    GSTIN Number
                  </label>
                  <input
                    type="text"
                    required
                    value={authForm.gstin}
                    onChange={(e) => setAuthForm({ ...authForm, gstin: e.target.value.toUpperCase() })}
                    placeholder="27AAAAA0000A1Z5"
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">
                    NIC Username
                  </label>
                  <input
                    type="text"
                    required
                    value={authForm.username}
                    onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                    placeholder="e.g. NIC_USER_101"
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">
                    NIC Password
                  </label>
                  <input
                    type="password"
                    required
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {ewbError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
                  {ewbError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={ewbLoading}
                  className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {ewbLoading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                  <span>Authenticate NIC Portal</span>
                </button>
              </div>
            </form>
          ) : (
            /* E-Way Bill Form */
            <form onSubmit={handleGenerateEWayBill} className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 font-extrabold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> NIC Portal Session Active
                </span>
                <button
                  type="button"
                  onClick={() => setShowAuthForm(true)}
                  className="text-[10px] text-emerald-700 underline font-bold cursor-pointer"
                >
                  Re-Authenticate
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">
                    HSN Code
                  </label>
                  <input
                    type="text"
                    value={ewbForm.hsnCode}
                    onChange={(e) => setEwbForm({ ...ewbForm, hsnCode: e.target.value })}
                    placeholder="e.g. 1001"
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">
                    Delivery Place
                  </label>
                  <input
                    type="text"
                    value={ewbForm.toPlace}
                    onChange={(e) => setEwbForm({ ...ewbForm, toPlace: e.target.value })}
                    placeholder="e.g. Mumbai Yard"
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">
                    Destination Pincode
                  </label>
                  <input
                    type="number"
                    value={ewbForm.toPincode}
                    onChange={(e) => setEwbForm({ ...ewbForm, toPincode: e.target.value })}
                    placeholder="400001"
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">
                    Destination State
                  </label>
                  <select
                    value={ewbForm.toStateCode}
                    onChange={(e) => setEwbForm({ ...ewbForm, toStateCode: e.target.value })}
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer bg-white"
                  >
                    {STATE_CODES.map((st) => (
                      <option key={st.code} value={st.code}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={ewbForm.vehicleType}
                    onChange={(e) => setEwbForm({ ...ewbForm, vehicleType: e.target.value })}
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer bg-white"
                  >
                    {VEHICLE_TYPES.map((vt) => (
                      <option key={vt.value} value={vt.value}>
                        {vt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">
                    Transport Mode
                  </label>
                  <select
                    value={ewbForm.transMode}
                    onChange={(e) => setEwbForm({ ...ewbForm, transMode: e.target.value })}
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer bg-white"
                  >
                    {TRANSPORT_MODES.map((tm) => (
                      <option key={tm.value} value={tm.value}>
                        {tm.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {ewbError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
                  {ewbError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ewbLoading}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {ewbLoading ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
                  <span>Generate E-Way Bill</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

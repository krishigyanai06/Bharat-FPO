import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { authenticateEWayBillSession } from "../../store/thunks/eWayBillThunk";
import { generateProcurementEWayBill } from "../../redux/procurementSaleThunk";
import { isEWayBillSessionValid } from "../../lib/api";
import { AlertCircle, Loader2, ShieldCheck, Download, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

export default function GovernmentComplianceCard({ sale, onGenerated }) {
  const dispatch = useDispatch();
  const { sessionLoading, sessionError } = useSelector((s) => s.eWayBill);
  const { ewayBillLoading, ewayBillError } = useSelector((s) => s.procurementSales);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authForm, setAuthForm] = useState({ username: "", password: "", gstin: "" });
  const [showAuthForm, setShowAuthForm] = useState(false);

  const [form, setForm] = useState({
    hsnCode: "1006",
    toPlace: "",
    toPincode: "",
    toStateCode: "27",
    vehicleType: "R",
    transMode: "1",
  });

  const checkSession = () => {
    const valid = isEWayBillSessionValid();
    setIsAuthenticated(valid);
    if (!valid) {
      setShowAuthForm(true);
    } else {
      setShowAuthForm(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, [sale]);

  const handleNICAuth = async (e) => {
    e.preventDefault();
    try {
      await dispatch(authenticateEWayBillSession(authForm)).unwrap();
      toast.success("Authenticated with NIC portal successfully!");
      setIsAuthenticated(true);
      setShowAuthForm(false);
    } catch (err) {
      toast.error(err || "NIC Authentication failed");
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    const token = sessionStorage.getItem("ewaybill_token");
    if (!token) {
      toast.error("Please login to the NIC portal first.");
      checkSession();
      return;
    }

    const payload = {
      hsnCode: form.hsnCode,
      toPlace: form.toPlace,
      toPincode: Number(form.toPincode),
      toStateCode: Number(form.toStateCode),
      vehicleType: form.vehicleType,
      transMode: form.transMode,
    };

    try {
      const updatedSale = await dispatch(
        generateProcurementEWayBill({
          id: sale._id,
          body: payload,
          token,
        })
      ).unwrap();
      toast.success("E-Way Bill registered successfully!");
      if (onGenerated) onGenerated(updatedSale);
    } catch (err) {
      toast.error(err || "E-Way Bill generation failed");
    }
  };

  const activeEwb = sale?.eWayBill || sale?.ewayBill;
  const activeEwbNo = activeEwb?.ewbNo || sale?.ewayBillNo || sale?.eWayBillNo;
  const hasEwb = !!activeEwbNo;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b border-gray-100 pb-3">
        <h3 className="font-bold text-gray-800 text-sm tracking-wide uppercase">
          Government e-Way Bill Compliance
        </h3>
        {hasEwb ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
            Generated
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700">
            Pending
          </span>
        )}
      </div>

      {hasEwb ? (
        <div className="space-y-4">
          <div className="bg-green-50/50 border border-green-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-green-700">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <span className="text-xs font-bold">Official e-Way Bill Registered</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-400 font-semibold block text-[10px]">EWB Number</span>
                <p className="font-bold text-gray-800">{activeEwbNo}</p>
              </div>
              <div>
                <span className="text-gray-400 font-semibold block text-[10px]">Generation Date</span>
                <p className="font-bold text-gray-800">
                  {activeEwb?.ewbDate || activeEwb?.ewayBillDate || sale?.ewayBillDate || "—"}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400 font-semibold block text-[10px]">Validity</span>
                <p className="font-bold text-gray-800">{activeEwb?.validUpto || "—"}</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              toast.success("Downloading PDF slip...");
              // Trigger simple text blob download as mockup or open sandbox PDF if returned
              const slipText = `E-Way Bill: ${activeEwbNo}\nDate: ${activeEwb?.ewbDate || ""}\nValidity: ${activeEwb?.validUpto || ""}`;
              const blob = new Blob([slipText], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `EWayBill_${activeEwbNo}.txt`;
              a.click();
            }}
            className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Download size={14} /> Download EWB Details
          </button>
        </div>
      ) : showAuthForm ? (
        <form onSubmit={handleNICAuth} className="space-y-4 bg-gray-50 p-4 border border-gray-150 rounded-xl">
          <p className="text-[10px] text-gray-500 font-semibold">
            🔐 Session expired. Log into government Sandbox portal to generate E-Way Bills.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                NIC Portal Username
              </label>
              <input
                type="text"
                required
                value={authForm.username}
                onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                placeholder="e.g. nic_user"
                className="w-full border border-gray-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                NIC Portal Password
              </label>
              <input
                type="password"
                required
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                placeholder="••••••••"
                className="w-full border border-gray-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                FPO Taxpayer GSTIN
              </label>
              <input
                type="text"
                required
                maxLength={15}
                value={authForm.gstin}
                onChange={(e) => setAuthForm({ ...authForm, gstin: e.target.value.toUpperCase() })}
                placeholder="e.g. 29AAACQ3770E005"
                className="w-full border border-gray-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none font-mono"
              />
            </div>
          </div>
          {sessionError && (
            <div className="bg-red-50 border border-red-150 p-2.5 rounded-lg flex items-start gap-2 text-[10px] text-red-700 leading-normal font-semibold">
              <AlertCircle size={12} className="shrink-0 mt-0.5 text-red-500" />
              <span>{sessionError}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={sessionLoading}
            className="w-full py-2 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {sessionLoading && <Loader2 size={12} className="animate-spin" />}
            Connect NIC Sandbox Portal
          </button>
        </form>
      ) : (
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                HSN Code
              </label>
              <input
                type="text"
                required
                value={form.hsnCode}
                onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
                placeholder="e.g. 1006"
                className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                Destination Place
              </label>
              <input
                type="text"
                required
                value={form.toPlace}
                onChange={(e) => setForm({ ...form, toPlace: e.target.value })}
                placeholder="e.g. Mandi Yard"
                className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                Destination Pincode
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={form.toPincode}
                onChange={(e) => setForm({ ...form, toPincode: e.target.value.replace(/\D/g, "") })}
                placeholder="e.g. 400001"
                className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                State Code
              </label>
              <input
                type="text"
                required
                maxLength={2}
                value={form.toStateCode}
                onChange={(e) => setForm({ ...form, toStateCode: e.target.value.replace(/\D/g, "") })}
                placeholder="e.g. 27"
                className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                Vehicle Type
              </label>
              <select
                value={form.vehicleType}
                onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                className="w-full border border-gray-200 bg-white px-3 py-2 rounded-xl text-xs focus:outline-none"
              >
                <option value="R">Regular</option>
                <option value="O">Over Dimensional</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                Transport Mode
              </label>
              <select
                value={form.transMode}
                onChange={(e) => setForm({ ...form, transMode: e.target.value })}
                className="w-full border border-gray-200 bg-white px-3 py-2 rounded-xl text-xs focus:outline-none"
              >
                <option value="1">Road</option>
                <option value="2">Rail</option>
                <option value="3">Air</option>
                <option value="4">Ship</option>
              </select>
            </div>
          </div>

          {ewayBillError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-xs text-red-800 leading-relaxed font-semibold">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">E-Way Bill Generation Failed</p>
                <p className="text-[11px] text-red-700 mt-0.5">{ewayBillError}</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={ewayBillLoading}
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {ewayBillLoading && <Loader2 size={12} className="animate-spin" />}
              ⚡ Generate E-Way Bill
            </button>
            <button
              type="button"
              onClick={() => setShowAuthForm(true)}
              className="py-2 px-3 border border-gray-200 hover:bg-gray-50 text-gray-500 font-semibold rounded-xl text-xs cursor-pointer"
            >
              Reset Session
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

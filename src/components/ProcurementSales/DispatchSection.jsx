import React from "react";
import { Truck } from "lucide-react";
import { VEHICLE_REGEX } from "./procurementSaleHelpers";

export default function DispatchSection({
  dispatchDetails,
  setDispatchDetails,
}) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Truck size={15} />
          </div>
          <span>D. Dispatch & Logistics Details</span>
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
            Transporter Name
          </label>
          <input
            type="text"
            value={dispatchDetails.transporterName}
            onChange={(e) => setDispatchDetails({ ...dispatchDetails, transporterName: e.target.value })}
            placeholder="e.g. VRL Logistics"
            className="w-full border border-slate-200 bg-white px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 h-[38px]"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
            Transporter ID / GSTIN
          </label>
          <input
            type="text"
            value={dispatchDetails.transporterId}
            onChange={(e) => setDispatchDetails({ ...dispatchDetails, transporterId: e.target.value.toUpperCase() })}
            placeholder="e.g. 27AAAAA0000A1Z5"
            className="w-full border border-slate-200 bg-white px-3 py-2 rounded-xl text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 uppercase h-[38px]"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
            Vehicle Number
          </label>
          <input
            type="text"
            value={dispatchDetails.vehicleNo}
            onChange={(e) => setDispatchDetails({ ...dispatchDetails, vehicleNo: e.target.value })}
            placeholder="e.g. MH-12-AB-1234"
            className="w-full border border-slate-200 bg-white px-3 py-2 rounded-xl text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 uppercase h-[38px]"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
            Distance (KM)
          </label>
          <input
            type="number"
            min={0}
            value={dispatchDetails.distance}
            onChange={(e) => setDispatchDetails({ ...dispatchDetails, distance: e.target.value })}
            placeholder="e.g. 180"
            className="w-full border border-slate-200 bg-white px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 h-[38px]"
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
          Dispatch Remarks / Special Instructions
        </label>
        <textarea
          rows={2}
          value={dispatchDetails.remarks}
          onChange={(e) => setDispatchDetails({ ...dispatchDetails, remarks: e.target.value })}
          placeholder="e.g. Deliver before Saturday morning, handle moisture protection..."
          className="w-full border border-slate-200 bg-white px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 resize-none"
        />
      </div>
    </div>
  );
}

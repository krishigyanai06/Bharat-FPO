import { Truck } from "lucide-react";

export default function DispatchCard({ dispatchDetails, onChange }) {
  const handleInputChange = (field, value) => {
    onChange({
      ...dispatchDetails,
      [field]: value,
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5">
      <div className="flex justify-between items-center border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-brand-600" />
          <h3 className="font-bold text-gray-800 text-sm tracking-wide uppercase">Step 3: Dispatch Details</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Transporter Name */}
        <div>
          <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">
            Transporter Name
          </label>
          <input
            type="text"
            value={dispatchDetails.transporterName || ""}
            onChange={(e) => handleInputChange("transporterName", e.target.value)}
            placeholder="e.g. VRL Logistics"
            className="w-full border border-gray-200 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Transporter ID */}
        <div>
          <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">
            Transporter ID (GSTIN)
          </label>
          <input
            type="text"
            maxLength={15}
            value={dispatchDetails.transporterId || ""}
            onChange={(e) => handleInputChange("transporterId", e.target.value.toUpperCase())}
            placeholder="e.g. 27AAAAA1111A1Z1"
            className="w-full border border-gray-200 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-brand-500 font-mono"
          />
        </div>

        {/* Vehicle Number */}
        <div>
          <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">
            Vehicle Number
          </label>
          <input
            type="text"
            value={dispatchDetails.vehicleNo || ""}
            onChange={(e) => handleInputChange("vehicleNo", e.target.value.toUpperCase().replace(/\s/g, ""))}
            placeholder="e.g. MH12AB1234"
            className="w-full border border-gray-200 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-brand-500 font-mono"
          />
        </div>

        {/* Distance */}
        <div>
          <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">
            Distance (in KM)
          </label>
          <input
            type="number"
            min={1}
            max={4000}
            value={dispatchDetails.distance || ""}
            onChange={(e) => handleInputChange("distance", Number(e.target.value) || "")}
            placeholder="e.g. 250"
            className="w-full border border-gray-200 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Remarks */}
        <div className="col-span-1 md:col-span-2">
          <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">
            Remarks / Delivery Instructions
          </label>
          <textarea
            rows={2}
            value={dispatchDetails.remarks || ""}
            onChange={(e) => handleInputChange("remarks", e.target.value)}
            placeholder="Add any specific shipping notes or delivery deadlines..."
            className="w-full border border-gray-200 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>
    </div>
  );
}

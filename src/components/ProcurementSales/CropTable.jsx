import { Trash2, AlertCircle } from "lucide-react";

export default function CropTable({ crops, onChange }) {
  const handleRowChange = (index, field, value) => {
    const updated = crops.map((c, idx) => {
      if (idx !== index) return c;
      const updatedVal = field === "quantity" || field === "rate" ? Number(value) || 0 : value;
      return {
        ...c,
        [field]: updatedVal,
        amount: field === "quantity" ? updatedVal * c.rate : field === "rate" ? c.quantity * updatedVal : c.quantity * c.rate,
      };
    });
    onChange(updated);
  };

  const handleRemove = (index) => {
    const updated = crops.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b border-gray-100 pb-3">
        <h3 className="font-bold text-gray-800 text-sm tracking-wide uppercase">Step 2: Crop Selection</h3>
        <span className="text-[10px] text-gray-400 font-semibold">{crops.length} rows selected</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-150">
            <tr className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              <th className="px-4 py-2.5 text-left">Crop</th>
              <th className="px-4 py-2.5 text-left">Variety</th>
              <th className="px-4 py-2.5 text-left">Godown</th>
              <th className="px-4 py-2.5 text-right w-28">Qty</th>
              <th className="px-4 py-2.5 text-right w-28">Rate (₹)</th>
              <th className="px-4 py-2.5 text-right w-32">Amount (₹)</th>
              <th className="px-4 py-2.5 text-center w-16">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {crops.map((c, index) => {
              const isOverStock = c.quantity > c.availableQuantity;
              return (
                <tr key={index} className="hover:bg-gray-50/50 transition">
                  <td className="px-4 py-3 font-semibold text-gray-700">{c.cropName}</td>
                  <td className="px-4 py-3 text-gray-500 font-semibold">{c.variety || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 font-semibold">{c.godown || "—"}</td>
                  
                  {/* Quantity Input */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2 py-1 bg-white focus-within:border-brand-500">
                        <input
                          type="number"
                          min={0.01}
                          step="any"
                          value={c.quantity}
                          onChange={(e) => handleRowChange(index, "quantity", e.target.value)}
                          className="w-16 text-right focus:outline-none font-bold text-xs"
                        />
                        <span className="text-[10px] text-gray-400 font-semibold">{c.unit || "qtl"}</span>
                      </div>
                      <span className="text-[9px] text-gray-400 mt-1 font-semibold">
                        Max: {c.availableQuantity} {c.unit || "qtl"}
                      </span>
                      {isOverStock && (
                        <span className="text-[9px] text-red-500 font-bold flex items-center gap-0.5 mt-0.5 animate-pulse">
                          <AlertCircle size={9} /> Exceeds stock
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Rate Input */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-1 bg-white focus-within:border-brand-500 ml-auto w-24">
                      <span className="text-gray-400 font-semibold">₹</span>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={c.rate}
                        onChange={(e) => handleRowChange(index, "rate", e.target.value)}
                        className="w-full text-right focus:outline-none font-bold text-xs"
                      />
                    </div>
                  </td>

                  {/* Amount Cell */}
                  <td className="px-4 py-3 text-right font-bold text-gray-800">
                    ₹{(c.quantity * c.rate).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {crops.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400 select-none font-semibold">
                  No crops added. Search and select above to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

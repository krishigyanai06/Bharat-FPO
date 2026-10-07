import React from "react";
import { Sprout, PlusCircle, Trash2, AlertCircle, PackageCheck } from "lucide-react";
import { formatINR } from "./procurementSaleHelpers";

export default function CropItemsSection({
  crops = [],
  setCrops,
  stock = [],
}) {
  const addCropRow = () => {
    setCrops([
      ...crops,
      {
        cropName: "",
        variety: "",
        godown: "",
        unit: "qtl",
        quantity: "",
        rate: "",
        gstPercent: 0,
        availableQuantity: 0,
      },
    ]);
  };

  const removeCropRow = (index) => {
    setCrops(crops.filter((_, i) => i !== index));
  };

  const handleSelectStockItem = (index, stockId) => {
    const selected = stock.find((s) => String(s._id) === String(stockId));
    if (!selected) return;

    const updated = crops.map((c, i) => {
      if (i !== index) return c;
      return {
        ...c,
        cropName: selected.cropName || "",
        variety: selected.variety || "",
        godown: selected.godown || "Main Godown",
        unit: selected.unit || "qtl",
        rate: selected.rate !== undefined && selected.rate !== null ? String(selected.rate) : c.rate,
        availableQuantity: Number(selected.availableQuantity) || Number(selected.quantity) || 0,
      };
    });

    setCrops(updated);
  };

  const handleRowChange = (index, field, value) => {
    const updated = crops.map((c, i) => {
      if (i !== index) return c;

      const nextRow = { ...c, [field]: value };

      // If user changes cropName, variety, or godown, look up updated available stock
      if (field === "cropName" || field === "godown" || field === "variety") {
        const matchStock = stock.find(
          (s) =>
            (s.cropName || "").toLowerCase() === (nextRow.cropName || "").toLowerCase() &&
            (s.godown || "").toLowerCase() === (nextRow.godown || "").toLowerCase()
        );
        if (matchStock) {
          nextRow.availableQuantity = Number(matchStock.availableQuantity) || Number(matchStock.quantity) || 0;
          if (!nextRow.unit) nextRow.unit = matchStock.unit || "qtl";
          if (!nextRow.rate && matchStock.rate) nextRow.rate = String(matchStock.rate);
        }
      }

      return nextRow;
    });

    setCrops(updated);
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <Sprout size={15} />
          </div>
          <span>B. Crop Stock Dispatches</span>
        </h3>
        <button
          type="button"
          onClick={addCropRow}
          className="text-brand-650 hover:text-brand-800 text-xs font-bold flex items-center gap-1.5 border border-brand-200 bg-brand-50/60 px-3.5 py-1.5 rounded-xl transition active:scale-95 cursor-pointer shadow-3xs"
        >
          <PlusCircle size={14} /> Add Crop
        </button>
      </div>

      <div className="space-y-4">
        {/* Header Titles */}
        <div className="grid grid-cols-12 gap-2 text-[10px] text-slate-450 uppercase tracking-wider font-extrabold select-none border-b border-slate-100 pb-2 px-1">
          <div className="col-span-3">Crop Name</div>
          <div className="col-span-2">Variety</div>
          <div className="col-span-2">Godown</div>
          <div className="col-span-2 text-right">Sale Qty</div>
          <div className="col-span-2 text-right">Rate (₹)</div>
          <div className="col-span-1 text-right">Total</div>
        </div>

        {crops.map((row, idx) => {
          // Look up matching available stock from live stock prop
          const match = stock.find(
            (s) =>
              (s.cropName || "").toLowerCase() === (row.cropName || "").toLowerCase() &&
              (s.godown || "").toLowerCase() === (row.godown || "").toLowerCase()
          );
          const rawAvail = match
            ? Number(match.availableQuantity) || Number(match.quantity) || 0
            : Number(row.availableQuantity) || 0;

          // Round cleanly to avoid JS floating point numbers like 1250.0000000000005
          const availQty = Math.round(rawAvail * 100) / 100;

          const isOverStock = Number(row.quantity) > availQty && availQty > 0;
          const lineSubtotal = (Number(row.quantity) || 0) * (Number(row.rate) || 0);

          return (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border transition space-y-2.5 ${
                isOverStock
                  ? "border-rose-300 bg-rose-50/40"
                  : "border-slate-200/80 bg-slate-50/40 hover:border-slate-300"
              }`}
            >
              {/* Optional Stock Selector Dropdown */}
              {stock.length > 0 && (
                <div className="flex items-center gap-2 pb-1 border-b border-slate-200/50">
                  <PackageCheck size={13} className="text-brand-600" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Select from Available Stock:
                  </span>
                  <select
                    onChange={(e) => handleSelectStockItem(idx, e.target.value)}
                    className="text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                  >
                    <option value="">-- Choose Stock Item --</option>
                    {stock.map((st) => (
                      <option key={st._id} value={st._id}>
                        {st.cropName} {st.variety ? `(${st.variety})` : ""} · {st.godown} (Available: {Math.round((st.availableQuantity || 0) * 100) / 100} {st.unit || "qtl"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-12 gap-2 items-center">
                {/* Crop Name */}
                <div className="col-span-3">
                  <input
                    type="text"
                    value={row.cropName}
                    onChange={(e) => handleRowChange(idx, "cropName", e.target.value)}
                    placeholder="e.g. Wheat"
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                {/* Variety */}
                <div className="col-span-2">
                  <input
                    type="text"
                    value={row.variety}
                    onChange={(e) => handleRowChange(idx, "variety", e.target.value)}
                    placeholder="e.g. Sharbati"
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                {/* Godown */}
                <div className="col-span-2">
                  <input
                    type="text"
                    value={row.godown}
                    onChange={(e) => handleRowChange(idx, "godown", e.target.value)}
                    placeholder="e.g. Main Godown"
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                {/* Sale Quantity */}
                <div className="col-span-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0.01}
                      step="any"
                      placeholder="0.00"
                      value={row.quantity}
                      onChange={(e) => handleRowChange(idx, "quantity", e.target.value)}
                      className={`w-full border px-2.5 py-2 rounded-xl text-right font-bold text-xs focus:outline-none focus:ring-2 ${
                        isOverStock
                          ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50 text-rose-900"
                          : "border-slate-200 bg-white text-slate-900 focus:ring-brand-500"
                      }`}
                    />
                    <select
                      value={row.unit || "qtl"}
                      onChange={(e) => handleRowChange(idx, "unit", e.target.value)}
                      className="text-[10px] font-bold border border-slate-200 bg-white rounded-lg px-1 py-1.5 text-slate-600 focus:outline-none cursor-pointer"
                    >
                      <option value="qtl">qtl</option>
                      <option value="Kg">Kg</option>
                    </select>
                  </div>
                </div>

                {/* Rate */}
                <div className="col-span-2">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="0"
                    value={row.rate}
                    onChange={(e) => handleRowChange(idx, "rate", e.target.value)}
                    className="w-full border border-slate-200 bg-white px-2.5 py-2 rounded-xl text-right font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                {/* Line Total & Remove */}
                <div className="col-span-1 flex items-center justify-end gap-1">
                  <span className="text-xs font-black text-slate-900">{formatINR(lineSubtotal)}</span>
                  {crops.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCropRow(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                      title="Remove Row"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Stock Indicator Line */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-[11px]">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="text-slate-400">Available Stock:</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {availQty > 0 ? `${availQty} ${row.unit || "qtl"}` : "0 qtl"}
                  </span>
                </div>

                {isOverStock && (
                  <span className="text-rose-600 font-extrabold flex items-center gap-1">
                    <AlertCircle size={12} /> Sale quantity cannot exceed available stock!
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

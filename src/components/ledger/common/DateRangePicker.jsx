import React, { useRef } from "react";
import { Calendar } from "lucide-react";

/**
 * Compact ERP Date Range Picker Component
 * - Ultra-compact, elegant layout.
 * - Clickable anywhere: clicking anywhere on the date pill opens the date picker calendar immediately.
 */
export default function DateRangePicker({
  fromDate,
  toDate,
  onFromChange,
  onToChange,
  label = "Date Range",
}) {
  const fromRef = useRef(null);
  const toRef = useRef(null);

  const handlePreset = (type) => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    if (type === "TODAY") {
      onFromChange(todayStr);
      onToChange(todayStr);
    } else if (type === "THIS_MONTH") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      onFromChange(firstDay.toISOString().split("T")[0]);
      onToChange(todayStr);
    } else if (type === "LAST_30") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      onFromChange(d.toISOString().split("T")[0]);
      onToChange(todayStr);
    } else if (type === "ALL") {
      onFromChange("");
      onToChange("");
    }
  };

  const openPicker = (ref) => {
    if (ref.current) {
      try {
        if (typeof ref.current.showPicker === "function") {
          ref.current.showPicker();
        } else {
          ref.current.focus();
        }
      } catch (err) {
        ref.current.focus();
      }
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
        <Calendar className="w-3.5 h-3.5 text-brand-600" />
        {label}:
      </span>

      {/* Date Range Inputs Box - Compact & Clickable Anywhere */}
      <div className="flex items-center gap-1.5 bg-gray-50 p-1 border border-gray-200 rounded-xl shadow-2xs">
        {/* From Date Pill */}
        <div
          onClick={() => openPicker(fromRef)}
          className="relative flex items-center bg-white border border-gray-200 rounded-lg px-2.5 py-1 cursor-pointer hover:border-brand-400 hover:bg-brand-50/40 transition group"
        >
          <input
            ref={fromRef}
            type="date"
            value={fromDate}
            onChange={(e) => onFromChange(e.target.value)}
            className="w-full text-xs font-semibold text-gray-800 bg-transparent focus:outline-none cursor-pointer"
          />
        </div>

        <span className="text-gray-400 font-bold text-[10px] px-0.5">→</span>

        {/* To Date Pill */}
        <div
          onClick={() => openPicker(toRef)}
          className="relative flex items-center bg-white border border-gray-200 rounded-lg px-2.5 py-1 cursor-pointer hover:border-brand-400 hover:bg-brand-50/40 transition group"
        >
          <input
            ref={toRef}
            type="date"
            value={toDate}
            onChange={(e) => onToChange(e.target.value)}
            className="w-full text-xs font-semibold text-gray-800 bg-transparent focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* Quick Presets */}
      <div className="flex items-center gap-1 text-[10px] bg-gray-100 p-1 rounded-lg border border-gray-200">
        <button
          type="button"
          onClick={() => handlePreset("TODAY")}
          className="px-1.5 py-0.5 rounded text-gray-600 hover:text-brand-700 hover:bg-white font-medium transition cursor-pointer"
        >
          Today
        </button>
        <span className="text-gray-300">·</span>
        <button
          type="button"
          onClick={() => handlePreset("THIS_MONTH")}
          className="px-1.5 py-0.5 rounded text-gray-600 hover:text-brand-700 hover:bg-white font-medium transition cursor-pointer"
        >
          This Month
        </button>
        <span className="text-gray-300">·</span>
        <button
          type="button"
          onClick={() => handlePreset("LAST_30")}
          className="px-1.5 py-0.5 rounded text-gray-600 hover:text-brand-700 hover:bg-white font-medium transition cursor-pointer"
        >
          30 Days
        </button>
        {(fromDate || toDate) && (
          <>
            <span className="text-gray-300">·</span>
            <button
              type="button"
              onClick={() => handlePreset("ALL")}
              className="px-1.5 py-0.5 rounded text-red-600 hover:bg-white font-bold transition cursor-pointer"
            >
              Clear
            </button>
          </>
        )}
      </div>
    </div>
  );
}

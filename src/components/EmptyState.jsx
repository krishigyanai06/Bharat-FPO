import React from "react";
import { Inbox, RotateCcw } from "lucide-react";

/**
 * Global reusable EmptyState component
 */
export default function EmptyState({
  title = "No Records Found",
  description = "There are no items to display in this list.",
  onAction,
  actionLabel = "Reset Filters",
  icon: Icon = Inbox
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-150 shadow-sm p-12 flex flex-col items-center justify-center text-center max-w-lg mx-auto my-6 transition-all duration-300">
      <div className="p-4 bg-gray-50 rounded-2xl text-gray-400 mb-4 border border-gray-100">
        <Icon className="w-10 h-10 stroke-[1.5]" />
      </div>
      <h3 className="text-base font-bold text-gray-900 tracking-tight mb-1">
        {title}
      </h3>
      <p className="text-xs text-gray-500 font-medium max-w-sm leading-relaxed mb-6">
        {description}
      </p>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all duration-150 active:scale-95 cursor-pointer shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

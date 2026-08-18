import React, { useState, useEffect } from "react";
import { SlidersHorizontal, X, RefreshCw } from "lucide-react";
import TenantTargetingSelector from "../TenantTargetingSelector";
import toast from "react-hot-toast";

export default function EditTargetingModal({
  isOpen,
  poster,
  availableTenants = [],
  isUpdating = false,
  onClose,
  onSave,
}) {
  const [visibleToAll, setVisibleToAll] = useState(true);
  const [selectedTenantIds, setSelectedTenantIds] = useState([]);

  useEffect(() => {
    if (poster) {
      setVisibleToAll(poster.visibleToAll !== false);
      const existing = poster.visibleToTenants || [];
      const ids = existing.map((t) => (typeof t === "string" ? t : t._id || t.id));
      setSelectedTenantIds(ids);
    }
  }, [poster]);

  if (!isOpen || !poster) return null;

  const handleSave = () => {
    if (!visibleToAll && selectedTenantIds.length === 0) {
      return toast.error("Please select at least one tenant or set visible to all");
    }

    onSave({
      id: poster.parentId || poster.id || poster._id,
      visibleToAll,
      visibleToTenants: visibleToAll ? [] : selectedTenantIds,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Edit Poster Targeting
              </h3>
              <p className="text-[11px] text-gray-400">
                Poster ID: {poster.parentId || poster.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="overflow-y-auto flex-1 pr-1">
          <TenantTargetingSelector
            visibleToAll={visibleToAll}
            onChangeVisibleToAll={setVisibleToAll}
            selectedTenantIds={selectedTenantIds}
            onToggleTenant={(tId) => {
              setSelectedTenantIds((prev) =>
                prev.includes(tId)
                  ? prev.filter((id) => id !== tId)
                  : [...prev, tId]
              );
            }}
            onSelectAll={() =>
              setSelectedTenantIds(availableTenants.map((t) => t._id || t.id))
            }
            onClearAll={() => setSelectedTenantIds([])}
            availableTenants={availableTenants}
          />
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isUpdating}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isUpdating}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Targeting</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

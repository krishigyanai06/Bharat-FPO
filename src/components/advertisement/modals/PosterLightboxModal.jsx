import React from "react";
import { Crown, Sprout, Download, X } from "lucide-react";

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

export default function PosterLightboxModal({
  poster,
  isSuperAdmin,
  onClose,
}) {
  if (!poster) return null;

  const isSuper = poster.type === "superadmin" || isSuperAdmin;

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {isSuper ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                <Crown className="w-3.5 h-3.5 text-purple-600" />
                Super Admin Broadcast Poster
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                FPO Local Poster
              </span>
            )}
            {poster.createdAt && (
              <span className="text-xs text-gray-500">
                • {formatDate(poster.createdAt)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={poster.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
              title="Open original"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY (IMAGE) */}
        <div className="p-4 bg-gray-950 flex items-center justify-center overflow-auto flex-1 max-h-[75vh]">
          <img
            src={poster.url}
            alt="Poster Preview"
            className="max-h-full max-w-full object-contain rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}

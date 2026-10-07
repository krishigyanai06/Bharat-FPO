import React from "react";
import {
  Crown,
  Sprout,
  Globe,
  Building2,
  Maximize2,
  SlidersHorizontal,
  Copy,
  Check,
  Trash2,
  Calendar,
} from "lucide-react";

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

export default function AdvertisementCard({
  poster,
  isSuperAdmin,
  canManage,
  onLightbox,
  onEditTargeting,
  onDelete,
  onCopyLink,
  isCopied,
}) {
  const isSuper = poster.type === "superadmin" || isSuperAdmin;
  const isGlobal = poster.visibleToAll !== false;
  const tenantCount = (poster.visibleToTenants || []).length;

  return (
    <div className="group bg-white rounded-2xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden">
      {/* IMAGE CONTAINER */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden flex items-center justify-center">
        <img
          src={poster.url}
          alt={poster.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* TOP BADGES */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1.5 items-start">
          {isSuper ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-900/85 backdrop-blur-md text-white shadow-xs">
              <Crown className="w-3 h-3 text-yellow-300" />
              Super Admin
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-900/85 backdrop-blur-md text-white shadow-xs">
              <Sprout className="w-3 h-3 text-emerald-300" />
              FPO Local
            </span>
          )}

          {/* TARGETING PILL (FOR SUPER ADMIN POSTER) */}
          {isSuper && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold backdrop-blur-md shadow-xs ${
                isGlobal
                  ? "bg-emerald-800/85 text-emerald-100"
                  : "bg-blue-800/85 text-blue-100"
              }`}
            >
              {isGlobal ? (
                <>
                  <Globe className="w-2.5 h-2.5 text-emerald-300" />
                  All Tenants
                </>
              ) : (
                <>
                  <Building2 className="w-2.5 h-2.5 text-blue-300" />
                  {tenantCount} Tenant{tenantCount > 1 ? "s" : ""}
                </>
              )}
            </span>
          )}
        </div>

        {/* HOVER ACTION OVERLAY */}
        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 p-3">
          <button
            type="button"
            onClick={() => onLightbox(poster)}
            className="w-9 h-9 bg-white/90 hover:bg-white text-gray-800 rounded-xl flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer"
            title="View Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => onEditTargeting(poster)}
              className="w-9 h-9 bg-white/90 hover:bg-white text-purple-700 rounded-xl flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer"
              title="Edit Target Tenants"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onCopyLink(poster.url, poster.id)}
            className="w-9 h-9 bg-white/90 hover:bg-white text-gray-800 rounded-xl flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer"
            title="Copy Image URL"
          >
            {isCopied ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          {canManage && (
            <button
              type="button"
              onClick={() => onDelete(poster.parentId || poster.id)}
              className="w-9 h-9 bg-red-600/90 hover:bg-red-600 text-white rounded-xl flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer"
              title="Delete Poster"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* METADATA FOOTER */}
      <div className="p-3.5 flex flex-col justify-between flex-1 bg-white">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1 text-[11px] font-medium text-gray-400">
              <Calendar className="w-3 h-3 text-gray-400" />
              {formatDate(poster.createdAt) || "Recent"}
            </span>
            <span className="text-[10px] text-gray-400 font-mono">
              ID: {poster.parentId ? String(poster.parentId).slice(-6) : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

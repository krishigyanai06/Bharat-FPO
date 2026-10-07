import React from "react";
import { Crown, Sprout, ImagePlus, Upload } from "lucide-react";
import AdvertisementCard from "./AdvertisementCard";

export default function AdvertisementGallery({
  posters = [],
  loading = false,
  activeFilter = "all",
  onFilterChange,
  isSuperAdmin,
  canManage,
  stats = { total: 0, superAdmin: 0, fpo: 0 },
  onOpenLightbox,
  onOpenEditTargeting,
  onRequestDelete,
  onCopyLink,
  copiedId,
  onTriggerUpload,
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs space-y-6">
      {/* SEGMENTED FILTER CONTROLS (FOR FPO ADMIN VIEW) */}
      {!isSuperAdmin && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Poster Gallery
            </h2>
            <p className="text-xs text-gray-500">
              Browse, inspect, and manage active posters
            </p>
          </div>

          <div className="inline-flex p-1 bg-gray-100/80 rounded-xl border border-gray-200/60 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => onFilterChange("all")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFilter === "all"
                  ? "bg-white text-gray-900 shadow-2xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <span>All Posters</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-100 text-gray-700">
                {stats.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onFilterChange("superadmin")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFilter === "superadmin"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Crown className="w-3 h-3" />
              <span>Super Admin</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeFilter === "superadmin"
                    ? "bg-purple-700 text-purple-100"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {stats.superAdmin}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onFilterChange("fpo")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFilter === "fpo"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Sprout className="w-3 h-3" />
              <span>FPO Local</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeFilter === "fpo"
                    ? "bg-emerald-700 text-emerald-100"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {stats.fpo}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* SUPER ADMIN VIEW HEADER */}
      {isSuperAdmin && (
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              SuperAdmin Uploaded Posters
            </h2>
            <p className="text-xs text-gray-500">
              Total {posters.length} active platform poster(s)
            </p>
          </div>
        </div>
      )}

      {/* POSTERS GRID OR SKELETON */}
      {loading && posters.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200/70 bg-white p-3 space-y-3 shadow-2xs animate-pulse"
            >
              <div className="aspect-[4/3] bg-gray-100 rounded-xl" />
              <div className="h-4 bg-gray-100 rounded-md w-3/4" />
              <div className="h-3 bg-gray-100 rounded-md w-1/2" />
            </div>
          ))}
        </div>
      ) : posters.length === 0 ? (
        /* EMPTY STATE */
        <div className="text-center py-16 px-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 border ${
              isSuperAdmin
                ? "bg-purple-50 text-purple-600 border-purple-100"
                : "bg-emerald-50 text-emerald-600 border-emerald-100"
            }`}
          >
            <ImagePlus className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-800">
            No Posters Found
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
            {isSuperAdmin
              ? "No SuperAdmin advertisement posters uploaded yet. Upload your first campaign poster above."
              : "No advertisement posters found for this view."}
          </p>
          {canManage && onTriggerUpload && (
            <button
              type="button"
              onClick={onTriggerUpload}
              className={`mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer ${
                isSuperAdmin
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload First Poster</span>
            </button>
          )}
        </div>
      ) : (
        /* POSTERS LIST */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {posters.map((poster) => (
            <AdvertisementCard
              key={poster.id}
              poster={poster}
              isSuperAdmin={isSuperAdmin}
              canManage={canManage}
              onLightbox={onOpenLightbox}
              onEditTargeting={onOpenEditTargeting}
              onDelete={onRequestDelete}
              onCopyLink={onCopyLink}
              isCopied={copiedId === poster.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

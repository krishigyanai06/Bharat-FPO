import React from "react";
import {
  ImagePlus,
  Crown,
  Sprout,
  RefreshCw,
  Layers,
  Globe,
  Building2,
} from "lucide-react";

export default function AdvertisementHeader({
  isSuperAdmin,
  stats = { total: 0, superAdmin: 0, fpo: 0, globalBroadcasts: 0 },
  loading = false,
  onRefresh,
}) {
  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-2xs ${
                isSuperAdmin
                  ? "bg-purple-50 text-purple-600 border-purple-100/80"
                  : "bg-emerald-50 text-emerald-600 border-emerald-100/80"
              }`}
            >
              <ImagePlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                  Advertisement Posters
                </h1>
                {isSuperAdmin ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
                    <Crown className="w-3 h-3 text-purple-600" />
                    Super Admin Console
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    <Sprout className="w-3 h-3 text-emerald-600" />
                    FPO Portal
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {isSuperAdmin
                  ? "Upload, target, and broadcast advertisement banners across all or specific FPO tenants"
                  : "Manage promotional banners and broadcast posters for mobile apps and web portals"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
            title="Refresh posters"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                loading
                  ? isSuperAdmin
                    ? "animate-spin text-purple-600"
                    : "animate-spin text-emerald-600"
                  : "text-gray-500"
              }`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* METRIC STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* TOTAL */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-100">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Posters
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">
              {stats.total}
            </p>
          </div>
        </div>

        {/* SUPER ADMIN / GLOBAL */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 border border-purple-100">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {isSuperAdmin ? "Global Broadcasts" : "SuperAdmin Posters"}
            </p>
            <p className="text-2xl font-bold text-purple-900 mt-0.5">
              {isSuperAdmin ? stats.globalBroadcasts : stats.superAdmin}
            </p>
          </div>
        </div>

        {/* TARGETED / LOCAL */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 border border-emerald-100">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {isSuperAdmin ? "Targeted to Specific Tenants" : "FPO Local Posters"}
            </p>
            <p className="text-2xl font-bold text-emerald-900 mt-0.5">
              {isSuperAdmin ? stats.total - stats.globalBroadcasts : stats.fpo}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

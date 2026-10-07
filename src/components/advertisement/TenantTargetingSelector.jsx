import React, { useState, useMemo } from "react";
import { Globe, Building2, Search } from "lucide-react";

export default function TenantTargetingSelector({
  visibleToAll,
  onChangeVisibleToAll,
  selectedTenantIds = [],
  onToggleTenant,
  onSelectAll,
  onClearAll,
  availableTenants = [],
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTenants = useMemo(() => {
    if (!searchQuery.trim()) return availableTenants;
    const q = searchQuery.toLowerCase();
    return availableTenants.filter(
      (t) =>
        (t.name || t.businessName || "").toLowerCase().includes(q) ||
        (t.tenantCode || "").toLowerCase().includes(q) ||
        (t.state || t.city || "").toLowerCase().includes(q)
    );
  }, [availableTenants, searchQuery]);

  return (
    <div className="p-4 bg-purple-50/40 rounded-2xl border border-purple-100/80 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-purple-600" />
          Target Audience Visibility
        </label>
        <span className="text-[11px] text-purple-700 font-medium">
          {visibleToAll
            ? "Broadcasted to all tenant portals and farmer apps"
            : `${selectedTenantIds.length} tenant(s) selected`}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* OPTION 1: ALL TENANTS */}
        <label
          onClick={() => onChangeVisibleToAll(true)}
          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
            visibleToAll
              ? "bg-white border-purple-500 shadow-2xs ring-2 ring-purple-500/20"
              : "bg-white/60 border-gray-200 hover:border-gray-300"
          }`}
        >
          <input
            type="radio"
            name="targetingOption"
            checked={visibleToAll}
            onChange={() => onChangeVisibleToAll(true)}
            className="mt-0.5 text-purple-600 focus:ring-purple-500 cursor-pointer"
          />
          <div>
            <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              All Tenants (Platform-wide)
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Visible across all active and future FPO portals
            </p>
          </div>
        </label>

        {/* OPTION 2: SPECIFIC TENANTS */}
        <label
          onClick={() => onChangeVisibleToAll(false)}
          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
            !visibleToAll
              ? "bg-white border-purple-500 shadow-2xs ring-2 ring-purple-500/20"
              : "bg-white/60 border-gray-200 hover:border-gray-300"
          }`}
        >
          <input
            type="radio"
            name="targetingOption"
            checked={!visibleToAll}
            onChange={() => onChangeVisibleToAll(false)}
            className="mt-0.5 text-purple-600 focus:ring-purple-500 cursor-pointer"
          />
          <div>
            <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-purple-600" />
              Specific Tenants Only
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Target only chosen FPO tenants
            </p>
          </div>
        </label>
      </div>

      {/* SEARCHABLE TENANT LIST */}
      {!visibleToAll && (
        <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-3 mt-2">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search tenants by name, code, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={onSelectAll}
                className="text-purple-600 hover:text-purple-700 font-semibold cursor-pointer"
              >
                Select All
              </button>
              <span className="text-gray-300">•</span>
              <button
                type="button"
                onClick={onClearAll}
                className="text-gray-500 hover:text-gray-700 font-semibold cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1 divide-y divide-gray-50">
            {filteredTenants.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">
                No tenants match your search
              </p>
            ) : (
              filteredTenants.map((tenant) => {
                const tId = tenant._id || tenant.id;
                const isChecked = selectedTenantIds.includes(tId);
                return (
                  <label
                    key={tId}
                    className="flex items-center justify-between p-2 hover:bg-purple-50/50 rounded-lg cursor-pointer transition text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleTenant(tId)}
                        className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">
                          {tenant.name || tenant.businessName || "Unnamed Tenant"}
                        </p>
                        {tenant.tenantCode && (
                          <p className="text-[10px] text-gray-400 font-mono">
                            Code: {tenant.tenantCode}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 uppercase font-mono">
                      {tenant.state || tenant.city || "Tenant"}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

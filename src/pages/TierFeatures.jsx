import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchMyFeatures,
  updateTierFeatures,
} from "../store/thunks/featuresThunk";
import { Layers, Save, RefreshCw } from "lucide-react";

const TIERS = ["BASIC", "PREMIUM"];

const FEATURE_GROUPS = [
  {
    label: "Farm & Crop",
    color: "green",
    features: ["farm", "crop", "cropCalendar", "cropDoctor"],
  },
  {
    label: "Market & Commerce",
    color: "blue",
    features: [
      "product",
      "marketplace",
      "order",
      "cart",
      "inventory",
      "sell",
      "sellCrops",
    ],
  },
  {
    label: "Finance & Records",
    color: "purple",
    features: ["ledger", "kisanDiary", "procurement"],
  },
  {
    label: "Information",
    color: "orange",
    features: ["mandiPrice", "schemesData"],
  },
  {
    label: "Community & Engagement",
    color: "pink",
    features: ["broadcast", "advertisement", "chat", "community"],
  },
];

const ALL_FEATURES = FEATURE_GROUPS.flatMap((g) => g.features);

const COLOR_MAP = {
  green: {
    badge: "bg-green-100 text-green-700",
    toggle: "bg-green-500",
    header: "bg-green-50 border-green-200 text-green-800",
  },
  blue: {
    badge: "bg-blue-100 text-blue-700",
    toggle: "bg-blue-500",
    header: "bg-blue-50 border-blue-200 text-blue-800",
  },
  purple: {
    badge: "bg-purple-100 text-purple-700",
    toggle: "bg-purple-500",
    header: "bg-purple-50 border-purple-200 text-purple-800",
  },
  orange: {
    badge: "bg-orange-100 text-orange-700",
    toggle: "bg-orange-500",
    header: "bg-orange-50 border-orange-200 text-orange-800",
  },
  pink: {
    badge: "bg-pink-100 text-pink-700",
    toggle: "bg-pink-500",
    header: "bg-pink-50 border-pink-200 text-pink-800",
  },
};

const TIER_COLORS = {
  FREE: "bg-gray-100 text-gray-700 border-gray-300",
  BASIC: "bg-blue-100 text-blue-700 border-blue-300",
  STANDARD: "bg-purple-100 text-purple-700 border-purple-300",
  PREMIUM: "bg-amber-100 text-amber-700 border-amber-300",
};

function Toggle({ checked, onChange, color }) {
  const c = COLOR_MAP[color]?.toggle || "bg-brand-500";
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${checked ? c : "bg-gray-200"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  );
}

export default function TierFeatures() {
  const dispatch = useDispatch();
  const { tier, features, loading, saving, error } = useSelector(
    (s) => s.features,
  );
  const { selectedTenantId } = useSelector((s) => s.layout);
  const { user } = useSelector((s) => s.auth);
  const { me } = useSelector((s) => s.layout);

  const userRole = String(user?.role || me?.role || "")
    .replace(/\s+/g, "")
    .toLowerCase();
  const isSuperAdmin = userRole === "superadmin";

  const [localTier, setLocalTier] = useState("FREE");
  const [localFeatures, setLocalFeatures] = useState([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    dispatch(fetchMyFeatures());
  }, [dispatch, selectedTenantId]);

  useEffect(() => {
    if (tier) setLocalTier(tier);
    if (features) setLocalFeatures(features);
    setDirty(false);
  }, [tier, features]);

  const toggleFeature = (feat) => {
    if (!isSuperAdmin) return;
    setLocalFeatures((prev) =>
      prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat],
    );
    setDirty(true);
  };

  const toggleGroup = (groupFeatures) => {
    if (!isSuperAdmin) return;
    const allOn = groupFeatures.every((f) => localFeatures.includes(f));
    setLocalFeatures((prev) =>
      allOn
        ? prev.filter((f) => !groupFeatures.includes(f))
        : [...new Set([...prev, ...groupFeatures])],
    );
    setDirty(true);
  };

  const toggleAll = () => {
    if (!isSuperAdmin) return;
    const allOn = ALL_FEATURES.every((f) => localFeatures.includes(f));
    setLocalFeatures(allOn ? [] : [...ALL_FEATURES]);
    setDirty(true);
  };

  const handleTierChange = (t) => {
    if (!isSuperAdmin) return;
    setLocalTier(t);
    setDirty(true);
  };

  const handleSave = () => {
    if (!selectedTenantId) return;
    dispatch(
      updateTierFeatures({
        tenantId: selectedTenantId,
        tier: localTier,
        features: localFeatures,
      }),
    )
      .unwrap()
      .then(() => setDirty(false));
  };

  const handleReset = () => {
    setLocalTier(tier || "FREE");
    setLocalFeatures(features || []);
    setDirty(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-b-2 rounded-full animate-spin border-brand-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={() => dispatch(fetchMyFeatures())}
          className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const allOn = ALL_FEATURES.every((f) => localFeatures.includes(f));

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-50">
            <Layers className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Tier & Features
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isSuperAdmin
                ? "Manage tenant subscription tier and feature access"
                : "View your active features"}
            </p>
          </div>
        </div>
        {isSuperAdmin && (
          <div className="flex gap-2">
            {dirty && (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 transition bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" /> Reset
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!dirty || saving || !selectedTenantId}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 rounded-full border-white/30 border-t-white animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      {/* Tier Selector */}
      <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">
          Subscription Tier
        </h2>
        <div className="flex flex-wrap gap-3">
          {TIERS.map((t) => (
            <button
              key={t}
              onClick={() => handleTierChange(t)}
              disabled={!isSuperAdmin}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                localTier === t
                  ? `${TIER_COLORS[t]} ring-2 ring-offset-1 ring-current scale-105`
                  : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
              } ${!isSuperAdmin ? "cursor-default" : "cursor-pointer"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
        {/* Features header with select-all */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">
              Feature Access
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {localFeatures.length} / {ALL_FEATURES.length} features enabled
            </p>
          </div>
          {isSuperAdmin && (
            <button
              onClick={toggleAll}
              className="text-xs font-medium transition text-brand-600 hover:text-brand-700"
            >
              {allOn ? "Disable All" : "Enable All"}
            </button>
          )}
        </div>

        <div className="divide-y divide-gray-100">
          {FEATURE_GROUPS.map((group) => {
            const c = COLOR_MAP[group.color];
            const groupOn = group.features.every((f) =>
              localFeatures.includes(f),
            );
            const groupPartial =
              !groupOn && group.features.some((f) => localFeatures.includes(f));
            return (
              <div key={group.label} className="p-6">
                {/* Group header */}
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full border ${c.header}`}
                  >
                    {group.label}
                  </span>
                  {isSuperAdmin && (
                    <button
                      onClick={() => toggleGroup(group.features)}
                      className={`text-xs font-medium transition ${groupOn ? "text-red-500 hover:text-red-600" : "text-brand-600 hover:text-brand-700"}`}
                    >
                      {groupOn
                        ? "Disable group"
                        : groupPartial
                          ? "Enable all"
                          : "Enable group"}
                    </button>
                  )}
                </div>

                {/* Feature toggles */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {group.features.map((feat) => {
                    const on = localFeatures.includes(feat);
                    return (
                      <div
                        key={feat}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                          on
                            ? `${c.badge} border-current/20`
                            : "bg-gray-50 border-gray-200 text-gray-500"
                        }`}
                      >
                        <span className="text-sm font-medium">{feat}</span>
                        <Toggle
                          checked={on}
                          onChange={() => toggleFeature(feat)}
                          color={group.color}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!isSuperAdmin && (
        <p className="text-xs text-center text-gray-400">
          Contact your super admin to modify tier or features.
        </p>
      )}
    </div>
  );
}

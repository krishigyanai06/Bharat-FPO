import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchMyFeatures,
  updateTierFeatures,
} from "../store/thunks/featuresThunk";
import {
  Layers,
  Save,
  RefreshCw,
  Zap,
  Crown,
  Check,
  Search,
  Sprout,
  ShoppingBag,
  Wallet,
  FileText,
  Users,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  Info,
  AlertCircle,
} from "lucide-react";

const TIERS = ["BASIC", "PREMIUM"];

const FEATURE_GROUPS = [
  {
    id: "farm",
    label: "Farm & Crop",
    color: "emerald",
    icon: Sprout,
    features: ["farm", "crop", "cropCalendar", "cropDoctor"],
  },
  {
    id: "market",
    label: "Market & Commerce",
    color: "blue",
    icon: ShoppingBag,
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
    id: "finance",
    label: "Finance & Records",
    color: "purple",
    icon: Wallet,
    features: ["ledger", "kisanDiary", "procurement"],
  },
  {
    id: "info",
    label: "Information Services",
    color: "amber",
    icon: FileText,
    features: ["mandiPrice", "schemesData"],
  },
  {
    id: "community",
    label: "Community & Engagement",
    color: "rose",
    icon: Users,
    features: ["broadcast", "advertisement", "chat", "community"],
  },
];

const FEATURE_LABEL_MAP = {
  farm: "Farm Management",
  crop: "Crop Tracking",
  cropCalendar: "Crop Calendar",
  cropDoctor: "Crop Doctor AI",
  product: "Product Catalog",
  marketplace: "Marketplace Access",
  order: "Order Management",
  cart: "Cart & Checkout",
  inventory: "Stock & Inventory",
  sell: "Sell Operations",
  sellCrops: "Direct Crop Sales",
  ledger: "Financial Ledger",
  kisanDiary: "Kisan Digital Diary",
  procurement: "Procurement Hub",
  mandiPrice: "Mandi Price Tracker",
  schemesData: "Govt Schemes Portal",
  broadcast: "Broadcast Messaging",
  advertisement: "Ad Banners",
  chat: "Direct Chat",
  community: "Community Forum",
};

const ALL_FEATURES = FEATURE_GROUPS.flatMap((g) => g.features);

const COLOR_MAP = {
  emerald: {
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    toggle: "bg-emerald-600",
    headerBg: "bg-emerald-50/60",
    iconBg: "bg-emerald-100 text-emerald-700",
    activeCard: "border-emerald-300 bg-emerald-50/30",
  },
  blue: {
    badge: "bg-sky-50 text-sky-800 border-sky-200",
    toggle: "bg-emerald-600",
    headerBg: "bg-sky-50/60",
    iconBg: "bg-sky-100 text-sky-700",
    activeCard: "border-sky-300 bg-sky-50/30",
  },
  purple: {
    badge: "bg-purple-50 text-purple-800 border-purple-200",
    toggle: "bg-emerald-600",
    headerBg: "bg-purple-50/60",
    iconBg: "bg-purple-100 text-purple-700",
    activeCard: "border-purple-300 bg-purple-50/30",
  },
  amber: {
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    toggle: "bg-emerald-600",
    headerBg: "bg-amber-50/60",
    iconBg: "bg-amber-100 text-amber-700",
    activeCard: "border-amber-300 bg-amber-50/30",
  },
  rose: {
    badge: "bg-rose-50 text-rose-800 border-rose-200",
    toggle: "bg-emerald-600",
    headerBg: "bg-rose-50/60",
    iconBg: "bg-rose-100 text-rose-700",
    activeCard: "border-rose-300 bg-rose-50/30",
  },
};

function SwitchVisual({ checked }) {
  return (
    <span
      className={`relative inline-flex h-5 w-10 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
        checked ? "bg-emerald-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </span>
  );
}

export default function TierFeatures() {
  const dispatch = useDispatch();
  const { tier, features, loading, saving, error } = useSelector(
    (s) => s.features
  );
  const { selectedTenantId } = useSelector((s) => s.layout);
  const { user } = useSelector((s) => s.auth);
  const { me } = useSelector((s) => s.layout);

  const userRole = String(user?.role || me?.role || "")
    .replace(/\s+/g, "")
    .toLowerCase();
  const isSuperAdmin = userRole === "superadmin" || userRole.includes("admin");

  const [localTier, setLocalTier] = useState("BASIC");
  const [localFeatures, setLocalFeatures] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("ALL");

  useEffect(() => {
    dispatch(fetchMyFeatures());
  }, [dispatch, selectedTenantId]);

  useEffect(() => {
    setLocalTier(tier || "BASIC");
    if (features) setLocalFeatures(features);
    setDirty(false);
  }, [tier, features]);

  const toggleFeature = (feat) => {
    if (!isSuperAdmin) return;
    setLocalFeatures((prev) =>
      prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat]
    );
    setDirty(true);
  };

  const toggleGroup = (groupFeatures) => {
    if (!isSuperAdmin) return;
    const allOn = groupFeatures.every((f) => localFeatures.includes(f));
    setLocalFeatures((prev) =>
      allOn
        ? prev.filter((f) => !groupFeatures.includes(f))
        : [...new Set([...prev, ...groupFeatures])]
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
      })
    )
      .unwrap()
      .then(() => setDirty(false));
  };

  const handleReset = () => {
    setLocalTier(tier || "BASIC");
    setLocalFeatures(features || []);
    setDirty(false);
  };

  const filteredGroups = useMemo(() => {
    return FEATURE_GROUPS.map((group) => {
      let feats = group.features;
      if (activeCategoryFilter !== "ALL" && group.id !== activeCategoryFilter) {
        return null;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        feats = feats.filter((f) => {
          const label = (FEATURE_LABEL_MAP[f] || f).toLowerCase();
          return label.includes(q) || f.toLowerCase().includes(q);
        });
      }
      if (feats.length === 0) return null;
      return { ...group, features: feats };
    }).filter(Boolean);
  }, [searchQuery, activeCategoryFilter]);

  const enabledCount = localFeatures.length;
  const totalCount = ALL_FEATURES.length;
  const percentageEnabled = Math.round((enabledCount / totalCount) * 100) || 0;
  const allOn = ALL_FEATURES.every((f) => localFeatures.includes(f));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <div className="w-10 h-10 border-3 rounded-full animate-spin border-emerald-600 border-t-transparent shadow-xs" />
        <p className="text-xs font-medium text-gray-500">Loading features...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 p-6 bg-red-50 border border-red-200 rounded-2xl max-w-xl mx-auto">
        <AlertCircle className="w-10 h-10 text-red-500" />
        <div className="text-center">
          <h3 className="text-sm font-bold text-red-900">Failed to Load Tier & Features</h3>
          <p className="text-xs text-red-600 mt-1">{error}</p>
        </div>
        <button
          onClick={() => dispatch(fetchMyFeatures())}
          className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 pb-12">
      {/* Small & Compact Top Green-White Header Card */}
      <div className="p-4 sm:p-5 bg-white border border-emerald-200/80 shadow-xs rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-gray-900">
                  Tier & Feature Management
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${
                    isSuperAdmin
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-gray-100 text-gray-600 border-gray-200"
                  }`}
                >
                  {isSuperAdmin ? "Super Admin" : "View Only"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Configure tenant subscription tier and feature access rights
              </p>
            </div>
          </div>

          {/* Quick Stats & Action Buttons */}
          <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200/60 rounded-xl text-xs font-semibold text-emerald-800">
              <span>Features: <strong>{enabledCount}/{totalCount}</strong> ({percentageEnabled}%)</span>
            </div>

            {isSuperAdmin && (
              <div className="flex items-center gap-2">
                {dirty && (
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 transition bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Reset
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={!dirty || saving || !selectedTenantId}
                  className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white transition-all rounded-xl shadow-xs ${
                    dirty
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed border border-gray-200"
                  }`}
                >
                  {saving ? (
                    <div className="w-3.5 h-3.5 border-2 rounded-full border-white/30 border-t-white animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Small Compact Subscription Tier Selector */}
      <div className="p-4 sm:p-5 bg-white border border-emerald-200/80 shadow-xs rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-emerald-600" />
              Subscription Tier
            </h2>
            <p className="text-xs text-gray-500">
              Select tier to update feature baseline for this tenant
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {TIERS.map((t) => {
              const isSelected = localTier === t;
              const isPremium = t === "PREMIUM";
              const Icon = isPremium ? Crown : Zap;

              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTierChange(t)}
                  disabled={!isSuperAdmin}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    isSelected
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/20"
                      : "bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                  } ${!isSuperAdmin ? "cursor-default" : "cursor-pointer"}`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-emerald-600"}`} />
                  <span>{t}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Feature Access Section */}
      <div className="p-4 sm:p-5 bg-white border border-emerald-200/80 shadow-xs rounded-2xl space-y-4">
        {/* Controls Bar: Search, Category Filter, Master Toggle */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
              Feature Access Controls
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Enable or disable specific features per module category
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Master Toggle */}
            {isSuperAdmin && (
              <button
                onClick={toggleAll}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                  allOn
                    ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                {allOn ? (
                  <>
                    <XCircle className="w-3.5 h-3.5" /> Disable All
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Enable All
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Filter Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveCategoryFilter("ALL")}
            className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeCategoryFilter === "ALL"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All ({ALL_FEATURES.length})
          </button>
          {FEATURE_GROUPS.map((g) => {
            const count = g.features.filter((f) => localFeatures.includes(f)).length;
            const isCatActive = activeCategoryFilter === g.id;
            return (
              <button
                key={g.id}
                onClick={() => setActiveCategoryFilter(g.id)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isCatActive
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span>{g.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                    isCatActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {count}/{g.features.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Feature Groups Full Width Grid */}
        {filteredGroups.length === 0 ? (
          <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <Info className="w-6 h-6 text-gray-400 mx-auto mb-1.5" />
            <p className="text-xs font-medium text-gray-600">No features found matching "{searchQuery}"</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategoryFilter("ALL");
              }}
              className="mt-2 text-xs font-semibold text-emerald-600 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredGroups.map((group) => {
              const c = COLOR_MAP[group.color];
              const IconComp = group.icon;
              const activeCountInGroup = group.features.filter((f) =>
                localFeatures.includes(f)
              ).length;
              const groupOn = activeCountInGroup === group.features.length;

              return (
                <div
                  key={group.label}
                  className="flex flex-col justify-between overflow-hidden bg-white border border-gray-200 rounded-xl transition-all hover:border-emerald-300"
                >
                  {/* Card Header */}
                  <div className={`p-4 border-b border-gray-100 ${c.headerBg}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg ${c.iconBg}`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-gray-900">
                            {group.label}
                          </h3>
                          <span className="text-[11px] text-gray-500 font-medium">
                            {activeCountInGroup} of {group.features.length} active
                          </span>
                        </div>
                      </div>

                      {isSuperAdmin && (
                        <button
                          onClick={() => toggleGroup(group.features)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg transition border ${
                            groupOn
                              ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          }`}
                        >
                          {groupOn ? "Disable Group" : "Enable All"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Feature Toggles List */}
                  <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {group.features.map((feat) => {
                      const on = localFeatures.includes(feat);
                      const displayName = FEATURE_LABEL_MAP[feat] || feat;

                      return (
                        <button
                          key={feat}
                          type="button"
                          onClick={() => toggleFeature(feat)}
                          disabled={!isSuperAdmin}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                            on
                              ? `${c.activeCard} border-emerald-200`
                              : "bg-gray-50/60 border-gray-200/70 text-gray-400 opacity-80 hover:opacity-100"
                          } ${isSuperAdmin ? "cursor-pointer hover:border-emerald-300" : "cursor-default"}`}
                        >
                          <div className="min-w-0 pr-2">
                            <span className={`text-xs font-semibold block truncate ${on ? "text-gray-900" : "text-gray-500"}`}>
                              {displayName}
                            </span>
                            <span className="text-[10px] font-mono text-gray-400 block truncate">
                              {feat}
                            </span>
                          </div>

                          <SwitchVisual checked={on} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!isSuperAdmin && (
        <div className="p-3 bg-emerald-50/50 border border-emerald-200/60 rounded-xl text-center">
          <p className="text-xs text-emerald-800 font-medium">
            🔒 You are viewing feature configurations in read-only mode. Contact your Super Admin to adjust tier or features.
          </p>
        </div>
      )}
    </div>
  );
}

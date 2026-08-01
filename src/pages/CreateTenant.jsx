import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  Building2,
  User,
  Phone,
  ArrowLeft,
  Plus,
  Search,
  Crown,
  Zap,
  CheckCircle2,
  Layers,
  ExternalLink,
  RefreshCw,
  Sliders,
} from "lucide-react";
import Swal from "sweetalert2";
import api from "../lib/api";
import { fetchTenants } from "../store/thunks/layoutThunk";
import { setSelectedTenant } from "../store/slices/layoutSlice";

function CreateTenant() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { tenants = [], loading: tenantsLoading, selectedTenantId } = useSelector(
    (state) => state.layout
  );

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState("BASIC");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    businessName: "",
  });

  useEffect(() => {
    dispatch(fetchTenants());
  }, [dispatch]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { firstName, lastName, phone, businessName } = formData;

    if (!firstName.trim()) {
      toast.error("First name is required");
      return;
    }

    if (!lastName.trim()) {
      toast.error("Last name is required");
      return;
    }

    if (!phone.trim()) {
      toast.error("Phone number is required");
      return;
    }

    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
      toast.error("Phone number must be exactly 10 digits");
      return;
    }

    if (!businessName.trim()) {
      toast.error("Business name is required");
      return;
    }

    setLoading(true);

    try {
      console.log("[CreateTenant] Submitting:", { ...formData, tier: selectedTier });

      const response = await api.post("/admin/register", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        businessName: businessName.trim(),
        tier: selectedTier,
        features: [],
      });

      console.log("[CreateTenant] Success:", response.data);

      const createdTenantCode =
        response.data?.tenantCode ||
        response.data?.data?.tenantCode ||
        response.data?.data?.tenant?.tenantCode ||
        response.data?.data?.code ||
        response.data?.code ||
        businessName.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        phone: "",
        businessName: "",
      });
      setSelectedTier("BASIC");

      // Refresh existing tenants list immediately
      dispatch(fetchTenants());

      // Launch SweetAlert2 Notification
      Swal.fire({
        icon: "success",
        title: "<span style='color: #065f46; font-size: 22px; font-weight: 800;'>Tenant Created Successfully!</span>",
        html: `
          <div style="font-family: inherit; text-align: center; padding: 4px 0;">
            <p style="font-size: 14px; color: #4b5563; margin-bottom: 16px; line-height: 1.5;">
              Business <strong>${businessName}</strong> has been registered with <strong>${selectedTier}</strong> tier.
            </p>

            <div style="background-color: #f0fdf4; border: 2px dashed #10b981; padding: 18px; border-radius: 16px; margin-bottom: 18px;">
              <span style="font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 6px;">
                FPO / TENANT CODE
              </span>
              <span id="swal-tenant-code" style="font-family: monospace; font-size: 26px; font-weight: 900; color: #064e3b; letter-spacing: 0.1em; display: block;">
                ${createdTenantCode}
              </span>
            </div>

            <button id="swal-copy-btn" style="background-color: #059669; color: white; border: none; padding: 10px 22px; font-size: 13px; font-weight: 700; border-radius: 12px; cursor: pointer; transition: all 0.2s; display: inline-flex; items-center; gap: 8px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);">
              📋 Copy FPO / Tenant Code
            </button>
          </div>
        `,
        confirmButtonText: "Done",
        confirmButtonColor: "#059669",
        customClass: {
          popup: "rounded-3xl shadow-2xl border border-emerald-100",
        },
        didOpen: () => {
          const copyBtn = document.getElementById("swal-copy-btn");
          if (copyBtn) {
            copyBtn.addEventListener("click", () => {
              navigator.clipboard.writeText(createdTenantCode);
              copyBtn.innerHTML = "✓ Copied to Clipboard!";
              copyBtn.style.backgroundColor = "#047857";
              setTimeout(() => {
                if (copyBtn) {
                  copyBtn.innerHTML = "📋 Copy FPO / Tenant Code";
                  copyBtn.style.backgroundColor = "#059669";
                }
              }, 2000);
            });
          }
        },
      });
    } catch (error) {
      console.error("[CreateTenant] Error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to create tenant";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTenant = (tenant) => {
    if (tenant._id) {
      dispatch(setSelectedTenant(tenant._id));
      toast.success(`Selected tenant: ${tenant.businessName || tenant.name}`);
      navigate("/tier-features");
    }
  };

  const filteredTenants = useMemo(() => {
    if (!searchQuery.trim()) return tenants;
    const q = searchQuery.toLowerCase();
    return tenants.filter((t) => {
      const bName = (t.businessName || t.name || "").toLowerCase();
      const code = (t.tenantCode || t.code || "").toLowerCase();
      const phone = (t.phone || t.adminPhone || "").toLowerCase();
      const adminName = `${t.firstName || ''} ${t.lastName || ''}`.toLowerCase();
      return (
        bName.includes(q) ||
        code.includes(q) ||
        phone.includes(q) ||
        adminName.includes(q)
      );
    });
  }, [tenants, searchQuery]);

  const basicCount = useMemo(() => {
    return tenants.filter((t) => (t.tier || "BASIC").toUpperCase() === "BASIC").length;
  }, [tenants]);

  const premiumCount = useMemo(() => {
    return tenants.filter((t) => (t.tier || "").toUpperCase() === "PREMIUM").length;
  }, [tenants]);

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="p-5 sm:p-6 bg-white border border-emerald-200/80 shadow-xs rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 rounded-xl border border-gray-200 hover:bg-emerald-50 transition"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">
                Tenant Management & Registration
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Register new business tenants and view existing active organizations in the platform.
              </p>
            </div>
          </div>

          {/* Quick Summary Badges */}
          <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold">
              Total Tenants: <strong>{tenants.length}</strong>
            </span>
            <span className="px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-xl text-xs font-semibold">
              Basic: <strong>{basicCount}</strong>
            </span>
            <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold">
              Premium: <strong>{premiumCount}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Form + Existing Tenants Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form Column (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-xs border border-emerald-200/80 overflow-hidden self-start">
          <div className="p-5 border-b border-gray-100 bg-emerald-50/50 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                Register New Tenant
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Creates tenant business & initial admin account
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Super Admin
            </span>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Business Name */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Business Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  placeholder="e.g. Green Harvest Agro FPO"
                  className="w-full pl-9 pr-3 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  required
                />
              </div>
              {formData.businessName.trim() && (
                <p className="text-[11px] text-emerald-600 font-mono mt-1">
                  Tenant Code: <strong>{formData.businessName.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)}</strong>
                </p>
              )}
            </div>

            {/* Admin Name Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  First Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="First name"
                    className="w-full pl-8 pr-3 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Last name"
                  className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  required
                />
              </div>
            </div>

            {/* Admin Phone */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Admin Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="9876543210"
                  maxLength="10"
                  className="w-full pl-9 pr-3 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  required
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                10-digit mobile number used for login access
              </p>
            </div>

            {/* Subscription Tier Selection */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Initial Subscription Tier
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTier("BASIC")}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition ${
                    selectedTier === "BASIC"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-emerald-50/50"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>BASIC</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTier("PREMIUM")}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition ${
                    selectedTier === "PREMIUM"
                      ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-amber-50/50"
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>PREMIUM</span>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-xs"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Registering Tenant...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Create Tenant Account
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Directory Column: Existing Tenants (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-xs border border-emerald-200/80 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Existing Tenants Directory ({tenants.length})
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                All registered organizations currently present in system
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => dispatch(fetchTenants())}
                className="p-2 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 border border-gray-200 rounded-xl transition"
                title="Refresh Tenants"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${tenantsLoading ? "animate-spin" : ""}`} />
              </button>
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tenants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Tenants List Grid */}
          {tenantsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
              <div className="w-8 h-8 border-3 rounded-full animate-spin border-emerald-600 border-t-transparent" />
              <span className="text-xs font-medium">Fetching registered tenants...</span>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-gray-600">
                {searchQuery ? `No tenants found matching "${searchQuery}"` : "No tenants present in system yet"}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-2 text-xs font-bold text-emerald-600 hover:underline"
                >
                  Clear search query
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
              {filteredTenants.map((t) => {
                const bName = t.businessName || t.name || "Unnamed Tenant";
                const code = t.tenantCode || t.code || "N/A";
                const phone = t.phone || t.adminPhone || t.admin?.phone || "N/A";
                const adminName = t.firstName || t.lastName 
                  ? `${t.firstName || ''} ${t.lastName || ''}`.trim()
                  : t.admin?.name || "Admin";
                const tierVal = (t.tier || "BASIC").toUpperCase();
                const isCurrentSelected = selectedTenantId === t._id;

                return (
                  <div
                    key={t._id || code}
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCurrentSelected
                        ? "border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500/20"
                        : "border-gray-200/80 bg-white hover:border-emerald-300 hover:bg-emerald-50/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                        tierVal === "PREMIUM" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      }`}>
                        <Building2 className="w-4 h-4" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xs font-bold text-gray-900">{bName}</h3>
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-200">
                            {code}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            tierVal === "PREMIUM"
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : "bg-emerald-100 text-emerald-800 border-emerald-200"
                          }`}>
                            {tierVal}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1 flex-wrap">
                          <span>Admin: <strong className="text-gray-700">{adminName}</strong></span>
                          <span>Phone: <strong className="text-gray-700">{phone}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => handleSelectTenant(t)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                          isCurrentSelected
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        }`}
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>{isCurrentSelected ? "Active Tenant" : "Manage Features"}</span>
                        <ExternalLink className="w-3 h-3 opacity-75" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CreateTenant;

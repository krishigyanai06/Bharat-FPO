import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Building2, User, Phone, ArrowLeft, Plus } from "lucide-react";
import api from "../lib/api";

function CreateTenant() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    businessName: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
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
      toast.error("Phone number must be 10 digits");
      return;
    }

    if (!businessName.trim()) {
      toast.error("Business name is required");
      return;
    }

    setLoading(true);

    try {
      console.log("[CreateTenant] Submitting:", formData);

      const response = await api.post("/admin/register", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        businessName: businessName.trim(),
      });

      console.log("[CreateTenant] Success:", response.data);

      toast.success(`Tenant "${businessName}" created successfully!`);

      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        phone: "",
        businessName: "",
      });

      // Navigate back to dashboard after a short delay
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
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

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Create New Tenant
              </h1>
              <p className="text-sm text-gray-500">
                Register a new business tenant in the system
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Form Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-800">Tenant Information</h2>
          <p className="text-xs text-gray-500 mt-1">
            This will create a new tenant and admin user account
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Admin Details Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <User className="w-4 h-4" />
              Admin User Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="Enter first name"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Enter last name"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                  required
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="9876543210"
                  maxLength="10"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                10-digit mobile number (will be used for login)
              </p>
            </div>
          </div>

          {/* Business Details Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Business Details
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleInputChange}
                placeholder="e.g. Agro Solutions"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be used to generate a unique tenant code
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Tenant
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateTenant;

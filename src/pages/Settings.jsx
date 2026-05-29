import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProfile, updateProfile } from "../store/thunks/settingsThunk";
import { clearStatus } from "../store/slices/settingsSlice";
import { Save } from "lucide-react";
import { usePermissions } from "../hooks/usePermissions";

function Settings() {
  const dispatch = useDispatch();
  const { profile, loading, success, error } = useSelector((s) => s.settings);
  const authUser = useSelector((s) => s.auth.user);
  const { isReadOnly } = usePermissions();
  const data = profile || authUser;
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    emailId: "",
    village: "",
    district: "",
    state: "",
    gender: "",
    shopName: "",
    gstNumber: "",
  });

  /* LOAD PROFILE */
  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  /* MAP API DATA → FORM */
  useEffect(() => {
    if (data) {
      setForm({
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        phone: data.phone || data.mobile || "",
        emailId: data.emailId || data.email || "",
        village: data.village || "",
        district: data.district || "",
        state: data.state || "",
        gender: data.gender || "",
        shopName: data.shopName || "",
        gstNumber: data.gstNumber || "",
      });
    }
  }, [profile, authUser]);

  /* SAVE PROFILE */
  const handleSave = (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(
      Object.entries(form).filter(([, v]) => v !== ""),
    );
    dispatch(updateProfile(payload));
  };

  /* CLEAR SUCCESS MESSAGE */
  useEffect(() => {
    if (success) {
      setTimeout(() => dispatch(clearStatus()), 3000);
    }
  }, [success, dispatch]);

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-10 w-10 border-b-2 border-brand-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-2">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-gray-500">
          Manage your account and application preferences
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
            <span className="text-brand-600">👤</span>
          </div>
          <h2 className="font-semibold text-sm">Profile Settings</h2>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 px-4 py-2.5 bg-brand-50 border border-brand-200 rounded-lg text-sm text-brand-700">
            Profile updated successfully!
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="grid grid-cols-2 gap-4">
            {[
              ["firstName", "First Name"],
              ["lastName", "Last Name"],
              ["phone", "Phone Number"],
              ["emailId", "Email Address"],
              ["village", "Village"],
              ["district", "District"],
              ["state", "State"],
              ["shopName", "Shop / FPO Name"],
              ["gstNumber", "GST Number"],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs text-gray-500 mb-1">
                  {label}
                </label>
                <input
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            ))}

            <div>
              <label className="block text-xs text-gray-500 mb-1">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Role</label>
              <input
                value={data?.role || "—"}
                disabled
                className="w-full border px-3 py-2 rounded-lg bg-gray-50 text-sm text-gray-400"
              />
            </div>

            <div className="col-span-2 flex justify-end mt-2">
              {!isReadOnly && (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm transition"
                >
                  <Save className="w-4 h-4" />
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              )}
              {isReadOnly && (
                <p className="text-xs text-gray-400 italic">
                  SuperAdmin has view-only access
                </p>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Settings;

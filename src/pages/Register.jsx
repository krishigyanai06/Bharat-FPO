import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../store/thunks/registerThunk";
import { clearAuthState } from "../store/slices/registerSlice";
import {
  Eye, EyeOff, User, Mail, Phone, Lock,
  Store, FileText, MapPin, AlertCircle, CheckCircle2,
  ShieldCheck, BarChart3, Users, Globe,
} from "lucide-react";
import theme from '../config/theme';

function passwordStrength(pw) {
  if (pw.length < 6) return { label: "Weak", width: "33%", color: "bg-red-400", text: "text-red-500" };
  if (pw.length < 8 || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw))
    return { label: "Medium", width: "66%", color: "bg-yellow-400", text: "text-yellow-600" };
  return { label: "Strong", width: "100%", color: "bg-brand-500", text: "text-brand-600" };
}

const base =
  "w-full bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed";
const inputCls = `${base} py-2.5 px-4`;
const iconInputCls = `${base} py-2.5 pl-10 pr-4`;

function InputIcon({ icon: Icon }) {
  return <Icon className="absolute w-4 h-4 left-3 top-3 text-gray-400 pointer-events-none" />;
}

function Label({ children, required }) {
  return (
    <label className="block mb-1.5 text-xs font-semibold tracking-wide text-gray-500 uppercase">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-brand-100">
          <Icon className="w-3.5 h-3.5 text-brand-700" />
        </div>
        <span className="text-xs font-bold tracking-widest text-brand-700 uppercase">{title}</span>
      </div>
      {children}
    </div>
  );
}

const FEATURES = [
  { icon: Store,       text: "Procurement & inventory management" },
  { icon: Users,       text: "Member tracking & ledger" },
  { icon: BarChart3,   text: "Reports & analytics" },
  { icon: Globe,       text: "Multi-language support" },
  { icon: ShieldCheck, text: "Secure JWT authentication" },
];

function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState("");

  const { loading, error, registerSuccess } = useSelector((s) => s.register);

  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", gender: "",
    password: "", village: "", district: "", state: "",
    gstNumber: "", shopName: "", emailId: "",
  });

  useEffect(() => {
    if (registerSuccess) {
      setTimeout(() => { dispatch(clearAuthState()); navigate("/login"); }, 1500);
    }
  }, [registerSuccess, dispatch, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: name === "gstNumber" ? value.toUpperCase() : value }));
    if (error) dispatch(clearAuthState());
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (form.password !== confirmPassword) { setConfirmError("Passwords do not match"); return; }
    setConfirmError("");
    const trimmed = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])
    );
    dispatch(registerUser({ ...trimmed, role: "FPO" }));
  };

  const strength = form.password ? passwordStrength(form.password) : null;

  return (
    <div className="flex min-h-screen bg-white">

      {/* ── LEFT: FORM ── */}
      <div className="flex items-start justify-center w-full lg:w-1/2 px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Brand */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-11 h-11 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl shadow-md">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-brand-600 tracking-widest uppercase">{theme.brand}</p>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">{theme.tagline}</h1>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
            <p className="mt-1 text-sm text-gray-500">Fill in the details below to get started</p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="flex gap-2.5 p-3.5 mb-5 border border-red-200 rounded-xl bg-red-50">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          {registerSuccess && (
            <div className="flex gap-2.5 p-3.5 mb-5 border border-brand-200 rounded-xl bg-brand-50">
              <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
              <p className="text-sm text-brand-700">Registration successful! Redirecting to login…</p>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">

            {/* Personal */}
            <SectionCard title="Personal Information" icon={User}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label required>First Name</Label>
                  <div className="relative">
                    <InputIcon icon={User} />
                    <input name="firstName" autoFocus required disabled={loading}
                      value={form.firstName} onChange={handleChange}
                      className={iconInputCls} placeholder="Ramesh" />
                  </div>
                </div>
                <div>
                  <Label required>Last Name</Label>
                  <div className="relative">
                    <InputIcon icon={User} />
                    <input name="lastName" required disabled={loading}
                      value={form.lastName} onChange={handleChange}
                      className={iconInputCls} placeholder="Kumar" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label required>Phone</Label>
                  <div className="relative">
                    <InputIcon icon={Phone} />
                    <input name="phone" type="tel" inputMode="numeric"
                      pattern="[0-9]{10}" required disabled={loading}
                      value={form.phone} onChange={handleChange}
                      className={iconInputCls} placeholder="9876543210" />
                  </div>
                </div>
                <div>
                  <Label required>Gender</Label>
                  <select name="gender" required disabled={loading}
                    value={form.gender} onChange={handleChange}
                    className={inputCls}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <Label required>Email Address</Label>
                <div className="relative">
                  <InputIcon icon={Mail} />
                  <input name="emailId" type="email" required disabled={loading}
                    value={form.emailId} onChange={handleChange}
                    className={iconInputCls} placeholder="example@email.com" />
                </div>
              </div>
            </SectionCard>

            {/* Security */}
            <SectionCard title="Account Security" icon={Lock}>
              <div>
                <Label required>Password</Label>
                <div className="relative">
                  <InputIcon icon={Lock} />
                  <input name="password" type={showPassword ? "text" : "password"}
                    minLength={8} required disabled={loading}
                    value={form.password} onChange={handleChange}
                    className={`${base} py-2.5 pl-10 pr-10`}
                    placeholder="Min 8 chars, include A–Z and 0–9" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition">
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {strength && (
                  <div className="mt-2 space-y-1">
                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${strength.color}`}
                        style={{ width: strength.width }} />
                    </div>
                    <p className="text-xs text-gray-400">
                      Strength: <span className={`font-semibold ${strength.text}`}>{strength.label}</span>
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label required>Confirm Password</Label>
                <div className="relative">
                  <InputIcon icon={Lock} />
                  <input name="confirmPassword" type={showConfirm ? "text" : "password"}
                    required disabled={loading}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError(""); }}
                    className={`${base} py-2.5 pl-10 pr-10 ${confirmError ? "border-red-400 focus:ring-red-400" : ""}`}
                    placeholder="Re-enter your password" />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition">
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {confirmError && <p className="mt-1 text-xs text-red-500">{confirmError}</p>}
              </div>
            </SectionCard>

            {/* Business */}
            <SectionCard title="Business Details" icon={Store}>
              <div>
                <Label required>FPO / Shop Name</Label>
                <div className="relative">
                  <InputIcon icon={Store} />
                  <input name="shopName" required disabled={loading}
                    value={form.shopName} onChange={handleChange}
                    className={iconInputCls} placeholder="Marjeevi FPO" />
                </div>
              </div>

              <div>
                <Label>GST Number <span className="ml-1 text-xs font-normal normal-case text-gray-400">(optional)</span></Label>
                <div className="relative">
                  <InputIcon icon={FileText} />
                  <input name="gstNumber" disabled={loading}
                    value={form.gstNumber} onChange={handleChange}
                    className={iconInputCls} placeholder="22AAAAA0000A1Z5"
                    pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}"
                    title="Enter a valid 15-character GST number" />
                </div>
              </div>
            </SectionCard>

            {/* Location */}
            <SectionCard title="Location" icon={MapPin}>
              <div>
                <Label>Village</Label>
                <div className="relative">
                  <InputIcon icon={MapPin} />
                  <input name="village" disabled={loading}
                    value={form.village} onChange={handleChange}
                    className={iconInputCls} placeholder="Village name" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>District</Label>
                  <input name="district" disabled={loading}
                    value={form.district} onChange={handleChange}
                    className={inputCls} placeholder="District" />
                </div>
                <div>
                  <Label>State</Label>
                  <input name="state" disabled={loading}
                    value={form.state} onChange={handleChange}
                    className={inputCls} placeholder="State" />
                </div>
              </div>
            </SectionCard>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all mt-1 shadow-sm ${
                loading
                  ? "bg-gray-300 cursor-not-allowed text-gray-500"
                  : "bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white shadow-brand-200 hover:shadow-md"
              }`}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Creating Account…
                </span>
              ) : "Create Account →"}
            </button>
          </form>

          <p className="mt-5 text-sm text-center text-gray-500">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-800 transition">
              Sign in
            </Link>
          </p>

          <div className="flex items-center justify-center gap-1.5 mt-5">
            <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-xs text-gray-400">Secure registration for authorized administrators only</p>
          </div>
        </div>
      </div>

      {/* ── RIGHT: IMAGE ── */}
      <div className="relative hidden w-1/2 lg:flex">
        <img
          src="https://images.unsplash.com/photo-1683506684881-efbb5203eacf?fm=jpg&q=60&w=3000"
          alt="Farming"
          className="absolute inset-0 object-cover w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/85 via-brand-800/75 to-brand-900/90" />
        <div className="relative flex flex-col justify-center px-12 py-16 text-white">
          <div className="mb-2">
            <span className="text-xs font-bold tracking-widest text-brand-300 uppercase">{theme.brand}</span>
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Empowering<br />Farmers Together
          </h2>
          <p className="text-sm leading-relaxed text-brand-100 max-w-sm mb-10">
            A modern platform built for Farmer Producer Organizations — manage your entire operation from one place.
          </p>

          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 shrink-0">
                  <Icon className="w-4 h-4 text-brand-300" />
                </div>
                <span className="text-sm text-brand-100">{text}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-white/10">
            <p className="text-xs text-brand-300/70">{theme.brand} · {theme.tagline}</p>
          </div>
        </div>
      </div>

    </div>
  );
}

export default Register;

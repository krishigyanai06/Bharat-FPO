import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { sendOtp, verifyOtp } from "../store/thunks/authThunk";
import { Phone, AlertCircle, ShieldCheck, Lock, Sprout, BarChart2, ChevronDown } from "lucide-react";
import theme from "../config/theme";

const FEATURES = [
  { icon: Sprout, title: "Smart Management", desc: "Digital solutions for better farming" },
  { icon: BarChart2, title: "Better Efficiency", desc: "Streamline operations and increase productivity" },
  { icon: ShieldCheck, title: "Secure & Reliable", desc: "Enterprise-grade security for your data" },
];

function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);

  const [mobile, setMobile] = useState("");
  const [formError, setFormError] = useState("");
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("Admin");
  const displayError = formError || error;

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleLogin = async (e) => {
    e.preventDefault();
    const value = mobile.trim();
    if (!value) return setFormError("Enter mobile number");
    if (!/^[6-9][0-9]{9}$/.test(value)) return setFormError("Enter valid mobile number");
    try {
      setFormError("");
      if (step === 1) {
        await dispatch(sendOtp({ mobile: value, role })).unwrap();
        setStep(2);
      } else {
        const otpValue = otp.join("");
        if (otpValue.length < 6) return setFormError("Enter 6-digit OTP");
        await dispatch(verifyOtp({ mobile: value, otp: otpValue, role })).unwrap();
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setFormError(err || "Something went wrong");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* LEFT – HERO IMAGE */}
      <div className="relative hidden lg:flex lg:w-1/2">
        <img
          src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?fm=jpg&q=80&w=1600"
          alt="Farming"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/70" />

        <div className="relative z-10 flex flex-col justify-between h-full px-12 py-10">
          {/* top badge */}
          <div className="inline-flex items-center gap-2 self-start bg-white/15 backdrop-blur-sm border border-white/25 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
            <Sprout className="w-3.5 h-3.5 text-green-300" />
            BHARAT FPO
          </div>

          {/* center headline */}
          <div>
            <h1 className="text-5xl font-extrabold text-white leading-tight mb-3">
              Empowering<br />Farmers
            </h1>
            <div className="w-10 h-1 bg-green-400 rounded mb-5" />
            <p className="text-white/80 text-sm leading-relaxed max-w-xs">
              Modern technology meets traditional farming. Manage your Farmer
              Producer Organization with ease and efficiency.
            </p>
          </div>

          {/* bottom feature cards */}
          <div className="grid grid-cols-3 gap-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center mb-2">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-white text-xs font-semibold mb-0.5">{title}</p>
                <p className="text-white/60 text-[11px] leading-snug">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT – FORM */}
      <div className="flex flex-col items-center justify-center w-full lg:w-1/2 px-6 py-12 relative overflow-hidden">
        {/* decorative circles */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-green-100 rounded-full opacity-40 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-green-100 rounded-full opacity-25 translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative w-full max-w-sm">
          {/* Logo + brand */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 mb-3">
              <img src={theme.logo} alt={theme.brand} className="w-full h-full object-contain" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{theme.brand}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{theme.tagline}</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-7">
            {/* Role tabs */}
            <div className="flex border-b border-gray-200 mb-6">
              {[
                { key: "Admin", label: "FPO Admin", emoji: "🏢" },
                { key: "SuperAdmin", label: "Super Admin", emoji: "⚡" },
              ].map(({ key, label, emoji }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setRole(key); setStep(1); setOtp(Array(6).fill("")); setFormError(""); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 pb-3 text-sm font-medium transition border-b-2 -mb-px ${
                    role === key
                      ? "border-brand-700 text-brand-700"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <span>{emoji}</span> {label}
                </button>
              ))}
            </div>

            {displayError && (
              <div className="flex gap-2 p-3 mb-4 border border-red-200 rounded-lg bg-red-50">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{displayError}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {step === 1 ? (
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-gray-700">Mobile Number</label>
                  <div className="flex rounded-xl border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500 transition">
                    <div className="flex items-center gap-1 px-3 bg-gray-50 border-r border-gray-200 text-sm text-gray-600 font-medium select-none">
                      <Phone className="w-3.5 h-3.5" />
                      <span>+91</span>
                      <ChevronDown className="w-3 h-3 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      placeholder="98765 43210"
                      value={mobile}
                      maxLength={10}
                      onChange={(e) => { setMobile(e.target.value.replace(/\D/g, "")); setFormError(""); }}
                      className="flex-1 px-3 py-2.5 text-sm outline-none bg-white"
                    />
                    <span className="flex items-center pr-3 text-xs text-gray-400 select-none">
                      {mobile.length}/10
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Enter OTP</label>
                    <button type="button" onClick={() => setStep(1)} className="text-xs text-brand-700 hover:underline">
                      Change number
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Sent to +91 {mobile}</p>
                  <div className="flex gap-2 justify-between">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        id={`otp-${i}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          if (!val) return;
                          const next = [...otp]; next[i] = val.slice(-1); setOtp(next); setFormError("");
                          if (i < 5) document.getElementById(`otp-${i + 1}`)?.focus();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace") {
                            const next = [...otp];
                            if (next[i]) { next[i] = ""; setOtp(next); }
                            else if (i > 0) document.getElementById(`otp-${i - 1}`)?.focus();
                          }
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                          const next = Array(6).fill("");
                          pasted.split("").forEach((c, idx) => { next[idx] = c; });
                          setOtp(next);
                          document.getElementById(`otp-${Math.min(pasted.length, 5)}`)?.focus();
                        }}
                        className="w-11 h-12 text-center text-lg font-semibold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition bg-gray-50"
                      />
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition ${
                  loading ? "bg-gray-300 cursor-not-allowed text-gray-500" : "bg-brand-800 hover:bg-brand-900 text-white shadow-sm"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                {loading ? "Processing..." : step === 1 ? "Send OTP" : "Verify OTP"}
              </button>
            </form>


          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <Lock className="w-3 h-3" />
            Secure login for authorized administrators only
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;

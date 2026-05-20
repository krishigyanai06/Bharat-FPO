import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { sendOtp, verifyOtp } from "../store/thunks/authThunk";
import { Lock, Phone, AlertCircle, Eye, EyeOff } from "lucide-react";
import theme from "../config/theme";

function Login() {
  const dispatch = useDispatch(); // ✅ FIX
  const navigate = useNavigate();

  const { loading, error, isAuthenticated } = useSelector(
    (state) => state.auth,
  );

  const [mobile, setMobile] = useState("");

  const [formError, setFormError] = useState("");
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [step, setStep] = useState(1); // 1 = mobile, 2 = otp
  const [role, setRole] = useState("Admin"); // "Admin" or "SuperAdmin"
  const [showPassword, setShowPassword] = useState(false);
  const displayError = formError || error;

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleLogin = async (e) => {
    e.preventDefault();

    const value = mobile.trim();

    if (!value) return setFormError("Enter mobile number");
    if (!/^[6-9][0-9]{9}$/.test(value))
      return setFormError("Enter valid mobile number");

    try {
      setFormError("");

      if (step === 1) {
        await dispatch(sendOtp({ mobile: value, role })).unwrap(); // ✅ mobile & role
        setStep(2);
      } else {
        const otpValue = otp.join("");
        if (otpValue.length < 6) return setFormError("Enter 6-digit OTP");

        await dispatch(verifyOtp({ mobile: value, otp: otpValue, role })).unwrap();
        
        // Use React Router navigation - NOT window.location.href
        // Using window.location.href causes full page reload which resets Redux before token is saved
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setFormError(err || "Something went wrong");
    }
  };
  return (
    <div className="flex min-h-screen">
      {/* LEFT – IMAGE SECTION */}
      <div className="relative hidden w-1/2 lg:flex">
        <img
          src="https://images.unsplash.com/photo-1683506684881-efbb5203eacf?fm=jpg&q=60&w=3000"
          alt="Farming"
          className="absolute inset-0 object-cover w-full h-full"
        />
        <div className="absolute inset-0 flex items-center justify-center px-10 bg-brand-900/70">
          <div className="max-w-md text-white">
            <h2 className="mb-4 text-3xl font-bold">Empowering Farmers</h2>
            <p className="text-sm leading-relaxed text-brand-100">
              Modern technology meets traditional farming. Manage your Farmer
              Producer Organization with ease and efficiency.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT – LOGIN FORM */}
      <div className="flex items-center justify-center w-full px-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="flex items-center justify-center w-12 h-12 mb-4 bg-brand-600 rounded-xl">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{theme.brand}</h1>
            <p className="text-sm text-gray-600">{theme.tagline}</p>
          </div>

          {displayError && (
            <div className="flex gap-2 p-3 mb-4 border border-red-200 rounded-lg bg-red-50">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-700">{displayError}</p>
            </div>
          )}

          <div className="flex p-1 mb-6 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => { setRole("Admin"); setStep(1); setOtp(Array(6).fill("")); setFormError(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition ${role === "Admin" ? "bg-white text-brand-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              🏢 FPO Admin
            </button>
            <button
              type="button"
              onClick={() => { setRole("SuperAdmin"); setStep(1); setOtp(Array(6).fill("")); setFormError(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition ${role === "SuperAdmin" ? "bg-white text-brand-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              ⚡ Super Admin
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Mobile Number
              </label>
              <div className="flex rounded-lg border transition-colors duration-200 focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500 overflow-hidden">
                <div className="flex items-center gap-1.5 px-3 bg-gray-50 border-r text-sm text-gray-500 font-medium select-none">
                  <Phone className="w-4 h-4" />
                  +91
                </div>
                <input
                  type="tel"
                  placeholder="98765 43210"
                  value={mobile}
                  maxLength={10}
                  onChange={(e) => {
                    setMobile(e.target.value.replace(/\D/g, ""));
                    setFormError("");
                  }}
                  className="flex-1 px-3 py-2.5 text-sm outline-none bg-white"
                />
                <div className="flex items-center pr-3 text-xs text-gray-400 select-none">
                  {mobile.length}/10
                </div>
              </div>
            </div>

            {step === 2 && (
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Enter OTP
                </label>
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
                        const next = [...otp];
                        next[i] = val.slice(-1);
                        setOtp(next);
                        setFormError("");
                        if (i < 5) document.getElementById(`otp-${i + 1}`)?.focus();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace") {
                          const next = [...otp];
                          if (next[i]) { next[i] = ""; setOtp(next); }
                          else if (i > 0) { document.getElementById(`otp-${i - 1}`)?.focus(); }
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
                      className="w-11 h-12 text-center text-lg font-semibold border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                    />
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 rounded-lg font-medium transition ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-brand-700 hover:bg-brand-800 text-white"
              }`}
            >
              {loading
                ? "Processing..."
                : step === 1
                  ? "Send OTP"
                  : "Verify OTP"}
            </button>
          </form>

          <p className="mt-4 text-sm text-center text-gray-600">
            Don’t have an account?{" "}
            <span
              onClick={() => navigate("/register")}
              className="font-semibold cursor-pointer text-brand-700 hover:text-brand-800"
            >
              Create one
            </span>
          </p>

          <p className="mt-4 text-xs text-center text-gray-500">
            Secure login for authorized administrators only
          </p>
        </div>
      </div>

    </div>
  );
}

export default Login;

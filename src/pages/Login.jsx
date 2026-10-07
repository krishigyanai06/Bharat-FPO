import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { sendOtp, verifyOtp } from "../store/thunks/authThunk";
import {
  Phone,
  AlertCircle,
  ShieldCheck,
  Lock,
  ChevronDown,
  Users,
  Shield,
  BookOpen,
  Headphones,
  CheckCircle2,
  X,
  Edit2,
  RotateCw,
  Loader2,
  ArrowRight,
} from "lucide-react";
import theme from "../config/theme";

function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);

  const [mobile, setMobile] = useState("");
  const [formError, setFormError] = useState("");
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("Admin");
  const [timer, setTimer] = useState(30);
  const displayError = formError || error;

  useEffect(() => {
    let interval;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  useEffect(() => {
    if (step === 2) {
      setTimer(30);
      setTimeout(() => {
        document.getElementById("otp-0")?.focus();
      }, 100);
    }
  }, [step]);

  const handleResendOtp = async () => {
    if (timer > 0) return;
    try {
      setFormError("");
      await dispatch(sendOtp({ mobile, role })).unwrap();
      setTimer(30);
    } catch (err) {
      setFormError(err || "Failed to resend OTP");
    }
  };

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
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      {/* LEFT – HERO IMAGE */}
      <div className="relative hidden lg:flex lg:w-1/2 h-full overflow-hidden bg-gray-900">
        <img
          src="/Login-Hero2.png"
          alt="Bharat FPO Hero"
          className="w-full h-full object-cover"
        />
      </div>

      {/* RIGHT – FORM */}
      <div className="flex flex-col items-center justify-center w-full lg:w-1/2 h-full px-6 py-4 relative overflow-hidden">
        {/* decorative background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-100/60 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-100/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-7">
          {/* Top lock header */}
          <div className="flex flex-col items-center mb-5 text-center">
            <div className="w-13 h-13 rounded-full bg-emerald-50 border border-dashed border-emerald-300 flex items-center justify-center p-3 mb-2.5 shadow-xs">
              <Lock className="w-6 h-6 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Welcome Back!</h1>
            <p className="text-xs text-slate-400 mt-1">Login to access your Bharat FPO dashboard</p>
          </div>

          {/* Role tabs switcher */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-2xl mb-4 border border-slate-100">
            <button
              type="button"
              onClick={() => { setRole("Admin"); setStep(1); setOtp(Array(6).fill("")); setFormError(""); }}
              className={`flex items-center gap-2.5 p-2.5 rounded-xl transition text-left relative ${
                role === "Admin"
                  ? "bg-white shadow-sm border border-gray-100"
                  : "hover:bg-white/50 text-gray-500"
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${role === "Admin" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-bold truncate ${role === "Admin" ? "text-emerald-800" : "text-gray-700"}`}>FPO Admin</p>
                <p className="text-[10px] text-gray-400 truncate">Access your FPO account</p>
              </div>
              {role === "Admin" && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-emerald-600 rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => { setRole("SuperAdmin"); setStep(1); setOtp(Array(6).fill("")); setFormError(""); }}
              className={`flex items-center gap-2.5 p-2.5 rounded-xl transition text-left relative ${
                role === "SuperAdmin"
                  ? "bg-white shadow-sm border border-gray-100"
                  : "hover:bg-white/50 text-gray-500"
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${role === "SuperAdmin" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                <Shield className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-bold truncate ${role === "SuperAdmin" ? "text-emerald-800" : "text-gray-700"}`}>Super Admin</p>
                <p className="text-[10px] text-gray-400 truncate">System administrator</p>
              </div>
              {role === "SuperAdmin" && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-emerald-600 rounded-full" />
              )}
            </button>
          </div>

          {/* Context header */}
          <div className="mb-3.5">
            <h2 className="text-xs font-bold text-emerald-700">
              Login as {role === "Admin" ? "FPO Admin" : "Super Admin"}
            </h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Enter your registered mobile number to continue
            </p>
          </div>

          {displayError && (
            <div className="flex gap-2 p-2.5 mb-3 border border-red-200 rounded-xl bg-red-50">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{displayError}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5">
            {step === 1 ? (
              <div>
                <label className="block mb-1.5 text-xs font-bold text-slate-800">Mobile Number</label>
                <div className="relative flex items-center h-12 rounded-2xl border-2 border-emerald-500/80 focus-within:border-emerald-600 focus-within:ring-4 focus-within:ring-emerald-500/15 bg-white overflow-hidden shadow-xs transition-all">
                  {/* Left Country Code Prefix */}
                  <div className="flex items-center gap-1.5 px-3.5 h-full bg-slate-50/70 border-r border-slate-200/80 text-xs font-bold text-slate-700 select-none">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>+91</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </div>

                  {/* Input field */}
                  <input
                    type="tel"
                    autoFocus
                    placeholder="Enter mobile number"
                    value={mobile}
                    maxLength={10}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setMobile(val);
                      setFormError("");
                    }}
                    className="flex-1 px-3.5 h-full text-sm font-medium text-slate-800 placeholder-slate-300 outline-none bg-transparent"
                  />

                  {/* Right Status / Clear / Counter */}
                  <div className="flex items-center gap-1.5 pr-3.5 select-none">
                    {mobile.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setMobile("")}
                        className="w-4 h-4 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-[10px] transition"
                        title="Clear"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}

                    {mobile.length === 10 ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        10/10
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-400">
                        {mobile.length}/10
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">Enter OTP</label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Sent to <span className="font-semibold text-slate-700">+91 {mobile}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setOtp(Array(6).fill(""));
                      setFormError("");
                    }}
                    className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold hover:text-emerald-800 transition hover:underline"
                  >
                    <Edit2 className="w-3 h-3" />
                    Change
                  </button>
                </div>

                {/* Animated 6-digit OTP Inputs */}
                <div className="flex gap-2 justify-between py-1">
                  {otp.map((digit, i) => {
                    const isFilled = digit !== "";
                    return (
                      <input
                        key={i}
                        id={`otp-${i}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          const next = [...otp];
                          if (!val) {
                            next[i] = "";
                            setOtp(next);
                            return;
                          }
                          next[i] = val.slice(-1);
                          setOtp(next);
                          setFormError("");
                          if (i < 5) document.getElementById(`otp-${i + 1}`)?.focus();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace") {
                            const next = [...otp];
                            if (next[i]) {
                              next[i] = "";
                              setOtp(next);
                            } else if (i > 0) {
                              document.getElementById(`otp-${i - 1}`)?.focus();
                            }
                          }
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                          const next = Array(6).fill("");
                          pasted.split("").forEach((c, idx) => {
                            next[idx] = c;
                          });
                          setOtp(next);
                          document.getElementById(`otp-${Math.min(pasted.length, 5)}`)?.focus();
                        }}
                        className={`w-11 h-12 text-center text-lg font-bold rounded-2xl outline-none transition-all duration-200 shadow-2xs ${
                          isFilled
                            ? "border-2 border-emerald-500 bg-emerald-50/70 text-emerald-900 scale-100 shadow-sm"
                            : "border-2 border-emerald-500/70 bg-white text-slate-800 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/20 focus:scale-105 focus:shadow-md"
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Resend OTP Timer & Action */}
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-400 font-medium">Didn't receive OTP?</span>
                  {timer > 0 ? (
                    <span className="font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
                      Resend in 00:{timer < 10 ? `0${timer}` : timer}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-800 transition hover:underline"
                    >
                      <RotateCw className="w-3 h-3" />
                      Resend OTP
                    </button>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`relative overflow-hidden w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs transition-all duration-300 active:scale-[0.98] ${
                loading
                  ? "bg-emerald-700 text-white cursor-wait shadow-lg shadow-emerald-700/25 ring-2 ring-emerald-400/40"
                  : "bg-emerald-800 hover:bg-emerald-900 text-white shadow-md shadow-emerald-900/15 hover:shadow-lg"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-200" />
                  <span className="tracking-wide">
                    {step === 1 ? "Sending OTP" : "Verifying"}
                  </span>
                  <span className="inline-flex gap-1 items-center ml-0.5">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-white/80 rounded-full animate-bounce [animation-delay:0.15s]" />
                    <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce [animation-delay:0.3s]" />
                  </span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-200" />
                  <span>{step === 1 ? "Send OTP" : "Verify OTP"}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-75 ml-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Security Banner */}
          <div className="mt-3.5 bg-emerald-50/70 border border-emerald-100 rounded-xl py-2 px-3 flex items-center justify-center gap-2 text-[10px] font-medium text-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Secure login for authorized users only</span>
          </div>

          {/* Need help section */}
          <div className="mt-4 pt-3 border-t border-gray-100 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2.5 text-[10px] text-gray-400 font-medium">
              Need help?
            </div>

            <div className="grid grid-cols-3 gap-1 pt-1">
              <a href="#guide" onClick={(e) => e.preventDefault()} className="flex items-start gap-1.5 p-1 rounded-lg hover:bg-gray-50 transition group">
                <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-left min-w-0">
                  <p className="text-[10px] font-bold text-gray-800 leading-tight group-hover:text-emerald-700 truncate">User Guide</p>
                  <p className="text-[8px] text-gray-400 truncate">View documentation</p>
                </div>
              </a>

              <a href="#support" onClick={(e) => e.preventDefault()} className="flex items-start gap-1.5 p-1 rounded-lg hover:bg-gray-50 transition group">
                <Headphones className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-left min-w-0">
                  <p className="text-[10px] font-bold text-gray-800 leading-tight group-hover:text-emerald-700 truncate">Contact Support</p>
                  <p className="text-[8px] text-gray-400 truncate">Get assistance</p>
                </div>
              </a>

              <a href="#privacy" onClick={(e) => e.preventDefault()} className="flex items-start gap-1.5 p-1 rounded-lg hover:bg-gray-50 transition group">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-left min-w-0">
                  <p className="text-[10px] font-bold text-gray-800 leading-tight group-hover:text-emerald-700 truncate">Privacy Policy</p>
                  <p className="text-[8px] text-gray-400 truncate">Learn how we protect you</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

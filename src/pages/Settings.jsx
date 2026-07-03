import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProfile, updateProfile } from "../store/thunks/settingsThunk";
import { clearStatus } from "../store/slices/settingsSlice";
import { Save, Lock, CheckCircle2, Landmark, Info, RefreshCw, Edit2, Copy, Eye, EyeOff, Loader2, User, Wifi, Calendar, Shield, Activity, FileSpreadsheet } from "lucide-react";
import { usePermissions } from "../hooks/usePermissions";
import toast from "react-hot-toast";
import { authenticateSession } from "../store/thunks/eInvoiceThunk";
import { clearEInvoiceStatus } from "../store/slices/eInvoiceSlice";
import { isEInvoiceSessionValid, isEWayBillSessionValid } from "../lib/api";
import { getUserFriendlyEInvoiceError } from "../utils/eInvoiceErrors";
import { authenticateEWayBillSession } from "../store/thunks/eWayBillThunk";
import { clearEWayBillStatus } from "../store/slices/eWayBillSlice";

function Settings() {
  const dispatch = useDispatch();
  const { profile, loading, success, error } = useSelector((s) => s.settings);
  const authUser = useSelector((s) => s.auth.user);
  const { isReadOnly } = usePermissions();
  const data = profile || authUser;
  const { sessionLoading, sessionToken, sessionError } = useSelector((s) => s.eInvoice);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lastConnectedTime, setLastConnectedTime] = useState(null);
  const [connectLoading, setConnectLoading] = useState(false);

  // E-Way Bill States
  const { 
    sessionToken: ewayBillSessionToken, 
    sessionLoading: ewayBillSessionLoading, 
    sessionError: ewayBillSessionError 
  } = useSelector((s) => s.eWayBill);
  const [isEWayBillEditing, setIsEWayBillEditing] = useState(false);
  const [showEWayBillPassword, setShowEWayBillPassword] = useState(false);
  const [lastEWayBillConnectedTime, setLastEWayBillConnectedTime] = useState(null);
  const [connectEWayBillLoading, setConnectEWayBillLoading] = useState(false);

  // Set lastConnectedTime when token is active
  useEffect(() => {
    if (sessionToken && !lastConnectedTime) {
      setLastConnectedTime(new Date());
    }
  }, [sessionToken, lastConnectedTime]);

  // Set lastEWayBillConnectedTime when token is active
  useEffect(() => {
    if (ewayBillSessionToken && !lastEWayBillConnectedTime) {
      setLastEWayBillConnectedTime(new Date());
    }
  }, [ewayBillSessionToken, lastEWayBillConnectedTime]);

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
    estimatedTurnover: "",
    eInvoiceUsername: "",
    eInvoicePassword: "",
    eInvoiceGstin: "",
    eWayBillUsername: "",
    eWayBillPassword: "",
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
        estimatedTurnover: data.estimatedTurnover || "",
        eInvoiceUsername: data.eInvoiceUsername || "",
        eInvoicePassword: data.eInvoicePassword || "",
        eInvoiceGstin: data.eInvoiceGstin || data.gstin || data.gstNumber || "",
        eWayBillUsername: data.eWayBillUsername || "",
        eWayBillPassword: data.eWayBillPassword || "",
      });
    }
  }, [profile, authUser]);

  /* CLEAR E-INVOICE STATUS ON UNMOUNT */
  useEffect(() => {
    return () => {
      dispatch(clearEInvoiceStatus());
      dispatch(clearEWayBillStatus());
    };
  }, [dispatch]);

  /* CONNECT TO PORTAL AND SAVE CREDENTIALS */
  const handleConnect = async (e) => {
    if (e) e.preventDefault();
    if (!form.eInvoiceGstin) {
      toast.error("Please enter your Business GSTIN.");
      return;
    }
    if (form.eInvoiceGstin.length !== 15) {
      toast.error("Business GSTIN must be exactly 15 alphanumeric characters.");
      return;
    }
    if (!form.eInvoiceUsername || !form.eInvoicePassword) {
      toast.error("Please enter your Government Portal Username and Password.");
      return;
    }
    const payload = {
      eInvoiceUsername: form.eInvoiceUsername,
      eInvoicePassword: form.eInvoicePassword,
      gstNumber: form.eInvoiceGstin, // Backend stores taxpayer GSTIN in gstNumber
    };
    
    setConnectLoading(true);
    try {
      await dispatch(updateProfile(payload)).unwrap();
      
      // Call authentication securely without passing credentials in the request body
      await dispatch(authenticateSession({})).unwrap();
      
      setLastConnectedTime(new Date());
      setIsEditing(false);
      toast.success("Successfully connected to the Government E-Invoice Portal!");
    } catch (err) {
      console.error("Connection failed:", err);
    } finally {
      setConnectLoading(false);
    }
  };

  /* RECONNECT CURRENT SESSION */
  const handleReconnect = () => {
    dispatch(authenticateSession({}))
      .unwrap()
      .then(() => {
        setLastConnectedTime(new Date());
        toast.success("Session reconnected successfully!");
      })
      .catch((err) => {
        toast.error(err || "Failed to reconnect session.");
      });
  };

  /* CONNECT TO E-WAY BILL PORTAL AND SAVE CREDENTIALS */
  const handleEWayBillConnect = async (e) => {
    if (e) e.preventDefault();
    if (!form.eInvoiceGstin) {
      toast.error("Please enter your Business GSTIN.");
      return;
    }
    if (form.eInvoiceGstin.length !== 15) {
      toast.error("Business GSTIN must be exactly 15 alphanumeric characters.");
      return;
    }
    if (!form.eWayBillUsername || !form.eWayBillPassword) {
      toast.error("Please enter your Government E-Way Bill Portal Username and Password.");
      return;
    }
    const payload = {
      eWayBillUsername: form.eWayBillUsername,
      eWayBillPassword: form.eWayBillPassword,
      gstNumber: form.eInvoiceGstin,
    };
    
    setConnectEWayBillLoading(true);
    try {
      await dispatch(updateProfile(payload)).unwrap();
      
      // Call authentication securely without passing credentials in the request body
      await dispatch(authenticateEWayBillSession({})).unwrap();
      
      setLastEWayBillConnectedTime(new Date());
      setIsEWayBillEditing(false);
      toast.success("Successfully connected to the Government E-Way Bill Portal!");
    } catch (err) {
      console.error("E-Way Bill Connection failed:", err);
    } finally {
      setConnectEWayBillLoading(false);
    }
  };

  /* RECONNECT CURRENT E-WAY BILL SESSION */
  const handleEWayBillReconnect = () => {
    dispatch(authenticateEWayBillSession({}))
      .unwrap()
      .then(() => {
        setLastEWayBillConnectedTime(new Date());
        toast.success("E-Way Bill session reconnected successfully!");
      })
      .catch((err) => {
        toast.error(err || "Failed to reconnect E-Way Bill session.");
      });
  };

  const [isSavingProfile, setIsSavingProfile] = useState(false);

  /* SAVE PROFILE */
  const handleSave = async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(
      Object.entries(form).filter(([, v]) => v !== ""),
    );
    setIsSavingProfile(true);
    try {
      await dispatch(updateProfile(payload)).unwrap();
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setIsSavingProfile(false);
    }
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

  const isConnected = !!sessionToken && isEInvoiceSessionValid();
  const isEWayBillConnected = !!ewayBillSessionToken && isEWayBillSessionValid();

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
              ["estimatedTurnover", "Estimated Turnover"],
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
                  disabled={isSavingProfile}
                  className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm transition"
                >
                  <Save className="w-4 h-4" />
                  {isSavingProfile ? "Saving..." : "Save Changes"}
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

      {/* GOVERNMENT E-INVOICE INTEGRATION CARD */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-150 mt-6 space-y-6">
        {/* State 1: Setup Form */}
        {(!isConnected || isEditing) ? (
          <div className="space-y-6">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-650 shrink-0">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-gray-900 flex items-center gap-2">
                    🏛 Government E-Invoice
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Connect your business to the Government E-Invoice Portal.
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    This is a one-time setup required before you can generate Government GST E-Invoices.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-red-55/60 border border-red-100 rounded-full text-red-700 text-xs font-semibold self-start sm:self-center">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block animate-pulse"></span>
                🔴 Not Connected
              </div>
            </div>

            {/* Failure alert message */}
            {sessionError && (() => {
              const friendlyError = getUserFriendlyEInvoiceError(sessionError);
              return (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-850 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="text-red-500 font-bold text-sm shrink-0">❌</div>
                  <div className="flex-1 space-y-2">
                    <p className="font-bold text-red-900">{friendlyError.title}</p>
                    <p className="text-red-800 leading-relaxed font-semibold">
                      {friendlyError.description}
                    </p>
                    <p className="text-red-750 leading-relaxed font-medium bg-white/75 p-2.5 rounded-lg border border-red-100">
                      <strong>Action:</strong> {friendlyError.actionableAdvice}
                    </p>

                    <details className="text-[10px] text-red-600 font-medium cursor-pointer select-none pt-1 border-t border-red-200/50">
                      <summary className="hover:text-red-800 transition duration-150">View technical error details</summary>
                      <p className="text-[10px] text-red-700 font-mono bg-red-100/50 p-2 rounded-lg break-all mt-1 cursor-text select-text">
                        {sessionError}
                      </p>
                    </details>

                    <button
                      onClick={() => dispatch(clearEInvoiceStatus())}
                      className="mt-2 px-3 py-1.5 bg-red-600 hover:bg-red-750 text-white rounded-lg text-[10px] font-bold transition inline-block cursor-pointer border-0 shadow-xs"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Input Form */}
            <form onSubmit={handleConnect} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Business GSTIN
                  </label>
                  <input
                    disabled={connectLoading || sessionLoading}
                    maxLength={15}
                    value={form.eInvoiceGstin}
                    onChange={(e) => setForm({ ...form, eInvoiceGstin: e.target.value.toUpperCase() })}
                    placeholder="29AAACQ3770E000"
                    className="w-full border border-gray-205 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Government Portal Username
                  </label>
                  <input
                    disabled={connectLoading || sessionLoading}
                    value={form.eInvoiceUsername}
                    onChange={(e) => setForm({ ...form, eInvoiceUsername: e.target.value })}
                    placeholder="Portal Username"
                    className="w-full border border-gray-205 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Government Portal Password
                  </label>
                  <div className="relative">
                    <input
                      disabled={connectLoading || sessionLoading}
                      type={showPassword ? "text" : "password"}
                      value={form.eInvoicePassword}
                      onChange={(e) => setForm({ ...form, eInvoicePassword: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full border border-gray-205 pl-3 pr-10 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-605"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Info alert / Action footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div className="flex items-start gap-2 bg-gray-50 px-4 py-3 rounded-xl border border-gray-150 flex-1">
                  <Lock className="w-4 h-4 text-brand-650 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    🔒 Your login details are securely stored. They are only used to connect to the Government E-Invoice Portal.
                  </p>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-55 text-sm font-semibold rounded-xl transition animate-none"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={connectLoading || sessionLoading}
                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm shrink-0 select-none animate-none"
                  >
                    {connectLoading || sessionLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Connecting to Government Portal...
                      </>
                    ) : (
                      "Connect"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          /* State 2: Connected Dashboard (Matches Requested Design) */
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100 relative">
                  <Landmark className="w-5.5 h-5.5" />
                  <span className="absolute bottom-0 right-0 w-4.5 h-4.5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-[9px] text-white select-none">✓</span>
                </div>
                <div>
                  <h2 className="font-bold text-lg text-gray-950 tracking-tight">
                    Government E-Invoice
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Connect to the Government E-Invoice portal and generate official GST E-Invoices for eligible B2B sales.
                  </p>
                </div>
              </div>

              {/* Connected badge */}
              <div className="flex items-center gap-3 px-5 py-3 bg-emerald-50/40 border border-emerald-150 rounded-2xl text-emerald-850 shrink-0 select-none">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 font-bold text-xs">
                  ✓
                </div>
                <div className="text-xs">
                  <p className="font-bold text-emerald-950">Connected</p>
                  <p className="text-[10px] text-emerald-700 mt-0.5">E-Invoice service is ready to use</p>
                </div>
              </div>
            </div>

            {/* Integration Details Info Row (Four Column Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-gray-150 rounded-2xl p-5 bg-white divide-y sm:divide-y-0 sm:divide-x divide-gray-100 shadow-2xs gap-4 sm:gap-0">
              {/* Column 1: GSTIN */}
              <div className="flex items-center gap-3.5 px-0 sm:px-4 py-2 sm:py-0">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-405 uppercase tracking-wider">Your GSTIN</p>
                  <p className="text-xs font-bold text-gray-800 font-mono mt-0.5">{form.eInvoiceGstin || "—"}</p>
                </div>
              </div>

              {/* Column 2: Connection status */}
              <div className="flex items-center gap-3.5 px-0 sm:px-6 py-2 sm:py-0">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-405 uppercase tracking-wider">Connection</p>
                  <p className="text-xs font-black text-emerald-650 mt-0.5">Active</p>
                </div>
              </div>

              {/* Column 3: Last connected timestamp */}
              <div className="flex items-center gap-3.5 px-0 sm:px-6 py-2 sm:py-0">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-405 uppercase tracking-wider">Last Connected</p>
                  <p className="text-xs font-bold text-gray-850 mt-0.5">
                    {lastConnectedTime ? `Today, ${lastConnectedTime.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true })}` : "—"}
                  </p>
                </div>
              </div>

              {/* Column 4: Portal context */}
              <div className="flex items-center gap-3.5 px-0 sm:px-6 py-2 sm:py-0">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-405 uppercase tracking-wider">Portal</p>
                  <p className="text-xs font-bold text-gray-800 mt-0.5">Sandbox (Testing)</p>
                </div>
              </div>
            </div>

            {/* Portal Login Details Sub-container */}
            <div className="border border-gray-150 rounded-2xl p-5 bg-white space-y-4 shadow-3xs">
              <div className="flex items-center gap-2 text-emerald-600 border-b border-gray-100 pb-3">
                <Lock className="w-4 h-4 shrink-0" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700">Portal Login Details</h3>
              </div>

              {/* Details boxes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Username */}
                <div className="flex items-center gap-3 border border-gray-150 rounded-xl p-3.5 bg-gray-50/30">
                  <User className="w-5 h-5 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-450 font-bold uppercase tracking-wider">Portal Username</p>
                    <p className="text-xs font-bold text-gray-855 truncate mt-0.5">{form.eInvoiceUsername || "—"}</p>
                  </div>
                </div>

                {/* Password */}
                <div className="flex items-center gap-3 border border-gray-150 rounded-xl p-3.5 bg-gray-50/30 justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Lock className="w-5 h-5 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-450 font-bold uppercase tracking-wider">Portal Password</p>
                      <p className="text-xs font-bold text-gray-855 mt-0.5">••••••••••••</p>
                    </div>
                  </div>
                  <EyeOff className="w-4 h-4 text-gray-300 cursor-not-allowed shrink-0" />
                </div>

                {/* Business GSTIN */}
                <div className="flex items-center gap-3 border border-gray-150 rounded-xl p-3.5 bg-gray-50/30">
                  <FileSpreadsheet className="w-5 h-5 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-450 font-bold uppercase tracking-wider">Business GSTIN</p>
                    <p className="text-xs font-bold text-gray-855 font-mono truncate mt-0.5">{form.eInvoiceGstin || "—"}</p>
                  </div>
                </div>
              </div>

              {/* All set Banner */}
              <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-4 flex items-center justify-between shadow-2xs gap-4 flex-wrap sm:flex-nowrap">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 select-none animate-none">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-emerald-950">All set!</h4>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      You can now generate Government E-Invoices for eligible GST-registered customers.
                    </p>
                  </div>
                </div>
                {/* Simulated CSS graphic of Document with QR and check shield */}
                <div className="flex items-center gap-2 border border-emerald-100 bg-white p-2 rounded-lg shrink-0 pr-3 select-none">
                  <div className="w-6 h-6 bg-emerald-50 rounded flex items-center justify-center text-emerald-600 font-bold text-xs">QR</div>
                  <div className="text-[9px] text-gray-550 font-bold leading-tight">
                    <p className="text-emerald-800">E-INVOICE</p>
                    <p className="text-gray-400">READY</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons footer */}
            <div className="flex justify-between items-center pt-2 gap-4 flex-wrap">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleReconnect}
                  disabled={sessionLoading}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 animate-none shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${sessionLoading ? "animate-spin" : ""}`} />
                  Reconnect
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 px-5 py-2.5 border border-gray-200 text-gray-650 hover:bg-gray-55 text-xs font-bold rounded-xl transition animate-none shrink-0"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Update Login Details
                </button>
              </div>

              <button
                type="button"
                onClick={handleReconnect}
                disabled={sessionLoading}
                className="flex items-center gap-1.5 px-5 py-2.5 border border-gray-200 text-gray-650 hover:bg-gray-55 text-xs font-bold rounded-xl transition animate-none shrink-0"
              >
                <Activity className="w-3.5 h-3.5" />
                Test Connection
              </button>
            </div>

            {/* Security policy card */}
            <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-5 flex items-center justify-between text-xs shadow-3xs gap-4 flex-wrap sm:flex-nowrap">
              <div className="flex items-start gap-3.5">
                <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-blue-950 text-xs">Your information is safe</h4>
                  <p className="text-blue-800 text-[11px] mt-0.5 leading-relaxed">
                    Your portal login details are securely stored and used only to connect and generate Government E-Invoices.
                  </p>
                </div>
              </div>
              <a 
                href="https://einv-apisandbox.nic.in/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[11px] font-bold text-blue-700 hover:underline hover:text-blue-800 shrink-0 flex items-center gap-0.5"
              >
                Learn more about E-Invoice &gt;
              </a>
            </div>
          </div>
        )}
      </div>

      {/* GOVERNMENT E-WAY BILL INTEGRATION CARD */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-150 mt-6 space-y-6">
        {/* State 1: Setup Form */}
        {(!isEWayBillConnected || isEWayBillEditing) ? (
          <div className="space-y-6">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-650 shrink-0">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-gray-900 flex items-center gap-2">
                    🚚 Government E-Way Bill
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Connect your business to the Government E-Way Bill Portal.
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    This is a one-time setup required before you can generate Government E-Way Bills.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-red-55/60 border border-red-100 rounded-full text-red-700 text-xs font-semibold self-start sm:self-center">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block animate-pulse"></span>
                🔴 Not Connected
              </div>
            </div>

            {/* Failure alert message */}
            {ewayBillSessionError && (() => {
              const friendlyError = getUserFriendlyEInvoiceError(ewayBillSessionError);
              return (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-850 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="text-red-500 font-bold text-sm shrink-0">❌</div>
                  <div className="flex-1 space-y-2">
                    <p className="font-bold text-red-900">{friendlyError.title}</p>
                    <p className="text-red-800 leading-relaxed font-semibold">
                      {friendlyError.description}
                    </p>
                    <p className="text-red-750 leading-relaxed font-medium bg-white/75 p-2.5 rounded-lg border border-red-100">
                      <strong>Action:</strong> {friendlyError.actionableAdvice}
                    </p>

                    <details className="text-[10px] text-red-600 font-medium cursor-pointer select-none pt-1 border-t border-red-200/50">
                      <summary className="hover:text-red-800 transition duration-150">View technical error details</summary>
                      <p className="text-[10px] text-red-700 font-mono bg-red-100/50 p-2 rounded-lg break-all mt-1 cursor-text select-text">
                        {ewayBillSessionError}
                      </p>
                    </details>

                    <button
                      onClick={() => dispatch(clearEWayBillStatus())}
                      className="mt-2 px-3 py-1.5 bg-red-600 hover:bg-red-750 text-white rounded-lg text-[10px] font-bold transition inline-block cursor-pointer border-0 shadow-xs"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Input Form */}
            <form onSubmit={handleEWayBillConnect} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Business GSTIN
                  </label>
                  <input
                    disabled={connectEWayBillLoading || ewayBillSessionLoading}
                    maxLength={15}
                    value={form.eInvoiceGstin}
                    onChange={(e) => setForm({ ...form, eInvoiceGstin: e.target.value.toUpperCase() })}
                    placeholder="29AAACQ3770E000"
                    className="w-full border border-gray-205 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    E-Way Bill Portal Username
                  </label>
                  <input
                    disabled={connectEWayBillLoading || ewayBillSessionLoading}
                    value={form.eWayBillUsername}
                    onChange={(e) => setForm({ ...form, eWayBillUsername: e.target.value })}
                    placeholder="Portal Username"
                    className="w-full border border-gray-205 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    E-Way Bill Portal Password
                  </label>
                  <div className="relative">
                    <input
                      disabled={connectEWayBillLoading || ewayBillSessionLoading}
                      type={showEWayBillPassword ? "text" : "password"}
                      value={form.eWayBillPassword}
                      onChange={(e) => setForm({ ...form, eWayBillPassword: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full border border-gray-205 pl-3 pr-10 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEWayBillPassword(!showEWayBillPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-605"
                    >
                      {showEWayBillPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Info alert / Action footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div className="flex items-start gap-2 bg-gray-50 px-4 py-3 rounded-xl border border-gray-150 flex-1">
                  <Lock className="w-4 h-4 text-brand-650 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    🔒 Your login details are securely stored. They are only used to connect to the Government E-Way Bill Portal.
                  </p>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  {isEWayBillEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEWayBillEditing(false)}
                      className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-55 text-sm font-semibold rounded-xl transition animate-none"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={connectEWayBillLoading || ewayBillSessionLoading}
                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm shrink-0 select-none animate-none"
                  >
                    {connectEWayBillLoading || ewayBillSessionLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Connecting to Portal...
                      </>
                    ) : (
                      "Connect"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          /* State 2: Connected Dashboard */
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100 relative">
                  <Landmark className="w-5.5 h-5.5" />
                  <span className="absolute bottom-0 right-0 w-4.5 h-4.5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-[9px] text-white select-none">✓</span>
                </div>
                <div>
                  <h2 className="font-bold text-lg text-gray-950 tracking-tight">
                    Government E-Way Bill
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Connect to the Government E-Way Bill portal and generate official GST E-Way Bills for eligible sales.
                  </p>
                </div>
              </div>

              {/* Connected badge */}
              <div className="flex items-center gap-3 px-5 py-3 bg-emerald-50/40 border border-emerald-150 rounded-2xl text-emerald-850 shrink-0 select-none">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 font-bold text-xs">
                  ✓
                </div>
                <div className="text-xs">
                  <p className="font-bold text-emerald-950">Connected</p>
                  <p className="text-[10px] text-emerald-700 mt-0.5">E-Way Bill service is ready to use</p>
                </div>
              </div>
            </div>

            {/* Integration Details Info Row (Four Column Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-gray-150 rounded-2xl p-5 bg-white divide-y sm:divide-y-0 sm:divide-x divide-gray-100 shadow-2xs gap-4 sm:gap-0">
              {/* Column 1: GSTIN */}
              <div className="flex items-center gap-3.5 px-0 sm:px-4 py-2 sm:py-0">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-405 uppercase tracking-wider">Your GSTIN</p>
                  <p className="text-xs font-bold text-gray-800 font-mono mt-0.5">{form.eInvoiceGstin || "—"}</p>
                </div>
              </div>

              {/* Column 2: Connection status */}
              <div className="flex items-center gap-3.5 px-0 sm:px-6 py-2 sm:py-0">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-405 uppercase tracking-wider">Connection</p>
                  <p className="text-xs font-black text-emerald-650 mt-0.5">Active</p>
                </div>
              </div>

              {/* Column 3: Last connected timestamp */}
              <div className="flex items-center gap-3.5 px-0 sm:px-6 py-2 sm:py-0">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-405 uppercase tracking-wider">Last Connected</p>
                  <p className="text-xs font-bold text-gray-855 mt-0.5">
                    {lastEWayBillConnectedTime ? `Today, ${lastEWayBillConnectedTime.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true })}` : "—"}
                  </p>
                </div>
              </div>

              {/* Column 4: Portal context */}
              <div className="flex items-center gap-3.5 px-0 sm:px-6 py-2 sm:py-0">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-405 uppercase tracking-wider">Portal</p>
                  <p className="text-xs font-bold text-gray-800 mt-0.5">Sandbox (Testing)</p>
                </div>
              </div>
            </div>

            {/* Portal Login Details Sub-container */}
            <div className="border border-gray-150 rounded-2xl p-5 bg-white space-y-4 shadow-3xs">
              <div className="flex items-center gap-2 text-emerald-605 border-b border-gray-100 pb-3">
                <Lock className="w-4 h-4 shrink-0" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700">Portal Login Details</h3>
              </div>

              {/* Details boxes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Username */}
                <div className="flex items-center gap-3 border border-gray-150 rounded-xl p-3.5 bg-gray-50/30">
                  <User className="w-5 h-5 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-455 font-bold uppercase tracking-wider">Portal Username</p>
                    <p className="text-xs font-bold text-gray-855 truncate mt-0.5">{form.eWayBillUsername || "—"}</p>
                  </div>
                </div>

                {/* Password */}
                <div className="flex items-center gap-3 border border-gray-150 rounded-xl p-3.5 bg-gray-50/30 justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Lock className="w-5 h-5 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-455 font-bold uppercase tracking-wider">Portal Password</p>
                      <p className="text-xs font-bold text-gray-855 mt-0.5">••••••••••••</p>
                    </div>
                  </div>
                  <EyeOff className="w-4 h-4 text-gray-300 cursor-not-allowed shrink-0" />
                </div>

                {/* Business GSTIN */}
                <div className="flex items-center gap-3 border border-gray-150 rounded-xl p-3.5 bg-gray-50/30">
                  <FileSpreadsheet className="w-5 h-5 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-455 font-bold uppercase tracking-wider">Business GSTIN</p>
                    <p className="text-xs font-bold text-gray-855 font-mono truncate mt-0.5">{form.eInvoiceGstin || "—"}</p>
                  </div>
                </div>
              </div>

              {/* All set Banner */}
              <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-4 flex items-center justify-between shadow-2xs gap-4 flex-wrap sm:flex-nowrap">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 select-none animate-none">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-emerald-950">All set!</h4>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      You can now generate Government E-Way Bills for eligible sales.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 border border-emerald-100 bg-white p-2 rounded-lg shrink-0 pr-3 select-none">
                  <div className="w-6 h-6 bg-emerald-50 rounded flex items-center justify-center text-emerald-600 font-bold text-xs">EWB</div>
                  <div className="text-[9px] text-gray-550 font-bold leading-tight">
                    <p className="text-emerald-800">E-WAY BILL</p>
                    <p className="text-gray-400">READY</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons footer */}
            <div className="flex justify-between items-center pt-2 gap-4 flex-wrap">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleEWayBillReconnect}
                  disabled={ewayBillSessionLoading}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 animate-none shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${ewayBillSessionLoading ? "animate-spin" : ""}`} />
                  Reconnect
                </button>
                <button
                  type="button"
                  onClick={() => setIsEWayBillEditing(true)}
                  className="flex items-center gap-1.5 px-5 py-2.5 border border-gray-200 text-gray-655 hover:bg-gray-55 text-xs font-bold rounded-xl transition animate-none shrink-0"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Update Login Details
                </button>
              </div>

              <button
                type="button"
                onClick={handleEWayBillReconnect}
                disabled={ewayBillSessionLoading}
                className="flex items-center gap-1.5 px-5 py-2.5 border border-gray-200 text-gray-655 hover:bg-gray-55 text-xs font-bold rounded-xl transition animate-none shrink-0"
              >
                <Activity className="w-3.5 h-3.5" />
                Test Connection
              </button>
            </div>

            {/* Security policy card */}
            <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-5 flex items-center justify-between text-xs shadow-3xs gap-4 flex-wrap sm:flex-nowrap">
              <div className="flex items-start gap-3.5">
                <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-blue-950 text-xs">Your information is safe</h4>
                  <p className="text-blue-800 text-[11px] mt-0.5 leading-relaxed">
                    Your portal login details are securely stored and used only to connect and generate Government E-Way Bills.
                  </p>
                </div>
              </div>
              <a 
                href="https://einv-apisandbox.nic.in/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[11px] font-bold text-blue-700 hover:underline hover:text-blue-800 shrink-0 flex items-center gap-0.5"
              >
                Learn more about E-Way Bill &gt;
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;

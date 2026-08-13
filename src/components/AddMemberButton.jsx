import { useRef, useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import {
  fetchMembers,
  createStaff,
  createFarmer,
} from "../store/thunks/membersThunk";
import {
  UserPlus,
  ChevronDown,
  X,
  Eye,
  EyeOff,
  User,
  Phone,
  MapPin,
  Landmark,
  Sprout,
  Briefcase,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

/* ─── Shared Premium Modal Shell ───────────────────────────── */
function ModalShell({ title, subtitle, icon: Icon, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center border border-brand-100 shadow-3xs">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">{title}</h2>
              {subtitle && <p className="text-xs text-slate-500 font-semibold">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function ModalFooter({ onClose, loading, label }) {
  return (
    <div className="flex justify-end items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        className="px-4 py-2.5 text-xs font-bold border border-slate-200 text-slate-600 bg-white rounded-xl hover:bg-slate-50 transition active:scale-95 cursor-pointer shadow-3xs"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={loading}
        className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition active:scale-95 disabled:opacity-60 cursor-pointer shadow-md"
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Saving...</span>
          </>
        ) : (
          <span>{label}</span>
        )}
      </button>
    </div>
  );
}

function Field({
  label,
  k,
  form,
  set,
  type = "text",
  required = false,
  placeholder,
  error,
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div>
      <label className="text-xs font-bold text-slate-700 mb-1.5 block">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          type={isPassword ? (show ? "text" : "password") : type}
          value={form[k]}
          placeholder={placeholder}
          onChange={
            k === "phone"
              ? (e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 10);
                  set(k)({ target: { value: v } });
                }
              : set(k)
          }
          inputMode={k === "phone" ? "numeric" : undefined}
          maxLength={k === "phone" ? 10 : undefined}
          className={`w-full px-3.5 py-2.5 text-xs font-semibold border rounded-xl focus:outline-none focus:ring-2 transition bg-white h-[40px] text-slate-800 ${
            isPassword ? "pr-9" : ""
          } ${
            error
              ? "border-rose-400 focus:ring-rose-400 bg-rose-50/20 text-rose-900"
              : "border-slate-200 focus:ring-brand-500"
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && <p className="text-[11px] font-bold text-rose-600 mt-1">{error}</p>}
    </div>
  );
}

function LocationFields({ form, set }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Field label="Village" k="village" form={form} set={set} placeholder="e.g. Rampur" />
      <Field label="District" k="district" form={form} set={set} placeholder="e.g. Gorakhpur" />
      <div>
        <label className="text-xs font-bold text-slate-700 mb-1.5 block">State</label>
        <select
          value={form.state}
          onChange={set("state")}
          className="w-full px-3 py-2.5 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white h-[40px] text-slate-800 cursor-pointer"
        >
          <option value="">Select State</option>
          {INDIAN_STATES.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/* ─── Premium Farmer Modal ────────────────────────────────────────── */
function FarmerModal({ onClose }) {
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    village: "",
    district: "",
    state: "Uttar Pradesh",
    farmerCategory: "medium",
    bankName: "",
    ifscCode: "",
    accountNumber: "",
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((prev) => ({ ...prev, [k]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "First name is required";
    else if (form.firstName.trim().length < 2) e.firstName = "Min 2 characters";

    if (!/^[6-9]\d{9}$/.test(form.phone))
      e.phone = "Enter valid 10-digit Indian mobile number";

    if (
      form.ifscCode &&
      !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifscCode.toUpperCase())
    )
      e.ifscCode = "Invalid IFSC (e.g. SBIN0001234)";

    if (form.accountNumber && !/^\d{9,18}$/.test(form.accountNumber))
      e.accountNumber = "Must be 9–18 digits";

    if (form.bankName && form.bankName.trim().length < 3)
      e.bankName = "Enter full bank name";

    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setError("");
    setLoading(true);
    const payload = {
      role: "Farmer",
      ...Object.fromEntries(Object.entries(form).filter(([, v]) => v !== "")),
      ...(form.ifscCode && { ifscCode: form.ifscCode.toUpperCase() }),
    };
    if (!payload.emailId) {
      payload.emailId = `farmer.${form.phone}@noemail.local`;
    }
    const result = await dispatch(createFarmer(payload));
    setLoading(false);
    if (createFarmer.fulfilled.match(result)) {
      await dispatch(fetchMembers());
      onClose();
    } else {
      const msg = result.payload || "Failed to create farmer";
      setError(
        msg.toLowerCase().includes("already exists")
          ? "This mobile number is already registered. Please use a different number."
          : msg
      );
      if (msg.toLowerCase().includes("already exists")) {
        await dispatch(fetchMembers());
      }
    }
  };

  return (
    <ModalShell
      title="Add New Farmer"
      subtitle="Register a new member farmer to the FPO database"
      icon={Sprout}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
        {/* Section 1: Personal Information */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
            <User className="w-3.5 h-3.5 text-brand-600" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Personal Information
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              label="First Name"
              k="firstName"
              form={form}
              set={set}
              required
              placeholder="e.g. Ramesh"
              error={errors.firstName}
            />
            <Field
              label="Last Name"
              k="lastName"
              form={form}
              set={set}
              placeholder="e.g. Kumar"
            />
            <Field
              label="Mobile Phone"
              k="phone"
              form={form}
              set={set}
              required
              placeholder="10-digit mobile number"
              error={errors.phone}
            />
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                Farmer Category
              </label>
              <select
                value={form.farmerCategory}
                onChange={set("farmerCategory")}
                className="w-full px-3 py-2.5 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white h-[40px] text-slate-800 cursor-pointer"
              >
                <option value="small">Small Farmer (&lt; 2 Hectares)</option>
                <option value="medium">Medium Farmer (2–10 Hectares)</option>
                <option value="large">Large / Marginal (&gt; 10 Hectares)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Address & Location */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
            <MapPin className="w-3.5 h-3.5 text-brand-600" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Address & Location
            </span>
          </div>
          <LocationFields form={form} set={set} />
        </div>

        {/* Section 3: Bank Account Details */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
            <Landmark className="w-3.5 h-3.5 text-brand-600" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Bank Account Details (Optional)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field
              label="Bank Name"
              k="bankName"
              form={form}
              set={set}
              placeholder="e.g. SBI, HDFC"
              error={errors.bankName}
            />
            <Field
              label="IFSC Code"
              k="ifscCode"
              form={form}
              set={set}
              placeholder="e.g. SBIN0001234"
              error={errors.ifscCode}
            />
            <Field
              label="Account Number"
              k="accountNumber"
              form={form}
              set={set}
              placeholder="Bank A/C number"
              error={errors.accountNumber}
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
            {error}
          </div>
        )}

        <ModalFooter onClose={onClose} loading={loading} label="Register Farmer Member" />
      </form>
    </ModalShell>
  );
}

/* ─── Temp Password Actions ──────────────────────────────── */
function TempPasswordActions({ password, onDone }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 font-semibold">
        Staff member should change this password after first login.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={copy}
          className={`flex-1 px-4 py-2.5 text-xs rounded-xl border transition font-bold cursor-pointer ${
            copied
              ? "border-brand-500 text-brand-600 bg-brand-50"
              : "border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
        >
          {copied ? "✓ Copied!" : "Copy Password"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="flex-1 px-4 py-2.5 text-xs text-white bg-brand-600 rounded-xl hover:bg-brand-700 font-bold cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
}

/* ─── Premium Staff Modal ─────────────────────────────────────────── */
function StaffModal({ onClose }) {
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    village: "",
    district: "",
    state: "Uttar Pradesh",
    emailId: "",
    joiningDate: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const payload = Object.fromEntries(
      Object.entries(form).filter(([, v]) => v !== "" && v !== null && v !== undefined)
    );
    if (!payload.emailId) {
      payload.emailId = `staff.${payload.phone}@noemail.local`;
    }
    const result = await dispatch(createStaff(payload));
    setLoading(false);
    if (createStaff.fulfilled.match(result)) {
      dispatch(fetchMembers());
      setTempPassword(result.payload?.tempPassword || "");
    } else setError(result.payload || "Failed to create staff");
  };

  if (tempPassword)
    return (
      <ModalShell title="Staff Account Created" icon={CheckCircle2} onClose={() => {}}>
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 font-semibold">
            Staff account created successfully. Share this temporary password with the staff member:
          </p>
          <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 text-center">
            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Temporary Password</p>
            <p className="text-xl font-mono font-black text-brand-700 tracking-widest select-all">
              {tempPassword}
            </p>
          </div>
          <TempPasswordActions password={tempPassword} onDone={onClose} />
        </div>
      </ModalShell>
    );

  return (
    <ModalShell
      title="Add New Staff Member"
      subtitle="Create staff credentials for FPO operations"
      icon={Briefcase}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="First Name" k="firstName" form={form} set={set} required placeholder="e.g. Amit" />
          <Field label="Last Name" k="lastName" form={form} set={set} placeholder="e.g. Singh" />
          <Field label="Mobile Phone" k="phone" form={form} set={set} required placeholder="10-digit mobile number" />
          <Field label="Email Address" k="emailId" form={form} set={set} placeholder="staff@fpo.com" />
          <Field label="Joining Date" k="joiningDate" form={form} set={set} type="date" />
        </div>
        <LocationFields form={form} set={set} />
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
            {error}
          </div>
        )}
        <ModalFooter onClose={onClose} loading={loading} label="Create Staff Account" />
      </form>
    </ModalShell>
  );
}

/* ─── Premium FPO Modal ───────────────────────────────────────────── */
function FPOModal({ onClose }) {
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    village: "",
    district: "",
    state: "Uttar Pradesh",
    gstNumber: "",
    shopName: "",
    emailId: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const payload = {
      role: "FPO",
      ...Object.fromEntries(Object.entries(form).filter(([, v]) => v !== "")),
    };
    if (!payload.emailId) {
      payload.emailId = `fpo.${form.phone}@noemail.local`;
    }
    const result = await dispatch(createStaff(payload));
    setLoading(false);
    if (createStaff.fulfilled.match(result)) {
      dispatch(fetchMembers());
      onClose();
    } else setError(result.payload || "Failed to create FPO");
  };

  return (
    <ModalShell title="Add New FPO" icon={Briefcase} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="First Name" k="firstName" form={form} set={set} />
          <Field label="Last Name" k="lastName" form={form} set={set} />
          <Field label="Mobile Phone" k="phone" form={form} set={set} required />
          <Field label="Email" k="emailId" form={form} set={set} />
          <Field label="Shop Name" k="shopName" form={form} set={set} />
          <Field label="GST Number" k="gstNumber" form={form} set={set} />
        </div>
        <LocationFields form={form} set={set} />
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
            {error}
          </div>
        )}
        <ModalFooter onClose={onClose} loading={loading} label="Create FPO" />
      </form>
    </ModalShell>
  );
}

/* ─── Main Button Dropdown Component ───────────────────────── */
export default function AddMemberButton() {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const pick = (type) => {
    setModal(type);
    setOpen(false);
  };

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Member</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 py-1">
            <button
              type="button"
              onClick={() => pick("farmer")}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-brand-50 hover:text-brand-700 transition cursor-pointer"
            >
              <Sprout className="w-4 h-4 text-emerald-600" />
              <span>Add Farmer</span>
            </button>
            <button
              type="button"
              onClick={() => pick("staff")}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-brand-50 hover:text-brand-700 transition border-t border-slate-100 cursor-pointer"
            >
              <Briefcase className="w-4 h-4 text-blue-600" />
              <span>Add Staff</span>
            </button>
          </div>
        )}
      </div>

      {modal === "farmer" && <FarmerModal onClose={() => setModal(null)} />}
      {modal === "staff" && <StaffModal onClose={() => setModal(null)} />}
      {modal === "fpo" && <FPOModal onClose={() => setModal(null)} />}
    </>
  );
}

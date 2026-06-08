import { useRef, useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import {
  fetchMembers,
  createStaff,
  createFarmer,
} from "../store/thunks/membersThunk";
import { UserPlus, ChevronDown, X, Eye, EyeOff } from "lucide-react";

/* ─── Shared helpers ──────────────────────────────────────── */
function ModalShell({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({ onClose, loading, label }) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 text-sm text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "Saving..." : label}
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
  error,
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          type={isPassword ? (show ? "text" : "password") : type}
          value={form[k]}
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
          className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${isPassword ? "pr-9" : ""} ${error ? "border-red-400 focus:ring-red-400" : "focus:ring-brand-500"}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {show ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
      {error && <p className="text-[11px] text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

function GenderSelect({ value, onChange }) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">Gender</label>
      <select
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
      </select>
    </div>
  );
}

function LocationFields({ form, set }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        ["village", "Village"],
        ["district", "District"],
        ["state", "State"],
      ].map(([k, label]) => (
        <Field key={k} label={label} k={k} form={form} set={set} />
      ))}
    </div>
  );
}

/* ─── Farmer Modal ────────────────────────────────────────── */
function FarmerModal({ onClose }) {
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    village: "",
    district: "",
    state: "",
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
          : msg,
      );
      if (msg.toLowerCase().includes("already exists")) {
        await dispatch(fetchMembers());
      }
    }
  };

  return (
    <ModalShell title="Add New Farmer" onClose={onClose}>
      <form
        onSubmit={handleSubmit}
        className="p-5 space-y-3 max-h-[75vh] overflow-y-auto"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="First Name"
            k="firstName"
            form={form}
            set={set}
            required
            error={errors.firstName}
          />
          <Field label="Last Name" k="lastName" form={form} set={set} />
          <Field
            label="Mobile"
            k="phone"
            form={form}
            set={set}
            required
            error={errors.phone}
          />
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Farmer Category
            </label>
            <select
              value={form.farmerCategory}
              onChange={set("farmerCategory")}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Marginal</option>
            </select>
          </div>
        </div>
        <LocationFields form={form} set={set} />
        <div className="grid grid-cols-3 gap-3">
          <Field
            label="Bank Name"
            k="bankName"
            form={form}
            set={set}
            error={errors.bankName}
          />
          <Field
            label="IFSC Code"
            k="ifscCode"
            form={form}
            set={set}
            error={errors.ifscCode}
          />
          <Field
            label="Account Number"
            k="accountNumber"
            form={form}
            set={set}
            error={errors.accountNumber}
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <ModalFooter
          onClose={onClose}
          loading={loading}
          label="Register Farmer"
        />
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
      <p className="text-xs text-gray-400">
        Staff member should change this password after first login.
      </p>
      <div className="flex gap-2">
        <button
          onClick={copy}
          className={`flex-1 px-4 py-2 text-sm rounded-lg border transition font-medium ${
            copied
              ? "border-brand-500 text-brand-600 bg-brand-50"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          {copied ? "✓ Copied!" : "Copy Password"}
        </button>
        <button
          onClick={onDone}
          className="flex-1 px-4 py-2 text-sm text-white bg-brand-600 rounded-lg hover:bg-brand-700"
        >
          Done
        </button>
      </div>
    </div>
  );
}

/* ─── Staff Modal ─────────────────────────────────────────── */
function StaffModal({ onClose }) {
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    village: "",
    district: "",
    state: "",
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
      Object.entries(form).filter(([, v]) => v !== "" && v !== null && v !== undefined),
    );
    // Backend requires unique email — generate a placeholder if not provided
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
      <ModalShell title="Staff Created" onClose={() => {}}>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            Staff account created. Share this temporary password with the staff
            member:
          </p>
          <div className="bg-brand-50 border border-brand-200 rounded-lg px-4 py-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Temporary Password</p>
            <p className="text-lg font-mono font-bold text-brand-700 tracking-widest select-all">
              {tempPassword}
            </p>
          </div>
          <TempPasswordActions password={tempPassword} onDone={onClose} />
        </div>
      </ModalShell>
    );

  return (
    <ModalShell title="Add New Staff" onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="First Name"
            k="firstName"
            form={form}
            set={set}
            required
          />
          <Field label="Last Name" k="lastName" form={form} set={set} />
          <Field label="Mobile" k="phone" form={form} set={set} required />
          <Field label="Email" k="emailId" form={form} set={set} />
          <Field
            label="Joining Date"
            k="joiningDate"
            form={form}
            set={set}
            type="date"
          />
        </div>
        <LocationFields form={form} set={set} />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <ModalFooter onClose={onClose} loading={loading} label="Create Staff" />
      </form>
    </ModalShell>
  );
}

/* ─── FPO Modal ───────────────────────────────────────────── */
function FPOModal({ onClose }) {
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    village: "",
    district: "",
    state: "",
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
    <ModalShell title="Add New FPO" onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First Name" k="firstName" form={form} set={set} />
          <Field label="Last Name" k="lastName" form={form} set={set} />
          <Field label="Mobile" k="phone" form={form} set={set} required />
          <Field label="Email" k="emailId" form={form} set={set} />
          <Field label="Shop Name" k="shopName" form={form} set={set} />
          <Field label="GST Number" k="gstNumber" form={form} set={set} />
        </div>
        <LocationFields form={form} set={set} />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <ModalFooter onClose={onClose} loading={loading} label="Create FPO" />
      </form>
    </ModalShell>
  );
}

/* ─── Main Button ─────────────────────────────────────────── */
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
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition"
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Member</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
            <button
              onClick={() => pick("farmer")}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-brand-50 transition"
            >
              🌾 Add Farmer
            </button>
            <button
              onClick={() => pick("staff")}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-brand-50 transition border-t"
            >
              💼 Add Staff
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

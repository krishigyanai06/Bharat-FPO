import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { updateMember, updateKyc } from "../../store/thunks/membersThunk";
import { updateMemberLocal } from "../../store/slices/membersSlice";
import api from "../../lib/api";
import {
  X,
  User,
  Tractor,
  Briefcase,
  Sprout,
  ShoppingCart,
  Package,
  ChevronRight,
  Pencil,
} from "lucide-react";
import toast from "react-hot-toast";

const FARMER_TABS = ["Info", "Crops", "Listings", "Purchases", "Documents"];
const STAFF_TABS = ["Info"];
const getTabs = (role) => (role === "Staff" ? STAFF_TABS : FARMER_TABS);

function Section({ icon: Icon, title, children }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-3.5 h-3.5 text-brand-600" />
        <span className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">{title}</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-brand-200 hover:shadow-sm transition-all duration-150">
      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-850 truncate capitalize">{value}</p>
    </div>
  );
}

export default function MemberDetailsDrawer({ member, onClose, isReadOnly }) {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("Info");
  const [editForm, setEditForm] = useState(null);
  const [originalForm, setOriginalForm] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [kycLoading, setKycLoading] = useState(false);
  const [tabData, setTabData] = useState({});
  const [tabLoading, setTabLoading] = useState(false);
  const [detailMember, setDetailMember] = useState(member);

  useEffect(() => {
    setDetailMember(member);
    setEditForm(null);
    setEditError("");
    setActiveTab("Info");
    setTabData({});
  }, [member]);

  const startEdit = () => {
    const form = {
      firstName: detailMember.firstName || "",
      lastName: detailMember.lastName || "",
      phone: detailMember.phone || "",
      gender: detailMember.gender || "male",
      emailId: detailMember.emailId?.includes("@noemail.local") ? "" : (detailMember.emailId || ""),
      village: detailMember.village || "",
      district: detailMember.district || "",
      state: detailMember.state || "",
      ...(detailMember.role === "Staff" && {
        designation: detailMember.designation || "",
      }),
    };
    setEditForm(form);
    setOriginalForm(form);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setEditError("");
    setEditLoading(true);
    const payload = Object.fromEntries(
      Object.entries(editForm).filter(([, v]) => v !== ""),
    );
    const result = await dispatch(
      updateMember({ id: detailMember._id, data: payload }),
    );
    setEditLoading(true);
    if (updateMember.fulfilled.match(result)) {
      const updated = { ...detailMember, ...payload };
      dispatch(updateMemberLocal(updated));
      setDetailMember(updated);
      setEditForm(null);
      toast.success("Profile updated successfully");
    } else {
      setEditError(result.payload || "Failed to update");
      toast.error(result.payload || "Failed to update profile");
    }
    setEditLoading(false);
  };

  const handleKyc = async (kycStatus) => {
    setKycLoading(true);
    const result = await dispatch(
      updateKyc({ id: detailMember._id, kycStatus }),
    );
    if (updateKyc.fulfilled.match(result)) {
      setDetailMember((m) => ({ ...m, kycStatus }));
      toast.success(`KYC status set to ${kycStatus}`);
    } else {
      toast.error(result.payload || "KYC update failed");
    }
    setKycLoading(false);
  };

  const loadTab = async (tab) => {
    setActiveTab(tab);
    if (tab === "Info" || tabData[tab]) return;
    setTabLoading(true);
    try {
      if (tab === "Crops") {
        const res = await api.get(`/crop/getCropsByUser`);
        setTabData((d) => ({ ...d, Crops: res.data?.data || [] }));
      } else if (tab === "Listings") {
        const res = await api.get(`/sell-crop/getListings`);
        const all = res.data?.data || [];
        setTabData((d) => ({
          ...d,
          Listings: all.filter(
            (l) => l.userId?._id === detailMember._id || l.userId === detailMember._id,
          ),
        }));
      } else if (tab === "Purchases") {
        const res = await api.get(`/procurement/getPurchases`);
        const all = res.data?.data || [];
        setTabData((d) => ({
          ...d,
          Purchases: all.filter(
            (p) => p.farmer?._id === detailMember._id || p.farmer === detailMember._id,
          ),
        }));
      } else if (tab === "Documents") {
        const types = ["soilHealthCard", "labReport", "govtSchemeDocs"];
        const results = await Promise.allSettled(
          types.map((t) =>
            api.get(`/admin/files/private?type=${t}&userId=${detailMember._id}`),
          ),
        );
        const docs = {};
        types.forEach((t, i) => {
          if (results[i].status === "fulfilled") docs[t] = results[i].value.data;
        });
        setTabData((d) => ({ ...d, Documents: docs }));
      }
    } catch (_) {}
    setTabLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-green-900 via-green-800 to-green-700 px-6 pt-6 pb-5 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-green-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-brand-400/30 to-transparent pointer-events-none" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition cursor-pointer"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className="flex items-center gap-4 relative">
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-lg font-bold text-white shadow-lg border border-white/10">
                {detailMember.firstName?.[0]}{detailMember.lastName?.[0]}
              </div>
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-450 rounded-full border-2 border-green-900" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white leading-tight">
                {detailMember.firstName} {detailMember.lastName}
              </h2>
              <p className="text-xs text-slate-350 font-mono mt-0.5">
                FPO-{detailMember._id?.slice(-6).toUpperCase()} · +91 {detailMember.phone}
              </p>
              <div className="flex gap-1.5 mt-2">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white/10 text-white border border-white/10">
                  {detailMember.role}
                </span>
                {detailMember.role === "Farmer" && (
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                    detailMember.kycStatus === "Approved"
                      ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-350"
                      : detailMember.kycStatus === "Rejected"
                      ? "bg-rose-500/20 border-rose-400/30 text-rose-300"
                      : "bg-amber-500/20 border-amber-400/30 text-amber-300"
                  }`}>
                    KYC: {detailMember.kycStatus || "Pending"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-white overflow-x-auto select-none">
          {getTabs(detailMember.role).map((tab) => (
            <button
              key={tab}
              onClick={() => loadTab(tab)}
              className={`px-5 py-3 text-sm font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                activeTab === tab
                  ? "border-brand-600 text-brand-700 font-bold"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 bg-gray-50">
          {/* INFO TAB */}
          {activeTab === "Info" &&
            (editForm ? (
              <form onSubmit={handleUpdate} className="space-y-3 text-left">
                {isReadOnly && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-3">
                    <p className="text-xs text-yellow-800">
                      ⚠️ SuperAdmin can only view data. Edit access is restricted.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["firstName", "First Name"],
                    ["lastName", "Last Name"],
                    ["phone", "Mobile"],
                    ["emailId", "Email"],
                    ["village", "Village"],
                    ["district", "District"],
                    ["state", "State"],
                    ...(detailMember.role === "Staff" ? [["designation", "Designation"]] : []),
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wider">{label}</label>
                      <input
                        value={editForm[key] ?? ""}
                        placeholder={label}
                        onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wider">
                      Gender
                    </label>
                    <select
                      value={editForm.gender}
                      onChange={(e) => setEditForm((f) => ({ ...f, gender: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                {editError && (
                  <p className="text-xs text-red-500 font-semibold">{editError}</p>
                )}
                <div className="flex justify-end gap-2 pt-2 border-t mt-4">
                  <button
                    type="button"
                    onClick={() => setEditForm(null)}
                    className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...originalForm })}
                    disabled={!originalForm}
                    className="px-4 py-2 text-sm border border-yellow-500 text-yellow-600 rounded-lg hover:bg-yellow-50 disabled:opacity-40 cursor-pointer"
                  >
                    Revert
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading || isReadOnly}
                    className="px-4 py-2 text-sm text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-60 cursor-pointer"
                  >
                    {editLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-left">
                <div className="flex justify-between items-center mb-1">
                  {/* KYC Approval Section for Admin */}
                  {!isReadOnly && detailMember.role === "Farmer" && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleKyc("Approved")}
                        disabled={kycLoading || detailMember.kycStatus === "Approved"}
                        className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition disabled:opacity-50 cursor-pointer"
                      >
                        Approve KYC
                      </button>
                      <button
                        onClick={() => handleKyc("Rejected")}
                        disabled={kycLoading || detailMember.kycStatus === "Rejected"}
                        className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition disabled:opacity-50 cursor-pointer"
                      >
                        Reject KYC
                      </button>
                    </div>
                  )}
                  <div className="flex-1" />
                  {!isReadOnly && (
                    <button
                      onClick={startEdit}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-brand-750 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit Profile
                    </button>
                  )}
                </div>

                {detailMember.role === "Staff" ? (
                  <Section icon={Briefcase} title="Staff Info">
                    <Field label="Phone" value={`+91 ${detailMember.phone}`} />
                    <Field label="Member ID" value={detailMember._id ? `FPO-${detailMember._id.slice(-6).toUpperCase()}` : ""} />
                    <Field label="Status" value={detailMember.status || "Active"} />
                    <Field label="Gender" value={detailMember.gender} />
                    <Field label="Email" value={detailMember.emailId?.includes("@noemail.local") ? undefined : detailMember.emailId} />
                    <Field label="Designation" value={detailMember.designation} />
                    <Field label="Joining Date" value={detailMember.joiningDate ? new Date(detailMember.joiningDate).toLocaleDateString("en-IN") : undefined} />
                    <Field label="Village" value={detailMember.village} />
                    <Field label="District" value={detailMember.district} />
                    <Field label="State" value={detailMember.state} />
                  </Section>
                ) : (
                  <>
                    <Section icon={User} title="Basic Info">
                      <Field label="Phone" value={`+91 ${detailMember.phone}`} />
                      <Field label="Member ID" value={detailMember._id ? `FPO-${detailMember._id.slice(-6).toUpperCase()}` : ""} />
                      <Field label="Status" value={detailMember.status || "Active"} />
                      <Field label="KYC Status" value={detailMember.kycStatus || "Pending"} />
                      <Field label="Gender" value={detailMember.gender} />
                      <Field label="Email" value={detailMember.emailId} />
                      <Field label="Village" value={detailMember.village} />
                      <Field label="District" value={detailMember.district} />
                      <Field label="State" value={detailMember.state} />
                    </Section>
                    <Section icon={Tractor} title="Farm Details">
                      <Field label="Farmer Category" value={detailMember.farmerCategory} />
                      <Field label="Land Area" value={detailMember.landArea ? `${detailMember.landArea} acres` : undefined} />
                      <Field label="Bank Name" value={detailMember.bankName} />
                      <Field label="Account No" value={detailMember.accountNumber} />
                      <Field label="IFSC" value={detailMember.ifscCode} />
                    </Section>
                  </>
                )}
              </div>
            ))}

          {/* CROPS TAB */}
          {activeTab === "Crops" &&
            (tabLoading ? (
              <p className="text-sm text-gray-450 text-center py-8">Loading crops...</p>
            ) : !tabData.Crops?.length ? (
              <p className="text-sm text-gray-450 text-center py-8">No crops registered yet</p>
            ) : (
              <div className="space-y-2 text-left">
                {tabData.Crops.map((c) => (
                  <div key={c._id} className="flex items-center gap-3 p-3 bg-white border border-gray-150 rounded-xl">
                    <Sprout className="w-4 h-4 text-brand-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800">{c.cropName}</p>
                      <p className="text-xs text-gray-400 font-semibold mt-0.5">
                        Area: {c.area} {c.unit} • Sown:{" "}
                        {c.sowingDate ? new Date(c.sowingDate).toLocaleDateString("en-IN") : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {/* LISTINGS TAB */}
          {activeTab === "Listings" &&
            (tabLoading ? (
              <p className="text-sm text-gray-455 text-center py-8">Loading listings...</p>
            ) : !tabData.Listings?.length ? (
              <p className="text-sm text-gray-455 text-center py-8">No sell listings found</p>
            ) : (
              <div className="space-y-2 text-left">
                {tabData.Listings.map((l) => (
                  <div key={l._id} className="flex items-center gap-3 p-3 bg-white border border-gray-150 rounded-xl">
                    <Package className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-850">{l.cropName}</p>
                      <p className="text-xs text-gray-400 font-semibold mt-0.5">
                        Qty: {l.quantity} • Price: ₹{l.price} • Status: {l.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {/* PURCHASES TAB */}
          {activeTab === "Purchases" &&
            (tabLoading ? (
              <p className="text-sm text-gray-450 text-center py-8">Loading purchases...</p>
            ) : !tabData.Purchases?.length ? (
              <p className="text-sm text-gray-450 text-center py-8">No crop purchases found</p>
            ) : (
              <div className="space-y-2 text-left">
                {tabData.Purchases.map((p) => (
                  <div key={p._id} className="flex items-center gap-3 p-3 bg-white border border-gray-150 rounded-xl justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <ShoppingCart className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-850">{p.crop}</p>
                        <p className="text-xs text-gray-450 font-semibold mt-0.5">
                          Qty: {p.quantity} • Rate: ₹{p.rate} •{" "}
                          {p.procurementDate ? new Date(p.procurementDate).toLocaleDateString("en-IN") : "—"}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-emerald-800">
                      ₹{(p.quantity * p.rate).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            ))}

          {/* DOCUMENTS TAB */}
          {activeTab === "Documents" &&
            (tabLoading ? (
              <p className="text-sm text-gray-450 text-center py-8">Loading documents...</p>
            ) : (
              <div className="space-y-3 text-left">
                {[
                  ["soilHealthCard", "Soil Health Card"],
                  ["labReport", "Lab Report"],
                  ["govtSchemeDocs", "Govt Scheme Docs"],
                ].map(([type, label]) => {
                  const doc = tabData.Documents?.[type];
                  return (
                    <div key={type} className="flex items-center justify-between p-3 bg-white border border-gray-150 rounded-xl">
                      <p className="text-sm font-bold text-gray-700">{label}</p>
                      {doc?.url ? (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-0.5 text-xs text-brand-600 hover:text-brand-700 font-bold"
                        >
                          View <ChevronRight className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium italic">Not uploaded</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

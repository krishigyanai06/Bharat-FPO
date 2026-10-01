import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { updateMember, updateKyc, updateFarmerDue } from "../../store/thunks/membersThunk";
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
  IndianRupee,
  Calendar,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";

const FARMER_TABS = ["Info", "Crops", "Listings", "Purchases", "Documents"];
const STAFF_TABS = ["Info"];
const getTabs = (role) => (role === "Staff" ? STAFF_TABS : FARMER_TABS);

function Section({ icon: Icon, title, children }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2.5">
        <Icon className="w-3.5 h-3.5 text-[#16A36A]" />
        <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">{title}</span>
        <div className="flex-1 h-px bg-slate-200/80" />
      </div>
      <div className="grid grid-cols-2 gap-2.5">{children}</div>
    </div>
  );
}

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 hover:border-slate-300 transition-all shadow-2xs">
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">{label}</p>
      <p className="text-xs font-bold text-slate-800 truncate capitalize">{value}</p>
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

  // Farmer Due state
  const [dueDetails, setDueDetails] = useState({
    dueAmount: member?.dueAmount || 0,
    dueAmountNote: member?.dueAmountNote || "",
    dueAmountUpdatedAt: member?.dueAmountUpdatedAt || null,
    dueAmountUpdatedBy: member?.dueAmountUpdatedBy || null,
  });
  const [showDueModal, setShowDueModal] = useState(false);
  const [dueForm, setDueForm] = useState({ dueAmount: 0, dueAmountNote: "" });
  const [dueSubmitting, setDueSubmitting] = useState(false);

  useEffect(() => {
    setDetailMember(member);
    setDueDetails({
      dueAmount: member?.dueAmount || 0,
      dueAmountNote: member?.dueAmountNote || "",
      dueAmountUpdatedAt: member?.dueAmountUpdatedAt || null,
      dueAmountUpdatedBy: member?.dueAmountUpdatedBy || null,
    });
    setEditForm(null);
    setEditError("");
    setActiveTab("Info");
    setTabData({});

    // Fetch authoritative due information for Farmers
    if (member?._id && member?.role === "Farmer") {
      api.get(`/admin/farmers/${member._id}/due`)
        .then((res) => {
          const data = res.data?.data ?? res.data;
          if (data) {
            setDueDetails({
              dueAmount: data.dueAmount ?? 0,
              dueAmountNote: data.dueAmountNote ?? "",
              dueAmountUpdatedAt: data.dueAmountUpdatedAt ?? null,
              dueAmountUpdatedBy: data.dueAmountUpdatedBy ?? null,
            });
            setDetailMember((prev) => ({ ...prev, ...data }));
          }
        })
        .catch(() => {});
    }
  }, [member]);

  const openDueModal = () => {
    setDueForm({
      dueAmount: dueDetails.dueAmount || 0,
      dueAmountNote: dueDetails.dueAmountNote || "",
    });
    setShowDueModal(true);
  };

  const handleUpdateDue = async (e) => {
    e.preventDefault();
    setDueSubmitting(true);
    const result = await dispatch(
      updateFarmerDue({
        farmerId: detailMember._id,
        dueAmount: dueForm.dueAmount,
        dueAmountNote: dueForm.dueAmountNote,
      })
    );
    setDueSubmitting(false);

    if (updateFarmerDue.fulfilled.match(result)) {
      const resPayload = result.payload;
      const updated = {
        dueAmount: resPayload?.dueAmount ?? Number(dueForm.dueAmount),
        dueAmountNote: resPayload?.dueAmountNote ?? dueForm.dueAmountNote,
        dueAmountUpdatedAt: resPayload?.dueAmountUpdatedAt ?? new Date().toISOString(),
        dueAmountUpdatedBy: dueDetails.dueAmountUpdatedBy,
      };
      setDueDetails((prev) => ({ ...prev, ...updated }));
      setDetailMember((prev) => ({ ...prev, ...updated }));
      dispatch(updateMemberLocal({ _id: detailMember._id, ...updated }));
      setShowDueModal(false);
      toast.success("Farmer due amount updated successfully");
    } else {
      toast.error(result.payload || "Failed to update due amount");
    }
  };

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200/80 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Clean Light Header */}
        <div className="relative bg-slate-50 border-b border-slate-200/80 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5 relative min-w-0">
            {/* Initials Avatar */}
            <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-800 font-extrabold flex items-center justify-center text-base shrink-0 shadow-2xs">
              {detailMember.firstName?.[0]}{detailMember.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 leading-snug truncate">
                  {detailMember.firstName} {detailMember.lastName}
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                FPO-{detailMember._id?.slice(-6).toUpperCase()} · +91 {detailMember.phone}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-slate-200/70 text-slate-700 border border-slate-300/80">
                  {detailMember.role}
                </span>
                {detailMember.role === "Farmer" && (
                  <>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      detailMember.kycStatus === "Approved"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : detailMember.kycStatus === "Rejected"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}>
                      KYC: {detailMember.kycStatus || "Pending"}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      Number(dueDetails.dueAmount || 0) > 0
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}>
                      Due: ₹{Number(dueDetails.dueAmount || 0).toLocaleString("en-IN")}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-200 bg-white px-5 overflow-x-auto select-none gap-1 shrink-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {getTabs(detailMember.role).map((tab) => (
            <button
              key={tab}
              onClick={() => loadTab(tab)}
              className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                activeTab === tab
                  ? "border-[#16A36A] text-[#16A36A] font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 bg-[#F8FAFC] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* INFO TAB */}
          {activeTab === "Info" &&
            (editForm ? (
              <form onSubmit={handleUpdate} className="space-y-3 text-left">
                {isReadOnly && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                    <p className="text-xs text-amber-800">
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
                      <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase tracking-wider">{label}</label>
                      <input
                        value={editForm[key] ?? ""}
                        placeholder={label}
                        onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#16A36A] focus:border-[#16A36A] bg-white font-medium text-slate-800"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase tracking-wider">
                      Gender
                    </label>
                    <select
                      value={editForm.gender}
                      onChange={(e) => setEditForm((f) => ({ ...f, gender: e.target.value }))}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#16A36A] focus:border-[#16A36A] bg-white font-medium text-slate-800"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                {editError && (
                  <p className="text-xs text-rose-600 font-semibold">{editError}</p>
                )}
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 mt-4">
                  <button
                    type="button"
                    onClick={() => setEditForm(null)}
                    className="px-3.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-100 transition cursor-pointer text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...originalForm })}
                    disabled={!originalForm}
                    className="px-3.5 py-1.5 text-xs font-semibold border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition disabled:opacity-40 cursor-pointer"
                  >
                    Revert
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading || isReadOnly}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-[#16A36A] hover:bg-[#138a59] rounded-lg transition disabled:opacity-60 cursor-pointer shadow-2xs"
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
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-500" /> Edit Profile
                    </button>
                  )}
                </div>

                {/* Financial Due Card for Farmers */}
                {detailMember.role === "Farmer" && (
                  <div className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center font-bold shrink-0">
                          <IndianRupee className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Financial Outstanding Due</h4>
                          <p className="text-lg font-extrabold text-slate-900 leading-tight">
                            ₹{Number(dueDetails.dueAmount || 0).toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={openDueModal}
                          className="px-3 py-1.5 text-xs font-bold bg-[#16A36A] hover:bg-[#138a59] text-white rounded-lg transition shadow-2xs cursor-pointer active:scale-95"
                        >
                          Update Due Amount
                        </button>
                      )}
                    </div>

                    {dueDetails.dueAmountNote && (
                      <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs text-slate-700 space-y-0.5">
                        <p className="font-bold text-slate-400 text-[10px] uppercase tracking-wider flex items-center gap-1">
                          <FileText className="w-3 h-3 text-slate-400" /> Due Note / Context
                        </p>
                        <p className="font-semibold text-slate-800 leading-snug">{dueDetails.dueAmountNote}</p>
                      </div>
                    )}

                    {(dueDetails.dueAmountUpdatedAt || dueDetails.dueAmountUpdatedBy) && (
                      <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-2 font-medium">
                        {dueDetails.dueAmountUpdatedAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Updated: {new Date(dueDetails.dueAmountUpdatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                          </span>
                        )}
                        {dueDetails.dueAmountUpdatedBy && (
                          <span>
                            By: {dueDetails.dueAmountUpdatedBy.firstName} {dueDetails.dueAmountUpdatedBy.lastName}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

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
              <p className="text-xs text-slate-400 text-center py-8">Loading crops...</p>
            ) : !tabData.Crops?.length ? (
              <p className="text-xs text-slate-400 text-center py-8">No crops registered yet</p>
            ) : (
              <div className="space-y-2 text-left">
                {tabData.Crops.map((c) => (
                  <div key={c._id} className="flex items-center gap-3 p-3 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
                    <Sprout className="w-4 h-4 text-[#16A36A] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800">{c.cropName}</p>
                      <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
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
              <p className="text-xs text-slate-400 text-center py-8">Loading listings...</p>
            ) : !tabData.Listings?.length ? (
              <p className="text-xs text-slate-400 text-center py-8">No sell listings found</p>
            ) : (
              <div className="space-y-2 text-left">
                {tabData.Listings.map((l) => (
                  <div key={l._id} className="flex items-center gap-3 p-3 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
                    <Package className="w-4 h-4 text-blue-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800">{l.cropName}</p>
                      <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
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
              <p className="text-xs text-slate-400 text-center py-8">Loading purchases...</p>
            ) : !tabData.Purchases?.length ? (
              <p className="text-xs text-slate-400 text-center py-8">No crop purchases found</p>
            ) : (
              <div className="space-y-2 text-left">
                {tabData.Purchases.map((p) => (
                  <div key={p._id} className="flex items-center gap-3 p-3 bg-white border border-slate-200/80 rounded-xl shadow-2xs justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <ShoppingCart className="w-4 h-4 text-purple-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800">{p.crop}</p>
                        <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                          Qty: {p.quantity} • Rate: ₹{p.rate} •{" "}
                          {p.procurementDate ? new Date(p.procurementDate).toLocaleDateString("en-IN") : "—"}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#16A36A]">
                      ₹{(p.quantity * p.rate).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            ))}

          {/* DOCUMENTS TAB */}
          {activeTab === "Documents" &&
            (tabLoading ? (
              <p className="text-xs text-slate-400 text-center py-8">Loading documents...</p>
            ) : (
              <div className="space-y-2 text-left">
                {[
                  ["soilHealthCard", "Soil Health Card"],
                  ["labReport", "Lab Report"],
                  ["govtSchemeDocs", "Govt Scheme Docs"],
                ].map(([type, label]) => {
                  const doc = tabData.Documents?.[type];
                  return (
                    <div key={type} className="flex items-center justify-between p-3 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
                      <p className="text-xs font-bold text-slate-800">{label}</p>
                      {doc?.url ? (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-0.5 text-xs text-[#16A36A] hover:underline font-bold"
                        >
                          View <ChevronRight className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium italic">Not uploaded</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
        </div>
      </div>

      {/* Update Farmer Due Modal */}
      {showDueModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
          onClick={() => setShowDueModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 border border-slate-200 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-[#16A36A]" />
                <h3 className="text-sm font-bold text-slate-900">Update Due Amount</h3>
              </div>
              <button
                onClick={() => setShowDueModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateDue} className="space-y-3.5 text-left">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">
                  Due Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={dueForm.dueAmount}
                    onChange={(e) => setDueForm((f) => ({ ...f, dueAmount: e.target.value }))}
                    className="w-full pl-7 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#16A36A] focus:border-[#16A36A] font-bold bg-white text-slate-900"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">
                  Due Note / Context
                </label>
                <textarea
                  rows="3"
                  value={dueForm.dueAmountNote}
                  onChange={(e) => setDueForm((f) => ({ ...f, dueAmountNote: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#16A36A] focus:border-[#16A36A] bg-white text-slate-800 font-medium"
                  placeholder="e.g. Pending advance payment from previous harvest season"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowDueModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dueSubmitting}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#16A36A] hover:bg-[#138a59] rounded-lg transition shadow-2xs disabled:opacity-60 cursor-pointer"
                >
                  {dueSubmitting ? "Saving..." : "Save Due Amount"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

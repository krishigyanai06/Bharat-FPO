import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMembers, updateMember, updateKyc } from "../store/thunks/membersThunk";
import { updateMemberLocal } from "../store/slices/membersSlice";
import FarmModal from "../components/FarmModal";
import {
  X,
  User,
  Users,
  Tractor,
  Briefcase,
  Sprout,
  ShoppingCart,
  Package,
  ChevronRight,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  Mail,
  BadgeCheck,
  Pencil,
  Search,
} from "lucide-react";
import AddMemberButton from "../components/AddMemberButton";
import api from "../lib/api";
import { usePermissions } from "../hooks/usePermissions";

const KYC_BADGE = {
  Approved: "bg-brand-100 text-brand-700",
  Rejected: "bg-red-100 text-red-700",
  Pending: "bg-yellow-100 text-yellow-700",
};

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
      <p className="text-sm font-semibold text-gray-800 truncate capitalize">{value}</p>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {Array(7)
        .fill(0)
        .map((_, i) => (
          <td key={i} className="px-6 py-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
          </td>
        ))}
    </tr>
  );
}

const FARMER_TABS = ["Info", "Crops", "Listings", "Purchases", "Documents"];
const STAFF_TABS = ["Info"];
const getTabs = (role) => (role === "Staff" ? STAFF_TABS : FARMER_TABS);

function Pagination({ page, totalPages, start, total, perPage, onPage }) {
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }
  return (
    <div className="flex items-center justify-between text-sm text-gray-500 pt-1">
      <span>
        Showing {total === 0 ? 0 : start + 1}–{Math.min(start + perPage, total)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ‹
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`w-8 h-8 rounded-lg text-sm font-medium ${
                page === p
                  ? "bg-brand-600 text-white"
                  : "border hover:bg-gray-50 text-gray-600"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages || totalPages === 0}
          className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ›
        </button>
      </div>
    </div>
  );
}

function Members() {
  const dispatch = useDispatch();
  const { members, loading, error } = useSelector((state) => state.members);
  const { isReadOnly, canUpdate } = usePermissions();

  const ITEMS_PER_PAGE = 10;
  const [farmerPage, setFarmerPage] = useState(1);
  const [staffPage, setStaffPage] = useState(1);
  const [farmerSearch, setFarmerSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [farmMember, setFarmMember] = useState(null);
  const [detailMember, setDetailMember] = useState(null);
  const [activeTab, setActiveTab] = useState("Info");
  const [editForm, setEditForm] = useState(null);
  const [originalForm, setOriginalForm] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const [kycLoading, setKycLoading] = useState(false);
  const [tabData, setTabData] = useState({});
  const [tabLoading, setTabLoading] = useState(false);

  console.log('[Members] 📊 State:', { membersCount: members.length, loading, error });

  const openDetail = (m) => {
    setDetailMember(m);
    setEditForm(null);
    setEditError("");
    setActiveTab("Info");
    setTabData({});
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
    setEditLoading(false);
    if (updateMember.fulfilled.match(result)) {
      const updated = { ...detailMember, ...payload };
      dispatch(updateMemberLocal(updated));
      setDetailMember(updated);
      setEditForm(null);
    } else setEditError(result.payload || "Failed to update");
  };

  const handleKyc = async (kycStatus) => {
    setKycLoading(true);
    const result = await dispatch(
      updateKyc({ id: detailMember._id, kycStatus }),
    );
    setKycLoading(false);
    if (updateKyc.fulfilled.match(result))
      setDetailMember((m) => ({ ...m, kycStatus }));
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
            (l) =>
              l.userId?._id === detailMember._id ||
              l.userId === detailMember._id,
          ),
        }));
      } else if (tab === "Purchases") {
        const res = await api.get(`/procurement/getPurchases`);
        const all = res.data?.data || [];
        setTabData((d) => ({
          ...d,
          Purchases: all.filter(
            (p) =>
              p.farmer?._id === detailMember._id ||
              p.farmer === detailMember._id,
          ),
        }));
      } else if (tab === "Documents") {
        const types = ["soilHealthCard", "labReport", "govtSchemeDocs"];
        const results = await Promise.allSettled(
          types.map((t) =>
            api.get(
              `/admin/files/private?type=${t}&userId=${detailMember._id}`,
            ),
          ),
        );
        const docs = {};
        types.forEach((t, i) => {
          if (results[i].status === "fulfilled")
            docs[t] = results[i].value.data;
        });
        setTabData((d) => ({ ...d, Documents: docs }));
      }
    } catch (_) {}
    setTabLoading(false);
  };

  useEffect(() => {
    dispatch(fetchMembers());
  }, [dispatch]);

  const counts = {
    farmer: members.filter((m) => m.role === "Farmer").length,
    staff: members.filter((m) => m.role === "Staff").length,
  };
  counts.total = counts.farmer + counts.staff;

  const filteredFarmers = members
    .filter(
      (m) =>
        m.role === "Farmer" &&
        `${m.firstName} ${m.lastName} ${m.phone}`
          .toLowerCase()
          .includes(farmerSearch.toLowerCase()),
    )
    .sort((a, b) => new Date(b.createdAt || b._id) - new Date(a.createdAt || a._id));

  const filteredStaff = members
    .filter(
      (m) =>
        m.role === "Staff" &&
        `${m.firstName} ${m.lastName} ${m.phone}`
          .toLowerCase()
          .includes(staffSearch.toLowerCase()),
    )
    .sort((a, b) => new Date(b.createdAt || b._id) - new Date(a.createdAt || a._id));

  const farmerTotalPages = Math.ceil(filteredFarmers.length / ITEMS_PER_PAGE);
  const farmerStart = (farmerPage - 1) * ITEMS_PER_PAGE;
  const paginatedFarmers = filteredFarmers.slice(farmerStart, farmerStart + ITEMS_PER_PAGE);

  const staffTotalPages = Math.ceil(filteredStaff.length / ITEMS_PER_PAGE);
  const staffStart = (staffPage - 1) * ITEMS_PER_PAGE;
  const paginatedStaff = filteredStaff.slice(staffStart, staffStart + ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* ERROR DISPLAY */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-800">Failed to load members</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
            <button
              onClick={() => dispatch(fetchMembers())}
              className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Member Management</h1>
          <p className="text-sm text-gray-500">
            Manage FPO members and their profiles
          </p>
        </div>
        {!isReadOnly && <AddMemberButton />}
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {[
          {
            label: "Total Members",
            value: counts.total,
            icon: Users,
            color: "bg-blue-50 text-blue-600",
          },
          {
            label: "Farmers",
            value: counts.farmer,
            icon: Tractor,
            color: "bg-brand-50 text-brand-600",
          },
          {
            label: "Staff",
            value: counts.staff,
            icon: Briefcase,
            color: "bg-yellow-50 text-yellow-600",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="flex items-center gap-4 p-4 bg-white shadow-sm rounded-xl"
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {loading ? "—" : value}
              </p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* FARMERS TABLE */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Tractor className="w-5 h-5 text-brand-600" />
          <h2 className="text-base font-semibold text-gray-800">Farmers</h2>
          <span className="px-2 py-0.5 text-xs font-medium bg-brand-100 text-brand-700 rounded-full">
            {counts.farmer}
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search farmers by name or phone..."
            value={farmerSearch}
            onChange={(e) => { setFarmerSearch(e.target.value); setFarmerPage(1); }}
            className="w-full pl-12 pr-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:border-brand-500 focus:ring-0 bg-white shadow-sm placeholder-gray-400"
          />
          {farmerSearch && (
            <button onClick={() => setFarmerSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="overflow-x-auto bg-white shadow-sm rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="text-xs text-gray-600 uppercase bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left">Member ID</th>
                <th className="px-6 py-4 text-left">Name</th>
                <th className="px-6 py-4 text-left">Phone</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-left">KYC Status</th>
                <th className="px-6 py-4 text-center">Farms</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading
                ? Array(5)
                    .fill(0)
                    .map((_, i) => <SkeletonRow key={i} />)
                : paginatedFarmers.map((m) => {
                    const kycStatus = m.kycStatus || "Pending";
                    return (
                      <tr
                        key={m._id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => openDetail(m)}
                      >
                        <td className="px-6 py-4 font-medium">
                          FPO-{m._id?.slice(-6).toUpperCase()}
                        </td>
                        <td className="px-6 py-4 font-medium text-brand-700">
                          {m.firstName} {m.lastName}
                        </td>
                        <td className="px-6 py-4">+91 {m.phone}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full">
                            {m.status || "Active"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${KYC_BADGE[kycStatus] || KYC_BADGE.Pending}`}
                          >
                            {kycStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFarmMember(m);
                            }}
                            className="px-3 py-1 text-xs text-brand-600 transition border border-brand-600 rounded-lg hover:bg-brand-50"
                          >
                            View Farms
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              {!loading && !filteredFarmers.length && (
                <tr>
                  <td colSpan="6" className="py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Tractor className="w-7 h-7" />
                      <p className="text-sm">
                        No farmers found
                        {farmerSearch && ` for "${farmerSearch}"`}
                      </p>
                      {farmerSearch && (
                        <button
                          onClick={() => setFarmerSearch("")}
                          className="text-xs text-brand-600 hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={farmerPage}
          totalPages={farmerTotalPages || 1}
          start={farmerStart}
          total={filteredFarmers.length}
          perPage={ITEMS_PER_PAGE}
          onPage={setFarmerPage}
        />
      </div>

      {/* STAFF TABLE */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Briefcase className="w-5 h-5 text-yellow-600" />
          <h2 className="text-base font-semibold text-gray-800">Staff</h2>
          <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
            {counts.staff}
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search staff by name or phone..."
            value={staffSearch}
            onChange={(e) => { setStaffSearch(e.target.value); setStaffPage(1); }}
            className="w-full pl-12 pr-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:border-yellow-400 focus:ring-0 bg-white shadow-sm placeholder-gray-400"
          />
          {staffSearch && (
            <button onClick={() => setStaffSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="overflow-x-auto bg-white shadow-sm rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="text-xs text-gray-600 uppercase bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left">Member ID</th>
                <th className="px-6 py-4 text-left">Name</th>
                <th className="px-6 py-4 text-left">Phone</th>
                <th className="px-6 py-4 text-left">Email</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-left">Joining Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading
                ? Array(3)
                    .fill(0)
                    .map((_, i) => <SkeletonRow key={i} />)
                : paginatedStaff.map((m) => (
                    <tr
                      key={m._id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => openDetail(m)}
                    >
                      <td className="px-6 py-4 font-medium">
                        FPO-{m._id?.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-6 py-4 font-medium text-yellow-700">
                        {m.firstName} {m.lastName}
                      </td>
                      <td className="px-6 py-4">+91 {m.phone}</td>
                      <td className="px-6 py-4 text-gray-500">
                        {m.emailId?.includes('@noemail.local') ? '—' : (m.emailId || '—')}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full">
                          {m.status || "Active"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {m.joiningDate
                          ? new Date(m.joiningDate).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                    </tr>
                  ))}
              {!loading && !filteredStaff.length && (
                <tr>
                  <td colSpan="6" className="py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Briefcase className="w-7 h-7" />
                      <p className="text-sm">
                        No staff found{staffSearch && ` for "${staffSearch}"`}
                      </p>
                      {staffSearch && (
                        <button
                          onClick={() => setStaffSearch("")}
                          className="text-xs text-brand-600 hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={staffPage}
          totalPages={staffTotalPages || 1}
          start={staffStart}
          total={filteredStaff.length}
          perPage={ITEMS_PER_PAGE}
          onPage={setStaffPage}
        />
      </div>

      {farmMember && (
        <FarmModal member={farmMember} onClose={() => setFarmMember(null)} />
      )}

      {/* DETAIL MODAL */}
      {detailMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setDetailMember(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-green-900 via-green-800 to-green-700 px-6 pt-6 pb-5 overflow-hidden">
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-green-400/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-brand-400/30 to-transparent pointer-events-none" />

              <button
                onClick={() => setDetailMember(null)}
                className="absolute top-4 right-4 z-10 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition"
              >
                <X className="w-4 h-4 text-white" />
              </button>

              <div className="flex items-center gap-4 relative">
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-lg font-bold text-white shadow-lg border border-white/10">
                    {detailMember.firstName?.[0]}{detailMember.lastName?.[0]}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-green-900" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-white leading-tight">
                    {detailMember.firstName} {detailMember.lastName}
                  </h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    FPO-{detailMember._id?.slice(-6).toUpperCase()} · +91 {detailMember.phone}
                  </p>
                  <div className="flex gap-1.5 mt-2">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white/10 text-white border border-white/10">
                      {detailMember.role}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                      detailMember.kycStatus === "Approved"
                        ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300"
                        : detailMember.kycStatus === "Rejected"
                        ? "bg-red-500/20 border-red-400/30 text-red-300"
                        : "bg-amber-500/20 border-amber-400/30 text-amber-300"
                    }`}>
                      KYC: {detailMember.kycStatus || "Pending"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 bg-white overflow-x-auto">
              {getTabs(detailMember.role).map((tab) => (
                <button
                  key={tab}
                  onClick={() => loadTab(tab)}
                  className={`px-5 py-3 text-sm font-semibold whitespace-nowrap transition-all border-b-2 ${
                    activeTab === tab
                      ? "border-brand-600 text-brand-700"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-5 overflow-y-auto flex-1 bg-gray-50">
              {/* INFO TAB */}
              {activeTab === "Info" &&
                (editForm ? (
                  <form onSubmit={handleUpdate} className="space-y-3">
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
                          <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                          <input
                            value={editForm[key] ?? ""}
                            placeholder={label}
                            onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                      ))}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">
                          Gender
                        </label>
                        <select
                          value={editForm.gender}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              gender: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                    {editError && (
                      <p className="text-xs text-red-500">{editError}</p>
                    )}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditForm(null)}
                        className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...originalForm })}
                        disabled={!originalForm}
                        className="px-4 py-2 text-sm border border-yellow-500 text-yellow-600 rounded-lg hover:bg-yellow-50 disabled:opacity-40"
                      >
                        Revert
                      </button>
                      <button
                        type="submit"
                        disabled={editLoading || isReadOnly}
                        className="px-4 py-2 text-sm text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-60"
                      >
                        {editLoading ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    {!isReadOnly && (
                      <div className="flex justify-end mb-3">
                        <button
                          onClick={startEdit}
                          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit Member
                        </button>
                      </div>
                    )}
                    {detailMember.role === "Staff" ? (
                      <>
                        <Section icon={Briefcase} title="Staff Info">
                          <Field label="Phone" value={`+91 ${detailMember.phone}`} />
                          <Field label="Member ID" value={detailMember._id ? `FPO-${detailMember._id.slice(-6).toUpperCase()}` : ""} />
                          <Field label="Status" value={detailMember.status || "Active"} />
                          <Field label="Gender" value={detailMember.gender} />
                          <Field label="Email" value={detailMember.emailId?.includes('@noemail.local') ? undefined : detailMember.emailId} />
                          <Field label="Designation" value={detailMember.designation} />
                          <Field label="Joining Date" value={detailMember.joiningDate ? new Date(detailMember.joiningDate).toLocaleDateString("en-IN") : undefined} />
                          <Field label="Village" value={detailMember.village} />
                          <Field label="District" value={detailMember.district} />
                          <Field label="State" value={detailMember.state} />
                        </Section>
                      </>
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
                  <p className="text-sm text-gray-400 text-center py-8">
                    Loading...
                  </p>
                ) : !tabData.Crops?.length ? (
                  <p className="text-sm text-gray-400 text-center py-8">
                    No crops found
                  </p>
                ) : (
                  <div className="space-y-2">
                    {tabData.Crops.map((c) => (
                      <div
                        key={c._id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <Sprout className="w-4 h-4 text-brand-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">
                            {c.cropName}
                          </p>
                          <p className="text-xs text-gray-500">
                            Area: {c.area} {c.unit} • Sown:{" "}
                            {c.sowingDate
                              ? new Date(c.sowingDate).toLocaleDateString(
                                  "en-IN",
                                )
                              : "—"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

              {/* LISTINGS TAB */}
              {activeTab === "Listings" &&
                (tabLoading ? (
                  <p className="text-sm text-gray-400 text-center py-8">
                    Loading...
                  </p>
                ) : !tabData.Listings?.length ? (
                  <p className="text-sm text-gray-400 text-center py-8">
                    No listings found
                  </p>
                ) : (
                  <div className="space-y-2">
                    {tabData.Listings.map((l) => (
                      <div
                        key={l._id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <Package className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">
                            {l.cropName}
                          </p>
                          <p className="text-xs text-gray-500">
                            Qty: {l.quantity} • Price: ₹{l.price} • Status:{" "}
                            {l.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

              {/* PURCHASES TAB */}
              {activeTab === "Purchases" &&
                (tabLoading ? (
                  <p className="text-sm text-gray-400 text-center py-8">
                    Loading...
                  </p>
                ) : !tabData.Purchases?.length ? (
                  <p className="text-sm text-gray-400 text-center py-8">
                    No purchases found
                  </p>
                ) : (
                  <div className="space-y-2">
                    {tabData.Purchases.map((p) => (
                      <div
                        key={p._id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <ShoppingCart className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">
                            {p.crop}
                          </p>
                          <p className="text-xs text-gray-500">
                            Qty: {p.quantity} • Rate: ₹{p.rate} •{" "}
                            {p.procurementDate
                              ? new Date(p.procurementDate).toLocaleDateString(
                                  "en-IN",
                                )
                              : "—"}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-gray-700">
                          ₹{(p.quantity * p.rate).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}

              {/* DOCUMENTS TAB */}
              {activeTab === "Documents" &&
                (tabLoading ? (
                  <p className="text-sm text-gray-400 text-center py-8">
                    Loading...
                  </p>
                ) : (
                  <div className="space-y-3">
                    {[
                      ["soilHealthCard", "Soil Health Card"],
                      ["labReport", "Lab Report"],
                      ["govtSchemeDocs", "Govt Scheme Docs"],
                    ].map(([type, label]) => {
                      const doc = tabData.Documents?.[type];
                      return (
                        <div
                          key={type}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <p className="text-sm font-medium text-gray-700">
                            {label}
                          </p>
                          {doc?.url ? (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
                            >
                              View <ChevronRight className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Not uploaded
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Members;

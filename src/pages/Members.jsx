import { useEffect, useState, lazy, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMembers, updateMember, updateKyc } from "../store/thunks/membersThunk";
import { updateMemberLocal } from "../store/slices/membersSlice";

const FarmModal = lazy(() => import("../components/FarmModal"));
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
import MemberDetailsDrawer from "../components/members/MemberDetailsDrawer";
import api from "../lib/api";
import { usePermissions } from "../hooks/usePermissions";
import ErrorState from "../components/ErrorState";

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
              className={`w-8 h-8 rounded-lg text-sm font-medium ${page === p
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
    } catch (_) { }
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
        <ErrorState
          title="Failed to load members"
          error={error}
          onRetry={() => dispatch(fetchMembers())}
          variant="page"
        />
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
                <th className="px-6 py-4 text-left">Due Balance</th>
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
                  const dueAmt = Number(m.dueAmount || 0);
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
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                          dueAmt > 0
                            ? "bg-rose-100 text-rose-800 border-rose-200"
                            : "bg-emerald-100 text-emerald-800 border-emerald-200"
                        }`}>
                          ₹{dueAmt.toLocaleString("en-IN")}
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
                  <td colSpan="7" className="py-10 text-center">
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
        <Suspense fallback={<div className="p-4 text-center">Loading Map...</div>}>
          <FarmModal member={farmMember} onClose={() => setFarmMember(null)} />
        </Suspense>
      )}

      {/* DETAIL MODAL DRAWER */}
      {detailMember && (
        <MemberDetailsDrawer
          member={detailMember}
          onClose={() => setDetailMember(null)}
          isReadOnly={isReadOnly}
        />
      )}
    </div>
  );
}

export default Members;

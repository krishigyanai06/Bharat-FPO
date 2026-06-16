import React, { useEffect, useState, useMemo } from "react";
import theme from '../config/theme';
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  fetchAllLedgers,
  fetchLedgerByType,
} from "../store/thunks/ledgerThunk";
import {
  BookOpen,
  TrendingUp,
  TrendingDown,
  Wallet,
  Search,
  Download,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Phone,
  FileText,
} from "lucide-react";
import { usePermissions } from "../hooks/usePermissions";

const TYPES = [
  { value: "ALL", label: "All" },
  { value: "PROCUREMENT", label: "Procurement" },
  { value: "PROCUREMENT_PAYMENT", label: "Procurement Payment" },
  { value: "SALE", label: "Sale" },
  { value: "PAYMENT", label: "Payment" },
  { value: "REFUND", label: "Refund" },
  { value: "ADJUSTMENT", label: "Adjustment" },
];

const TYPE_COLORS = {
  PROCUREMENT: "bg-blue-100 text-blue-700",
  PROCUREMENT_PAYMENT: "bg-purple-100 text-purple-700",
  SALE: "bg-brand-100 text-brand-700",
  PAYMENT: "bg-teal-100 text-teal-700",
  REFUND: "bg-orange-100 text-orange-700",
  ADJUSTMENT: "bg-yellow-100 text-yellow-700",
};

const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime()) || d.getFullYear() < 2000) return "—";
  return d.toLocaleDateString("en-IN");
};
const ITEMS_PER_PAGE = 10;

const exportCSV = (data) => {
  const headers = [
    "Date",
    "User",
    "Phone",
    "Role",
    "Type",
    "Ref Type",
    "Amount",
  ];
  const rows = data.map((e) => [
    new Date(e.createdAt).toLocaleDateString("en-IN"),
    `${e.user?.firstName || ""} ${e.user?.lastName || ""}`.trim(),
    e.user?.phone || "",
    e.user?.role || "",
    e.type || "",
    e.referenceType || "",
    e.amount || 0,
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ledger_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const printFarmerStatement = async (row) => {
  try {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    const net = row.credit - row.debit;
    const txns = [...row.txns].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    );
    const dateStr = new Date().toLocaleDateString("en-IN");
    const name = row.user.firstName + " " + row.user.lastName;

    // Header bar
    doc.setFillColor(22, 163, 74);
    doc.rect(0, 0, 210, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`${theme.brand} - FPO Ledger`, 14, 12);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Farmer Statement", 14, 20);
    doc.text("Date: " + dateStr, 196, 20, { align: "right" });

    // Farmer info
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(name, 14, 38);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text((row.user.role || "") + "   |   " + (row.user.phone || ""), 14, 45);

    // Summary boxes
    const boxes = [
      {
        label: "To Pay Farmer",
        value: "Rs. " + Number(row.credit).toLocaleString("en-IN"),
        color: [220, 38, 38],
      },
      {
        label: "To Collect from Farmer",
        value: "Rs. " + Number(row.debit).toLocaleString("en-IN"),
        color: [22, 163, 74],
      },
      {
        label: "Net Balance",
        value: "Rs. " + Math.abs(net).toLocaleString("en-IN"),
        color: [37, 99, 235],
      },
    ];
    boxes.forEach((b, i) => {
      const x = 14 + i * 62;
      doc.setDrawColor(230, 230, 230);
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(x, 52, 58, 20, 2, 2, "FD");
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.setFont("helvetica", "normal");
      doc.text(b.label.toUpperCase(), x + 4, 59);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(b.color[0], b.color[1], b.color[2]);
      doc.text(b.value, x + 4, 67);
    });

    // Table
    autoTable(doc, {
      startY: 78,
      head: [["#", "Date", "Type", "Reference", "Amount"]],
      body: txns.map((e, i) => [
        i + 1,
        new Date(e.createdAt).toLocaleDateString("en-IN"),
        e.type,
        e.referenceType || "-",
        (e.type === "CREDIT" ? "+" : "-") +
          "Rs. " +
          Number(e.amount).toLocaleString("en-IN"),
      ]),
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 4: { halign: "right" } },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 2) {
          data.cell.styles.textColor =
            data.cell.raw === "CREDIT" ? [22, 163, 74] : [220, 38, 38];
          data.cell.styles.fontStyle = "bold";
        }
        if (data.section === "body" && data.column.index === 4) {
          data.cell.styles.textColor =
            data.row.raw[2] === "CREDIT" ? [22, 163, 74] : [220, 38, 38];
          data.cell.styles.fontStyle = "bold";
        }
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });

    // Footer
    const pageH = doc.internal.pageSize.height;
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated by ${theme.brand} FPO System`, 14, pageH - 8);
    doc.text(new Date().toLocaleString("en-IN"), 196, pageH - 8, {
      align: "right",
    });

    doc.save(
      "Statement_" +
        name.replace(/ /g, "_") +
        "_" +
        new Date().toISOString().split("T")[0] +
        ".pdf",
    );
  } catch (err) {
    console.error("PDF generation failed:", err);
    alert("Failed to generate report. Please try again.");
  }
};

// Group entries by month label
const groupByMonth = (entries) => {
  const map = {};
  entries.forEach((e) => {
    const d = new Date(e.createdAt);
    if (isNaN(d.getTime()) || d.getFullYear() < 2000) return;
    const label = d.toLocaleString("en-IN", { month: "long", year: "numeric" });
    if (!map[label]) map[label] = [];
    map[label].push(e);
  });
  return map;
};

const SortIcon = ({ field, sortField, sortDir }) => {
  if (sortField !== field)
    return <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-40" />;
  return sortDir === "asc" ? (
    <ArrowUp className="inline w-3 h-3 ml-1 text-brand-600" />
  ) : (
    <ArrowDown className="inline w-3 h-3 ml-1 text-brand-600" />
  );
};

export default function Ledger() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { entries: rawEntries = [], loading } = useSelector((s) => s.ledger);
  const entries = Array.isArray(rawEntries) ? rawEntries : [];
  const { isReadOnly } = usePermissions();
  const [activeType, setActiveType] = useState("ALL");
  const [creditDebitFilter, setCreditDebitFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [activeTab, setActiveTab] = useState("farmers");
  const [toast, setToast] = useState(null);
  const [saleModal, setSaleModal] = useState(null);

  useEffect(() => {
    if (activeType === "ALL") dispatch(fetchAllLedgers());
    else dispatch(fetchLedgerByType(activeType));
    setCurrentPage(1);
  }, [activeType, dispatch]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("desc");
    }
    setCurrentPage(1);
  };

  // active filter count
  const activeFilterCount = [
    search,
    fromDate,
    toDate,
    creditDebitFilter !== "ALL" ? creditDebitFilter : "",
  ].filter(Boolean).length;

  const filtered = useMemo(() => {
    let result = entries.filter((e) => {
      const name =
        `${e.user?.firstName || ""} ${e.user?.lastName || ""}`.toLowerCase();
      const matchSearch =
        !search.trim() ||
        name.includes(search.toLowerCase()) ||
        e.user?.phone?.includes(search);
      const entryDate = new Date(e.createdAt);
      const matchFrom = !fromDate || entryDate >= new Date(fromDate);
      const matchTo = !toDate || entryDate <= new Date(toDate + "T23:59:59");
      const matchCD =
        creditDebitFilter === "ALL" || e.type === creditDebitFilter;
      return matchSearch && matchFrom && matchTo && matchCD;
    });

    result = [...result].sort((a, b) => {
      if (sortField === "date") {
        const diff = new Date(a.createdAt) - new Date(b.createdAt);
        return sortDir === "asc" ? diff : -diff;
      }
      if (sortField === "amount") {
        const diff = Number(a.amount) - Number(b.amount);
        return sortDir === "asc" ? diff : -diff;
      }
      return 0;
    });

    return result;
  }, [
    entries,
    search,
    fromDate,
    toDate,
    creditDebitFilter,
    sortField,
    sortDir,
  ]);

  // Pending to pay farmer = procurement not yet paid
  const pendingToFarmer = filtered.reduce((s, e) => {
    if (e.type === "CREDIT" && e.referenceType === "PROCUREMENT")
      return s + Number(e.amount || 0);
    if (
      e.type === "DEBIT" &&
      (e.referenceType === "PROCUREMENT_PAYMENT" ||
        e.referenceType === "PAYMENT")
    )
      return s - Number(e.amount || 0);
    return s;
  }, 0);
  // Pending to collect from farmer = sales not yet paid
  const pendingFromFarmer = filtered.reduce((s, e) => {
    if (e.type === "DEBIT" && e.referenceType === "SALE")
      return s + Number(e.amount || 0);
    if (e.type === "CREDIT" && e.referenceType === "PAYMENT")
      return s - Number(e.amount || 0);
    return s;
  }, 0);
  // Actual cash paid out by FPO
  const totalPaidOut = filtered.reduce(
    (s, e) =>
      s +
      (e.type === "DEBIT" &&
      (e.referenceType === "PROCUREMENT_PAYMENT" ||
        e.referenceType === "PAYMENT")
        ? Number(e.amount || 0)
        : 0),
    0,
  );
  // Actual cash received by FPO
  const totalReceivedIn = filtered.reduce(
    (s, e) =>
      s +
      (e.type === "CREDIT" && e.referenceType === "PAYMENT"
        ? Number(e.amount || 0)
        : 0),
    0,
  );
  // for progress bar
  const netBalance =
    Math.max(0, pendingToFarmer) - Math.max(0, pendingFromFarmer);
  const creditRatio =
    totalPaidOut + totalReceivedIn > 0
      ? (totalReceivedIn / (totalPaidOut + totalReceivedIn)) * 100
      : 0;

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(start, start + ITEMS_PER_PAGE);

  const clearAll = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setCreditDebitFilter("ALL");
    setCurrentPage(1);
  };

  // ── Farmer-wise balance sheet ──────────────────────────────────────────────
  const [fbSearch, setFbSearch] = useState("");
  const [fbSort, setFbSort] = useState({ field: "net", dir: "desc" });
  const [expandedFarmer, setExpandedFarmer] = useState(null);
  const [fbStatusFilter, setFbStatusFilter] = useState("ALL");
  const [fbPage, setFbPage] = useState(1);
  const FB_PER_PAGE = 8;

  const farmerBalances = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      const id = e.user?._id;
      if (!id) return;
      if (!map[id])
        map[id] = {
          user: e.user,
          credit: 0,
          debit: 0,
          txns: [],
          lastDate: null,
          firstDate: null,
        };
      if (e.type === "CREDIT") map[id].credit += Number(e.amount || 0);
      if (e.type === "DEBIT") map[id].debit += Number(e.amount || 0);
      map[id].txns.push(e);
      const d = new Date(e.createdAt);
      if (isNaN(d.getTime()) || d.getFullYear() < 2000) return;
      if (!map[id].lastDate || d > map[id].lastDate) map[id].lastDate = d;
      if (!map[id].firstDate || d < map[id].firstDate) map[id].firstDate = d;
    });
    return Object.values(map).map((r) => {
      const procurement = r.txns
        .filter((e) => e.type === "CREDIT" && e.referenceType === "PROCUREMENT")
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      const sales = r.txns
        .filter((e) => e.type === "DEBIT" && e.referenceType === "SALE")
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      const paidOut = r.txns
        .filter(
          (e) =>
            e.type === "DEBIT" &&
            (e.referenceType === "PROCUREMENT_PAYMENT" ||
              e.referenceType === "PAYMENT"),
        )
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      const collected = r.txns
        .filter((e) => e.type === "CREDIT" && e.referenceType === "PAYMENT")
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      return {
        ...r,
        net: r.credit - r.debit,
        procurement,
        sales,
        paidOut,
        collected,
      };
    });
  }, [entries]);

  const filteredFarmerBalances = useMemo(() => {
    let list = farmerBalances.filter((r) => {
      const name = `${r.user.firstName} ${r.user.lastName}`.toLowerCase();
      const matchSearch =
        !fbSearch.trim() ||
        name.includes(fbSearch.toLowerCase()) ||
        r.user.phone?.includes(fbSearch);
      const matchStatus =
        fbStatusFilter === "ALL" ||
        (fbStatusFilter === "TO_PAY" && r.net > 0) ||
        (fbStatusFilter === "TO_RECEIVE" && r.net < 0) ||
        (fbStatusFilter === "CLEARED" && r.net === 0);
      return matchSearch && matchStatus;
    });
    list = [...list].sort((a, b) => {
      const dir = fbSort.dir === "asc" ? 1 : -1;
      if (fbSort.field === "name")
        return (
          dir *
          `${a.user.firstName} ${a.user.lastName}`.localeCompare(
            `${b.user.firstName} ${b.user.lastName}`,
          )
        );
      if (fbSort.field === "credit") return dir * (a.credit - b.credit);
      if (fbSort.field === "debit") return dir * (a.debit - b.debit);
      if (fbSort.field === "txns") return dir * (a.txns.length - b.txns.length);
      return dir * (a.net - b.net);
    });
    return list;
  }, [farmerBalances, fbSearch, fbSort, fbStatusFilter]);

  const toggleFbSort = (field) =>
    setFbSort((s) => ({
      field,
      dir: s.field === field && s.dir === "desc" ? "asc" : "desc",
    }));

  const exportFarmerCSV = () => {
    const headers = [
      "Farmer",
      "Phone",
      "Role",
      "Transactions",
      "Last Activity",
      "Total Credit",
      "Total Debit",
      "Net Balance",
      "Status",
    ];
    const rows = filteredFarmerBalances.map((r) => [
      `${r.user.firstName} ${r.user.lastName}`,
      r.user.phone || "",
      r.user.role || "",
      r.txns.length,
      r.lastDate ? r.lastDate.toLocaleDateString("en-IN") : "",
      r.credit,
      r.debit,
      r.net,
      r.net > 0 ? "To Pay" : r.net < 0 ? "To Receive" : "Cleared",
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `farmer_balance_sheet_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Monthly summary ─────────────────────────────────────────────────────────
  const [hoveredMonth, setHoveredMonth] = useState(null);
  const [hoveredTableRow, setHoveredTableRow] = useState(null);

  const monthlyData = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      const d = new Date(e.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en-IN", {
        month: "short",
        year: "2-digit",
      });
      if (!map[key]) map[key] = { key, label, credit: 0, debit: 0, txns: 0 };
      if (e.type === "CREDIT") map[key].credit += Number(e.amount || 0);
      if (e.type === "DEBIT") map[key].debit += Number(e.amount || 0);
      map[key].txns += 1;
    });
    const sorted = Object.values(map).sort((a, b) =>
      a.key.localeCompare(b.key),
    );
    return sorted.map((m, i) => {
      const prev = sorted[i - 1];
      const creditChange =
        prev && prev.credit > 0
          ? ((m.credit - prev.credit) / prev.credit) * 100
          : null;
      const debitChange =
        prev && prev.debit > 0
          ? ((m.debit - prev.debit) / prev.debit) * 100
          : null;
      return { ...m, net: m.credit - m.debit, creditChange, debitChange };
    });
  }, [entries]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Ledger</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500">
            {filtered.length} entries
          </p>
        </div>
        <button
          onClick={() => exportCSV(filtered)}
          className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm text-white bg-brand-600 rounded-lg hover:bg-brand-700"
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Export CSV</span>
          <span className="sm:hidden">Export</span>
          {activeFilterCount > 0 && (
            <span className="hidden sm:inline">({filtered.length})</span>
          )}
        </button>
      </div>

      {/* TAB SWITCHER */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-full sm:w-fit overflow-x-auto">
        {[
          {
            id: "ledger",
            label: "Transactions",
            shortLabel: "Txns",
            icon: BookOpen,
          },
          {
            id: "farmers",
            label: "Farmer Balance",
            shortLabel: "Farmers",
            icon: Users,
          },
          {
            id: "chart",
            label: "Monthly Summary",
            shortLabel: "Monthly",
            icon: BarChart2,
          },
        ].map(({ id, label, shortLabel, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-1 sm:flex-none justify-center ${
              activeTab === id
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{shortLabel}</span>
          </button>
        ))}
      </div>

      {
        activeTab === "ledger" && (
          <>
            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                {
                  label: "Total Credit",
                  sub: "CREDIT entries",
                  value: fmt(filtered.reduce((s, e) => s + (e.type === "CREDIT" ? Number(e.amount || 0) : 0), 0)),
                  color: "text-green-600",
                  bg: "bg-green-50 border-green-200",
                  icon: <TrendingUp className="w-4 h-4 text-green-500" />,
                },
                {
                  label: "Total Debit",
                  sub: "DEBIT entries",
                  value: fmt(filtered.reduce((s, e) => s + (e.type === "DEBIT" ? Number(e.amount || 0) : 0), 0)),
                  color: "text-red-600",
                  bg: "bg-red-50 border-red-200",
                  icon: <TrendingDown className="w-4 h-4 text-red-500" />,
                },
                {
                  label: "Net Balance",
                  sub: "Credit − Debit",
                  value: fmt(Math.abs(filtered.reduce((s, e) => s + (e.type === "CREDIT" ? Number(e.amount || 0) : -Number(e.amount || 0)), 0))),
                  color: "text-brand-600",
                  bg: "bg-brand-50 border-brand-200",
                  icon: <Wallet className="w-4 h-4 text-brand-600" />,
                },
                {
                  label: "Transactions",
                  sub: "Total entries",
                  value: filtered.length,
                  color: "text-gray-700",
                  bg: "bg-white border-gray-200",
                  icon: <BookOpen className="w-4 h-4 text-gray-500" />,
                },
              ].map(({ label, sub, value, color, bg, icon }) => (
                <div
                  key={label}
                  className={`p-4 border rounded-xl shadow-sm ${bg}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {icon}
                    <span className="text-xs text-gray-500">{sub}</span>
                  </div>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs font-medium text-gray-600 mt-0.5">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {/* FILTERS ROW */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full py-2 pr-3 text-sm border rounded-lg pl-9 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2 py-2 text-xs sm:text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 w-32 sm:w-auto"
                />
                <span className="text-xs text-gray-400">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2 py-2 text-xs sm:text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 w-32 sm:w-auto"
                />
              </div>
              <div className="flex items-center gap-1">
                {[
                  { f: "ALL", l: "All" },
                  { f: "CREDIT", l: "Pay" },
                  { f: "DEBIT", l: "Collect" },
                ].map(({ f, l }) => (
                  <button
                    key={f}
                    onClick={() => {
                      setCreditDebitFilter(f);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                      creditDebitFilter === f
                        ? f === "CREDIT"
                          ? "bg-red-500 text-white"
                          : f === "DEBIT"
                            ? "bg-brand-600 text-white"
                            : "bg-gray-800 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {l}
                  </button>
                ))}
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAll}
                    className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-red-500 bg-red-50 rounded-lg hover:bg-red-100"
                  >
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
            </div>

            {/* TYPE FILTER */}
            <div className="flex flex-wrap gap-2">
              {TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => {
                    setActiveType(value);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    activeType === value
                      ? "bg-gray-800 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* TABLE — desktop / CARDS — mobile */}
            <div className="bg-white rounded-xl shadow-sm">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="w-8 h-8 border-b-2 border-brand-600 rounded-full animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No ledger entries found</p>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearAll}
                      className="mt-2 text-sm text-red-500 hover:underline"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Mobile card list */}
                  <div className="sm:hidden divide-y divide-gray-50">
                    {filtered
                      .slice(start, start + ITEMS_PER_PAGE)
                      .map((entry, i) => {
                        const ref = entry.referenceType;
                        const initials =
                          `${entry.user?.firstName?.charAt(0) || ""}${entry.user?.lastName?.charAt(0) || ""}`.toUpperCase();
                        const isCredit = entry.type === "CREDIT";
                        const typeCls = isCredit
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700";
                        const bar = isCredit ? "bg-green-400" : "bg-red-400";
                        const isPositive = isCredit;
                        return (
                          <div
                            key={entry._id || i}
                            onClick={() => {
                              setSelectedUser(entry.user);
                              setShowHistory(false);
                            }}
                            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                          >
                            <div className={`w-1 h-12 rounded-r-full flex-shrink-0 ${bar}`} />
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold bg-gray-100 text-gray-700`}
                            >
                              {initials || "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">
                                {entry.user?.firstName} {entry.user?.lastName}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${typeCls}`}>
                                  {entry.type}
                                </span>
                                {ref && (
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TYPE_COLORS[ref] || "bg-gray-100 text-gray-500"}` }>
                                    {ref}
                                  </span>
                                )}
                                <span className="text-[10px] text-gray-400">
                                  {fmtDate(entry.createdAt)}
                                </span>
                              </div>
                            </div>
                            <p className={`text-sm font-bold flex-shrink-0 ${isPositive ? "text-green-600" : "text-red-600"}`}>
                              {isPositive ? "+" : "-"}{fmt(entry.amount)}
                            </p>
                          </div>
                        );
                      })}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto max-h-[520px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10 text-xs uppercase bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left w-1"></th>
                          <th
                            className="px-4 py-3 text-left cursor-pointer select-none"
                            onClick={() => handleSort("date")}
                          >
                            Date{" "}
                            <SortIcon
                              field="date"
                              sortField={sortField}
                              sortDir={sortDir}
                            />
                          </th>
                          <th className="px-4 py-3 text-left">Farmer</th>
                          <th className="px-4 py-3 text-left">Type</th>
                          <th className="px-4 py-3 text-left">Ref</th>
                          <th
                            className="px-4 py-3 text-right cursor-pointer select-none"
                            onClick={() => handleSort("amount")}
                          >
                            Amount{" "}
                            <SortIcon
                              field="amount"
                              sortField={sortField}
                              sortDir={sortDir}
                            />
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filtered
                          .slice(start, start + ITEMS_PER_PAGE)
                          .map((entry, i) => {
                            const ref = entry.referenceType;
                            const initials =
                              `${entry.user?.firstName?.charAt(0) || ""}${entry.user?.lastName?.charAt(0) || ""}`.toUpperCase();
                            const isCredit = entry.type === "CREDIT";
                            const typeCls = isCredit
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700";
                            const bar = isCredit ? "bg-green-400" : "bg-red-400";
                            return (
                              <tr
                                key={entry._id || i}
                                onClick={() => {
                                  setSelectedUser(entry.user);
                                  setShowHistory(false);
                                }}
                                className="cursor-pointer hover:bg-gray-50 transition-colors"
                              >
                                <td className="pl-0 pr-2 py-3 w-1">
                                  <div className={`w-1 h-10 rounded-r-full ${bar}`} />
                                </td>
                                <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                                  {fmtDate(entry.createdAt)}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold bg-gray-100 text-gray-700">
                                      {initials || "?"}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-800 text-sm leading-tight">
                                        {entry.user?.firstName}{" "}
                                        {entry.user?.lastName}
                                      </p>
                                      <p className="text-xs text-gray-400">
                                        {entry.user?.phone}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${typeCls}`}>
                                    {entry.type}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[ref] || "bg-gray-100 text-gray-500"}`}>
                                    {ref || "—"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`text-sm font-bold ${isCredit ? "text-green-600" : "text-red-600"}`}>
                                    {isCredit ? "+" : "-"}{fmt(entry.amount)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) /* end ledger tab */
      }

      {/* FARMER BALANCE SHEET TAB */}
      {activeTab === "farmers" &&
        (() => {
          const totalC = filteredFarmerBalances.reduce(
            (s, r) => s + r.credit,
            0,
          );
          const totalD = filteredFarmerBalances.reduce(
            (s, r) => s + r.debit,
            0,
          );
          const totalN = totalC - totalD;
          const surplus = filteredFarmerBalances.filter(
            (r) => r.net > 0,
          ).length;
          const deficit = filteredFarmerBalances.filter(
            (r) => r.net < 0,
          ).length;
          const settled = filteredFarmerBalances.filter(
            (r) => r.net === 0,
          ).length;
          const statusLabel = (net) =>
            net > 0 ? "To Pay" : net < 0 ? "To Receive" : "Cleared";
          const statusCls2 = (net) =>
            net > 0
              ? "bg-red-100 text-red-600"
              : net < 0
                ? "bg-brand-100 text-brand-700"
                : "bg-gray-100 text-gray-500";
          const FbSortIcon = ({ field }) => {
            if (fbSort.field !== field)
              return <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-30" />;
            return fbSort.dir === "asc" ? (
              <ArrowUp className="inline w-3 h-3 ml-1 text-brand-600" />
            ) : (
              <ArrowDown className="inline w-3 h-3 ml-1 text-brand-600" />
            );
          };
          return (
            <div className="space-y-4">
              {/* Summary cards */}
              {(() => {
                const totalC = filteredFarmerBalances.reduce((s, r) => s + r.credit, 0);
                const totalD = filteredFarmerBalances.reduce((s, r) => s + r.debit, 0);
                const totalN = totalC - totalD;
                return (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {/* Farmers count */}
                    <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="bg-brand-100 p-2 rounded-xl">
                          <Users className="w-4 h-4 text-brand-700" />
                        </div>
                        <span className="text-xs font-semibold text-gray-400">
                          {filteredFarmerBalances.length} farmers
                        </span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <span className="text-xs bg-green-50 text-green-600 font-semibold px-2 py-0.5 rounded-full">
                          {surplus} credit
                        </span>
                        <span className="text-xs bg-red-50 text-red-500 font-semibold px-2 py-0.5 rounded-full">
                          {deficit} debit
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-400 font-semibold px-2 py-0.5 rounded-full">
                          {settled} nil
                        </span>
                      </div>
                    </div>
                    {/* Total Credit */}
                    <div className="bg-white border border-green-100 shadow-sm rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="bg-green-100 p-2 rounded-xl">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="text-xs text-gray-400">Total Credit</span>
                      </div>
                      <p className="text-xl font-black text-green-600">{fmt(totalC)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">CREDIT entries</p>
                    </div>
                    {/* Total Debit */}
                    <div className="bg-white border border-red-100 shadow-sm rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="bg-red-100 p-2 rounded-xl">
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        </div>
                        <span className="text-xs text-gray-400">Total Debit</span>
                      </div>
                      <p className="text-xl font-black text-red-500">{fmt(totalD)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">DEBIT entries</p>
                    </div>
                    {/* Net balance */}
                    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="bg-gray-100 p-2 rounded-xl">
                          <Wallet className="w-4 h-4 text-gray-600" />
                        </div>
                        <span className="text-xs text-gray-400">Net Balance</span>
                      </div>
                      <p className="text-xl font-black text-gray-700">{fmt(Math.abs(totalN))}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Credit − Debit</p>
                    </div>
                  </div>
                );
              })()}

              {/* Premium Search Bar */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Search row */}
                <div className="flex items-center gap-2 p-1.5">
                  <div className="relative flex-1">
                    <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
                    <input
                      type="text"
                      placeholder="Search by name or phone..."
                      value={fbSearch}
                      onChange={(e) => {
                        setFbSearch(e.target.value);
                        setFbPage(1);
                      }}
                      className="w-full py-2.5 pr-8 text-sm bg-gray-50 rounded-xl pl-9 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 transition"
                    />
                    {fbSearch && (
                      <button
                        onClick={() => setFbSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2"
                      >
                        <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={exportFarmerCSV}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-brand-700 hover:bg-brand-50 transition flex-shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                </div>
                {/* Filter pills row */}
                <div className="flex items-center gap-1 px-1.5 pb-1.5 overflow-x-auto">
                  {[
                    { id: "ALL", label: "All", count: farmerBalances.length },
                    {
                      id: "TO_PAY",
                      label: "Net Credit",
                      count: farmerBalances.filter((r) => r.net > 0).length,
                    },
                    {
                      id: "TO_RECEIVE",
                      label: "Net Debit",
                      count: farmerBalances.filter((r) => r.net < 0).length,
                    },
                    {
                      id: "CLEARED",
                      label: "Nil Balance",
                      count: farmerBalances.filter((r) => r.net === 0).length,
                    },
                  ].map(({ id, label, count }) => (
                    <button
                      key={id}
                      onClick={() => {
                        setFbStatusFilter(id);
                        setFbPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap flex-shrink-0 ${
                        fbStatusFilter === id
                          ? id === "TO_PAY"
                            ? "bg-red-500 text-white"
                            : id === "TO_RECEIVE"
                              ? "bg-emerald-500 text-white"
                              : id === "CLEARED"
                                ? "bg-gray-500 text-white"
                                : "bg-brand-600 text-white"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {label} <span className="opacity-70">({count})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Farmer Detail Drawer */}
              {expandedFarmer &&
                (() => {
                  const row = filteredFarmerBalances.find(
                    (r) => r.user._id === expandedFarmer,
                  );
                  if (!row) return null;
                  const sortedTxns = [...row.txns].sort(
                    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
                  );
                  const grouped = groupByMonth(sortedTxns);
                  return (
                    <div
                      className="fixed inset-0 z-40 flex justify-end bg-black/50 overflow-hidden"
                      onClick={() => setExpandedFarmer(null)}
                    >
                      <div
                        className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col overflow-hidden border-l border-gray-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Header */}
                        <div className="bg-gradient-to-br from-brand-800 to-brand-600 px-6 pt-6 pb-8 flex-shrink-0">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-lg">
                                {row.user.firstName?.charAt(0)?.toUpperCase()}
                              </div>
                              <div>
                                <p className="text-white font-bold text-base leading-tight">
                                  {row.user.firstName} {row.user.lastName}
                                </p>
                                <p className="text-brand-200 text-xs mt-0.5">
                                  <Phone className="w-3 h-3 inline mr-1" />
                                  +91 {row.user.phone}
                                </p>
                                <span className="mt-1 inline-block bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                                  {row.user.role || "Farmer"}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => setExpandedFarmer(null)}
                              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition"
                            >
                              <X className="w-4 h-4 text-white" />
                            </button>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <div className="bg-white/15 rounded-xl px-3 py-2">
                              <p className="text-[10px] text-brand-200 uppercase tracking-wide">
                                Transactions
                              </p>
                              <p className="text-lg font-black text-white">
                                {row.txns.length}
                              </p>
                            </div>
                            <div className="bg-white/15 rounded-xl px-3 py-2">
                              <p className="text-[10px] text-brand-200 uppercase tracking-wide">
                                Last Activity
                              </p>
                              <p className="text-sm font-bold text-white">
                                {row.lastDate
                                  ? row.lastDate.toLocaleDateString("en-IN")
                                  : "—"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                          {/* Credit / Debit breakdown */}
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              {
                                label: "Procurement",
                                sub: "Crop bought from farmer",
                                value: fmt(row.procurement),
                                color: "text-orange-600",
                                bg: "bg-orange-50 border-orange-100",
                              },
                              {
                                label: "Sales",
                                sub: "Goods sold to farmer",
                                value: fmt(row.sales),
                                color: "text-blue-600",
                                bg: "bg-blue-50 border-blue-100",
                              },
                              {
                                label: "Paid Out",
                                sub: "FPO paid to farmer",
                                value: fmt(row.paidOut),
                                color: "text-red-500",
                                bg: "bg-red-50 border-red-100",
                              },
                              {
                                label: "Collected",
                                sub: "Farmer paid to FPO",
                                value: fmt(row.collected),
                                color: "text-green-600",
                                bg: "bg-green-50 border-green-100",
                              },
                            ].map(({ label, sub, value, color, bg }) => (
                              <div key={label} className={`p-3 rounded-xl border ${bg}`}>
                                <p className={`text-base font-bold ${color}`}>{value}</p>
                                <p className="text-xs font-semibold text-gray-700 mt-0.5">{label}</p>
                                <p className="text-[10px] text-gray-400">{sub}</p>
                              </div>
                            ))}
                          </div>

                          {/* Pending rows */}
                          <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                              <div>
                                <p className="text-xs font-semibold text-orange-600">Pending to Farmer</p>
                                <p className="text-[10px] text-gray-400">Procurement – Paid Out</p>
                              </div>
                              <p className="text-sm font-bold text-orange-600">{fmt(row.procurement - row.paidOut)}</p>
                            </div>
                            <div className="flex items-center justify-between px-4 py-3">
                              <div>
                                <p className="text-xs font-semibold text-blue-600">Pending from Farmer</p>
                                <p className="text-[10px] text-gray-400">Sales – Collected</p>
                              </div>
                              <p className="text-sm font-bold text-blue-600">{fmt(row.sales - row.collected)}</p>
                            </div>
                          </div>

                          {/* Net balance bar */}
                          <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${row.net >= 0 ? "bg-red-500" : "bg-brand-600"}`}>
                            <div>
                              <p className="text-xs font-semibold text-white/80 uppercase tracking-wide">Net Balance</p>
                              <p className="text-xs text-white/60">{row.net >= 0 ? "FPO owes farmer" : "Farmer owes FPO"}</p>
                            </div>
                            <p className="text-xl font-black text-white">{fmt(Math.abs(row.net))}</p>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => printFarmerStatement(row)}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                            >
                              <FileText className="w-4 h-4" /> Print PDF
                            </button>
                          </div>

                          {/* Transaction timeline — Paytm style */}
                          <div className="rounded-xl overflow-hidden border border-gray-200 bg-white">
                            <div className="flex items-center justify-between px-4 py-3 bg-brand-600">
                              <p className="text-xs font-bold text-white uppercase tracking-widest">
                                Transaction History
                              </p>
                              <span className="text-xs font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">
                                {row.txns.length} txns
                              </span>
                            </div>
                            {Object.entries(grouped).map(
                              ([month, monthTxns]) => (
                                <div key={month}>
                                  <div className="px-4 py-1.5 bg-gray-50 border-y border-gray-100">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                      {month}
                                    </span>
                                  </div>
                                  {monthTxns.map((e, idx) => {
                                    const ref = e.referenceType;
                                    const type = e.type;
                                    const scheme = (() => {
                                      if (
                                        type === "CREDIT" &&
                                        ref === "PROCUREMENT"
                                      )
                                        return {
                                          iconBg: "#e8f5e9",
                                          iconColor: "#16a34a",
                                          amt: "#16a34a",
                                          sign: "+",
                                        };
                                      if (
                                        type === "DEBIT" &&
                                        ref === "PROCUREMENT_PAYMENT"
                                      )
                                        return {
                                          iconBg: "#fef2f2",
                                          iconColor: "#dc2626",
                                          amt: "#dc2626",
                                          sign: "-",
                                        };
                                      if (type === "DEBIT" && ref === "SALE")
                                        return {
                                          iconBg: "#e8f5e9",
                                          iconColor: "#16a34a",
                                          amt: "#16a34a",
                                          sign: "+",
                                        };
                                      if (type === "DEBIT" && ref === "PAYMENT")
                                        return {
                                          iconBg: "#e8f5e9",
                                          iconColor: "#16a34a",
                                          amt: "#16a34a",
                                          sign: "+",
                                        };
                                      if (
                                        type === "CREDIT" &&
                                        ref === "PAYMENT"
                                      )
                                        return {
                                          iconBg: "#fef2f2",
                                          iconColor: "#dc2626",
                                          amt: "#dc2626",
                                          sign: "-",
                                        };
                                      if (ref === "REFUND")
                                        return {
                                          iconBg: "#fef2f2",
                                          iconColor: "#dc2626",
                                          amt: "#dc2626",
                                          sign: "-",
                                        };
                                      if (ref === "ADJUSTMENT")
                                        return {
                                          iconBg: "#fffbeb",
                                          iconColor: "#d97706",
                                          amt: "#d97706",
                                          sign: type === "CREDIT" ? "+" : "-",
                                        };
                                      return {
                                        iconBg: "#f3f4f6",
                                        iconColor: "#6b7280",
                                        amt: "#374151",
                                        sign: type === "CREDIT" ? "+" : "-",
                                      };
                                    })();
                                    return (
                                      <div
                                        key={e._id || idx}
                                        className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                                      >
                                        <div className="flex items-center gap-3">
                                          <div
                                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                                            style={{ background: scheme.iconBg }}
                                          >
                                            <Wallet className="w-4 h-4" style={{ color: scheme.iconColor }} />
                                          </div>
                                          <div>
                                            <div className="flex items-center gap-1.5">
                                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${type === "CREDIT" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                                {type}
                                              </span>
                                              {ref && (
                                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TYPE_COLORS[ref] || "bg-gray-100 text-gray-500"}`}>
                                                  {ref}
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5">{fmtDate(e.createdAt)}</p>
                                          </div>
                                        </div>
                                        <p className="text-sm font-bold" style={{ color: scheme.amt }}>
                                          {scheme.sign}{fmt(e.amount)}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              {/* Banking Theme List */}
              <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200">
                {/* Bank-style green header */}
                <div className="bg-gradient-to-r from-brand-800 to-brand-600 px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[10px] font-semibold text-brand-300 uppercase tracking-widest">
                        Marjeevi FPO
                      </p>
                      <p className="text-base font-bold text-white mt-0.5">
                        Farmer Account Ledger
                      </p>
                    </div>
                  </div>
                  {/* Mini stat bar */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2.5 border-t border-brand-700">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-300" />
                      <span className="text-[11px] text-brand-200">{surplus} net credit</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-300" />
                      <span className="text-[11px] text-brand-200">{deficit} net debit</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-brand-400" />
                      <span className="text-[11px] text-brand-300">{settled} nil</span>
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      {[
                        { f: "net", l: "Bal" },
                        { f: "name", l: "A–Z" },
                        { f: "txns", l: "Txns" },
                      ].map(({ f, l }) => (
                        <button
                          key={f}
                          onClick={() => {
                            toggleFbSort(f);
                            setFbPage(1);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                            fbSort.field === f
                              ? "bg-white/20 text-white"
                              : "text-brand-300 hover:text-white"
                          }`}
                        >
                          {l}
                          {fbSort.field === f
                            ? fbSort.dir === "asc"
                              ? "↑"
                              : "↓"
                            : ""}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Column labels — desktop only */}
                <div className="hidden sm:flex bg-slate-50 border-b border-slate-200 px-4 py-2 items-center">
                  <p className="flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Account Holder
                  </p>
                  <p className="w-28 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Last Txn
                  </p>
                  <p className="w-28 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Balance
                  </p>
                  <p className="w-20 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Action
                  </p>
                </div>

                {/* Account rows */}
                <div className="bg-white divide-y divide-slate-100">
                  {filteredFarmerBalances.length === 0 ? (
                    <div className="py-16 text-center">
                      <Users className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                      <p className="text-sm text-slate-400">
                        No accounts found
                      </p>
                      {fbSearch && (
                        <button
                          onClick={() => setFbSearch("")}
                          className="mt-1.5 text-xs text-blue-600 hover:underline"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredFarmerBalances
                      .slice((fbPage - 1) * FB_PER_PAGE, fbPage * FB_PER_PAGE)
                      .map((row, idx) => {
                        const net = row.net;
                        const isTopay = net > 0;
                        const isReceive = net < 0;
                        const hues = [
                          "bg-violet-100 text-violet-700",
                          "bg-sky-100 text-sky-700",
                          "bg-amber-100 text-amber-700",
                          "bg-teal-100 text-teal-700",
                          "bg-pink-100 text-pink-700",
                          "bg-indigo-100 text-indigo-700",
                        ];
                        const avatarCls = hues[idx % hues.length];
                        return (
                          <div
                            key={row.user._id}
                            onClick={() => setExpandedFarmer(row.user._id)}
                            className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-50 active:bg-slate-100 transition-colors"
                          >
                            {/* Avatar */}
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black ${avatarCls}`}
                            >
                              {row.user.firstName?.charAt(0)?.toUpperCase()}
                            </div>

                            {/* Name + phone — takes all remaining space */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 leading-tight truncate">
                                {row.user.firstName} {row.user.lastName}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5 flex-shrink-0" />
                                <span className="truncate">
                                  {row.user.phone || "—"}
                                </span>
                                <span className="text-slate-200 hidden sm:inline">
                                  ·
                                </span>
                                <span className="hidden sm:inline">
                                  {row.txns.length} txns
                                </span>
                              </p>
                              {/* Balance shown inline on mobile */}
                              <div className="flex items-center gap-2 mt-1 sm:hidden">
                                {net === 0 ? (
                                  <span className="text-xs font-semibold text-slate-300">NIL</span>
                                ) : (
                                  <span translate="no" className={`notranslate text-xs font-black tabular-nums ${net > 0 ? "text-green-600" : "text-red-600"}`}>
                                    {net > 0 ? "+" : "-"}{fmt(Math.abs(net))}
                                    <span className={`ml-1 text-[10px] font-semibold ${net > 0 ? "text-green-500" : "text-red-400"}`}>
                                      {net > 0 ? "CR" : "DR"}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Last txn — desktop only */}
                            <div className="w-24 text-right hidden sm:block flex-shrink-0">
                              <p className="text-xs text-slate-500">
                                {row.lastDate
                                  ? row.lastDate.toLocaleDateString("en-IN")
                                  : "—"}
                              </p>
                              <p className="text-[10px] text-slate-300 mt-0.5">
                                {row.txns.length} txns
                              </p>
                            </div>

                            {/* Balance — desktop only */}
                            <div className="w-28 text-right hidden sm:block flex-shrink-0">
                              {net === 0 ? (
                                <p className="text-sm font-semibold text-slate-300">NIL</p>
                              ) : (
                                <>
                                  <p translate="no" className={`notranslate text-sm font-black tabular-nums ${net > 0 ? "text-green-600" : "text-red-600"}`}>
                                    {net > 0 ? "+" : "-"}{fmt(Math.abs(net))}
                                  </p>
                                  <p className={`text-[10px] font-bold uppercase tracking-wide mt-0.5 ${net > 0 ? "text-green-500" : "text-red-400"}`}>
                                    {net > 0 ? "CREDIT" : "DEBIT"}
                                  </p>
                                </>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  printFarmerStatement(row);
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-400 transition hidden sm:flex"
                                title="Statement"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>

                {/* brand-themed footer with pagination */}
                {filteredFarmerBalances.length > 0 &&
                  (() => {
                    const totalFbPages = Math.ceil(
                      filteredFarmerBalances.length / FB_PER_PAGE,
                    );
                    const startIdx = (fbPage - 1) * FB_PER_PAGE + 1;
                    const endIdx = Math.min(
                      fbPage * FB_PER_PAGE,
                      filteredFarmerBalances.length,
                    );
                    return (
                      <div className="bg-brand-700 px-5 py-3">
                        {/* Totals row */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <p className="text-[11px] text-brand-300">
                            {filteredFarmerBalances.length} accounts ·{" "}
                            {new Date().toLocaleDateString("en-IN")}
                          </p>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-[10px] text-brand-300 uppercase tracking-wide">Total Credit</p>
                              <p className="text-sm font-black text-green-300 tabular-nums">
                                {fmt(filteredFarmerBalances.reduce((s, r) => s + r.credit, 0))}
                              </p>
                            </div>
                            <div className="w-px h-8 bg-brand-600" />
                            <div className="text-right">
                              <p className="text-[10px] text-brand-300 uppercase tracking-wide">Total Debit</p>
                              <p className="text-sm font-black text-red-300 tabular-nums">
                                {fmt(filteredFarmerBalances.reduce((s, r) => s + r.debit, 0))}
                              </p>
                            </div>
                          </div>
                        </div>
                        {/* Pagination row */}
                        {totalFbPages > 1 && (
                          <div className="flex items-center justify-between border-t border-brand-600 pt-2.5">
                            <p className="text-[11px] text-brand-300">
                              {startIdx}–{endIdx} of{" "}
                              {filteredFarmerBalances.length}
                            </p>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setFbPage(1)}
                                disabled={fbPage === 1}
                                className="px-2 py-1 rounded text-[11px] font-semibold text-brand-300 hover:bg-brand-600 disabled:opacity-30 transition"
                              >
                                «
                              </button>
                              <button
                                onClick={() => setFbPage((p) => p - 1)}
                                disabled={fbPage === 1}
                                className="px-2.5 py-1 rounded text-[11px] font-semibold text-brand-300 hover:bg-brand-600 disabled:opacity-30 transition"
                              >
                                ‹ Prev
                              </button>
                              {Array.from(
                                { length: totalFbPages },
                                (_, i) => i + 1,
                              )
                                .filter(
                                  (p) =>
                                    p === 1 ||
                                    p === totalFbPages ||
                                    Math.abs(p - fbPage) <= 1,
                                )
                                .reduce((acc, p, i, arr) => {
                                  if (i > 0 && p - arr[i - 1] > 1)
                                    acc.push("...");
                                  acc.push(p);
                                  return acc;
                                }, [])
                                .map((p, i) =>
                                  p === "..." ? (
                                    <span
                                      key={`dot-${i}`}
                                      className="px-1 text-brand-400 text-[11px]"
                                    >
                                      …
                                    </span>
                                  ) : (
                                    <button
                                      key={p}
                                      onClick={() => setFbPage(p)}
                                      className={`w-7 h-7 rounded text-[11px] font-bold transition ${
                                        fbPage === p
                                          ? "bg-white text-brand-800"
                                          : "text-brand-300 hover:bg-brand-600"
                                      }`}
                                    >
                                      {p}
                                    </button>
                                  ),
                                )}
                              <button
                                onClick={() => setFbPage((p) => p + 1)}
                                disabled={fbPage === totalFbPages}
                                className="px-2.5 py-1 rounded text-[11px] font-semibold text-brand-300 hover:bg-brand-600 disabled:opacity-30 transition"
                              >
                                Next ›
                              </button>
                              <button
                                onClick={() => setFbPage(totalFbPages)}
                                disabled={fbPage === totalFbPages}
                                className="px-2 py-1 rounded text-[11px] font-semibold text-brand-300 hover:bg-brand-600 disabled:opacity-30 transition"
                              >
                                »
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
              </div>
            </div>
          );
        })()}

      {/* MONTHLY SUMMARY CHART TAB */}
      {activeTab === "chart" &&
        (() => {
          const maxVal = Math.max(
            ...monthlyData.flatMap((m) => [m.credit, m.debit]),
            1,
          );
          const BAR_H = 220;
          const BAR_W = 32;
          const GROUP_GAP = 24;
          const PADDING_L = 56;
          const PADDING_TOP = 16;
          const LABEL_H = 44;
          const groupW = BAR_W * 2 + 6;
          const svgW = Math.max(
            600,
            monthlyData.length * (groupW + GROUP_GAP) + PADDING_L + 20,
          );
          const svgH = BAR_H + LABEL_H + PADDING_TOP;

          // net line points
          const netPoints = monthlyData
            .map((m, i) => {
              const cx = PADDING_L + i * (groupW + GROUP_GAP) + groupW / 2;
              const netClamped = Math.max(0, Math.min(m.net, maxVal));
              const cy = PADDING_TOP + BAR_H - (netClamped / maxVal) * BAR_H;
              return `${cx},${cy}`;
            })
            .join(" ");

          const now = new Date();
          const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          const currentMonth = monthlyData.find(
            (m) => m.key === currentMonthKey,
          );
          const bestMonth = [...monthlyData].sort(
            (a, b) => b.credit - a.credit,
          )[0];
          const worstMonth = [...monthlyData].sort(
            (a, b) => b.debit - a.debit,
          )[0];
          const totalTxns = monthlyData.reduce((s, m) => s + m.txns, 0);
          const hovered =
            hoveredMonth !== null ? monthlyData[hoveredMonth] : null;

          const cmNet = currentMonth
            ? currentMonth.credit - currentMonth.debit
            : 0;
          const cmLabel = now.toLocaleString("en-IN", {
            month: "long",
            year: "numeric",
          });
          const cmStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            1,
          ).toLocaleDateString("en-IN");
          const cmEnd = now.toLocaleDateString("en-IN");

          return (
            <div className="space-y-4">
              {/* Current month banner */}
              <div className="relative flex items-center justify-between px-6 py-5 overflow-hidden bg-gradient-to-r from-brand-800 to-brand-600 rounded-2xl">
                <div className="absolute top-0 right-0 w-40 h-40 translate-x-12 -translate-y-12 rounded-full bg-white/10" />
                <div className="absolute bottom-0 w-24 h-24 translate-y-8 rounded-full left-24 bg-white/5" />
                <div className="relative">
                  <p className="mb-1 text-xs font-medium tracking-widest uppercase text-white/70">
                    Current Month
                  </p>
                  <p className="text-2xl font-bold text-white">{cmLabel}</p>
                  <p className="mt-1 text-sm text-brand-100">
                    {cmStart} &ndash; {cmEnd}
                  </p>
                </div>
                <div className="relative text-right">
                  <p className="mb-1 text-xs tracking-widest uppercase text-white/60">
                    Year
                  </p>
                  <p className="text-4xl font-black text-white">
                    {now.getFullYear()}
                  </p>
                </div>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {/* Transactions this month */}
                <div className="relative p-5 overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
                  <div className="absolute top-0 right-0 w-20 h-20 translate-x-6 -translate-y-6 rounded-full bg-gray-50" />
                  <div className="relative">
                    <div className="bg-gray-100 p-2.5 rounded-xl w-fit">
                      <BarChart2 className="w-5 h-5 text-gray-600" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-gray-800">
                      {currentMonth?.txns ?? 0}
                    </p>
                    <p className="text-sm text-gray-400 mt-0.5">Transactions</p>
                  </div>
                </div>
                {/* Credit this month */}
                <div className="relative p-5 overflow-hidden bg-white border border-red-100 shadow-sm rounded-2xl">
                  <div className="absolute top-0 right-0 w-20 h-20 translate-x-6 -translate-y-6 rounded-full bg-red-50" />
                  <div className="relative">
                    <div className="bg-red-100 p-2.5 rounded-xl w-fit">
                      <TrendingDown className="w-5 h-5 text-red-500" />
                    </div>
                    <p className="mt-3 text-2xl font-bold text-red-500">
                      {currentMonth ? fmt(currentMonth.credit) : "₹0"}
                    </p>
                    <p className="text-sm text-gray-400 mt-0.5">Credit</p>
                    {currentMonth?.creditChange != null ? (
                      <span
                        className={`mt-2 inline-block text-xs font-medium px-2 py-0.5 rounded-full ${currentMonth.creditChange >= 0 ? "bg-brand-50 text-brand-600" : "bg-red-50 text-red-500"}`}
                      >
                        {currentMonth.creditChange >= 0 ? "▲" : "▼"}{" "}
                        {Math.abs(currentMonth.creditChange).toFixed(1)}% vs
                        last month
                      </span>
                    ) : (
                      <span className="mt-2 inline-block text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                        No prev data
                      </span>
                    )}
                  </div>
                </div>
                {/* Debit this month */}
                <div className="relative p-5 overflow-hidden bg-white border border-brand-100 shadow-sm rounded-2xl">
                  <div className="absolute top-0 right-0 w-20 h-20 translate-x-6 -translate-y-6 rounded-full bg-brand-50" />
                  <div className="relative">
                    <div className="bg-brand-100 p-2.5 rounded-xl w-fit">
                      <TrendingUp className="w-5 h-5 text-brand-600" />
                    </div>
                    <p className="mt-3 text-2xl font-bold text-brand-600">
                      {currentMonth ? fmt(currentMonth.debit) : "₹0"}
                    </p>
                    <p className="text-sm text-gray-400 mt-0.5">Debit</p>
                    {currentMonth?.debitChange != null ? (
                      <span
                        className={`mt-2 inline-block text-xs font-medium px-2 py-0.5 rounded-full ${currentMonth.debitChange >= 0 ? "bg-red-50 text-red-500" : "bg-brand-50 text-brand-600"}`}
                      >
                        {currentMonth.debitChange >= 0 ? "▲" : "▼"}{" "}
                        {Math.abs(currentMonth.debitChange).toFixed(1)}% vs last
                        month
                      </span>
                    ) : (
                      <span className="mt-2 inline-block text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                        No prev data
                      </span>
                    )}
                  </div>
                </div>
                {/* Pending this month */}
                <div className="relative p-5 overflow-hidden bg-white border shadow-sm rounded-2xl border-slate-200">
                  <div className="absolute top-0 right-0 w-20 h-20 translate-x-6 -translate-y-6 rounded-full bg-slate-50" />
                  <div className="relative">
                    <div className="p-2.5 rounded-xl w-fit bg-slate-100">
                      <Wallet className="w-5 h-5 text-slate-600" />
                    </div>
                    <p className="mt-3 text-2xl font-bold text-slate-700">
                      {fmt(Math.abs(cmNet))}
                    </p>
                    <p className="text-sm text-gray-400 mt-0.5">Net Balance</p>
                    <span className="mt-2 inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {cmNet >= 0 ? "Surplus" : "Deficit"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Top 5 Farmers + Credit/Debit Ratio side by side */}
              {(() => {
                const top5 = [...farmerBalances]
                  .sort((a, b) => b.credit + b.debit - (a.credit + a.debit))
                  .slice(0, 5);
                const maxVol = Math.max(
                  ...top5.map((r) => r.credit + r.debit),
                  1,
                );
                const BAR_W = 180;
                const ROW_H = 36;
                const GAP = 10;
                const LABEL_W = 110;
                const svgH = top5.length * (ROW_H + GAP) + 10;

                // donut data
                const totalC = entries.reduce(
                  (s, e) =>
                    s + (e.type === "CREDIT" ? Number(e.amount || 0) : 0),
                  0,
                );
                const totalD = entries.reduce(
                  (s, e) =>
                    s + (e.type === "DEBIT" ? Number(e.amount || 0) : 0),
                  0,
                );
                const total = totalC + totalD || 1;
                const cAngle = (totalC / total) * 360;
                const r = 54;
                const cx2 = 70;
                const cy2 = 70;
                const toRad = (deg) => ((deg - 90) * Math.PI) / 180;
                const arcX = (deg) => cx2 + r * Math.cos(toRad(deg));
                const arcY = (deg) => cy2 + r * Math.sin(toRad(deg));
                const largeArc = cAngle > 180 ? 1 : 0;
                const donutPath = `M ${arcX(0)} ${arcY(0)} A ${r} ${r} 0 ${largeArc} 1 ${arcX(cAngle)} ${arcY(cAngle)}`;
                const debitPath = `M ${arcX(cAngle)} ${arcY(cAngle)} A ${r} ${r} 0 ${1 - largeArc} 1 ${arcX(360)} ${arcY(360)}`;

                return (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Top 5 horizontal bar chart */}
                    <div className="p-5 bg-white shadow-sm rounded-xl">
                      <p className="mb-1 text-sm font-semibold text-gray-700">
                        Top 5 Farmers by Volume
                      </p>
                      <p className="mb-4 text-xs text-gray-400">
                        Ranked by total credit + debit
                      </p>
                      {top5.length === 0 ? (
                        <p className="py-8 text-center text-gray-400">
                          No data
                        </p>
                      ) : (
                        <svg
                          width="100%"
                          height={svgH}
                          viewBox={`0 0 ${LABEL_W + BAR_W + 60} ${svgH}`}
                        >
                          {top5.map((row, i) => {
                            const vol = row.credit + row.debit;
                            const cW = Math.max(
                              2,
                              (row.credit / maxVol) * BAR_W,
                            );
                            const dW = Math.max(
                              2,
                              (row.debit / maxVol) * BAR_W,
                            );
                            const y = i * (ROW_H + GAP) + 5;
                            const name = `${row.user.firstName} ${row.user.lastName}`;
                            const short =
                              name.length > 14 ? name.slice(0, 13) + "…" : name;
                            return (
                              <g key={row.user._id}>
                                {/* Rank badge */}
                                <circle
                                  cx="10"
                                  cy={y + ROW_H / 2}
                                  r="9"
                                  fill={
                                    i === 0
                                      ? "#f59e0b"
                                      : i === 1
                                        ? "#9ca3af"
                                        : i === 2
                                          ? "#b45309"
                                          : "#e5e7eb"
                                  }
                                />
                                <text
                                  x="10"
                                  y={y + ROW_H / 2 + 4}
                                  textAnchor="middle"
                                  fontSize="9"
                                  fill={i < 3 ? "white" : "#6b7280"}
                                  fontWeight="700"
                                >
                                  {i + 1}
                                </text>
                                {/* Name */}
                                <text
                                  x="24"
                                  y={y + ROW_H / 2 + 4}
                                  fontSize="11"
                                  fill="#374151"
                                  fontWeight="500"
                                >
                                  {short}
                                </text>
                                {/* Credit bar */}
                                <rect
                                  x={LABEL_W}
                                  y={y + 4}
                                  width={cW}
                                  height={12}
                                  rx="3"
                                  fill="#22c55e"
                                  opacity="0.85"
                                />
                                {/* Debit bar */}
                                <rect
                                  x={LABEL_W}
                                  y={y + 20}
                                  width={dW}
                                  height={12}
                                  rx="3"
                                  fill="#f87171"
                                  opacity="0.85"
                                />
                                {/* Volume label */}
                                <text
                                  x={LABEL_W + BAR_W + 6}
                                  y={y + ROW_H / 2 + 4}
                                  fontSize="10"
                                  fill="#6b7280"
                                >
                                  {fmt(vol)}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      )}
                      <div className="flex gap-4 mt-2">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-3 h-2 bg-brand-500 rounded-sm" />
                          <span className="text-xs text-gray-400">Credit</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-3 h-2 bg-red-400 rounded-sm" />
                          <span className="text-xs text-gray-400">Debit</span>
                        </div>
                      </div>
                    </div>

                    {/* Credit vs Debit donut */}
                    <div className="flex flex-col items-center justify-center p-5 bg-white shadow-sm rounded-xl">
                      <p className="self-start mb-1 text-sm font-semibold text-gray-700">
                        Overall Credit vs Debit
                      </p>
                      <p className="self-start mb-4 text-xs text-gray-400">
                        All-time ratio
                      </p>
                      <div className="flex items-center gap-8">
                        <svg width="140" height="140" viewBox="0 0 140 140">
                          <circle
                            cx={cx2}
                            cy={cy2}
                            r={r}
                            fill="none"
                            stroke="#f3f4f6"
                            strokeWidth="18"
                          />
                          {totalC > 0 && (
                            <path
                              d={donutPath}
                              fill="none"
                              stroke="#22c55e"
                              strokeWidth="18"
                              strokeLinecap="round"
                            />
                          )}
                          {totalD > 0 && (
                            <path
                              d={debitPath}
                              fill="none"
                              stroke="#f87171"
                              strokeWidth="18"
                              strokeLinecap="round"
                            />
                          )}
                          <text
                            x={cx2}
                            y={cy2 - 6}
                            textAnchor="middle"
                            fontSize="13"
                            fontWeight="700"
                            fill="#111827"
                          >
                            {((totalC / total) * 100).toFixed(0)}%
                          </text>
                          <text
                            x={cx2}
                            y={cy2 + 10}
                            textAnchor="middle"
                            fontSize="9"
                            fill="#9ca3af"
                          >
                            Credit
                          </text>
                        </svg>
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 bg-brand-500 rounded-sm" />
                              <span className="text-xs text-gray-500">
                                Credit
                              </span>
                            </div>
                            <p className="text-sm font-bold text-brand-600 mt-0.5">
                              {fmt(totalC)}
                            </p>
                            <p className="text-xs text-gray-400">
                              {((totalC / total) * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 bg-red-400 rounded-sm" />
                              <span className="text-xs text-gray-500">
                                Debit
                              </span>
                            </div>
                            <p className="text-sm font-bold text-red-500 mt-0.5">
                              {fmt(totalD)}
                            </p>
                            <p className="text-xs text-gray-400">
                              {((totalD / total) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Chart */}
              <div className="p-6 bg-white shadow-sm rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">
                      Monthly Credit vs Debit
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      All-time trend · {monthlyData.length} month(s)
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 bg-brand-500 rounded-sm" />
                      <span className="text-xs text-gray-500">Credit</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 bg-red-400 rounded-sm" />
                      <span className="text-xs text-gray-500">Debit</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-blue-500 inline-block" />
                      <span className="text-xs text-gray-500">Net Balance</span>
                    </div>
                  </div>
                </div>

                {monthlyData.length === 0 ? (
                  <p className="py-16 text-center text-gray-400">
                    No data available
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <svg
                      width={svgW}
                      height={svgH}
                      style={{ minWidth: "100%" }}
                    >
                      {/* Y-axis grid + labels */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                        const y = PADDING_TOP + BAR_H * (1 - ratio);
                        return (
                          <g key={ratio}>
                            <line
                              x1={PADDING_L - 8}
                              y1={y}
                              x2={svgW - 10}
                              y2={y}
                              stroke={ratio === 0 ? "#e5e7eb" : "#f3f4f6"}
                              strokeWidth="1"
                            />
                            <text
                              x={PADDING_L - 12}
                              y={y + 4}
                              textAnchor="end"
                              fontSize="10"
                              fill="#9ca3af"
                            >
                              {ratio === 0
                                ? "0"
                                : `₹${((maxVal * ratio) / 1000).toFixed(0)}k`}
                            </text>
                          </g>
                        );
                      })}

                      {/* Bars */}
                      {monthlyData.map((m, i) => {
                        const x = PADDING_L + i * (groupW + GROUP_GAP);
                        const cH = Math.max(3, (m.credit / maxVal) * BAR_H);
                        const dH = Math.max(3, (m.debit / maxVal) * BAR_H);
                        const isHovered = hoveredMonth === i;
                        return (
                          <g
                            key={m.key}
                            onMouseEnter={() => setHoveredMonth(i)}
                            onMouseLeave={() => setHoveredMonth(null)}
                            style={{ cursor: "pointer" }}
                          >
                            {/* Hover highlight */}
                            {isHovered && (
                              <rect
                                x={x - 6}
                                y={PADDING_TOP}
                                width={groupW + 12}
                                height={BAR_H}
                                rx="6"
                                fill="#f9fafb"
                              />
                            )}
                            {/* Credit bar */}
                            <rect
                              x={x}
                              y={PADDING_TOP + BAR_H - cH}
                              width={BAR_W}
                              height={cH}
                              rx="5"
                              fill={isHovered ? "#16a34a" : "#22c55e"}
                              opacity="0.9"
                            />
                            {/* Debit bar */}
                            <rect
                              x={x + BAR_W + 6}
                              y={PADDING_TOP + BAR_H - dH}
                              width={BAR_W}
                              height={dH}
                              rx="5"
                              fill={isHovered ? "#dc2626" : "#f87171"}
                              opacity="0.9"
                            />
                            {/* Month label */}
                            <text
                              x={x + groupW / 2}
                              y={PADDING_TOP + BAR_H + 18}
                              textAnchor="middle"
                              fontSize="11"
                              fill={isHovered ? "#111827" : "#6b7280"}
                              fontWeight={isHovered ? "600" : "400"}
                            >
                              {m.label}
                            </text>
                            {/* Txn count */}
                            <text
                              x={x + groupW / 2}
                              y={PADDING_TOP + BAR_H + 32}
                              textAnchor="middle"
                              fontSize="9"
                              fill="#9ca3af"
                            >
                              {m.txns} txn
                            </text>
                          </g>
                        );
                      })}

                      {/* Net pending line */}
                      {monthlyData.length > 1 && (
                        <polyline
                          points={netPoints}
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2"
                          strokeDasharray="5,3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                      {/* Net dots */}
                      {monthlyData.map((m, i) => {
                        const cx =
                          PADDING_L + i * (groupW + GROUP_GAP) + groupW / 2;
                        const netClamped = Math.max(0, Math.min(m.net, maxVal));
                        const cy =
                          PADDING_TOP + BAR_H - (netClamped / maxVal) * BAR_H;
                        return (
                          <circle
                            key={m.key}
                            cx={cx}
                            cy={cy}
                            r="3.5"
                            fill="#3b82f6"
                            stroke="white"
                            strokeWidth="1.5"
                          />
                        );
                      })}
                    </svg>

                    {/* Hover tooltip */}
                    {hovered && (
                      <div className="flex flex-wrap items-center gap-6 px-5 py-4 mt-3 border bg-gray-50 rounded-xl">
                        <p className="text-sm font-semibold text-gray-700">
                          {hovered.label}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm bg-red-400" />
                          <span className="text-xs text-gray-500">Credit:</span>
                          <span className="text-sm font-semibold text-red-500">
                            {fmt(hovered.credit)}
                          </span>
                          {hovered.creditChange !== null && (
                            <span
                              className={`text-xs font-medium ${hovered.creditChange >= 0 ? "text-brand-500" : "text-red-500"}`}
                            >
                              {hovered.creditChange >= 0 ? "▲" : "▼"}
                              {Math.abs(hovered.creditChange).toFixed(1)}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm bg-brand-500" />
                          <span className="text-xs text-gray-500">Debit:</span>
                          <span className="text-sm font-semibold text-brand-600">
                            {fmt(hovered.debit)}
                          </span>
                          {hovered.debitChange !== null && (
                            <span
                              className={`text-xs font-medium ${hovered.debitChange >= 0 ? "text-red-500" : "text-brand-500"}`}
                            >
                              {hovered.debitChange >= 0 ? "▲" : "▼"}
                              {Math.abs(hovered.debitChange).toFixed(1)}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm bg-slate-400" />
                          <span className="text-xs text-gray-500">
                            Net Balance:
                          </span>
                          <span className="text-sm font-semibold text-slate-700">
                            {fmt(hovered.net)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500">
                            Transactions:
                          </span>
                          <span className="text-sm font-semibold text-gray-700">
                            {hovered.txns}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Monthly table */}
              <div className="overflow-x-auto bg-white shadow-sm rounded-xl">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Month</th>
                      <th className="px-4 py-3 text-right text-red-500">Credit</th>
                      <th className="px-4 py-3 text-right">MoM</th>
                      <th className="px-4 py-3 text-right text-brand-600">Debit</th>
                      <th className="px-4 py-3 text-right">MoM</th>
                      <th className="px-4 py-3 text-right">Net Balance</th>
                      <th className="px-4 py-3 text-center">Transactions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {monthlyData.map((m, i) => (
                      <tr
                        key={m.key}
                        onMouseEnter={() => setHoveredTableRow(i)}
                        onMouseLeave={() => setHoveredTableRow(null)}
                        className={`transition-colors cursor-default ${
                          hoveredTableRow === i
                            ? "bg-blue-50/40"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-700">
                          {m.label}
                        </td>
                        <td className="px-4 py-3 font-semibold text-right text-red-500">
                          {fmt(m.credit)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {m.creditChange !== null ? (
                            <span
                              className={`text-xs font-semibold ${m.creditChange >= 0 ? "text-brand-600" : "text-red-500"}`}
                            >
                              {m.creditChange >= 0 ? "▲" : "▼"}{" "}
                              {Math.abs(m.creditChange).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-right text-brand-600">
                          {fmt(m.debit)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {m.debitChange !== null ? (
                            <span
                              className={`text-xs font-semibold ${m.debitChange >= 0 ? "text-red-500" : "text-brand-600"}`}
                            >
                              {m.debitChange >= 0 ? "▲" : "▼"}{" "}
                              {Math.abs(m.debitChange).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-right text-slate-700">
                          {fmt(m.net)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                            {m.txns}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

      {/* MEMBER LEDGER DRAWER */}
      {selectedUser &&
        (() => {
          const userEntries = entries.filter(
            (e) => e.user?._id === selectedUser._id,
          );
          const uCredit = userEntries.reduce(
            (s, e) => s + (e.type === "CREDIT" ? Number(e.amount || 0) : 0),
            0,
          );
          const uDebit = userEntries.reduce(
            (s, e) => s + (e.type === "DEBIT" ? Number(e.amount || 0) : 0),
            0,
          );
          const uNet = uCredit - uDebit;
          const grouped = groupByMonth(userEntries);
          return (
            <div
              className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50"
              onClick={() => setSelectedUser(null)}
            >
              <div
                className="bg-white shadow-2xl flex flex-col rounded-2xl w-full max-w-xl max-h-[95vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* GRADIENT HEADER */}
                <div className="flex-shrink-0 px-6 pt-6 pb-10 bg-gradient-to-r from-brand-800 to-brand-600 rounded-t-2xl">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center text-xl font-bold text-white w-14 h-14 rounded-2xl bg-white/20">
                        {selectedUser.firstName?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-lg font-bold text-white">
                          {selectedUser.firstName} {selectedUser.lastName}
                        </p>
                        <p className="text-brand-200 text-sm mt-0.5">
                          +91 {selectedUser.phone}
                        </p>
                        <span className="mt-1 inline-block bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                          {selectedUser.role}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedUser(null);
                        setShowHistory(false);
                      }}
                      className="p-1 text-white/70 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* FLOATING SUMMARY CARDS */}
                <div className="flex-shrink-0 px-6 -mt-6 space-y-2 pb-2">
                  {(() => {
                    const totalCredit = userEntries.reduce(
                      (s, e) => s + (e.type === "CREDIT" ? Number(e.amount || 0) : 0), 0
                    );
                    const totalDebit = userEntries.reduce(
                      (s, e) => s + (e.type === "DEBIT" ? Number(e.amount || 0) : 0), 0
                    );
                    const net = totalCredit - totalDebit;
                    // group by referenceType
                    const byRef = {};
                    userEntries.forEach((e) => {
                      const key = `${e.type}__${e.referenceType || "OTHER"}`;
                      if (!byRef[key]) byRef[key] = { type: e.type, ref: e.referenceType || "OTHER", total: 0 };
                      byRef[key].total += Number(e.amount || 0);
                    });
                    return (
                      <>
                        {/* Summary row */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
                          <div className="grid grid-cols-3 divide-x divide-gray-100">
                            <div className="px-4 py-3 text-center">
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Credit</p>
                              <p className="text-base font-black text-green-600 mt-0.5">+{fmt(totalCredit)}</p>
                            </div>
                            <div className="px-4 py-3 text-center">
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Debit</p>
                              <p className="text-base font-black text-red-500 mt-0.5">-{fmt(totalDebit)}</p>
                            </div>
                            <div className="px-4 py-3 text-center">
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Net</p>
                              <p className={`text-base font-black mt-0.5 ${net >= 0 ? "text-green-600" : "text-red-500"}`}>
                                {net >= 0 ? "+" : "-"}{fmt(Math.abs(net))}
                              </p>
                            </div>
                          </div>
                        </div>
                        {/* Breakdown by type + referenceType */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
                          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Breakdown by Reference</p>
                          </div>
                          <div className="divide-y divide-gray-50">
                            {Object.values(byRef).map(({ type, ref, total }) => (
                              <div key={`${type}-${ref}`} className="flex items-center justify-between px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${type === "CREDIT" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                    {type}
                                  </span>
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TYPE_COLORS[ref] || "bg-gray-100 text-gray-500"}`}>
                                    {ref}
                                  </span>
                                </div>
                                <p className={`text-sm font-bold ${type === "CREDIT" ? "text-green-600" : "text-red-500"}`}>
                                  {type === "CREDIT" ? "+" : "-"}{fmt(total)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Net bar */}
                        <div className={`rounded-2xl px-5 py-3 flex items-center justify-between ${net >= 0 ? "bg-green-600" : "bg-red-500"}`}>
                          <div>
                            <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">Net Balance</p>
                            <p className="text-xs text-white/60 mt-0.5">{userEntries.length} transactions</p>
                          </div>
                          <p className="text-xl font-black text-white">{net >= 0 ? "+" : "-"}{fmt(Math.abs(net))}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>



                {/* TRANSACTION HISTORY TOGGLE */}
                <div className="flex-shrink-0 px-6 pt-4 pb-3">
                  <button
                    onClick={() => setShowHistory((h) => !h)}
                    className="flex items-center justify-between w-full px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <BookOpen className="w-4 h-4" />
                      Transaction History
                      <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">
                        {userEntries.length}
                      </span>
                    </span>
                    {showHistory ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  {showHistory && (
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={() => exportCSV(userEntries)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-brand-600 text-brand-600 rounded-lg hover:bg-brand-50 text-xs font-medium"
                      >
                        <Download className="w-3.5 h-3.5" /> Export
                      </button>
                    </div>
                  )}
                </div>

                {/* TIMELINE grouped by month */}
                {showHistory && (
                  <div className="px-6 pb-6">
                    {userEntries.length === 0 && (
                      <div className="py-16 text-center text-gray-400">
                        <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p>No transactions found</p>
                      </div>
                    )}
                    {Object.entries(grouped).map(([month, monthEntries]) => (
                      <div key={month} className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                            {month}
                          </span>
                          <div className="flex-1 h-px bg-gray-200" />
                          <span className="text-xs text-gray-400">
                            {monthEntries.length} txn
                          </span>
                        </div>
                        <div className="space-y-2">
                          {monthEntries.map((e, i) => {
                            const ref = e.referenceType;
                            const isCredit = e.type === "CREDIT";
                            const typeCls = isCredit ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700";
                            return (
                              <div
                                key={e._id || i}
                                className={`flex items-center justify-between rounded-xl px-4 py-3 border transition ${isCredit ? "bg-green-50/40 border-green-100" : "bg-red-50/40 border-red-100"}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isCredit ? "bg-green-100" : "bg-red-100"}`}>
                                    {isCredit
                                      ? <TrendingUp className="w-4 h-4 text-green-600" />
                                      : <TrendingDown className="w-4 h-4 text-red-500" />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${typeCls}`}>{e.type}</span>
                                      {ref && (
                                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TYPE_COLORS[ref] || "bg-gray-100 text-gray-500"}`}>{ref}</span>
                                      )}
                                    </div>
                                    <p className="mt-0.5 text-xs text-gray-400">{fmtDate(e.createdAt)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className={`font-bold text-sm ${isCredit ? "text-green-600" : "text-red-500"}`}>
                                    {isCredit ? "+" : "-"}{fmt(e.amount)}
                                  </p>
                                  {ref === "SALE" && e.type === "DEBIT" && (
                                    <button
                                      onClick={() => {
                                        setSelectedUser(null);
                                        setShowHistory(false);
                                        navigate("/buy", { state: { orderId: e.referenceId || e._id } });
                                      }}
                                      className="text-xs px-2 py-0.5 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 font-semibold transition"
                                    >
                                      View Order
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl">
          <svg
            className="w-5 h-5 text-brand-400 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <p className="text-sm font-medium">{toast.msg}</p>
          <button onClick={() => setToast(null)}>
            <X className="w-4 h-4 text-white/60 hover:text-white" />
          </button>
        </div>
      )}

    </div>
  );
}

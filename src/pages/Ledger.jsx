import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import theme from "../config/theme";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAllLedgers,
  fetchLedgerByType,
} from "../store/thunks/ledgerThunk";
import { fetchParties } from "../store/thunks/partyThunk";
import { fetchMembers } from "../store/thunks/membersThunk";
import {
  BookOpen,
  Search,
  Download,
  X,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  AlertCircle,
  Calendar,
  Phone,
  UserCheck,
  Tag,
  Hash,
  Clock,
  Filter,
  FileText,
  Printer,
  Building2,
  User,
  MapPin,
  TrendingUp,
  TrendingDown,
  Wallet,
  ChevronDown,
} from "lucide-react";

// Centralized Type Configuration with icons and color tokens
const TYPE_CONFIG = {
  PROCUREMENT: {
    label: "Procurement",
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
    icon: TrendingUp,
  },
  PROCUREMENT_PAYMENT: {
    label: "Procurement Payment",
    badge: "bg-purple-50 text-purple-700 border border-purple-200",
    icon: Wallet,
  },
  SALE: {
    label: "Sale",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon: TrendingDown,
  },
  PURCHASE: {
    label: "Purchase",
    badge: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    icon: TrendingUp,
  },
  PAYMENT: {
    label: "Payment",
    badge: "bg-teal-50 text-teal-700 border border-teal-200",
    icon: Wallet,
  },
  PAYMENT_IN: {
    label: "Payment In",
    badge: "bg-teal-50 text-teal-700 border border-teal-200",
    icon: Wallet,
  },
  PAYMENT_OUT: {
    label: "Payment Out",
    badge: "bg-rose-50 text-rose-700 border border-rose-200",
    icon: Wallet,
  },
  PAYMENT_IN_AUTO: {
    label: "Auto Payment",
    badge: "bg-cyan-50 text-cyan-700 border border-cyan-200",
    icon: Wallet,
  },
  REFUND: {
    label: "Refund",
    badge: "bg-orange-50 text-orange-700 border border-orange-200",
    icon: RefreshCw,
  },
  ADJUSTMENT: {
    label: "Adjustment",
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: Tag,
  },
};

const REFERENCE_TYPES = [
  { value: "ALL", label: "All Reference Types" },
  { value: "PROCUREMENT", label: "Procurement" },
  { value: "PROCUREMENT_PAYMENT", label: "Procurement Payment" },
  { value: "SALE", label: "Sale" },
  { value: "PURCHASE", label: "Purchase" },
  { value: "PAYMENT", label: "Payment" },
  { value: "PAYMENT_IN", label: "Payment In" },
  { value: "PAYMENT_OUT", label: "Payment Out" },
  { value: "PAYMENT_IN_AUTO", label: "Auto Payment" },
  { value: "REFUND", label: "Refund" },
  { value: "ADJUSTMENT", label: "Adjustment" },
];

const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
const fmtDateTime = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime()) || d.getFullYear() < 2000) return "—";
  return d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};
const fmtDateOnly = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime()) || d.getFullYear() < 2000) return "—";
  return d.toLocaleDateString("en-IN");
};

/**
 * Formats reference numbers cleanly.
 * If referenceId is a 24-character hexadecimal MongoDB ObjectId (e.g., '6a55c486e751ee8edb50d8b6'),
 * formats it as a clean ERP reference badge: '#50D8B6' (with full ID shown on hover).
 */
const formatRefNo = (entry) => {
  if (!entry) return "—";
  const explicitNo =
    entry.voucherNumber ||
    entry.invoiceNumber ||
    entry.billNumber ||
    entry.billNo ||
    entry.referenceNo ||
    entry.orderNo;
  if (explicitNo) return String(explicitNo);

  const refId = String(entry.referenceId || "");
  if (!refId) return "—";

  if (/^[0-9a-fA-F]{24}$/.test(refId)) {
    return `#${refId.slice(-8).toUpperCase()}`;
  }

  return refId;
};

const ITEMS_PER_PAGE = 12;

const getInitials = (name) => {
  if (!name || name === "Deleted Party") return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Resolver helper to resolve entry.party or entry.user to human-readable details
 * using strictly backend records and party/member map O(1) lookup.
 */
const getPartyOrUser = (entry, partyMap = {}) => {
  if (!entry) {
    return {
      _id: "unknown",
      name: "Deleted Party",
      phone: "—",
      role: "Unknown",
      initials: "?",
      raw: null,
      isDeleted: true,
    };
  }

  // 1. Populated party object
  if (entry.party && typeof entry.party === "object") {
    const p = entry.party;
    const name =
      p.partyName ||
      p.name ||
      `${p.firstName || ""} ${p.lastName || ""}`.trim();
    const phone = p.phone || p.mobile || p.phoneNumber || "—";
    const role = p.partyType || p.role || p.type || "Party";
    const id = p._id || p.id || entry.party;
    if (name) {
      return {
        _id: String(id),
        name,
        phone,
        role,
        initials: getInitials(name),
        raw: p,
        isDeleted: false,
      };
    }
  }

  // 2. Unpopulated party ObjectId
  if (
    entry.party &&
    (typeof entry.party === "string" || typeof entry.party === "number")
  ) {
    const partyIdStr = String(entry.party);
    const matched = partyMap[partyIdStr];
    if (matched) {
      const name =
        matched.partyName ||
        matched.name ||
        `${matched.firstName || ""} ${matched.lastName || ""}`.trim();
      const phone =
        matched.phone || matched.mobile || matched.phoneNumber || "—";
      const role =
        matched.partyType || matched.role || matched.type || "Party";
      if (name) {
        return {
          _id: partyIdStr,
          name,
          phone,
          role,
          initials: getInitials(name),
          raw: matched,
          isDeleted: false,
        };
      }
    }
  }

  // 3. Populated user object
  if (entry.user && typeof entry.user === "object") {
    const u = entry.user;
    const name =
      `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
      u.name ||
      u.partyName;
    const phone = u.phone || u.mobile || u.phoneNumber || "—";
    const role = u.role || u.partyType || u.type || "User";
    const id = u._id || u.id || entry.user;
    if (name) {
      return {
        _id: String(id),
        name,
        phone,
        role,
        initials: getInitials(name),
        raw: u,
        isDeleted: false,
      };
    }
  }

  // 4. Unpopulated user ObjectId
  if (
    entry.user &&
    (typeof entry.user === "string" || typeof entry.user === "number")
  ) {
    const userIdStr = String(entry.user);
    const matched = partyMap[userIdStr];
    if (matched) {
      const name =
        matched.partyName ||
        matched.name ||
        `${matched.firstName || ""} ${matched.lastName || ""}`.trim();
      const phone =
        matched.phone || matched.mobile || matched.phoneNumber || "—";
      const role = matched.role || matched.partyType || matched.type || "User";
      if (name) {
        return {
          _id: userIdStr,
          name,
          phone,
          role,
          initials: getInitials(name),
          raw: matched,
          isDeleted: false,
        };
      }
    }
  }

  const fallbackId = entry.party
    ? String(entry.party)
    : entry.user
      ? String(entry.user)
      : entry._id || "unknown";
  return {
    _id: fallbackId,
    name: "Deleted Party",
    phone: "—",
    role: "Unknown",
    initials: "?",
    raw: null,
    isDeleted: true,
  };
};

/**
 * Custom Searchable Combobox Component
 * Replaces raw HTML <select> dropdowns with a sleek, searchable, ERP-style combobox.
 */
const SearchableSelect = ({
  options = [],
  value = "",
  onChange,
  placeholder = "Select or search...",
  label = "",
  icon: Icon = User,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = useMemo(() => {
    return options.find((opt) => String(opt.id) === String(value));
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const q = searchTerm.toLowerCase().trim();
    return options.filter(
      (opt) =>
        (opt.name || "").toLowerCase().includes(q) ||
        (opt.phone || "").includes(q) ||
        (opt.subtext || "").toLowerCase().includes(q) ||
        (opt.badge || "").toLowerCase().includes(q),
    );
  }, [options, searchTerm]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && (
        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-brand-600" />
          {label}
        </label>
      )}

      {selectedOption && !isOpen ? (
        <div className="flex items-center justify-between bg-brand-50/70 border border-brand-200 rounded-xl px-3 py-2 text-xs shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-full bg-brand-600 text-white font-black text-[10px] flex items-center justify-center flex-shrink-0">
              {selectedOption.initials || "?"}
            </div>
            <div className="min-w-0 truncate">
              <span className="font-bold text-gray-900 truncate">
                {selectedOption.name}
              </span>
              {selectedOption.subtext && (
                <span className="text-gray-500 text-[11px] ml-1.5">
                  ({selectedOption.subtext})
                </span>
              )}
              {selectedOption.phone &&
                selectedOption.phone !== "—" &&
                !selectedOption.name.includes(selectedOption.phone) && (
                  <span className="text-gray-500 text-[11px] font-mono ml-1.5">
                    · {selectedOption.phone}
                  </span>
                )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange("");
              setSearchTerm("");
              setIsOpen(true);
            }}
            className="p-1 hover:bg-brand-100 text-brand-700 rounded-lg transition ml-2 flex-shrink-0"
            title="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            className="w-full py-2.5 pr-8 text-xs bg-gray-50 border border-gray-200 rounded-xl pl-9 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 font-medium text-gray-900"
          />
          {searchTerm ? (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          )}
        </div>
      )}

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-gray-50">
          {filteredOptions.length === 0 ? (
            <div className="py-4 text-center text-gray-400 text-xs">
              No matching records found
            </div>
          ) : (
            filteredOptions.map((opt) => (
              <div
                key={opt.id}
                onClick={() => {
                  onChange(opt.id);
                  setIsOpen(false);
                  setSearchTerm("");
                }}
                className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer hover:bg-brand-50/70 transition-colors text-xs ${
                  String(value) === String(opt.id) ? "bg-brand-50 font-bold" : ""
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0 border border-gray-200">
                    {opt.initials || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {opt.name}
                    </p>
                    {(opt.subtext ||
                      (opt.phone &&
                        opt.phone !== "—" &&
                        !opt.name.includes(opt.phone))) && (
                      <p className="text-[10px] text-gray-500 truncate">
                        {opt.subtext ? (
                          <span>
                            {opt.subtext}{" "}
                            {opt.phone &&
                            opt.phone !== "—" &&
                            !opt.name.includes(opt.phone)
                              ? `· ${opt.phone}`
                              : ""}
                          </span>
                        ) : (
                          opt.phone &&
                          opt.phone !== "—" &&
                          !opt.name.includes(opt.phone) && (
                            <span className="font-mono">{opt.phone}</span>
                          )
                        )}
                      </p>
                    )}
                  </div>
                </div>
                {opt.badge && (
                  <span className="px-2 py-0.5 text-[9px] font-semibold bg-gray-100 text-gray-600 rounded-md flex-shrink-0 ml-2 border border-gray-200">
                    {opt.badge}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Compact ERP Date Range Picker Component
 * - Ultra-compact, elegant layout.
 * - Clickable anywhere: clicking anywhere on the date pill opens the date picker calendar immediately.
 */
const DateRangePicker = ({
  fromDate,
  toDate,
  onFromChange,
  onToChange,
  label = "Date Range",
}) => {
  const fromRef = useRef(null);
  const toRef = useRef(null);

  const handlePreset = (type) => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    if (type === "TODAY") {
      onFromChange(todayStr);
      onToChange(todayStr);
    } else if (type === "THIS_MONTH") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      onFromChange(firstDay.toISOString().split("T")[0]);
      onToChange(todayStr);
    } else if (type === "LAST_30") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      onFromChange(d.toISOString().split("T")[0]);
      onToChange(todayStr);
    } else if (type === "ALL") {
      onFromChange("");
      onToChange("");
    }
  };

  const openPicker = (ref) => {
    if (ref.current) {
      try {
        if (typeof ref.current.showPicker === "function") {
          ref.current.showPicker();
        } else {
          ref.current.focus();
        }
      } catch (err) {
        ref.current.focus();
      }
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
        <Calendar className="w-3.5 h-3.5 text-brand-600" />
        {label}:
      </span>

      {/* Date Range Inputs Box - Compact & Clickable Anywhere */}
      <div className="flex items-center gap-1.5 bg-gray-50 p-1 border border-gray-200 rounded-xl shadow-2xs">
        {/* From Date Pill */}
        <div
          onClick={() => openPicker(fromRef)}
          className="relative flex items-center bg-white border border-gray-200 rounded-lg px-2.5 py-1 cursor-pointer hover:border-brand-400 hover:bg-brand-50/40 transition group"
        >
          <input
            ref={fromRef}
            type="date"
            value={fromDate}
            onChange={(e) => onFromChange(e.target.value)}
            className="w-full text-xs font-semibold text-gray-800 bg-transparent focus:outline-none cursor-pointer"
          />
        </div>

        <span className="text-gray-400 font-bold text-[10px] px-0.5">→</span>

        {/* To Date Pill */}
        <div
          onClick={() => openPicker(toRef)}
          className="relative flex items-center bg-white border border-gray-200 rounded-lg px-2.5 py-1 cursor-pointer hover:border-brand-400 hover:bg-brand-50/40 transition group"
        >
          <input
            ref={toRef}
            type="date"
            value={toDate}
            onChange={(e) => onToChange(e.target.value)}
            className="w-full text-xs font-semibold text-gray-800 bg-transparent focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* Quick Presets */}
      <div className="flex items-center gap-1 text-[10px] bg-gray-100 p-1 rounded-lg border border-gray-200">
        <button
          type="button"
          onClick={() => handlePreset("TODAY")}
          className="px-1.5 py-0.5 rounded text-gray-600 hover:text-brand-700 hover:bg-white font-medium transition"
        >
          Today
        </button>
        <span className="text-gray-300">·</span>
        <button
          type="button"
          onClick={() => handlePreset("THIS_MONTH")}
          className="px-1.5 py-0.5 rounded text-gray-600 hover:text-brand-700 hover:bg-white font-medium transition"
        >
          This Month
        </button>
        <span className="text-gray-300">·</span>
        <button
          type="button"
          onClick={() => handlePreset("LAST_30")}
          className="px-1.5 py-0.5 rounded text-gray-600 hover:text-brand-700 hover:bg-white font-medium transition"
        >
          30 Days
        </button>
        {(fromDate || toDate) && (
          <>
            <span className="text-gray-300">·</span>
            <button
              type="button"
              onClick={() => handlePreset("ALL")}
              className="px-1.5 py-0.5 rounded text-red-600 hover:bg-white font-bold transition"
            >
              Clear
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// Export CSV Helper
const exportCSV = (data, filenamePrefix = "ledger") => {
  const headers = [
    "Date",
    "Party / Farmer Name",
    "Phone",
    "Role",
    "Type",
    "Reference Type",
    "Amount",
    "Reference Number",
    "Raw Reference ID",
  ];
  const rows = data.map((e) => [
    new Date(e.createdAt).toLocaleDateString("en-IN"),
    e.partyOrUser?.name || "Deleted Party",
    e.partyOrUser?.phone || "—",
    e.partyOrUser?.role || "—",
    e.type || "",
    e.referenceType || "",
    e.amount || 0,
    formatRefNo(e),
    e.referenceId || "",
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenamePrefix}_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// Print PDF Statement for Party / Farmer
const printStatementPdf = async (title, entityName, entityDetails, txns) => {
  try {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString("en-IN");

    // Header bar
    doc.setFillColor(22, 163, 74);
    doc.rect(0, 0, 210, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`${theme.brand} - ERP Ledger`, 14, 12);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(title, 14, 20);
    doc.text("Date: " + dateStr, 196, 20, { align: "right" });

    // Entity Info
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(entityName, 14, 38);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(entityDetails, 14, 45);

    // Table
    const sortedTxns = [...txns].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    );

    autoTable(doc, {
      startY: 55,
      head: [["#", "Date", "Reference Type", "Reference Number", "Type", "Amount"]],
      body: sortedTxns.map((e, i) => [
        i + 1,
        new Date(e.createdAt).toLocaleDateString("en-IN"),
        e.referenceType || "—",
        formatRefNo(e),
        e.type || "—",
        (e.type === "CREDIT" ? "+" : "-") +
          "Rs. " +
          Number(e.amount || 0).toLocaleString("en-IN"),
      ]),
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 5: { halign: "right" } },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 4) {
          data.cell.styles.textColor =
            data.cell.raw === "CREDIT" ? [22, 163, 74] : [220, 38, 38];
          data.cell.styles.fontStyle = "bold";
        }
        if (data.section === "body" && data.column.index === 5) {
          data.cell.styles.textColor =
            data.row.raw[4] === "CREDIT" ? [22, 163, 74] : [220, 38, 38];
          data.cell.styles.fontStyle = "bold";
        }
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });

    const pageH = doc.internal.pageSize.height;
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated by ${theme.brand} ERP System`, 14, pageH - 8);
    doc.text(new Date().toLocaleString("en-IN"), 196, pageH - 8, {
      align: "right",
    });

    doc.save(
      `Statement_${entityName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`,
    );
  } catch (err) {
    console.error("PDF generation failed:", err);
    alert("Failed to generate statement PDF.");
  }
};

const SortIcon = ({ field, sortField, sortDir }) => {
  if (sortField !== field)
    return <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-30" />;
  return sortDir === "asc" ? (
    <ArrowUp className="inline w-3 h-3 ml-1 text-brand-600" />
  ) : (
    <ArrowDown className="inline w-3 h-3 ml-1 text-brand-600" />
  );
};

export default function Ledger() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();

  // Active Workspace Tab: 'transactions' | 'party' | 'farmer'
  const [activeWorkspace, setActiveWorkspace] = useState("transactions");

  // Sync workspace and filters with URL search parameters
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const refTypeParam = searchParams.get("refType");

    if (tabParam === "party") {
      setActiveWorkspace("party");
    } else if (tabParam === "farmer") {
      setActiveWorkspace("farmer");
    } else if (tabParam === "transactions" || (!tabParam && !refTypeParam)) {
      setActiveWorkspace("transactions");
    }

    if (refTypeParam) {
      setActiveWorkspace("transactions");
      setTxnRefType(refTypeParam.toUpperCase());
    }
  }, [searchParams]);

  // Redux Selectors
  const {
    entries: rawEntries = [],
    loading: ledgerLoading,
    error: ledgerError,
  } = useSelector((s) => s.ledger || {});
  const entries = Array.isArray(rawEntries) ? rawEntries : [];

  const { parties: rawParties = [] } = useSelector((s) => s.party || {});
  const parties = Array.isArray(rawParties) ? rawParties : [];

  const { members: rawMembers = [] } = useSelector((s) => s.members || {});
  const members = Array.isArray(rawMembers) ? rawMembers : [];

  // Load Data on Mount
  const loadData = useCallback(() => {
    dispatch(fetchAllLedgers());
    dispatch(fetchParties());
    dispatch(fetchMembers());
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Combined Party & Member Lookup Map O(1)
  const partyMap = useMemo(() => {
    const map = {};
    parties.forEach((p) => {
      if (p && p._id) map[String(p._id)] = p;
      if (p && p.id) map[String(p.id)] = p;
    });
    members.forEach((m) => {
      if (m && m._id) map[String(m._id)] = m;
      if (m && m.id) map[String(m.id)] = m;
    });
    return map;
  }, [parties, members]);

  // Derive Farmers List
  const farmerList = useMemo(() => {
    const map = new Map();
    members.forEach((m) => {
      const id = String(m._id || m.id);
      if (id) map.set(id, m);
    });
    parties.forEach((p) => {
      const id = String(p._id || p.id);
      if (id && !map.has(id)) {
        const type = (p.partyType || p.role || "").toUpperCase();
        if (type === "FARMER" || type === "MEMBER" || p.memberId) {
          map.set(id, p);
        }
      }
    });
    return Array.from(map.values());
  }, [members, parties]);

  // Derive Party List
  const partyList = useMemo(() => {
    return parties.filter((p) => {
      const type = (p.partyType || p.role || "").toUpperCase();
      return type !== "FARMER" && type !== "MEMBER";
    });
  }, [parties]);

  // Options for SearchableCombobox
  const farmerOptions = useMemo(() => {
    return farmerList.map((f) => {
      const rawName = (f.partyName || f.name || `${f.firstName || ""} ${f.lastName || ""}`).trim();
      const phone = f.phone || f.mobile || "";
      const name = rawName || (phone ? `Farmer (${phone})` : `Farmer #${String(f._id || f.id).slice(-6)}`);
      const village = f.village || f.district || "";
      const memberId = f.memberId ? `ID: ${f.memberId}` : "";
      const subtext = [memberId, village].filter(Boolean).join(" · ");

      return {
        id: String(f._id || f.id),
        name,
        phone: phone || "—",
        subtext,
        badge: "Farmer",
        initials: getInitials(rawName || "Farmer"),
        raw: f,
      };
    });
  }, [farmerList]);

  const partyOptions = useMemo(() => {
    return partyList.map((p) => {
      const rawName = (p.partyName || p.name || `${p.firstName || ""} ${p.lastName || ""}`).trim();
      const phone = p.phone || p.mobile || "";
      const name = rawName || (phone ? `Party (${phone})` : `Party #${String(p._id || p.id).slice(-6)}`);
      const type = p.partyType || p.role || "Party";

      return {
        id: String(p._id || p.id),
        name,
        phone: phone || "—",
        subtext: p.gstin ? `GST: ${p.gstin}` : "",
        badge: type,
        initials: getInitials(rawName || "Party"),
        raw: p,
      };
    });
  }, [partyList]);

  // Pre-resolved Transactions
  const resolvedTransactions = useMemo(() => {
    return entries.map((entry) => ({
      ...entry,
      partyOrUser: getPartyOrUser(entry, partyMap),
    }));
  }, [entries, partyMap]);

  // ---------------------------------------------------------------------------
  // WORKSPACE 1: TRANSACTIONS PAGE STATE
  // ---------------------------------------------------------------------------
  const [txnSearch, setTxnSearch] = useState("");
  const [txnRefType, setTxnRefType] = useState("ALL");
  const [txnEntryType, setTxnEntryType] = useState("ALL");
  const [txnPartyFilter, setTxnPartyFilter] = useState("ALL");
  const [txnFromDate, setTxnFromDate] = useState("");
  const [txnToDate, setTxnToDate] = useState("");
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("desc");
    }
    setCurrentPage(1);
  };

  const filteredTransactions = useMemo(() => {
    let result = resolvedTransactions.filter((e) => {
      const puName = (e.partyOrUser?.name || "").toLowerCase();
      const puPhone = String(e.partyOrUser?.phone || "");
      const refId = String(e.referenceId || "").toLowerCase();
      const formattedRef = formatRefNo(e).toLowerCase();
      const refType = String(e.referenceType || "").toLowerCase();
      const q = txnSearch.trim().toLowerCase();

      const matchSearch =
        !q ||
        puName.includes(q) ||
        puPhone.includes(q) ||
        refId.includes(q) ||
        formattedRef.includes(q) ||
        refType.includes(q);

      const matchRefType =
        txnRefType === "ALL" || e.referenceType === txnRefType;
      const matchType = txnEntryType === "ALL" || e.type === txnEntryType;
      const matchParty =
        txnPartyFilter === "ALL" || e.partyOrUser?._id === txnPartyFilter;

      const entryDate = new Date(e.createdAt);
      const matchFrom = !txnFromDate || entryDate >= new Date(txnFromDate);
      const matchTo =
        !txnToDate || entryDate <= new Date(txnToDate + "T23:59:59");

      return (
        matchSearch &&
        matchRefType &&
        matchType &&
        matchParty &&
        matchFrom &&
        matchTo
      );
    });

    result = [...result].sort((a, b) => {
      if (sortField === "date") {
        const diff = new Date(a.createdAt) - new Date(b.createdAt);
        return sortDir === "asc" ? diff : -diff;
      }
      if (sortField === "amount") {
        const diff = Number(a.amount || 0) - Number(b.amount || 0);
        return sortDir === "asc" ? diff : -diff;
      }
      return 0;
    });

    return result;
  }, [
    resolvedTransactions,
    txnSearch,
    txnRefType,
    txnEntryType,
    txnPartyFilter,
    txnFromDate,
    txnToDate,
    sortField,
    sortDir,
  ]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTransactions = filteredTransactions.slice(
    start,
    start + ITEMS_PER_PAGE,
  );

  const resetTxnFilters = () => {
    setTxnSearch("");
    setTxnRefType("ALL");
    setTxnEntryType("ALL");
    setTxnPartyFilter("ALL");
    setTxnFromDate("");
    setTxnToDate("");
    setCurrentPage(1);
  };

  // ---------------------------------------------------------------------------
  // WORKSPACE 2: PARTY LEDGER STATE
  // ---------------------------------------------------------------------------
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [partyRefFilter, setPartyRefFilter] = useState("ALL");
  const [partyFromDate, setPartyFromDate] = useState("");
  const [partyToDate, setPartyToDate] = useState("");

  const selectedPartyObj = useMemo(() => {
    if (!selectedPartyId) return null;
    return (
      partyMap[selectedPartyId] ||
      parties.find((p) => String(p._id || p.id) === selectedPartyId) ||
      null
    );
  }, [selectedPartyId, partyMap, parties]);

  const partyTransactions = useMemo(() => {
    if (!selectedPartyId) return [];
    return resolvedTransactions.filter(
      (e) => e.partyOrUser?._id === selectedPartyId,
    );
  }, [resolvedTransactions, selectedPartyId]);

  const filteredPartyTxns = useMemo(() => {
    return partyTransactions.filter((e) => {
      const matchRef =
        partyRefFilter === "ALL" || e.referenceType === partyRefFilter;
      const entryDate = new Date(e.createdAt);
      const matchFrom = !partyFromDate || entryDate >= new Date(partyFromDate);
      const matchTo =
        !partyToDate || entryDate <= new Date(partyToDate + "T23:59:59");
      return matchRef && matchFrom && matchTo;
    });
  }, [partyTransactions, partyRefFilter, partyFromDate, partyToDate]);

  // ---------------------------------------------------------------------------
  // WORKSPACE 3: FARMER LEDGER STATE
  // ---------------------------------------------------------------------------
  const [selectedFarmerId, setSelectedFarmerId] = useState("");
  const [farmerRefFilter, setFarmerRefFilter] = useState("ALL");
  const [farmerFromDate, setFarmerFromDate] = useState("");
  const [farmerToDate, setFarmerToDate] = useState("");

  const selectedFarmerObj = useMemo(() => {
    if (!selectedFarmerId) return null;
    return (
      partyMap[selectedFarmerId] ||
      farmerList.find((f) => String(f._id || f.id) === selectedFarmerId) ||
      null
    );
  }, [selectedFarmerId, partyMap, farmerList]);

  const farmerTransactions = useMemo(() => {
    if (!selectedFarmerId) return [];
    return resolvedTransactions.filter(
      (e) => e.partyOrUser?._id === selectedFarmerId,
    );
  }, [resolvedTransactions, selectedFarmerId]);

  const filteredFarmerTxns = useMemo(() => {
    return farmerTransactions.filter((e) => {
      const matchRef =
        farmerRefFilter === "ALL" || e.referenceType === farmerRefFilter;
      const entryDate = new Date(e.createdAt);
      const matchFrom =
        !farmerFromDate || entryDate >= new Date(farmerFromDate);
      const matchTo =
        !farmerToDate || entryDate <= new Date(farmerToDate + "T23:59:59");
      return matchRef && matchFrom && matchTo;
    });
  }, [farmerTransactions, farmerRefFilter, farmerFromDate, farmerToDate]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-4 font-sans text-gray-900">
      {/* SEGMENTED NAVIGATION TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Ledger Workspace
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Enterprise ERP Accounting & Transaction Statements
          </p>
        </div>

        {/* Workspace Segmented Tabs */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl border border-gray-200">
          {[
            { id: "transactions", label: "Transactions", icon: BookOpen },
            { id: "party", label: "Party Ledger", icon: Building2 },
            { id: "farmer", label: "Farmer Ledger", icon: User },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveWorkspace(id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeWorkspace === id
                  ? "bg-white text-brand-700 shadow-xs border border-gray-200"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 1. TRANSACTIONS WORKSPACE */}
      {/* ------------------------------------------------------------------- */}
      {activeWorkspace === "transactions" && (
        <div className="space-y-4">
          {/* Workspace Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-800">
                Ledger Transactions
              </h2>
              <span className="bg-brand-50 text-brand-700 font-semibold px-2 py-0.5 rounded-full text-xs border border-brand-200">
                {entries.length} recorded
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                disabled={ledgerLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition shadow-xs disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${ledgerLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
              <button
                onClick={() =>
                  exportCSV(filteredTransactions, "all_transactions")
                }
                disabled={filteredTransactions.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition shadow-xs disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" /> Filter Ledger Entries
              </span>
              {(txnSearch ||
                txnRefType !== "ALL" ||
                txnEntryType !== "ALL" ||
                txnPartyFilter !== "ALL" ||
                txnFromDate ||
                txnToDate) && (
                <button
                  onClick={resetTxnFilters}
                  className="text-xs text-red-600 hover:underline font-semibold flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Reset Filters
                </button>
              )}
            </div>

            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
              {/* Search Input */}
              <div className="lg:col-span-4 space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-gray-400" /> Search
                </label>
                <div className="relative">
                  <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
                  <input
                    type="text"
                    placeholder="Search party, phone, reference..."
                    value={txnSearch}
                    onChange={(e) => {
                      setTxnSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full py-2.5 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-xl pl-9 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 font-medium text-gray-900"
                  />
                </div>
              </div>

              {/* Party / Farmer Filter using SearchableSelect */}
              <div className="lg:col-span-3">
                <SearchableSelect
                  options={[
                    { id: "ALL", name: "All Parties & Farmers", phone: "—", badge: "ALL", initials: "ALL" },
                    ...farmerOptions,
                    ...partyOptions,
                  ]}
                  value={txnPartyFilter}
                  onChange={(val) => {
                    setTxnPartyFilter(val);
                    setCurrentPage(1);
                  }}
                  placeholder="Filter by party or farmer..."
                  label="Party / Farmer"
                  icon={User}
                />
              </div>

              {/* Reference Type Filter */}
              <div className="lg:col-span-3 space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-gray-400" /> Reference Type
                </label>
                <select
                  value={txnRefType}
                  onChange={(e) => {
                    setTxnRefType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full py-2.5 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 text-gray-700 font-medium"
                >
                  {REFERENCE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Filter (Credit / Debit) */}
              <div className="lg:col-span-2 space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-gray-400" /> Type
                </label>
                <select
                  value={txnEntryType}
                  onChange={(e) => {
                    setTxnEntryType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full py-2.5 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 text-gray-700 font-medium"
                >
                  <option value="ALL">All Credit / Debit</option>
                  <option value="CREDIT">CREDIT</option>
                  <option value="DEBIT">DEBIT</option>
                </select>
              </div>

              {/* Compact & Clickable Anywhere Date Range Picker */}
              <div className="lg:col-span-12 pt-2 border-t border-gray-100">
                <DateRangePicker
                  fromDate={txnFromDate}
                  toDate={txnToDate}
                  onFromChange={(val) => {
                    setTxnFromDate(val);
                    setCurrentPage(1);
                  }}
                  onToChange={(val) => {
                    setTxnToDate(val);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Transactions Table Container */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
            {ledgerLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse flex items-center justify-between py-2"
                  >
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/6" />
                    <div className="h-4 bg-gray-200 rounded w-1/6" />
                    <div className="h-4 bg-gray-200 rounded w-1/8" />
                  </div>
                ))}
              </div>
            ) : ledgerError ? (
              <div className="p-12 text-center text-red-600 space-y-2">
                <AlertCircle className="w-10 h-10 mx-auto text-red-500" />
                <p className="font-bold text-sm">Unable to load ledger data</p>
                <p className="text-xs text-gray-500">{ledgerError}</p>
                <button
                  onClick={loadData}
                  className="mt-2 px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition"
                >
                  Retry
                </button>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="py-16 text-center text-gray-500 space-y-2">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="font-bold text-sm">No ledger transactions found</p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  No records match your selected filters or database contains
                  no entry.
                </p>
                <button
                  onClick={loadData}
                  className="mt-2 px-4 py-2 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-xl hover:bg-brand-100 transition"
                >
                  Refresh Data
                </button>
              </div>
            ) : (
              <>
                {/* Desktop ERP Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider sticky top-0">
                      <tr>
                        <th
                          className="px-4 py-3 cursor-pointer select-none"
                          onClick={() => handleSort("date")}
                        >
                          Date{" "}
                          <SortIcon
                            field="date"
                            sortField={sortField}
                            sortDir={sortDir}
                          />
                        </th>
                        <th className="px-4 py-3">Party / Farmer</th>
                        <th className="px-4 py-3">Phone</th>
                        <th className="px-4 py-3">Reference Type</th>
                        <th className="px-4 py-3">Reference Number</th>
                        <th className="px-4 py-3">Credit / Debit</th>
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
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedTransactions.map((entry, idx) => {
                        const pu = entry.partyOrUser;
                        const refConfig =
                          TYPE_CONFIG[entry.referenceType] || {};
                        const isCredit = entry.type === "CREDIT";
                        const refFormatted = formatRefNo(entry);

                        return (
                          <tr
                            key={entry._id || idx}
                            className="hover:bg-gray-50/80 transition-colors"
                          >
                            <td className="px-4 py-3 text-gray-600 font-medium whitespace-nowrap">
                              {fmtDateOnly(entry.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-[10px] ${
                                    pu.isDeleted
                                      ? "bg-gray-200 text-gray-400"
                                      : "bg-brand-50 text-brand-700 border border-brand-200"
                                  }`}
                                >
                                  {pu.initials}
                                </div>
                                <span
                                  className={`font-semibold text-xs ${
                                    pu.isDeleted
                                      ? "text-gray-400 italic"
                                      : "text-gray-900"
                                  }`}
                                >
                                  {pu.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-500 font-mono">
                              {pu.phone}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full ${
                                  refConfig.badge || "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {refConfig.label || entry.referenceType || "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-gray-700 text-xs">
                              <span
                                className="bg-gray-50 border border-gray-200 text-gray-700 px-2 py-0.5 rounded-md font-mono font-semibold text-[11px]"
                                title={entry.referenceId ? `Full ID: ${entry.referenceId}` : ""}
                              >
                                {refFormatted}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                  isCredit
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {entry.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-sm">
                              <span
                                className={
                                  isCredit ? "text-green-600" : "text-red-600"
                                }
                              >
                                {isCredit ? "+" : "-"}
                                {fmt(entry.amount)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => setSelectedEntry(entry)}
                                className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                                title="View Details Drawer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-gray-100">
                  {paginatedTransactions.map((entry, idx) => {
                    const pu = entry.partyOrUser;
                    const refConfig = TYPE_CONFIG[entry.referenceType] || {};
                    const isCredit = entry.type === "CREDIT";

                    return (
                      <div
                        key={entry._id || idx}
                        onClick={() => setSelectedEntry(entry)}
                        className="p-3.5 hover:bg-gray-50 active:bg-gray-100 cursor-pointer space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-[10px] ${
                                pu.isDeleted
                                  ? "bg-gray-200 text-gray-400"
                                  : "bg-brand-50 text-brand-700"
                              }`}
                            >
                              {pu.initials}
                            </div>
                            <span
                              className={`text-xs font-bold truncate ${
                                pu.isDeleted
                                  ? "text-gray-400 italic"
                                  : "text-gray-900"
                              }`}
                            >
                              {pu.name}
                            </span>
                          </div>
                          <span
                            className={`text-sm font-bold ${isCredit ? "text-green-600" : "text-red-600"}`}
                          >
                            {isCredit ? "+" : "-"}
                            {fmt(entry.amount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${isCredit ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                            >
                              {entry.type}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${refConfig.badge || "bg-gray-100 text-gray-600"}`}
                            >
                              {refConfig.label || entry.referenceType || "—"}
                            </span>
                          </div>
                          <span className="font-mono text-gray-600 text-[10px]">
                            {formatRefNo(entry)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
                    <span>
                      Showing {start + 1}–
                      {Math.min(
                        start + ITEMS_PER_PAGE,
                        filteredTransactions.length,
                      )}{" "}
                      of {filteredTransactions.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => p - 1)}
                        className="px-2.5 py-1 border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <span className="px-2 font-semibold">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => p + 1)}
                        className="px-2.5 py-1 border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 2. PARTY LEDGER WORKSPACE */}
      {/* ------------------------------------------------------------------- */}
      {activeWorkspace === "party" && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Party Ledger & Account Statement
              </h2>
              <p className="text-xs text-gray-500">
                Select any Vendor, Customer, or Party to view their statement
              </p>
            </div>
            {selectedPartyObj && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    printStatementPdf(
                      "Party Account Statement",
                      selectedPartyObj.partyName ||
                        selectedPartyObj.name ||
                        "Party Statement",
                      `Type: ${selectedPartyObj.partyType || selectedPartyObj.role || "Party"} | GSTIN: ${selectedPartyObj.gstin || "N/A"} | Phone: ${selectedPartyObj.phone || selectedPartyObj.mobile || "—"}`,
                      filteredPartyTxns,
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Export PDF
                </button>
                <button
                  onClick={() =>
                    exportCSV(
                      filteredPartyTxns,
                      `party_${selectedPartyObj.name || "statement"}`,
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              </div>
            )}
          </div>

          {/* Search & Selection Bar */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
              {/* Searchable Combobox */}
              <div className="lg:col-span-6">
                <SearchableSelect
                  options={partyOptions}
                  value={selectedPartyId}
                  onChange={setSelectedPartyId}
                  placeholder="Type name, phone, or GST to search party..."
                  label={`Select Party / Vendor / Customer (${partyOptions.length} available)`}
                  icon={Building2}
                />
              </div>

              {/* Reference Type Filter */}
              <div className="lg:col-span-6 space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-gray-400" /> Filter Reference Type
                </label>
                <select
                  value={partyRefFilter}
                  onChange={(e) => setPartyRefFilter(e.target.value)}
                  className="w-full py-2.5 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 text-gray-700 font-medium"
                >
                  {REFERENCE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Picker */}
              <div className="lg:col-span-12 pt-2 border-t border-gray-100">
                <DateRangePicker
                  fromDate={partyFromDate}
                  toDate={partyToDate}
                  onFromChange={setPartyFromDate}
                  onToChange={setPartyToDate}
                />
              </div>
            </div>
          </div>

          {/* Selected Party Summary Card */}
          {selectedPartyObj ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-brand-50 border border-brand-200 text-brand-700 font-black text-base flex items-center justify-center">
                    {getInitials(
                      selectedPartyObj.partyName || selectedPartyObj.name,
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 leading-tight">
                      {selectedPartyObj.partyName ||
                        selectedPartyObj.name ||
                        `${selectedPartyObj.firstName || ""} ${selectedPartyObj.lastName || ""}`.trim()}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Phone:{" "}
                      <span className="font-mono font-semibold text-gray-700">
                        {selectedPartyObj.phone ||
                          selectedPartyObj.mobile ||
                          "—"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg border border-gray-200">
                    Type:{" "}
                    {selectedPartyObj.partyType ||
                      selectedPartyObj.role ||
                      "Party"}
                  </span>
                  {selectedPartyObj.gstin && (
                    <span className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                      GSTIN: {selectedPartyObj.gstin}
                    </span>
                  )}
                </div>
              </div>

              {/* Address / Details if available */}
              {(selectedPartyObj.address ||
                selectedPartyObj.village ||
                selectedPartyObj.district) && (
                <p className="text-xs text-gray-600 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  Address:{" "}
                  {[
                    selectedPartyObj.address,
                    selectedPartyObj.village,
                    selectedPartyObj.district,
                    selectedPartyObj.state,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}

              {/* Statement Table */}
              <div className="pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Account Statement ({filteredPartyTxns.length} records)
                </h4>
                {filteredPartyTxns.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 bg-gray-50 rounded-xl border border-gray-200">
                    <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-semibold">
                      No transactions found for this party.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Reference Type</th>
                          <th className="px-4 py-3">Reference Number</th>
                          <th className="px-4 py-3 text-right">Debit</th>
                          <th className="px-4 py-3 text-right">Credit</th>
                          <th className="px-4 py-3 text-center">Type Badge</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredPartyTxns.map((entry, idx) => {
                          const refConfig =
                            TYPE_CONFIG[entry.referenceType] || {};
                          const isCredit = entry.type === "CREDIT";
                          return (
                            <tr
                              key={entry._id || idx}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-4 py-3 text-gray-600 font-medium">
                                {fmtDateOnly(entry.createdAt)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${refConfig.badge || "bg-gray-100 text-gray-600"}`}
                                >
                                  {refConfig.label || entry.referenceType || "—"}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono text-gray-700 text-xs">
                                <span
                                  className="bg-gray-50 border border-gray-200 text-gray-700 px-2 py-0.5 rounded-md font-mono font-semibold text-[11px]"
                                  title={entry.referenceId ? `Full ID: ${entry.referenceId}` : ""}
                                >
                                  {formatRefNo(entry)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-red-600">
                                {!isCredit ? fmt(entry.amount) : "—"}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-green-600">
                                {isCredit ? fmt(entry.amount) : "—"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${isCredit ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                                >
                                  {entry.type}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400 space-y-2">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="text-sm font-semibold text-gray-600">
                Please select a party above
              </p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Search or select any vendor or customer from the search box above to display their transaction statement.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 3. FARMER LEDGER WORKSPACE */}
      {/* ------------------------------------------------------------------- */}
      {activeWorkspace === "farmer" && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Farmer Ledger & Financial History
              </h2>
              <p className="text-xs text-gray-500">
                Select any member or farmer ({farmerOptions.length} available) to view procurement & payment statements
              </p>
            </div>
            {selectedFarmerObj && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    printStatementPdf(
                      "Farmer Account Statement",
                      selectedFarmerObj.partyName ||
                        selectedFarmerObj.name ||
                        `${selectedFarmerObj.firstName || ""} ${selectedFarmerObj.lastName || ""}`.trim(),
                      `Member ID: ${selectedFarmerObj.memberId || "N/A"} | Village: ${selectedFarmerObj.village || "N/A"} | Phone: ${selectedFarmerObj.phone || selectedFarmerObj.mobile || "—"}`,
                      filteredFarmerTxns,
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Export PDF
                </button>
                <button
                  onClick={() =>
                    exportCSV(
                      filteredFarmerTxns,
                      `farmer_${selectedFarmerObj.name || "statement"}`,
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              </div>
            )}
          </div>

          {/* Farmer Search & Selection Bar */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
              {/* Searchable Combobox */}
              <div className="lg:col-span-6">
                <SearchableSelect
                  options={farmerOptions}
                  value={selectedFarmerId}
                  onChange={setSelectedFarmerId}
                  placeholder="Type farmer name, village, or phone to search..."
                  label={`Search & Select Farmer / Member (${farmerOptions.length} available)`}
                  icon={User}
                />
              </div>

              {/* Reference Type Filter */}
              <div className="lg:col-span-6 space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-gray-400" /> Filter Reference Type
                </label>
                <select
                  value={farmerRefFilter}
                  onChange={(e) => setFarmerRefFilter(e.target.value)}
                  className="w-full py-2.5 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 text-gray-700 font-medium"
                >
                  {REFERENCE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Picker */}
              <div className="lg:col-span-12 pt-2 border-t border-gray-100">
                <DateRangePicker
                  fromDate={farmerFromDate}
                  toDate={farmerToDate}
                  onFromChange={setFarmerFromDate}
                  onToChange={setFarmerToDate}
                />
              </div>
            </div>
          </div>

          {/* Selected Farmer Summary Card */}
          {selectedFarmerObj ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-brand-50 border border-brand-200 text-brand-700 font-black text-base flex items-center justify-center">
                    {getInitials(
                      selectedFarmerObj.partyName ||
                        selectedFarmerObj.name ||
                        `${selectedFarmerObj.firstName || ""} ${selectedFarmerObj.lastName || ""}`.trim(),
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 leading-tight">
                      {selectedFarmerObj.partyName ||
                        selectedFarmerObj.name ||
                        `${selectedFarmerObj.firstName || ""} ${selectedFarmerObj.lastName || ""}`.trim()}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Phone:{" "}
                      <span className="font-mono font-semibold text-gray-700">
                        {selectedFarmerObj.phone ||
                          selectedFarmerObj.mobile ||
                          "—"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {selectedFarmerObj.memberId && (
                    <span className="px-2.5 py-1 text-xs font-semibold bg-brand-50 text-brand-700 rounded-lg border border-brand-200">
                      Member ID: {selectedFarmerObj.memberId}
                    </span>
                  )}
                  {selectedFarmerObj.village && (
                    <span className="px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg border border-gray-200">
                      Village: {selectedFarmerObj.village}
                    </span>
                  )}
                </div>
              </div>

              {/* Statement Table */}
              <div className="pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Farmer Statement ({filteredFarmerTxns.length} records)
                </h4>
                {filteredFarmerTxns.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 bg-gray-50 rounded-xl border border-gray-200">
                    <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-semibold">
                      No ledger available for this farmer.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Reference Type</th>
                          <th className="px-4 py-3">Reference Number</th>
                          <th className="px-4 py-3 text-right">Debit</th>
                          <th className="px-4 py-3 text-right">Credit</th>
                          <th className="px-4 py-3 text-center">Type Badge</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredFarmerTxns.map((entry, idx) => {
                          const refConfig =
                            TYPE_CONFIG[entry.referenceType] || {};
                          const isCredit = entry.type === "CREDIT";
                          return (
                            <tr
                              key={entry._id || idx}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-4 py-3 text-gray-600 font-medium">
                                {fmtDateOnly(entry.createdAt)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${refConfig.badge || "bg-gray-100 text-gray-600"}`}
                                >
                                  {refConfig.label || entry.referenceType || "—"}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono text-gray-700 text-xs">
                                <span
                                  className="bg-gray-50 border border-gray-200 text-gray-700 px-2 py-0.5 rounded-md font-mono font-semibold text-[11px]"
                                  title={entry.referenceId ? `Full ID: ${entry.referenceId}` : ""}
                                >
                                  {formatRefNo(entry)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-red-600">
                                {!isCredit ? fmt(entry.amount) : "—"}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-green-600">
                                {isCredit ? fmt(entry.amount) : "—"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${isCredit ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                                >
                                  {entry.type}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400 space-y-2">
              <User className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="text-sm font-semibold text-gray-600">
                Please search or select a farmer above
              </p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Type name, village, or phone in the search box above to choose any farmer ({farmerOptions.length} available) and view their financial statement.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TRANSACTION DRAWER — Strict Backend Values */}
      {/* ------------------------------------------------------------------- */}
      {selectedEntry && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs"
          onClick={() => setSelectedEntry(null)}
        >
          <div
            className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col overflow-hidden border-l border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="bg-gray-900 text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Ledger Transaction Record
                </span>
                <h2 className="text-base font-bold mt-0.5">
                  {selectedEntry.partyOrUser?.name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Amount Highlight */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  selectedEntry.type === "CREDIT"
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">
                    Transaction Type
                  </span>
                  <p
                    className={`text-sm font-bold ${
                      selectedEntry.type === "CREDIT"
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {selectedEntry.type}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">
                    Amount
                  </span>
                  <p
                    className={`text-xl font-black ${
                      selectedEntry.type === "CREDIT"
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {selectedEntry.type === "CREDIT" ? "+" : "-"}
                    {fmt(selectedEntry.amount)}
                  </p>
                </div>
              </div>

              {/* Record Details List */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl divide-y divide-gray-200">
                <div className="p-3 flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-gray-400" /> Party /
                    Farmer
                  </span>
                  <span className="font-semibold text-gray-900">
                    {selectedEntry.partyOrUser?.name}
                  </span>
                </div>

                <div className="p-3 flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" /> Phone Number
                  </span>
                  <span className="font-mono text-gray-800">
                    {selectedEntry.partyOrUser?.phone}
                  </span>
                </div>

                <div className="p-3 flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-gray-400" /> Role / Type
                  </span>
                  <span className="font-semibold text-gray-800">
                    {selectedEntry.partyOrUser?.role}
                  </span>
                </div>

                <div className="p-3 flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-gray-400" /> Reference
                    Type
                  </span>
                  <span className="font-semibold text-gray-900">
                    {selectedEntry.referenceType || "—"}
                  </span>
                </div>

                <div className="p-3 flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-gray-400" /> Reference
                    Number
                  </span>
                  <span className="font-mono text-gray-900 font-bold bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                    {formatRefNo(selectedEntry)}
                  </span>
                </div>

                {selectedEntry.referenceId &&
                  /^[0-9a-fA-F]{24}$/.test(String(selectedEntry.referenceId)) && (
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-gray-400" /> Raw Mongo
                        ObjectId
                      </span>
                      <span
                        className="font-mono text-gray-600 text-[10px] truncate max-w-[180px]"
                        title={selectedEntry.referenceId}
                      >
                        {selectedEntry.referenceId}
                      </span>
                    </div>
                  )}

                <div className="p-3 flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" /> Created At
                  </span>
                  <span className="text-gray-800 font-medium">
                    {fmtDateTime(selectedEntry.createdAt)}
                  </span>
                </div>

                <div className="p-3 flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" /> Updated At
                  </span>
                  <span className="text-gray-800 font-medium">
                    {fmtDateTime(selectedEntry.updatedAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <button
                onClick={() => setSelectedEntry(null)}
                className="w-full py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

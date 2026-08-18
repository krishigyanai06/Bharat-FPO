import {
  TrendingUp,
  TrendingDown,
  Wallet,
  RefreshCw,
  Tag,
} from "lucide-react";
import theme from "../../../config/theme";

// Centralized Type Configuration with icons and color tokens
export const TYPE_CONFIG = {
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

export const REFERENCE_TYPES = [
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

export const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

export const fmtDateTime = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime()) || d.getFullYear() < 2000) return "—";
  return d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export const fmtDateOnly = (v) => {
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
export const formatRefNo = (entry) => {
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

export const getInitials = (name) => {
  if (!name || name === "Deleted Party") return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export const getDueStatusBadge = (status) => {
  const s = String(status || "").toUpperCase();
  if (s === "PAYABLE") {
    return {
      label: "PAYABLE",
      badge: "bg-amber-100 text-amber-800 border border-amber-200",
    };
  }
  if (s === "RECEIVABLE") {
    return {
      label: "RECEIVABLE",
      badge: "bg-blue-100 text-blue-800 border border-blue-200",
    };
  }
  if (s === "SETTLED") {
    return {
      label: "SETTLED",
      badge: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    };
  }
  return {
    label: s || "N/A",
    badge: "bg-gray-100 text-gray-700 border border-gray-200",
  };
};

/**
 * Resolver helper to resolve entry.party or entry.user to human-readable details
 * using strictly backend records and party/member map O(1) lookup.
 */
export const getPartyOrUser = (entry, partyMap = {}) => {
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

  // 5. Check partyId or userId field on entry
  const extraId =
    entry.partyId ||
    entry.userId ||
    entry.farmerId ||
    entry.buyerId ||
    entry.supplierId;
  if (extraId) {
    const extraIdStr = String(extraId);
    const matched = partyMap[extraIdStr];
    if (matched) {
      const name =
        matched.partyName ||
        matched.name ||
        `${matched.firstName || ""} ${matched.lastName || ""}`.trim();
      const phone =
        matched.phone || matched.mobile || matched.phoneNumber || "—";
      const role =
        matched.partyType || matched.role || matched.type || "Party";
      return {
        _id: extraIdStr,
        name,
        phone,
        role,
        initials: getInitials(name),
        raw: matched,
        isDeleted: false,
      };
    }
  }

  // 6. Direct text fields on entry
  const directName =
    entry.partyName ||
    entry.buyerName ||
    entry.supplierName ||
    entry.farmerName ||
    entry.customerName;
  if (directName) {
    const phone = entry.phone || entry.mobile || entry.phoneNumber || "—";
    const role = entry.partyType || entry.type || "Party";
    return {
      _id: String(
        extraId || entry.party || entry.user || entry._id || "direct"
      ),
      name: directName,
      phone,
      role,
      initials: getInitials(directName),
      raw: entry,
      isDeleted: false,
    };
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

// Export CSV Helper
export const exportCSV = (data, filenamePrefix = "ledger", balanceDetails = null) => {
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
    `"${(e.partyOrUser?.name || "Deleted Party").replace(/"/g, '""')}"`,
    e.partyOrUser?.phone || "—",
    e.partyOrUser?.role || "—",
    e.type || "",
    e.referenceType || "",
    e.amount || 0,
    `"${formatRefNo(e)}"`,
    `"${e.referenceId || ""}"`,
  ]);

  let csvContent = "";
  if (balanceDetails) {
    const openBal =
      balanceDetails.periodOpeningBalance?.amount ??
      balanceDetails.profileOpeningBalance ??
      0;
    const curBal =
      balanceDetails.currentBalance?.amount ??
      balanceDetails.currentBalance ??
      0;
    const summaryLines = [
      `"Financial Balance Summary"`,
      `"Opening Balance",${openBal}`,
      `"Total Credit",${balanceDetails.totalCredit ?? 0}`,
      `"Total Debit",${balanceDetails.totalDebit ?? 0}`,
      `"Current Balance",${curBal}`,
      `"Due Amount",${balanceDetails.dueAmount ?? 0}`,
      `"Advance Amount",${balanceDetails.advanceAmount ?? 0}`,
      `"Due Status","${balanceDetails.dueStatus || "PAYABLE"}"`,
      "",
    ];
    csvContent = summaryLines.join("\n") + "\n";
  }

  csvContent += [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenamePrefix}_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// Print PDF Statement for Party / Farmer
export const printStatementPdf = async (
  title,
  entityName,
  entityDetails,
  txns,
  balanceDetails = null
) => {
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

    // Optional Financial Summary in PDF (using exact balanceDetails)
    let currentY = 52;
    if (balanceDetails) {
      const openBal = fmt(
        balanceDetails.periodOpeningBalance?.amount ??
          balanceDetails.profileOpeningBalance ??
          0
      );
      const totalCr = fmt(balanceDetails.totalCredit ?? 0);
      const totalDr = fmt(balanceDetails.totalDebit ?? 0);
      const curBal = fmt(
        balanceDetails.currentBalance?.amount ??
          balanceDetails.currentBalance ??
          0
      );
      const curType =
        balanceDetails.currentBalance?.balanceType || "CREDIT";
      const dueVal = fmt(
        balanceDetails.dueAmount || balanceDetails.advanceAmount || 0
      );
      const status = balanceDetails.dueStatus || "PAYABLE";

      doc.setFillColor(245, 247, 250);
      doc.roundedRect(14, 49, 182, 12, 2, 2, "F");
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(70, 70, 70);
      doc.text(
        `Opening: ${openBal}  |  Credit: ${totalCr}  |  Debit: ${totalDr}  |  Closing: ${curBal} (${curType})  |  Due: ${dueVal} (${status})`,
        18,
        56.5
      );
      currentY = 66;
    }

    // Table
    const sortedTxns = [...txns].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );

    autoTable(doc, {
      startY: currentY,
      head: [
        [
          "#",
          "Date",
          "Reference Type",
          "Reference Number",
          "Type",
          "Amount",
        ],
      ],
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
      `Statement_${entityName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`
    );
  } catch (err) {
    console.error("PDF generation failed:", err);
    alert("Failed to generate statement PDF.");
  }
};

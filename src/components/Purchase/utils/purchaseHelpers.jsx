import React, { useState, useEffect } from "react";
import {
  FileText,
  Coins,
  IndianRupee,
  Wallet,
  Receipt,
  FileCheck,
  Building,
  Briefcase,
  Layers,
  ShoppingBag,
  Package,
} from "lucide-react";
import api from "../../../lib/api";

export const TABS = [
  { key: "purchases", label: "Purchase Bills & Orders", icon: FileText },
  { key: "payments", label: "Payments Out", icon: IndianRupee },
  { key: "returns", label: "Debit Notes (Returns)", icon: Receipt },
  { key: "expenses", label: "Expenses", icon: Wallet },
];

export const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir", "Ladakh"
];

export const EXPENSE_CATEGORIES = [
  "Office Supplies",
  "Rent",
  "Utilities",
  "Logistics & Transport",
  "Salaries & Wages",
  "Marketing & Advertising",
  "Repairs & Maintenance",
  "Other Expenses",
];

export const PAYMENT_TYPES = [
  "Cash",
  "UPI",
  "Cheque",
  "Bank Transfer",
  "Card",
  "Credit",
];

export function LinkedBillCell({ billId }) {
  const [billNumber, setBillNumber] = useState("");

  useEffect(() => {
    if (!billId) return;
    if (typeof billId === "object" && billId?.billNumber) {
      setBillNumber(billId.billNumber);
      return;
    }
    const idStr = typeof billId === "object" ? billId?._id : billId;
    if (idStr && idStr.length === 24) {
      api.get(`/purchase/${idStr}`)
        .then((res) => {
          const b = res.data?.data || res.data;
          setBillNumber(b?.billNumber || idStr.substring(0, 8).toUpperCase());
        })
        .catch(() => {
          setBillNumber(idStr.substring(0, 8).toUpperCase());
        });
    } else {
      setBillNumber(String(idStr || "—"));
    }
  }, [billId]);

  return <span>{billNumber || "—"}</span>;
}

export function resolveItemLabel(it, products = []) {
  if (!it) return "Item";
  if (it.itemName && String(it.itemName).trim() && it.itemName !== "Item") {
    return it.itemName;
  }
  const itemId = typeof it.item === "object" ? it.item?._id : it.item;
  if (itemId) {
    const prod = products.find(
      (p) => p._id === itemId || p.products?.some((v) => v._id === itemId)
    );
    if (prod) {
      const variant = prod.products?.find((v) => v._id === itemId);
      return variant
        ? `${prod.productName} (${variant.parameter} ${variant.unit})`
        : prod.productName;
    }
  }
  return it.name || "Item";
}

export function resolveReturnItemLabel(it, products = [], linkedBill = null) {
  if (!it) return "Item";
  if (it.itemName && String(it.itemName).trim() && it.itemName !== "Item") {
    return it.itemName;
  }
  const itemId = typeof it.item === "object" ? it.item?._id : it.item;
  if (itemId) {
    const prod = products.find(
      (p) => p._id === itemId || p.products?.some((v) => v._id === itemId)
    );
    if (prod) {
      const variant = prod.products?.find((v) => v._id === itemId);
      return variant
        ? `${prod.productName} (${variant.parameter} ${variant.unit})`
        : prod.productName;
    }
    if (linkedBill && linkedBill.items) {
      const matchedLine = linkedBill.items.find(
        (line) => (typeof line.item === "object" ? line.item?._id : line.item) === itemId
      );
      if (matchedLine) {
        return resolveItemLabel(matchedLine, products);
      }
    }
  }
  return it.name || "Returned Item";
}

export function resolveVariantId(it, products = []) {
  const rawItem = it.item;
  if (typeof rawItem === "object" && rawItem?._id) {
    return rawItem._id;
  }
  if (typeof rawItem === "string" && rawItem.length === 24) {
    return rawItem;
  }
  if (it.unit && it.pricePerUnit) {
    const matchedProd = products.find((p) =>
      p.products?.some(
        (v) =>
          String(v.unit).toLowerCase() === String(it.unit).toLowerCase() &&
          Number(v.purchasePrice) === Number(it.pricePerUnit)
      )
    );
    if (matchedProd) {
      const matchedVar = matchedProd.products.find(
        (v) =>
          String(v.unit).toLowerCase() === String(it.unit).toLowerCase() &&
          Number(v.purchasePrice) === Number(it.pricePerUnit)
      );
      if (matchedVar) return matchedVar._id;
    }
  }
  return rawItem || "";
}

export function getProductIcon(category) {
  const cat = String(category || "").toLowerCase();
  if (cat.includes("fertilizer") || cat.includes(" खाद ")) return "🌱";
  if (cat.includes("seed") || cat.includes(" बीज़ ")) return "🌾";
  if (cat.includes("pesticide") || cat.includes(" दवा ")) return "🧪";
  if (cat.includes("tool") || cat.includes(" औजार ")) return "🔧";
  return "📦";
}

export function TableSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4 animate-pulse select-none">
      <div className="h-8 bg-gray-100 rounded-xl w-1/3" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-gray-50 rounded-xl w-full" />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div className="py-12 text-center text-gray-400 flex flex-col items-center justify-center space-y-2 select-none">
      <ShoppingBag className="w-10 h-10 text-gray-300 stroke-[1.5]" />
      <p className="font-bold text-gray-700 text-sm">{title}</p>
      <p className="text-xs text-gray-400 max-w-xs">{description}</p>
    </div>
  );
}

export function getCategoryIconDetails(category) {
  const cat = (category || "").toLowerCase();

  if (cat.includes("fertilizer") || cat.includes(" खाद ")) {
    return { icon: Layers, bg: "bg-emerald-50 text-emerald-600 border-emerald-150" };
  }
  if (cat.includes("pesticide") || cat.includes("insecticide") || cat.includes(" दवा ")) {
    return { icon: Briefcase, bg: "bg-[#EFF6FF] text-[#2563EB] border-blue-150" };
  }
  if (cat.includes("seed") || cat.includes(" बीज़ ")) {
    return { icon: Package, bg: "bg-[#FFFBEB] text-[#D97706] border-amber-150" };
  }
  if (cat.includes("tool") || cat.includes("machinery") || cat.includes(" औजार ")) {
    return { icon: Building, bg: "bg-[#F3E8FF] text-[#9333EA] border-purple-150" };
  }

  return { icon: FileCheck, bg: "bg-[#F1F5F9] text-[#475569] border-slate-200" };
}

export function getStockIndicator(quantity) {
  const qty = Number(quantity || 0);

  if (qty <= 0) {
    return {
      dotBg: "bg-rose-500",
      textClass: "text-[#E11D48] font-bold bg-rose-50 border border-rose-150",
      label: "Out of Stock",
    };
  }
  if (qty < 50) {
    return {
      dotBg: "bg-amber-500",
      textClass: "text-[#D97706] font-bold bg-amber-50 border border-amber-150",
      label: "Low Stock",
    };
  }
  return {
    dotBg: "bg-[#16A34A]",
    textClass: "text-[#16A34A] font-bold bg-[#DCFCE7] border border-emerald-200",
    label: "In Stock",
  };
}

export function highlightText(text, highlight) {
  if (!highlight || !text) return text;
  const strText = String(text);
  const parts = strText.split(new RegExp(`(${highlight})`, "gi"));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="bg-amber-200/90 text-amber-950 px-0.5 rounded-xs font-bold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}

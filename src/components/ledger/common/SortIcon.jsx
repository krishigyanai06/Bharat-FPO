import React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export default function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) {
    return <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-30" />;
  }
  return sortDir === "asc" ? (
    <ArrowUp className="inline w-3 h-3 ml-1 text-brand-600" />
  ) : (
    <ArrowDown className="inline w-3 h-3 ml-1 text-brand-600" />
  );
}

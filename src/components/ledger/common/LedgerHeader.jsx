import React from "react";
import { BookOpen, Building2, User } from "lucide-react";

export default function LedgerHeader({ activeWorkspace, onSelectWorkspace }) {
  const tabs = [
    { id: "transactions", label: "Transactions", icon: BookOpen },
    { id: "party", label: "Party Ledger", icon: Building2 },
    { id: "farmer", label: "Farmer Ledger", icon: User },
  ];

  return (
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
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl border border-gray-200 self-start sm:self-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelectWorkspace(id)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
  );
}

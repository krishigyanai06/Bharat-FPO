import React from "react";
import {
  X,
  UserCheck,
  Phone,
  Tag,
  Filter,
  Hash,
  Calendar,
  Clock,
} from "lucide-react";
import { fmt, fmtDateTime, formatRefNo } from "../utils/ledgerHelpers";

export default function TransactionDetailDrawer({ entry, onClose }) {
  if (!entry) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
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
              {entry.partyOrUser?.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Amount Highlight */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              entry.type === "CREDIT"
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
                  entry.type === "CREDIT"
                    ? "text-green-700"
                    : "text-red-700"
                }`}
              >
                {entry.type}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-gray-500 uppercase">
                Amount
              </span>
              <p
                className={`text-xl font-black ${
                  entry.type === "CREDIT"
                    ? "text-green-700"
                    : "text-red-700"
                }`}
              >
                {entry.type === "CREDIT" ? "+" : "-"}
                {fmt(entry.amount)}
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
                {entry.partyOrUser?.name}
              </span>
            </div>

            <div className="p-3 flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400" /> Phone Number
              </span>
              <span className="font-mono text-gray-800">
                {entry.partyOrUser?.phone}
              </span>
            </div>

            <div className="p-3 flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-gray-400" /> Role / Type
              </span>
              <span className="font-semibold text-gray-800">
                {entry.partyOrUser?.role}
              </span>
            </div>

            <div className="p-3 flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-gray-400" /> Reference
                Type
              </span>
              <span className="font-semibold text-gray-900">
                {entry.referenceType || "—"}
              </span>
            </div>

            <div className="p-3 flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-gray-400" /> Reference
                Number
              </span>
              <span className="font-mono text-gray-900 font-bold bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                {formatRefNo(entry)}
              </span>
            </div>

            {entry.referenceId &&
              /^[0-9a-fA-F]{24}$/.test(String(entry.referenceId)) && (
                <div className="p-3 flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-gray-400" /> Raw Mongo
                    ObjectId
                  </span>
                  <span
                    className="font-mono text-gray-600 text-[10px] truncate max-w-[180px]"
                    title={entry.referenceId}
                  >
                    {entry.referenceId}
                  </span>
                </div>
              )}

            <div className="p-3 flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" /> Created At
              </span>
              <span className="text-gray-800 font-medium">
                {fmtDateTime(entry.createdAt)}
              </span>
            </div>

            <div className="p-3 flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" /> Updated At
              </span>
              <span className="text-gray-800 font-medium">
                {fmtDateTime(entry.updatedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { FileText, Coins, IndianRupee, Wallet, AlertTriangle } from "lucide-react";

export default function PurchaseMetrics({ purchaseMetrics }) {
  const cards = [
    {
      label: "Total Purchase Bills",
      val: `₹${purchaseMetrics.totalBills.toLocaleString("en-IN")}`,
      icon: FileText,
      bg: "bg-blue-50 text-blue-700 border-blue-100",
    },
    {
      label: "Total Purchase Orders",
      val: `₹${purchaseMetrics.totalOrders.toLocaleString("en-IN")}`,
      icon: Coins,
      bg: "bg-purple-50 text-purple-700 border-purple-100",
    },
    {
      label: "Total Payments Out",
      val: `₹${purchaseMetrics.totalPayments.toLocaleString("en-IN")}`,
      icon: IndianRupee,
      bg: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    {
      label: "Total Expenses",
      val: `₹${purchaseMetrics.totalExpenses.toLocaleString("en-IN")}`,
      icon: Wallet,
      bg: "bg-amber-50 text-amber-700 border-amber-100",
    },
    {
      label: "Outstanding Payables",
      val: `₹${purchaseMetrics.outstandingPayables.toLocaleString("en-IN")}`,
      icon: AlertTriangle,
      bg: "bg-red-50 text-red-700 border-red-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((item, idx) => (
        <div key={idx} className={`bg-white border ${item.bg.split(" ")[2]} rounded-2xl p-4 shadow-sm flex items-center gap-3`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.bg.split(" ")[0]} ${item.bg.split(" ")[1]}`}>
            <item.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-gray-505 font-semibold uppercase tracking-wider">{item.label}</p>
            <h3 className="text-lg font-bold text-gray-900 mt-0.5">{item.val}</h3>
          </div>
        </div>
      ))}
    </div>
  );
}

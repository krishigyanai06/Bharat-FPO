import React from "react";
import {
  TrendingUp,
  Calendar,
  CreditCard,
  AlertTriangle,
  FileText,
  Truck,
} from "lucide-react";
import { formatINR, computeSalesMetrics } from "./procurementSaleHelpers";

export default function SalesSummaryCards({ salesList = [] }) {
  const metrics = computeSalesMetrics(salesList);

  const cards = [
    {
      title: "Total Sales Revenue",
      value: formatINR(metrics.totalSales),
      subtitle: `${metrics.totalInvoices} Invoices Total`,
      icon: TrendingUp,
      bg: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    {
      title: "Today's Sales",
      value: formatINR(metrics.todaySales),
      subtitle: "Recorded Today",
      icon: Calendar,
      bg: "bg-blue-50 text-blue-700 border-blue-100",
    },
    {
      title: "Total Received",
      value: formatINR(metrics.totalReceived),
      subtitle: "Collected Amount",
      icon: CreditCard,
      bg: "bg-purple-50 text-purple-700 border-purple-100",
    },
    {
      title: "Outstanding Balance",
      value: formatINR(metrics.outstandingAmount),
      subtitle: "Pending Receivables",
      icon: AlertTriangle,
      bg: "bg-amber-50 text-amber-700 border-amber-100",
    },
    {
      title: "Pending E-Way Bills",
      value: metrics.pendingEWayBills,
      subtitle: "Dispatches Awaiting EWB",
      icon: Truck,
      bg: "bg-rose-50 text-rose-700 border-rose-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 select-none">
      {cards.map((c, idx) => {
        const IconComponent = c.icon;
        return (
          <div
            key={idx}
            className={`bg-white border rounded-2xl p-4 shadow-3xs flex items-center gap-3 transition-all hover:shadow-2xs ${
              c.bg.split(" ")[2]
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                c.bg.split(" ")[0]
              } ${c.bg.split(" ")[1]}`}
            >
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                {c.title}
              </p>
              <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                {c.value}
              </h3>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                {c.subtitle}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

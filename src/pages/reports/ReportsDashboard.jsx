import React from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  Wallet, 
  Scale, 
  IndianRupee, 
  FileText,
  Coins, 
  UserCheck,
  Calendar
} from 'lucide-react';

const ReportsDashboard = ({ onNavigate }) => {
  const reportCards = [
    {
      key: 'sales',
      title: 'Sales Report',
      description: 'View counter sales, estimates, credit ledger invoice files, and customer balances.',
      icon: TrendingUp,
      iconBg: 'bg-green-50/60',
      iconColor: 'text-green-600',
    },
    {
      key: 'purchase',
      title: 'Purchase Report',
      description: 'Evaluate crop purchases, outstanding bill counts, payment outs, and vendor balances.',
      icon: ShoppingBag,
      iconBg: 'bg-blue-50/60',
      iconColor: 'text-blue-600',
    },
    {
      key: 'balancesheet',
      title: 'Balance Sheet',
      description: 'Display asset inventories, cash accounts, supplier payables, bank loans, and FPO equity.',
      icon: Scale,
      iconBg: 'bg-purple-50/60',
      iconColor: 'text-purple-600',
    },
    {
      key: 'procurement',
      title: 'Procurement Report',
      description: 'Track member harvest collections, quality grade distributions, and farmer ledger payouts.',
      icon: FileText,
      iconBg: 'bg-green-50/60',
      iconColor: 'text-green-600',
    },
    {
      key: 'expense',
      title: 'Expense Report',
      description: 'Review administrative bills, storage rents, fuel logistics, and secondary FPO expenses.',
      icon: Wallet,
      iconBg: 'bg-red-50/60',
      iconColor: 'text-red-500',
    },
    {
      key: 'paymentin',
      title: 'Payment In Report',
      description: 'Trace customer payments received, ledger receipts, and credit sales collections.',
      icon: IndianRupee,
      iconBg: 'bg-amber-50/60',
      iconColor: 'text-amber-600',
    },
    {
      key: 'paymentout',
      title: 'Payment Out Report',
      description: 'Trace vendor payout logs, supplier settlement receipts, and direct bank clearances.',
      icon: Coins,
      iconBg: 'bg-purple-50/60',
      iconColor: 'text-purple-600',
    },
    {
      key: 'partysalepurchase',
      title: 'Party Sale-Purchase',
      description: 'Analyze total sales and purchases mapped to each individual customer and supplier contact.',
      icon: UserCheck,
      iconBg: 'bg-orange-50/60',
      iconColor: 'text-orange-600',
    },
    {
      key: 'itemwiseprofitloss',
      title: 'Itemwise Profit-Loss',
      description: 'Evaluate individual crop item sales, costs of goods sold, profit margins, and net profits.',
      icon: TrendingUp,
      iconBg: 'bg-teal-50/60',
      iconColor: 'text-teal-700',
    },
  ];

  return (
    <div className="space-y-8 select-none">
      {/* Header Section */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-xs text-gray-500 font-medium">Welcome back! Here's what's happening with your business.</p>
        </div>
        
        {/* Date Picker Display */}
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-xs font-semibold text-gray-700 shadow-sm select-none">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span>01 Jul 2025 - 02 Jul 2025</span>
        </div>
      </div>

      {/* All Reports Section */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-gray-900 tracking-tight">All Reports</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reportCards.map((card) => (
            <div 
              key={card.key} 
              onClick={() => !card.comingSoon && onNavigate(card.key)}
              className={`bg-white rounded-2xl border p-6 flex flex-col justify-between min-h-[165px] shadow-sm transition-all duration-200 ${
                card.comingSoon 
                  ? 'border-gray-100 opacity-75' 
                  : 'border-gray-200/60 cursor-pointer hover:shadow-md hover:border-green-300'
              }`}
            >
              <div className="space-y-3">
                {/* Top row: Icon and Title inline */}
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${card.iconBg} ${card.iconColor} flex items-center justify-center flex-shrink-0`}>
                    <card.icon className="w-4.5 h-4.5" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 leading-tight">{card.title}</h4>
                </div>
                
                {/* Description */}
                <p className="text-xs text-gray-500 leading-relaxed font-normal">
                  {card.description}
                </p>
              </div>

              {/* Footer/Action */}
              <div className="mt-4 pt-1">
                {card.comingSoon ? (
                  <span className="inline-block px-2.5 py-0.5 text-[9px] font-bold rounded bg-purple-50 text-purple-600 border border-purple-100/60 select-none">
                    Coming Soon
                  </span>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate(card.key);
                    }}
                    className="text-[#15803D] hover:text-green-800 font-bold text-xs flex items-center gap-1 hover:underline cursor-pointer group/btn"
                  >
                    <span>Open Report</span>
                    <span className="text-[10px] transition-transform group-hover/btn:translate-x-0.5 font-bold">&gt;</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportsDashboard;

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import ReportsDashboard from './reports/ReportsDashboard';
import SalesReport from './reports/SalesReport';
import PurchaseReport from './reports/PurchaseReport';
import PaymentInReport from './reports/PaymentInReport';
import PaymentOutReport from './reports/PaymentOutReport';
import ExpenseReport from './reports/ExpenseReport';
import BalanceSheetReport from './reports/BalanceSheetReport';
import PartySalePurchaseReport from './reports/PartySalePurchaseReport';
import ItemwiseProfitLossReport from './reports/ItemwiseProfitLossReport';

const Reports = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Default to 'dashboard' as the central hub
  const activeTab = searchParams.get('tab') || 'dashboard';

  const handleNavigate = (tabKey) => {
    setSearchParams({ tab: tabKey });
  };

  // Tabs structure: Dashboard | Sales Report | Purchase Report | Payment In | Payment Out | Expense Report | Balance Sheet
  const tabs = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'sales', label: 'Sales Report' },
    { key: 'purchase', label: 'Purchase Report' },
    { key: 'paymentin', label: 'Payment In' },
    { key: 'paymentout', label: 'Payment Out' },
    { key: 'expense', label: 'Expense Report' },
    { key: 'partysalepurchase', label: 'Party Sale-Purchase' },
    { key: 'itemwiseprofitloss', label: 'Itemwise Profit-Loss' },
    { key: 'balancesheet', label: 'Balance Sheet' },
  ];

  return (
    <div className="space-y-5 bg-white min-h-[80vh] rounded-2xl p-1 select-none">
      {/* ── Top Navigation Tabs (matches request) ── */}
      <div className="border-b border-gray-150 w-full">
        <div className="flex flex-wrap gap-2 px-1">
          {tabs.map((t) => {
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => handleNavigate(t.key)}
                className={`pb-2.5 pt-2 px-4 text-xs font-bold transition-all border-b-2 -mb-[1.5px] cursor-pointer rounded-t-xl ${
                  isActive
                    ? 'text-[#15803D] border-[#15803D] bg-green-50/40'
                    : 'text-gray-600 hover:text-gray-900 border-transparent hover:bg-gray-50/50'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pages Container */}
      <div className="animate-fade-in pt-1">
        {activeTab === 'dashboard' && <ReportsDashboard onNavigate={handleNavigate} />}
        {activeTab === 'sales' && <SalesReport />}
        {activeTab === 'purchase' && <PurchaseReport />}
        {activeTab === 'paymentin' && <PaymentInReport />}
        {activeTab === 'paymentout' && <PaymentOutReport />}
        {activeTab === 'expense' && <ExpenseReport />}
        {activeTab === 'partysalepurchase' && <PartySalePurchaseReport />}
        {activeTab === 'itemwiseprofitloss' && <ItemwiseProfitLossReport />}
        {activeTab === 'balancesheet' && <BalanceSheetReport />}
      </div>
    </div>
  );
};

export default Reports;

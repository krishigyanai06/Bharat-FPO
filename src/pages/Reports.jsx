import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  TrendingUp, 
  ShoppingBag, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Folder, 
  Scale, 
  UserCheck,
  Plus, 
  X,
  Search
} from 'lucide-react';
import ReportsDashboard from './reports/ReportsDashboard';
import SalesReport from './reports/SalesReport';
import PurchaseReport from './reports/PurchaseReport';
import PaymentInReport from './reports/PaymentInReport';
import PaymentOutReport from './reports/PaymentOutReport';
import ExpenseReport from './reports/ExpenseReport';
import BalanceSheetReport from './reports/BalanceSheetReport';
import PartySalePurchaseReport from './reports/PartySalePurchaseReport';
import ItemwiseProfitLossReport from './reports/ItemwiseProfitLossReport';
import ProcurementReport from './reports/ProcurementReport';
import { FileText as DocIcon } from 'lucide-react';

const ALL_TABS = {
  dashboard: { key: 'dashboard', label: 'Dashboard', icon: Home },
  sales: { key: 'sales', label: 'Sales Report', icon: TrendingUp },
  purchase: { key: 'purchase', label: 'Purchase Report', icon: ShoppingBag },
  paymentin: { key: 'paymentin', label: 'Payment In', icon: ArrowDownCircle },
  paymentout: { key: 'paymentout', label: 'Payment Out', icon: ArrowUpCircle },
  expense: { key: 'expense', label: 'Expense Report', icon: Folder },
  balancesheet: { key: 'balancesheet', label: 'Balance Sheet', icon: Scale },
  procurement: { key: 'procurement', label: 'Procurement Report', icon: DocIcon },
  partysalepurchase: { key: 'partysalepurchase', label: 'Party Sale-Purchase', icon: UserCheck },
  itemwiseprofitloss: { key: 'itemwiseprofitloss', label: 'Itemwise Profit-Loss', icon: TrendingUp }
};

const REPORT_COMPONENTS = {
  dashboard: ReportsDashboard,
  sales: SalesReport,
  purchase: PurchaseReport,
  paymentin: PaymentInReport,
  paymentout: PaymentOutReport,
  expense: ExpenseReport,
  procurement: ProcurementReport,
  partysalepurchase: PartySalePurchaseReport,
  itemwiseprofitloss: ItemwiseProfitLossReport,
  balancesheet: BalanceSheetReport
};

const Reports = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  // Initially opened tabs (matching standard workspace layout)
  const [openTabs, setOpenTabs] = useState([
    'dashboard',
    'sales',
    'purchase',
    'paymentin',
    'paymentout',
    'expense',
    'balancesheet',
    'procurement'
  ]);

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);

  const tabsScrollRef = useRef(null);

  // Sync search param tab to openTabs if navigated programmatically (e.g. from Dashboard cards)
  useEffect(() => {
    if (activeTab && ALL_TABS[activeTab]) {
      setOpenTabs((prev) => {
        if (!prev.includes(activeTab)) {
          return [...prev, activeTab];
        }
        return prev;
      });
    }
  }, [activeTab]);

  const handleNavigate = (tabKey) => {
    setSearchParams({ tab: tabKey });
  };

  const handleCloseTab = (e, tabKey) => {
    if (e) e.stopPropagation();
    if (tabKey === 'dashboard') return; // Dashboard cannot be closed

    const currentIndex = openTabs.indexOf(tabKey);
    const newOpenTabs = openTabs.filter((key) => key !== tabKey);
    setOpenTabs(newOpenTabs);

    if (activeTab === tabKey) {
      if (currentIndex > 0 && newOpenTabs.length > 0) {
        setSearchParams({ tab: newOpenTabs[currentIndex - 1] });
      } else if (newOpenTabs.length > 0) {
        setSearchParams({ tab: newOpenTabs[0] });
      } else {
        setSearchParams({ tab: 'dashboard' });
      }
    }
  };

  const handleOpenTab = (tabKey) => {
    setOpenTabs((prev) => {
      if (!prev.includes(tabKey)) {
        return [...prev, tabKey];
      }
      return prev;
    });
    setSearchParams({ tab: tabKey });
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl + Tab (Next Tab)
      if (e.ctrlKey && e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        const currentIndex = openTabs.indexOf(activeTab);
        if (currentIndex !== -1) {
          const nextIndex = (currentIndex + 1) % openTabs.length;
          handleNavigate(openTabs[nextIndex]);
        }
      }
      
      // Ctrl + Shift + Tab (Previous Tab)
      if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
        e.preventDefault();
        const currentIndex = openTabs.indexOf(activeTab);
        if (currentIndex !== -1) {
          let prevIndex = (currentIndex - 1) % openTabs.length;
          if (prevIndex < 0) prevIndex = openTabs.length - 1;
          handleNavigate(openTabs[prevIndex]);
        }
      }

      // Ctrl + W (Close Active Tab)
      if (e.ctrlKey && e.key.toLowerCase() === 'w') {
        if (activeTab !== 'dashboard') {
          e.preventDefault();
          handleCloseTab(e, activeTab);
        }
      }

      // Ctrl + K (Open search modal)
      if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openTabs, activeTab]);

  // List of matching reports for search modal
  const matchingTabs = Object.values(ALL_TABS).filter((t) =>
    t.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Keyboard navigation inside search modal
  useEffect(() => {
    if (!showSearchModal) return;
    
    // Reset index when search query changes
    setSelectedSearchIndex(0);

    const handleSearchKeys = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSearchIndex((prev) => (prev + 1) % Math.max(1, matchingTabs.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSearchIndex((prev) => (prev - 1 + matchingTabs.length) % Math.max(1, matchingTabs.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (matchingTabs[selectedSearchIndex]) {
          handleOpenTab(matchingTabs[selectedSearchIndex].key);
          setShowSearchModal(false);
          setSearchQuery('');
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowSearchModal(false);
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleSearchKeys);
    return () => window.removeEventListener('keydown', handleSearchKeys);
  }, [showSearchModal, searchQuery, selectedSearchIndex, matchingTabs]);

  return (
    <div className="bg-[#F8FAFC] border border-gray-200 min-h-[85vh] rounded-2xl shadow-sm overflow-hidden select-none flex flex-col relative">
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* ── Top Navigation Tabs (matches request) ── */}
      <div className="bg-white border-b border-gray-200 pt-2.5 px-4 flex items-center justify-between gap-2 z-10">
        <div 
          ref={tabsScrollRef}
          className="flex items-center gap-1.5 overflow-x-auto pb-px no-scrollbar select-none flex-grow"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {Array.from(new Set(openTabs)).map((key) => {
            const t = ALL_TABS[key];
            if (!t) return null;
            const isActive = activeTab === key;
            const Icon = t.icon;
            return (
              <div
                key={key}
                onClick={() => handleNavigate(key)}
                className={`group px-4 py-2 text-xs font-semibold flex items-center gap-2 border rounded-t-xl cursor-pointer transition-all duration-150 select-none -mb-[1px] ${
                  isActive
                    ? 'bg-white border-gray-200 border-b-white text-[#16A34A] border-t-[3px] border-t-[#16A34A] shadow-[0_-2px_6px_rgba(0,0,0,0.02)]'
                    : 'bg-[#F8FAFC]/60 border-gray-200 border-b-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50/85'
                }`}
              >
                {Icon && (
                  <Icon 
                    className={`w-3.5 h-3.5 transition-colors ${
                      isActive ? 'text-[#16A34A]' : 'text-gray-400 group-hover:text-gray-600'
                    }`} 
                  />
                )}
                <span>{t.label}</span>
                {key !== 'dashboard' && (
                  <button
                    onClick={(e) => handleCloseTab(e, key)}
                    className="p-0.5 rounded-full hover:bg-gray-150 text-gray-400 hover:text-red-500 transition-colors ml-1"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Tab Button & Search Icon */}
        <div className="flex items-center gap-1.5 pb-2">
          {/* Quick Search Button */}
          <button
            onClick={() => setShowSearchModal(true)}
            title="Search Reports (Ctrl+K)"
            className="p-1.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900 cursor-pointer transition-all flex items-center justify-center"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Add Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="p-1.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900 cursor-pointer transition-all flex items-center justify-center"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            
            {showAddMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)} />
                
                <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20 animate-fade-in">
                  {Object.values(ALL_TABS)
                    .filter((t) => !openTabs.includes(t.key))
                    .map((t) => {
                      const DropdownIcon = t.icon;
                      return (
                        <button
                          key={t.key}
                          onClick={() => {
                            handleOpenTab(t.key);
                            setShowAddMenu(false);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs flex items-center gap-2 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          {DropdownIcon && <DropdownIcon className="w-3.5 h-3.5 text-gray-400" />}
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  {Object.values(ALL_TABS).filter((t) => !openTabs.includes(t.key)).length === 0 && (
                    <div className="px-3.5 py-2 text-xs text-gray-400 text-center select-none">
                      All reports are open
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Pages Container - KeepAlive rendering using display styling to preserve state and scroll position */}
      <div className="p-6 flex-1 flex flex-col overflow-auto bg-[#F8FAFC] relative">
        {Array.from(new Set(openTabs)).map((key) => {
          const Component = REPORT_COMPONENTS[key];
          if (!Component) return null;
          const isActive = activeTab === key;

          return (
            <div
              key={key}
              style={{ display: isActive ? 'block' : 'none' }}
              className="w-full h-full"
            >
              <motion.div
                animate={{
                  opacity: isActive ? 1 : 0,
                  x: isActive ? 0 : 10,
                }}
                initial={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="w-full h-full"
              >
                {key === 'dashboard' ? (
                  <Component onNavigate={handleOpenTab} />
                ) : (
                  <Component />
                )}
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* ── Ctrl + K Search Modal ── */}
      {showSearchModal && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center pt-28 px-4"
          onClick={() => {
            setShowSearchModal(false);
            setSearchQuery('');
          }}
        >
          {/* Modal Container */}
          <div 
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-fade-in flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Box */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-150">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Search reports... (use ↑ ↓ keys to navigate, Enter to open)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
              />
              <span className="text-[10px] font-bold text-gray-400 border border-gray-200 rounded px-1.5 py-0.5 bg-gray-50 select-none">
                ESC
              </span>
            </div>

            {/* Matching Results List */}
            <div className="max-h-64 overflow-y-auto py-1 bg-white">
              {matchingTabs.map((t, idx) => {
                const ItemIcon = t.icon;
                const isSelected = idx === selectedSearchIndex;
                const isOpened = openTabs.includes(t.key);

                return (
                  <div
                    key={t.key}
                    onClick={() => {
                      handleOpenTab(t.key);
                      setShowSearchModal(false);
                      setSearchQuery('');
                    }}
                    onMouseEnter={() => setSelectedSearchIndex(idx)}
                    className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-1.5 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-green-50 text-[#16A34A]' : 'bg-gray-50 text-gray-400'
                      }`}>
                        {ItemIcon && <ItemIcon className="w-4 h-4" />}
                      </div>
                      <div className="truncate">
                        <span className={`text-xs font-semibold block ${
                          isSelected ? 'text-[#16A34A]' : 'text-gray-700'
                        }`}>
                          {t.label}
                        </span>
                      </div>
                    </div>

                    {isOpened && (
                      <span className="text-[9px] font-bold text-[#16A34A] bg-green-50 border border-green-100 rounded px-1.5 py-0.5 select-none">
                        Opened
                      </span>
                    )}
                  </div>
                );
              })}

              {matchingTabs.length === 0 && (
                <div className="text-center py-8 text-xs text-gray-400 select-none">
                  No matching reports found
                </div>
              )}
            </div>

            {/* Footer tips */}
            <div className="bg-gray-50 border-t border-gray-150 px-4 py-2 text-[10px] text-gray-400 flex items-center justify-between select-none">
              <span>Use arrows ↑ ↓ to move, Enter to select</span>
              <span>Search menu</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;

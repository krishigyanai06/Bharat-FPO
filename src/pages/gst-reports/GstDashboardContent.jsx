import React from 'react';
import { 
  ArrowRight, 
  FileText, 
  Layers, 
  ShieldCheck,
  Percent,
  Calculator
} from 'lucide-react';

const GstDashboardContent = ({ onNavigate }) => {
  return (
    <div className="space-y-6 w-full select-none">
      {/* ── Dashboard Hero Banner ── */}
      <div className="bg-gradient-to-r from-emerald-800 to-green-700 text-white rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-12 -translate-y-12 select-none">
          <ShieldCheck className="w-96 h-96" />
        </div>
        <div className="relative z-10 space-y-2.5 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-900/50 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide border border-emerald-500/20 text-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Government GST Compliance
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">GST Compliance Dashboard</h1>
          <p className="text-sm text-emerald-100 leading-relaxed font-medium">
            Manage your agricultural cooperative returns, inward input tax credits, and annual consolidated tax filings. Export portal-ready offline utility schemas securely.
          </p>
        </div>
      </div>

      {/* ── GST Returns Section ── */}
      <div className="space-y-4">
        <h2 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">GST Returns</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: GSTR-1 (Available) */}
          <div className="bg-white rounded-xl border border-gray-150 p-5 flex flex-col justify-between h-[165px] hover:shadow-md transition-all">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                  <FileText className="w-4.5 h-4.5" />
                </div>
                <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-green-50 text-[#15803D] border border-green-100">
                  Available
                </span>
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-extrabold text-gray-900">GSTR-1 Return</h4>
                <p className="text-xs text-gray-400 leading-normal">
                  Outward supplies tax return. Export portal-ready offline JSON packages or audit Sales registers.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-gray-50 pt-2.5">
              <button 
                onClick={() => onNavigate('gstr1')}
                className="text-[#15803D] font-bold text-xs hover:underline cursor-pointer"
              >
                Open Report
              </button>
              <ArrowRight onClick={() => onNavigate('gstr1')} className="w-4 h-4 text-[#15803D] cursor-pointer" />
            </div>
          </div>

          {/* Card 2: GSTR-2B (Coming Soon) */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col justify-between h-[165px] opacity-75">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Layers className="w-4.5 h-4.5" />
                </div>
                <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-gray-50 text-gray-500 border border-gray-200">
                  Coming Soon
                </span>
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-extrabold text-gray-900">GSTR-2B ITC Statement</h4>
                <p className="text-xs text-gray-400 leading-normal">
                  Auto-drafted purchase tax credit statement showing eligible ITC claims matching supplier invoices.
                </p>
              </div>
            </div>
            <div className="border-t border-gray-50 pt-2.5">
              <span className="text-gray-400 text-xs font-semibold">Coming Soon</span>
            </div>
          </div>

          {/* Card 3: GSTR-3B (Available) */}
          <div className="bg-white rounded-xl border border-gray-150 p-5 flex flex-col justify-between h-[165px] hover:shadow-md transition-all">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                  <Percent className="w-4.5 h-4.5" />
                </div>
                <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-green-50 text-[#15803D] border border-green-100">
                  Available
                </span>
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-extrabold text-gray-900">GSTR-3B Summary Return</h4>
                <p className="text-xs text-gray-400 leading-normal">
                  Monthly return consolidating liabilities, tax payments, and input credit offsets.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-gray-50 pt-2.5">
              <button 
                onClick={() => onNavigate('gstr3b')}
                className="text-[#15803D] font-bold text-xs hover:underline cursor-pointer"
              >
                Open Report
              </button>
              <ArrowRight onClick={() => onNavigate('gstr3b')} className="w-4 h-4 text-[#15803D] cursor-pointer" />
            </div>
          </div>

          {/* Card 4: GSTR-9 (Coming Soon) */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col justify-between h-[165px] opacity-75">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <Calculator className="w-4.5 h-4.5" />
                </div>
                <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-gray-50 text-gray-500 border border-gray-200">
                  Coming Soon
                </span>
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-extrabold text-gray-900">GSTR-9 Annual Return</h4>
                <p className="text-xs text-gray-400 leading-normal">
                  Consolidated annual return auditing all monthly filings and claims for the financial year.
                </p>
              </div>
            </div>
            <div className="border-t border-gray-50 pt-2.5">
              <span className="text-gray-400 text-xs font-semibold">Coming Soon</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GstDashboardContent;

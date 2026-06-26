import React from 'react';
import { RefreshCw, Search } from 'lucide-react';

/**
 * ReportFilterCard component for holding inputs, apply and reset buttons.
 * @param {object} props
 * @param {React.ReactNode} props.children - Filter inputs
 * @param {function} props.onApply - Callback when "Generate Preview" is clicked
 * @param {function} props.onReset - Callback when "Reset Filters" is clicked
 * @param {boolean} [props.loading] - If data fetching is loading
 */
const ReportFilterCard = ({ children, onApply, onReset, loading }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm sticky top-0 z-20 transition-all duration-300">
      <div className="p-5 space-y-4">
        {/* Filters grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {children}
        </div>
        
        {/* Actions panel */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-50 flex-wrap">
          <button
            type="button"
            onClick={onReset}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Filters
          </button>
          
          <button
            type="button"
            onClick={onApply}
            disabled={loading}
            className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md hover:shadow-emerald-100 shadow-emerald-500/10 transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            {loading ? 'Generating...' : 'Generate Preview'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportFilterCard;

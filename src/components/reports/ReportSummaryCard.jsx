import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * ReportSummaryCard component for displaying summary metrics / KPI indicators.
 * @param {object} props
 * @param {string} props.label - Metric label
 * @param {number|string} props.value - Metric value
 * @param {boolean} [props.isCurrency] - Formats value as INR currency
 * @param {string} [props.themeColor] - 'emerald' | 'blue' | 'amber' | 'red' | 'indigo' | 'purple'
 * @param {React.ElementType} [props.icon] - Lucide icon class
 * @param {object} [props.trend] - Trend information: { value: '12%', isPositive: true }
 */
const ReportSummaryCard = ({
  label,
  value,
  isCurrency = true,
  themeColor = 'emerald',
  icon: Icon,
  trend,
}) => {
  // Map color schemes
  const colorMap = {
    emerald: {
      border: 'border-t-4 border-t-emerald-600',
      iconBg: 'bg-emerald-50 text-emerald-600',
      valueText: 'text-emerald-700',
      glow: 'shadow-emerald-500/5',
    },
    blue: {
      border: 'border-t-4 border-t-blue-600',
      iconBg: 'bg-blue-50 text-blue-600',
      valueText: 'text-blue-700',
      glow: 'shadow-blue-500/5',
    },
    amber: {
      border: 'border-t-4 border-t-amber-600',
      iconBg: 'bg-amber-50 text-amber-600',
      valueText: 'text-amber-700',
      glow: 'shadow-amber-500/5',
    },
    red: {
      border: 'border-t-4 border-t-red-600',
      iconBg: 'bg-red-50 text-red-600',
      valueText: 'text-red-700',
      glow: 'shadow-red-500/5',
    },
    indigo: {
      border: 'border-t-4 border-t-indigo-600',
      iconBg: 'bg-indigo-50 text-indigo-600',
      valueText: 'text-indigo-700',
      glow: 'shadow-indigo-500/5',
    },
    purple: {
      border: 'border-t-4 border-t-purple-600',
      iconBg: 'bg-purple-50 text-purple-600',
      valueText: 'text-purple-700',
      glow: 'shadow-purple-500/5',
    },
  };

  const selectedColor = colorMap[themeColor] || colorMap.emerald;

  // Format currency
  const formatValue = (val) => {
    if (val === undefined || val === null) return '—';
    if (typeof val === 'number') {
      if (isCurrency) {
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 0,
        }).format(val);
      }
      return new Intl.NumberFormat('en-IN').format(val);
    }
    return val;
  };

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden transition-all duration-300 hover:shadow-md ${selectedColor.border} ${selectedColor.glow}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {label}
          </span>
          <h2 className={`text-2xl font-extrabold tracking-tight ${selectedColor.valueText}`}>
            {formatValue(value)}
          </h2>
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl ${selectedColor.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {trend && (
        <div className="flex items-center gap-1 mt-3">
          {trend.isPositive ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-red-500" />
          )}
          <span className={`text-xs font-bold ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend.value}
          </span>
          <span className="text-[11px] font-medium text-gray-400">vs last period</span>
        </div>
      )}
    </div>
  );
};

export default ReportSummaryCard;

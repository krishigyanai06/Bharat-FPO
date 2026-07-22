import React from 'react';
import { ArrowUpDown, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
import LoadingSkeleton from './LoadingSkeleton';
import EmptyState from './EmptyState';

/**
 * ReportTable - A generic table component designed for preview tables.
 * @param {object} props
 * @param {Array} props.columns - Column configurations: [{ key: 'invoice', label: 'Invoice No', sortable: true, render: (row) => ... }]
 * @param {Array} props.data - Row items
 * @param {boolean} props.loading - Shows loading skeleton
 * @param {object} [props.pagination] - Pagination metadata: { page: 1, limit: 10, totalPages: 1, totalRecords: 0 }
 * @param {function} [props.onPageChange] - Page switch callback: (pageNumber) => void
 * @param {object} [props.sortConfig] - Sort state: { key: 'date', direction: 'asc'|'desc' }
 * @param {function} [props.onSort] - Sort callback: (columnKey) => void
 * @param {React.ReactNode} [props.emptyState] - Custom empty state placeholder
 */
const ReportTable = ({
  columns,
  data,
  loading,
  pagination,
  onPageChange,
  sortConfig,
  onSort,
  emptyState,
}) => {
  if (loading) {
    return <LoadingSkeleton type="table" rows={6} cols={columns.length} />;
  }

  if (!data || data.length === 0) {
    return emptyState || <EmptyState />;
  }

  const handleSortClick = (col) => {
    if (col.sortable && onSort) {
      onSort(col.key);
    }
  };

  const renderSortIcon = (colKey) => {
    if (!sortConfig || sortConfig.key !== colKey) {
      return <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors ml-1" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-emerald-600 ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-emerald-600 ml-1" />
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      {/* Table grid wrapper */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/70 border-b border-gray-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSortClick(col)}
                  className={`py-3.5 px-5 text-xs font-bold text-gray-400 uppercase tracking-wider ${
                    col.sortable ? 'cursor-pointer hover:bg-gray-100/50 select-none group' : ''
                  } ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                >
                  <div className={`flex items-center ${
                    col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'
                  }`}>
                    <span>{col.label}</span>
                    {col.sortable && renderSortIcon(col.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((row, index) => (
              <tr
                key={row._id || row.id || index}
                className="hover:bg-gray-50/30 transition-colors duration-150"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-4 px-5 text-xs font-medium text-gray-700 ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    }`}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination component */}
      {pagination && pagination.totalPages > 1 && (
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between flex-wrap gap-4 bg-white select-none">
          {/* Left: Item Range */}
          <div className="text-xs font-semibold text-gray-500">
            Showing{' '}
            <span className="text-[#15803D] font-bold">
              {pagination.totalRecords === 0 ? 0 : (pagination.page - 1) * (pagination.limit || 10) + 1}–
              {Math.min(pagination.page * (pagination.limit || 10), pagination.totalRecords)}
            </span>{' '}
            of <span className="text-[#15803D] font-bold">{Number(pagination.totalRecords).toLocaleString('en-IN')}</span> items
          </div>
          
          {/* Center: Current Page Status */}
          <div className="text-xs font-semibold text-gray-500">
            Page <span className="text-[#15803D] font-bold">{pagination.page}</span> of {pagination.totalPages}
          </div>

          {/* Right: Previous / Next Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 font-bold text-xs text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#15803D]" />
              <span>Previous</span>
            </button>

            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="flex items-center gap-2 bg-[#15803D] hover:bg-green-700 text-white rounded-xl px-4 py-2 font-bold text-xs shadow-sm shadow-green-600/10 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportTable;

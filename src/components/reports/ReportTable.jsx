import React from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
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
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between flex-wrap gap-4 bg-gray-50/20">
          <div className="text-xs font-medium text-gray-400">
            Showing Page <span className="text-gray-700 font-bold">{pagination.page}</span> of{' '}
            <span className="text-gray-700 font-bold">{pagination.totalPages}</span>
            {pagination.totalRecords !== undefined && (
              <>
                {' '}
                (<span className="text-gray-700 font-bold">{pagination.totalRecords}</span> items total)
              </>
            )}
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-gray-800 disabled:opacity-50 disabled:pointer-events-none hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {Array.from({ length: pagination.totalPages }).map((_, i) => {
              const pageNum = i + 1;
              const isCurrent = pageNum === pagination.page;
              
              // Only display pagination buttons for current page, surrounding pages, and edges
              if (
                pageNum === 1 ||
                pageNum === pagination.totalPages ||
                Math.abs(pageNum - pagination.page) <= 1
              ) {
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`w-7.5 h-7.5 text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer ${
                      isCurrent
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                        : 'bg-white text-gray-500 hover:text-gray-800 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              }
              
              // Draw ellipses for skipped ranges
              if (pageNum === 2 || pageNum === pagination.totalPages - 1) {
                return (
                  <span key={pageNum} className="text-gray-400 text-xs px-1 select-none">
                    ...
                  </span>
                );
              }
              
              return null;
            })}
            
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-gray-800 disabled:opacity-50 disabled:pointer-events-none hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportTable;

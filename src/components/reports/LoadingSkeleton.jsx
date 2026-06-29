import React from 'react';

/**
 * LoadingSkeleton component for rendering card & table skeletons while loading.
 * @param {object} props
 * @param {'card'|'table'|'list'} [props.type] - Skeleton type
 * @param {number} [props.rows] - Number of skeleton table rows
 * @param {number} [props.cols] - Number of skeleton table columns
 */
const LoadingSkeleton = ({ type = 'card', rows = 5, cols = 5 }) => {
  if (type === 'table') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
        {/* Table Head Skeleton */}
        <div className="bg-gray-50/70 border-b border-gray-100 px-5 py-4 flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded-md flex-1" />
          ))}
        </div>
        
        {/* Table Body Rows Skeleton */}
        <div className="divide-y divide-gray-50">
          {Array.from({ length: rows }).map((_, rIdx) => (
            <div key={rIdx} className="px-5 py-4.5 flex gap-4">
              {Array.from({ length: cols }).map((_, cIdx) => (
                <div
                  key={cIdx}
                  className={`h-3.5 bg-gray-100 rounded-md flex-1 ${
                    cIdx === 0 ? 'w-3/4' : cIdx === cols - 1 ? 'w-1/2' : ''
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Card Skeleton
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <div className="h-3 bg-gray-200 rounded-md w-1/3" />
          <div className="h-6 bg-gray-200 rounded-md w-1/2" />
        </div>
        <div className="w-10 h-10 bg-gray-200 rounded-xl" />
      </div>
      <div className="h-3 bg-gray-100 rounded-md w-2/3 mt-2" />
    </div>
  );
};

export default LoadingSkeleton;

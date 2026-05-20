// Pulse skeleton primitives — compose these inside each page
const base = 'animate-pulse bg-gray-200 rounded-lg';

export const SkeletonBox = ({ className = '' }) => (
  <div className={`${base} ${className}`} />
);

// 4-column stat cards row (Dashboard, Procurement, Inventory, Listing)
export const SkeletonStatCards = ({ count = 4 }) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${count} gap-6`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white p-6 rounded-xl shadow-sm flex justify-between items-center">
        <div className="space-y-2">
          <SkeletonBox className="h-3 w-24" />
          <SkeletonBox className="h-8 w-16" />
        </div>
        <SkeletonBox className="h-12 w-12 rounded-xl" />
      </div>
    ))}
  </div>
);

// Generic table skeleton
export const SkeletonTable = ({ rows = 6, cols = 5 }) => (
  <div className="bg-white rounded-xl shadow-sm overflow-hidden">
    <div className="px-6 py-4 border-b">
      <SkeletonBox className="h-4 w-40" />
    </div>
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} className="px-4 py-3">
              <SkeletonBox className="h-3 w-full" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y">
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: cols }).map((_, c) => (
              <td key={c} className="px-4 py-4">
                <SkeletonBox className="h-4 w-full" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Card grid skeleton (Members, Advertisement, Coupons)
export const SkeletonCardGrid = ({ count = 6, cols = 3 }) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${cols} gap-5`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white rounded-xl shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-3">
          <SkeletonBox className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <SkeletonBox className="h-3 w-3/4" />
            <SkeletonBox className="h-3 w-1/2" />
          </div>
        </div>
        <SkeletonBox className="h-3 w-full" />
        <SkeletonBox className="h-3 w-5/6" />
      </div>
    ))}
  </div>
);

// Page header skeleton (title + subtitle)
export const SkeletonHeader = () => (
  <div className="space-y-2">
    <SkeletonBox className="h-7 w-56" />
    <SkeletonBox className="h-4 w-80" />
  </div>
);

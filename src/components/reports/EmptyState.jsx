import React from 'react';
import { Inbox, RotateCcw } from 'lucide-react';

/**
 * EmptyState component for showing when no data matches report query.
 * @param {object} props
 * @param {string} [props.title] - Heading of empty message
 * @param {string} [props.description] - Description or suggestion details
 * @param {function} [props.onAction] - Button callback
 * @param {string} [props.actionLabel] - Button label text
 */
const EmptyState = ({
  title = 'No Data Preview Found',
  description = 'There is no report records available. Try adjusting your filters or search criteria, then click "Generate Preview" again.',
  onAction,
  actionLabel = 'Reset Filters',
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center text-center">
      <div className="p-4 bg-gray-50 rounded-2xl text-gray-400 mb-4">
        <Inbox className="w-10 h-10" />
      </div>
      <h3 className="text-base font-bold text-gray-800 tracking-tight mb-1">
        {title}
      </h3>
      <p className="text-xs text-gray-400 font-medium max-w-md leading-relaxed mb-6">
        {description}
      </p>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all duration-150 active:scale-95 cursor-pointer shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;

import { AlertTriangle } from 'lucide-react';

function ConfirmDialog({ message, subMessage, onConfirm, onCancel, confirmLabel = 'Delete', confirmClassName }) {
  const btnClass = confirmClassName ?? 'bg-red-600 hover:bg-red-700';
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center space-y-4">

        {/* ICON */}
        <div className="flex justify-center">
          <div className="bg-red-100 p-4 rounded-full">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        {/* TEXT */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{message}</h3>
          {subMessage && (
            <p className="text-sm text-gray-500 mt-1">{subMessage}</p>
          )}
        </div>

        {/* BUTTONS */}
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-6 py-2 text-white rounded-lg text-sm transition ${btnClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;

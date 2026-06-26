import React from 'react';
import { Download, Loader2 } from 'lucide-react';

/**
 * DownloadButton - A loading-sensitive download button for PDF reports.
 * @param {object} props
 * @param {boolean} props.loading - Indicates if download request is pending
 * @param {function} props.onClick - Trigger handler
 * @param {string} [props.label] - Label of button
 * @param {boolean} [props.disabled] - Disables interaction
 * @param {string} [props.variant] - Button style variant ('emerald' | 'slate' | 'outline')
 */
const DownloadButton = ({
  loading,
  onClick,
  label = 'Download PDF',
  disabled = false,
  variant = 'emerald',
}) => {
  const baseStyle =
    'flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer';

  const variants = {
    emerald:
      'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/10 hover:shadow-emerald-100',
    slate:
      'bg-slate-800 hover:bg-slate-900 text-white shadow-sm shadow-slate-800/10 hover:shadow-slate-100',
    outline:
      'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm',
  };

  const selectedStyle = variants[variant] || variants.emerald;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyle} ${selectedStyle}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        <Download className="w-4 h-4 text-current" />
      )}
      <span>{loading ? 'Downloading...' : label}</span>
    </button>
  );
};

export default DownloadButton;

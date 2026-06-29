import React from 'react';

/**
 * ReportHeader component for page title, description, and action buttons.
 * @param {object} props
 * @param {string} props.title - Title of the report page
 * @param {string} props.description - Brief description of the report
 * @param {React.ReactNode} [props.actions] - Action buttons slot (e.g. Export PDF)
 */
const ReportHeader = ({ title, description, actions }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 pb-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-gray-500 font-medium max-w-3xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          {actions}
        </div>
      )}
    </div>
  );
};

export default ReportHeader;

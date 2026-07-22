import React, { useState, useEffect, useMemo, useRef } from "react";
import { Search, X, ChevronDown, User } from "lucide-react";

/**
 * Reusable Searchable Combobox Component
 * Replaces native HTML <select> dropdowns with a sleek, searchable ERP combobox.
 */
export default function SearchableSelect({
  options = [],
  value = "",
  onChange,
  placeholder = "Search or select...",
  label = "",
  icon: Icon = User,
  required = false,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = useMemo(() => {
    return options.find((opt) => String(opt.id) === String(value));
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const q = searchTerm.toLowerCase().trim();
    return options.filter(
      (opt) =>
        (opt.name || "").toLowerCase().includes(q) ||
        (opt.phone || "").includes(q) ||
        (opt.subtext || "").toLowerCase().includes(q) ||
        (opt.badge || "").toLowerCase().includes(q),
    );
  }, [options, searchTerm]);

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-brand-600" />}
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {selectedOption && !isOpen ? (
        <div className="flex items-center justify-between bg-brand-50/80 border border-brand-200 rounded-xl px-3 py-2 text-xs shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-full bg-brand-600 text-white font-black text-[10px] flex items-center justify-center flex-shrink-0">
              {selectedOption.initials || selectedOption.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0 truncate">
              <span className="font-bold text-gray-900 truncate">
                {selectedOption.name}
              </span>
              {selectedOption.subtext && (
                <span className="text-gray-500 text-[11px] ml-1.5">
                  ({selectedOption.subtext})
                </span>
              )}
              {selectedOption.phone &&
                selectedOption.phone !== "—" &&
                !selectedOption.name.includes(selectedOption.phone) && (
                  <span className="text-gray-500 text-[11px] font-mono ml-1.5">
                    · {selectedOption.phone}
                  </span>
                )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange("");
              setSearchTerm("");
              setIsOpen(true);
            }}
            className="p-1 hover:bg-brand-100 text-brand-700 rounded-lg transition ml-2 flex-shrink-0"
            title="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            className="w-full py-2.5 pr-8 text-xs bg-gray-50 border border-gray-200 rounded-xl pl-9 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 font-medium text-gray-900 shadow-2xs"
          />
          {searchTerm ? (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          )}
        </div>
      )}

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-gray-50">
          {filteredOptions.length === 0 ? (
            <div className="py-4 text-center text-gray-400 text-xs">
              No matching records found
            </div>
          ) : (
            filteredOptions.map((opt) => (
              <div
                key={opt.id}
                onClick={() => {
                  onChange(opt.id);
                  setIsOpen(false);
                  setSearchTerm("");
                }}
                className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer hover:bg-brand-50/70 transition-colors text-xs ${
                  String(value) === String(opt.id) ? "bg-brand-50 font-bold text-brand-700" : ""
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0 border border-gray-200">
                    {opt.initials || opt.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {opt.name}
                    </p>
                    {(opt.subtext ||
                      (opt.phone &&
                        opt.phone !== "—" &&
                        !opt.name.includes(opt.phone))) && (
                      <p className="text-[10px] text-gray-500 truncate">
                        {opt.subtext ? (
                          <span>
                            {opt.subtext}{" "}
                            {opt.phone &&
                            opt.phone !== "—" &&
                            !opt.name.includes(opt.phone)
                              ? `· ${opt.phone}`
                              : ""}
                          </span>
                        ) : (
                          opt.phone &&
                          opt.phone !== "—" &&
                          !opt.name.includes(opt.phone) && (
                            <span className="font-mono">{opt.phone}</span>
                          )
                        )}
                      </p>
                    )}
                  </div>
                </div>
                {opt.badge && (
                  <span className="px-2 py-0.5 text-[9px] font-semibold bg-gray-100 text-gray-600 rounded-md flex-shrink-0 ml-2 border border-gray-200">
                    {opt.badge}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

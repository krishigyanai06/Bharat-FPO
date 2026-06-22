import { useState, useRef, useEffect } from "react";
import { Search, Check, ChevronDown, MapPin } from "lucide-react";

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi"
];

export default function SearchableStateSelect({
  value,
  onChange,
  placeholder = "Search state...",
  className = "",
  disabled = false,
  error = null,
  height = "h-[42px]"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset search when opening/closing
  useEffect(() => {
    if (!isOpen) {
      setSearch("");
    }
  }, [isOpen]);

  const filteredStates = STATES.filter((s) =>
    s.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (stateName) => {
    onChange(stateName);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`relative flex items-center justify-between border rounded-xl px-3 text-xs focus:outline-none transition-all cursor-pointer font-semibold ${height} ${
          disabled
            ? "bg-slate-100/60 text-slate-400 border-slate-200 cursor-not-allowed"
            : isOpen
            ? "border-emerald-500 bg-white ring-4 ring-emerald-500/10 text-slate-800"
            : "border-slate-200 hover:border-slate-350 bg-white text-slate-850"
        } ${error ? "border-red-500 focus:ring-red-500/10" : ""}`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <MapPin className={`w-4 h-4 shrink-0 ${disabled ? "text-slate-350" : isOpen ? "text-emerald-600" : "text-slate-400"}`} />
          <span className="truncate">{value || "Select supply state"}</span>
        </div>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 text-slate-400 ${isOpen ? "rotate-180 text-emerald-600" : ""}`} />
      </div>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute z-[100] mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-1 duration-150 overflow-hidden">
          {/* Search Box */}
          <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-transparent border-none text-xs focus:outline-none focus:ring-0 font-medium text-slate-800 placeholder-slate-400 p-0"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>

          {/* List items */}
          <div className="max-h-48 overflow-y-auto divide-y divide-slate-50/50">
            {filteredStates.length === 0 ? (
              <div className="px-3.5 py-3 text-xs text-slate-400 text-center font-medium">
                No state found
              </div>
            ) : (
              filteredStates.map((s) => {
                const isSelected = value === s;
                return (
                  <div
                    key={s}
                    onClick={() => handleSelect(s)}
                    className={`px-3.5 py-2.5 text-xs font-semibold cursor-pointer transition-colors flex items-center justify-between hover:bg-slate-50 ${
                      isSelected ? "text-emerald-700 bg-emerald-50/30 hover:bg-emerald-50/40" : "text-slate-700 hover:text-slate-900"
                    }`}
                  >
                    <span>{s}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="text-[10px] text-red-500 font-bold mt-1">{error}</p>}
    </div>
  );
}

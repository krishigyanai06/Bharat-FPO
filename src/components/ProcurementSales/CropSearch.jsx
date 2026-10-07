import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProcurementStock } from "../../redux/procurementSaleThunk";
import { Search, Loader2 } from "lucide-react";

export default function CropSearch({ onSelect, selectedCrops = [] }) {
  const dispatch = useDispatch();
  const { stock = [], loading, error } = useSelector((s) => s.procurementSales);
  
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef(null);

  useEffect(() => {
    dispatch(fetchProcurementStock());
  }, [dispatch]);

  // Click outside listener
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredStock = stock.filter((item) => {
    // Exclude items already added
    const alreadyAdded = selectedCrops.some(
      (c) =>
        c.cropName === item.cropName &&
        c.variety === item.variety &&
        c.godown === item.godown
    );
    if (alreadyAdded) return false;

    // Filter by name, variety, or godown
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      (item.cropName || "").toLowerCase().includes(q) ||
      (item.variety || "").toLowerCase().includes(q) ||
      (item.godown || "").toLowerCase().includes(q)
    );
  });

  const handleSelect = (item) => {
    onSelect({
      cropName: item.cropName,
      variety: item.variety || "",
      godown: item.godown || "Main Godown",
      availableQuantity: item.availableQuantity || 0,
      quantity: 1,
      rate: item.rate || 0,
      unit: item.unit || "qtl",
    });
    setQuery("");
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredStock.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredStock.length) % Math.max(1, filteredStock.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && filteredStock[selectedIndex]) {
        handleSelect(filteredStock[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">
        Search Procurement Stock (Crop, Variety, or Godown)
      </label>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Type crop name, variety, or warehouse/godown..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full bg-white border border-gray-200 pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-500"
        />
        {loading && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 text-brand-600 animate-spin" />
          </div>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-gray-150 rounded-xl shadow-lg max-h-60 overflow-y-auto z-50 py-1 animate-fade-in text-left">
          {filteredStock.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={idx}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`px-4 py-2.5 flex justify-between items-center cursor-pointer transition ${
                  isSelected ? "bg-brand-50 text-brand-700" : "hover:bg-gray-50 text-gray-750"
                }`}
              >
                <div>
                  <span className="text-xs font-bold block">{item.cropName}</span>
                  <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">
                    Variety: {item.variety || "—"} • Godown: {item.godown || "—"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-brand-600 bg-brand-100/50 px-2 py-0.5 rounded-full select-none">
                    {item.availableQuantity} {item.unit || "qtl"}
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-1">
                    Rate: ₹{item.rate}/{item.unit || "qtl"}
                  </span>
                </div>
              </div>
            );
          })}
          {filteredStock.length === 0 && (
            <div className="px-4 py-3 text-xs text-center select-none font-semibold">
              {error ? (
                <span className="text-red-500">Error: {error}</span>
              ) : (
                <span className="text-gray-400">No matching stock available in procurement inventory.</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

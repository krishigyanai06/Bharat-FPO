import React, { useState } from "react";
import { User, Building2, Phone, MapPin, Search, CheckCircle2 } from "lucide-react";

export default function BuyerSection({
  buyerDetails,
  setBuyerDetails,
  parties = [],
  partiesLoading = false,
}) {
  const [partySearchQuery, setPartySearchQuery] = useState("");
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);

  const filteredParties = (parties || []).filter((p) => {
    if (!partySearchQuery.trim()) return true;
    const q = partySearchQuery.toLowerCase();
    const name = (p.name || `${p.firstName || ""} ${p.lastName || ""}`).toLowerCase();
    const phone = (p.phone || p.mobile || "").toLowerCase();
    const gstin = (p.gstin || "").toLowerCase();
    return name.includes(q) || phone.includes(q) || gstin.includes(q);
  });

  const handleSelectParty = (party) => {
    const rawName = (party.name || `${party.firstName || ""} ${party.lastName || ""}`).trim();
    setBuyerDetails({
      ...buyerDetails,
      buyerParty: party._id || party.id,
      buyerName: rawName,
      phone: party.phone || party.mobile || "",
      gstin: party.gstin || "",
      address: party.address || "",
    });
    setShowPartyDropdown(false);
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <User size={15} />
          </div>
          <span>A. Buyer Information</span>
        </h3>

        {/* Buyer Type Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setBuyerDetails({ ...buyerDetails, buyerType: "party" })}
            className={`px-3 py-1 rounded-lg transition ${
              buyerDetails.buyerType === "party"
                ? "bg-white shadow-3xs text-brand-700 font-extrabold"
                : "hover:text-slate-900"
            }`}
          >
            Registered Party
          </button>
          <button
            type="button"
            onClick={() => setBuyerDetails({ ...buyerDetails, buyerType: "walk-in" })}
            className={`px-3 py-1 rounded-lg transition ${
              buyerDetails.buyerType === "walk-in"
                ? "bg-white shadow-3xs text-brand-700 font-extrabold"
                : "hover:text-slate-900"
            }`}
          >
            Walk-in Buyer
          </button>
        </div>
      </div>

      {buyerDetails.buyerType === "party" ? (
        <div className="space-y-4">
          <div className="relative">
            <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
              Select Registered Party / Buyer *
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search registered party by name, mobile, or GSTIN..."
                value={
                  buyerDetails.buyerName
                    ? buyerDetails.buyerName
                    : partySearchQuery
                }
                onChange={(e) => {
                  setPartySearchQuery(e.target.value);
                  setBuyerDetails({ ...buyerDetails, buyerName: "", buyerParty: "" });
                  setShowPartyDropdown(true);
                }}
                onFocus={() => setShowPartyDropdown(true)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl font-semibold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              />
            </div>

            {/* Dropdown Options */}
            {showPartyDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-100">
                {partiesLoading && (
                  <div className="p-3 text-xs text-slate-400 text-center font-bold">
                    Loading registered parties...
                  </div>
                )}
                {!partiesLoading && filteredParties.length === 0 && (
                  <div className="p-3 text-xs text-slate-400 text-center font-bold">
                    No matching party found.
                  </div>
                )}
                {filteredParties.map((p) => {
                  const name = p.name || `${p.firstName || ""} ${p.lastName || ""}`;
                  return (
                    <div
                      key={p._id || p.id}
                      onClick={() => handleSelectParty(p)}
                      className="p-3 hover:bg-brand-50 transition cursor-pointer flex justify-between items-center text-xs"
                    >
                      <div>
                        <span className="font-extrabold text-slate-900 block">{name}</span>
                        <span className="text-[11px] text-slate-400 font-semibold">
                          {p.phone || p.mobile || "No phone"} {p.village ? `· ${p.village}` : ""}
                        </span>
                      </div>
                      {p.gstin && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-[10px] rounded-md font-bold">
                          {p.gstin}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Party Summary Card */}
          {buyerDetails.buyerParty && (
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900">{buyerDetails.buyerName}</span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-extrabold flex items-center gap-1">
                    <CheckCircle2 size={10} /> Verified Party
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 font-semibold">
                  {buyerDetails.phone && <span>Phone: +91 {buyerDetails.phone}</span>}
                  {buyerDetails.gstin && <span className="font-mono">GSTIN: {buyerDetails.gstin}</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Walk-in Buyer Details */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
              Buyer Name *
            </label>
            <input
              type="text"
              value={buyerDetails.buyerName}
              onChange={(e) => setBuyerDetails({ ...buyerDetails, buyerName: e.target.value })}
              placeholder="e.g. Rahul Traders"
              className="w-full border border-slate-200 bg-white px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
              Mobile Phone
            </label>
            <input
              type="text"
              value={buyerDetails.phone}
              onChange={(e) => setBuyerDetails({ ...buyerDetails, phone: e.target.value })}
              placeholder="10-digit phone number"
              className="w-full border border-slate-200 bg-white px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
              Buyer GSTIN (Optional)
            </label>
            <input
              type="text"
              value={buyerDetails.gstin}
              onChange={(e) => setBuyerDetails({ ...buyerDetails, gstin: e.target.value.toUpperCase() })}
              placeholder="e.g. 27AAAAA1111A1Z1"
              className="w-full border border-slate-200 bg-white px-3.5 py-2.5 rounded-xl text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 uppercase"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
              Buyer Address
            </label>
            <input
              type="text"
              value={buyerDetails.address}
              onChange={(e) => setBuyerDetails({ ...buyerDetails, address: e.target.value })}
              placeholder="e.g. Market Yard, Sector 4"
              className="w-full border border-slate-200 bg-white px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
            />
          </div>
        </div>
      )}
    </div>
  );
}

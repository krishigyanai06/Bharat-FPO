import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchParties } from "../../store/thunks/partyThunk";

export default function BuyerCard({ buyerDetails, onChange }) {
  const dispatch = useDispatch();
  const { parties = [], loading } = useSelector((state) => state.party || {});

  useEffect(() => {
    dispatch(fetchParties());
  }, [dispatch]);

  const handlePartyChange = (e) => {
    const partyId = e.target.value;
    if (!partyId) {
      onChange({
        ...buyerDetails,
        buyerParty: "",
        buyerName: "",
        phone: "",
        gstin: "",
        address: "",
      });
      return;
    }
    const party = parties.find((p) => p._id === partyId);
    if (party) {
      onChange({
        ...buyerDetails,
        buyerParty: partyId,
        buyerName: party.name || "",
        phone: party.phoneNumber || party.phone || "",
        gstin: party.gstin || "",
        address: party.billingAddress || party.address || "",
      });
    }
  };

  const handleTypeChange = (type) => {
    onChange({
      ...buyerDetails,
      buyerType: type, // "walk-in", "party", "gst"
      // Clear fields if switching to walk-in
      ...(type === "walk-in" && {
        buyerParty: "",
        buyerName: "Walk-in Buyer",
        phone: "",
        gstin: "",
        address: "",
      }),
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5">
      <div className="flex justify-between items-center border-b border-gray-100 pb-3">
        <h3 className="font-bold text-gray-800 text-sm tracking-wide uppercase">Step 1: Buyer Details</h3>
        <div className="flex gap-2">
          {[
            { key: "walk-in", label: "Walk-in" },
            { key: "party", label: "Existing Party" },
            { key: "gst", label: "GST Registered" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => handleTypeChange(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                buyerDetails.buyerType === t.key
                  ? "bg-brand-50 border-brand-600 text-brand-700 shadow-sm"
                  : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Party Selector */}
        {buyerDetails.buyerType !== "walk-in" && (
          <div className="col-span-1 md:col-span-2">
            <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">
              Select Existing Buyer Party
            </label>
            {loading ? (
              <p className="text-xs text-gray-400 italic">Loading parties list...</p>
            ) : (
              <select
                value={buyerDetails.buyerParty || ""}
                onChange={handlePartyChange}
                className="w-full border border-gray-200 bg-white px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="">-- Choose Party --</option>
                {parties
                  .filter((p) => buyerDetails.buyerType !== "gst" || p.gstin)
                  .map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} {p.gstin ? `(${p.gstin})` : ""}
                    </option>
                  ))}
              </select>
            )}
          </div>
        )}

        {/* Buyer Name */}
        <div>
          <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">
            Buyer Name *
          </label>
          <input
            type="text"
            required
            value={buyerDetails.buyerName || ""}
            onChange={(e) => onChange({ ...buyerDetails, buyerName: e.target.value })}
            placeholder="Enter Buyer Name"
            disabled={buyerDetails.buyerType === "walk-in"}
            className="w-full border border-gray-200 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">
            Phone Number
          </label>
          <input
            type="tel"
            maxLength={10}
            value={buyerDetails.phone || ""}
            onChange={(e) => onChange({ ...buyerDetails, phone: e.target.value.replace(/\D/g, "") })}
            placeholder="e.g. 9876543210"
            className="w-full border border-gray-200 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* GSTIN */}
        {buyerDetails.buyerType === "gst" && (
          <div className="col-span-1 md:col-span-2">
            <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">
              GSTIN
            </label>
            <input
              type="text"
              maxLength={15}
              value={buyerDetails.gstin || ""}
              onChange={(e) => onChange({ ...buyerDetails, gstin: e.target.value.toUpperCase() })}
              placeholder="e.g. 27AAAAA1111A1Z1"
              className="w-full border border-gray-200 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>
        )}

        {/* Address */}
        <div className="col-span-1 md:col-span-2">
          <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">
            Billing Address
          </label>
          <textarea
            rows={2}
            value={buyerDetails.address || ""}
            onChange={(e) => onChange({ ...buyerDetails, address: e.target.value })}
            placeholder="Enter complete billing address"
            className="w-full border border-gray-200 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Billing Type (Cash, Credit) */}
        <div>
          <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">
            Billing Type
          </label>
          <div className="flex gap-2">
            {["Cash", "Credit"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onChange({ ...buyerDetails, billingType: type })}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${
                  buyerDetails.billingType === type
                    ? "bg-brand-50 border-brand-600 text-brand-700 shadow-sm"
                    : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Received Amount */}
        <div>
          <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">
            Received Amount (₹)
          </label>
          <input
            type="number"
            value={buyerDetails.receivedAmount || ""}
            onChange={(e) => onChange({ ...buyerDetails, receivedAmount: e.target.value })}
            placeholder="Enter amount received"
            className="w-full border border-gray-200 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>
    </div>
  );
}

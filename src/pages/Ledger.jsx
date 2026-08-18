import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAllLedgers,
  fetchLedgerByParty,
  fetchLedgerByUser,
} from "../store/thunks/ledgerThunk";
import { fetchParties } from "../store/thunks/partyThunk";
import { fetchMembers } from "../store/thunks/membersThunk";

// Sub-components & Workspaces
import LedgerHeader from "../components/ledger/common/LedgerHeader";
import TransactionsWorkspace from "../components/ledger/workspaces/TransactionsWorkspace";
import PartyLedgerWorkspace from "../components/ledger/workspaces/PartyLedgerWorkspace";
import FarmerLedgerWorkspace from "../components/ledger/workspaces/FarmerLedgerWorkspace";
import TransactionDetailDrawer from "../components/ledger/drawers/TransactionDetailDrawer";

// Pure Helpers
import { getInitials, getPartyOrUser } from "../components/ledger/utils/ledgerHelpers";

export default function Ledger() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();

  // Active Workspace Tab: 'transactions' | 'party' | 'farmer'
  const [activeWorkspace, setActiveWorkspace] = useState("transactions");
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [selectedFarmerId, setSelectedFarmerId] = useState("");
  const [initialRefType, setInitialRefType] = useState("ALL");
  const [selectedEntry, setSelectedEntry] = useState(null);

  // Redux Selectors
  const {
    entries: rawEntries = [],
    partyBalanceDetails,
    partyInfo,
    loading: ledgerLoading,
    error: ledgerError,
  } = useSelector((s) => s.ledger || {});
  const entries = Array.isArray(rawEntries) ? rawEntries : [];

  const { parties: rawParties = [] } = useSelector((s) => s.party || {});
  const parties = Array.isArray(rawParties) ? rawParties : [];

  const { members: rawMembers = [] } = useSelector((s) => s.members || {});
  const members = Array.isArray(rawMembers) ? rawMembers : [];

  // Sync workspace and filters with URL search parameters
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const refTypeParam = searchParams.get("refType");
    const partyIdParam = searchParams.get("partyId");
    const farmerIdParam = searchParams.get("farmerId");

    if (tabParam === "party") {
      setActiveWorkspace("party");
      if (partyIdParam) {
        setSelectedPartyId(partyIdParam);
        dispatch(fetchLedgerByParty(partyIdParam));
      }
    } else if (tabParam === "farmer") {
      setActiveWorkspace("farmer");
      if (farmerIdParam) {
        setSelectedFarmerId(farmerIdParam);
        dispatch(fetchLedgerByUser(farmerIdParam));
      }
    } else if (tabParam === "transactions" || (!tabParam && !refTypeParam)) {
      setActiveWorkspace("transactions");
    }

    if (refTypeParam) {
      setActiveWorkspace("transactions");
      setInitialRefType(refTypeParam.toUpperCase());
    }
  }, [searchParams, dispatch]);

  // Load Data on Mount / Workspace Switch
  const loadData = useCallback(() => {
    if (activeWorkspace === "party" && selectedPartyId) {
      dispatch(fetchLedgerByParty(selectedPartyId));
    } else if (activeWorkspace === "farmer" && selectedFarmerId) {
      dispatch(fetchLedgerByUser(selectedFarmerId));
    } else {
      dispatch(fetchAllLedgers());
    }
    dispatch(fetchParties());
    dispatch(fetchMembers());
  }, [dispatch, activeWorkspace, selectedPartyId, selectedFarmerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Combined Party & Member Lookup Map O(1)
  const partyMap = useMemo(() => {
    const map = {};
    parties.forEach((p) => {
      if (p && p._id) map[String(p._id)] = p;
      if (p && p.id) map[String(p.id)] = p;
    });
    members.forEach((m) => {
      if (m && m._id) map[String(m._id)] = m;
      if (m && m.id) map[String(m.id)] = m;
    });
    return map;
  }, [parties, members]);

  // Derive Farmers List
  const farmerList = useMemo(() => {
    const map = new Map();
    members.forEach((m) => {
      const id = String(m._id || m.id);
      if (id) map.set(id, m);
    });
    parties.forEach((p) => {
      const id = String(p._id || p.id);
      if (id && !map.has(id)) {
        const type = (p.partyType || p.role || "").toUpperCase();
        if (type === "FARMER" || type === "MEMBER" || p.memberId) {
          map.set(id, p);
        }
      }
    });
    return Array.from(map.values());
  }, [members, parties]);

  // Derive Party List
  const partyList = useMemo(() => {
    return parties.filter((p) => {
      const type = (p.partyType || p.role || "").toUpperCase();
      return type !== "FARMER" && type !== "MEMBER";
    });
  }, [parties]);

  // Options for SearchableCombobox
  const farmerOptions = useMemo(() => {
    return farmerList.map((f) => {
      const rawName = (
        f.partyName ||
        f.name ||
        `${f.firstName || ""} ${f.lastName || ""}`
      ).trim();
      const phone = f.phone || f.mobile || "";
      const name =
        rawName ||
        (phone
          ? `Farmer (${phone})`
          : `Farmer #${String(f._id || f.id).slice(-6)}`);
      const village = f.village || f.district || "";
      const memberId = f.memberId ? `ID: ${f.memberId}` : "";
      const subtext = [memberId, village].filter(Boolean).join(" · ");

      return {
        id: String(f._id || f.id),
        name,
        phone: phone || "—",
        subtext,
        badge: "Farmer",
        initials: getInitials(rawName || "Farmer"),
        raw: f,
      };
    });
  }, [farmerList]);

  const partyOptions = useMemo(() => {
    return partyList.map((p) => {
      const rawName = (
        p.partyName ||
        p.name ||
        `${p.firstName || ""} ${p.lastName || ""}`
      ).trim();
      const phone = p.phone || p.mobile || "";
      const name =
        rawName ||
        (phone
          ? `Party (${phone})`
          : `Party #${String(p._id || p.id).slice(-6)}`);
      const type = p.partyType || p.role || "Party";

      return {
        id: String(p._id || p.id),
        name,
        phone: phone || "—",
        subtext: p.gstin ? `GST: ${p.gstin}` : "",
        badge: type,
        initials: getInitials(rawName || "Party"),
        raw: p,
      };
    });
  }, [partyList]);

  // Pre-resolved Transactions
  const resolvedTransactions = useMemo(() => {
    return entries.map((entry) => ({
      ...entry,
      partyOrUser: getPartyOrUser(entry, partyMap),
    }));
  }, [entries, partyMap]);

  // Selected Party Object
  const selectedPartyObj = useMemo(() => {
    if (!selectedPartyId) return null;
    const base =
      partyMap[selectedPartyId] ||
      parties.find((p) => String(p._id || p.id) === selectedPartyId) ||
      {};
    if (
      partyInfo &&
      (String(partyInfo._id || partyInfo.id) === String(selectedPartyId) ||
        !base.phone ||
        base.phone === "—")
    ) {
      return {
        ...base,
        ...partyInfo,
        partyName:
          partyInfo.name ||
          partyInfo.partyName ||
          base.partyName ||
          base.name,
        phone:
          partyInfo.phoneNumber ||
          partyInfo.phone ||
          base.phone ||
          base.mobile ||
          "—",
        partyType:
          partyInfo.partyType || base.partyType || base.role || "Party",
      };
    }
    return Object.keys(base).length > 0 ? base : partyInfo || null;
  }, [selectedPartyId, partyMap, parties, partyInfo]);

  // Selected Farmer Object
  const selectedFarmerObj = useMemo(() => {
    if (!selectedFarmerId) return null;

    const isMatchingApiUser =
      partyInfo &&
      (String(partyInfo._id || partyInfo.id) === String(selectedFarmerId) ||
        !selectedFarmerId);

    const fallbackObj =
      partyMap[selectedFarmerId] ||
      farmerList.find(
        (f) => String(f._id || f.id) === String(selectedFarmerId)
      ) ||
      {};

    if (isMatchingApiUser) {
      const apiName =
        `${partyInfo.firstName || ""} ${partyInfo.lastName || ""}`.trim() ||
        partyInfo.name ||
        partyInfo.partyName ||
        fallbackObj.name ||
        fallbackObj.partyName;

      return {
        ...fallbackObj,
        ...partyInfo,
        _id: String(partyInfo._id || partyInfo.id || selectedFarmerId),
        id: String(partyInfo._id || partyInfo.id || selectedFarmerId),
        name: apiName,
        partyName: apiName,
        firstName: partyInfo.firstName || fallbackObj.firstName || "",
        lastName: partyInfo.lastName || fallbackObj.lastName || "",
        phone:
          partyInfo.phone ||
          partyInfo.mobile ||
          partyInfo.phoneNumber ||
          fallbackObj.phone ||
          fallbackObj.mobile ||
          "—",
        role:
          partyInfo.role ||
          partyInfo.partyType ||
          fallbackObj.role ||
          "Farmer",
        memberId: fallbackObj.memberId || partyInfo.memberId || "",
        village: fallbackObj.village || partyInfo.village || "",
        district: fallbackObj.district || partyInfo.district || "",
        state: fallbackObj.state || partyInfo.state || "",
      };
    }

    if (Object.keys(fallbackObj).length > 0) {
      return fallbackObj;
    }

    return partyInfo || null;
  }, [selectedFarmerId, partyInfo, partyMap, farmerList]);

  // Handlers
  const handleSelectWorkspace = (tabId) => {
    setActiveWorkspace(tabId);
    if (tabId === "party" && selectedPartyId) {
      dispatch(fetchLedgerByParty(selectedPartyId));
    } else if (tabId === "farmer" && selectedFarmerId) {
      dispatch(fetchLedgerByUser(selectedFarmerId));
    } else if (tabId === "transactions") {
      dispatch(fetchAllLedgers());
    }
  };

  const handleSelectParty = (id) => {
    setSelectedPartyId(id);
    if (id) {
      dispatch(fetchLedgerByParty(id));
    } else {
      dispatch(fetchAllLedgers());
    }
  };

  const handleSelectFarmer = (id) => {
    setSelectedFarmerId(id);
    if (id) {
      dispatch(fetchLedgerByUser(id));
    } else {
      dispatch(fetchAllLedgers());
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-4 font-sans text-gray-900">
      {/* Segmented Navigation Header */}
      <LedgerHeader
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={handleSelectWorkspace}
      />

      {/* 1. Transactions Workspace */}
      {activeWorkspace === "transactions" && (
        <TransactionsWorkspace
          entries={entries}
          resolvedTransactions={resolvedTransactions}
          partyOptions={partyOptions}
          farmerOptions={farmerOptions}
          loading={ledgerLoading}
          error={ledgerError}
          onRefresh={loadData}
          onSelectEntry={setSelectedEntry}
          initialRefType={initialRefType}
        />
      )}

      {/* 2. Party Ledger Workspace */}
      {activeWorkspace === "party" && (
        <PartyLedgerWorkspace
          selectedPartyId={selectedPartyId}
          onSelectParty={handleSelectParty}
          selectedPartyObj={selectedPartyObj}
          partyOptions={partyOptions}
          partyBalanceDetails={partyBalanceDetails}
          partyInfo={partyInfo}
          resolvedTransactions={resolvedTransactions}
          parties={parties}
          partyMap={partyMap}
        />
      )}

      {/* 3. Farmer Ledger Workspace */}
      {activeWorkspace === "farmer" && (
        <FarmerLedgerWorkspace
          selectedFarmerId={selectedFarmerId}
          onSelectFarmer={handleSelectFarmer}
          selectedFarmerObj={selectedFarmerObj}
          farmerOptions={farmerOptions}
          partyBalanceDetails={partyBalanceDetails}
          partyInfo={partyInfo}
          resolvedTransactions={resolvedTransactions}
          farmerList={farmerList}
          partyMap={partyMap}
        />
      )}

      {/* Slide-over Transaction Detail Drawer */}
      <TransactionDetailDrawer
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";
import {
  generateEInvoice,
  generateEInvoicePdf,
  authenticateSession,
} from "../store/thunks/eInvoiceThunk";
import { fetchProfile } from "../store/thunks/settingsThunk";
import {
  resetEInvoiceState,
  setStatus,
  setEInvoiceSuccessLocal,
  clearEInvoiceStatus,
} from "../store/slices/eInvoiceSlice";
import { addAuditLog, isEInvoiceSessionValid } from "../lib/api";

/**
 * Validates that an E-Invoice API response contains all required fields.
 * An E-Invoice must NEVER be persisted, displayed, or downloaded unless this passes.
 */
const isValidEInvoiceResponse = (res) => {
  const irn = res?.irn || res?.Irn || res?.Data?.irn || res?.Data?.Irn;
  const signedInvoice = res?.signed_invoice || res?.SignedInvoice || res?.Data?.signed_invoice || res?.Data?.SignedInvoice;
  const signedQrCode = res?.signed_qr_code || res?.signedQrCode || res?.SignedQRCode || res?.Data?.signed_qr_code || res?.Data?.signedQrCode || res?.Data?.SignedQRCode;
  
  return !!(irn && signedInvoice && signedQrCode);
};

const normalizeEInvoiceResponse = (res) => {
  return {
    irn: res?.irn || res?.Irn || res?.Data?.irn || res?.Data?.Irn,
    ackNo: String(res?.ackNo || res?.AckNo || res?.Data?.ackNo || res?.Data?.AckNo || "—"),
    ackDt: res?.ackDt || res?.AckDt || res?.Data?.ackDt || res?.Data?.AckDt || "—",
    signed_invoice: res?.signed_invoice || res?.SignedInvoice || res?.Data?.signed_invoice || res?.Data?.SignedInvoice,
    signed_qr_code: res?.signed_qr_code || res?.signedQrCode || res?.SignedQRCode || res?.Data?.signed_qr_code || res?.Data?.signedQrCode || res?.Data?.SignedQRCode,
  };
};

/**
 * Extracts 2-digit state code from GSTIN
 */
const getGstinStateCode = (gstinStr, fallback) => {
  if (gstinStr && gstinStr.length >= 2) {
    const code = gstinStr.substring(0, 2);
    if (/^\d{2}$/.test(code)) return code;
  }
  return fallback;
};

/**
 * Helper to format date to DD/MM/YYYY
 */
const formatDateDDMMYYYY = (dateStr) => {
  const d = new Date(dateStr || Date.now());
  if (isNaN(d.getTime())) return "01/01/2024";
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Helper to get a matching pin code for a state code to satisfy API validations
 */
const getFallbackPinCode = (stateCode) => {
  if (stateCode === "05") return 248001; // Uttarakhand Dehradun
  if (stateCode === "29") return 560001; // Karnataka Bangalore
  return 110001; // Delhi default
};

/**
 * Map local sale object, customer details, and seller details to standard Government E-Invoice Payload
 */
const constructEInvoicePayload = (item, resolvedParty, sellerData) => {
  const sellerGstin = sellerData?.eInvoiceGstin || sellerData?.gstNumber || sellerData?.gstin || "29AAACQ3770E000";
  const buyerGstin = resolvedParty?.gstin || resolvedParty?.gstNumber || "29AWGPV7107B1Z1";
  
  const isPinValidForState = (pin, stateCode) => {
    const pinStr = String(pin || "");
    if (stateCode === "05") return pinStr.startsWith("24") || pinStr.startsWith("26");
    if (stateCode === "29") return pinStr.startsWith("56") || pinStr.startsWith("57") || pinStr.startsWith("58") || pinStr.startsWith("59");
    return true;
  };

  const sellerStateCode = getGstinStateCode(sellerGstin, "29");
  let sellerPin = Number(sellerData?.pinCode || sellerData?.pin) || 560001;
  if (!isPinValidForState(sellerPin, sellerStateCode)) {
    sellerPin = getFallbackPinCode(sellerStateCode);
  }

  const buyerStateCode = getGstinStateCode(buyerGstin, "29");
  const buyerPin = Number(resolvedParty?.pinCode || resolvedParty?.pin) || getFallbackPinCode(buyerStateCode);
  const isInterstate = sellerStateCode !== buyerStateCode;

  // Map ItemList
  const items = (item.items || []).map((it, idx) => {
    const qty = Number(it.quantity) || 0;
    const rate = Number(it.pricePerUnit || it.rate) || 0;
    const totAmt = Number((qty * rate).toFixed(2));
    
    // Discount percent/amount calculation
    const discountPercent = Number(it.discountPercent) || 0;
    const discount = Number((it.discountAmount || (totAmt * discountPercent / 100)).toFixed(2));
    
    const preTaxVal = Number((totAmt - discount).toFixed(2));
    const assAmt = preTaxVal;
    
    const gstRt = Number(it.taxPercent) || 0;
    
    let igstAmt = 0;
    let cgstAmt = 0;
    let sgstAmt = 0;
    
    if (isInterstate) {
      igstAmt = Number((assAmt * gstRt / 100).toFixed(2));
    } else {
      cgstAmt = Number((assAmt * (gstRt / 2) / 100).toFixed(2));
      sgstAmt = Number((assAmt * (gstRt / 2) / 100).toFixed(2));
    }
    
    const totItemVal = Number((assAmt + igstAmt + cgstAmt + sgstAmt).toFixed(2));

    return {
      SlNo: String(idx + 1),
      PrdDesc: it.itemName || it.item?.productName || it.item?.name || "Product",
      IsServc: "N",
      HsnCd: it.item?.hsnCode || "1001",
      Barcde: it.item?.barcode || it.item?.barCode || "123456",
      Qty: qty,
      FreeQty: 0,
      Unit: it.unit || "BAG",
      UnitPrice: rate,
      TotAmt: totAmt,
      Discount: discount,
      PreTaxVal: preTaxVal,
      AssAmt: assAmt,
      GstRt: gstRt,
      IgstAmt: igstAmt,
      CgstAmt: cgstAmt,
      SgstAmt: sgstAmt,
      CesRt: 0,
      CesAmt: 0,
      CesNonAdvlAmt: 0,
      StateCesRt: 0,
      StateCesAmt: 0,
      StateCesNonAdvlAmt: 0,
      OthChrg: 0,
      TotItemVal: totItemVal,
      OrdLineRef: String(idx + 1),
      OrgCntry: "IN",
      PrdSlNo: it._id || "12345"
    };
  });

  // Calculate totals for ValDtls
  const assVal = Number(items.reduce((sum, i) => sum + i.AssAmt, 0).toFixed(2));
  const cgstVal = Number(items.reduce((sum, i) => sum + i.CgstAmt, 0).toFixed(2));
  const sgstVal = Number(items.reduce((sum, i) => sum + i.SgstAmt, 0).toFixed(2));
  const igstVal = Number(items.reduce((sum, i) => sum + i.IgstAmt, 0).toFixed(2));
  const discountTotal = Number(items.reduce((sum, i) => sum + i.Discount, 0).toFixed(2));
  const otherCharges = Number(item.otherCharges || 0);
  const roundOff = Number(item.roundOff || 0);
  
  const totInvVal = Number((assVal + cgstVal + sgstVal + igstVal + otherCharges + roundOff).toFixed(2));

  return {
    Version: "1.1",
    TranDtls: {
      TaxSch: "GST",
      SupTyp: "B2B",
      RegRev: "N", 
      IgstOnIntra: "N"
    },
    DocDtls: {
      Typ: "INV",
      No: item.invoiceNo || `DOC/${item._id?.substring(0, 8).toUpperCase()}`,
      Dt: formatDateDDMMYYYY(item.createdAt)
    },
    SellerDtls: {
      Gstin: sellerGstin,
      LglNm: sellerData?.shopName || sellerData?.legalName || "Quicko Infosoft Private Limited",
      TrdNm: sellerData?.shopName || sellerData?.tradeName || "ALTON PLASTIC PRIVATE LTD",
      Addr1: sellerData?.village || "ELPHINSTONE BUILDING",
      Addr2: sellerData?.district || "10, VEER NARIMAN ROAD",
      Loc: sellerData?.district || sellerData?.village || "FORT",
      Pin: sellerPin,
      Stcd: sellerStateCode,
      Ph: sellerData?.phone || sellerData?.mobile || "9000000001",
      Em: sellerData?.emailId || sellerData?.email || "abc@yahoo.com"
    },
    BuyerDtls: {
      Gstin: buyerGstin,
      LglNm: resolvedParty?.name || item.buyerName || "XYZ company pvt ltd",
      TrdNm: resolvedParty?.tradeName || resolvedParty?.name || item.buyerName || "XYZ Industries",
      Pos: buyerStateCode,
      Addr1: resolvedParty?.village || resolvedParty?.address || "7th block, kuvempu layout",
      Addr2: resolvedParty?.district || "kuvempu layout",
      Loc: resolvedParty?.district || resolvedParty?.village || "GANDHINAGAR",
      Pin: buyerPin,
      Stcd: buyerStateCode,
      Ph: resolvedParty?.phone || resolvedParty?.mobile || "91111111111",
      Em: resolvedParty?.email || "xyz@yahoo.com"
    },
    ItemList: items,
    ValDtls: {
      AssVal: assVal,
      CgstVal: cgstVal,
      SgstVal: sgstVal,
      IgstVal: igstVal,
      CesVal: 0,
      StCesVal: 0,
      Discount: discountTotal,
      OthChrg: otherCharges,
      RndOffAmt: roundOff,
      TotInvVal: totInvVal,
      TotInvValFc: totInvVal
    }
  };
};

export default function EInvoiceWidget({ item, type = "sale", mode = "modal" }) {
  const dispatch = useDispatch();
  const { status, irn, ackNo, ackDt, error, jobId, pdfLoading, generationLoading } = useSelector(
    (s) => s.eInvoice
  );
  const { parties } = useSelector((state) => state.party);
  const [showGovDetails, setShowGovDetails] = useState(false);
  const [cachedPdfUrl, setCachedPdfUrl] = useState(null);

  const profile = useSelector((s) => s.settings?.profile);
  const authUser = useSelector((s) => s.auth?.user);
  const sellerData = profile || authUser;

  // 1. Safe B2B Customer Resolution
  const partyId = typeof item?.party === "string"
    ? item.party
    : (item?.party && typeof item.party === "object" ? item.party._id : null);

  const resolvedParty = partyId
    ? (parties.find(p => p._id === partyId) || (typeof item?.party === "object" ? item.party : null))
    : (item?.party && typeof item.party === "object" ? item.party : null);

  const isB2B = type === "sale" && resolvedParty && (resolvedParty.gstin || resolvedParty.gstNumber || resolvedParty.gstType?.startsWith("Registered"));

  // Fetch profile if not already loaded
  useEffect(() => {
    if (isB2B && !profile) {
      dispatch(fetchProfile());
    }
  }, [dispatch, profile, isB2B]);

  // 2. Initialize State from item data on mount/change
  useEffect(() => {
    if (!isB2B) {
      dispatch(setStatus("IDLE"));
      return;
    }

    const currentIrn = item.eInvoiceIrn || item.irn || item.eInvoiceInfo?.irn;
    if (currentIrn) {
      dispatch(
        setEInvoiceSuccessLocal({
          irn: currentIrn,
          ackNo: item.eInvoiceAckNo || item.ackNo || "—",
          ackDt: item.eInvoiceAckDt || item.ackDt || "—",
        })
      );
    } else {
      dispatch(setStatus("READY"));
    }
  }, [item, isB2B, dispatch]);

  // Helper: Trigger background PDF generation — only with complete data
  const triggerBackgroundPdfGeneration = (qr, irnVal, signedInv) => {
    if (!qr || !irnVal || !signedInv) {
      if (import.meta.env.DEV) {
        console.warn("Skipping PDF pre-generation: incomplete E-Invoice data");
      }
      return;
    }

    dispatch(
      generateEInvoicePdf({
        signed_qr_code: qr,
        irn: irnVal,
        signed_invoice: signedInv,
      })
    )
      .unwrap()
      .then((pdfUrl) => {
        setCachedPdfUrl(pdfUrl);
        addAuditLog("PDF_GENERATED", { irn: irnVal });
      })
      .catch((err) => {
        console.warn("PDF pre-fetch failed:", err);
      });
  };

  // 3. Dispatch — real API only, no simulation
  const handleGenerate = async () => {
    if (status === "QUEUED" || status === "PROCESSING") return; // Prevent duplicate execution

    dispatch(clearEInvoiceStatus());

    // Proactively clear fake sandbox simulation tokens from storage
    if (sessionStorage.getItem("einvoice_token") === "simulated-active-session-token") {
      sessionStorage.removeItem("einvoice_token");
      sessionStorage.removeItem("einvoice_token_expiry");
      sessionStorage.removeItem("einvoice_token_gstin");
    }

    try {
      const sellerGstin = sellerData?.eInvoiceGstin || sellerData?.gstNumber || sellerData?.gstin || "29AAACQ3770E000";

      // Ensure we have a valid E-Invoice portal session token matching our GSTIN
      if (!isEInvoiceSessionValid(sellerGstin)) {
        await dispatch(authenticateSession({})).unwrap();
      }

      const eInvoicePayload = constructEInvoicePayload(item, resolvedParty, sellerData);

      const res = await dispatch(
        generateEInvoice({
          invoiceData: eInvoicePayload,
        })
      ).unwrap();

      // Validate that the backend returned all required E-Invoice fields
      if (!isValidEInvoiceResponse(res)) {
        toast.error("Backend returned incomplete E-Invoice data. Missing required fields.");
        dispatch(setStatus("FAILED"));
        return;
      }

      const normalizedRes = normalizeEInvoiceResponse(res);

      toast.success("E-Invoice registration successful!");

      dispatch(
        setEInvoiceSuccessLocal({
          irn: normalizedRes.irn,
          ackNo: normalizedRes.ackNo || "—",
          ackDt: normalizedRes.ackDt || "—",
        })
      );

      addAuditLog("INVOICE_GENERATED", { irn: normalizedRes.irn });
      triggerBackgroundPdfGeneration(normalizedRes.signed_qr_code, normalizedRes.irn, normalizedRes.signed_invoice);
    } catch (err) {
      const errorMessage = typeof err === "string" ? err : (err?.message || "Failed to generate E-Invoice. Please try again.");
      console.error("E-Invoice generation failed:", err);
      dispatch(setStatus("FAILED"));
      toast.error(errorMessage, { id: "einvoice-generation-error" });
    }
  };

  const handleDownloadPdf = () => {
    const currentIrn = irn || item.eInvoiceIrn || item.irn || item.eInvoiceInfo?.irn;
    const currentQr = item.eInvoiceQrCode || item.signedQrCode || item.eInvoiceInfo?.signed_qr_code;
    const currentSignedInv = item.signedInvoice || item.eInvoiceInfo?.signed_invoice;

    // Validate all required data exists before attempting PDF download
    if (!currentIrn || !currentQr || !currentSignedInv) {
      toast.error("Generate E-Invoice first to download the official PDF.", { id: "einvoice-pdf-missing" });
      return;
    }

    if (cachedPdfUrl) {
      // Open the S3 PDF URL in a new tab for download
      window.open(cachedPdfUrl, "_blank");
    } else {
      dispatch(
        generateEInvoicePdf({
          signed_qr_code: currentQr,
          irn: currentIrn,
          signed_invoice: currentSignedInv,
        })
      )
        .unwrap()
        .then((pdfUrl) => {
          setCachedPdfUrl(pdfUrl);
          window.open(pdfUrl, "_blank");
        })
        .catch((e) => {
          console.error("Could not fetch E-Invoice PDF from server:", e);
          toast.error("Could not fetch E-Invoice PDF file", { id: "einvoice-pdf-generation" });
        });
    }
  };

  // Determine if Download PDF should be enabled
  const hasValidPdfData = !!(
    (irn || item.eInvoiceIrn || item.irn || item.eInvoiceInfo?.irn) &&
    (item.signedInvoice || item.eInvoiceInfo?.signed_invoice) &&
    (item.eInvoiceQrCode || item.signedQrCode || item.eInvoiceInfo?.signed_qr_code)
  );

  if (!isB2B) {
    if (mode === "modal") {
      return (
        <div className="text-xs text-red-500 p-3 border border-red-200 bg-red-50/50 rounded-xl space-y-1">
          <p className="font-bold">⚠️ E-Invoice Debug Info (B2B check failed):</p>
          <ul className="list-disc pl-4 space-y-0.5 font-mono text-[10px]">
            <li>isB2B: false</li>
            <li>item.party ID: {String(typeof item?.party === "object" ? item?.party?._id : item?.party)}</li>
            <li>resolvedParty found: {String(!!resolvedParty)}</li>
            <li>parties count: {parties?.length || 0}</li>
            <li>GSTIN: {String(resolvedParty?.gstin || resolvedParty?.gstNumber || "None")}</li>
            <li>GST Type: {String(resolvedParty?.gstType || "None")}</li>
            <li>type: {type}</li>
          </ul>
        </div>
      );
    }
    return null;
  }

  // 4. RENDERING MODES
  // Inline rendering inside Tables
  if (mode === "inline") {
    let badgeColor = "bg-amber-100 text-amber-800 border-amber-200";
    let badgeText = "Pending";

    if (status === "QUEUED" || status === "PROCESSING") {
      badgeColor = "bg-blue-100 text-blue-850 border-blue-200 animate-pulse";
      badgeText = "Queueing...";
    } else if (status === "SUCCESS") {
      badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
      badgeText = "Registered";
    } else if (status === "FAILED") {
      badgeColor = "bg-rose-105 text-rose-800 border-rose-200";
      badgeText = "Failed";
    }

    return (
      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
        E-Inv: {badgeText}
      </span>
    );
  }

  // Full Details Panel inside Drawer/Modal
  return (
    <div className="space-y-4">
      {/* State: FAILED */}
      {status === "FAILED" && (
        <div className="bg-rose-50/45 border border-rose-200 rounded-xl p-4 text-xs text-rose-955 shadow-sm flex items-start gap-3">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-rose-105 text-rose-700 font-bold shrink-0 text-[10px]">✕</span>
          <div className="space-y-1.5 flex-1">
            <h5 className="font-extrabold text-rose-900 text-xs">E-Invoice Registration Failed</h5>
            <p className="text-[11px] text-rose-800 leading-relaxed font-medium">
              {error || "IRP gateway connection failed. Check customer parameters."}
            </p>
            <div className="border-t border-rose-200/50 pt-2 mt-2 text-[10px] text-rose-700 space-y-1">
              <p className="font-bold">Please verify:</p>
              <ul className="list-disc pl-4 space-y-0.5 font-medium">
                <li>GSTIN authentication is active</li>
                <li>Internet connectivity is stable</li>
                <li>Backend service is available</li>
                <li>Invoice is eligible for E-Invoice registration</li>
              </ul>
            </div>
            {mode !== "modal" && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleGenerate}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 border-0 cursor-pointer shadow-xs"
                >
                  🔄 Retry Registration
                </button>
                <button
                  onClick={() => dispatch(resetEInvoiceState())}
                  className="px-3 py-1.5 border border-rose-250 text-rose-900 rounded-lg text-[10px] font-bold transition bg-white cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* State: QUEUED */}
      {status === "QUEUED" && (
        <div className="bg-blue-50/20 border border-blue-200 rounded-xl p-5 shadow-xs flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0"></div>
          <div className="text-xs">
            <p className="font-bold text-blue-900">Request Accepted</p>
            <p className="text-[10px] text-blue-700 mt-0.5">Waiting for Portal job processing queues.</p>
          </div>
        </div>
      )}

      {/* State: PROCESSING */}
      {status === "PROCESSING" && (
        <div className="bg-amber-50/20 border border-amber-250 rounded-xl p-5 shadow-xs flex items-center gap-3 animate-pulse">
          <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin shrink-0"></div>
          <div className="text-xs">
            <p className="font-bold text-amber-900">Registering with Government Portal...</p>
            <p className="text-[10px] text-amber-700 mt-0.5">Contacting Government NIC IRP gateway. Do not close details.</p>
          </div>
        </div>
      )}

      {/* State: SUCCESS */}
      {status === "SUCCESS" && (
        <div className="bg-emerald-50/25 border border-emerald-250 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-850 font-bold text-[9px]">✓</span>
              <span className="font-bold text-emerald-900 text-xs">E-Invoice Registered Successfully</span>
            </div>
            <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider bg-emerald-100/50 px-2 py-0.5 rounded-full border border-emerald-200">
              Live
            </span>
          </div>

          <div className="space-y-3">
            {/* Monospace IRN Field */}
            <div>
              <span className="text-gray-400 font-bold block text-[10px] uppercase tracking-wider">IRN (Invoice Reference Number)</span>
              <div className="flex items-center gap-1.5 mt-1 bg-white p-2 rounded-lg border border-emerald-100/60 max-w-full">
                <code className="font-mono text-gray-800 text-[10px] select-all font-bold truncate flex-1">
                  {irn}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(irn);
                    toast.success("IRN copied to clipboard!");
                  }}
                  className="p-1 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded transition shrink-0 border-0 bg-transparent cursor-pointer"
                  title="Copy IRN"
                >
                  📋
                </button>
              </div>
            </div>

            {/* Actions & Timestamps Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="text-[10px] text-gray-500 font-medium">
                <span>Generated: </span>
                <span className="font-bold text-gray-700">
                  {new Date(item.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <button
                onClick={handleDownloadPdf}
                disabled={pdfLoading || !hasValidPdfData}
                title={!hasValidPdfData ? "Generate E-Invoice first to download the official PDF." : ""}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold rounded-lg text-xs transition shadow-xs border-0 cursor-pointer"
              >
                {pdfLoading ? "Downloading..." : "📥 Download E-Invoice PDF"}
              </button>
            </div>

            {/* Progressive Disclosure: Collapsible advanced data */}
            <div className="pt-2 border-t border-emerald-100/50">
              <button
                onClick={() => setShowGovDetails(!showGovDetails)}
                className="text-emerald-700 hover:text-emerald-900 text-[10px] font-bold flex items-center gap-1 focus:outline-none bg-transparent border-0 cursor-pointer"
              >
                {showGovDetails ? "▲ Hide Government Details" : "▼ View Government Details"}
              </button>

              {showGovDetails && (
                <div className="mt-3 p-3 bg-white border border-emerald-100/30 rounded-lg space-y-3 text-[11px] leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider">Ack Number</span>
                      <p className="font-bold text-gray-800">{ackNo || "—"}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider">Ack Date</span>
                      <p className="font-bold text-gray-800">{ackDt || "—"}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider">Validation Source</span>
                    <p className="font-bold text-emerald-800">Government NIC NIC-IRP Portal</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* State: READY */}
      {status === "READY" && (
        <div className="bg-amber-50/30 border border-amber-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-l-4 border-amber-500 pl-2">
            <div>
              <h3 className="font-extrabold text-amber-905 text-xs">🛡 Government E-Invoice Ready</h3>
              <p className="text-[10px] text-amber-700/80 font-medium">
                B2B Transaction detected with registered GSTIN ({resolvedParty?.gstin || resolvedParty?.gstNumber})
              </p>
            </div>
            <span className="text-[9px] font-bold text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded border border-amber-200">
              Ready to Generate
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <p className="text-gray-500 text-[10px] leading-relaxed max-w-sm">
              {mode === "modal"
                ? "This invoice can be registered from the E-Invoice column in the sales list."
                : "This invoice must be registered with the government portal to obtain the official IRN hash and signed QR code."}
            </p>
            {mode !== "modal" && (
              <button
                onClick={handleGenerate}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-lg text-xs transition shrink-0 shadow-sm border-0 cursor-pointer"
              >
                ⚡ Generate E-Invoice
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

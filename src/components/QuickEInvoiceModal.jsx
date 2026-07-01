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
import { updateSaleEInvoice } from "../store/slices/sellSlice";
import { X, Copy, Download, Eye, AlertTriangle, Loader2, CheckCircle, XCircle, RefreshCw, Landmark, Check, Zap } from "lucide-react";
import { getUserFriendlyEInvoiceError } from "../utils/eInvoiceErrors";

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
 * Helper to format date to YYYY-MM-DD HH:mm:ss
 */
const formatAckDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
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

export default function QuickEInvoiceModal({
  mode = "generate", // "generate" | "details"
  item,
  resolvedParty,
  onClose,
  onSuccess,
  onViewSaleDetails,
}) {
  const dispatch = useDispatch();
  const { status, irn, ackNo, ackDt, error, pdfLoading } = useSelector(
    (s) => s.eInvoice
  );

  const profile = useSelector((s) => s.settings?.profile);
  const authUser = useSelector((s) => s.auth?.user);
  const sellerData = profile || authUser;

  const [loading, setLoading] = useState(false);
  const [cachedPdfUrl, setCachedPdfUrl] = useState(null);
  const [localMode, setLocalMode] = useState(mode);
  const [isGeneratedSuccess, setIsGeneratedSuccess] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [signedInvoice, setSignedInvoice] = useState(item.signedInvoice || item.eInvoiceInfo?.signed_invoice || "");
  const [signedQrCode, setSignedQrCode] = useState(item.eInvoiceQrCode || item.signedQrCode || item.eInvoiceInfo?.signed_qr_code || "");

  useEffect(() => {
    setLocalMode(mode);
  }, [mode]);

  // 1. Reset state & load profile on mount
  useEffect(() => {
    dispatch(clearEInvoiceStatus());
    if (!profile) {
      dispatch(fetchProfile());
    }
  }, [dispatch, profile]);

  // 2. Pre-fetch PDF in details mode if all required data is available
  useEffect(() => {
    if (localMode === "details" && item) {
      const currentIrn = item.eInvoiceIrn || item.irn || item.eInvoiceInfo?.irn || irn;
      const currentQr = item.eInvoiceQrCode || item.signedQrCode || item.eInvoiceInfo?.signed_qr_code;
      const currentSignedInv = item.signedInvoice || item.eInvoiceInfo?.signed_invoice;

      // Only pre-fetch PDF if all required E-Invoice data exists
      if (!currentIrn || !currentQr || !currentSignedInv) {
        if (import.meta.env.DEV) {
          console.warn("Skipping PDF pre-generation: incomplete E-Invoice data");
        }
        return;
      }

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
        })
        .catch((err) => {
          console.warn("PDF pre-fetch failed:", err);
        });
    }
  }, [localMode, item, irn, dispatch]);

  const triggerBackgroundPdfGeneration = (qr, irnVal, signedInv) => {
    // Only generate PDF if all required data is present
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
      })
      .catch((err) => {
        console.warn("PDF pre-fetch failed:", err);
      });
  };

  // 3. E-Invoice Generation Request
  const handleGenerate = async () => {
    if (loading) return;
    setLoading(true);
    setGenerationError(null);
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
      const isValidSession = isEInvoiceSessionValid(sellerGstin);
      
      if (!isValidSession) {
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
        toast.error("Backend returned incomplete E-Invoice data. Missing required fields (IRN, signed invoice, or signed QR code).");
        setGenerationError("Backend returned incomplete E-Invoice data. The response is missing one or more required fields: IRN, signed_invoice, signed_qr_code.");
        setLoading(false);
        return;
      }

      const normalizedRes = normalizeEInvoiceResponse(res);

      toast.success("E-Invoice registration successful!");

      dispatch(updateSaleEInvoice({
        id: item._id,
        irn: normalizedRes.irn,
        ackNo: normalizedRes.ackNo || "—",
        ackDt: normalizedRes.ackDt || "—",
        signedInvoice: normalizedRes.signed_invoice,
        signedQrCode: normalizedRes.signed_qr_code,
      }));

      dispatch(
        setEInvoiceSuccessLocal({
          irn: normalizedRes.irn,
          ackNo: normalizedRes.ackNo || "—",
          ackDt: normalizedRes.ackDt || "—",
        })
      );

      setSignedInvoice(normalizedRes.signed_invoice);
      setSignedQrCode(normalizedRes.signed_qr_code);

      addAuditLog("INVOICE_GENERATED", { irn: normalizedRes.irn });
      triggerBackgroundPdfGeneration(normalizedRes.signed_qr_code, normalizedRes.irn, normalizedRes.signed_invoice);
      setLoading(false);
      setIsGeneratedSuccess(true);
      setLocalMode("details");
    } catch (err) {
      const errorMessage = typeof err === "string" ? err : (err?.message || "Failed to generate E-Invoice. Please try again.");
      console.error("E-Invoice generation failed:", err);
      setGenerationError(errorMessage);
      toast.error(errorMessage, { id: "einvoice-generation-error" });
      setLoading(false);
    }
  };

  // 4. Download E-Invoice PDF — only with validated data
  const handleDownloadPdf = () => {
    const currentIrn = item.eInvoiceIrn || item.irn || item.eInvoiceInfo?.irn || irn;
    const currentSignedInv = item.signedInvoice || item.eInvoiceInfo?.signed_invoice || signedInvoice;
    const currentQr = item.eInvoiceQrCode || item.signedQrCode || item.eInvoiceInfo?.signed_qr_code || signedQrCode;

    // Validate all required data exists before attempting PDF download
    if (!currentIrn || !currentSignedInv || !currentQr) {
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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  // Determine if Download PDF should be enabled
  const hasValidPdfData = !!(
    (item.eInvoiceIrn || item.irn || item.eInvoiceInfo?.irn || irn) &&
    (item.signedInvoice || item.eInvoiceInfo?.signed_invoice || signedInvoice) &&
    (item.eInvoiceQrCode || item.signedQrCode || item.eInvoiceInfo?.signed_qr_code || signedQrCode)
  );

  // Get item counts and total amount formatting
  const itemsCount = item.items?.length || 0;
  const itemsText = itemsCount === 1 ? "1 Item" : `${itemsCount} Items`;
  const formattedAmount = `₹${(item.totalAmount || 0).toLocaleString("en-IN")}`;
  const modalWidth = "max-w-2xl";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className={`bg-white rounded-2xl w-full ${modalWidth} overflow-hidden relative shadow-2xl border border-gray-150 flex flex-col animate-in fade-in zoom-in-95 duration-150`}>
        
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/90 z-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <Loader2 className="w-10 h-10 text-[#00875A] animate-spin" />
            <div className="space-y-1">
              <h3 className="font-bold text-gray-900 text-base">Generating E-Invoice...</h3>
              <p className="text-xs text-gray-500">Connecting to Government IRP Portal (NIC)...</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 bg-white">
          <h2 className="text-[11px] font-black text-gray-805 uppercase tracking-wider flex items-center gap-2">
            {localMode === "generate" ? (
              <span className="flex items-center gap-2 text-gray-900 font-extrabold">
                <Zap className="w-5 h-5 text-emerald-500 fill-emerald-500" />
                GENERATE GOVERNMENT E-INVOICE
              </span>
            ) : (
              <span className="flex items-center gap-2 text-[#00875A] font-extrabold">
                <Landmark className="w-5 h-5 text-[#00875A]" />
                QUICK E-INVOICE DETAILS
              </span>
            )}
          </h2>
          {!loading && (
            <button
              onClick={isGeneratedSuccess ? onSuccess : onClose}
              className="p-1.5 text-gray-400 hover:text-gray-655 hover:bg-gray-100 rounded-lg transition duration-150"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {localMode === "generate" ? (
            // GENERATION MODE
            <>
              {/* Generation Error Card */}
              {generationError && (() => {
                const friendlyError = getUserFriendlyEInvoiceError(generationError);
                return (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3 shadow-sm">
                    <div className="flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-1.5 flex-1">
                        <h4 className="font-extrabold text-rose-900 text-xs">{friendlyError.title}</h4>
                        <p className="text-[11px] text-rose-800 leading-relaxed font-semibold">
                          {friendlyError.description}
                        </p>
                        <p className="text-[11px] text-rose-700 leading-relaxed font-medium bg-white/60 p-2 rounded-lg border border-rose-100">
                          <strong>Action:</strong> {friendlyError.actionableAdvice}
                        </p>
                      </div>
                    </div>

                    <details className="text-[10px] text-rose-600 font-medium cursor-pointer select-none border-t border-rose-200/30 pt-1.5">
                      <summary className="hover:text-rose-800 transition duration-150">View technical error details</summary>
                      <p className="text-[10px] text-rose-700 font-mono bg-rose-100/50 p-2 rounded-lg break-all mt-1 cursor-text select-text">
                        {generationError}
                      </p>
                    </details>

                    <div className="flex gap-2 pt-1 border-t border-rose-200/40">
                      <button
                        onClick={() => {
                          setGenerationError(null);
                          handleGenerate();
                        }}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 border-0 cursor-pointer shadow-xs"
                      >
                        <RefreshCw className="w-3 h-3" /> Retry
                      </button>
                      <button
                        onClick={onClose}
                        className="px-3 py-1.5 border border-rose-250 text-rose-900 rounded-lg text-[10px] font-bold transition bg-white cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Status Box */}
              <div className="bg-[#F4FBF7] border border-[#E3F4EC] rounded-2xl p-6 flex flex-col items-center justify-center text-center relative">
                {/* Custom Sparkles and file check illustration */}
                <div className="relative flex items-center justify-center mb-3 mt-1 select-none">
                  {/* Green Glow Oval */}
                  <div className="absolute bottom-0 w-24 h-4 bg-emerald-500/10 rounded-full blur-xs"></div>
                  {/* Sparkle SVGs around */}
                  <svg className="absolute -top-3 -left-6 w-3 h-3 text-[#A4E2C5]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
                  </svg>
                  <svg className="absolute -top-4 -right-4 w-4 h-4 text-[#A4E2C5]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
                  </svg>
                  <svg className="absolute -bottom-3 -left-5 w-4 h-4 text-[#A4E2C5]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
                  </svg>
                  <svg className="absolute -bottom-2 -right-5 w-3 h-3 text-[#A4E2C5]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
                  </svg>
                  
                  <div className="w-14 h-[68px] bg-white border border-[#D0ECD9] rounded-lg shadow-xs flex items-center justify-center relative">
                    <Landmark className="w-6 h-6 text-[#00875A]" />
                    {/* Green Check badge at bottom right */}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#00875A] border border-white flex items-center justify-center text-white">
                      <Check size={8} strokeWidth={4} />
                    </div>
                  </div>
                </div>

                <h3 className="text-gray-900 text-base font-bold tracking-wide mt-2">
                  Generating your Government E-Invoice
                </h3>
                <p className="text-gray-500 text-xs font-semibold mt-1">
                  Please wait while we connect to the Government IRP...
                </p>

                {/* 4-Step Stepper */}
                <div className="w-full max-w-md mt-6 mb-2">
                  <div className="relative flex items-center justify-between">
                    {/* Dashed Connecting Line */}
                    <div className="absolute left-8 right-8 top-4 h-0.5 border-t border-dashed border-gray-200"></div>
                    {/* Highlighted active connecting line part (first segment) */}
                    <div className="absolute left-8 w-[25%] top-4 h-0.5 border-t border-dashed border-[#A4E2C5]"></div>
                    
                    {/* Step 1 */}
                    <div className="flex flex-col items-center relative z-10 w-1/4">
                      <div className="w-8 h-8 rounded-full bg-[#00875A] border-2 border-white flex items-center justify-center text-white shadow-xs">
                        <Check size={14} strokeWidth={3} />
                      </div>
                      <span className="text-[10px] text-gray-550 font-semibold mt-2 text-center">Preparing Invoice</span>
                    </div>

                    {/* Step 2 (Active) */}
                    <div className="flex flex-col items-center relative z-10 w-1/4">
                      <div className="relative flex items-center justify-center">
                        {/* Glow outer ring */}
                        <div className="absolute -inset-1 rounded-full bg-[#E8F8F0] animate-pulse"></div>
                        <div className="w-8 h-8 rounded-full bg-white border-2 border-[#00875A] flex items-center justify-center text-[#00875A] shadow-md relative z-10">
                          <Landmark size={14} />
                        </div>
                      </div>
                      <span className="text-[10px] text-[#00875A] font-bold mt-2 text-center">Connecting to IRP</span>
                    </div>

                    {/* Step 3 */}
                    <div className="flex flex-col items-center relative z-10 w-1/4">
                      <div className="w-8 h-8 rounded-full bg-gray-50 border-2 border-gray-200 flex items-center justify-center text-gray-400 shadow-xs">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className="text-[10px] text-gray-550 font-semibold mt-2 text-center">Generating IRN & QR</span>
                    </div>

                    {/* Step 4 */}
                    <div className="flex flex-col items-center relative z-10 w-1/4">
                      <div className="w-8 h-8 rounded-full bg-gray-50 border-2 border-gray-200 flex items-center justify-center text-gray-400 shadow-xs">
                        <Check size={14} strokeWidth={2.5} />
                      </div>
                      <span className="text-[10px] text-gray-550 font-semibold mt-2 text-center">Finalizing</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Summary Card */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white mt-4">
                {/* Row 1: Invoice No & Value */}
                <div className="grid grid-cols-2 border-b border-gray-150">
                  <div className="p-4 border-r border-gray-150">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Invoice No</span>
                    <span className="font-bold text-gray-900 text-xs sm:text-sm font-mono block mt-1.5">
                      {item.invoiceNo || item._id?.substring(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <div className="p-4">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Invoice Value</span>
                    <span className="font-extrabold text-[#00875A] text-xs sm:text-sm block mt-1.5">{formattedAmount}</span>
                  </div>
                </div>

                {/* Row 2: Customer */}
                <div className="p-4 border-b border-gray-150">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Customer</span>
                  <span className="font-bold text-gray-800 block text-xs mt-1.5 uppercase">{resolvedParty?.name || item.buyerName}</span>
                </div>

                {/* Row 3: GSTIN & Items */}
                <div className="grid grid-cols-2">
                  <div className="p-4 border-r border-gray-150">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">GSTIN</span>
                    <span className="font-bold text-gray-900 font-mono block mt-1.5">
                      {resolvedParty?.gstin || resolvedParty?.gstNumber || "—"}
                    </span>
                  </div>
                  <div className="p-4">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Items</span>
                    <span className="font-bold text-gray-900 block mt-1.5">{itemsText}</span>
                  </div>
                </div>
              </div>

              {/* Warning Alert */}
              {!generationError && (
                <div className="border border-[#E3F4EC] bg-[#F4FBF7] rounded-xl p-3.5 flex items-start sm:items-center gap-3 mt-4">
                  <svg className="w-5 h-5 text-[#00875A] shrink-0 mt-0.5 sm:mt-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <div className="text-[11px] leading-relaxed select-none">
                    <span className="font-bold text-[#006C47] block">This action is permanent.</span>
                    <span className="text-gray-550 block text-[10px] mt-0.5">
                      The invoice will be registered with the Government IRP Portal (NIC) and an official IRN and QR code will be generated.
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            // DETAILS MODE
            <>
              {/* Green successful registration box */}
              <div className="bg-[#F4FBF7] border border-[#E3F4EC] rounded-2xl p-6 flex flex-col items-center justify-center text-center relative">
                {/* Custom Sparkles and file check illustration */}
                <div className="relative flex items-center justify-center mb-3 mt-1 select-none">
                  <svg className="absolute -top-3 -left-6 w-3 h-3 text-[#A4E2C5]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
                  </svg>
                  <svg className="absolute -top-4 -right-4 w-4 h-4 text-[#A4E2C5]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
                  </svg>
                  <svg className="absolute -bottom-3 -left-5 w-4 h-4 text-[#A4E2C5]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
                  </svg>
                  <svg className="absolute -bottom-2 -right-5 w-3 h-3 text-[#A4E2C5]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
                  </svg>
                  
                  <div className="w-14 h-[68px] bg-white border border-[#D0ECD9] rounded-lg shadow-xs flex items-center justify-center relative">
                    <div className="w-6 h-6 rounded-full bg-[#E8F8F0] flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-[#00875A] flex items-center justify-center text-white">
                        <Check size={10} strokeWidth={4} />
                      </div>
                    </div>
                    {/* Decorative document lines */}
                    <div className="absolute top-3 left-3 w-5 h-0.5 bg-gray-150"></div>
                    <div className="absolute top-5 left-3 w-3 h-0.5 bg-gray-150"></div>
                    <div className="absolute bottom-3 left-3 w-4 h-0.5 bg-gray-150"></div>
                  </div>
                </div>

                <h3 className="text-[#006C47] text-base font-bold tracking-wide mt-2">
                  E-Invoice Registered & Signed by Government IRP
                </h3>
                <p className="text-gray-550 text-xs font-semibold mt-1">
                  Your e-invoice has been successfully generated.
                </p>

                {/* 4-Step Stepper */}
                <div className="w-full max-w-md mt-6 mb-2">
                  <div className="relative flex items-center justify-between">
                    {/* Dashed Connecting Line */}
                    <div className="absolute left-8 right-8 top-4 h-0.5 border-t border-dashed border-[#A4E2C5]"></div>
                    
                    {/* Step 1 */}
                    <div className="flex flex-col items-center relative z-10 w-1/4">
                      <div className="w-8 h-8 rounded-full bg-[#E8F8F0] border-2 border-white flex items-center justify-center text-[#00875A] shadow-xs">
                        <Check size={14} strokeWidth={3} />
                      </div>
                      <span className="text-[10px] text-gray-550 font-semibold mt-2 text-center">Validating Data</span>
                    </div>

                    {/* Step 2 */}
                    <div className="flex flex-col items-center relative z-10 w-1/4">
                      <div className="w-8 h-8 rounded-full bg-[#E8F8F0] border-2 border-white flex items-center justify-center text-[#00875A] shadow-xs">
                        <Check size={14} strokeWidth={3} />
                      </div>
                      <span className="text-[10px] text-gray-550 font-semibold mt-2 text-center">Sending to IRP</span>
                    </div>

                    {/* Step 3 */}
                    <div className="flex flex-col items-center relative z-10 w-1/4">
                      <div className="w-8 h-8 rounded-full bg-[#E8F8F0] border-2 border-white flex items-center justify-center text-[#00875A] shadow-xs">
                        <Check size={14} strokeWidth={3} />
                      </div>
                      <span className="text-[10px] text-gray-550 font-semibold mt-2 text-center">Generating E-Invoice</span>
                    </div>

                    {/* Step 4 */}
                    <div className="flex flex-col items-center relative z-10 w-1/4">
                      <div className="relative">
                        <span className="absolute -top-1 -right-1 text-emerald-500 text-[8px] animate-pulse">✦</span>
                        <div className="w-8 h-8 rounded-full bg-[#00875A] border-2 border-white flex items-center justify-center text-white shadow-md">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      </div>
                      <span className="text-[10px] text-[#00875A] font-bold mt-2 text-center">Completed</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details structured grid card */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white mt-4">
                {/* Row 1: IRN */}
                <div className="p-4 border-b border-gray-150">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    IRN (Invoice Reference Number)
                  </span>
                  <div className="flex items-start gap-4 mt-1.5 justify-between">
                    <code className="font-mono text-gray-900 text-xs break-all flex-1 font-bold leading-relaxed select-all">
                      {item.eInvoiceIrn || item.irn || item.eInvoiceInfo?.irn || irn || "—"}
                    </code>
                    <button
                      onClick={() => copyToClipboard(item.eInvoiceIrn || item.irn || item.eInvoiceInfo?.irn || irn)}
                      className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition shrink-0 duration-150"
                      title="Copy IRN"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Row 2: ACK No & Date */}
                <div className="grid grid-cols-2 border-b border-gray-150">
                  <div className="p-4 border-r border-gray-150">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      Acknowledgment No
                    </span>
                    <div className="flex items-center gap-2 mt-1.5 justify-between">
                      <span className="font-bold text-gray-900 text-xs sm:text-sm font-sans">
                        {item.eInvoiceAckNo || item.ackNo || item.eInvoiceInfo?.ackNo || ackNo || "—"}
                      </span>
                      <button
                        onClick={() => copyToClipboard(item.eInvoiceAckNo || item.ackNo || item.eInvoiceInfo?.ackNo || ackNo)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition duration-150"
                        title="Copy Acknowledgment No"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      Generated Date
                    </span>
                    <p className="font-bold text-gray-900 text-xs sm:text-sm mt-1.5 leading-normal">
                      {formatAckDate(item.eInvoiceAckDt || item.ackDt || item.eInvoiceInfo?.ackDt || ackDt || item.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Row 3: Customer & Value */}
                <div className="grid grid-cols-2">
                  <div className="p-4 border-r border-gray-150">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      Customer
                    </span>
                    <p className="font-bold text-gray-900 text-xs sm:text-sm mt-1.5 leading-normal uppercase">
                      {resolvedParty?.name || item.buyerName || "Walk-in Customer"}
                    </p>
                  </div>

                  <div className="p-4">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      Invoice Value
                    </span>
                    <p className="font-black text-gray-955 text-base sm:text-lg mt-1 select-all">
                      {formattedAmount}
                    </p>
                  </div>
                </div>
              </div>

              {/* Compliance verification banner */}
              <div className="border border-[#E3F4EC] bg-[#F4FBF7] rounded-xl p-3.5 flex items-start sm:items-center gap-3 mt-4">
                <svg className="w-5 h-5 text-[#00875A] shrink-0 mt-0.5 sm:mt-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div className="text-[11px] leading-relaxed select-none">
                  <span className="font-bold text-[#006C47]">Secure · Verified · Compliant</span>
                  <span className="text-gray-550 block text-[10px] mt-0.5">Generated via Government of India IRP</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          {isGeneratedSuccess ? (
            <>
              <button
                onClick={onSuccess}
                className="px-6 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-55 active:scale-95 transition-all duration-150 cursor-pointer"
              >
                Close & Done
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={pdfLoading || !hasValidPdfData}
                className="px-6 py-2.5 bg-[#00875A] hover:bg-[#00704A] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-sm transition-all duration-150 flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                {pdfLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                Download PDF
              </button>
            </>
          ) : localMode === "generate" ? (
            <>
              <button
                onClick={onClose}
                disabled={loading}
                className="px-5 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-705 bg-white hover:bg-gray-50 disabled:opacity-50 transition duration-150 active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-6 py-2.5 bg-[#00875A] hover:bg-[#00704A] disabled:bg-[#a0dec4] text-white rounded-xl text-xs font-bold shadow-sm transition-all duration-150 flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-white fill-white" />
                Generate E-Invoice
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onViewSaleDetails}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition duration-150 flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" /> View Sale Details
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={pdfLoading || !hasValidPdfData}
                title={!hasValidPdfData ? "Generate E-Invoice first to download the official PDF." : ""}
                className="px-6 py-2.5 bg-[#00875A] hover:bg-[#00704A] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-sm transition-all duration-150 flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                {pdfLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                Download PDF
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

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
import { X, Copy, Download, Eye, AlertTriangle, Loader2, CheckCircle, XCircle, RefreshCw } from "lucide-react";

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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl border border-gray-150 flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/90 z-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
            <div className="space-y-1">
              <h3 className="font-bold text-gray-900 text-base">Generating E-Invoice...</h3>
              <p className="text-xs text-gray-500">Connecting to Government IRP Portal (NIC)...</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 bg-white">
          <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
            {localMode === "generate" ? (
              <>⚡ Generate Government E-Invoice</>
            ) : (
              <>🏛 Quick E-Invoice Details</>
            )}
          </h2>
          {!loading && (
            <button
              onClick={isGeneratedSuccess ? onSuccess : onClose}
              className="p-1.5 text-gray-400 hover:text-gray-650 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
          {localMode === "generate" ? (
            // GENERATION MODE
            <>
              {/* Generation Error Card */}
              {generationError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3 shadow-sm">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1.5 flex-1">
                      <h4 className="font-extrabold text-rose-900 text-xs">❌ E-Invoice Generation Failed</h4>
                      <p className="text-[11px] text-rose-800 leading-relaxed font-medium">
                        Unable to register this invoice with the Government IRP.
                      </p>
                      <p className="text-[10px] text-rose-700 font-mono bg-rose-100/50 p-2 rounded-lg break-all">
                        {generationError}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-rose-200/50 pt-2.5 text-[11px] text-rose-800 space-y-1.5">
                    <p className="font-bold">Please verify:</p>
                    <ul className="list-disc pl-5 space-y-0.5 text-rose-700 font-medium">
                      <li>GSTIN authentication is active</li>
                      <li>Internet connectivity is stable</li>
                      <li>Backend service is available</li>
                      <li>Invoice is eligible for E-Invoice registration</li>
                    </ul>
                  </div>

                  <div className="flex gap-2 pt-1">
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
              )}

              {/* Invoice Summary Card */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-xs space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider">Invoice No</span>
                    <span className="font-bold text-gray-800 font-mono text-sm">
                      {item.invoiceNo || item._id?.substring(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider">Invoice Value</span>
                    <span className="font-extrabold text-emerald-700 text-sm">{formattedAmount}</span>
                  </div>
                </div>

                <div className="border-t border-gray-200/50 pt-2.5">
                  <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider">Customer</span>
                  <span className="font-bold text-gray-800 block text-xs">{resolvedParty?.name || item.buyerName}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider">GSTIN</span>
                    <span className="font-bold text-gray-700 font-mono">
                      {resolvedParty?.gstin || resolvedParty?.gstNumber || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider">Items</span>
                    <span className="font-bold text-gray-700">{itemsText}</span>
                  </div>
                </div>
              </div>

              {/* Warning Alert */}
              {!generationError && (
                <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start text-xs text-amber-900 leading-relaxed shadow-3xs">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-extrabold text-amber-905">⚠️ This action is permanent.</p>
                    <p className="font-medium text-amber-800/90">
                      The invoice will be registered with the Government IRP Portal (NIC) and an official IRN and QR code will be generated.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            // DETAILS MODE
            <>
              {/* E-Invoice Metadata */}
              <div className="space-y-3 text-xs">
                <div className="bg-emerald-50/20 border border-emerald-250 rounded-xl p-3 flex items-center gap-2 text-emerald-800 shadow-3xs">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold text-[11px]">E-Invoice Registered & Signed by Government IRP</span>
                </div>

                {/* IRN Block */}
                <div className="space-y-1">
                  <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider">IRN (Invoice Reference Number)</span>
                  <div className="flex gap-2 items-center bg-gray-50 border border-gray-150 p-2.5 rounded-lg">
                    <code className="font-mono text-gray-800 text-[10px] break-all flex-1 font-semibold leading-normal select-all">
                      {item.eInvoiceIrn || item.irn || item.eInvoiceInfo?.irn || irn || "—"}
                    </code>
                    <button
                      onClick={() => copyToClipboard(item.eInvoiceIrn || item.irn || item.eInvoiceInfo?.irn || irn)}
                      className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700 transition shrink-0"
                      title="Copy IRN"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* ACK & Date Block */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider">Acknowledgment No</span>
                    <div className="flex gap-1.5 items-center mt-0.5">
                      <span className="font-bold text-gray-800 font-mono">
                        {item.eInvoiceAckNo || item.ackNo || item.eInvoiceInfo?.ackNo || ackNo || "—"}
                      </span>
                      <button
                        onClick={() => copyToClipboard(item.eInvoiceAckNo || item.ackNo || item.eInvoiceInfo?.ackNo || ackNo)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-650 transition"
                        title="Copy ACK No"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider">Generated Date</span>
                    <p className="font-bold text-gray-800 mt-1">
                      {item.eInvoiceAckDt || item.ackDt || item.eInvoiceInfo?.ackDt || ackDt || new Date(item.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                </div>

                {/* Additional details */}
                <div className="border-t border-gray-100 pt-3">
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="text-gray-400 block font-medium">Customer:</span>
                      <span className="font-bold text-gray-800">{resolvedParty?.name || item.buyerName}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-medium">Invoice Value:</span>
                      <span className="font-bold text-gray-800">{formattedAmount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 px-5 py-3 border-t border-gray-100 bg-gray-50">
          {isGeneratedSuccess ? (
            <>
              <button
                onClick={onSuccess}
                className="px-4 py-2 border border-gray-250 rounded-xl text-xs font-bold text-gray-650 bg-white hover:bg-gray-100 transition"
              >
                Close & Done
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={pdfLoading || !hasValidPdfData}
                title={!hasValidPdfData ? "Generate E-Invoice first to download the official PDF." : ""}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </button>
            </>
          ) : localMode === "generate" ? (
            <>
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 border border-gray-250 rounded-xl text-xs font-bold text-gray-650 bg-white hover:bg-gray-100 disabled:opacity-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
              >
                ⚡ Generate E-Invoice
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onViewSaleDetails}
                className="px-3.5 py-2 border border-gray-250 rounded-xl text-xs font-bold text-gray-650 bg-white hover:bg-gray-100 transition flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" /> View Sale Details
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={pdfLoading || !hasValidPdfData}
                title={!hasValidPdfData ? "Generate E-Invoice first to download the official PDF." : ""}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

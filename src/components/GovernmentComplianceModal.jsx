import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  Truck,
  FileCheck,
  X,
  Copy,
  Printer,
  Calendar,
  AlertTriangle,
  Clock,
  Eye,
  Download,
  Info,
  Building,
  User,
  ArrowDown,
  FileText,
  QrCode,
  Check,
  ChevronUp,
  ChevronDown
} from "lucide-react";

import api from "../lib/api";

import {
  generateEInvoice,
  authenticateSession,
  generateEInvoicePdf
} from "../store/thunks/eInvoiceThunk";
import {
  resetEInvoiceState,
  clearEInvoiceStatus,
  setStatus as setEInvoiceStatus,
  setEInvoiceSuccessLocal
} from "../store/slices/eInvoiceSlice";

import {
  generateEWayBillByIrn,
  generateStandaloneEWayBill,
  authenticateEWayBillSession,
  cancelEWayBill,
  extendEWayBill,
  updateEWayBillVehicle,
  updateEWayBillTransporter,
  generateEWayBillPdf
} from "../store/thunks/eWayBillThunk";
import {
  clearEWayBillStatus,
  setSelectedEWayBill
} from "../store/slices/eWayBillSlice";

import { isEInvoiceSessionValid, isEWayBillSessionValid, addAuditLog } from "../lib/api";
import {
  constructEInvoicePayload,
  compileB2CSaleToStandalonePayload,
  isValidEInvoiceResponse,
  normalizeEInvoiceResponse,
  getGstinStateCode,
  formatDateDDMMYYYY
} from "../utils/compliancePayloads";
import GenerateEWayBillModal from "./GovernmentCompliance/GenerateEWayBillModal";

export default function GovernmentComplianceModal({
  isOpen,
  sale,
  onClose,
  onSuccess
}) {
  const dispatch = useDispatch();

  // Redux Selectors
  const { parties } = useSelector((state) => state.party);
  const { profile } = useSelector((state) => state.settings);
  const authUser = useSelector((state) => state.auth?.user);
  const sellerData = profile || authUser;

  const { status: eInvoiceStatus, irn: eInvoiceIrn, ackNo, ackDt, pdfLoading, error: eInvoiceError } = useSelector(
    (s) => s.eInvoice
  );
  
  const { selectedEWayBill, operations: ewayBillOps } = useSelector(
    (s) => s.eWayBill
  );

  // Local state variables
  const [activeDialog, setActiveDialog] = useState(null); // null, "cancel", "extend", "vehicle", "transporter", "generate_ewb", "view_qr"
  const [cachedPdfUrl, setCachedPdfUrl] = useState(null);

  // Form Inputs
  const [cancelReason, setCancelReason] = useState("1");
  const [cancelRemarks, setCancelRemarks] = useState("");
  
  const [extendReason, setExtendReason] = useState("1");
  const [extendRemarks, setExtendRemarks] = useState("");
  const [remainingDistance, setRemainingDistance] = useState("");

  const [vehNo, setVehNo] = useState("");
  const [vehType, setVehType] = useState("R");
  const [transMode, setTransMode] = useState("1");
  const [reasonCode, setReasonCode] = useState("1");
  const [reasonRemarks, setReasonRemarks] = useState("");
  const [tripPinCode, setTripPinCode] = useState("");
  const [fromState, setFromState] = useState("");
  
  const [transId, setTransId] = useState("");
  const [transName, setTransName] = useState("");

  const [eInvoiceLocalLoading, setEInvoiceLocalLoading] = useState(false);
  const [eInvoiceLocalError, setEInvoiceLocalError] = useState(null);

  // Local sale state as single source of truth
  const [localSale, setLocalSale] = useState(sale);

  useEffect(() => {
    if (sale) {
      setLocalSale(sale);
    }
  }, [sale]);

  const fetchLatestSale = async () => {
    const saleId = sale?._id || sale?.id;
    if (!saleId) return;
    try {
      const res = await api.get(`/sell/${saleId}`);
      const updatedSale = res.data?.data || res.data;
      if (updatedSale) {
        setLocalSale(updatedSale);
      }
    } catch (err) {
      console.error("Failed to fetch latest sale in modal:", err);
    }
  };

  // 1. Customer Type and details resolution
  const partyId = typeof localSale?.party === "string"
    ? localSale.party
    : (localSale?.party && typeof localSale?.party === "object" ? localSale.party._id : null);

  const resolvedParty = partyId
    ? (parties.find(p => p._id === partyId) || (typeof localSale?.party === "object" ? localSale.party : null))
    : (localSale?.party && typeof localSale?.party === "object" ? localSale.party : null);

  const isB2B = resolvedParty && (resolvedParty.gstin || resolvedParty.gstNumber || resolvedParty.gstType?.startsWith("Registered"));

  const resolvedInvoiceNo = localSale
    ? (localSale.invoiceNumber || localSale.invoiceNo || localSale.billNumber || localSale.refNo || localSale._id?.substring(0, 8).toUpperCase() || "—")
    : "—";

  const resolvedInvoiceDate = localSale?.createdAt
    ? new Date(localSale.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  const resolvedAmount = localSale?.totalAmount !== undefined ? `₹${localSale.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—";

  // E-Way Bill schema resolution (eWayBill object is single source of truth)
  const activeEwb = localSale?.eWayBill || localSale?.ewayBill || selectedEWayBill;
  const activeEwbNo = activeEwb?.ewbNo || activeEwb?.ewayBillNo || localSale?.ewayBillNo || localSale?.eWayBillNo || "";
  const activeEwbValidUpto = activeEwb?.validUpto || "—";
  const activeEwbStatus = activeEwb?.status || "PENDING";
  const activeEwbDate = activeEwb?.ewbDate || activeEwb?.ewayBillDate || activeEwb?.createdAt || "—";

  const activeVehicleNo = activeEwb?.vehicleNo || localSale?.vehicleNo || localSale?.vehicleNumber || "—";
  const activeTransporterId = activeEwb?.transporterId || activeEwb?.transId || localSale?.transporterId || "—";
  const activeTransporterName = activeEwb?.transporterName || activeEwb?.transName || localSale?.transporterName || "—";
  const activeDistance = activeEwb?.distance || localSale?.distance || 0;

  const hasEWayBill = !!localSale?.eWayBill?.ewbNo || !!localSale?.ewayBill?.ewbNo || !!activeEwbNo;

  // Date and Time formatter helper
  const formatDateTime = (dateStr) => {
    if (!dateStr || dateStr === "—") return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strTime = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    return `${day} ${month} ${year}, ${strTime}`;
  };

  // Sync state selectors on open
  useEffect(() => {
    if (isOpen && sale) {
      dispatch(resetEInvoiceState());
      dispatch(clearEWayBillStatus());
      dispatch(setSelectedEWayBill(null));
      setCachedPdfUrl(null);
      setEInvoiceLocalError(null);
      setEInvoiceLocalLoading(false);
      setActiveDialog(null);

      // Fetch the latest details when opening the modal
      fetchLatestSale();

      // Pre-populate if already generated in sale details
      const dbIrn = sale.eInvoiceIrn || sale.irn || sale.eInvoiceInfo?.irn || sale.eInvoice?.irn;
      const dbAckNo = sale.eInvoiceAckNo || sale.ackNo || sale.eInvoiceInfo?.ackNo || sale.eInvoice?.ackNo || "—";
      const dbAckDt = sale.eInvoiceAckDt || sale.ackDt || sale.eInvoiceInfo?.ackDt || sale.eInvoice?.ackDt || sale.eInvoiceInfo?.ackDate || sale.eInvoice?.ackDate || sale.ackDate || "—";

      if (dbIrn) {
        dispatch(
          setEInvoiceSuccessLocal({
            irn: dbIrn,
            ackNo: dbAckNo,
            ackDt: dbAckDt
          })
        );
      }
    }
  }, [isOpen, sale, dispatch]);

  if (!isOpen || !sale) return null;

  const copyToClipboard = (text, label) => {
    if (!text || text === "—") return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // E-Invoice Generate handler
  const handleGenerateEInvoice = async () => {
    setEInvoiceLocalLoading(true);
    setEInvoiceLocalError(null);
    dispatch(clearEInvoiceStatus());

    try {
      const sellerGstin = sellerData?.eInvoiceGstin || sellerData?.gstNumber || sellerData?.gstin || "29AAACQ3770E005";

      if (!isEInvoiceSessionValid(sellerGstin)) {
        await dispatch(authenticateSession({})).unwrap();
      }

      const eInvoicePayload = constructEInvoicePayload(localSale, resolvedParty, sellerData);

      const res = await dispatch(
        generateEInvoice({
          invoiceData: eInvoicePayload
        })
      ).unwrap();

      if (!isValidEInvoiceResponse(res)) {
        throw new Error("NIC portal returned incomplete E-Invoice response. Please check credentials.");
      }

      const normalized = normalizeEInvoiceResponse(res);
      toast.success("E-Invoice generated successfully!");

      dispatch(
        generateEInvoicePdf({
          signed_qr_code: normalized.signed_qr_code,
          irn: normalized.irn,
          signed_invoice: normalized.signed_invoice
        })
      ).then(url => setCachedPdfUrl(url)).catch(() => {});

      await fetchLatestSale();
      if (onSuccess) onSuccess();
    } catch (err) {
      const msg = typeof err === "string" ? err : (err?.message || "Failed to generate E-Invoice.");
      setEInvoiceLocalError(msg);
      toast.error(msg);
    } finally {
      setEInvoiceLocalLoading(false);
    }
  };

  // Download E-Invoice PDF
  const handleDownloadPdf = () => {
    const currentIrn = eInvoiceIrn || localSale?.eInvoiceIrn || localSale?.irn || localSale?.eInvoiceInfo?.irn || localSale?.eInvoice?.irn;
    const currentQr = localSale?.eInvoiceQrCode || localSale?.signedQrCode || localSale?.eInvoiceInfo?.signed_qr_code || localSale?.eInvoice?.signed_qr_code;
    const currentSignedInv = localSale?.signedInvoice || localSale?.eInvoiceInfo?.signed_invoice || localSale?.eInvoice?.signed_invoice;

    if (!currentIrn) {
      toast.error("Generate E-Invoice first to download PDF.");
      return;
    }

    if (cachedPdfUrl) {
      window.open(cachedPdfUrl, "_blank");
      return;
    }

    toast.loading("Generating E-Invoice PDF...", { id: "einvoice-pdf" });
    dispatch(
      generateEInvoicePdf({
        signed_qr_code: currentQr || "Simulated QRCode",
        irn: currentIrn,
        signed_invoice: currentSignedInv || "Simulated Signed Invoice"
      })
    )
      .unwrap()
      .then((pdfUrl) => {
        toast.success("PDF fetched!", { id: "einvoice-pdf" });
        setCachedPdfUrl(pdfUrl);
        window.open(pdfUrl, "_blank");
      })
      .catch(() => {
        toast.error("Could not fetch E-Invoice PDF file", { id: "einvoice-pdf" });
      });
  };

  // E-Way Bill Submit handler
  const handleEWayBillSubmit = async (transportPayload) => {
    const sellerGstin = sellerData?.eInvoiceGstin || sellerData?.gstNumber || sellerData?.gstin || "29AAACQ3770E005";

    try {
      if (isB2B) {
        if (!isEInvoiceSessionValid(sellerGstin)) {
          await dispatch(authenticateSession({})).unwrap();
        }

        const currentIrn = eInvoiceIrn || localSale.eInvoiceIrn || localSale.irn || localSale.eInvoiceInfo?.irn || localSale.eInvoice?.irn;
        await dispatch(
          generateEWayBillByIrn({
            irn: currentIrn,
            payload: transportPayload
          })
        ).unwrap();
      } else {
        if (!isEWayBillSessionValid(sellerGstin)) {
          await dispatch(authenticateEWayBillSession({})).unwrap();
        }

        const standalonePayload = compileB2CSaleToStandalonePayload(localSale, transportPayload, sellerData, resolvedParty);
        await dispatch(
          generateStandaloneEWayBill(standalonePayload)
        ).unwrap();
      }

      toast.success("E-Way Bill registered successfully!");
      setActiveDialog(null);
      await fetchLatestSale();
      if (onSuccess) onSuccess();
    } catch (err) {
      const msg = typeof err === "string" ? err : (err?.message || "Failed to generate E-Way Bill.");
      toast.error(msg);
      throw err;
    }
  };

  // Print E-Way Bill slip
  const handlePrintEWayBillSlip = () => {
    if (!activeEwbNo) {
      toast.error("Generate E-Way Bill first.");
      return;
    }

    const sellerGstin = sellerData?.eInvoiceGstin || sellerData?.gstNumber || sellerData?.gstin || "29AAACQ3770E005";
    const sellerStateCode = getGstinStateCode(sellerGstin, "29");
    const buyerStateCode = resolvedParty?.stateCode || getGstinStateCode(resolvedParty?.gstin || resolvedParty?.gstNumber || "URP", "29");
    const isInterstate = sellerStateCode !== buyerStateCode;

    const itemList = (localSale?.items || []).map(it => {
      const qty = Number(it.quantity) || 1;
      const rate = Number(it.pricePerUnit || it.rate || 0);
      const taxable = Number((qty * rate).toFixed(2));
      const gstRt = Number(it.taxPercent) || 0;
      
      let cgstRate = 0;
      let sgstRate = 0;
      let igstRate = 0;
      if (isInterstate) {
        igstRate = gstRt;
      } else {
        cgstRate = gstRt / 2;
        sgstRate = gstRt / 2;
      }

      return {
        productName: it.itemName || it.item?.productName || it.item?.name || "Product",
        productDesc: it.itemName || it.item?.productName || it.item?.name || "Product",
        hsnCode: Number(it.item?.hsnCode || it.hsnCode || 1001),
        quantity: qty,
        qtyUnit: it.unit || "BAG",
        cgstRate,
        sgstRate,
        igstRate,
        taxableAmount: taxable
      };
    });

    const pdfPayload = {
      ewbNo: String(activeEwbNo),
      ewbDt: activeEwb?.ewayBillDate || activeEwb?.ewbDate || activeEwb?.createdAt || formatDateDDMMYYYY(new Date()),
      ewbValidTill: activeEwbValidUpto || "—",
      payload: {
        supplyType: activeEwb?.supplyType || "O",
        subSupplyType: activeEwb?.subType || "1",
        docType: activeEwb?.docType || "INV",
        docNo: resolvedInvoiceNo,
        docDate: formatDateDDMMYYYY(localSale?.createdAt || localSale?.billDate),
        fromGstin: sellerGstin,
        fromTrdName: sellerData?.shopName || sellerData?.legalName || "Seller FPO",
        fromAddr1: sellerData?.village || sellerData?.address || "Address 1",
        fromPlace: sellerData?.district || sellerData?.city || "Place",
        fromPincode: Number(sellerData?.pinCode || sellerData?.pin) || 560001,
        fromStateCode: Number(sellerStateCode) || 29,
        toGstin: resolvedParty?.gstin || resolvedParty?.gstNumber || "URP",
        toTrdName: resolvedParty?.name || localSale?.buyerName || "Consumer / End User",
        toAddr1: resolvedParty?.village || resolvedParty?.address || "Address 2",
        toPlace: resolvedParty?.district || resolvedParty?.city || "Place",
        toPincode: Number(resolvedParty?.pinCode || resolvedParty?.pin || localSale?.buyerPinCode) || 560001,
        toStateCode: Number(buyerStateCode) || 29,
        totalValue: Number(localSale?.items?.reduce((sum, it) => sum + (Number(it.quantity) * Number(it.pricePerUnit || it.rate || 0)), 0).toFixed(2)) || 100000,
        totInvValue: Number((localSale?.totalAmount || localSale?.grandTotal || 0).toFixed(2)) || 118000,
        transMode: activeEwb?.transMode || "1",
        transDistance: String(activeEwb?.distance || activeEwb?.Distance || localSale?.distance || "250"),
        vehicleNo: activeVehicleNo || "",
        itemList
      }
    };

    toast.loading("Generating E-Way Bill PDF...", { id: "ewb-pdf-toast" });

    dispatch(generateEWayBillPdf(pdfPayload))
      .unwrap()
      .then((blob) => {
        toast.success("E-Way Bill PDF generated!", { id: "ewb-pdf-toast" });
        const fileUrl = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        window.open(fileUrl, "_blank");
      })
      .catch((err) => {
        console.error("PDF generation failed:", err);
        toast.error(err || "Failed to generate E-Way Bill PDF", { id: "ewb-pdf-toast" });
      });
  };

  // E-Way Bill updates handlers
  const handleCancelSubmit = (e) => {
    e.preventDefault();
    dispatch(cancelEWayBill({
      ewbNo: activeEwbNo,
      cancelRsnCode: cancelReason,
      cancelRmrks: cancelRemarks
    }))
      .unwrap()
      .then(async () => {
        toast.success("E-Way Bill cancelled successfully");
        setActiveDialog(null);
        await fetchLatestSale();
        if (onSuccess) onSuccess();
      })
      .catch(err => toast.error(err || "Cancellation failed"));
  };

  const handleExtendSubmit = (e) => {
    e.preventDefault();
    dispatch(extendEWayBill({
      ewbNo: activeEwbNo,
      vehicleNo: activeVehicleNo,
      remainingDistance: remainingDistance,
      extRsnCode: extendReason,
      extRmrks: extendRemarks,
      transMode: activeEwb?.transMode || "1",
      fromPincode: sellerData?.pinCode || 560001,
      fromStateCode: getGstinStateCode(sellerData?.gstNumber || "29AAACQ3770E005", "29")
    }))
      .unwrap()
      .then(async () => {
        toast.success("E-Way Bill validity extended successfully");
        setActiveDialog(null);
        await fetchLatestSale();
        if (onSuccess) onSuccess();
      })
      .catch(err => toast.error(err || "Extension failed"));
  };

  const handleVehicleSubmit = (e) => {
    e.preventDefault();
    dispatch(updateEWayBillVehicle({
      ewbNo: activeEwbNo,
      vehicleNo: vehNo,
      vehicleType: vehType,
      transMode: transMode,
      reasonCode: reasonCode,
      reasonRemarks: reasonRemarks,
      fromPincode: tripPinCode,
      fromState: fromState
    }))
      .unwrap()
      .then(async () => {
        toast.success("Vehicle details updated successfully");
        setActiveDialog(null);
        await fetchLatestSale();
        if (onSuccess) onSuccess();
      })
      .catch(err => toast.error(err || "Vehicle update failed"));
  };

  const handleTransporterSubmit = (e) => {
    e.preventDefault();
    dispatch(updateEWayBillTransporter({
      ewbNo: activeEwbNo,
      transporterId: transId,
      transporterName: transName
    }))
      .unwrap()
      .then(async () => {
        toast.success("Transporter details updated successfully");
        setActiveDialog(null);
        await fetchLatestSale();
        if (onSuccess) onSuccess();
      })
      .catch(err => toast.error(err || "Transporter update failed"));
  };

  // Helper to link an existing EWB manually
  const handleLinkExistingEwb = () => {
    const ewbNum = prompt("Enter the 12-digit E-Way Bill Number:");
    if (!ewbNum) return;
    if (ewbNum.length !== 12 || isNaN(ewbNum)) {
      toast.error("Invalid E-Way Bill Number. Must be 12 digits.");
      return;
    }

    dispatch(setSelectedEWayBill({
      ewayBillNo: ewbNum,
      ewayBillDate: formatDateDDMMYYYY(new Date()),
      validUpto: formatDateDDMMYYYY(new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)), // default +4 days
      vehicleNo: "RJ45RH8798",
      status: "ACTIVE"
    }));
    toast.success("E-Way Bill linked successfully!");
    if (onSuccess) onSuccess();
  };

  // Derive E-Invoice generated status
  const currentIrn = eInvoiceIrn || localSale?.eInvoiceIrn || localSale?.irn || localSale?.eInvoiceInfo?.irn || localSale?.eInvoice?.irn;
  const isEInvoiceGenerated = eInvoiceStatus === "SUCCESS" || !!currentIrn;
  const isEInvoiceFailed = eInvoiceStatus === "FAILED" || !!eInvoiceLocalError;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-md transition-all duration-300 font-sans">
        <div className="w-full max-w-4xl bg-white border border-gray-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
          
          {/* Header Bar */}
          <div className="px-6 py-5 border-b border-gray-150 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-emerald-600 shrink-0 stroke-[2]" />
              <div>
                <h3 className="font-extrabold text-gray-900 text-sm tracking-tight">
                  Government Compliance
                </h3>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5 tracking-wide">
                  {isB2B 
                    ? "Manage E-Invoice and E-Way Bill for this invoice"
                    : "Manage E-Way Bill for this invoice"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-450 hover:text-gray-655 hover:bg-gray-105 rounded-xl transition-all border-0 bg-transparent cursor-pointer"
              title="Close Dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-5 flex-1 max-h-[75vh] overflow-y-auto [&::-webkit-scrollbar]:hidden">
            
            {/* Buyer / Party Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4.5 space-y-4 relative">
              <div className="flex items-center gap-3">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  isB2B 
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                    : "bg-purple-50 text-purple-600 border-purple-100"
                }`}>
                  {isB2B ? <Building className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </span>
                <div>
                  <span className="text-gray-400 font-bold block text-[8px] uppercase tracking-wider">Buyer / Party</span>
                  <p className="font-extrabold text-gray-905 text-sm leading-tight mt-0.5">
                    {resolvedParty?.name || sale.buyerName || "Direct Walk-In Customer"}
                  </p>
                  {isB2B ? (
                    <span className="font-semibold font-mono text-gray-500 text-[10px] block mt-0.5">
                      GSTIN: {resolvedParty?.gstin || resolvedParty?.gstNumber || "—"}
                    </span>
                  ) : (
                    <span className="font-semibold text-gray-500 text-[10px] block mt-0.5">
                      Mobile: {resolvedParty?.mobile || resolvedParty?.phone || sale.buyerMobile || "9876543210"}
                    </span>
                  )}
                </div>

                {/* Badge top right */}
                <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wide border ${
                  isB2B 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-purple-50 text-purple-700 border-purple-200"
                }`}>
                  {isB2B ? "B2B (GST REGISTERED)" : "B2C (NON-GST)"}
                </span>
              </div>

              {/* Invoices details grid */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-150/40 text-xs">
                <div>
                  <span className="text-gray-400 font-bold block text-[8px] uppercase tracking-wider">Invoice Number</span>
                  <span className="font-extrabold text-gray-855 mt-0.5 block">{resolvedInvoiceNo}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block text-[8px] uppercase tracking-wider">Invoice Date</span>
                  <span className="font-extrabold text-gray-855 mt-0.5 block">{resolvedInvoiceDate}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block text-[8px] uppercase tracking-wider">Total Amount</span>
                  <span className="font-extrabold text-emerald-700 mt-0.5 block">{resolvedAmount}</span>
                </div>
              </div>
            </div>

            {/* Layout based on B2B / B2C */}
            {isB2B ? (
              <div className="flex gap-4">
                
                {/* Left Side: Timeline Progress Bar */}
                <div className="flex flex-col items-center w-10 shrink-0 pt-2 select-none">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-sm transition ${
                    isEInvoiceGenerated ? "bg-emerald-600" : "bg-gray-200"
                  }`}>
                    {isEInvoiceGenerated ? <Check className="w-4 h-4 stroke-[3]" /> : "1"}
                  </span>
                  
                  {/* Vertical dashed line with arrow */}
                  <div className="w-0.5 flex-1 min-h-[120px] bg-gray-200 my-2 relative flex items-center justify-center">
                    <ArrowDown className="w-4 h-4 text-gray-400 absolute bottom-0" />
                  </div>

                  <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-sm transition ${
                    activeEwbNo && activeEwbStatus !== "CANCELLED"
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "bg-white border-amber-500 text-amber-500"
                  }`}>
                    {activeEwbNo && activeEwbStatus !== "CANCELLED" ? <Check className="w-4 h-4 stroke-[3]" /> : <Truck className="w-4 h-4" />}
                  </span>
                </div>

                {/* Right Side: Compliance cards */}
                <div className="flex-1 space-y-4">

                  {/* 1. GST E-Invoice Card */}
                  <div className={`border rounded-2xl p-4.5 space-y-4 bg-white transition-all ${
                    isEInvoiceGenerated ? "border-emerald-250 bg-emerald-50/5 shadow-2xs" : "border-gray-200"
                  }`}>
                    <div className="flex justify-between items-start pb-2 border-b border-gray-100">
                      <div className="flex gap-2">
                        <FileText className={`w-5 h-5 shrink-0 ${isEInvoiceGenerated ? "text-emerald-650" : "text-gray-400"}`} />
                        <div>
                          <span className="font-extrabold text-xs text-gray-900 uppercase tracking-wider block">
                            GST E-Invoice
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold mt-0.5 block leading-tight">
                            {isEInvoiceGenerated ? "IRN has been generated successfully." : "NIC Portal digital registration."}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border flex items-center gap-1 uppercase tracking-wider ${
                          isEInvoiceGenerated
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : isEInvoiceFailed
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : "bg-amber-50 text-amber-850 border-amber-200"
                        }`}>
                          {isEInvoiceGenerated && <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3.5]" />}
                          {isEInvoiceGenerated ? "GENERATED" : isEInvoiceFailed ? "FAILED" : "NOT GENERATED"}
                        </span>
                        <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 cursor-pointer" />
                      </div>
                    </div>

                    {isEInvoiceGenerated ? (
                      <div className="space-y-4">
                        {/* 3-Column details layout */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border border-gray-150 rounded-2xl p-5 md:p-6 leading-normal text-xs shadow-3xs">
                          {/* Col 1 */}
                          <div className="space-y-4">
                            <div>
                              <span className="text-gray-400 font-bold block text-[8px] uppercase tracking-wider font-semibold">IRN</span>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="font-mono text-[10px] font-bold text-gray-805 break-all select-all leading-normal" title={currentIrn}>
                                  {currentIrn}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(currentIrn, "IRN")}
                                  className="p-1.5 text-gray-400 hover:text-brand-650 hover:bg-gray-55 rounded-md transition-all shrink-0 bg-transparent border-0 cursor-pointer"
                                  title="Copy IRN"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-400 font-bold block text-[8px] uppercase tracking-wider font-semibold">Ack No.</span>
                              <p className="font-bold text-gray-900 mt-1">{ackNo || sale.eInvoiceAckNo || sale.ackNo || "—"}</p>
                            </div>
                          </div>

                          {/* Col 2 */}
                          <div className="space-y-4">
                            <div>
                              <span className="text-gray-400 font-bold block text-[8px] uppercase tracking-wider font-semibold">Ack Date</span>
                              <p className="font-bold text-gray-900 mt-1">
                                {formatDateTime(ackDt || sale.eInvoiceAckDt || sale.ackDt || sale.eInvoiceInfo?.ackDt || sale.eInvoiceInfo?.ackDate || sale.eInvoice?.ackDate || sale.ackDate || "—")}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-400 font-bold block text-[8px] uppercase tracking-wider font-semibold">Generated On</span>
                              <p className="font-bold text-gray-900 mt-1">
                                {formatDateTime(sale.createdAt || sale.billDate || "—")}
                              </p>
                            </div>
                          </div>

                          {/* Col 3 */}
                          <div className="space-y-4">
                            <div>
                              <span className="text-gray-400 font-bold block text-[8px] uppercase tracking-wider font-semibold">Signed Invoice (JWT)</span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 mt-1 text-[9px] font-extrabold text-emerald-805 bg-emerald-50 border border-emerald-100 rounded-full">
                                Available
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400 font-bold block text-[8px] uppercase tracking-wider font-semibold">Signed QR Code</span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 mt-1 text-[9px] font-extrabold text-emerald-805 bg-emerald-50 border border-emerald-100 rounded-full">
                                Available
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions buttons */}
                        <div className="flex gap-3">
                          <button
                            onClick={handleDownloadPdf}
                            disabled={pdfLoading}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs border border-emerald-500 hover:bg-emerald-50 text-emerald-700 font-bold rounded-xl transition cursor-pointer bg-white"
                          >
                            {pdfLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                            View Details
                          </button>
                          <button
                            onClick={() => {
                              setActiveDialog("view_qr");
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs border border-emerald-500 hover:bg-emerald-50 text-emerald-700 font-bold rounded-xl transition cursor-pointer bg-white"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            View QR Code
                          </button>
                          <button
                            onClick={handleDownloadPdf}
                            disabled={pdfLoading}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs border border-emerald-500 hover:bg-emerald-50 text-emerald-700 font-bold rounded-xl transition cursor-pointer bg-white"
                          >
                            {pdfLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            Download PDF
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                          E-Invoice is required for B2B transactions.
                        </p>

                        {eInvoiceLocalError && (
                          <div className="bg-rose-50 border border-rose-150 p-3 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 leading-relaxed font-semibold">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">E-Invoice Failed</p>
                              <p className="text-[11px] text-rose-700 mt-0.5">{eInvoiceLocalError}</p>
                            </div>
                          </div>
                        )}

                        <button
                          onClick={handleGenerateEInvoice}
                          disabled={eInvoiceLocalLoading}
                          className="w-full h-10 flex items-center justify-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 border-0 cursor-pointer shadow-sm"
                        >
                          {eInvoiceLocalLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Registering with NIC Portal...
                            </>
                          ) : (
                            "⚡ Generate GST E-Invoice"
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Middle Transition Banner */}
                  {isEInvoiceGenerated && !activeEwbNo && (
                    <div className="flex items-center justify-center gap-2 py-1.5 text-xs font-bold text-gray-500 select-none">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                      <span className="text-emerald-700 font-semibold">E-Invoice Generated</span>
                      <span className="text-gray-300">----------➔</span>
                      <span>You can now generate E-Way Bill</span>
                    </div>
                  )}

                  {/* 2. E-Way Bill (IRN-Linked) Card */}
                  <div className={`border rounded-2xl p-4.5 space-y-4 bg-white transition-all ${
                    hasEWayBill && activeEwbStatus !== "CANCELLED"
                      ? "border-emerald-250 bg-emerald-50/5 shadow-2xs"
                      : "border-amber-250 bg-amber-50/5 shadow-3xs"
                  }`}>
                    <div className="flex justify-between items-start pb-2 border-b border-gray-100">
                      <div className="flex gap-2">
                        <Truck className={`w-5 h-5 shrink-0 ${hasEWayBill && activeEwbStatus !== "CANCELLED" ? "text-emerald-650" : "text-amber-500"}`} />
                        <div>
                          <span className="font-extrabold text-xs text-gray-900 uppercase tracking-wider block">
                            2. E-Way Bill (IRN-Linked)
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold mt-0.5 block leading-tight">
                            {hasEWayBill ? "Logistics tracking registered." : "E-Invoice is completed. Generate the official logistics permit."}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border flex items-center gap-1 uppercase tracking-wider ${
                          !isEInvoiceGenerated
                            ? "bg-slate-50 text-slate-400 border-slate-200"
                            : hasEWayBill
                              ? (activeEwbStatus === "CANCELLED" ? "bg-rose-50 text-rose-850 border-rose-200" : "bg-emerald-50 text-emerald-805 border-emerald-200")
                              : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}>
                          {hasEWayBill && activeEwbStatus !== "CANCELLED" && <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3.5]" />}
                          {!isEInvoiceGenerated 
                            ? "WAITING FOR IRN" 
                            : hasEWayBill 
                              ? (activeEwbStatus === "CANCELLED" ? "CANCELLED" : "GENERATED") 
                              : "PENDING"}
                        </span>
                        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 cursor-pointer" />
                      </div>
                    </div>

                    {!isEInvoiceGenerated ? (
                      <div className="space-y-3 py-1">
                        <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                          Generate GST E-Invoice first to enable E-Way Bill.
                        </p>
                        <button
                          disabled
                          className="w-full h-10 bg-gray-100 text-gray-400 border border-gray-205 rounded-xl text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          🔒 Generate E-Way Bill
                        </button>
                      </div>
                    ) : hasEWayBill ? (
                      <div className="space-y-4">
                        {/* Status and EWB details grid */}
                        <div className="grid grid-cols-2 gap-4 text-xs bg-white border border-gray-150 rounded-2xl p-5 md:p-6 shadow-3xs leading-normal">
                          <div className="space-y-4">
                            <div>
                              <span className="text-gray-400 font-bold block text-[8px] uppercase tracking-wider">Status</span>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 mt-1 text-[9px] font-extrabold border rounded-full uppercase tracking-wider ${
                                activeEwbStatus === "CANCELLED"
                                  ? "bg-rose-50 text-rose-805 border-rose-200"
                                  : "bg-emerald-50 text-emerald-805 border-emerald-200"
                              }`}>
                                {activeEwbStatus === "CANCELLED" && <X className="w-2.5 h-2.5 text-rose-600 stroke-[3]" />}
                                {activeEwbStatus === "CANCELLED" ? "CANCELLED" : "GENERATED"}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400 font-bold block text-[8px] uppercase tracking-wider">EWB Number</span>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="font-mono font-extrabold text-gray-900 tracking-wider select-all">{activeEwbNo}</span>
                                <button
                                  onClick={() => copyToClipboard(activeEwbNo, "E-Way Bill Number")}
                                  className="p-1 text-gray-400 hover:text-brand-650 hover:bg-gray-100 rounded-md transition-all shrink-0 bg-transparent border-0 cursor-pointer"
                                  title="Copy EWB"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <span className="text-gray-400 font-bold block text-[8px] uppercase tracking-wider">Generated On</span>
                              <p className="font-extrabold text-gray-900 mt-1">{formatDateTime(activeEwbDate)}</p>
                            </div>
                            <div>
                              <span className="text-gray-400 font-bold block text-[8px] uppercase tracking-wider">Valid Till</span>
                              <p className="font-extrabold text-gray-900 mt-1">{formatDateTime(activeEwbValidUpto)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Lifecycle buttons */}
                        <div className="flex flex-wrap gap-2 pt-1 justify-start">
                          <button
                            onClick={handlePrintEWayBillSlip}
                            className="px-4 py-2 text-xs border border-emerald-500 text-emerald-700 bg-white font-bold rounded-xl hover:bg-emerald-50 transition cursor-pointer flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            View PDF
                          </button>

                          {activeEwbStatus !== "CANCELLED" && (
                            <>
                              <button
                                onClick={() => {
                                  setVehNo(activeVehicleNo === "—" ? "" : activeVehicleNo);
                                  setVehType(activeEwb?.vehicleType || activeEwb?.VehType || "R");
                                  setTransMode(activeEwb?.transMode || "1");
                                  setTripPinCode(localSale?.buyerPinCode || sellerData?.pinCode || "");
                                  setFromState(getGstinStateCode(sellerData?.gstNumber || sellerData?.gstin || "29", "29"));
                                  setReasonCode("1");
                                  setReasonRemarks("");
                                  setActiveDialog("vehicle");
                                }}
                                className="px-4 py-2 text-xs border border-emerald-500 text-emerald-750 bg-white font-bold rounded-xl hover:bg-emerald-50 transition cursor-pointer"
                              >
                                Update Vehicle
                              </button>
                              <button
                                onClick={() => {
                                  setTransId(activeTransporterId === "—" ? "" : activeTransporterId);
                                  setTransName(activeTransporterName === "—" ? "" : activeTransporterName);
                                  setActiveDialog("transporter");
                                }}
                                className="px-4 py-2 text-xs border border-emerald-500 text-emerald-750 bg-white font-bold rounded-xl hover:bg-emerald-50 transition cursor-pointer"
                              >
                                Update Transporter
                              </button>
                              <button
                                onClick={() => {
                                  setExtendReason("1");
                                  setRemainingDistance("");
                                  setExtendRemarks("");
                                  setActiveDialog("extend");
                                }}
                                className="px-4 py-2 text-xs border border-emerald-500 text-emerald-755 bg-white font-bold rounded-xl hover:bg-emerald-50 transition cursor-pointer"
                              >
                                Extend Validity
                              </button>
                              <button
                                onClick={() => {
                                  setCancelRemarks("");
                                  setActiveDialog("cancel");
                                }}
                                className="px-4 py-2 text-xs bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded-xl hover:bg-rose-100 transition cursor-pointer"
                              >
                                Cancel E-Way Bill
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Alert banner state - ORANGE button */
                      <div className="bg-amber-50/45 border border-amber-100 rounded-2xl py-4.5 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs leading-normal shadow-3xs">
                        <div className="flex items-center gap-2 text-amber-800 font-semibold py-1">
                          <Info className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>You can now generate E-Way Bill for this invoice.</span>
                        </div>
                        <button
                          onClick={() => setActiveDialog("generate_ewb")}
                          className="h-10 px-5 flex items-center justify-center gap-1.5 bg-[#d97706] hover:bg-[#b45309] text-white font-extrabold rounded-xl text-xs transition-all border-0 cursor-pointer shrink-0 shadow-md active:scale-98"
                        >
                          ⚡ Generate E-Way Bill
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Bottom Blue Disclaimer banner */}
                  <div className="bg-blue-50/50 border border-blue-150 rounded-2xl p-3 flex items-start gap-2.5 text-[11px] text-blue-800 leading-relaxed font-semibold">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <p>E-Way Bill can be updated, extended or cancelled as per your requirement.</p>
                  </div>

                </div>
              </div>
            ) : (
              /* B2C Layout Flow */
              <div className="space-y-5">
                {/* Info Card banner */}
                <div className="bg-blue-50/50 border border-blue-150 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs leading-relaxed text-blue-800 font-medium">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p>E-Invoice is not applicable for B2C transactions.</p>
                </div>

                {/* E-Way Bill (Standalone) card */}
                <div className={`border border-gray-200 rounded-2xl p-4.5 space-y-4 bg-white transition-all ${
                  hasEWayBill && activeEwbStatus !== "CANCELLED"
                    ? "border-emerald-250 bg-emerald-50/5 shadow-2xs"
                    : "border-gray-200"
                }`}>
                  <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <Truck className={`w-4 h-4 ${hasEWayBill && activeEwbStatus !== "CANCELLED" ? "text-emerald-600" : "text-amber-500"}`} />
                      <span className="font-extrabold text-xs text-gray-905 uppercase tracking-wider">
                        E-Way Bill (Standalone)
                      </span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border flex items-center gap-1 uppercase tracking-wider ${
                      hasEWayBill
                        ? (activeEwbStatus === "CANCELLED" ? "bg-rose-50 text-rose-850 border-rose-200" : "bg-emerald-50 text-emerald-800 border-emerald-200")
                        : "bg-amber-50 text-amber-850 border-amber-200"
                    }`}>
                      {hasEWayBill && activeEwbStatus !== "CANCELLED" && <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3.5]" />}
                      {hasEWayBill 
                        ? (activeEwbStatus === "CANCELLED" ? "CANCELLED" : "GENERATED") 
                        : "PENDING"}
                    </span>
                  </div>

                  {hasEWayBill ? (
                    <div className="space-y-4">
                      {/* Status and EWB details grid */}
                      <div className="grid grid-cols-2 gap-4 text-xs bg-white border border-gray-150 rounded-2xl p-5 md:p-6 shadow-3xs leading-normal">
                        <div className="space-y-4">
                          <div>
                            <span className="text-gray-400 font-bold block text-[8px] uppercase tracking-wider">Status</span>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 mt-1 text-[9px] font-extrabold border rounded-full uppercase tracking-wider ${
                              activeEwbStatus === "CANCELLED"
                                ? "bg-rose-50 text-rose-805 border-rose-200"
                                : "bg-emerald-50 text-emerald-805 border-emerald-200"
                            }`}>
                              {activeEwbStatus === "CANCELLED" && <X className="w-2.5 h-2.5 text-rose-600 stroke-[3]" />}
                              {activeEwbStatus === "CANCELLED" ? "CANCELLED" : "GENERATED"}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 font-bold block text-[8px] uppercase tracking-wider">EWB Number</span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="font-mono font-extrabold text-gray-900 tracking-wider select-all">{activeEwbNo}</span>
                              <button
                                onClick={() => copyToClipboard(activeEwbNo, "E-Way Bill Number")}
                                className="p-1 text-gray-400 hover:text-brand-650 hover:bg-gray-100 rounded-md transition-all shrink-0 bg-transparent border-0 cursor-pointer"
                                title="Copy EWB"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <span className="text-gray-400 font-bold block text-[8px] uppercase tracking-wider">Generated On</span>
                            <p className="font-extrabold text-gray-900 mt-1">{formatDateTime(activeEwbDate)}</p>
                          </div>
                          <div>
                            <span className="text-gray-400 font-bold block text-[8px] uppercase tracking-wider">Valid Till</span>
                            <p className="font-extrabold text-gray-900 mt-1">{formatDateTime(activeEwbValidUpto)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Lifecycle buttons */}
                      <div className="flex flex-wrap gap-2 pt-1 justify-start">
                        <button
                          onClick={handlePrintEWayBillSlip}
                          className="px-4 py-2 text-xs border border-emerald-500 text-emerald-700 bg-white font-bold rounded-xl hover:bg-emerald-50 transition cursor-pointer flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          View PDF
                        </button>

                        {activeEwbStatus !== "CANCELLED" && (
                          <>
                            <button
                              onClick={() => {
                                setVehNo(activeVehicleNo === "—" ? "" : activeVehicleNo);
                                setVehType(activeEwb?.vehicleType || activeEwb?.VehType || "R");
                                setTransMode(activeEwb?.transMode || "1");
                                setTripPinCode(localSale?.buyerPinCode || sellerData?.pinCode || "");
                                setFromState(getGstinStateCode(sellerData?.gstNumber || sellerData?.gstin || "29", "29"));
                                setReasonCode("1");
                                setReasonRemarks("");
                                setActiveDialog("vehicle");
                              }}
                              className="px-4 py-2 text-xs border border-emerald-500 text-emerald-750 bg-white font-bold rounded-xl hover:bg-emerald-50 transition cursor-pointer"
                            >
                              Update Vehicle
                            </button>
                            <button
                              onClick={() => {
                                setTransId(activeTransporterId === "—" ? "" : activeTransporterId);
                                setTransName(activeTransporterName === "—" ? "" : activeTransporterName);
                                setActiveDialog("transporter");
                              }}
                              className="px-4 py-2 text-xs border border-emerald-500 text-emerald-750 bg-white font-bold rounded-xl hover:bg-emerald-50 transition cursor-pointer"
                            >
                              Update Transporter
                            </button>
                            <button
                              onClick={() => {
                                setExtendReason("1");
                                setRemainingDistance("");
                                setExtendRemarks("");
                                setActiveDialog("extend");
                              }}
                              className="px-4 py-2 text-xs border border-emerald-500 text-emerald-755 bg-white font-bold rounded-xl hover:bg-emerald-50 transition cursor-pointer"
                            >
                              Extend Validity
                            </button>
                            <button
                              onClick={() => {
                                setCancelRemarks("");
                                setActiveDialog("cancel");
                              }}
                              className="px-4 py-2 text-xs bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded-xl hover:bg-rose-100 transition cursor-pointer"
                            >
                              Cancel E-Way Bill
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Standalone Generation Box */}
                      <div className="bg-amber-50/30 border border-amber-100 rounded-2xl p-4.5 space-y-3.5 text-center">
                        <p className="text-xs text-amber-800 font-bold">
                          E-Way Bill is required for invoice value above ₹50,000.
                        </p>
                        <button
                          onClick={() => setActiveDialog("generate_ewb")}
                          className="w-full h-10 flex items-center justify-center gap-1.5 bg-[#d97706] hover:bg-[#b45309] text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all border-0 cursor-pointer shadow-sm"
                        >
                          ⚡ Generate E-Way Bill
                        </button>
                      </div>

                      {/* Separator */}
                      <div className="flex items-center justify-center gap-3 select-none">
                        <div className="flex-1 h-px bg-gray-150"></div>
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">OR</span>
                        <div className="flex-1 h-px bg-gray-150"></div>
                      </div>

                      {/* Already Generated Box */}
                      <div className="border border-gray-200 rounded-2xl p-4.5 space-y-2 text-center">
                        <h4 className="font-extrabold text-gray-900 text-xs">Already Generated?</h4>
                        <p className="text-[11px] text-gray-500 font-semibold leading-normal">
                          If E-Way Bill is already generated for this invoice, you can view and manage it.
                        </p>
                        <button
                          onClick={handleLinkExistingEwb}
                          className="w-full h-10 mt-1 flex items-center justify-center gap-1.5 border border-emerald-500 hover:bg-emerald-50 text-emerald-700 bg-white font-bold rounded-xl text-xs transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Existing E-Way Bill
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Blue Disclaimer banner */}
                <div className="bg-blue-50/50 border border-blue-150 rounded-2xl p-3 flex items-start gap-2.5 text-[11px] text-blue-800 leading-relaxed font-semibold">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p>Standalone E-Way Bill will be created without linking IRN.</p>
                </div>
              </div>
            )}

          </div>

          {/* Dialog Action Footer */}
          <div className="px-6 py-4.5 bg-gray-50 border-t border-gray-150 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white border border-gray-250 hover:bg-gray-50 text-gray-755 text-xs font-bold rounded-xl transition cursor-pointer shadow-3xs active:scale-98"
            >
              Close
            </button>
          </div>

          {/* ============================================================== */}
          {/* IN-MODAL FORM DIALOG OVERLAYS (No extra drawers) */}
          {/* ============================================================== */}
          {activeDialog && activeDialog !== "generate_ewb" && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              
              {activeDialog === "view_qr" ? (
                <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm flex flex-col items-center space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="w-full flex justify-between items-center pb-2 border-b border-gray-150">
                    <span className="font-extrabold text-xs text-gray-900 uppercase">NIC Portal Signed QR Code</span>
                    <button onClick={() => setActiveDialog(null)} className="text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="border border-gray-200 p-3 bg-white rounded-2xl shadow-inner">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(localSale.signedQrCode || localSale.eInvoiceInfo?.signed_qr_code || localSale.eInvoice?.signed_qr_code || "https://fpo.bharat.gov.in")}`}
                      alt="NIC Signed QR Code"
                      className="w-48 h-48 block object-contain"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 text-center leading-normal">
                    This QR code is generated by the official IRP server containing the cryptographic signature and invoice parameters.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-lg space-y-5 animate-in zoom-in-95 duration-200">
                  
                  {/* Dialog Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                      <h4 className="font-extrabold text-gray-900 text-sm uppercase tracking-wide">
                        {activeDialog === "cancel" && "Cancel E-Way Bill"}
                        {activeDialog === "extend" && "Extend Validity"}
                        {activeDialog === "vehicle" && "Update Vehicle details"}
                        {activeDialog === "transporter" && "Update Transporter details"}
                      </h4>
                    </div>
                    <button 
                      onClick={() => setActiveDialog(null)}
                      className="text-gray-400 hover:text-gray-650 p-1.5 rounded-full hover:bg-gray-100 border-0 bg-transparent cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Warnings */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-[11px] text-amber-900 leading-relaxed font-semibold">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p>
                      ⚠️ <strong>Live Portal Update:</strong> This action sends an immediate live request to the Government IRP Portal.
                      {activeDialog === "cancel" && " Once cancelled, this E-Way Bill cannot be reactivated."}
                    </p>
                  </div>

                  {/* Dialog Forms */}
                  {activeDialog === "cancel" && (
                    <form onSubmit={handleCancelSubmit} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Reason Code *</label>
                        <select
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs bg-white focus:outline-none focus:border-brand-500 cursor-pointer h-10 font-semibold"
                        >
                          <option value="1">Duplicate</option>
                          <option value="2">Data Entry Mistake</option>
                          <option value="3">Order Cancelled</option>
                          <option value="4">Others</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Remarks *</label>
                        <input
                          type="text"
                          required
                          value={cancelRemarks}
                          onChange={(e) => setCancelRemarks(e.target.value)}
                          placeholder="Remarks for cancellation..."
                          className="w-full border border-gray-205 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-brand-500 h-10 font-semibold"
                        />
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setActiveDialog(null)} className="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-55 transition cursor-pointer bg-white">Cancel</button>
                        <button type="submit" disabled={ewayBillOps.cancel.loading} className="px-5 py-2 bg-rose-605 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer border-0 shadow-sm">
                          {ewayBillOps.cancel.loading ? "Submitting..." : "Yes, Cancel Bill"}
                        </button>
                      </div>
                    </form>
                  )}

                  {activeDialog === "extend" && (
                    <form onSubmit={handleExtendSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Reason Code *</label>
                          <select
                            value={extendReason}
                            onChange={(e) => setExtendReason(e.target.value)}
                            className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs bg-white focus:outline-none cursor-pointer h-10 font-semibold"
                          >
                            <option value="1">Natural Calamity</option>
                            <option value="2">Transshipment</option>
                            <option value="3">Accident</option>
                            <option value="4">Others</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Remaining Distance (KM) *</label>
                          <input
                            type="number"
                            required
                            value={remainingDistance}
                            onChange={(e) => setRemainingDistance(e.target.value)}
                            placeholder="e.g. 50"
                            className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none h-10 font-semibold"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Remarks *</label>
                        <input
                          type="text"
                          required
                          value={extendRemarks}
                          onChange={(e) => setExtendRemarks(e.target.value)}
                          placeholder="Remarks for extension..."
                          className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none h-10 font-semibold"
                        />
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setActiveDialog(null)} className="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-55 transition cursor-pointer bg-white">Cancel</button>
                        <button type="submit" disabled={ewayBillOps.extend.loading} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition cursor-pointer border-0 shadow-sm">
                          {ewayBillOps.extend.loading ? "Extending..." : "Yes, Extend Validity"}
                        </button>
                      </div>
                    </form>
                  )}

                  {activeDialog === "vehicle" && (
                    <form onSubmit={handleVehicleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">New Vehicle No *</label>
                          <input
                            type="text"
                            required
                            value={vehNo}
                            onChange={(e) => setVehNo(e.target.value.toUpperCase().replace(/\s/g, ''))}
                            placeholder="e.g. KA51MC1234"
                            className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none h-10 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Vehicle Type *</label>
                          <select
                            value={vehType}
                            onChange={(e) => setVehType(e.target.value)}
                            className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs bg-white focus:outline-none cursor-pointer h-10 font-semibold"
                          >
                            <option value="R">Regular</option>
                            <option value="O">ODC</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Transport Mode *</label>
                          <select
                            value={transMode}
                            onChange={(e) => setTransMode(e.target.value)}
                            className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs bg-white focus:outline-none cursor-pointer h-10 font-semibold"
                          >
                            <option value="1">Road</option>
                            <option value="2">Rail</option>
                            <option value="3">Air</option>
                            <option value="4">Ship</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Reason Code *</label>
                          <select
                            value={reasonCode}
                            onChange={(e) => setReasonCode(e.target.value)}
                            className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs bg-white focus:outline-none cursor-pointer h-10 font-semibold"
                          >
                            <option value="1">Breakdown</option>
                            <option value="2">Transshipment</option>
                            <option value="3">Others</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Trip PIN Code *</label>
                          <input
                            type="number"
                            required
                            value={tripPinCode}
                            onChange={(e) => setTripPinCode(e.target.value)}
                            placeholder="e.g. 560001"
                            className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none h-10 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">From State Code *</label>
                          <input
                            type="text"
                            required
                            maxLength={2}
                            value={fromState}
                            onChange={(e) => setFromState(e.target.value)}
                            placeholder="e.g. 29"
                            className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none h-10 font-semibold"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Remarks *</label>
                        <input
                          type="text"
                          required
                          value={reasonRemarks}
                          onChange={(e) => setReasonRemarks(e.target.value)}
                          placeholder="Reason for change..."
                          className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none h-10 font-semibold"
                        />
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setActiveDialog(null)} className="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-50 transition cursor-pointer bg-white">Cancel</button>
                        <button type="submit" disabled={ewayBillOps.vehicle.loading} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition cursor-pointer border-0 shadow-sm">
                          {ewayBillOps.vehicle.loading ? "Updating..." : "Yes, Update Vehicle"}
                        </button>
                      </div>
                    </form>
                  )}

                  {activeDialog === "transporter" && (
                    <form onSubmit={handleTransporterSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Transporter GSTIN *</label>
                          <input
                            type="text"
                            required
                            maxLength={15}
                            value={transId}
                            onChange={(e) => setTransId(e.target.value.toUpperCase())}
                            placeholder="e.g. 27AAACQ3770E004"
                            className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none h-10 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Transporter Name *</label>
                          <input
                            type="text"
                            required
                            value={transName}
                            onChange={(e) => setTransName(e.target.value)}
                            placeholder="e.g. XYZ Transport"
                            className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none h-10 font-semibold"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setActiveDialog(null)} className="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-55 transition cursor-pointer bg-white">Cancel</button>
                        <button type="submit" disabled={ewayBillOps.transporter.loading} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition cursor-pointer border-0 shadow-sm">
                          {ewayBillOps.transporter.loading ? "Updating..." : "Yes, Update Transporter"}
                        </button>
                      </div>
                    </form>
                  )}

                </div>
              )}

            </div>
          )}

        </div>
      </div>

      {/* E-Way Bill Form details overlay dialog */}
      <GenerateEWayBillModal
        isOpen={activeDialog === "generate_ewb"}
        item={localSale}
        isB2B={isB2B}
        irn={eInvoiceIrn || localSale?.eInvoiceIrn || localSale?.irn || localSale?.eInvoiceInfo?.irn || localSale?.eInvoice?.irn}
        resolvedParty={resolvedParty}
        onClose={() => setActiveDialog(null)}
        onSubmit={handleEWayBillSubmit}
        loading={ewayBillOps.generate.loading}
        error={ewayBillOps.generate.error}
      />
    </>
  );
}

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
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
  ChevronDown,
  ArrowLeft,
  RefreshCw,
  Plus
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
import { updateSaleOrEstimate, fetchSales } from "../store/thunks/sellThunk";
import { fetchParties } from "../store/thunks/partyThunk";
import {
  clearEWayBillStatus,
  setSelectedEWayBill
} from "../store/slices/eWayBillSlice";
import { updateSaleEInvoice } from "../store/slices/sellSlice";

import { isEInvoiceSessionValid, isEWayBillSessionValid, addAuditLog } from "../lib/api";
import {
  constructEInvoicePayload,
  compileB2CSaleToStandalonePayload,
  isValidEInvoiceResponse,
  normalizeEInvoiceResponse,
  getGstinStateCode,
  formatDateDDMMYYYY
} from "../utils/compliancePayloads";
import GenerateEWayBillModal from "../components/GovernmentCompliance/GenerateEWayBillModal";

export default function GovernmentCompliancePage() {
  const { id } = useParams();
  const navigate = useNavigate();
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
  const [localSale, setLocalSale] = useState(null);
  const [loadingSale, setLoadingSale] = useState(true);
  const [activeDialog, setActiveDialog] = useState(null); // null, "cancel", "extend", "vehicle", "transporter", "generate_ewb", "view_qr"
  const [cachedPdfUrl, setCachedPdfUrl] = useState(null);
  const [authForm, setAuthForm] = useState({ username: "", password: "", gstin: "" });

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

  const fetchLatestSale = async () => {
    if (!id) return;
    try {
      setLoadingSale(true);
      const res = await api.get(`/sell/${id}`);
      const updatedSale = res.data?.data || res.data;
      if (updatedSale) {
        setLocalSale(updatedSale);
      }
    } catch (err) {
      console.error("Failed to fetch sale details in page:", err);
      toast.error("Failed to fetch sale details.");
    } finally {
      setLoadingSale(false);
    }
  };

  // Initial mount load
  useEffect(() => {
    fetchLatestSale();
    if (!parties || parties.length === 0) {
      dispatch(fetchParties({ partyType: "BUYER" }));
    }
  }, [id, dispatch]);

  // Sync state selectors when localSale is loaded/updated
  useEffect(() => {
    if (localSale) {
      dispatch(resetEInvoiceState());
      dispatch(clearEWayBillStatus());
      dispatch(setSelectedEWayBill(null));
      setCachedPdfUrl(null);
      setEInvoiceLocalError(null);
      setEInvoiceLocalLoading(false);
      setActiveDialog(null);

      // Pre-populate if already generated in sale details
      const dbIrn = localSale.eInvoiceIrn || localSale.irn || localSale.eInvoiceInfo?.irn || localSale.eInvoice?.irn;
      const dbAckNo = localSale.eInvoiceAckNo || localSale.ackNo || localSale.eInvoiceInfo?.ackNo || localSale.eInvoice?.ackNo || "—";
      const dbAckDt = localSale.eInvoiceAckDt || localSale.ackDt || localSale.eInvoiceInfo?.ackDt || localSale.eInvoice?.ackDt || localSale.eInvoiceInfo?.ackDate || localSale.eInvoice?.ackDate || localSale.ackDate || "—";

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
  }, [localSale, dispatch]);

  if (loadingSale) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
        <p className="text-sm font-semibold text-gray-500">Loading compliance data...</p>
      </div>
    );
  }

  if (!localSale) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-gray-900">Compliance Sale Record Not Found</h3>
        <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
          The sale bill you are trying to view compliance for does not exist or you do not have permission to view it.
        </p>
        <button
          onClick={() => navigate("/sell/invoices")}
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 hover:bg-gray-55 rounded-xl text-xs font-bold text-gray-700 bg-white cursor-pointer transition shadow-sm"
        >
          <ArrowLeft size={14} /> Back to Sales
        </button>
      </div>
    );
  }

  // Customer Type and details resolution
  const partyId = typeof localSale?.party === "string"
    ? localSale.party
    : (localSale?.party && typeof localSale?.party === "object" ? localSale.party._id : null);

  const resolvedParty = partyId
    ? (parties.find(p => p._id === partyId) || (typeof localSale?.party === "object" ? localSale.party : null))
    : (localSale?.party && typeof localSale?.party === "object" ? localSale.party : null);

  const isB2B = localSale.saleType === "SALE" && resolvedParty && (resolvedParty.gstin || resolvedParty.gstNumber || resolvedParty.gstType?.startsWith("Registered"));

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

  const copyToClipboard = (text, label) => {
    if (!text || text === "—") return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // E-Invoice Generate handler

  const handleEInvoiceAuthSubmit = async (e) => {
    e.preventDefault();
    setEInvoiceLocalLoading(true);
    try {
      await dispatch(authenticateSession({
        username: authForm.username,
        password: authForm.password,
        gstin: authForm.gstin
      })).unwrap();
      
      toast.success("Successfully authenticated with Government E-Invoice Portal!");
      setActiveDialog(null);
      setTimeout(() => {
        triggerEInvoiceGeneration();
      }, 100);
    } catch (err) {
      toast.error(err || "E-Invoice Authentication failed");
    } finally {
      setEInvoiceLocalLoading(false);
    }
  };

  const handleEWayBillAuthSubmit = async (e) => {
    e.preventDefault();
    setEInvoiceLocalLoading(true);
    try {
      await dispatch(authenticateEWayBillSession({
        username: authForm.username,
        password: authForm.password,
        gstin: authForm.gstin
      })).unwrap();
      
      toast.success("Successfully authenticated with Government E-Way Bill Portal!");
      setActiveDialog(null);
    } catch (err) {
      toast.error(err || "E-Way Bill Authentication failed");
    } finally {
      setEInvoiceLocalLoading(false);
    }
  };

  const checkEWayBillAuthAndProceed = (actionCallback) => {
    const sellerGstin = sellerData?.eInvoiceGstin || sellerData?.gstNumber || sellerData?.gstin || "29AAACQ3770E005";
    if (!isEWayBillSessionValid(sellerGstin)) {
      setAuthForm({
        username: sellerData?.eWayBillUsername || "",
        password: "",
        gstin: sellerGstin
      });
      setActiveDialog("ewaybill_auth");
      return;
    }
    actionCallback();
  };

  const triggerEInvoiceGeneration = async () => {
    setEInvoiceLocalLoading(true);
    setEInvoiceLocalError(null);
    dispatch(clearEInvoiceStatus());

    try {
      const sellerGstin = sellerData?.eInvoiceGstin || sellerData?.gstNumber || sellerData?.gstin || "29AAACQ3770E005";
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
        updateSaleEInvoice({
          id: localSale?._id || localSale?.id,
          irn: normalized.irn,
          ackNo: normalized.ackNo || "—",
          ackDt: normalized.ackDt || "—",
          signedInvoice: normalized.signed_invoice,
          signedQrCode: normalized.signed_qr_code,
        })
      );

      const saleId = localSale?._id || localSale?.id;
      try {
        await dispatch(
          updateSaleOrEstimate({
            id: saleId,
            payload: {
              eInvoiceIrn: normalized.irn,
              eInvoiceAckNo: normalized.ackNo,
              eInvoiceAckDt: normalized.ackDt,
              irn: normalized.irn,
              ackNo: normalized.ackNo,
              ackDt: normalized.ackDt,
              eInvoiceStatus: "SUCCESS",
              signedInvoice: normalized.signed_invoice,
              signedQrCode: normalized.signed_qr_code,
              eInvoiceQrCode: normalized.signed_qr_code,
              eInvoiceInfo: {
                irn: normalized.irn,
                ackNo: normalized.ackNo,
                ackDt: normalized.ackDt,
                signed_invoice: normalized.signed_invoice,
                signed_qr_code: normalized.signed_qr_code,
              }
            }
          })
        ).unwrap();
      } catch (err) {
        console.error("Failed to update compliance details in backend database:", err);
      }

      setLocalSale((prev) => ({
        ...prev,
        eInvoiceIrn: normalized.irn,
        eInvoiceAckNo: normalized.ackNo,
        eInvoiceAckDt: normalized.ackDt,
        irn: normalized.irn,
        ackNo: normalized.ackNo,
        ackDt: normalized.ackDt,
        eInvoiceStatus: "SUCCESS",
        signedInvoice: normalized.signed_invoice,
        signedQrCode: normalized.signed_qr_code,
        eInvoiceQrCode: normalized.signed_qr_code,
        eInvoiceInfo: {
          irn: normalized.irn,
          ackNo: normalized.ackNo,
          ackDt: normalized.ackDt,
          signed_invoice: normalized.signed_invoice,
          signed_qr_code: normalized.signed_qr_code,
        }
      }));

      dispatch(
        generateEInvoicePdf({
          signed_qr_code: normalized.signed_qr_code,
          irn: normalized.irn,
          signed_invoice: normalized.signed_invoice
        })
      )
        .unwrap()
        .then(url => setCachedPdfUrl(url))
        .catch(() => {});

      await fetchLatestSale();
    } catch (err) {
      const msg = typeof err === "string" ? err : (err?.message || "Failed to generate E-Invoice.");
      setEInvoiceLocalError(msg);
      toast.error(msg);
    } finally {
      setEInvoiceLocalLoading(false);
    }
  };

  // E-Invoice Generate handler
  const handleGenerateEInvoice = async () => {
    const sellerGstin = sellerData?.eInvoiceGstin || sellerData?.gstNumber || sellerData?.gstin || "29AAACQ3770E005";

    if (!isEInvoiceSessionValid(sellerGstin)) {
      setAuthForm({
        username: sellerData?.eInvoiceUsername || "",
        password: "",
        gstin: sellerGstin
      });
      setActiveDialog("einvoice_auth");
      return;
    }

    await triggerEInvoiceGeneration();
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
      let ewb = null;
      if (isB2B) {
        if (!isEInvoiceSessionValid(sellerGstin)) {
          await dispatch(authenticateSession({})).unwrap();
        }

        const currentIrn = eInvoiceIrn || localSale.eInvoiceIrn || localSale.irn || localSale.eInvoiceInfo?.irn || localSale.eInvoice?.irn;
        ewb = await dispatch(
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
        ewb = await dispatch(
          generateStandaloneEWayBill(standalonePayload)
        ).unwrap();
      }

      toast.success("E-Way Bill registered successfully!");

      const saleId = localSale?._id || localSale?.id;
      if (saleId && ewb) {
        const ewbNo = ewb.ewbNo || ewb.ewayBillNo || ewb.ewaybillNo || ewb.data?.ewbNo || ewb.data?.ewayBillNo;
        const ewbDate = ewb.ewbDate || ewb.ewbDt || ewb.ewayBillDate || ewb.ewaybillDate || ewb.createdAt || ewb.data?.ewbDate;

        try {
          await dispatch(
            updateSaleOrEstimate({
              id: saleId,
              payload: {
                ewayBillNo: ewbNo,
                ewayBillDate: ewbDate,
                ewayBillStatus: ewb.status || "ACTIVE",
                eWayBill: ewb
              }
            })
          ).unwrap();
        } catch (dbErr) {
          console.error("Failed to update E-Way Bill details in database:", dbErr);
        }

        setLocalSale(prev => ({
          ...prev,
          ewayBillNo: ewbNo,
          eWayBillNo: ewbNo,
          ewayBillDate: ewbDate,
          ewayBillStatus: ewb.status || "ACTIVE",
          eWayBill: ewb,
          ewayBill: ewb
        }));
      }

      setActiveDialog(null);
      await fetchLatestSale();
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
      })
      .catch(err => toast.error(err || "Transporter update failed"));
  };

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
  };

  // Derive E-Invoice generated status
  const currentIrn = eInvoiceIrn || localSale?.eInvoiceIrn || localSale?.irn || localSale?.eInvoiceInfo?.irn || localSale?.eInvoice?.irn;
  const isEInvoiceGenerated = eInvoiceStatus === "SUCCESS" || !!currentIrn;
  const isEInvoiceFailed = eInvoiceStatus === "FAILED" || !!eInvoiceLocalError;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 text-sm bg-gray-50/20 min-h-screen font-sans">
      
      {/* Breadcrumb / Back button */}
      <div className="flex justify-between items-center pb-2">
        <button
          onClick={() => navigate("/sell/invoices")}
          className="flex items-center gap-1.5 text-xs font-extrabold text-gray-505 hover:text-gray-900 transition bg-transparent border-0 cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Sales List
        </button>
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono bg-white border border-gray-150 rounded-lg px-2.5 py-1">
          Portal API version: V1.03
        </span>
      </div>

      {/* Header section with Shield icon */}
      <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-650 border border-emerald-100 flex items-center justify-center shrink-0 shadow-3xs">
            <Shield className="w-8 h-8 stroke-[2.5]" />
          </span>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-gray-905 tracking-tight leading-none uppercase">
              Government Compliance Dashboard
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Manage GST compliance parameters, register live E-Invoices and download official permits.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchLatestSale}
            className="flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 bg-white font-bold text-xs rounded-xl shadow-3xs transition cursor-pointer"
          >
            <RefreshCw size={14} /> Refresh Data
          </button>
        </div>
      </div>

      {/* Invoice Overview Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4 relative overflow-hidden shadow-2xs">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full translate-x-12 -translate-y-12"></div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
              isB2B 
                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                : "bg-purple-100 text-purple-700 border-purple-200"
            }`}>
              {isB2B ? <Building className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </span>
            <div>
              <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider">Customer Profile</span>
              <p className="font-extrabold text-gray-900 text-base leading-tight mt-0.5">
                {resolvedParty?.name || localSale.buyerName || "Direct Walk-In Customer"}
              </p>
              {isB2B ? (
                <span className="font-semibold font-mono text-gray-500 text-xs block mt-0.5">
                  GSTIN: {resolvedParty?.gstin || resolvedParty?.gstNumber || "—"}
                </span>
              ) : (
                <span className="font-semibold text-gray-500 text-xs block mt-0.5">
                  Mobile: {resolvedParty?.mobile || resolvedParty?.phone || localSale.buyerMobile || "9876543210"}
                </span>
              )}
            </div>
          </div>
          <div>
            <span className={`inline-flex px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wide border ${
              isB2B 
                ? "bg-emerald-100/60 text-emerald-800 border-emerald-250"
                : "bg-purple-100/60 text-purple-800 border-purple-250"
            }`}>
              {isB2B ? "B2B (GST REGISTERED)" : "B2C (NON-GST)"}
            </span>
          </div>
        </div>

        {/* Invoice details grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5 border-t border-slate-200 text-xs leading-normal">
          <div className="space-y-0.5">
            <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider">Invoice Number</span>
            <span className="font-black text-gray-800 text-sm select-all">{resolvedInvoiceNo}</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider">Invoice Date</span>
            <span className="font-extrabold text-gray-800 text-sm">{resolvedInvoiceDate}</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider">Total Invoice Value</span>
            <span className="font-black text-emerald-700 text-sm">{resolvedAmount}</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider">State of Supply</span>
            <span className="font-extrabold text-gray-800 text-sm">{resolvedParty?.state || localSale.stateOfSupply || "—"}</span>
          </div>
        </div>
      </div>

      {/* Main content Split Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Column 1: GST E-Invoice Card (B2B only) */}
        {isB2B ? (
          <div className={`bg-white border rounded-3xl p-6 space-y-5 transition-all duration-200 shadow-sm ${
            isEInvoiceGenerated ? "border-emerald-200 bg-emerald-50/5" : "border-gray-200"
          }`}>
            
            {/* Header row of E-Invoice card */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <div className="flex gap-3 items-center">
                <div className={`p-2.5 rounded-xl border ${isEInvoiceGenerated ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200"}`}>
                  <FileText className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-gray-900 uppercase tracking-wide">
                    Step 1: GST E-Invoice
                  </h3>
                  <span className="text-[10px] text-gray-400 font-bold mt-0.5 block leading-tight">
                    {isEInvoiceGenerated ? "IRN registered with National Informatics Centre." : "Register invoice parameters on government NIC portal."}
                  </span>
                </div>
              </div>
              
              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black border flex items-center gap-1 uppercase tracking-wider ${
                isEInvoiceGenerated
                  ? "bg-emerald-100/60 text-emerald-800 border-emerald-200"
                  : isEInvoiceFailed
                    ? "bg-rose-100/60 text-rose-800 border-rose-200"
                    : "bg-amber-100/60 text-amber-800 border-amber-200"
              }`}>
                {isEInvoiceGenerated && <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3.5]" />}
                {isEInvoiceGenerated ? "GENERATED" : isEInvoiceFailed ? "FAILED" : "NOT GENERATED"}
              </span>
            </div>

            {isEInvoiceGenerated ? (
              <div className="space-y-4">
                {/* Details layout */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4.5 space-y-4 leading-normal text-xs shadow-3xs">
                  <div>
                    <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider">Invoice Reference Number (IRN)</span>
                    <div className="flex items-center gap-2 mt-1.5 bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-[10px] font-bold text-slate-700">
                      <span className="break-all select-all flex-1 leading-normal" title={currentIrn}>
                        {currentIrn}
                      </span>
                      <button
                        onClick={() => copyToClipboard(currentIrn, "IRN")}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition shrink-0 bg-transparent border-0 cursor-pointer"
                        title="Copy IRN"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1.5 border-t border-gray-100">
                    <div>
                      <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider">Ack Number</span>
                      <p className="font-black text-slate-805 mt-1 text-sm">{ackNo || localSale.eInvoiceAckNo || localSale.ackNo || "—"}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider">Ack Date</span>
                      <p className="font-extrabold text-slate-808 mt-1 text-sm">
                        {formatDateTime(ackDt || localSale.eInvoiceAckDt || localSale.ackDt || localSale.eInvoiceInfo?.ackDt || localSale.eInvoiceInfo?.ackDate || localSale.eInvoice?.ackDate || localSale.ackDate || "—")}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2.5 border-t border-gray-100">
                    <div>
                      <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider font-sans">Signed Invoice</span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 mt-1.5 text-[9px] font-black text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-full uppercase tracking-wider">
                        ✓ Available
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider font-sans">Signed QR Code</span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 mt-1.5 text-[9px] font-black text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-full uppercase tracking-wider">
                        ✓ Available
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions buttons */}
                <div className="flex gap-2.5">
                  <button
                    onClick={() => {
                      setActiveDialog("view_qr");
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-xs border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition cursor-pointer bg-white shadow-3xs"
                  >
                    <QrCode className="w-4 h-4" />
                    View QR Code
                  </button>
                  <button
                    onClick={handleDownloadPdf}
                    disabled={pdfLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition cursor-pointer border-0 shadow-sm"
                  >
                    {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Download PDF
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-505 font-semibold leading-relaxed">
                  An official GST E-Invoice containing a unique cryptographic Invoice Reference Number (IRN) must be registered with the Government compliance gateway for all B2B credit/cash invoices.
                </p>

                {eInvoiceLocalError && (
                  <div className="bg-rose-50 border border-rose-150 p-4 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 leading-relaxed font-semibold">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">E-Invoice Registration Failed</p>
                      <p className="text-[11px] text-rose-700 mt-0.5 leading-normal">{eInvoiceLocalError}</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleGenerateEInvoice}
                  disabled={eInvoiceLocalLoading}
                  className="w-full h-11 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 border-0 cursor-pointer shadow-sm active:scale-99"
                >
                  {eInvoiceLocalLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Registering with Government NIC Portal...
                    </>
                  ) : (
                    "Generate GST E-Invoice"
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* B2C Layout Flow Info Card */
          <div className="bg-white border border-gray-200 rounded-3xl p-6 space-y-4 shadow-sm flex flex-col items-center justify-center text-center py-10">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Info className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-black text-gray-905 uppercase">E-Invoice Not Required</h3>
            <p className="text-xs text-gray-500 max-w-sm leading-relaxed font-medium">
              This invoice is a B2C (Business-to-Consumer) transaction. Government guidelines do not require E-Invoice generation for non-GST registered customers. You can proceed directly to generate a Standalone E-Way Bill if needed.
            </p>
          </div>
        )}

        {/* Column 2: E-Way Bill (Standalone or Linked) Card */}
        <div className={`bg-white border rounded-3xl p-6 space-y-5 transition-all duration-200 shadow-sm ${
          hasEWayBill && activeEwbStatus !== "CANCELLED"
            ? "border-emerald-200 bg-emerald-50/5"
            : "border-gray-200"
        }`}>
          
          <div className="flex justify-between items-center pb-4 border-b border-gray-100">
            <div className="flex gap-3 items-center">
              <div className={`p-2.5 rounded-xl border ${hasEWayBill && activeEwbStatus !== "CANCELLED" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200"}`}>
                <Truck className="w-5 h-5 shrink-0" />
              </div>
              <div>
                <h3 className="font-black text-sm text-gray-900 uppercase tracking-wide">
                  {isB2B ? "Step 2: E-Way Bill (IRN-Linked)" : "Government E-Way Bill"}
                </h3>
                <span className="text-[10px] text-gray-400 font-bold mt-0.5 block leading-tight">
                  {hasEWayBill ? "Logistics transit permit registered and active." : "Register vehicle and logistics for bulk transit permit."}
                </span>
              </div>
            </div>
            
            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black border flex items-center gap-1 uppercase tracking-wider ${
              isB2B && !isEInvoiceGenerated
                ? "bg-slate-100 text-slate-400 border-slate-200"
                : hasEWayBill
                  ? (activeEwbStatus === "CANCELLED" ? "bg-rose-100/60 text-rose-800 border-rose-200" : "bg-emerald-100/60 text-emerald-800 border-emerald-200")
                  : "bg-amber-100/60 text-amber-800 border-amber-200"
            }`}>
              {hasEWayBill && activeEwbStatus !== "CANCELLED" && <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3.5]" />}
              {isB2B && !isEInvoiceGenerated 
                ? "WAITING FOR STEP 1" 
                : hasEWayBill 
                  ? (activeEwbStatus === "CANCELLED" ? "CANCELLED" : "GENERATED") 
                  : "PENDING"}
            </span>
          </div>

          {isB2B && !isEInvoiceGenerated ? (
            <div className="bg-slate-50 rounded-2xl p-6 text-center border border-dashed border-slate-200 py-8 space-y-2">
              <p className="text-sm text-gray-400 font-extrabold uppercase tracking-wide">🔒 Sequence Locked</p>
              <p className="text-xs text-gray-500 max-w-xs mx-auto leading-normal">
                Please complete Step 1 (GST E-Invoice) first to enable the IRN-linked E-Way Bill logistics generation.
              </p>
            </div>
          ) : hasEWayBill ? (
            <div className="space-y-4">
              {/* EWB details grid */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4.5 space-y-3.5 leading-normal text-xs shadow-3xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider">E-Way Bill Number</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="font-mono font-black text-slate-808 tracking-wider select-all text-sm">{activeEwbNo}</span>
                      <button
                        onClick={() => copyToClipboard(activeEwbNo, "E-Way Bill Number")}
                        className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded transition shrink-0 bg-transparent border-0 cursor-pointer"
                        title="Copy EWB"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider">Status</span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 mt-1 text-[9px] font-black border rounded-full uppercase tracking-wider ${
                      activeEwbStatus === "CANCELLED"
                        ? "bg-rose-50 text-rose-800 border-rose-200"
                        : "bg-emerald-50 text-emerald-800 border-emerald-100"
                    }`}>
                      {activeEwbStatus === "CANCELLED" && <X className="w-2.5 h-2.5 text-rose-600 stroke-[3]" />}
                      {activeEwbStatus === "CANCELLED" ? "CANCELLED" : "ACTIVE"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                  <div>
                    <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider">Vehicle Number</span>
                    <p className="font-mono font-black text-slate-808 mt-1">{activeVehicleNo || "—"}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider">Transporter ID</span>
                    <p className="font-mono font-black text-slate-808 mt-1">{activeTransporterId || "—"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                  <div>
                    <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider">Generated On</span>
                    <p className="font-extrabold text-slate-808 mt-1">{formatDateTime(activeEwbDate)}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider">Valid Till</span>
                    <p className="font-extrabold text-slate-808 mt-1">{formatDateTime(activeEwbValidUpto)}</p>
                  </div>
                </div>
              </div>

              {/* Lifecycle buttons */}
              <div className="flex flex-wrap gap-2 justify-start pt-1">
                <button
                  onClick={handlePrintEWayBillSlip}
                  className="h-10 px-4 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition cursor-pointer border-0 shadow-sm flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  View PDF Slip
                </button>

                {activeEwbStatus !== "CANCELLED" && (
                  <>
                    <button
                      onClick={() => checkEWayBillAuthAndProceed(() => {
                        setVehNo(activeVehicleNo === "—" ? "" : activeVehicleNo);
                        setVehType(activeEwb?.vehicleType || activeEwb?.VehType || "R");
                        setTransMode(activeEwb?.transMode || "1");
                        setTripPinCode(localSale?.buyerPinCode || sellerData?.pinCode || "");
                        setFromState(getGstinStateCode(sellerData?.gstNumber || sellerData?.gstin || "29", "29"));
                        setReasonCode("1");
                        setReasonRemarks("");
                        setActiveDialog("vehicle");
                      })}
                      className="h-10 px-4 text-xs border border-gray-250 text-gray-700 bg-white font-bold rounded-xl hover:bg-gray-50 transition cursor-pointer shadow-3xs"
                    >
                      Update Vehicle
                    </button>
                    <button
                      onClick={() => checkEWayBillAuthAndProceed(() => {
                        setTransId(activeTransporterId === "—" ? "" : activeTransporterId);
                        setTransName(activeTransporterName === "—" ? "" : activeTransporterName);
                        setActiveDialog("transporter");
                      })}
                      className="h-10 px-4 text-xs border border-gray-250 text-gray-700 bg-white font-bold rounded-xl hover:bg-gray-50 transition cursor-pointer shadow-3xs"
                    >
                      Update Transporter
                    </button>
                    <button
                      onClick={() => checkEWayBillAuthAndProceed(() => {
                        setExtendReason("1");
                        setRemainingDistance("");
                        setExtendRemarks("");
                        setActiveDialog("extend");
                      })}
                      className="h-10 px-4 text-xs border border-gray-250 text-gray-700 bg-white font-bold rounded-xl hover:bg-gray-50 transition cursor-pointer shadow-3xs"
                    >
                      Extend Validity
                    </button>
                    <button
                      onClick={() => checkEWayBillAuthAndProceed(() => {
                        setCancelRemarks("");
                        setActiveDialog("cancel");
                      })}
                      className="h-10 px-4 text-xs bg-rose-50 border border-rose-150 text-rose-700 font-bold rounded-xl hover:bg-rose-100 transition cursor-pointer"
                    >
                      Cancel E-Way Bill
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Generate button state */
            <div className="space-y-4">
              <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5 space-y-4 text-xs leading-normal shadow-3xs">
                <div className="flex items-start gap-2.5 text-amber-855 font-semibold">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    E-Way Bill is required by GST regulations for the transportation of goods where total invoice value exceeds ₹50,000. Click to enter transport logistics details.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const sellerGstin = sellerData?.eInvoiceGstin || sellerData?.gstNumber || sellerData?.gstin || "29AAACQ3770E005";
                    if (isB2B) {
                      if (!isEInvoiceSessionValid(sellerGstin)) {
                        setAuthForm({
                          username: sellerData?.eInvoiceUsername || "",
                          password: "",
                          gstin: sellerGstin
                        });
                        setActiveDialog("einvoice_auth");
                        return;
                      }
                    } else {
                      if (!isEWayBillSessionValid(sellerGstin)) {
                        setAuthForm({
                          username: sellerData?.eWayBillUsername || "",
                          password: "",
                          gstin: sellerGstin
                        });
                        setActiveDialog("ewaybill_auth");
                        return;
                      }
                    }
                    setActiveDialog("generate_ewb");
                  }}
                  className="w-full h-11 flex items-center justify-center gap-1.5 bg-[#d97706] hover:bg-[#b45309] text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all border-0 cursor-pointer shadow-sm active:scale-98"
                >
                  Generate E-Way Bill
                </button>
              </div>

              {!isB2B && (
                <>
                  <div className="flex items-center justify-center gap-3 select-none">
                    <div className="flex-1 h-px bg-gray-150"></div>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">OR</span>
                    <div className="flex-1 h-px bg-gray-150"></div>
                  </div>

                  <div className="border border-gray-200 rounded-2xl p-5 text-center space-y-3.5 bg-white shadow-3xs">
                    <h4 className="font-extrabold text-gray-900 text-xs">E-Way Bill already exists?</h4>
                    <p className="text-[11px] text-gray-500 font-semibold leading-relaxed max-w-sm mx-auto">
                      If an E-Way Bill has already been generated externally, you can link the 12-digit number to record it against this invoice.
                    </p>
                    <button
                      onClick={handleLinkExistingEwb}
                      className="w-full h-10 flex items-center justify-center gap-1.5 border border-emerald-500 hover:bg-emerald-50 text-emerald-705 bg-white font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Link Existing E-Way Bill
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Compliance Notice Banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-3xl p-5 flex items-start gap-3.5 text-xs text-blue-900 leading-normal font-medium shadow-3xs">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-blue-950 uppercase tracking-wide text-[10px]">Portal Compliance Advisory</p>
          <p className="text-blue-900 leading-relaxed font-semibold">
            All updates registered through this page are transmitted live in real-time to the NIC GST portals. Cancellations of generated E-Way Bills must be submitted within 24 hours of registration, and vehicle updates can only be completed prior to transit expiry.
          </p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* FORM DIALOG OVERLAYS (No extra drawers) */}
      {/* ============================================================== */}
      {activeDialog && activeDialog !== "generate_ewb" && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          
          {activeDialog === "view_qr" ? (
            <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm flex flex-col items-center space-y-4 animate-in zoom-in-95 duration-200 border border-gray-100">
              <div className="w-full flex justify-between items-center pb-2 border-b border-gray-150">
                <span className="font-extrabold text-xs text-gray-905 uppercase">NIC Portal Signed QR Code</span>
                <button onClick={() => setActiveDialog(null)} className="text-gray-400 hover:text-gray-655 bg-transparent border-0 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <div className="border border-gray-205 p-3 bg-white rounded-2xl shadow-inner">
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
          ) : activeDialog === "einvoice_auth" || activeDialog === "ewaybill_auth" ? (
            <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md space-y-5 animate-in zoom-in-95 duration-200 border border-gray-100 font-sans text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Shield className="w-5 h-5 stroke-[2.5]" />
                  <h4 className="font-extrabold text-gray-900 text-sm uppercase tracking-wide">
                    {activeDialog === "einvoice_auth" ? "NIC E-Invoice Portal Login" : "NIC E-Way Bill Portal Login"}
                  </h4>
                </div>
                <button 
                  onClick={() => setActiveDialog(null)}
                  className="text-gray-400 hover:text-gray-650 p-1.5 rounded-full hover:bg-gray-100 border-0 bg-transparent cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3.5 flex items-start gap-2 text-emerald-855 leading-relaxed font-semibold">
                <Info size={14} className="shrink-0 mt-0.5" />
                <p className="text-[10px] leading-normal font-medium text-emerald-800">
                  Authenticate your connection to the government sandbox portal. Entered credentials will only be used to acquire a secure session token.
                </p>
              </div>

              <form onSubmit={activeDialog === "einvoice_auth" ? handleEInvoiceAuthSubmit : handleEWayBillAuthSubmit} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                    NIC Portal Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={authForm.username}
                    onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                    placeholder="e.g. nic_user"
                    className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none h-10 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                    NIC Portal Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none h-10 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                    Taxpayer GSTIN *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={authForm.gstin}
                    onChange={(e) => setAuthForm({ ...authForm, gstin: e.target.value.toUpperCase() })}
                    placeholder="e.g. 29AAACQ3770E005"
                    className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none h-10 font-mono font-semibold"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setActiveDialog(null)} className="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-55 transition cursor-pointer bg-white">Cancel</button>
                  <button type="submit" disabled={eInvoiceLocalLoading} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer border-0 shadow-sm">
                    {eInvoiceLocalLoading ? "Logging in..." : "Login & Authenticate"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-lg space-y-5 animate-in zoom-in-95 duration-200 border border-gray-100">
              
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
                    <button type="submit" disabled={ewayBillOps.cancel.loading} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer border-0 shadow-sm">
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
                        <option value="O">Over Dimensional Cargo (ODC)</option>
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
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Trip Pincode *</label>
                      <input
                        type="text"
                        required
                        value={tripPinCode}
                        onChange={(e) => setTripPinCode(e.target.value)}
                        placeholder="Pincode..."
                        className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none h-10 font-semibold"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Reason Code *</label>
                      <select
                        value={reasonCode}
                        onChange={(e) => setReasonCode(e.target.value)}
                        className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs bg-white focus:outline-none cursor-pointer h-10 font-semibold"
                      >
                        <option value="1">Due to transshipment</option>
                        <option value="2">Vehicle breakdown</option>
                        <option value="3">Transporter change</option>
                        <option value="4">Others</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">From State Code *</label>
                      <input
                        type="text"
                        required
                        value={fromState}
                        onChange={(e) => setFromState(e.target.value)}
                        placeholder="State code (e.g. 29)..."
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
                      placeholder="Remarks..."
                      className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none h-10 font-semibold"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setActiveDialog(null)} className="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-55 transition cursor-pointer bg-white">Cancel</button>
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
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Transporter ID *</label>
                      <input
                        type="text"
                        required
                        value={transId}
                        onChange={(e) => setTransId(e.target.value.toUpperCase())}
                        placeholder="e.g. 29AAACQ3770E005"
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
                        className="w-full border border-gray-205 px-3 py-2 rounded-xl text-xs focus:outline-none h-10 font-semibold"
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
    </div>
  );
}

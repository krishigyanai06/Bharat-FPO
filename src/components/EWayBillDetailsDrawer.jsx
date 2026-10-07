import React, { useState, useEffect } from "react";
import { X, Copy, Truck, User, Calendar, Shield, Clock, AlertTriangle, AlertCircle, Printer } from "lucide-react";
import toast from "react-hot-toast";

export default function EWayBillDetailsDrawer({
  isOpen,
  onClose,
  ewayBill,
  onCancel,
  onExtend,
  onUpdateVehicle,
  onUpdateTransporter,
  cancelLoading,
  extendLoading,
  vehicleLoading,
  transporterLoading,
  initialActiveDialog = null
}) {
  const [activeDialog, setActiveDialog] = useState(initialActiveDialog);

  useEffect(() => {
    if (isOpen) {
      setActiveDialog(initialActiveDialog);
    }
  }, [isOpen, initialActiveDialog]);
  
  // Dialog inputs
  const [cancelReason, setCancelReason] = useState("1"); // 1-Duplicate, 2-Data Entry Mistake, 3-Order Cancelled, 4-Others
  const [cancelRemarks, setCancelRemarks] = useState("");
  
  const [extendReason, setExtendReason] = useState("1"); // 1-Natural Calamity, 2-Transshipment, 3-Accident, 4-Others
  const [extendRemarks, setExtendRemarks] = useState("");
  const [remainingDistance, setRemainingDistance] = useState("");

  const [vehNo, setVehNo] = useState("");
  const [vehType, setVehType] = useState("R");
  const [transMode, setTransMode] = useState("1");
  const [reasonCode, setReasonCode] = useState("1"); // 1-Breakdown, 2-Transshipment, 3-Others
  const [reasonRemarks, setReasonRemarks] = useState("");
  const [tripPinCode, setTripPinCode] = useState("");
  const [fromState, setFromState] = useState("");
  
  const [transId, setTransId] = useState("");
  const [transName, setTransName] = useState("");

  if (!isOpen || !ewayBill) return null;

  // Normalize backend/governmental schema keys
  const ewbNo = ewayBill.ewayBillNo || ewayBill.ewbNo || ewayBill.id;
  const ewbDate = ewayBill.ewayBillDate || ewayBill.ewbDt || ewayBill.createdAt || "—";
  const validUpto = ewayBill.validUpto || ewayBill.ewbValidTill || "—";
  const status = ewayBill.status || ewayBill.ewayBillStatus || "ACTIVE";
  const vehicleNo = ewayBill.vehicleNo || ewayBill.VehNo || "—";
  const transporterId = ewayBill.transporterId || ewayBill.transId || "—";
  const transporterName = ewayBill.transporterName || ewayBill.transName || "—";
  const distance = ewayBill.distance || ewayBill.Distance || 0;

  const copyToClipboard = (text, label) => {
    if (!text || text === "—") return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const handlePrintEWayBillSlip = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked! Please allow popups to print.");
      return;
    }

    const docNo = ewayBill.docNo || "—";
    const docDate = ewayBill.docDate || "—";
    const vehType = ewayBill.vehicleType === "O" || ewayBill.VehType === "O" ? "Over Dimensional (ODC)" : "Regular";

    printWindow.document.write(`
      <html>
        <head>
          <title>E-Way Bill - ${ewbNo}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #333; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px; }
            .header p { margin: 5px 0 0 0; font-size: 12px; color: #666; }
            .status-badge { display: inline-block; padding: 4px 12px; font-weight: bold; border-radius: 4px; border: 1px solid; font-size: 11px; text-transform: uppercase; float: right; }
            .status-active { background-color: #e6f4ea; color: #137333; border-color: #c2e7cd; }
            .status-cancelled { background-color: #fce8e6; color: #c5221f; border-color: #fad2cf; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; background-color: #fafafa; }
            .card h3 { margin-top: 0; margin-bottom: 10px; font-size: 13px; text-transform: uppercase; color: #4f46e5; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .field { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px; }
            .field-label { color: #666; font-weight: 500; }
            .field-value { font-weight: bold; color: #111; }
            .barcode-placeholder { text-align: center; margin: 25px 0; border: 1px dashed #bbb; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 12px; background-color: #fff; }
            .footer { text-align: center; margin-top: 40px; font-size: 10px; color: #888; border-top: 1px solid #eee; padding-top: 15px; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="status-badge ${status === "CANCELLED" ? "status-cancelled" : "status-active"}">${status}</div>
          <div class="header">
            <h1>E-Way Bill Summary Slip</h1>
            <p>Generated via Bharat-FPO ERP Integration (Government compliance service gateway)</p>
          </div>

          <div class="barcode-placeholder">
            <div style="font-size: 24px; font-family: monospace; letter-spacing: 4px; margin-bottom: 5px;">*${ewbNo}*</div>
            <div style="font-weight: bold; font-size: 14px; letter-spacing: 2px;">EWB No: ${ewbNo}</div>
          </div>

          <div class="grid">
            <div class="card">
              <h3>Basic Details</h3>
              <div class="field"><span class="field-label">E-Way Bill No:</span><span class="field-value">${ewbNo}</span></div>
              <div class="field"><span class="field-label">Generated Date:</span><span class="field-value">${ewbDate}</span></div>
              <div class="field"><span class="field-label">Valid Upto:</span><span class="field-value">${validUpto}</span></div>
              <div class="field"><span class="field-label">Distance:</span><span class="field-value">${distance} KM</span></div>
            </div>
            <div class="card">
              <h3>Reference Document</h3>
              <div class="field"><span class="field-label">Document Type:</span><span class="field-value">Tax Invoice</span></div>
              <div class="field"><span class="field-label">Document No:</span><span class="field-value">${docNo}</span></div>
              <div class="field"><span class="field-label">Document Date:</span><span class="field-value">${docDate}</span></div>
            </div>
          </div>

          <div class="card" style="margin-bottom: 20px;">
            <h3>Transporter & Vehicle Details</h3>
            <div class="grid" style="grid-template-columns: 1fr 1fr; border: none; padding: 0; margin: 0; background: none;">
              <div style="border-right: 1px solid #eee; padding-right: 15px;">
                <div class="field"><span class="field-label">Active Vehicle No:</span><span class="field-value" style="font-family: monospace;">${vehicleNo}</span></div>
                <div class="field"><span class="field-label">Vehicle Type:</span><span class="field-value">${vehType}</span></div>
              </div>
              <div style="padding-left: 15px;">
                <div class="field"><span class="field-label">Transporter ID:</span><span class="field-value">${transporterId}</span></div>
                <div class="field"><span class="field-label">Transporter Name:</span><span class="field-value">${transporterName}</span></div>
              </div>
            </div>
          </div>

          <div class="footer">
            This is a computer-generated summary slip of the registered Government E-Way Bill.<br/>
            Always carry the official portal printout or dynamic QR link during transport verification.
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCancelSubmit = (e) => {
    e.preventDefault();
    onCancel({
      ewayBillNo: ewbNo,
      cancelRsnCode: Number(cancelReason) || 1,
      cancelRemarks: cancelRemarks || "Data Entry Mistake"
    }, () => {
      setActiveDialog(null);
    });
  };

  const handleExtendSubmit = (e) => {
    e.preventDefault();
    onExtend({
      ewayBillNo: ewbNo,
      extnReasonCode: Number(extendReason) || 1,
      extnRemarks: extendRemarks || "Transit Delay",
      remainingDistance: Number(remainingDistance) || 100,
    }, () => {
      setActiveDialog(null);
    });
  };

  const handleVehicleSubmit = (e) => {
    e.preventDefault();
    onUpdateVehicle({
      ewayBillNo: ewbNo,
      vehicleNo: vehNo,
      vehicleType: vehType,
      transMode: transMode,
      reasonCode: reasonCode,
      reasonRemarks: reasonRemarks,
      tripPinCode: Number(tripPinCode) || undefined,
      fromState: fromState || undefined
    }, () => {
      setActiveDialog(null);
    });
  };

  const handleTransporterSubmit = (e) => {
    e.preventDefault();
    onUpdateTransporter({
      ewayBillNo: ewbNo,
      transporterId: transId,
      transporterName: transName
    }, () => {
      setActiveDialog(null);
    });
  };

  // Timeline computation based on logs/fields
  const timelineEvents = [];
  
  // 1. Generation
  timelineEvents.push({
    title: "E-Way Bill Generated",
    subtitle: `Generated successfully on ${ewbDate}`,
    details: `EWB No: ${ewbNo} | Valid for ${distance} km`,
    time: ewbDate,
    status: "success"
  });

  // 2. Vehicle Updates history (if any exists)
  if (ewayBill.vehicleHistory && Array.isArray(ewayBill.vehicleHistory)) {
    ewayBill.vehicleHistory.forEach((log) => {
      timelineEvents.push({
        title: "Vehicle Updated",
        subtitle: `Changed to ${log.vehicleNo} (${log.vehicleType === 'O' ? 'ODC' : 'Regular'})`,
        details: `Reason: ${log.reason || "Transshipment"} | Group Code: ${log.reasonCode || "-"}`,
        time: log.updatedAt || log.date,
        status: "info"
      });
    });
  } else if (vehicleNo && vehicleNo !== "—") {
    // Show active vehicle entry if no logs
    timelineEvents.push({
      title: "Vehicle Assigned",
      subtitle: `Active Vehicle: ${vehicleNo}`,
      details: `Mode: Road | Type: ${ewayBill.VehType === 'O' || ewayBill.vehicleType === 'O' ? 'Over Dimensional' : 'Regular'}`,
      time: ewbDate,
      status: "info"
    });
  }

  // 3. Extension (if exists)
  if (ewayBill.extensionLogs && Array.isArray(ewayBill.extensionLogs)) {
    ewayBill.extensionLogs.forEach((log) => {
      timelineEvents.push({
        title: "Validity Extended",
        subtitle: `Extended successfully till ${log.newValidUpto}`,
        details: `Remarks: ${log.remarks || "Delay in transit"}`,
        time: log.extendedAt,
        status: "info"
      });
    });
  }

  // 4. Cancelled Status
  if (status === "CANCELLED" || ewayBill.cancelDate) {
    timelineEvents.push({
      title: "E-Way Bill Cancelled",
      subtitle: `Cancelled on ${ewayBill.cancelDate || "recently"}`,
      details: `Reason: ${ewayBill.cancelReason || "Data entry error"}`,
      time: ewayBill.cancelDate || "",
      status: "error"
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      
      {/* Background click close */}
      <div className="flex-1" onClick={onClose}></div>
      
      {/* Drawer content */}
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col relative overflow-hidden animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-900 text-base">E-Way Bill Details</h2>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                status === "CANCELLED" 
                  ? "bg-rose-50 text-rose-700 border-rose-200" 
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}>
                {status}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-mono flex items-center gap-1.5">
              No: {ewbNo}
              <button 
                onClick={() => copyToClipboard(ewbNo, "EWB Number")}
                className="text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
              </button>
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Section 1: Basic Information */}
          <div className="border border-gray-150 rounded-2xl p-4 bg-white shadow-3xs space-y-3.5">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-brand-600" />
              Basic Document Information
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs leading-relaxed">
              <div>
                <span className="text-gray-400 font-medium">Supply Type</span>
                <p className="font-semibold text-gray-800">{ewayBill.supplyType || "Outward"}</p>
              </div>
              <div>
                <span className="text-gray-400 font-medium">Sub Type</span>
                <p className="font-semibold text-gray-800">{ewayBill.subType || "Supply"}</p>
              </div>
              <div>
                <span className="text-gray-400 font-medium">Document Type</span>
                <p className="font-semibold text-gray-800">{ewayBill.docType || "Tax Invoice"}</p>
              </div>
              <div>
                <span className="text-gray-400 font-medium">Document No / Date</span>
                <p className="font-semibold text-gray-800">{ewayBill.docNo || "—"} / {ewayBill.docDate || "—"}</p>
              </div>
            </div>
          </div>

          {/* Section 2: Transport Logistical Details */}
          <div className="border border-gray-150 rounded-2xl p-4 bg-white shadow-3xs space-y-3.5">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-brand-600" />
              Logistical & Transport Info
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs leading-relaxed">
              <div>
                <span className="text-gray-400 font-medium">Active Vehicle</span>
                <p className="font-semibold text-gray-850 font-mono">{vehicleNo}</p>
              </div>
              <div>
                <span className="text-gray-400 font-medium">Vehicle Type</span>
                <p className="font-semibold text-gray-800">
                  {ewayBill.vehicleType === "O" || ewayBill.VehType === "O" ? "Over Dimensional (ODC)" : "Regular"}
                </p>
              </div>
              <div>
                <span className="text-gray-400 font-medium">Distance</span>
                <p className="font-semibold text-gray-800">{distance} KM</p>
              </div>
              <div>
                <span className="text-gray-400 font-medium">Transporter Id / Name</span>
                <p className="font-semibold text-gray-800">{transporterId} / {transporterName}</p>
              </div>
            </div>
          </div>

          {/* Section 3: Validity Info */}
          <div className="border border-gray-150 rounded-2xl p-4 bg-white shadow-3xs space-y-3.5">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" />
              Validity and Timeline Range
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs leading-relaxed">
              <div>
                <span className="text-gray-400 font-medium">Valid From</span>
                <p className="font-semibold text-gray-800">{ewbDate}</p>
              </div>
              <div>
                <span className="text-gray-400 font-medium">Valid Upto</span>
                <p className="font-semibold text-gray-805">{validUpto}</p>
              </div>
            </div>
          </div>

          {/* Section 4: History Timeline */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-600" />
              Lifecycle Timeline Logs
            </h3>
            <div className="relative border-l border-gray-150 pl-5 ml-2.5 space-y-5 py-2">
              {timelineEvents.map((ev, i) => (
                <div key={i} className="relative">
                  {/* Point */}
                  <span className={`absolute -left-7 top-1 w-3 h-3 rounded-full border-2 border-white flex items-center justify-center ${
                    ev.status === 'success' ? 'bg-emerald-500' : ev.status === 'error' ? 'bg-rose-500' : 'bg-blue-500'
                  }`}></span>
                  <div className="text-xs">
                    <p className="font-bold text-gray-800">{ev.title}</p>
                    <p className="text-gray-400 text-[10px] mt-0.5">{ev.time}</p>
                    <p className="text-gray-505 mt-1 leading-relaxed">{ev.subtitle}</p>
                    {ev.details && <p className="text-gray-400 font-mono text-[10px] mt-0.5">{ev.details}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Actions Bar Footer (Mutating actions triggers warnings, print is always active) */}
        <div className="border-t border-gray-100 p-4 bg-gray-50 flex items-center justify-between gap-2 flex-wrap">
          <button
            onClick={handlePrintEWayBillSlip}
            className="px-4 py-2 text-xs bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
          >
            <Printer className="w-3.5 h-3.5" /> Print EWB Slip
          </button>

          {status !== "CANCELLED" && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setTransId(transporterId === "—" ? "" : transporterId);
                  setTransName(transporterName === "—" ? "" : transporterName);
                  setActiveDialog("transporter");
                }}
                className="px-3.5 py-2 text-xs border border-gray-205 text-gray-700 bg-white font-semibold rounded-xl hover:bg-gray-100 transition cursor-pointer"
              >
                Update Transporter
              </button>
              <button
                onClick={() => {
                  setVehNo(vehicleNo === "—" ? "" : vehicleNo);
                  setVehType(ewayBill.vehicleType || ewayBill.VehType || "R");
                  setActiveDialog("vehicle");
                }}
                className="px-3.5 py-2 text-xs border border-gray-205 text-gray-700 bg-white font-semibold rounded-xl hover:bg-gray-100 transition cursor-pointer"
              >
                Update Vehicle
              </button>
              <button
                onClick={() => setActiveDialog("extend")}
                className="px-3.5 py-2 text-xs border border-gray-205 text-gray-700 bg-white font-semibold rounded-xl hover:bg-gray-100 transition cursor-pointer"
              >
                Extend Validity
              </button>
              <button
                onClick={() => setActiveDialog("cancel")}
                className="px-4 py-2 text-xs bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded-xl transition cursor-pointer"
              >
                Cancel EWB
              </button>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* MUTATION OVERLAY WARNING DIALOGS (Government Confirmation Alerts) */}
        {/* ============================================================== */}
        {activeDialog && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
            <div className="bg-white rounded-t-3xl shadow-2xl p-6 space-y-5 animate-in slide-in-from-bottom duration-200">
              
              {/* Dialog Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="w-5 h-5" />
                  <h4 className="font-bold text-gray-900 text-sm">
                    {activeDialog === "cancel" && "Confirm NIC Portal Cancellation"}
                    {activeDialog === "extend" && "Confirm Validity Extension"}
                    {activeDialog === "vehicle" && "Confirm Vehicle Transshipment Log"}
                    {activeDialog === "transporter" && "Confirm Transporter Update"}
                  </h4>
                </div>
                <button 
                  onClick={() => setActiveDialog(null)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Warnings */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-[11px] text-amber-850 leading-relaxed font-semibold">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  ⚠️ <strong>Disclaimer:</strong> This action will send an immediate live API update to the official Government GST portal. Please ensure all values entered are accurate.
                  {activeDialog === "cancel" && " Once cancelled, this E-Way Bill cannot be reactivated or modified."}
                </p>
              </div>

              {/* Dialog Forms */}
              {activeDialog === "cancel" && (
                <form onSubmit={handleCancelSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Reason Code *</label>
                    <select
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full border border-gray-205 px-3 py-2 rounded-xl text-xs bg-white focus:outline-none"
                    >
                      <option value="1">Duplicate</option>
                      <option value="2">Data Entry Mistake</option>
                      <option value="3">Order Cancelled</option>
                      <option value="4">Others</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Remarks *</label>
                    <input
                      type="text"
                      required
                      value={cancelRemarks}
                      onChange={(e) => setCancelRemarks(e.target.value)}
                      placeholder="e.g. Typo error in distance input"
                      className="w-full border border-gray-205 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setActiveDialog(null)} className="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-50 transition">Cancel</button>
                    <button type="submit" disabled={cancelLoading} className="px-5 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl hover:bg-rose-700 transition">
                      {cancelLoading ? "Submitting..." : "Yes, Cancel Bill"}
                    </button>
                  </div>
                </form>
              )}

              {activeDialog === "extend" && (
                <form onSubmit={handleExtendSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Reason Code *</label>
                      <select
                        value={extendReason}
                        onChange={(e) => setExtendReason(e.target.value)}
                        className="w-full border border-gray-205 px-3 py-2 rounded-xl text-xs bg-white focus:outline-none"
                      >
                        <option value="1">Natural Calamity</option>
                        <option value="2">Transshipment</option>
                        <option value="3">Accident</option>
                        <option value="4">Others</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Remaining Distance (KM) *</label>
                      <input
                        type="number"
                        required
                        value={remainingDistance}
                        onChange={(e) => setRemainingDistance(e.target.value)}
                        placeholder="e.g. 50"
                        className="w-full border border-gray-205 px-3 py-2 rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Remarks *</label>
                    <input
                      type="text"
                      required
                      value={extendRemarks}
                      onChange={(e) => setExtendRemarks(e.target.value)}
                      placeholder="e.g. Lorry break down in highway"
                      className="w-full border border-gray-205 px-3 py-2 rounded-xl text-xs focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setActiveDialog(null)} className="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-50 transition">Cancel</button>
                    <button type="submit" disabled={extendLoading} className="px-5 py-2 bg-brand-600 text-white text-xs font-semibold rounded-xl hover:bg-brand-700 transition">
                      {extendLoading ? "Extending..." : "Yes, Extend Validity"}
                    </button>
                  </div>
                </form>
              )}

              {activeDialog === "vehicle" && (
                <form onSubmit={handleVehicleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">New Vehicle No *</label>
                      <input
                        type="text"
                        required
                        value={vehNo}
                        onChange={(e) => setVehNo(e.target.value.toUpperCase().replace(/\s/g, ''))}
                        placeholder="e.g. KA51MC1234"
                        className="w-full border border-gray-205 px-3 py-2 rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Vehicle Type *</label>
                      <select
                        value={vehType}
                        onChange={(e) => setVehType(e.target.value)}
                        className="w-full border border-gray-205 px-3 py-2 rounded-xl text-xs bg-white focus:outline-none"
                      >
                        <option value="R">Regular</option>
                        <option value="O">ODC</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Transport Mode *</label>
                      <select
                        value={transMode}
                        onChange={(e) => setTransMode(e.target.value)}
                        className="w-full border border-gray-205 px-3 py-2 rounded-xl text-xs bg-white focus:outline-none"
                      >
                        <option value="1">Road</option>
                        <option value="2">Rail</option>
                        <option value="3">Air</option>
                        <option value="4">Ship</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Reason Code *</label>
                      <select
                        value={reasonCode}
                        onChange={(e) => setReasonCode(e.target.value)}
                        className="w-full border border-gray-205 px-3 py-2 rounded-xl text-xs bg-white focus:outline-none"
                      >
                        <option value="1">Breakdown</option>
                        <option value="2">Transshipment</option>
                        <option value="3">Others</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Trip PIN Code *</label>
                      <input
                        type="number"
                        required
                        value={tripPinCode}
                        onChange={(e) => setTripPinCode(e.target.value)}
                        placeholder="e.g. 560001"
                        className="w-full border border-gray-205 px-3 py-2 rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">From State Code *</label>
                      <input
                        type="text"
                        required
                        maxLength={2}
                        value={fromState}
                        onChange={(e) => setFromState(e.target.value)}
                        placeholder="e.g. 29"
                        className="w-full border border-gray-205 px-3 py-2 rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Remarks *</label>
                    <input
                      type="text"
                      required
                      value={reasonRemarks}
                      onChange={(e) => setReasonRemarks(e.target.value)}
                      placeholder="e.g. Shift cargo due to axle breakdown"
                      className="w-full border border-gray-205 px-3 py-2 rounded-xl text-xs focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setActiveDialog(null)} className="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-55 transition">Cancel</button>
                    <button type="submit" disabled={vehicleLoading} className="px-5 py-2 bg-brand-600 text-white text-xs font-semibold rounded-xl hover:bg-brand-700 transition">
                      {vehicleLoading ? "Updating..." : "Yes, Update Vehicle"}
                    </button>
                  </div>
                </form>
              )}

              {activeDialog === "transporter" && (
                <form onSubmit={handleTransporterSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Transporter GSTIN *</label>
                      <input
                        type="text"
                        required
                        maxLength={15}
                        value={transId}
                        onChange={(e) => setTransId(e.target.value.toUpperCase())}
                        placeholder="e.g. 27AAACQ3770E004"
                        className="w-full border border-gray-205 px-3 py-2 rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Transporter Name *</label>
                      <input
                        type="text"
                        required
                        value={transName}
                        onChange={(e) => setTransName(e.target.value)}
                        placeholder="e.g. XYZ Transport"
                        className="w-full border border-gray-205 px-3 py-2 rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setActiveDialog(null)} className="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-55 transition">Cancel</button>
                    <button type="submit" disabled={transporterLoading} className="px-5 py-2 bg-brand-600 text-white text-xs font-semibold rounded-xl hover:bg-brand-700 transition">
                      {transporterLoading ? "Updating..." : "Yes, Update Transporter"}
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}

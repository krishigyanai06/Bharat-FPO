import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchProcurementSaleDetails,
  deleteProcurementSale,
} from "../../redux/procurementSaleThunk";
import { SkeletonTable } from "../../components/Skeleton";
import {
  ArrowLeft,
  Printer,
  ShieldAlert,
  CheckCircle,
  Download,
  Truck,
  Pencil,
  Trash2,
  FileText,
  Building2,
  User,
  MapPin,
} from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import procurementSaleService from "../../services/procurementSaleService";
import { formatINR } from "../../components/ProcurementSales/procurementSaleHelpers";
import EWayBillModal from "../../components/ProcurementSales/EWayBillModal";

export default function ProcurementSaleDetails({ id, onBack, onEdit }) {
  const dispatch = useDispatch();
  const { currentSale: sale, loading } = useSelector((s) => s.procurementSales);
  const [localSale, setLocalSale] = useState(null);
  const [showEWayBillModal, setShowEWayBillModal] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchProcurementSaleDetails(id));
    }
  }, [id, dispatch]);

  useEffect(() => {
    if (sale) {
      setLocalSale(sale);
    }
  }, [sale]);

  const handlePrint = async () => {
    try {
      toast.loading("Preparing print...", { id: "print-invoice" });
      const blobData = await procurementSaleService.downloadInvoicePdf(localSale._id);
      const fileURL = window.URL.createObjectURL(blobData);
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = fileURL;
      document.body.appendChild(iframe);
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      toast.success("Print dialog opened!", { id: "print-invoice" });
    } catch (e) {
      console.error(e);
      toast.error("Failed to prepare print", { id: "print-invoice" });
    }
  };

  const handleDownload = async () => {
    try {
      toast.loading("Downloading PDF invoice...", { id: "download-invoice" });
      const blobData = await procurementSaleService.downloadInvoicePdf(localSale._id);
      const fileURL = window.URL.createObjectURL(blobData);
      const link = document.createElement("a");
      link.href = fileURL;
      link.download = `Invoice_${localSale.invoiceNumber || localSale.invoiceNo || localSale._id}.pdf`;
      link.click();
      toast.success("Downloaded successfully!", { id: "download-invoice" });
    } catch (e) {
      console.error(e);
      toast.error("Failed to download invoice PDF", { id: "download-invoice" });
    }
  };

  const handleDelete = () => {
    Swal.fire({
      title: "Delete Crop Sale?",
      text: "This will revert the sale, restore stock quantities to the godown, and remove associated ledger entries!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DC2626",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Yes, Delete Sale",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await dispatch(deleteProcurementSale(localSale._id)).unwrap();
          toast.success("Sale deleted and stock restored!");
          onBack();
        } catch (err) {
          toast.error(err || "Failed to delete sale");
        }
      }
    });
  };

  if (loading && !localSale) {
    return <SkeletonTable rows={10} cols={6} />;
  }

  if (!localSale) {
    return (
      <div className="text-center py-12 space-y-4">
        <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
        <p className="text-xs text-slate-500 font-bold">Sale invoice details not found.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-brand-600 text-white font-bold text-xs rounded-xl hover:bg-brand-700 transition cursor-pointer"
        >
          Back to Sales List
        </button>
      </div>
    );
  }

  const grandTotal = Number(localSale.totalAmount) || 0;
  const received = Number(localSale.receivedAmount) || 0;
  const outstanding = Math.max(0, grandTotal - received);
  const hasEwb = !!(localSale.eWayBill?.ewbNo || localSale.ewayBillNo || localSale.eWayBillNo);

  return (
    <div className="space-y-6 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/80 pb-4 print:hidden bg-white p-4 rounded-2xl shadow-3xs">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Sales List
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEWayBillModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-extrabold shadow-3xs transition cursor-pointer"
          >
            <Truck size={14} /> {hasEwb ? "View / Regenerate E-Way Bill" : "Generate E-Way Bill"}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 bg-white shadow-3xs transition cursor-pointer"
          >
            <Printer size={14} /> Print Invoice
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 bg-white shadow-3xs transition cursor-pointer"
          >
            <Download size={14} /> Download Tax Invoice PDF
          </button>

          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(localSale._id)}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 bg-white shadow-3xs transition cursor-pointer"
            >
              <Pencil size={14} /> Edit Sale
            </button>
          )}

          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-extrabold shadow-3xs transition cursor-pointer"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* Main Details Body Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Invoice Layout */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
          {/* FPO Info Header */}
          <div className="flex justify-between border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                BULK CROP DISPATCH INVOICE
              </h2>
              <p className="text-[11px] text-slate-400 font-bold">
                Bharat-FPO Procurement Logistics Division
              </p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Invoice Number
              </p>
              <h4 className="text-base font-mono font-black text-slate-900">
                {localSale.invoiceNumber || localSale.invoiceNo || "—"}
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Buyer Details Card */}
            <div className="space-y-2 border border-slate-100 p-4 rounded-xl bg-slate-50/50">
              <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px] block border-b border-slate-200/60 pb-1 mb-1">
                Billed To (Buyer)
              </span>
              <p className="text-sm font-black text-slate-900">
                {localSale.buyerName || localSale.buyer?.name || "Walk-in Buyer"}
              </p>
              {localSale.phone && (
                <p>
                  <span className="text-slate-400 font-bold">Phone:</span> +91 {localSale.phone}
                </p>
              )}
              {localSale.buyer?.gstin && (
                <p className="font-mono">
                  <span className="text-slate-400 font-bold">GSTIN:</span> {localSale.buyer.gstin}
                </p>
              )}
              {localSale.address && (
                <p>
                  <span className="text-slate-400 font-bold">Address:</span> {localSale.address}
                </p>
              )}
            </div>

            {/* Logistics & Shipment Card */}
            <div className="space-y-2 border border-slate-100 p-4 rounded-xl bg-slate-50/50">
              <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px] block border-b border-slate-200/60 pb-1 mb-1">
                Shipment & Logistics
              </span>
              <p>
                <span className="text-slate-400 font-bold">Sale Date:</span>{" "}
                {localSale.createdAt ? new Date(localSale.createdAt).toLocaleDateString("en-IN") : "—"}
              </p>
              <p>
                <span className="text-slate-400 font-bold">Transporter:</span>{" "}
                {localSale.dispatchDetails?.transporterName || "—"}
              </p>
              {localSale.dispatchDetails?.transporterId && (
                <p>
                  <span className="text-slate-400 font-bold">Transporter ID:</span>{" "}
                  {localSale.dispatchDetails.transporterId}
                </p>
              )}
              <p>
                <span className="text-slate-400 font-bold">Vehicle No:</span>{" "}
                <span className="font-mono font-bold text-slate-900">
                  {localSale.dispatchDetails?.vehicleNo || "—"}
                </span>
              </p>
              <p>
                <span className="text-slate-400 font-bold">Distance:</span>{" "}
                {localSale.dispatchDetails?.distance ? `${localSale.dispatchDetails.distance} KM` : "—"}
              </p>
            </div>
          </div>

          {/* Crops List Grid */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">
              Crop Stock Items Disbursed
            </h4>
            <div className="border border-slate-200/80 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider">
                    <th className="px-4 py-2.5 text-left">Crop Name</th>
                    <th className="px-4 py-2.5 text-left">Variety</th>
                    <th className="px-4 py-2.5 text-left">Godown</th>
                    <th className="px-4 py-2.5 text-right">Quantity</th>
                    <th className="px-4 py-2.5 text-right">Rate</th>
                    <th className="px-4 py-2.5 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {(localSale.crops || []).map((c, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 font-bold text-slate-900">{c.cropName}</td>
                      <td className="px-4 py-3 text-slate-500">{c.variety || "—"}</td>
                      <td className="px-4 py-3 text-slate-500">{c.godown || "—"}</td>
                      <td className="px-4 py-3 text-right font-extrabold text-slate-800">
                        {c.quantity} {c.unit}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">{formatINR(c.rate)}</td>
                      <td className="px-4 py-3 text-right font-black text-brand-700">
                        {formatINR(c.quantity * c.rate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Breakdown */}
          <div className="flex justify-end pt-4 border-t border-slate-100 text-xs">
            <div className="w-64 space-y-2 font-semibold text-slate-600">
              <div className="flex justify-between text-sm pt-1 border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-900">Grand Total</span>
                <span className="font-black text-brand-700">{formatINR(grandTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Received Amount</span>
                <span className="font-bold text-slate-800">{formatINR(received)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="font-bold text-slate-900">Outstanding Balance</span>
                <span className={`font-bold ${outstanding > 0 ? "text-amber-600" : "text-slate-800"}`}>
                  {formatINR(outstanding)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* E-Way Bill & Compliance Card */}
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>Government E-Way Bill</span>
            </h3>

            {hasEwb ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Status</span>
                  <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-black uppercase">
                    Generated
                  </span>
                </div>
                <div className="space-y-1 font-mono text-slate-900 pt-1">
                  <p>
                    <span className="text-slate-500 font-sans">EWB No:</span>{" "}
                    <span className="font-bold">
                      {localSale.eWayBill?.ewbNo || localSale.ewayBillNo || localSale.eWayBillNo}
                    </span>
                  </p>
                  {localSale.eWayBill?.ewbDate && (
                    <p className="text-[11px]">
                      <span className="text-slate-500 font-sans">Date:</span> {localSale.eWayBill.ewbDate}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3 text-center text-xs text-slate-500">
                <p className="font-semibold">
                  E-Way Bill has not been generated for this crop dispatch invoice.
                </p>
                <button
                  type="button"
                  onClick={() => setShowEWayBillModal(true)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition cursor-pointer shadow-sm"
                >
                  + Generate E-Way Bill
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showEWayBillModal && (
        <EWayBillModal
          sale={localSale}
          onClose={() => setShowEWayBillModal(false)}
          onSuccess={(updated) => setLocalSale(updated)}
        />
      )}
    </div>
  );
}

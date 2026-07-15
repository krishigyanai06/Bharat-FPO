import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProcurementSaleDetails } from "../../redux/procurementSaleThunk";
import GovernmentComplianceCard from "../../components/ProcurementSales/GovernmentComplianceCard";
import { SkeletonTable } from "../../components/Skeleton";
import { ArrowLeft, Printer, ShieldAlert, CheckCircle, Clock, Download } from "lucide-react";
import toast from "react-hot-toast";
import procurementSaleService from "../../services/procurementSaleService";

export default function ProcurementSaleDetails({ id, onBack }) {
  const dispatch = useDispatch();
  const { currentSale: sale, loading } = useSelector((s) => s.procurementSales);
  const [localSale, setLocalSale] = useState(null);

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

  if (loading && !localSale) {
    return <SkeletonTable rows={10} cols={6} />;
  }

  if (!localSale) {
    return (
      <div className="text-center py-10 space-y-3">
        <ShieldAlert className="w-10 h-10 text-red-500 mx-auto" />
        <p className="text-xs text-gray-500 font-semibold">Sale invoice details not found.</p>
        <button onClick={onBack} className="text-brand-600 font-bold text-xs hover:underline">
          Back to List
        </button>
      </div>
    );
  }

  const outstanding = (localSale.totalAmount || 0) - (localSale.receivedAmount || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-150 pb-4 print:hidden">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to List
        </button>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 bg-white shadow-sm transition cursor-pointer"
          >
            <Printer size={14} /> Print Invoice
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 bg-white shadow-sm transition cursor-pointer"
          >
            <Download size={14} /> Download PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Invoice Body Card */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
          
          {/* FPO Info Header */}
          <div className="flex justify-between border-b border-gray-100 pb-5">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-gray-900 tracking-wide uppercase">CROP DISPATCH INVOICE</h2>
              <p className="text-[10px] text-gray-400 font-bold">Bharat-FPO Procurement Logistics Division</p>
            </div>
            <div className="text-right space-y-1.5">
              <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Invoice Number</p>
              <h4 className="text-base font-mono font-black text-gray-800">
                {localSale.invoiceNumber || localSale.invoiceNo || "—"}
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            {/* Buyer Details */}
            <div className="space-y-2 border border-gray-50 p-4 rounded-xl">
              <span className="font-extrabold text-gray-400 uppercase tracking-wider text-[10px] block border-b border-gray-100 pb-1 mb-1">
                Billed To (Buyer)
              </span>
              <p className="text-sm font-black text-gray-800">{localSale.buyerName || localSale.buyer?.name}</p>
              {localSale.phone && <p><span className="text-gray-400 font-semibold">Phone:</span> +91 {localSale.phone}</p>}
              {localSale.buyer?.gstin && (
                <p className="font-mono"><span className="text-gray-400 font-semibold">GSTIN:</span> {localSale.buyer.gstin}</p>
              )}
              {localSale.address && <p><span className="text-gray-400 font-semibold">Address:</span> {localSale.address}</p>}
            </div>

            {/* General Info & Dispatch Details */}
            <div className="space-y-2 border border-gray-50 p-4 rounded-xl">
              <span className="font-extrabold text-gray-400 uppercase tracking-wider text-[10px] block border-b border-gray-100 pb-1 mb-1">
                Shipment & Logistics
              </span>
              <p><span className="text-gray-400 font-semibold">Sale Date:</span> {localSale.createdAt ? new Date(localSale.createdAt).toLocaleDateString("en-IN") : "—"}</p>
              <p><span className="text-gray-400 font-semibold">Transporter:</span> {localSale.dispatchDetails?.transporterName || "—"}</p>
              {localSale.dispatchDetails?.transporterId && (
                <p><span className="text-gray-400 font-semibold">Transporter ID:</span> {localSale.dispatchDetails.transporterId}</p>
              )}
              <p><span className="text-gray-400 font-semibold">Vehicle No:</span> {localSale.dispatchDetails?.vehicleNo || "—"}</p>
              <p><span className="text-gray-400 font-semibold">Distance:</span> {localSale.dispatchDetails?.distance ? `${localSale.dispatchDetails.distance} KM` : "—"}</p>
            </div>
          </div>

          {/* Crops List Grid */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-gray-400 uppercase tracking-wider text-[10px]">Crops Disbursed</h4>
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-[10px] text-gray-450 font-bold uppercase tracking-wider">
                    <th className="px-4 py-2 text-left">Crop</th>
                    <th className="px-4 py-2 text-left">Variety</th>
                    <th className="px-4 py-2 text-left">Godown</th>
                    <th className="px-4 py-2 text-right">Quantity</th>
                    <th className="px-4 py-2 text-right">Rate</th>
                    <th className="px-4 py-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                  {(localSale.crops || []).map((c, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2.5 font-bold text-gray-800">{c.cropName}</td>
                      <td className="px-4 py-2.5 text-gray-500">{c.variety || "—"}</td>
                      <td className="px-4 py-2.5 text-gray-500">{c.godown || "—"}</td>
                      <td className="px-4 py-2.5 text-right">{c.quantity} {c.unit}</td>
                      <td className="px-4 py-2.5 text-right">₹{c.rate}</td>
                      <td className="px-4 py-2.5 text-right">₹{(c.quantity * c.rate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoice Summary Totals */}
          <div className="flex justify-end pt-4 border-t border-gray-100 text-xs">
            <div className="w-64 space-y-2.5 font-semibold text-gray-600">
              <div className="flex justify-between text-sm">
                <span className="font-bold text-gray-900">Grand Total</span>
                <span className="font-extrabold text-brand-600">
                  ₹{(localSale.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Received Amount</span>
                <span>₹{(localSale.receivedAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between">
                <span className="font-bold text-gray-900">Outstanding Balance</span>
                <span className={`font-bold ${outstanding > 0 ? "text-orange-600" : "text-gray-800"}`}>
                  ₹{Math.max(0, outstanding).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {localSale.dispatchDetails?.remarks && (
            <div className="border-t border-gray-100 pt-4 text-xs text-gray-400">
              <span className="font-bold uppercase tracking-wider text-[9px] block">Remarks / Notes</span>
              <p className="mt-1 leading-relaxed font-semibold">{localSale.dispatchDetails.remarks}</p>
            </div>
          )}
        </div>

        {/* Compliance Card Right-side */}
        <div className="col-span-1 print:hidden">
          <GovernmentComplianceCard
            sale={localSale}
            onGenerated={(updated) => setLocalSale(updated)}
          />
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchProcurementSales,
  deleteProcurementSale,
} from "../../redux/procurementSaleThunk";
import { SkeletonTable } from "../../components/Skeleton";
import {
  Search,
  Plus,
  ArrowUpDown,
  CheckCircle,
  Truck,
  MoreVertical,
  RefreshCw,
  Clock,
  AlertCircle,
  XCircle,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import procurementSaleService from "../../services/procurementSaleService";
import SalesSummaryCards from "../../components/ProcurementSales/SalesSummaryCards";
import { formatINR } from "../../components/ProcurementSales/procurementSaleHelpers";

export default function ProcurementSaleList({ onCreate, onEdit, onView }) {
  const dispatch = useDispatch();
  const { sales = [], loading, error } = useSelector((s) => s.procurementSales);

  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("ALL"); // "ALL", "PAID", "PARTIAL", "UNPAID"
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" });

  const [openRowActionId, setOpenRowActionId] = useState(null);
  const rowMenuRef = useRef(null);

  const loadData = () => {
    dispatch(fetchProcurementSales());
  };

  useEffect(() => {
    loadData();
  }, [dispatch]);

  // Close dropdown menu on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (rowMenuRef.current && !rowMenuRef.current.contains(e.target)) {
        setOpenRowActionId(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "desc" };
    });
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: "Delete Crop Sale?",
      text: "This will revert the sale, restore stock quantities to the godown, and remove associated ledger entries!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DC2626",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Yes, Delete Sale",
      cancelButtonText: "Cancel",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await dispatch(deleteProcurementSale(id)).unwrap();
          toast.success("Crop sale deleted and stock restored successfully!");
        } catch (err) {
          toast.error(err || "Failed to delete sale invoice");
        }
      }
    });
  };

  const processedData = useMemo(() => {
    let result = [...sales];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          (s.invoiceNumber || s.invoiceNo || "").toLowerCase().includes(q) ||
          (s.buyerName || s.buyer?.name || "").toLowerCase().includes(q) ||
          (s.phone || s.buyer?.phone || "").includes(q)
      );
    }

    // Payment Filter
    if (paymentFilter !== "ALL") {
      result = result.filter((s) => {
        const grandTotal = Number(s.totalAmount) || 0;
        const received = Number(s.receivedAmount) || 0;
        const due = grandTotal - received;

        if (paymentFilter === "PAID") return due <= 0;
        if (paymentFilter === "PARTIAL") return due > 0 && received > 0;
        if (paymentFilter === "UNPAID") return received <= 0;
        return true;
      });
    }

    // Sort (Default: Latest created sales on top)
    result.sort((a, b) => {
      if (sortConfig.key === "createdAt") {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (dateA !== dateB) {
          return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
        }
        const idA = String(a._id || a.id || "");
        const idB = String(b._id || b.id || "");
        return sortConfig.direction === "asc" ? idA.localeCompare(idB) : idB.localeCompare(idA);
      }

      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (sortConfig.key === "buyer") {
        valA = a.buyerName || a.buyer?.name || "";
        valB = b.buyerName || b.buyer?.name || "";
      } else if (sortConfig.key === "totalQuantity") {
        valA = (a.crops || []).reduce((sum, c) => sum + (c.quantity || 0), 0);
        valB = (b.crops || []).reduce((sum, c) => sum + (c.quantity || 0), 0);
      }

      if (typeof valA === "string") {
        return sortConfig.direction === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return sortConfig.direction === "asc" ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
    });

    return result;
  }, [sales, searchQuery, paymentFilter, sortConfig]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSales = processedData.slice(startIndex, startIndex + itemsPerPage);

  if (loading && sales.length === 0) {
    return (
      <div className="w-full h-full min-h-[calc(100vh-4rem)] space-y-6">
        <SkeletonTable rows={8} cols={8} />
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[calc(100vh-4rem)] flex flex-col space-y-5 select-none pb-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Procurement Crop Sales
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
              Bulk Trade
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Manage bulk crop sales, godown stock dispatches, compliance invoices, and E-Way bills.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition border border-slate-200 bg-white cursor-pointer active:scale-95 shadow-3xs"
            title="Refresh List"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            type="button"
            onClick={onCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold rounded-xl text-xs shadow-md transition active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            <span>+ New Crop Sale</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary Metric Cards */}
      <SalesSummaryCards salesList={sales} />

      {/* 3. Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice number, buyer name, or phone..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white text-slate-800"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 p-1 rounded-xl text-xs font-bold text-slate-600">
            <Filter size={13} className="text-slate-400 ml-1.5" />
            <button
              type="button"
              onClick={() => { setPaymentFilter("ALL"); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-lg transition ${
                paymentFilter === "ALL" ? "bg-white shadow-3xs text-brand-700 font-extrabold" : "hover:text-slate-900"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => { setPaymentFilter("PAID"); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-lg transition ${
                paymentFilter === "PAID" ? "bg-white shadow-3xs text-emerald-700 font-extrabold" : "hover:text-slate-900"
              }`}
            >
              Paid
            </button>
            <button
              type="button"
              onClick={() => { setPaymentFilter("PARTIAL"); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-lg transition ${
                paymentFilter === "PARTIAL" ? "bg-white shadow-3xs text-blue-700 font-extrabold" : "hover:text-slate-900"
              }`}
            >
              Partial
            </button>
            <button
              type="button"
              onClick={() => { setPaymentFilter("UNPAID"); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-lg transition ${
                paymentFilter === "UNPAID" ? "bg-white shadow-3xs text-rose-700 font-extrabold" : "hover:text-slate-900"
              }`}
            >
              Unpaid
            </button>
          </div>

          <span className="text-xs text-slate-400 font-bold hidden lg:inline">
            {processedData.length} records
          </span>
        </div>
      </div>

      {/* 4. Full Scrollable Table */}
      <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-x-auto flex-1">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider select-none">
              <th className="px-4 py-3.5 text-left bg-slate-50">Invoice No</th>
              <th className="px-4 py-3.5 text-left cursor-pointer bg-slate-50" onClick={() => handleSort("buyer")}>
                Buyer Name <ArrowUpDown size={10} className="inline ml-1" />
              </th>
              <th className="px-4 py-3.5 text-left cursor-pointer bg-slate-50" onClick={() => handleSort("createdAt")}>
                Sale Date <ArrowUpDown size={10} className="inline ml-1" />
              </th>
              <th className="px-4 py-3.5 text-right cursor-pointer bg-slate-50" onClick={() => handleSort("totalQuantity")}>
                Total Qty <ArrowUpDown size={10} className="inline ml-1" />
              </th>
              <th className="px-4 py-3.5 text-right cursor-pointer bg-slate-50" onClick={() => handleSort("totalAmount")}>
                Grand Total <ArrowUpDown size={10} className="inline ml-1" />
              </th>
              <th className="px-4 py-3.5 text-center bg-slate-50">Billing</th>
              <th className="px-4 py-3.5 text-center bg-slate-50">Payment Status</th>
              <th className="px-4 py-3.5 text-center bg-slate-50">E-Way Bill</th>
              <th className="px-4 py-3.5 text-center bg-slate-50">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
            {paginatedSales.map((sale) => {
              const qtySum = (sale.crops || []).reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
              const unit = sale.crops?.[0]?.unit || "qtl";
              const grandTotal = Number(sale.totalAmount) || 0;
              const received = Number(sale.receivedAmount) || 0;
              const outstanding = Math.max(0, grandTotal - received);

              const hasEwb = !!(sale.eWayBill?.ewbNo || sale.ewayBillNo || sale.eWayBillNo);

              return (
                <tr key={sale._id} className="hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                    {sale.invoiceNumber || sale.invoiceNo || "—"}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-slate-800">
                    {sale.buyerName || sale.buyer?.name || "Walk-in Buyer"}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500">
                    {sale.createdAt ? new Date(sale.createdAt).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td className="px-4 py-3.5 text-right font-extrabold text-slate-800">
                    {qtySum} {unit}
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-brand-700">
                    {formatINR(grandTotal)}
                  </td>
                  <td className="px-4 py-3.5 text-center font-bold text-slate-600">
                    {sale.billingType || "Cash"}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {outstanding <= 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle size={10} /> Paid
                      </span>
                    ) : received > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                        Partial ({formatINR(outstanding)})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                        Unpaid
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {hasEwb ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Truck size={10} /> Generated
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center relative overflow-visible">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenRowActionId(openRowActionId === sale._id ? null : sale._id);
                      }}
                      className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {openRowActionId === sale._id && (
                      <div
                        ref={rowMenuRef}
                        className="absolute right-6 top-2 w-44 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-40 text-left animate-in fade-in zoom-in-95 duration-150"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setOpenRowActionId(null);
                            onView(sale._id);
                          }}
                          className="w-full px-4 py-2 text-xs font-bold text-slate-700 hover:bg-brand-50 hover:text-brand-700 transition"
                        >
                          View Details & EWB
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            setOpenRowActionId(null);
                            try {
                              toast.loading("Preparing print...", { id: "print-invoice" });
                              const blobData = await procurementSaleService.downloadInvoicePdf(sale._id);
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
                          }}
                          className="w-full px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                        >
                          Print Tax Invoice
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            setOpenRowActionId(null);
                            try {
                              toast.loading("Downloading PDF invoice...", { id: "download-invoice" });
                              const blobData = await procurementSaleService.downloadInvoicePdf(sale._id);
                              const fileURL = window.URL.createObjectURL(blobData);
                              const link = document.createElement("a");
                              link.href = fileURL;
                              link.download = `Invoice_${sale.invoiceNumber || sale.invoiceNo || sale._id}.pdf`;
                              link.click();
                              toast.success("Downloaded successfully!", { id: "download-invoice" });
                            } catch (e) {
                              console.error(e);
                              toast.error("Failed to download invoice PDF", { id: "download-invoice" });
                            }
                          }}
                          className="w-full px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                        >
                          Download Tax Invoice PDF
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setOpenRowActionId(null);
                            onEdit(sale._id);
                          }}
                          className="w-full px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition border-t border-slate-100"
                        >
                          Edit Sale Entry
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setOpenRowActionId(null);
                            handleDelete(sale._id);
                          }}
                          className="w-full px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
                        >
                          Delete Sale Record
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {processedData.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-400 font-bold select-none">
                  No crop sales records match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center text-xs text-slate-500 font-bold bg-white border border-slate-200/80 p-4 rounded-2xl shadow-3xs">
          <span>
            Showing page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2 items-center">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-3.5 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-white"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 bg-brand-50 text-brand-700 rounded-xl font-black border border-brand-200">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3.5 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-white"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

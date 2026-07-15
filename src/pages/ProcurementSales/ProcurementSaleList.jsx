import { useEffect, useState, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProcurementSales, deleteProcurementSale } from "../../redux/procurementSaleThunk";
import { SkeletonTable } from "../../components/Skeleton";
import { Search, Eye, Pencil, Trash2, Plus, ArrowUpDown, ShieldAlert, CheckCircle, Truck, FileText, MoreVertical } from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { generateIndividualSalePDF } from "../../utils/clientPdfGenerator";
import procurementSaleService from "../../services/procurementSaleService";

export default function ProcurementSaleList({ onCreate, onEdit, onView }) {
  const dispatch = useDispatch();
  const { sales = [], loading, error } = useSelector((s) => s.procurementSales);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" });

  const [openRowActionId, setOpenRowActionId] = useState(null);
  const rowMenuRef = useRef(null);

  useEffect(() => {
    dispatch(fetchProcurementSales());
  }, [dispatch]);

  // Close dropdown on click outside
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
      return { key, direction: "asc" };
    });
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This will revert the sale, restore stock quantities, and remove ledger records!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#15803D",
      cancelButtonColor: "#EF4444",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await dispatch(deleteProcurementSale(id)).unwrap();
          toast.success("Sale invoice deleted successfully!");
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
          (s.buyerPhone || s.phone || "").includes(q)
      );
    }

    // Sort
    if (sortConfig.key) {
      result.sort((a, b) => {
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
        return sortConfig.direction === "asc" ? valA - valB : valB - valA;
      });
    }

    return result;
  }, [sales, searchQuery, sortConfig]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSales = processedData.slice(startIndex, startIndex + itemsPerPage);

  if (loading && sales.length === 0) {
    return <SkeletonTable rows={10} cols={8} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Procurement Sales</h1>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Manage sales dispatches, compliance invoices, and e-Way bills from procurement stocks.
          </p>
        </div>
        <button
          onClick={onCreate}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#15803D] hover:bg-[#126630] text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer active:scale-95"
        >
          <Plus size={14} /> Record Sale Entry
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by invoice, buyer, or phone..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-brand-500"
          />
        </div>
        <div className="text-xs text-gray-400 font-semibold">
          Showing {processedData.length === 0 ? 0 : startIndex + 1} to{" "}
          {Math.min(startIndex + itemsPerPage, processedData.length)} of {processedData.length} records
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden overflow-x-auto min-h-[350px]">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-150">
            <tr className="text-[10px] text-gray-400 font-bold uppercase tracking-wider select-none">
              <th className="px-4 py-3 text-left">Invoice No.</th>
              <th className="px-4 py-3 text-left cursor-pointer" onClick={() => handleSort("buyer")}>
                Buyer <ArrowUpDown size={10} className="inline ml-1" />
              </th>
              <th className="px-4 py-3 text-left cursor-pointer" onClick={() => handleSort("createdAt")}>
                Sale Date <ArrowUpDown size={10} className="inline ml-1" />
              </th>
              <th className="px-4 py-3 text-right cursor-pointer" onClick={() => handleSort("totalQuantity")}>
                Total Qty <ArrowUpDown size={10} className="inline ml-1" />
              </th>
              <th className="px-4 py-3 text-right cursor-pointer" onClick={() => handleSort("totalAmount")}>
                Grand Total <ArrowUpDown size={10} className="inline ml-1" />
              </th>
              <th className="px-4 py-3 text-center">Billing Type</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">e-Way Bill</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedSales.map((sale) => {
              const qty = (sale.crops || []).reduce((sum, c) => sum + (c.quantity || 0), 0);
              const unit = sale.crops?.[0]?.unit || "qtl";
              const outstanding = (sale.totalAmount || 0) - (sale.receivedAmount || 0);

              const hasEwb = !!(sale.eWayBill?.ewbNo || sale.ewayBillNo || sale.eWayBillNo);

              return (
                <tr key={sale._id} className="hover:bg-gray-50/50 transition">
                  <td className="px-4 py-3 font-mono font-bold text-gray-700">
                    {sale.invoiceNumber || sale.invoiceNo || "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800">
                    {sale.buyerName || sale.buyer?.name || "Walk-in Buyer"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-semibold">
                    {sale.createdAt ? new Date(sale.createdAt).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-750">
                    {qty} {unit}
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-brand-600">
                    ₹{(sale.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-gray-600">
                    {sale.billingType || "Cash"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {outstanding <= 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-150">
                        <CheckCircle size={10} /> Fully Paid
                      </span>
                    ) : sale.receivedAmount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-150">
                        Partial
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-150">
                        Unpaid
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {hasEwb ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-150">
                        <Truck size={10} /> Generated
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-50 text-gray-400 border border-gray-150">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center relative overflow-visible">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenRowActionId(openRowActionId === sale._id ? null : sale._id);
                      }}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors cursor-pointer"
                    >
                      <MoreVertical size={16} />
                    </button>
                    
                    {openRowActionId === sale._id && (
                      <div 
                        ref={rowMenuRef}
                        className="absolute right-6 top-2 w-36 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 z-30 text-left animate-fade-in"
                      >
                        <button
                          onClick={() => {
                            setOpenRowActionId(null);
                            onView(sale._id);
                          }}
                          className="w-full px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 font-semibold transition"
                        >
                          E-way bill
                        </button>

                        <button
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
                          className="w-full px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 font-semibold transition text-left"
                        >
                          Print Invoice
                        </button>

                        <button
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
                          className="w-full px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 font-semibold transition text-left"
                        >
                          Download PDF
                        </button>

                        <button
                          onClick={() => {
                            setOpenRowActionId(null);
                            onEdit(sale._id);
                          }}
                          className="w-full px-4 py-2 text-xs text-gray-750 hover:bg-gray-50 font-semibold transition"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => {
                            setOpenRowActionId(null);
                            handleDelete(sale._id);
                          }}
                          className="w-full px-4 py-2 text-xs text-red-650 hover:bg-red-50 font-bold transition"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {processedData.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400 font-semibold select-none">
                  No sales invoices recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center text-xs text-gray-500 font-semibold">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex gap-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-2.5 py-1.5 border rounded-lg hover:bg-gray-50 cursor-pointer disabled:opacity-40"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-8 h-8 rounded-lg ${
                  p === currentPage ? "bg-[#15803D] text-white font-bold" : "border hover:bg-gray-50"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-2.5 py-1.5 border rounded-lg hover:bg-gray-50 cursor-pointer disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

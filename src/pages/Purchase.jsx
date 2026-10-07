import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { Trash2 } from "lucide-react";
import { usePermissions } from "../hooks/usePermissions";
import ErrorState from "../components/ErrorState";
import api from "../lib/api";

import {
  fetchPurchases,
  fetchPaymentsOut,
  fetchPurchaseReturns,
  fetchExpenses,
  deletePurchase,
  deletePaymentOut,
  deletePurchaseReturn,
  deleteExpense,
  convertToPurchaseBill,
} from "../store/thunks/purchaseThunk";
import { clearPurchaseStatus } from "../store/slices/purchaseSlice";
import { fetchParties } from "../store/thunks/partyThunk";
import { fetchProducts, fetchStockSummary } from "../store/thunks/inventoryThunk";

import { TableSkeleton } from "../components/Purchase/utils/purchaseHelpers";
import PurchaseHeader from "../components/Purchase/Common/PurchaseHeader";
import PurchaseMetrics from "../components/Purchase/Common/PurchaseMetrics";
import PurchaseFilters from "../components/Purchase/Common/PurchaseFilters";
import PurchasesListTab from "../components/Purchase/Tabs/PurchasesListTab";
import PaymentsOutListTab from "../components/Purchase/Tabs/PaymentsOutListTab";
import DebitNotesListTab from "../components/Purchase/Tabs/DebitNotesListTab";
import ExpensesListTab from "../components/Purchase/Tabs/ExpensesListTab";

import NewBillModal from "../components/Purchase/NewBillForm/NewBillModal";
import RecordPaymentModal from "../components/Purchase/Modals/RecordPaymentModal";
import CreateReturnModal from "../components/Purchase/Modals/CreateReturnModal";
import ExpenseModal from "../components/Purchase/Modals/ExpenseModal";
import DetailsModal from "../components/Purchase/Modals/DetailsModal";

export default function Purchases() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const getTabFromPath = (path) => {
    if (path.includes("/purchase/payments")) return "payments";
    if (path.includes("/purchase/debit-notes")) return "returns";
    if (path.includes("/purchase/expenses")) return "expenses";
    return "purchases";
  };

  const activeTab = getTabFromPath(pathname);
  const { isReadOnly } = usePermissions();

  // Redux States
  const {
    purchases,
    purchasesTotal,
    payments,
    paymentsTotal,
    returns,
    returnsTotal,
    expenses,
    expensesTotal,
    loading,
    error,
  } = useSelector((state) => state.purchase);

  const { parties } = useSelector((state) => state.party);
  const { products, stockSummary } = useSelector((state) => state.inventory);

  // Modals Local States
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [editBillRecord, setEditBillRecord] = useState(null);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editPaymentRecord, setEditPaymentRecord] = useState(null);

  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [viewDetailModalOpen, setViewDetailModalOpen] = useState(false);

  // Deletion confirm state
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteConfirmType, setDeleteConfirmType] = useState(null);

  // Actions Dropdown Menu States
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [menuDirection, setMenuDirection] = useState("down");

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (activeMenuId && !e.target.closest(".purchase-action-menu-container")) {
        setActiveMenuId(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeMenuId]);

  const handleToggleMenu = (e, itemId) => {
    e.stopPropagation();
    if (activeMenuId === itemId) {
      setActiveMenuId(null);
    } else {
      setMenuDirection("down");
      setActiveMenuId(itemId);
    }
  };

  // Detailed Modal Viewing state
  const [detailItem, setDetailItem] = useState(null);
  const [detailType, setDetailType] = useState("bill");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [partyFilter, setPartyFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [purchaseTypeFilter, setPurchaseTypeFilter] = useState(() => {
    const path = window.location.pathname;
    if (path.includes("/purchase/orders")) return "ORDER";
    return "";
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (pathname.includes("/purchase/orders")) {
      setPurchaseTypeFilter("ORDER");
    }
  }, [pathname]);

  const [billingTypeFilter, setBillingTypeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const handleResetFilters = () => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setStartDate("");
    setEndDate("");
    setPurchaseTypeFilter("");
    setBillingTypeFilter("");
    setPartyFilter("");
    setCurrentPage(1);
  };

  useEffect(() => {
    dispatch(clearPurchaseStatus());
    dispatch(fetchParties({ partyType: "SUPPLIER" }));
    dispatch(fetchProducts());
    dispatch(fetchStockSummary());
  }, [dispatch]);

  useEffect(() => {
    loadListData();
  }, [activeTab, currentPage, partyFilter, startDate, endDate, purchaseTypeFilter, billingTypeFilter, debouncedSearchQuery]);

  const loadListData = () => {
    const filters = { page: currentPage, limit: ITEMS_PER_PAGE };
    if (debouncedSearchQuery) filters.search = debouncedSearchQuery;
    if (partyFilter) filters.party = partyFilter;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    if (activeTab === "purchases") {
      if (purchaseTypeFilter) filters.purchaseType = purchaseTypeFilter;
      if (billingTypeFilter) filters.billingType = billingTypeFilter;
      dispatch(fetchPurchases(filters));
    } else if (activeTab === "payments") {
      dispatch(fetchPaymentsOut(filters));
    } else if (activeTab === "returns") {
      dispatch(fetchPurchaseReturns(filters));
    } else if (activeTab === "expenses") {
      dispatch(fetchExpenses(filters));
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setDebouncedSearchQuery(searchQuery.trim());
    setCurrentPage(1);
  };

  const getPartyName = (item) => {
    if (!item) return "";
    if (item.party && typeof item.party === "object" && item.party.name) {
      return item.party.name;
    }
    const partyId = typeof item.party === "string" ? item.party : item.party?._id;
    if (partyId) {
      const found = (parties || []).find((p) => String(p._id) === String(partyId));
      if (found?.name) return found.name;
    }
    return item.partyName || item.vendorName || item.supplierName || "";
  };

  const displayedPurchases = useMemo(() => {
    let list = purchases || [];
    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const billNo = (item.billNumber || item._id || "").toLowerCase();
        const vendorName = getPartyName(item).toLowerCase();
        const itemsMatch = (item.items || []).some((it) =>
          (it.productName || it.name || it.itemCode || "").toLowerCase().includes(q)
        );
        return billNo.includes(q) || vendorName.includes(q) || itemsMatch;
      });
    }
    return [...list].sort((a, b) => {
      const dateA = new Date(a.billDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.billDate || b.createdAt || 0).getTime();
      if (dateA !== dateB) return dateB - dateA;
      return String(b._id || "").localeCompare(String(a._id || ""));
    });
  }, [purchases, debouncedSearchQuery, parties]);

  const displayedPayments = useMemo(() => {
    let list = payments || [];
    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const receiptNo = (item.receiptNo || item.receiptNumber || item._id || "").toLowerCase();
        const vendorName = getPartyName(item).toLowerCase();
        return receiptNo.includes(q) || vendorName.includes(q);
      });
    }
    return [...list].sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt || 0).getTime();
      const dateB = new Date(b.date || b.createdAt || 0).getTime();
      if (dateA !== dateB) return dateB - dateA;
      return String(b._id || "").localeCompare(String(a._id || ""));
    });
  }, [payments, debouncedSearchQuery, parties]);

  const displayedReturns = useMemo(() => {
    let list = returns || [];
    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const returnNo = (item.returnNo || item.debitNoteNo || item._id || "").toLowerCase();
        const vendorName = getPartyName(item).toLowerCase();
        return returnNo.includes(q) || vendorName.includes(q);
      });
    }
    return [...list].sort((a, b) => {
      const dateA = new Date(a.returnDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.returnDate || b.createdAt || 0).getTime();
      if (dateA !== dateB) return dateB - dateA;
      return String(b._id || "").localeCompare(String(a._id || ""));
    });
  }, [returns, debouncedSearchQuery, parties]);

  const displayedExpenses = useMemo(() => {
    let list = expenses || [];
    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const title = (item.title || item.expenseCategory || item._id || "").toLowerCase();
        const vendorName = (getPartyName(item) || item.paidTo || "").toLowerCase();
        return title.includes(q) || vendorName.includes(q);
      });
    }
    return [...list].sort((a, b) => {
      const dateA = new Date(a.billDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.billDate || b.createdAt || 0).getTime();
      if (dateA !== dateB) return dateB - dateA;
      return String(b._id || "").localeCompare(String(a._id || ""));
    });
  }, [expenses, debouncedSearchQuery, parties]);

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const purchaseMetrics = useMemo(() => {
    const totalBills = purchases.filter((p) => p.purchaseType === "BILL").reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const totalOrders = purchases.filter((p) => p.purchaseType === "ORDER").reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const totalPayments = payments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    const totalExp = expenses.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
    return {
      totalBills,
      totalOrders,
      totalPayments,
      totalExpenses: totalExp,
      outstandingPayables: Math.max(0, totalBills - totalPayments),
    };
  }, [purchases, payments, expenses]);

  const totalPages = Math.ceil(
    (activeTab === "purchases"
      ? purchasesTotal
      : activeTab === "payments"
      ? paymentsTotal
      : activeTab === "returns"
      ? returnsTotal
      : expensesTotal) / ITEMS_PER_PAGE
  );

  const handleOpenDetailModal = (item, type) => {
    setDetailItem(item);
    setDetailType(type);
    setViewDetailModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    const id = deleteConfirmId;
    const type = deleteConfirmType;
    setDeleteConfirmId(null);
    setDeleteConfirmType(null);

    const loadingToast = toast.loading("Deleting record...");
    try {
      if (type === "bill") {
        await dispatch(deletePurchase(id)).unwrap();
        toast.success("Purchase record deleted successfully", { id: loadingToast });
        dispatch(fetchPurchases({ page: currentPage, limit: ITEMS_PER_PAGE }));
        dispatch(fetchPaymentsOut({ page: 1, limit: ITEMS_PER_PAGE }));
      } else if (type === "payment") {
        await dispatch(deletePaymentOut(id)).unwrap();
        toast.success("Payment out receipt deleted", { id: loadingToast });
        dispatch(fetchPaymentsOut({ page: currentPage, limit: ITEMS_PER_PAGE }));
        dispatch(fetchPurchases({ page: 1, limit: ITEMS_PER_PAGE }));
      } else if (type === "return") {
        await dispatch(deletePurchaseReturn(id)).unwrap();
        toast.success("Debit note deleted successfully", { id: loadingToast });
        dispatch(fetchPurchaseReturns({ page: currentPage, limit: ITEMS_PER_PAGE }));
      } else if (type === "expense") {
        await dispatch(deleteExpense(id)).unwrap();
        toast.success("Expense deleted successfully", { id: loadingToast });
        dispatch(fetchExpenses({ page: currentPage, limit: ITEMS_PER_PAGE }));
      }
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Failed to delete record", { id: loadingToast });
    }
  };

  const handleDownloadPurchaseReceipt = async (id) => {
    try {
      toast.loading("Generating purchase invoice PDF...", { id: "purchase-pdf-download" });
      const res = await api.get(`/purchase/receipt/${id}`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const printWindow = window.open(url, "_blank");
      if (!printWindow || printWindow.closed || typeof printWindow.closed === "undefined") {
        const link = document.createElement("a");
        link.href = url;
        link.download = `purchase_invoice_${id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Purchase invoice downloaded successfully", { id: "purchase-pdf-download" });
      } else {
        toast.success("Purchase invoice opened in print preview", { id: "purchase-pdf-download" });
      }
    } catch (err) {
      console.error(err);
      let errorMsg = "Failed to open purchase invoice PDF";
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json.message) errorMsg = json.message;
        } catch (_) {}
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.message) {
        errorMsg = err.message;
      }
      toast.error(errorMsg, { id: "purchase-pdf-download" });
    }
  };

  const handleDownloadPaymentOutReceipt = async (id) => {
    try {
      toast.loading("Generating payment receipt PDF...", { id: "payment-pdf-download" });
      const res = await api.get(`/purchase/payment-out/receipt/${id}`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const printWindow = window.open(url, "_blank");
      if (!printWindow || printWindow.closed || typeof printWindow.closed === "undefined") {
        const link = document.createElement("a");
        link.href = url;
        link.download = `payment_receipt_${id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Payment receipt downloaded successfully", { id: "payment-pdf-download" });
      } else {
        toast.success("Payment receipt opened in print preview", { id: "payment-pdf-download" });
      }
    } catch (err) {
      console.error(err);
      let errorMsg = "Failed to open payment receipt PDF";
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json.message) errorMsg = json.message;
        } catch (_) {}
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.message) {
        errorMsg = err.message;
      }
      toast.error(errorMsg, { id: "payment-pdf-download" });
    }
  };

  const handleDownloadPurchaseReturnReceipt = async (id) => {
    try {
      toast.loading("Generating purchase return receipt PDF...", { id: "return-pdf-download" });
      const res = await api.get(`/purchase/return/receipt/${id}`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const printWindow = window.open(url, "_blank");
      if (!printWindow || printWindow.closed || typeof printWindow.closed === "undefined") {
        const link = document.createElement("a");
        link.href = url;
        link.download = `debit_note_${id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Debit note downloaded successfully", { id: "return-pdf-download" });
      } else {
        toast.success("Purchase return receipt opened in print preview", { id: "return-pdf-download" });
      }
    } catch (err) {
      console.error(err);
      let errorMsg = "Failed to open purchase return receipt PDF";
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json.message) errorMsg = json.message;
        } catch (_) {}
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.message) {
        errorMsg = err.message;
      }
      toast.error(errorMsg, { id: "return-pdf-download" });
    }
  };

  const handleConvertOrderToBill = (id) => {
    Swal.fire({
      title: "Convert to Purchase Bill?",
      text: "Are you sure you want to convert this Purchase Order into a Purchase Bill?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#15803D",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, convert it!",
      cancelButtonText: "Cancel",
    }).then(async (result) => {
      if (result.isConfirmed) {
        const loadingToast = toast.loading("Converting to Purchase Bill...");
        try {
          await dispatch(convertToPurchaseBill(id)).unwrap();
          toast.success("Converted to Purchase Bill successfully!", { id: loadingToast });
          loadListData();
          dispatch(fetchPaymentsOut({ page: 1, limit: ITEMS_PER_PAGE }));
        } catch (err) {
          toast.error(typeof err === "string" ? err : err?.message || "Failed to convert to Purchase Bill", { id: loadingToast });
        }
      }
    });
  };

  if (billModalOpen) {
    return (
      <NewBillModal
        editRecord={editBillRecord}
        parties={parties}
        products={products}
        stockSummary={stockSummary}
        onClose={() => {
          setBillModalOpen(false);
          setEditBillRecord(null);
        }}
        onSuccess={(savedRecord) => {
          setBillModalOpen(false);
          setEditBillRecord(null);
          loadListData();
          dispatch(fetchPaymentsOut({ page: 1, limit: ITEMS_PER_PAGE }));
          if (savedRecord) {
            handleOpenDetailModal(savedRecord, "bill");
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Area */}
      <PurchaseHeader
        activeTab={activeTab}
        isReadOnly={isReadOnly}
        onOpenNewBill={() => {
          setEditBillRecord(null);
          setBillModalOpen(true);
        }}
        onOpenRecordPayment={() => {
          setEditPaymentRecord(null);
          setPaymentModalOpen(true);
        }}
        onOpenCreateReturn={() => setReturnModalOpen(true)}
        onOpenExpenseModal={() => setExpenseModalOpen(true)}
        navigate={navigate}
        setCurrentPage={setCurrentPage}
      />

      {/* 2. Dashboard Summary Cards */}
      <PurchaseMetrics purchaseMetrics={purchaseMetrics} />

      {/* 3. Filter Bar */}
      <PurchaseFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleSearchSubmit={handleSearchSubmit}
        handleResetFilters={handleResetFilters}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        activeTab={activeTab}
        purchaseTypeFilter={purchaseTypeFilter}
        setPurchaseTypeFilter={setPurchaseTypeFilter}
        billingTypeFilter={billingTypeFilter}
        setBillingTypeFilter={setBillingTypeFilter}
        partyFilter={partyFilter}
        setPartyFilter={setPartyFilter}
        parties={parties}
        setCurrentPage={setCurrentPage}
      />

      {/* 4. Main Table UI */}
      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState
          title="Failed to load purchases data"
          error={error}
          onRetry={loadListData}
          variant="page"
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {activeTab === "purchases" && (
              <PurchasesListTab
                displayedPurchases={displayedPurchases}
                getPartyName={getPartyName}
                formatDate={formatDate}
                activeMenuId={activeMenuId}
                menuDirection={menuDirection}
                handleToggleMenu={handleToggleMenu}
                handleOpenDetailModal={handleOpenDetailModal}
                handleDownloadPurchaseReceipt={handleDownloadPurchaseReceipt}
                handleConvertOrderToBill={handleConvertOrderToBill}
                isReadOnly={isReadOnly}
                setEditPaymentRecord={setEditPaymentRecord}
                setPaymentModalOpen={setPaymentModalOpen}
                setEditBillRecord={setEditBillRecord}
                setBillModalOpen={setBillModalOpen}
                setDeleteConfirmId={setDeleteConfirmId}
                setDeleteConfirmType={setDeleteConfirmType}
                setActiveMenuId={setActiveMenuId}
              />
            )}

            {activeTab === "payments" && (
              <PaymentsOutListTab
                displayedPayments={displayedPayments}
                getPartyName={getPartyName}
                formatDate={formatDate}
                handleOpenDetailModal={handleOpenDetailModal}
                handleDownloadPaymentOutReceipt={handleDownloadPaymentOutReceipt}
                isReadOnly={isReadOnly}
                setEditPaymentRecord={setEditPaymentRecord}
                setPaymentModalOpen={setPaymentModalOpen}
                setDeleteConfirmId={setDeleteConfirmId}
                setDeleteConfirmType={setDeleteConfirmType}
              />
            )}

            {activeTab === "returns" && (
              <DebitNotesListTab
                displayedReturns={displayedReturns}
                getPartyName={getPartyName}
                formatDate={formatDate}
                handleOpenDetailModal={handleOpenDetailModal}
                handleDownloadPurchaseReturnReceipt={handleDownloadPurchaseReturnReceipt}
                isReadOnly={isReadOnly}
                setDeleteConfirmId={setDeleteConfirmId}
                setDeleteConfirmType={setDeleteConfirmType}
              />
            )}

            {activeTab === "expenses" && (
              <ExpensesListTab
                displayedExpenses={displayedExpenses}
                formatDate={formatDate}
                handleOpenDetailModal={handleOpenDetailModal}
                isReadOnly={isReadOnly}
                setDeleteConfirmId={setDeleteConfirmId}
                setDeleteConfirmType={setDeleteConfirmType}
              />
            )}
          </div>
        </div>
      )}

      {/* 5. Pagination UI */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center text-sm text-gray-500 px-2 mt-4">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-3.5 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-45 transition bg-white cursor-pointer"
            >
              Prev
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3.5 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-45 transition bg-white cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT OUT MODAL */}
      {paymentModalOpen && (
        <RecordPaymentModal
          editRecord={editPaymentRecord}
          parties={parties}
          onClose={() => {
            setPaymentModalOpen(false);
            setEditPaymentRecord(null);
          }}
          onSuccess={() => {
            setPaymentModalOpen(false);
            setEditPaymentRecord(null);
            loadListData();
            dispatch(fetchPurchases({ page: 1, limit: ITEMS_PER_PAGE }));
          }}
        />
      )}

      {/* PURCHASE RETURN MODAL */}
      {returnModalOpen && (
        <CreateReturnModal
          onClose={() => setReturnModalOpen(false)}
          onSuccess={() => {
            setReturnModalOpen(false);
            loadListData();
          }}
        />
      )}

      {/* EXPENSE MODAL */}
      {expenseModalOpen && (
        <ExpenseModal
          parties={parties}
          onClose={() => setExpenseModalOpen(false)}
          onSuccess={() => {
            setExpenseModalOpen(false);
            loadListData();
          }}
        />
      )}

      {/* VIEW TRANSACTION DETAILS MODAL */}
      {viewDetailModalOpen && detailItem && (
        <DetailsModal
          item={detailItem}
          type={detailType}
          onClose={() => {
            setViewDetailModalOpen(false);
            setDetailItem(null);
          }}
          handleDownloadPurchaseReceipt={handleDownloadPurchaseReceipt}
          handleDownloadPaymentOutReceipt={handleDownloadPaymentOutReceipt}
          handleDownloadPurchaseReturnReceipt={handleDownloadPurchaseReturnReceipt}
        />
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto text-red-655">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Delete Record?</h3>
              <p className="text-xs text-gray-500 mt-2">Are you sure you want to delete this record? This action cannot be undone.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setDeleteConfirmId(null);
                  setDeleteConfirmType(null);
                }}
                className="flex-1 py-2 border rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition bg-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

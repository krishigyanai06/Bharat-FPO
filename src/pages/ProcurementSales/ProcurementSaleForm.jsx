import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  createProcurementSale,
  updateProcurementSale,
  fetchProcurementSaleDetails,
  fetchProcurementStock,
} from "../../redux/procurementSaleThunk";
import { fetchParties } from "../../store/thunks/partyThunk";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import BuyerSection from "../../components/ProcurementSales/BuyerSection";
import CropItemsSection from "../../components/ProcurementSales/CropItemsSection";
import PaymentSection from "../../components/ProcurementSales/PaymentSection";
import DispatchSection from "../../components/ProcurementSales/DispatchSection";
import SaleSummaryCard from "../../components/ProcurementSales/SaleSummaryCard";
import { parseProcurementErrorMessage } from "../../components/ProcurementSales/procurementSaleHelpers";

export default function ProcurementSaleForm({ id, onBack }) {
  const dispatch = useDispatch();
  const isEdit = !!id;

  const { submitting, stock = [], loading } = useSelector((s) => s.procurementSales);
  const { parties = [], loading: partiesLoading } = useSelector(
    (s) => s.party || { parties: [] }
  );

  // Form Local State
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [buyerDetails, setBuyerDetails] = useState({
    buyerType: "party", // "party", "walk-in"
    buyerParty: "",
    buyerName: "",
    phone: "",
    gstin: "",
    address: "",
    billingType: "Cash", // "Cash" or "Credit" (UI supports Cash, Partial, Credit)
    receivedAmount: "",
  });

  // Empty initial state for new crop sale entries
  const [crops, setCrops] = useState([
    {
      cropName: "",
      variety: "",
      godown: "",
      unit: "qtl",
      quantity: "",
      rate: "",
      gstPercent: 0,
      availableQuantity: 0,
    },
  ]);

  const [dispatchDetails, setDispatchDetails] = useState({
    transporterName: "",
    transporterId: "",
    vehicleNo: "",
    distance: "",
    remarks: "",
  });

  // Mount effects
  useEffect(() => {
    dispatch(fetchParties({ partyType: "BUYER" }));
    dispatch(fetchProcurementStock());
  }, [dispatch]);

  // Edit Mode: Fetch details
  useEffect(() => {
    if (isEdit) {
      dispatch(fetchProcurementSaleDetails(id))
        .unwrap()
        .then((sale) => {
          if (sale) {
            const rawPartyId = sale.buyerParty?._id || sale.buyerParty?.id || sale.buyerParty;
            setInvoiceNumber(sale.invoiceNumber || sale.invoiceNo || "");
            setBuyerDetails({
              buyerType: rawPartyId ? "party" : "walk-in",
              buyerParty: rawPartyId ? String(rawPartyId) : "",
              buyerName: sale.buyerName || sale.buyer?.name || "",
              phone: sale.phone || sale.buyer?.phone || "",
              gstin: sale.buyer?.gstin || "",
              address: sale.address || sale.buyer?.address || "",
              billingType: sale.billingType || "Cash",
              receivedAmount: sale.receivedAmount !== undefined ? String(sale.receivedAmount) : "",
            });

            if (sale.crops && sale.crops.length > 0) {
              setCrops(
                sale.crops.map((c) => ({
                  cropName: c.cropName || c.crop || "",
                  variety: c.variety || "",
                  godown: c.godown || "",
                  unit: c.unit || "qtl",
                  quantity: c.quantity !== undefined && c.quantity !== null ? String(c.quantity) : "",
                  rate: c.rate !== undefined && c.rate !== null ? String(c.rate) : "",
                  gstPercent: Number(c.gstPercent) || 0,
                  availableQuantity: Number(c.availableQuantity) || 0,
                }))
              );
            }

            if (sale.dispatchDetails) {
              setDispatchDetails({
                transporterName: sale.dispatchDetails.transporterName || "",
                transporterId: sale.dispatchDetails.transporterId || "",
                vehicleNo: sale.dispatchDetails.vehicleNo || "",
                distance: sale.dispatchDetails.distance || "",
                remarks: sale.dispatchDetails.remarks || "",
              });
            }
          }
        })
        .catch((err) => {
          toast.error(err || "Failed to load sale details");
          onBack();
        });
    }
  }, [id, isEdit, dispatch]);

  // Calculations
  const subtotal = crops.reduce(
    (sum, c) => sum + (Number(c.quantity) || 0) * (Number(c.rate) || 0),
    0
  );
  const taxAmount = crops.reduce(
    (sum, c) =>
      sum +
      ((Number(c.quantity) || 0) * (Number(c.rate) || 0) * (Number(c.gstPercent) || 0)) /
        100,
    0
  );
  const grandTotal = subtotal + taxAmount;

  const validateForm = () => {
    if (!buyerDetails.buyerName.trim()) {
      toast.error("Please select or enter buyer name!");
      return false;
    }

    if (crops.length === 0) {
      toast.error("Please add at least one crop line item!");
      return false;
    }

    for (let i = 0; i < crops.length; i++) {
      const c = crops[i];
      if (!c.cropName.trim()) {
        toast.error(`Crop name is required for line ${i + 1}!`);
        return false;
      }
      if (c.quantity === "" || Number(c.quantity) <= 0) {
        toast.error(`Quantity must be greater than 0 for ${c.cropName}!`);
        return false;
      }
      if (c.rate === "" || Number(c.rate) <= 0) {
        toast.error(`Rate must be greater than 0 for ${c.cropName}!`);
        return false;
      }

      // Stock check validation against live stock
      const match = stock.find(
        (s) =>
          (s.cropName || "").toLowerCase() === (c.cropName || "").toLowerCase() &&
          (s.godown || "").toLowerCase() === (c.godown || "").toLowerCase()
      );
      if (match) {
        const avail = Number(match.availableQuantity) || Number(match.quantity) || 0;
        if (Number(c.quantity) > avail && avail > 0) {
          toast.error(
            `Quantity for ${c.cropName} (${c.quantity}) exceeds available stock (${avail})!`
          );
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Backend validation strictly expects billingType to be "Cash" or "Credit"
    const apiBillingType = (buyerDetails.billingType === "Credit") ? "Credit" : "Cash";

    const payload = {
      ...(isEdit && invoiceNumber.trim() && { invoiceNumber: invoiceNumber.trim() }),
      buyer: {
        name: buyerDetails.buyerName,
        phone: buyerDetails.phone,
        address: buyerDetails.address,
        gstin: buyerDetails.gstin,
      },
      ...(buyerDetails.buyerParty && { buyerParty: buyerDetails.buyerParty }),
      crops: crops.map((c) => ({
        cropName: c.cropName,
        variety: c.variety,
        godown: c.godown,
        unit: c.unit || "qtl",
        quantity: Number(c.quantity),
        rate: Number(c.rate),
        gstPercent: Number(c.gstPercent) || 0,
      })),
      billingType: apiBillingType,
      receivedAmount: Number(buyerDetails.receivedAmount) || 0,
      taxAmount: Number(taxAmount) || 0,
      dispatchDetails: {
        transporterName: dispatchDetails.transporterName,
        transporterId: dispatchDetails.transporterId,
        vehicleNo: dispatchDetails.vehicleNo,
        distance: Number(dispatchDetails.distance) || 0,
        remarks: dispatchDetails.remarks,
      },
    };

    try {
      if (isEdit) {
        await dispatch(updateProcurementSale({ id, payload })).unwrap();
        toast.success("Crop sale invoice updated successfully!");
      } else {
        await dispatch(createProcurementSale(payload)).unwrap();
        toast.success("Crop sale invoice created successfully!");
      }
      onBack();
    } catch (err) {
      console.error(err);
      toast.error(parseProcurementErrorMessage(err));
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col bg-[#F8FAFC] select-none space-y-5">
      {/* 1. Header Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 md:px-6 md:py-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 hover:bg-slate-100 rounded-xl transition text-slate-500 hover:text-slate-900 border border-slate-200 bg-white cursor-pointer active:scale-95 shadow-3xs"
            title="Back to Sales List"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                {isEdit ? "Edit Crop Sale Entry" : "Create New Crop Sale"}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                Procurement Trade
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Record crop dispatches from godown stock to buyers or institutional traders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl transition font-bold text-slate-700 text-xs cursor-pointer active:scale-95 shadow-3xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition flex items-center justify-center gap-2 font-bold text-xs cursor-pointer shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving Sale...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{isEdit ? "Update Crop Sale" : "Create Crop Sale"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Main Form Grid */}
      <form onSubmit={handleSubmit} noValidate className="w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 Columns) */}
        <div className="lg:col-span-8 space-y-6">

          <BuyerSection
            buyerDetails={buyerDetails}
            setBuyerDetails={setBuyerDetails}
            parties={parties}
            partiesLoading={partiesLoading}
          />

          <CropItemsSection
            crops={crops}
            setCrops={setCrops}
            stock={stock}
          />

          <PaymentSection
            buyerDetails={buyerDetails}
            setBuyerDetails={setBuyerDetails}
            grandTotal={grandTotal}
          />

          <DispatchSection
            dispatchDetails={dispatchDetails}
            setDispatchDetails={setDispatchDetails}
          />
        </div>

        {/* Right Column (4 Columns - Summary Sidebar) */}
        <div className="lg:col-span-4">
          <SaleSummaryCard
            buyerDetails={buyerDetails}
            invoiceNumber={invoiceNumber}
            crops={crops}
            subtotal={subtotal}
            taxAmount={taxAmount}
            grandTotal={grandTotal}
            submitting={submitting}
            isEdit={isEdit}
            onCancel={onBack}
          />
        </div>
      </form>
    </div>
  );
}

import { useState } from "react";
import ProcurementSaleList from "./ProcurementSaleList";
import ProcurementSaleForm from "./ProcurementSaleForm";
import ProcurementSaleDetails from "./ProcurementSaleDetails";

export default function ProcurementSales() {
  const [view, setView] = useState("list"); // "list", "create", "edit", "details"
  const [activeSaleId, setActiveSaleId] = useState(null);

  const handleCreate = () => {
    setActiveSaleId(null);
    setView("create");
  };

  const handleEdit = (id) => {
    setActiveSaleId(id);
    setView("edit");
  };

  const handleViewDetails = (id) => {
    setActiveSaleId(id);
    setView("details");
  };

  const handleBackToList = () => {
    setActiveSaleId(null);
    setView("list");
  };

  return (
    <div className="p-1 space-y-6">
      {view === "list" && (
        <ProcurementSaleList
          onCreate={handleCreate}
          onEdit={handleEdit}
          onView={handleViewDetails}
        />
      )}
      {(view === "create" || view === "edit") && (
        <ProcurementSaleForm
          id={activeSaleId}
          onBack={handleBackToList}
        />
      )}
      {view === "details" && (
        <ProcurementSaleDetails
          id={activeSaleId}
          onBack={handleBackToList}
        />
      )}
    </div>
  );
}

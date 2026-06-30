import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const generateClientEInvoicePDF = (item, irn, ackNo, ackDt, resolvedParty) => {
  const doc = new jsPDF();

  // Color Palette
  const primaryColor = [22, 163, 74]; // Emerald green
  const secondaryColor = [71, 85, 105]; // Slate gray
  const darkTextColor = [15, 23, 42]; // Slate-900

  // 1. PAGE HEADER
  // Draw green header bar
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 30, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("TAX INVOICE (E-INVOICE)", 14, 13);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Registered Government GST E-Invoice Statement", 14, 20);

  // 2. GOVERNMENT DETAILS (Ack No & Ack Date, IRN)
  // Draw light gray box for Government E-Invoice Details
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, 35, 182, 35, "FD");

  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("🏛 GOVERNMENT E-INVOICE PORTAL DETAILS", 18, 41);

  doc.setTextColor(...secondaryColor);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Acknowledgment Number:", 18, 47);
  doc.setFont("helvetica", "bold");
  doc.text(String(ackNo || "—"), 55, 47);

  doc.setFont("helvetica", "normal");
  doc.text("Acknowledgment Date:", 110, 47);
  doc.setFont("helvetica", "bold");
  doc.text(String(ackDt || "—"), 145, 47);

  doc.setFont("helvetica", "normal");
  doc.text("IRN (Invoice Reference Number):", 18, 54);
  
  // Draw IRN value in monospace font, split to wrap nicely if needed
  doc.setFont("courier", "bold");
  doc.setFontSize(7.5);
  const irnLine1 = String(irn).substring(0, 64);
  doc.text(irnLine1, 18, 60);

  // Verification watermark text
  doc.setTextColor(21, 128, 61); // Green-700
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("✓ VERIFIED AND SIGNED BY IRP GATEWAY", 18, 66);

  // 3. SELLER & BUYER INFORMATION
  // Left: Seller Info
  doc.setTextColor(...darkTextColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("SELLER DETAILS", 14, 78);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  doc.text("Bharat FPO Connect", 14, 83);
  doc.text("GSTIN: 05ABNTY3295P8ZB", 14, 88);
  doc.text("State: Uttarakhand (05)", 14, 93);
  doc.text("Email: support@bharatfpo.org", 14, 98);

  // Right: Buyer Info
  doc.setTextColor(...darkTextColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("BUYER DETAILS", 110, 78);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  const buyerName = resolvedParty?.name || item.buyerName || "Walk-in Customer";
  const buyerPhone = resolvedParty?.phoneNumber || item.buyerPhone || "—";
  const buyerGstin = resolvedParty?.gstin || resolvedParty?.gstNumber || "—";
  const buyerGstType = resolvedParty?.gstType || "—";

  doc.text(buyerName, 110, 83);
  doc.text(`GSTIN: ${buyerGstin}`, 110, 88);
  doc.text(`GST Type: ${buyerGstType}`, 110, 93);
  doc.text(`Phone: ${buyerPhone}`, 110, 98);

  // Divider Line
  doc.setDrawColor(241, 245, 249);
  doc.line(14, 104, 196, 104);

  // 4. INVOICE OVERVIEW
  doc.setTextColor(...darkTextColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`INVOICE NO: ${item.invoiceNo || "—"}`, 14, 111);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  const formattedDate = new Date(item.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  doc.text(`Invoice Date: ${formattedDate}`, 110, 111);

  // 5. PRODUCTS / PARTICULAR ITEMS TABLE
  const tableHeaders = [
    ["S.No", "Item Description", "HSN Code", "Qty", "Unit", "Rate", "Discount", "Tax %", "Tax Amt", "Net Amt"]
  ];

  const tableBody = (item.items || []).map((it, index) => {
    const itemName = it.itemName || (it.item && (it.item.productName || it.item.name)) || "Item";
    const hsn = it.item?.hsnCode || "38089190";
    const qty = it.quantity || 0;
    const unit = it.unit || "kg";
    const rate = it.pricePerUnit || it.rate || 0;
    const discount = it.discountPercent > 0 ? `${it.discountPercent}%` : "—";
    const taxPercent = it.taxPercent || 0;
    const taxAmt = it.taxAmount || 0;
    const netAmt = it.amount || 0;

    return [
      index + 1,
      itemName,
      hsn,
      qty,
      unit,
      `Rs. ${rate.toFixed(2)}`,
      discount,
      `${taxPercent}%`,
      `Rs. ${taxAmt.toFixed(2)}`,
      `Rs. ${netAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
    ];
  });

  autoTable(doc, {
    startY: 116,
    head: tableHeaders,
    body: tableBody,
    theme: "striped",
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold"
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: darkTextColor
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 50 },
      2: { cellWidth: 20 },
      3: { cellWidth: 12, halign: "center" },
      4: { cellWidth: 12, halign: "center" },
      5: { cellWidth: 18, halign: "right" },
      6: { cellWidth: 15, halign: "center" },
      7: { cellWidth: 12, halign: "center" },
      8: { cellWidth: 18, halign: "right" },
      9: { cellWidth: 25, halign: "right" }
    },
    margin: { left: 14, right: 14 }
  });

  // 6. TOTALS BLOCK & QR CODE
  const finalY = doc.lastAutoTable?.finalY || doc.previousAutoTable?.finalY || 180;
  
  // Drawing mock QR Code Box
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.rect(14, finalY + 10, 35, 35, "FD");
  
  // Draw some mock QR patterns inside the box
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  // Drawing 3 corner squares for QR pattern
  doc.rect(16, finalY + 12, 6, 6);
  doc.rect(18, finalY + 14, 2, 2, "F");
  
  doc.rect(41, finalY + 12, 6, 6);
  doc.rect(43, finalY + 14, 2, 2, "F");
  
  doc.rect(16, finalY + 37, 6, 6);
  doc.rect(18, finalY + 39, 2, 2, "F");
  
  // Draw some lines / dots to represent QR content
  doc.setDrawColor(71, 85, 105);
  doc.line(26, finalY + 15, 38, finalY + 15);
  doc.line(26, finalY + 18, 32, finalY + 18);
  doc.line(35, finalY + 18, 38, finalY + 18);
  doc.line(16, finalY + 23, 46, finalY + 23);
  doc.line(16, finalY + 27, 28, finalY + 27);
  doc.line(32, finalY + 27, 46, finalY + 27);
  doc.line(26, finalY + 31, 46, finalY + 31);
  doc.line(26, finalY + 35, 38, finalY + 35);
  doc.line(16, finalY + 35, 22, finalY + 35);
  doc.line(26, finalY + 40, 46, finalY + 40);

  doc.setTextColor(...secondaryColor);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Government Signed QR", 14, finalY + 49);

  // Grand Totals Table
  const totalAmountVal = item.totalAmount || 0;
  const totalTaxVal = (item.items || []).reduce((acc, curr) => acc + (curr.taxAmount || 0), 0);
  const taxableAmtVal = totalAmountVal - totalTaxVal;

  doc.setTextColor(...darkTextColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  
  const rightAlignX = 196;
  doc.text("Summary & Totals", 110, finalY + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  doc.text("Taxable Amount:", 110, finalY + 21);
  doc.text(`Rs. ${taxableAmtVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, rightAlignX, finalY + 21, { align: "right" });

  doc.text("Total GST (Tax Amount):", 110, finalY + 27);
  doc.text(`Rs. ${totalTaxVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, rightAlignX, finalY + 27, { align: "right" });

  doc.line(110, finalY + 31, rightAlignX, finalY + 31);

  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("Grand Total (INR):", 110, finalY + 37);
  doc.text(`Rs. ${totalAmountVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, rightAlignX, finalY + 37, { align: "right" });

  // Save the PDF
  const filename = `E-Invoice-${item.invoiceNo || "Invoice"}.pdf`;
  doc.save(filename);
};

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Formats a value as Indian Rupees
 */
const formatINR = (val) => {
  return 'Rs. ' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
};

/**
 * Generates a beautiful client-side PDF for Sales Report.
 * @param {Array} data - Filtered sales records
 * @param {object} filters - Active filters used
 */
export const generateClientSalesReportPDF = async (data, filters) => {
  try {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString('en-IN');

    // Header bar with FPO Brand styling (Green)
    doc.setFillColor(27, 94, 32); // #1b5e20
    doc.rect(0, 0, 210, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Bharat FPO Connect', 14, 11);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Sales Transactions Report · Generated: ${dateStr}`, 14, 18);

    // Filter parameters subtitle
    doc.setTextColor(51, 65, 85); // slate-700
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Report Details & Parameters', 14, 36);
    
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // slate-500
    const startStr = filters.startDate || 'Beginning';
    const endStr = filters.endDate || 'Present';
    doc.text(`Date Range: ${startStr} to ${endStr}`, 14, 42);
    doc.text(`Sale Type: ${filters.saleType || 'All Types'}   |   Billing Type: ${filters.billingType || 'All Billing'}`, 14, 47);

    // Compute totals
    let totalSales = 0;
    let receivedAmount = 0;
    let unpaidAmount = 0;
    data.forEach((item) => {
      const totalAmt = Number(item.finalAmount || item.totalAmount || 0);
      totalSales += totalAmt;
      const recAmt = item.receivedAmount !== undefined 
        ? Number(item.receivedAmount) 
        : (item.billingType === 'Cash' ? totalAmt : 0);
      receivedAmount += recAmt;
      const unpAmt = item.unpaidAmount !== undefined 
        ? Number(item.unpaidAmount) 
        : (item.billingType === 'Credit' ? (totalAmt - recAmt) : 0);
      unpaidAmount += unpAmt;
    });

    // Render Summary Cards block
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(14, 54, 182, 16, 'F');
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(14, 54, 182, 16, 'S');

    doc.setTextColor(71, 85, 105); // slate-600
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL SALES', 18, 60);
    doc.text('TOTAL INVOICES', 65, 60);
    doc.text('RECEIVED AMOUNT', 110, 60);
    doc.text('UNPAID AMOUNT', 155, 60);

    doc.setTextColor(27, 94, 32); // green
    doc.setFontSize(9.5);
    doc.text(formatINR(totalSales), 18, 66);
    doc.setTextColor(37, 99, 235); // blue
    doc.text(String(data.length), 65, 66);
    doc.setTextColor(147, 51, 234); // purple
    doc.text(formatINR(receivedAmount), 110, 66);
    doc.setTextColor(234, 88, 12); // orange
    doc.text(formatINR(unpaidAmount), 155, 66);

    // Table rows compiler
    const tableRows = data.map((item) => {
      const dateVal = (item.billDate || item.createdAt || item.date) ? new Date(item.billDate || item.createdAt || item.date).toLocaleDateString('en-GB') : '—';
      const invNo = item.invoiceNo || item.invoiceNumber || item.refNo || '—';
      const name = item.buyerName || item.buyer?.name || 'Walk-in Customer';
      const type = item.billingType || 'Cash';
      
      const itemsList = (item.items || [])
        .map(i => `${i.item?.itemName || i.itemName || 'Crop'} (${i.quantity || 0} qty)`)
        .join(', ') || '—';
        
      const amtVal = formatINR(item.finalAmount || item.totalAmount || 0);
      return [dateVal, invNo, name, type, itemsList, amtVal];
    });

    // Render autotable
    doc.autoTable({
      startY: 76,
      head: [['Date', 'Invoice / Ref No', 'Buyer Name', 'Type', 'Items Summary', 'Amount']],
      body: tableRows,
      headStyles: { fillColor: [27, 94, 32], textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
      columnStyles: { 5: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });

    // Save report
    const filename = `Sales_Report_${startStr}_to_${endStr}.pdf`;
    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Client PDF Generation error:', err);
    return false;
  }
};

/**
 * Generates a beautiful client-side PDF for Purchase Report.
 * @param {Array} data - Filtered purchase records
 * @param {object} filters - Active filters used
 */
export const generateClientPurchaseReportPDF = async (data, filters) => {
  try {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString('en-IN');

    // Header bar with FPO Brand styling (Green)
    doc.setFillColor(27, 94, 32); // #1b5e20
    doc.rect(0, 0, 210, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Bharat FPO Connect', 14, 11);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Purchase Bills Report · Generated: ${dateStr}`, 14, 18);

    // Filter parameters subtitle
    doc.setTextColor(51, 65, 85); // slate-700
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Report Details & Parameters', 14, 36);
    
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // slate-500
    const startStr = filters.startDate || 'Beginning';
    const endStr = filters.endDate || 'Present';
    doc.text(`Date Range: ${startStr} to ${endStr}`, 14, 42);
    doc.text(`Purchase Type: ${filters.purchaseType || 'All Purchases'}   |   Billing Type: ${filters.billingType || 'All Billing'}`, 14, 47);

    // Compute totals
    let totalPurchases = 0;
    let receivedAmount = 0;
    let unpaidAmount = 0;
    data.forEach((item) => {
      const totalAmt = Number(item.totalAmount || item.finalAmount || 0);
      totalPurchases += totalAmt;
      const recAmt = item.receivedAmount !== undefined 
        ? Number(item.receivedAmount) 
        : (item.billingType === 'Cash' ? totalAmt : 0);
      receivedAmount += recAmt;
      const unpAmt = item.unpaidAmount !== undefined 
        ? Number(item.unpaidAmount) 
        : (item.billingType === 'Credit' ? (totalAmt - recAmt) : 0);
      unpaidAmount += unpAmt;
    });

    // Render Summary Cards block
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(14, 54, 182, 16, 'F');
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(14, 54, 182, 16, 'S');

    doc.setTextColor(71, 85, 105); // slate-600
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL PURCHASES', 18, 60);
    doc.text('TOTAL BILLS', 65, 60);
    doc.text('CASH PURCHASES', 110, 60);
    doc.text('CREDIT PURCHASES', 155, 60);

    doc.setTextColor(27, 94, 32); // green
    doc.setFontSize(9.5);
    doc.text(formatINR(totalPurchases), 18, 66);
    doc.setTextColor(37, 99, 235); // blue
    doc.text(String(data.length), 65, 66);
    doc.setTextColor(147, 51, 234); // purple
    doc.text(formatINR(receivedAmount), 110, 66);
    doc.setTextColor(234, 88, 12); // orange
    doc.text(formatINR(unpaidAmount), 155, 66);

    // Table rows compiler
    const tableRows = data.map((item) => {
      const dateVal = (item.billDate || item.createdAt || item.date) ? new Date(item.billDate || item.createdAt || item.date).toLocaleDateString('en-GB') : '—';
      const billNo = item.billNumber || item.billNo || item.orderNo || item.orderNumber || '—';
      const name = item.supplierName || item.partyName || item.supplier?.name || item.party?.name || 'Walk-in Vendor';
      const type = item.billingType || 'Cash';
      
      const itemsList = (item.crops || item.items || [])
        .map(i => `${i.cropName || i.itemName || 'Item'} (${i.quantity || 0} qty)`)
        .join(', ') || '—';
        
      const amtVal = formatINR(item.totalAmount || item.finalAmount || 0);
      return [dateVal, billNo, name, type, itemsList, amtVal];
    });

    // Render autotable
    doc.autoTable({
      startY: 76,
      head: [['Date', 'Bill / Order No', 'Supplier Name', 'Type', 'Items Summary', 'Amount']],
      body: tableRows,
      headStyles: { fillColor: [27, 94, 32], textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
      columnStyles: { 5: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });

    // Save report
    const filename = `Purchase_Report_${startStr}_to_${endStr}.pdf`;
    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Client PDF Generation error:', err);
    return false;
  }
};

/**
 * Generates a beautiful client-side PDF for Balance Sheet.
 * @param {object} categories - Assets, Liabilities, and Equity details
 * @param {string} date - Statement date
 */
export const generateClientBalanceSheetPDF = async (categories, date) => {
  try {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString('en-IN');

    // Header bar with FPO Brand styling (Green)
    doc.setFillColor(27, 94, 32); // #1b5e20
    doc.rect(0, 0, 210, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Bharat FPO Connect', 14, 11);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Balance Sheet Statement · Generated: ${dateStr}`, 14, 18);

    // Subtitle parameters
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('FPO Balance Sheet Statement', 14, 36);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Statement Snapshot Date: ${date}`, 14, 42);

    // Format fields
    const assetsRows = [
      ['Cash in Hand', formatINR(categories.assets.cashInHand)],
      ['Bank Balance', formatINR(categories.assets.bankBalance)],
      ['Inventory Value', formatINR(categories.assets.inventoryValue)],
      ['Accounts Receivable', formatINR(categories.assets.accountsReceivable)],
    ];
    const totalAssets = Object.values(categories.assets).reduce((a, b) => a + b, 0);

    const liabRows = [
      ['Accounts Payable', formatINR(categories.liabilities.accountsPayable)],
      ['Outstanding Purchase Bills', formatINR(categories.liabilities.outstandingPurchases)],
      ['Working Capital Loans', formatINR(categories.liabilities.loans)],
    ];
    const totalLiab = Object.values(categories.liabilities).reduce((a, b) => a + b, 0);

    const equityRows = [
      ['Shareholder Capital', formatINR(categories.equity.capital)],
      ['Retained Earnings', formatINR(categories.equity.retainedEarnings)],
    ];
    const totalEquity = Object.values(categories.equity).reduce((a, b) => a + b, 0);

    const dataRows = [
      { content: 'ASSETS', isHeader: true },
      ...assetsRows,
      ['TOTAL ASSETS', formatINR(totalAssets), true],
      { content: 'LIABILITIES', isHeader: true },
      ...liabRows,
      ['TOTAL LIABILITIES', formatINR(totalLiab), true],
      { content: 'EQUITY', isHeader: true },
      ...equityRows,
      ['TOTAL EQUITY', formatINR(totalEquity), true],
      ['TOTAL LIABILITIES & EQUITY', formatINR(totalLiab + totalEquity), true, true]
    ];

    const compiledBody = [];
    dataRows.forEach((row) => {
      if (row.isHeader) {
        compiledBody.push([{ content: row.content, colSpan: 2, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }]);
      } else {
        const isBold = row[2];
        const isDouble = row[3];
        compiledBody.push([
          { content: row[0], styles: { fontStyle: isBold ? 'bold' : 'normal', textColor: isDouble ? [27, 94, 32] : [51, 65, 85] } },
          { content: row[1], styles: { fontStyle: isBold ? 'bold' : 'normal', halign: 'right', textColor: isDouble ? [27, 94, 32] : [51, 65, 85] } }
        ]);
      }
    });

    // Render autotable
    doc.autoTable({
      startY: 50,
      head: [['Particulars', 'Amount']],
      body: compiledBody,
      headStyles: { fillColor: [27, 94, 32], textColor: 255, fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });

    const netWorth = totalAssets - totalLiab;
    const finalY = doc.previousAutoTable.finalY + 10;

    // Render Net Worth summary card
    doc.setFillColor(248, 250, 252);
    doc.rect(14, finalY, 182, 12, 'F');
    doc.rect(14, finalY, 182, 12, 'S');
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('NET WORTH (Assets - Liabilities):', 18, finalY + 7.5);
    doc.setTextColor(27, 94, 32);
    doc.text(formatINR(netWorth), 150, finalY + 7.5);

    // Save report
    const filename = `Balance_Sheet_${date}.pdf`;
    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Client PDF Balance Sheet error:', err);
    return false;
  }
};

/**
 * Generates a client-side PDF for Payment In Report.
 */
export const generateClientPaymentInReportPDF = async (data, filters) => {
  try {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString('en-IN');

    // Header bar (Green)
    doc.setFillColor(27, 94, 32);
    doc.rect(0, 0, 210, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Bharat FPO Connect', 14, 11);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment In Receipts Report · Generated: ${dateStr}`, 14, 18);

    // Filters subtitle
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Report Details & Parameters', 14, 36);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const startStr = filters.startDate || 'Beginning';
    const endStr = filters.endDate || 'Present';
    doc.text(`Date Range: ${startStr} to ${endStr}`, 14, 42);
    doc.text(`Payment Type: ${filters.paymentType || 'All Types'}   |   Auto Generated: ${filters.isAutoGenerated !== undefined ? String(filters.isAutoGenerated) : 'All'}`, 14, 47);

    // Compute totals
    let totalAmt = 0;
    data.forEach((item) => {
      totalAmt += Number(item.receivedAmount || 0);
    });

    // Summary block
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 54, 182, 16, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, 54, 182, 16, 'S');

    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL AMOUNT RECEIVED', 18, 60);
    doc.text('TOTAL RECEIPTS', 110, 60);

    doc.setTextColor(27, 94, 32);
    doc.setFontSize(9.5);
    doc.text(formatINR(totalAmt), 18, 66);
    doc.setTextColor(37, 99, 235);
    doc.text(String(data.length), 110, 66);

    // Table rows
    const tableRows = data.map((item) => {
      const dateVal = item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : '—';
      const receiptNo = item.receiptNo || item._id?.substring(0, 8).toUpperCase() || '—';
      const partyName = item.party?.name || item.buyerName || 'Walk-in Customer';
      const invoiceNo = item.linkedSell?.invoiceNo || item.sell?.invoiceNo || '—';
      const breakdown = (item.payments || [])
        .map(py => `${py.paymentType}: Rs. ${py.amount}`)
        .join(', ') || '—';
      const recVal = formatINR(item.receivedAmount || 0);

      return [dateVal, receiptNo, partyName, invoiceNo, breakdown, recVal];
    });

    // Render table
    doc.autoTable({
      startY: 76,
      head: [['Date', 'Receipt No', 'Customer', 'Linked Invoice', 'Breakdown', 'Received Amount']],
      body: tableRows,
      headStyles: { fillColor: [27, 94, 32], textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
      columnStyles: { 5: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });

    // Save report
    const filename = `PaymentIn_Report_${startStr}_to_${endStr}.pdf`;
    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Client PDF Payment In error:', err);
    return false;
  }
};

/**
 * Generates a client-side PDF for Payment Out Report.
 */
export const generateClientPaymentOutReportPDF = async (data, filters) => {
  try {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString('en-IN');

    // Header bar (Green)
    doc.setFillColor(27, 94, 32);
    doc.rect(0, 0, 210, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Bharat FPO Connect', 14, 11);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment Out Receipts Report · Generated: ${dateStr}`, 14, 18);

    // Filters subtitle
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Report Details & Parameters', 14, 36);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const startStr = filters.startDate || 'Beginning';
    const endStr = filters.endDate || 'Present';
    doc.text(`Date Range: ${startStr} to ${endStr}`, 14, 42);
    doc.text(`Payment Type: ${filters.paymentType || 'All Types'}   |   Auto Generated: ${filters.isAutoGenerated !== undefined ? String(filters.isAutoGenerated) : 'All'}`, 14, 47);

    // Compute totals
    let totalAmt = 0;
    data.forEach((item) => {
      totalAmt += Number(item.paidAmount || item.receivedAmount || 0);
    });

    // Summary block
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 54, 182, 16, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, 54, 182, 16, 'S');

    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL AMOUNT PAID', 18, 60);
    doc.text('TOTAL RECEIPTS', 110, 60);

    doc.setTextColor(27, 94, 32);
    doc.setFontSize(9.5);
    doc.text(formatINR(totalAmt), 18, 66);
    doc.setTextColor(37, 99, 235);
    doc.text(String(data.length), 110, 66);

    // Table rows
    const tableRows = data.map((item) => {
      const dateVal = item.date || item.createdAt ? new Date(item.date || item.createdAt).toLocaleDateString('en-GB') : '—';
      const receiptNo = item.receiptNo || item._id?.substring(0, 8).toUpperCase() || '—';
      const partyName = item.party?.name || 'Walk-in Vendor';
      const breakdown = (item.payments || [])
        .map(py => `${py.paymentType}: Rs. ${py.amount}`)
        .join(', ') || '—';
      const paidVal = formatINR(item.paidAmount || item.receivedAmount || 0);

      return [dateVal, receiptNo, partyName, breakdown, paidVal];
    });

    // Render table
    doc.autoTable({
      startY: 76,
      head: [['Date', 'Receipt No', 'Supplier', 'Breakdown', 'Paid Amount']],
      body: tableRows,
      headStyles: { fillColor: [27, 94, 32], textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
      columnStyles: { 4: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });

    // Save report
    const filename = `PaymentOut_Report_${startStr}_to_${endStr}.pdf`;
    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Client PDF Payment Out error:', err);
    return false;
  }
};

/**
 * Generates a client-side PDF for Expense Report.
 */
export const generateClientExpenseReportPDF = async (data, filters) => {
  try {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString('en-IN');

    // Header bar (Green)
    doc.setFillColor(27, 94, 32);
    doc.rect(0, 0, 210, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Bharat FPO Connect', 14, 11);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Expense Report · Generated: ${dateStr}`, 14, 18);

    // Filters subtitle
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Report Details & Parameters', 14, 36);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const startStr = filters.startDate || 'Beginning';
    const endStr = filters.endDate || 'Present';
    doc.text(`Date Range: ${startStr} to ${endStr}`, 14, 42);
    doc.text(`Category: ${filters.category || 'All Categories'}   |   GST Enabled: ${filters.gstEnabled !== undefined ? String(filters.gstEnabled) : 'All'}`, 14, 47);

    // Compute totals
    let totalAmt = 0;
    data.forEach((item) => {
      totalAmt += Number(item.totalAmount || 0);
    });

    // Summary block
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 54, 182, 16, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, 54, 182, 16, 'S');

    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL EXPENSES VALUE', 18, 60);
    doc.text('TOTAL TRANSACTIONS', 110, 60);

    doc.setTextColor(27, 94, 32);
    doc.setFontSize(9.5);
    doc.text(formatINR(totalAmt), 18, 66);
    doc.setTextColor(37, 99, 235);
    doc.text(String(data.length), 110, 66);

    // Table rows
    const tableRows = data.map((item) => {
      const dateVal = item.billDate || item.date || item.createdAt ? new Date(item.billDate || item.date || item.createdAt).toLocaleDateString('en-GB') : '—';
      const expenseNo = item.expenseNo || item._id?.substring(0, 8).toUpperCase() || '—';
      const category = item.expenseCategory || 'Other Expenses';
      const method = item.paymentType || 'Cash';
      const gst = item.gstEnabled ? 'GST Enabled' : 'Without GST';
      const amtVal = formatINR(item.totalAmount || 0);

      return [dateVal, expenseNo, category, method, gst, amtVal];
    });

    // Render table
    doc.autoTable({
      startY: 76,
      head: [['Date', 'Expense No', 'Category', 'Payment Method', 'GST Details', 'Amount']],
      body: tableRows,
      headStyles: { fillColor: [27, 94, 32], textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
      columnStyles: { 5: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });

    // Save report
    const filename = `Expense_Report_${startStr}_to_${endStr}.pdf`;
    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Client PDF Expense error:', err);
    return false;
  }
};

/**
 * Generates an individual client-side PDF for a Sales Invoice.
 */
export const generateIndividualSalePDF = (item) => {
  try {
    const doc = new jsPDF();
    const dateStr = item.date ? new Date(item.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
    const invoiceNo = item.invoiceNumber || item.invoiceNo || item.refNo || item._id?.substring(0, 8).toUpperCase() || '—';

    // Header bar (Green)
    doc.setFillColor(27, 94, 32);
    doc.rect(0, 0, 210, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Bharat FPO Connect', 14, 11);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Sales Invoice: ${invoiceNo}  |  Date: ${dateStr}`, 14, 18);

    // Customer & Details
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Details', 14, 36);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Customer Name: ${item.buyerName || item.buyer?.name || 'Walk-in Customer'}`, 14, 43);
    doc.text(`Billing Type: ${item.billingType || 'Cash'}`, 14, 48);
    if (item.buyerPhone || item.buyer?.phone) {
      doc.text(`Contact: ${item.buyerPhone || item.buyer?.phone}`, 14, 53);
    }

    const items = item.items || [];
    const tableRows = items.map((it, index) => {
      const name = it.item?.itemName || it.itemName || 'Crop Item';
      const rate = formatINR(it.rate || 0);
      const qty = it.quantity || 0;
      const total = formatINR(Number(it.rate || 0) * Number(it.quantity || 0));
      return [index + 1, name, rate, qty, total];
    });

    if (tableRows.length === 0) {
      tableRows.push([1, 'Crop / Sales Transaction', formatINR(item.finalAmount || item.totalAmount || 0), 1, formatINR(item.finalAmount || item.totalAmount || 0)]);
    }

    doc.autoTable({
      startY: 58,
      head: [['S.No', 'Item Name', 'Rate', 'Qty', 'Total']],
      body: tableRows,
      headStyles: { fillColor: [27, 94, 32], textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'center' }, 4: { halign: 'right' } },
      margin: { left: 14, right: 14 }
    });

    const finalY = doc.previousAutoTable.finalY + 10;
    const totalAmt = Number(item.finalAmount || item.totalAmount || 0);
    const recAmt = item.receivedAmount !== undefined 
      ? Number(item.receivedAmount) 
      : (item.billingType === 'Cash' ? totalAmt : 0);
    const unpAmt = item.unpaidAmount !== undefined 
      ? Number(item.unpaidAmount) 
      : (item.billingType === 'Credit' ? (totalAmt - recAmt) : 0);

    // Summary Box
    doc.setFillColor(248, 250, 252);
    doc.rect(120, finalY, 76, 25, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(120, finalY, 76, 25, 'S');

    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text('Gross Amount:', 124, finalY + 6);
    doc.text('Received Amount:', 124, finalY + 12);
    doc.setFont('helvetica', 'bold');
    doc.text('Balance Due:', 124, finalY + 19);

    doc.setFont('helvetica', 'normal');
    doc.text(formatINR(totalAmt), 190, finalY + 6, { align: 'right' });
    doc.text(formatINR(recAmt), 190, finalY + 12, { align: 'right' });
    doc.setTextColor(27, 94, 32);
    doc.setFont('helvetica', 'bold');
    doc.text(formatINR(unpAmt), 190, finalY + 19, { align: 'right' });

    doc.save(`Invoice_${invoiceNo}.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating individual sale PDF:', err);
    return false;
  }
};

/**
 * Generates an individual client-side PDF for a Purchase Bill.
 */
export const generateIndividualPurchasePDF = (item) => {
  try {
    const doc = new jsPDF();
    const dateStr = item.date ? new Date(item.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
    const billNo = item.billNumber || item.billNo || item.orderNo || item.orderNumber || item._id?.substring(0, 8).toUpperCase() || '—';

    // Header bar (Green)
    doc.setFillColor(27, 94, 32);
    doc.rect(0, 0, 210, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Bharat FPO Connect', 14, 11);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Purchase Bill: ${billNo}  |  Date: ${dateStr}`, 14, 18);

    // Supplier & Details
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill Details', 14, 36);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Supplier Name: ${item.supplierName || item.partyName || item.supplier?.name || item.party?.name || 'Walk-in Vendor'}`, 14, 43);
    doc.text(`Billing Type: ${item.billingType || 'Cash'}`, 14, 48);

    const crops = item.crops || item.items || [];
    const tableRows = crops.map((it, index) => {
      const name = it.cropName || it.itemName || 'Crop Item';
      const rate = formatINR(it.rate || it.price || 0);
      const qty = it.quantity || it.qty || 0;
      const total = formatINR(Number(it.rate || it.price || 0) * Number(it.quantity || it.qty || 0));
      return [index + 1, name, rate, qty, total];
    });

    if (tableRows.length === 0) {
      tableRows.push([1, 'Crop Purchase Transaction', formatINR(item.totalAmount || item.finalAmount || 0), 1, formatINR(item.totalAmount || item.finalAmount || 0)]);
    }

    doc.autoTable({
      startY: 54,
      head: [['S.No', 'Item Name', 'Rate', 'Qty', 'Total']],
      body: tableRows,
      headStyles: { fillColor: [27, 94, 32], textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'center' }, 4: { halign: 'right' } },
      margin: { left: 14, right: 14 }
    });

    const finalY = doc.previousAutoTable.finalY + 10;
    const totalAmt = Number(item.totalAmount || item.finalAmount || 0);
    const recAmt = item.receivedAmount !== undefined 
      ? Number(item.receivedAmount) 
      : (item.billingType === 'Cash' ? totalAmt : 0);
    const unpAmt = item.unpaidAmount !== undefined 
      ? Number(item.unpaidAmount) 
      : (item.billingType === 'Credit' ? (totalAmt - recAmt) : 0);

    // Summary Box
    doc.setFillColor(248, 250, 252);
    doc.rect(120, finalY, 76, 25, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(120, finalY, 76, 25, 'S');

    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text('Gross Amount:', 124, finalY + 6);
    doc.text('Paid Amount:', 124, finalY + 12);
    doc.setFont('helvetica', 'bold');
    doc.text('Balance Due:', 124, finalY + 19);

    doc.setFont('helvetica', 'normal');
    doc.text(formatINR(totalAmt), 190, finalY + 6, { align: 'right' });
    doc.text(formatINR(recAmt), 190, finalY + 12, { align: 'right' });
    doc.setTextColor(27, 94, 32);
    doc.setFont('helvetica', 'bold');
    doc.text(formatINR(unpAmt), 190, finalY + 19, { align: 'right' });

    doc.save(`Bill_${billNo}.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating individual purchase PDF:', err);
    return false;
  }
};

/**
 * Generates an individual client-side PDF for a Payment In receipt.
 */
export const generateIndividualPaymentInPDF = (item) => {
  try {
    const doc = new jsPDF();
    const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
    const receiptNo = item.receiptNo || item._id?.substring(0, 8).toUpperCase() || '—';

    // Header bar (Green)
    doc.setFillColor(27, 94, 32);
    doc.rect(0, 0, 210, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Bharat FPO Connect', 14, 11);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment Receipt: ${receiptNo}  |  Date: ${dateStr}`, 14, 18);

    // Customer & Details
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment In Details', 14, 36);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Customer Name: ${item.party?.name || item.buyerName || 'Walk-in Customer'}`, 14, 43);
    doc.text(`Linked Invoice No: ${item.linkedSell?.invoiceNo || item.sell?.invoiceNo || '—'}`, 14, 48);
    doc.text(`Source: ${item.isAutoGenerated ? 'Auto-Generated' : 'Manual Entry'}`, 14, 53);

    const payments = item.payments || [];
    const tableRows = payments.map((it, index) => {
      const type = it.paymentType || 'Cash';
      const amount = formatINR(it.amount || 0);
      return [index + 1, `Payment via ${type}`, amount];
    });

    if (tableRows.length === 0) {
      tableRows.push([1, 'Direct Payment Received', formatINR(item.receivedAmount || 0)]);
    }

    doc.autoTable({
      startY: 59,
      head: [['S.No', 'Payment Description', 'Amount']],
      body: tableRows,
      headStyles: { fillColor: [27, 94, 32], textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      columnStyles: { 2: { halign: 'right' } },
      margin: { left: 14, right: 14 }
    });

    const finalY = doc.previousAutoTable.finalY + 10;
    const totalAmt = Number(item.receivedAmount || 0);

    // Summary Box
    doc.setFillColor(248, 250, 252);
    doc.rect(120, finalY, 76, 12, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(120, finalY, 76, 12, 'S');

    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Received:', 124, finalY + 8);
    doc.setTextColor(27, 94, 32);
    doc.text(formatINR(totalAmt), 190, finalY + 8, { align: 'right' });

    doc.save(`PaymentReceipt_${receiptNo}.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating individual payment-in PDF:', err);
    return false;
  }
};

/**
 * Generates an individual client-side PDF for a Payment Out receipt.
 */
export const generateIndividualPaymentOutPDF = (item) => {
  try {
    const doc = new jsPDF();
    const dateStr = item.date || item.createdAt ? new Date(item.date || item.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
    const receiptNo = item.receiptNo || item._id?.substring(0, 8).toUpperCase() || '—';

    // Header bar (Green)
    doc.setFillColor(27, 94, 32);
    doc.rect(0, 0, 210, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Bharat FPO Connect', 14, 11);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment Receipt (Out): ${receiptNo}  |  Date: ${dateStr}`, 14, 18);

    // Supplier & Details
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Out Details', 14, 36);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Supplier Name: ${item.party?.name || 'Walk-in Vendor'}`, 14, 43);
    doc.text(`Source: ${item.isAutoGenerated ? 'Auto-Generated' : 'Manual Entry'}`, 14, 48);

    const payments = item.payments || [];
    const tableRows = payments.map((it, index) => {
      const type = it.paymentType || 'Cash';
      const amount = formatINR(it.amount || 0);
      return [index + 1, `Payment via ${type}`, amount];
    });

    if (tableRows.length === 0) {
      tableRows.push([1, 'Direct Payout Settled', formatINR(item.paidAmount || item.receivedAmount || 0)]);
    }

    doc.autoTable({
      startY: 54,
      head: [['S.No', 'Payment Description', 'Amount']],
      body: tableRows,
      headStyles: { fillColor: [27, 94, 32], textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      columnStyles: { 2: { halign: 'right' } },
      margin: { left: 14, right: 14 }
    });

    const finalY = doc.previousAutoTable.finalY + 10;
    const totalAmt = Number(item.paidAmount || item.receivedAmount || 0);

    // Summary Box
    doc.setFillColor(248, 250, 252);
    doc.rect(120, finalY, 76, 12, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(120, finalY, 76, 12, 'S');

    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Paid:', 124, finalY + 8);
    doc.setTextColor(27, 94, 32);
    doc.text(formatINR(totalAmt), 190, finalY + 8, { align: 'right' });

    doc.save(`PaymentReceiptOut_${receiptNo}.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating individual payment-out PDF:', err);
    return false;
  }
};

/**
 * Generates an individual client-side PDF for an Expense voucher.
 */
export const generateIndividualExpensePDF = (item) => {
  try {
    const doc = new jsPDF();
    const dateStr = item.billDate || item.date || item.createdAt ? new Date(item.billDate || item.date || item.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
    const expenseNo = item.expenseNo || item._id?.substring(0, 8).toUpperCase() || '—';

    // Header bar (Green)
    doc.setFillColor(27, 94, 32);
    doc.rect(0, 0, 210, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Bharat FPO Connect', 14, 11);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Expense Voucher: ${expenseNo}  |  Date: ${dateStr}`, 14, 18);

    // Payee & Category Details
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Expense Details', 14, 36);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Payee/Supplier Name: ${item.party?.name || item.supplierName || 'Walk-in Vendor'}`, 14, 43);
    doc.text(`Expense Category: ${item.expenseCategory || 'Other Expenses'}`, 14, 48);
    doc.text(`Payment Method: ${item.paymentType || 'Cash'}`, 14, 53);
    doc.text(`GST Status: ${item.gstEnabled ? 'GST Enabled' : 'Without GST'}`, 14, 58);
    if (item.remarks || item.description) {
      doc.text(`Remarks: ${item.remarks || item.description}`, 14, 63);
    }

    const tableRows = [
      [1, item.expenseCategory || 'Other Expenses', item.remarks || item.description || 'General administrative cost details', formatINR(item.totalAmount || 0)]
    ];

    doc.autoTable({
      startY: 68,
      head: [['S.No', 'Category', 'Remarks/Details', 'Amount']],
      body: tableRows,
      headStyles: { fillColor: [27, 94, 32], textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      columnStyles: { 3: { halign: 'right' } },
      margin: { left: 14, right: 14 }
    });

    const finalY = doc.previousAutoTable.finalY + 10;
    const totalAmt = Number(item.totalAmount || 0);

    // Summary Box
    doc.setFillColor(248, 250, 252);
    doc.rect(120, finalY, 76, 12, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(120, finalY, 76, 12, 'S');

    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Amount Paid:', 124, finalY + 8);
    doc.setTextColor(27, 94, 32);
    doc.text(formatINR(totalAmt), 190, finalY + 8, { align: 'right' });

    doc.save(`ExpenseVoucher_${expenseNo}.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating individual expense PDF:', err);
    return false;
  }
};

export const formatINR = (value) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
};

export const VEHICLE_REGEX = /^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{1,4}$/i;

export const VEHICLE_TYPES = [
  { label: "Regular", value: "R" },
  { label: "Over Dimensional Cargo (ODC)", value: "O" },
];

export const TRANSPORT_MODES = [
  { label: "Road", value: "1" },
  { label: "Rail", value: "2" },
  { label: "Air", value: "3" },
  { label: "Ship", value: "4" },
];

export const STATE_CODES = [
  { code: 27, name: "Maharashtra (27)" },
  { code: 9, name: "Uttar Pradesh (09)" },
  { code: 7, name: "Delhi (07)" },
  { code: 10, name: "Bihar (10)" },
  { code: 24, name: "Gujarat (24)" },
  { code: 19, name: "West Bengal (19)" },
  { code: 8, name: "Rajasthan (08)" },
  { code: 3, name: "Punjab (03)" },
  { code: 6, name: "Haryana (06)" },
  { code: 23, name: "Madhya Pradesh (23)" },
  { code: 29, name: "Karnataka (29)" },
  { code: 33, name: "Tamil Nadu (33)" },
  { code: 36, name: "Telangana (36)" },
  { code: 28, name: "Andhra Pradesh (28)" },
  { code: 32, name: "Kerala (32)" },
];

export function computeSalesMetrics(salesList = []) {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  let totalSalesVal = 0;
  let todaySalesVal = 0;
  let totalReceivedVal = 0;
  let totalOutstandingVal = 0;
  let pendingEwbCount = 0;

  salesList.forEach((sale) => {
    const grandTotal = Number(sale.totalAmount) || 0;
    const received = Number(sale.receivedAmount) || 0;
    const due = Math.max(0, grandTotal - received);

    totalSalesVal += grandTotal;
    totalReceivedVal += received;
    totalOutstandingVal += due;

    const saleDateStr = sale.createdAt
      ? new Date(sale.createdAt).toISOString().split("T")[0]
      : "";
    if (saleDateStr === todayStr) {
      todaySalesVal += grandTotal;
    }

    const hasEwb = !!(sale.eWayBill?.ewbNo || sale.ewayBillNo || sale.eWayBillNo);
    if (!hasEwb) {
      pendingEwbCount++;
    }
  });

  return {
    totalSales: totalSalesVal,
    todaySales: todaySalesVal,
    totalReceived: totalReceivedVal,
    outstandingAmount: totalOutstandingVal,
    totalInvoices: salesList.length,
    pendingEWayBills: pendingEwbCount,
  };
}

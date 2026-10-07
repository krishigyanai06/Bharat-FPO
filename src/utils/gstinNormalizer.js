/**
 * Normalizes taxpayer data returned from the Government GSTIN Search API
 * into a standard, clean format to populate ERP forms.
 */
export const normalizeGstinData = (envelope) => {
  if (!envelope) return null;

  // Extract inner data block if response is wrapped as envelope.data
  const data = envelope.data && typeof envelope.data === "object" && !Array.isArray(envelope.data)
    ? envelope.data
    : envelope;

  // 1. Resolve names and attributes supporting multiple API key variations
  const gstin = data.gstin || data.gstNumber || "";
  const tradeName = data.tradeNam || data.tradeName || data.lgnm || data.legalName || data.name || "";
  const legalName = data.lgnm || data.legalName || data.tradeNam || data.tradeName || data.name || "";
  const taxpayerType = data.dty || data.taxpayerType || "—";
  const gstStatus = data.sts || data.status || data.gstStatus || "—";
  const constitution = data.ctb || data.constitution || "—";
  const einvoiceStatus = data.einvoiceStatus || data.eInvoiceEligibility || "—";
  const registrationDate = data.rgdt || data.registrationDate || "—";

  // 2. Parse address fields from pradr.addr or fallback structures
  let billingAddress = "";
  let pinCode = "";
  let state = "";

  const addr = data.pradr?.addr || data.address || data.addr;
  if (addr) {
    if (typeof addr === "string") {
      billingAddress = addr;
    } else {
      const parts = [];
      if (addr.flno) parts.push(`Floor ${addr.flno}`);
      if (addr.bno) parts.push(addr.bno);
      if (addr.bnm) parts.push(addr.bnm);
      if (addr.st) parts.push(addr.st);
      if (addr.loc) parts.push(addr.loc);
      if (addr.stcd || addr.state || addr.stateName) {
        state = addr.stcd || addr.state || addr.stateName;
        parts.push(state);
      }
      if (addr.pn || addr.pncd || addr.pinCode || addr.pincode) {
        pinCode = addr.pn || addr.pncd || addr.pinCode || addr.pincode;
        parts.push(pinCode);
      }
      billingAddress = parts.filter(Boolean).join(", ");
    }
  }

  // Fallbacks for state & pinCode if not nested inside addr block
  if (!pinCode) {
    pinCode = data.pinCode || data.pincode || data.pn || data.pncd || "";
  }
  if (!state) {
    state = data.state || data.stateName || "";
  }

  return {
    gstin: String(gstin).trim().toUpperCase(),
    tradeName: String(tradeName).trim(),
    legalName: String(legalName).trim(),
    taxpayerType: String(taxpayerType).trim(),
    gstStatus: String(gstStatus).trim(),
    constitution: String(constitution).trim(),
    einvoiceStatus: String(einvoiceStatus).trim(),
    registrationDate: String(registrationDate).trim(),
    billingAddress: String(billingAddress).trim(),
    shippingAddress: String(billingAddress).trim(), // Default shipping to billing
    state: String(state).trim(),
    pinCode: String(pinCode).trim(),
  };
};

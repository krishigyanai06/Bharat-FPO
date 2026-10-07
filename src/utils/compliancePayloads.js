/**
 * Extracts 2-digit state code from GSTIN
 */
export const getGstinStateCode = (gstinStr, fallback) => {
  if (gstinStr && gstinStr.length >= 2) {
    const code = gstinStr.substring(0, 2);
    if (/^\d{2}$/.test(code)) return code;
  }
  return fallback;
};

/**
 * Helper to format date to DD/MM/YYYY
 */
export const formatDateDDMMYYYY = (dateStr) => {
  const d = new Date(dateStr || Date.now());
  if (isNaN(d.getTime())) return "01/01/2024";
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export const getFallbackPinCode = (stateCode) => {
  if (stateCode === "05") return 248001; // Uttarakhand Dehradun
  if (stateCode === "29") return 560001; // Karnataka Bangalore
  return 110001; // Delhi default
};

/**
 * Validates that an E-Invoice API response contains all required fields.
 * An E-Invoice must NEVER be persisted, displayed, or downloaded unless this passes.
 */
export const isValidEInvoiceResponse = (res) => {
  const irn = res?.irn || res?.Irn || res?.Data?.irn || res?.Data?.Irn;
  const signedInvoice = res?.signed_invoice || res?.SignedInvoice || res?.Data?.signed_invoice || res?.Data?.SignedInvoice;
  const signedQrCode = res?.signed_qr_code || res?.signedQrCode || res?.SignedQRCode || res?.Data?.signed_qr_code || res?.Data?.signedQrCode || res?.Data?.SignedQRCode;
  
  return !!(irn && signedInvoice && signedQrCode);
};

export const normalizeEInvoiceResponse = (res) => {
  return {
    irn: res?.irn || res?.Irn || res?.Data?.irn || res?.Data?.Irn,
    ackNo: String(res?.ackNo || res?.AckNo || res?.Data?.ackNo || res?.Data?.AckNo || "—"),
    ackDt: res?.ackDt || res?.AckDt || res?.Data?.ackDt || res?.Data?.AckDt || "—",
    signed_invoice: res?.signed_invoice || res?.SignedInvoice || res?.Data?.signed_invoice || res?.Data?.SignedInvoice,
    signed_qr_code: res?.signed_qr_code || res?.signedQrCode || res?.SignedQRCode || res?.Data?.signed_qr_code || res?.Data?.signedQrCode || res?.Data?.SignedQRCode,
  };
};

export const compileB2CSaleToStandalonePayload = (item, transportPayload, sellerData, resolvedParty) => {
  const sellerGstin = sellerData?.eInvoiceGstin || sellerData?.gstNumber || sellerData?.gstin || "29AAACQ3770E000";
  const sellerStateCode = getGstinStateCode(sellerGstin, "29");
  let sellerPin = Number(sellerData?.pinCode || sellerData?.pin) || 560001;
  if (sellerStateCode === "29" && !String(sellerPin).startsWith("5")) {
    sellerPin = 560001;
  }

  const buyerStateCode = String(resolvedParty?.stateCode || "29");
  let buyerPin = Number(resolvedParty?.pinCode || resolvedParty?.pin || item.buyerPinCode) || getFallbackPinCode(buyerStateCode);

  const itemList = (item.items || []).map((it) => {
    const qty = Number(it.quantity) || 1;
    const rate = Number(it.pricePerUnit || it.rate) || 0;
    const totAmt = qty * rate;
    const discount = Number(it.discountAmount) || (totAmt * ((Number(it.discountPercent) || 0) / 100)) || 0;
    const taxableValue = totAmt - discount;

    const gstRt = Number(it.taxPercent) || 0;
    const isInterstate = sellerStateCode !== buyerStateCode;
    
    let igstRate = 0;
    let cgstRate = 0;
    let sgstRate = 0;
    
    if (isInterstate) {
      igstRate = gstRt;
    } else {
      cgstRate = gstRt / 2;
      sgstRate = gstRt / 2;
    }

    return {
      productName: it.itemName || it.item?.productName || it.item?.name || "Product",
      hsnCode: Number(it.item?.hsnCode || "1001"),
      quantity: qty,
      qtyUnit: it.unit || "BAG",
      taxableAmount: taxableValue,
      cgstRate,
      sgstRate,
      igstRate,
    };
  });

  return {
    supplyType: "O",
    subType: "1",
    docType: "INV",
    docNo: item.invoiceNo || `B2C/${item._id?.substring(0, 8).toUpperCase()}`,
    docDate: formatDateDDMMYYYY(item.createdAt),
    fromGstin: sellerGstin,
    fromTrdName: sellerData?.shopName || sellerData?.legalName || "Seller FPO",
    fromStateCode: Number(sellerStateCode) || 29,
    toGstin: "URP",
    toTrdName: resolvedParty?.name || item.buyerName || "Consumer / End User",
    toStateCode: Number(buyerStateCode) || 29,
    itemList,
    transMode: transportPayload.TransMode || "1",
    distance: Number(transportPayload.Distance) || 0,
    transporterId: transportPayload.TransId || undefined,
    transporterName: transportPayload.TransName || undefined,
    vehicleNo: transportPayload.VehNo || undefined,
    vehicleType: transportPayload.VehType || undefined,
    transDocNo: transportPayload.TrnDocNo || undefined,
    transDocDate: transportPayload.TrnDocDate || undefined,
  };
};

/**
 * Map local sale object, customer details, and seller details to standard Government E-Invoice Payload
 */
export const constructEInvoicePayload = (item, resolvedParty, sellerData) => {
  const sellerGstin = sellerData?.eInvoiceGstin || sellerData?.gstNumber || sellerData?.gstin || "29AAACQ3770E000";
  const buyerGstin = resolvedParty?.gstin || resolvedParty?.gstNumber || "29AWGPV7107B1Z1";
  
  const isPinValidForState = (pin, stateCode) => {
    const pinStr = String(pin || "");
    if (stateCode === "05") return pinStr.startsWith("24") || pinStr.startsWith("26");
    if (stateCode === "29") return pinStr.startsWith("56") || pinStr.startsWith("57") || pinStr.startsWith("58") || pinStr.startsWith("59");
    return true;
  };

  const sellerStateCode = getGstinStateCode(sellerGstin, "29");
  let sellerPin = Number(sellerData?.pinCode || sellerData?.pin) || 560001;
  if (!isPinValidForState(sellerPin, sellerStateCode)) {
    sellerPin = getFallbackPinCode(sellerStateCode);
  }

  const buyerStateCode = getGstinStateCode(buyerGstin, "29");
  const buyerPin = Number(resolvedParty?.pinCode || resolvedParty?.pin) || getFallbackPinCode(buyerStateCode);
  const isInterstate = sellerStateCode !== buyerStateCode;

  // Map ItemList
  const items = (item.items || []).map((it, idx) => {
    const qty = Number(it.quantity) || 0;
    const rate = Number(it.pricePerUnit || it.rate) || 0;
    const totAmt = Number((qty * rate).toFixed(2));
    
    // Discount percent/amount calculation
    const discountPercent = Number(it.discountPercent) || 0;
    const discount = Number((it.discountAmount || (totAmt * discountPercent / 100)).toFixed(2));
    
    const preTaxVal = Number((totAmt - discount).toFixed(2));
    const assAmt = preTaxVal;
    
    const gstRt = Number(it.taxPercent) || 0;
    
    let igstAmt = 0;
    let cgstAmt = 0;
    let sgstAmt = 0;
    
    if (isInterstate) {
      igstAmt = Number((assAmt * gstRt / 100).toFixed(2));
    } else {
      cgstAmt = Number((assAmt * (gstRt / 2) / 100).toFixed(2));
      sgstAmt = Number((assAmt * (gstRt / 2) / 100).toFixed(2));
    }
    
    const totItemVal = Number((assAmt + igstAmt + cgstAmt + sgstAmt).toFixed(2));

    return {
      SlNo: String(idx + 1),
      PrdDesc: it.itemName || it.item?.productName || it.item?.name || "Product",
      IsServc: "N",
      HsnCd: it.item?.hsnCode || "1001",
      Barcde: it.item?.barcode || it.item?.barCode || "123456",
      Qty: qty,
      FreeQty: 0,
      Unit: it.unit || "BAG",
      UnitPrice: rate,
      TotAmt: totAmt,
      Discount: discount,
      PreTaxVal: preTaxVal,
      AssAmt: assAmt,
      GstRt: gstRt,
      IgstAmt: igstAmt,
      CgstAmt: cgstAmt,
      SgstAmt: sgstAmt,
      CesRt: 0,
      CesAmt: 0,
      CesNonAdvlAmt: 0,
      StateCesRt: 0,
      StateCesAmt: 0,
      StateCesNonAdvlAmt: 0,
      OthChrg: 0,
      TotItemVal: totItemVal,
      OrdLineRef: String(idx + 1),
      OrgCntry: "IN",
      PrdSlNo: it._id || "12345"
    };
  });

  // Calculate totals for ValDtls
  const assVal = Number(items.reduce((sum, i) => sum + i.AssAmt, 0).toFixed(2));
  const cgstVal = Number(items.reduce((sum, i) => sum + i.CgstAmt, 0).toFixed(2));
  const sgstVal = Number(items.reduce((sum, i) => sum + i.SgstAmt, 0).toFixed(2));
  const igstVal = Number(items.reduce((sum, i) => sum + i.IgstAmt, 0).toFixed(2));
  const discountTotal = Number(items.reduce((sum, i) => sum + i.Discount, 0).toFixed(2));
  const otherCharges = Number(item.otherCharges || 0);
  const roundOff = Number(item.roundOff || 0);
  
  const totInvVal = Number((assVal + cgstVal + sgstVal + igstVal + otherCharges + roundOff).toFixed(2));

  return {
    Version: "1.1",
    TranDtls: {
      TaxSch: "GST",
      SupTyp: "B2B",
      RegRev: "N", 
      IgstOnIntra: "N"
    },
    DocDtls: {
      Typ: "INV",
      No: item.invoiceNo || `DOC/${item._id?.substring(0, 8).toUpperCase()}`,
      Dt: formatDateDDMMYYYY(item.createdAt)
    },
    SellerDtls: {
      Gstin: sellerGstin,
      LglNm: sellerData?.shopName || sellerData?.legalName || "Quicko Infosoft Private Limited",
      TrdNm: sellerData?.shopName || sellerData?.tradeName || "ALTON PLASTIC PRIVATE LTD",
      Addr1: sellerData?.village || "ELPHINSTONE BUILDING",
      Addr2: sellerData?.district || "10, VEER NARIMAN ROAD",
      Loc: sellerData?.district || sellerData?.village || "FORT",
      Pin: sellerPin,
      Stcd: sellerStateCode,
      Ph: sellerData?.phone || sellerData?.mobile || "9000000001",
      Em: sellerData?.emailId || sellerData?.email || "abc@yahoo.com"
    },
    BuyerDtls: {
      Gstin: buyerGstin,
      LglNm: resolvedParty?.name || item.buyerName || "XYZ company pvt ltd",
      TrdNm: resolvedParty?.tradeName || resolvedParty?.name || item.buyerName || "XYZ Industries",
      Pos: buyerStateCode,
      Addr1: resolvedParty?.village || resolvedParty?.address || "7th block, kuvempu layout",
      Addr2: resolvedParty?.district || "kuvempu layout",
      Loc: resolvedParty?.district || resolvedParty?.village || "GANDHINAGAR",
      Pin: buyerPin,
      Stcd: buyerStateCode,
      Ph: resolvedParty?.phone || resolvedParty?.mobile || "91111111111",
      Em: resolvedParty?.email || "xyz@yahoo.com"
    },
    ItemList: items,
    ValDtls: {
      AssVal: assVal,
      CgstVal: cgstVal,
      SgstVal: sgstVal,
      IgstVal: igstVal,
      CesVal: 0,
      StCesVal: 0,
      Discount: discountTotal,
      OthChrg: otherCharges,
      RndOffAmt: roundOff,
      TotInvVal: totInvVal,
      TotInvValFc: totInvVal
    }
  };
};

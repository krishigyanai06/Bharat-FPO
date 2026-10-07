/**
 * Translates technical backend/NIC errors into user-friendly, actionable messages.
 */
export const getUserFriendlyEInvoiceError = (errorString) => {
  if (!errorString) {
    return {
      title: "E-Invoice Generation Failed ❌",
      description: "Unable to register this invoice with the Government IRP.",
      actionableAdvice: "Check connection, verify GSTIN authentication, and try again."
    };
  }

  const errLower = errorString.toLowerCase();

  // 1. Session Token / Authentication failure
  if (
    errLower.includes("session access token") ||
    errLower.includes("authenticate session") ||
    (errLower.includes("auth") && errLower.includes("token")) ||
    errLower.includes("nic credentials") ||
    errLower.includes("invalid credentials")
  ) {
    return {
      title: "Government Portal Login Failed 🔐",
      description: "The system could not authenticate with the Government E-Invoice Portal.",
      actionableAdvice: "Verify your E-Invoice portal Username, Password, Client ID, and Client Secret in Settings > E-Invoice Config. Ensure your credentials are correct and API registration is active."
    };
  }

  // 2. Duplicate Invoice / IRN already generated
  if (
    errLower.includes("duplicate") ||
    errLower.includes("already registered") ||
    errLower.includes("already exists") ||
    errLower.includes("2150") // Common NIC duplicate error code
  ) {
    return {
      title: "Invoice Already Registered 📄",
      description: "An E-Invoice with this Invoice Number has already been registered with the government.",
      actionableAdvice: "No action needed. If you require the details, you can sync or retrieve the existing E-Invoice PDF."
    };
  }

  // 3. Invalid Buyer/Seller Pin or State code
  if (
    errLower.includes("pin") ||
    errLower.includes("pincode") ||
    errLower.includes("state code") ||
    errLower.includes("postal") ||
    errLower.includes("address")
  ) {
    return {
      title: "Invalid Address or PIN Code 📍",
      description: "The address details, PIN code, or State code for either the Buyer or Seller FPO are invalid or mismatched.",
      actionableAdvice: "Please verify that the billing address, state name, and PIN code are correct and match each other in the Buyer Profile and FPO settings."
    };
  }

  // 4. Ineligible (B2C or exempt)
  if (
    errLower.includes("eligible") ||
    errLower.includes("b2c") ||
    errLower.includes("not registered taxpayer") ||
    errLower.includes("receiver") && errLower.includes("gstin")
  ) {
    return {
      title: "Invoice Ineligible for E-Invoice ⚠️",
      description: "This invoice is not eligible for Government E-Invoice registration.",
      actionableAdvice: "E-Invoicing is only for B2B (Business-to-Business) transactions with valid registered buyers. Please ensure the buyer's GSTIN is entered and active."
    };
  }

  // 5. Network/Server offline
  if (
    errLower.includes("network") ||
    errLower.includes("timeout") ||
    errLower.includes("unreachable") ||
    errLower.includes("503") ||
    errLower.includes("502") ||
    errLower.includes("gateway")
  ) {
    return {
      title: "Government Portal Unreachable 🌐",
      description: "The Government E-Invoice Portal (NIC) is currently offline, experiencing heavy traffic, or undergoing maintenance.",
      actionableAdvice: "Please wait a few minutes and try again. This is a temporary government portal issue."
    };
  }

  // Default fallback
  return {
    title: "E-Invoice Generation Failed ❌",
    description: errorString,
    actionableAdvice: "Please verify that your internet connection is stable, your FPO's GSTIN credentials are correct, and the invoice details are valid."
  };
};

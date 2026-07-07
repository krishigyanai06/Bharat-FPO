import Swal from "sweetalert2";

// Locks to prevent duplicate alerts
const activeAlerts = {
  offline: false,
  server: false,
  timeout: false,
};

let offlineSwalInstance = null;

/**
 * Show a warning toast when connection is lost.
 * Ensures only one popup is active at a time.
 */
export const showOfflineAlert = () => {
  if (activeAlerts.offline) return;
  activeAlerts.offline = true;

  // Close server or timeout alert if open
  if (activeAlerts.server) {
    Swal.close();
    activeAlerts.server = false;
  }
  if (activeAlerts.timeout) {
    Swal.close();
    activeAlerts.timeout = false;
  }

  offlineSwalInstance = Swal.fire({
    title: "Internet Connection Lost",
    text: "You're currently offline. Some features may not work until your connection is restored.",
    icon: "warning",
    position: "top-end",
    toast: true,
    showConfirmButton: false,
    allowOutsideClick: false,
    allowEscapeKey: false,
    timer: null,
    background: "#FFFBEB", // Amber 50
    iconColor: "#D97706", // Amber 600
    customClass: {
      popup: "border-l-4 border-amber-500 shadow-lg rounded-xl",
      title: "text-amber-900 font-bold text-sm",
      htmlContainer: "text-amber-800 text-xs",
    },
  });
};

/**
 * Show a success toast when connection is restored.
 * Closes the offline modal if visible and resets the lock.
 */
export const showOnlineAlert = () => {
  if (!activeAlerts.offline) return;
  activeAlerts.offline = false;

  if (offlineSwalInstance) {
    Swal.close();
    offlineSwalInstance = null;
  }

  Swal.fire({
    title: "Connection Restored",
    text: "You're back online.",
    icon: "success",
    position: "top-end",
    toast: true,
    showConfirmButton: false,
    timer: 2000,
    background: "#ECFDF5", // Emerald 50
    iconColor: "#059669", // Emerald 600
    customClass: {
      popup: "border-l-4 border-emerald-500 shadow-lg rounded-xl",
      title: "text-emerald-900 font-bold text-sm",
      htmlContainer: "text-emerald-800 text-xs",
    },
  });
};

/**
 * Show a server unreachable alert when backend cannot be reached.
 * Automatically closes in 4 seconds.
 */
export const showServerUnavailableAlert = () => {
  // If we are completely offline, let the offline warning take precedence
  if (activeAlerts.server || activeAlerts.offline) return;
  activeAlerts.server = true;

  Swal.fire({
    title: "Server Unavailable",
    text: "Unable to connect to the server. Please try again later.",
    icon: "error",
    position: "top-end",
    toast: true,
    showConfirmButton: false,
    timer: 4000,
    background: "#FEF2F2", // Red 50
    iconColor: "#DC2626", // Red 600
    customClass: {
      popup: "border-l-4 border-red-500 shadow-lg rounded-xl",
      title: "text-red-900 font-bold text-sm",
      htmlContainer: "text-red-800 text-xs",
    },
    didClose: () => {
      activeAlerts.server = false;
    },
  });
};

/**
 * Show a timeout warning alert with an interactive 'Retry' option.
 */
export const showTimeoutAlert = (onRetry) => {
  if (activeAlerts.timeout || activeAlerts.offline) return;
  activeAlerts.timeout = true;

  Swal.fire({
    title: "Request Timed Out",
    text: "The request took too long. Would you like to retry?",
    icon: "warning",
    position: "top-end",
    toast: true,
    showConfirmButton: true,
    showCancelButton: true,
    confirmButtonText: "Retry",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#15803D", // Brand green
    cancelButtonColor: "#6B7280",
    background: "#FFFBEB", // Amber 50
    iconColor: "#D97706",
    customClass: {
      popup: "border-l-4 border-amber-500 shadow-lg rounded-xl",
      title: "text-amber-900 font-bold text-sm",
      htmlContainer: "text-amber-800 text-xs",
      confirmButton: "text-xs px-3 py-1.5 rounded-lg",
      cancelButton: "text-xs px-3 py-1.5 rounded-lg",
    },
    didClose: () => {
      activeAlerts.timeout = false;
    },
  }).then((result) => {
    if (result.isConfirmed && typeof onRetry === "function") {
      onRetry();
    }
  });
};

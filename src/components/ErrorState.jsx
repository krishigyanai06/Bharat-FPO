import React from "react";
import { WifiOff, Server, Clock, AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Reusable premium error display component.
 * Supports "page", "section", and "inline" variants.
 */
export default function ErrorState({ title, error, onRetry, variant = "page" }) {
  // Extract error metadata if present
  const normalizedError = error?.normalizedError || 
    (typeof error === 'object' && error !== null && error.type ? error : null);

  const errorType = normalizedError?.type || (
    (!navigator.onLine || 
     String(error).toLowerCase().includes("offline") || 
     String(error).toLowerCase().includes("internet") ||
     String(error).toLowerCase().includes("no internet"))
      ? "OFFLINE"
      : (String(error).toLowerCase().includes("timeout") || String(error).toLowerCase().includes("time out"))
      ? "TIMEOUT"
      : (String(error).toLowerCase().includes("server unavailable") || String(error).toLowerCase().includes("connect"))
      ? "SERVER"
      : "INTERNAL"
  );

  const errorTitle = normalizedError?.title || title || (
    errorType === "OFFLINE" ? "No Internet Connection" :
    errorType === "TIMEOUT" ? "Request Timed Out" :
    errorType === "SERVER" ? "Server Unavailable" :
    "Something went wrong"
  );

  const errorMessage = normalizedError?.message || (
    typeof error === 'string' ? error : 
    errorType === "OFFLINE" ? "Please check your internet connection and try again." :
    errorType === "TIMEOUT" ? "The request took too long. Please try again." :
    errorType === "SERVER" ? "Unable to connect to the server. Please try again later." :
    "An unexpected error occurred while processing your request."
  );

  // Styling maps for various error types
  const config = {
    OFFLINE: {
      icon: WifiOff,
      colors: {
        bg: "bg-amber-50/80 border-amber-200 text-amber-900",
        iconContainer: "bg-amber-100 text-amber-700 border-amber-200",
        btn: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200",
        gradient: "from-amber-500/10 to-orange-500/5",
      }
    },
    TIMEOUT: {
      icon: Clock,
      colors: {
        bg: "bg-amber-50/80 border-amber-200 text-amber-900",
        iconContainer: "bg-amber-100 text-amber-700 border-amber-200",
        btn: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200",
        gradient: "from-amber-500/10 to-orange-500/5",
      }
    },
    SERVER: {
      icon: Server,
      colors: {
        bg: "bg-blue-50/80 border-blue-200 text-blue-900",
        iconContainer: "bg-blue-100 text-blue-700 border-blue-200",
        btn: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200",
        gradient: "from-blue-500/10 to-sky-500/5",
      }
    },
    INTERNAL: {
      icon: AlertTriangle,
      colors: {
        bg: "bg-red-50/80 border-red-200 text-red-900",
        iconContainer: "bg-red-100 text-red-700 border-red-200",
        btn: "bg-red-600 hover:bg-red-700 text-white shadow-red-200",
        gradient: "from-red-500/10 to-rose-500/5",
      }
    }
  }[errorType] || {
    icon: AlertTriangle,
    colors: {
      bg: "bg-red-50/80 border-red-200 text-red-900",
      iconContainer: "bg-red-100 text-red-700 border-red-200",
      btn: "bg-red-600 hover:bg-red-700 text-white shadow-red-200",
      gradient: "from-red-500/10 to-rose-500/5",
    }
  };

  const IconComponent = config.icon;

  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-semibold shadow-sm transition-all duration-300 w-full ${config.colors.bg}`}>
        <IconComponent className="w-4 h-4 flex-shrink-0 animate-pulse" />
        <div className="flex-1 truncate">
          <span className="font-bold mr-1">{errorTitle}:</span>
          <span>{errorMessage}</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 flex items-center gap-1.5 ${config.colors.btn}`}
          >
            <RefreshCw className="w-2.5 h-2.5" />
            Retry
          </button>
        )}
      </div>
    );
  }

  if (variant === "section") {
    return (
      <div className={`p-6 border rounded-2xl flex flex-col items-center text-center max-w-lg mx-auto my-4 transition-all duration-300 ${config.colors.bg}`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 shadow-xs border ${config.colors.iconContainer}`}>
          <IconComponent className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-gray-900 mb-1">{errorTitle}</h4>
        <p className="text-xs text-gray-500 mb-4 max-w-xs">{errorMessage}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition duration-200 active:scale-95 shadow-sm ${config.colors.btn}`}
          >
            <RefreshCw className="w-3 h-3" />
            Retry Loading
          </button>
        )}
      </div>
    );
  }

  // variant="page"
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center max-w-xl mx-auto my-8 bg-gradient-to-b ${config.colors.gradient} border ${config.colors.bg.split(" ")[1]} rounded-3xl shadow-md backdrop-blur-md transition-all duration-500 border-dashed`}>
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-sm border ${config.colors.iconContainer}`}>
        <IconComponent className="w-8 h-8 animate-pulse" />
      </div>
      <h3 className="text-lg font-extrabold text-gray-900 mb-2">{errorTitle}</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm leading-relaxed">{errorMessage}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className={`flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold rounded-2xl transition duration-200 active:scale-95 shadow-md ${config.colors.btn}`}
        >
          <RefreshCw className="w-4 h-4" />
          Retry Connection
        </button>
      )}
    </div>
  );
}

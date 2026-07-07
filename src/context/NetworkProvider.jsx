import React, { createContext, useContext, useState, useEffect } from "react";
import { showOfflineAlert, showOnlineAlert } from "../utils/notificationService";

const NetworkContext = createContext({
  isOnline: navigator.onLine,
  isOffline: !navigator.onLine,
});

export const useNetwork = () => useContext(NetworkContext);

export const NetworkProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showOnlineAlert();
    };

    const handleOffline = () => {
      setIsOnline(false);
      showOfflineAlert();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check on load in case state changed before listener mounted
    if (!navigator.onLine) {
      showOfflineAlert();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <NetworkContext.Provider value={{ isOnline, isOffline: !isOnline }}>
      {children}
    </NetworkContext.Provider>
  );
};

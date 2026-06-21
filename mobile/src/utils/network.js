import { useEffect, useMemo, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

export const NETWORK_MESSAGES = {
  en: "Connection problem. Please check your internet and try again.",
  sw: "Kuna tatizo la mtandao. Hakikisha internet ipo kisha jaribu tena.",
};

export function networkErrorMessage(language = "en") {
  return NETWORK_MESSAGES[language] || NETWORK_MESSAGES.en;
}

export function isNetworkError(error) {
  if (!error) return false;
  if (Number(error?.response?.status) >= 500 || error?.response?.status === 408) return true;
  if (!error.response) return true;
  const code = String(error.code || "").toUpperCase();
  return ["ECONNABORTED", "ERR_NETWORK", "ETIMEDOUT", "ENETUNREACH"].includes(code);
}

export function useNetworkStatus() {
  const [state, setState] = useState({
    isConnected: null,
    isInternetReachable: null,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((next) => {
      setState({
        isConnected: next.isConnected,
        isInternetReachable: next.isInternetReachable,
      });
    });
    NetInfo.fetch().then((next) => {
      setState({
        isConnected: next.isConnected,
        isInternetReachable: next.isInternetReachable,
      });
    }).catch(() => {});
    return unsubscribe;
  }, []);

  return useMemo(() => {
    const isOffline = state.isConnected === false || state.isInternetReachable === false;
    return {
      ...state,
      isOffline,
      networkErrorMessage,
    };
  }, [state]);
}

import { useEffect, useMemo, useRef, useState } from "react";
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

// How long isInternetReachable must stay `false` (while the radio says we
// ARE connected) before we believe it. NetInfo's reachability probe reports
// `false` while it is still in flight and on slow links routinely flips
// false→true a moment later — announcing "offline" during that window is
// what showed "No internet connection" to users sitting on working WiFi.
const REACHABILITY_GRACE_MS = 4000;

export function useNetworkStatus() {
  const [state, setState] = useState({
    isConnected: null,
    isInternetReachable: null,
  });
  const [isOffline, setIsOffline] = useState(false);
  const graceTimer = useRef(null);

  useEffect(() => {
    const apply = (next) =>
      setState({
        isConnected: next.isConnected,
        isInternetReachable: next.isInternetReachable,
      });
    const unsubscribe = NetInfo.addEventListener(apply);
    NetInfo.fetch().then(apply).catch(() => {});
    return unsubscribe;
  }, []);

  useEffect(() => {
    clearTimeout(graceTimer.current);
    // No radio at all (airplane mode, WiFi off) — offline immediately.
    if (state.isConnected === false) {
      setIsOffline(true);
      return undefined;
    }
    // Connected but the reachability probe says no internet: wait out the
    // grace period before trusting it (captive portals stay flagged, probe
    // false-negatives don't).
    if (state.isConnected === true && state.isInternetReachable === false) {
      graceTimer.current = setTimeout(() => setIsOffline(true), REACHABILITY_GRACE_MS);
      return () => clearTimeout(graceTimer.current);
    }
    setIsOffline(false);
    return undefined;
  }, [state.isConnected, state.isInternetReachable]);

  return useMemo(() => ({
    ...state,
    isOffline,
    networkErrorMessage,
  }), [state, isOffline]);
}

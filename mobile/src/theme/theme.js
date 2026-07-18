import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const palette = {
  light: {
    bg: "#F7F9FC",
    bgElevated: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceSoft: "#F1F5F9",
    text: "#101828",
    textSecondary: "#344054",
    textMuted: "#667085",
    textVeryMuted: "#98A2B3",
    border: "#DDE3EA",
    borderLight: "#EAECF0",
    overlay: "rgba(16,24,40,0.45)",
    media: "#000000",
  },
  dark: {
    bg: "#0B111A",
    bgElevated: "#111927",
    surface: "#131D2B",
    surfaceSoft: "#192536",
    text: "#F8FAFC",
    textSecondary: "#D0D5DD",
    textMuted: "#98A2B3",
    textVeryMuted: "#667085",
    border: "#263548",
    borderLight: "#1D2A3A",
    overlay: "rgba(0,0,0,0.62)",
    media: "#000000",
  },
};

export const createTheme = (mode = "light") => ({
  mode,
  colors: {
    ...palette[mode],

    primary: mode === "dark" ? "#39A5E6" : "#1683C7",
    primaryDark: mode === "dark" ? "#1683C7" : "#10689F",
    onPrimary: "#FFFFFF",
    // A dimmed version of onPrimary for placeholder/secondary text sitting on
    // a solid `primary` fill (e.g. the Home search pill) — without this,
    // placeholder copy was rendering in the exact same white as typed text,
    // so there was no visual distinction between the two.
    onPrimaryMuted: "rgba(255,255,255,0.68)",
    primarySoft: mode === "dark" ? "#102F45" : "#E8F4FC",
    // The base `primary` blue reads fine on white but is too low-luminance
    // to use as text/icon color against dark surfaces or primarySoft in
    // dark mode — it visually disappears (the exact "hidden" look). Use
    // this instead for blue text/icons that sit on a surface or tint, not
    // as a button fill.
    primaryStrong: mode === "dark" ? "#66BDF0" : "#0F75B5",
    accent: mode === "dark" ? "#FF9E2C" : "#F5820B",
    onAccent: "#FFFFFF",
    accentSoft: mode === "dark" ? "#3B2812" : "#FFF1DE",
    accentDark: mode === "dark" ? "#F5820B" : "#D96B00",
    brandGradient: mode === "dark" ? ["#1683C7", "#39A5E6"] : ["#10689F", "#1683C7"],

    muted: palette[mode].textMuted,

    danger: "#E63946",
    error: "#E63946",
    dangerSoft: mode === "dark" ? "#3A161B" : "#FDE8EA",
    success: "#16A34A",
    successSoft: mode === "dark" ? "#10351F" : "#DCFCE7",
    warning: "#F59E0B",
    warningSoft: mode === "dark" ? "#3A2A0F" : "#FEF3C7",
    orange: mode === "dark" ? "#FF9E2C" : "#F5820B",
    orangeSoft: mode === "dark" ? "#3B2812" : "#FFF1DE",
    slate: palette[mode].textMuted,
    slateSoft: mode === "dark" ? "#1C2A30" : "#F1F5F9",
  },

  radius: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 28,
    pill: 999,
  },

  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 22,
    xl: 28,
    xxl: 40,
  },

  shadow: {
    card: {
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    soft: {
      shadowColor: "#000",
      shadowOpacity: 0.03,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
  },
});

export const theme = createTheme("light");

const ThemeContext = createContext({
  theme,
  mode: "light",
  toggleTheme: () => {},
  setMode: () => {},
});

const STORAGE_KEY = "appThemeMode";

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState("light");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === "light" || saved === "dark") setModeState(saved);
    });
  }, []);

  const setMode = (nextMode) => {
    if (nextMode !== "light" && nextMode !== "dark") return;
    setModeState(nextMode);
    AsyncStorage.setItem(STORAGE_KEY, nextMode);
  };

  const value = useMemo(() => {
    const currentTheme = createTheme(mode);
    return {
      theme: currentTheme,
      mode,
      isDark: mode === "dark",
      setMode,
      toggleTheme: () => setMode(mode === "light" ? "dark" : "light"),
    };
  }, [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  
  if (!context || !context.theme) {
    throw new Error(
      'useAppTheme must be used within a ThemeProvider'
    );
  }

  return context;
}

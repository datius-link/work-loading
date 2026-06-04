import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const palette = {
  light: {
    bg: "#F5F7FA",
    bgElevated: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceSoft: "#F0F4F8",
    text: "#0F172A",
    textSecondary: "#334155",
    textMuted: "#64748B",
    textVeryMuted: "#94A3B8",
    border: "#E2E8F0",
    borderLight: "#EDF2F7",
    overlay: "rgba(15,23,42,0.45)",
    media: "#000000",
  },
  dark: {
    bg: "#071315",
    bgElevated: "#0D1B1E",
    surface: "#0D1B1E",
    surfaceSoft: "#13292D",
    text: "#F8FAFC",
    textSecondary: "#CBD5E1",
    textMuted: "#94A3B8",
    textVeryMuted: "#64748B",
    border: "#1F3A40",
    borderLight: "#183237",
    overlay: "rgba(0,0,0,0.62)",
    media: "#000000",
  },
};

export const createTheme = (mode = "light") => ({
  mode,
  colors: {
    ...palette[mode],

    primary: "#0B6B63",
    onPrimary: "#FFFFFF",
    primarySoft: mode === "dark" ? "#0F3E3B" : "#E6F4F2",
    accent: "#1683C7",
    onAccent: "#FFFFFF",
    accentSoft: mode === "dark" ? "#102F45" : "#E7F4FD",
    brandGradient: ["#0B6B63", "#1683C7"],

    muted: palette[mode].textMuted,

    danger: "#E63946",
    error: "#E63946",
    success: "#16A34A",
    warning: "#F59E0B",
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

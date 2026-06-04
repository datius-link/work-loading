import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LanguageContext = createContext();
const STORAGE_KEY = "appLanguage";

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === "en" || saved === "sw") setLanguage(saved);
    });
  }, []);

  const setAppLanguage = (next) => {
    if (next !== "en" && next !== "sw") return;
    setLanguage(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const toggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === "en" ? "sw" : "en";
      AsyncStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: setAppLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

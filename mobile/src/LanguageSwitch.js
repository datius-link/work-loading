import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import Txt from "./Txt";
import { useLanguage } from "./LanguageContext";

export default function LanguageSwitch() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <TouchableOpacity style={styles.wrap} onPress={toggleLanguage}>
      <Txt
        en="English | Kiswahili"
        sw="Kiswahili | English"
        style={styles.text}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.7,
  },
});

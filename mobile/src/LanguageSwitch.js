import React from "react";
import { TouchableOpacity, StyleSheet, View } from "react-native";
import Txt from "./Txt";
import { useLanguage } from "./LanguageContext";
import { theme } from "./theme";

export default function LanguageSwitch() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <TouchableOpacity style={styles.wrap} onPress={toggleLanguage}>
      <View style={[styles.segment, language === "en" && styles.active]}>
        <Txt en="EN" sw="EN" style={[styles.text, language === "en" && styles.activeText]} />
      </View>
      <View style={[styles.segment, language === "sw" && styles.active]}>
        <Txt en="SW" sw="SW" style={[styles.text, language === "sw" && styles.activeText]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignSelf: "flex-end",
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 3,
  },
  segment: {
    minWidth: 42,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    alignItems: "center",
  },
  active: {
    backgroundColor: theme.colors.primary,
  },
  text: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.textMuted,
  },
  activeText: {
    color: "#fff",
  },
});

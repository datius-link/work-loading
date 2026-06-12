import React from "react";
import { TouchableOpacity, StyleSheet, View } from "react-native";
import Txt from "./Txt";
import { useLanguage } from "./LanguageContext";
import { useAppTheme } from "./theme";

export default function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const nextLanguage = language === "en" ? "sw" : "en";

  return (
    <TouchableOpacity style={styles.wrap} onPress={() => setLanguage(nextLanguage)}>
      <Txt
        en={language === "en" ? "Kiswahili" : "English"}
        sw={language === "en" ? "Kiswahili" : "English"}
        style={styles.text}
      />
    </TouchableOpacity>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    wrap: {
      alignSelf: "flex-end",
      backgroundColor: theme.colors.surfaceSoft,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    text: {
      fontSize: 12,
      fontWeight: "800",
      color: theme.colors.primary,
    },
  });

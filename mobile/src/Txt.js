import React from "react";
import { Text } from "react-native";
import { useLanguage } from "./LanguageContext";

export default function Txt({ en, sw, style, ...props }) {
  const { language } = useLanguage();

  return (
    <Text style={style} {...props}>
      {language === "sw" ? sw || en : en}
    </Text>
  );
}

import React from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Txt from "../Txt";
import { useAppTheme } from "../theme";
import AppIcon from "../icons/AppIcon";
import SettingsScreen from "./Settings/SettingsScreen";

// Placeholder for the admin-published updates/announcements feed. No backend
// endpoint exists for this yet — wired up as its own route so the header
// menu (Home.js) has somewhere real to go, without pretending there's live
// content behind it.
export default function Updates() {
  const navigation = useNavigation();
  const { theme } = useAppTheme();

  return (
    <SettingsScreen titleEn="Updates" titleSw="Taarifa Mpya" onBack={() => navigation.goBack()}>
      <View style={{ alignItems: "center", paddingVertical: 48, gap: 10 }}>
        <AppIcon name="fileText" size={30} color={theme.colors.textMuted} />
        <Txt en="No updates yet" sw="Hakuna taarifa bado" style={{ color: theme.colors.text, fontSize: 15, fontWeight: "800" }} />
        <Txt
          en="Announcements from Work Loading will show up here."
          sw="Matangazo kutoka Work Loading yataonekana hapa."
          style={{ color: theme.colors.textMuted, fontSize: 13, textAlign: "center", paddingHorizontal: 24 }}
        />
      </View>
    </SettingsScreen>
  );
}

import React, { useMemo } from "react";
import { StyleSheet, Switch, TouchableOpacity, View } from "react-native";
import Txt from "../../Txt";
import { useAppTheme } from "../../theme";
import SettingsScreen, { SettingDivider } from "./SettingsScreen";

export const DEFAULT_NOTIFICATION_SETTINGS = {
  enable_messages_notifications: true,
  enable_job_notifications: true,
  enable_follow_post_notifications: true,
  enable_sound: true,
  enable_vibration: true,
  popup_previews: true,
  message_preview_privacy: "show_all",
};

const TOGGLES = [
  ["enable_messages_notifications", "Messages", "Ujumbe"],
  ["enable_job_notifications", "Jobs", "Kazi"],
  ["enable_follow_post_notifications", "Follows and posts", "Kufuatwa na machapisho"],
  ["enable_sound", "Sound", "Sauti"],
  ["enable_vibration", "Vibration", "Mtetemo"],
  ["popup_previews", "Popup previews", "Muhtasari wa popup"],
];

const PREVIEWS = [
  ["show_all", "Show sender and message", "Onyesha mtumaji na ujumbe", "Datius: Nimefika eneo la kazi"],
  ["hide_message", "Hide message only", "Ficha ujumbe pekee", "Datius sent you a message"],
  ["hide_all", "Hide sender and message", "Ficha mtumaji na ujumbe", "You received a new message"],
];

export function messagePopupText(setting, sender, message) {
  if (setting === "hide_all") return "You received a new message";
  if (setting === "hide_message") return `${sender || "Someone"} sent you a message`;
  return `${sender || "Someone"}: ${message || "New message"}`;
}

export default function NotificationSettings({ onBack, settings, saving, onChange }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const current = { ...DEFAULT_NOTIFICATION_SETTINGS, ...(settings || {}) };

  return (
    <SettingsScreen titleEn="Notification Settings" titleSw="Mipangilio ya Notifications" onBack={onBack}>
      <View style={styles.panel}>
        {TOGGLES.map(([key, en, sw], index) => (
          <React.Fragment key={key}>
            {index ? <SettingDivider /> : null}
            <View style={styles.row}>
              <Txt en={en} sw={sw} style={styles.label} />
              <Switch
                value={!!current[key]}
                disabled={saving}
                onValueChange={(value) => onChange(key, value)}
                trackColor={{ false: theme.colors.border, true: theme.colors.primarySoft }}
                thumbColor={current[key] ? theme.colors.primary : theme.colors.textMuted}
              />
            </View>
          </React.Fragment>
        ))}
      </View>

      <Txt en="MESSAGE POPUP PRIVACY" sw="FARAGHA YA POPUP YA UJUMBE" style={styles.section} />
      <View style={styles.panel}>
        {PREVIEWS.map(([value, en, sw, example], index) => {
          const selected = current.message_preview_privacy === value;
          return (
            <React.Fragment key={value}>
              {index ? <SettingDivider /> : null}
              <TouchableOpacity
                style={styles.option}
                disabled={saving}
                onPress={() => onChange("message_preview_privacy", value)}
              >
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
                <View style={styles.optionText}>
                  <Txt en={en} sw={sw} style={styles.label} />
                  <Txt en={example} sw={example} style={styles.example} />
                </View>
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>
      <Txt
        en="These choices are saved with your profile and are used when real-time message popups are displayed."
        sw="Chaguo hizi huhifadhiwa kwenye profaili yako na hutumika popup za ujumbe wa moja kwa moja zinapoonyeshwa."
        style={styles.hint}
      />
    </SettingsScreen>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    panel: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, backgroundColor: theme.colors.surface },
    row: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    label: { color: theme.colors.text, fontSize: 13, fontWeight: "800" },
    section: { color: theme.colors.textMuted, fontSize: 10, fontWeight: "900", marginTop: 4 },
    option: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
    optionText: { flex: 1 },
    example: { color: theme.colors.textMuted, fontSize: 11, marginTop: 3 },
    radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: theme.colors.border, alignItems: "center", justifyContent: "center" },
    radioSelected: { borderColor: theme.colors.primary },
    radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary },
    hint: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 16 },
  });

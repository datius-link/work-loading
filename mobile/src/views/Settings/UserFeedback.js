import React, { useMemo, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import AppIcon from "../../icons/AppIcon";
import Txt from "../../Txt";
import { useAppTheme } from "../../theme";
import { viewerRequest } from "../../api/api";
import SettingsScreen from "./SettingsScreen";
import { useLanguage } from "../../LanguageContext";

// Same categories SupportActionSheet uses for the "feedback" action, kept in
// sync so both entry points file into the same backend shape.
const FEEDBACK_CATEGORIES = [
  ["UI", "UI"],
  ["Jobs", "Kazi"],
  ["Posts", "Machapisho"],
  ["Notifications", "Notifications"],
  ["Performance", "Utendaji"],
  ["Other", "Nyingine"],
];

export default function UserFeedback({ onBack }) {
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [category, setCategory] = useState("");
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null);

  const selectedSwLabel = FEEDBACK_CATEGORIES.find(([value]) => value === category)?.[1] || category;
  const canSubmit = !!category && message.trim().length >= 5 && !sending;

  const submit = async () => {
    if (!canSubmit) return;
    try {
      setSending(true);
      await viewerRequest("post", "/support/feedback", {
        category,
        message: message.trim(),
        type: "feedback",
      });
      setNotice("success");
      setCategory("");
      setMessage("");
    } catch (err) {
      setNotice(err?.response?.status === 401 ? "login" : "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <SettingsScreen titleEn="Send Feedback" titleSw="Tuma Maoni" onBack={onBack}>
      <Txt
        en="Tell us what's working well and what could be better. Your feedback helps us improve Work Loading for everyone."
        sw="Tuambie kinachofanya kazi vizuri na kinachohitaji kuboreshwa. Maoni yako yanatusaidia kuboresha Work Loading kwa kila mtu."
        style={styles.intro}
      />

      <Txt en="Category" sw="Aina" style={styles.label} />
      <TouchableOpacity style={styles.select} onPress={() => setSelectionOpen(!selectionOpen)}>
        <Txt en={category || "Select a category"} sw={selectedSwLabel || "Chagua aina"} style={[styles.selectText, !category && styles.placeholder]} />
        <AppIcon name={selectionOpen ? "minus" : "plus"} size={16} color={theme.colors.textMuted} />
      </TouchableOpacity>
      {selectionOpen ? (
        <View style={styles.optionList}>
          {FEEDBACK_CATEGORIES.map(([value, swLabel]) => (
            <TouchableOpacity
              key={value}
              style={styles.option}
              onPress={() => {
                setCategory(value);
                setSelectionOpen(false);
              }}
            >
              <Txt en={value} sw={swLabel} style={styles.optionText} />
              {category === value ? <AppIcon name="check" size={16} color={theme.colors.primary} /> : null}
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <Txt en="Your feedback" sw="Maoni yako" style={styles.label} />
      <TextInput
        value={message}
        onChangeText={setMessage}
        multiline
        textAlignVertical="top"
        placeholder={language === "sw" ? "Andika maoni yako kwa undani..." : "Share your feedback in detail..."}
        placeholderTextColor={theme.colors.textMuted}
        style={styles.textarea}
      />
      <Txt
        en={`${message.trim().length}/5000`}
        sw={`${message.trim().length}/5000`}
        style={styles.counter}
      />

      <TouchableOpacity
        onPress={submit}
        disabled={!canSubmit}
        style={[styles.button, !canSubmit && styles.disabled]}
      >
        {sending ? <ActivityIndicator color={theme.colors.onPrimary} /> : <Txt en="Submit Feedback" sw="Wasilisha Maoni" style={styles.buttonText} />}
      </TouchableOpacity>

      <NoticeModal value={notice} onClose={() => setNotice(null)} styles={styles} />
    </SettingsScreen>
  );
}

function NoticeModal({ value, onClose, styles }) {
  const { theme } = useAppTheme();
  return (
    <Modal visible={!!value} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.notice}>
          {value === "success" ? (
            <View style={styles.successIcon}>
              <AppIcon name="check-circle" size={28} color={theme.colors.success} />
            </View>
          ) : null}
          <Txt
            en={value === "success" ? "Thank you for your feedback!" : value === "login" ? "Please login first" : "Could not send feedback"}
            sw={value === "success" ? "Asante kwa maoni yako!" : value === "login" ? "Tafadhali ingia kwanza" : "Imeshindikana kutuma maoni"}
            style={styles.noticeTitle}
          />
          {value === "success" ? (
            <Txt
              en="We read every submission and use it to improve the app."
              sw="Tunasoma kila maoni na kuyatumia kuboresha app."
              style={styles.noticeBody}
            />
          ) : null}
          <TouchableOpacity style={styles.noticeButton} onPress={onClose}>
            <Txt en="OK" sw="Sawa" style={styles.noticeButtonText} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    intro: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 18 },
    label: { color: theme.colors.text, fontSize: 12, fontWeight: "900", marginTop: 6 },
    select: {
      minHeight: 46,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.colors.surface,
    },
    selectText: { color: theme.colors.text, fontSize: 13, fontWeight: "700" },
    placeholder: { color: theme.colors.textMuted },
    optionList: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, overflow: "hidden" },
    option: {
      minHeight: 42,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    optionText: { color: theme.colors.text, fontSize: 13 },
    textarea: {
      minHeight: 150,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 10,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 13,
    },
    counter: { color: theme.colors.textMuted, fontSize: 10.5, fontWeight: "700", textAlign: "right", marginTop: -4 },
    button: { minHeight: 48, borderRadius: 10, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center", marginTop: 4 },
    disabled: { opacity: 0.45 },
    buttonText: { color: theme.colors.onPrimary, fontSize: 13, fontWeight: "900" },
    overlay: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.overlay },
    notice: { width: "100%", maxWidth: 360, padding: 20, borderRadius: 12, backgroundColor: theme.colors.surface, alignItems: "center" },
    successIcon: { marginBottom: 6 },
    noticeTitle: { textAlign: "center", color: theme.colors.text, fontSize: 15, fontWeight: "900" },
    noticeBody: { textAlign: "center", color: theme.colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 6 },
    noticeButton: { marginTop: 16, minHeight: 42, width: "100%", borderRadius: 9, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
    noticeButtonText: { color: theme.colors.onPrimary, fontWeight: "900" },
  });

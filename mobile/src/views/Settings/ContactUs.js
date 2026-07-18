import React, { useMemo, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import Txt from "../../Txt";
import { useAppTheme } from "../../theme";
import { viewerRequest } from "../../api/api";
import SettingsScreen from "./SettingsScreen";
import { useLanguage } from "../../LanguageContext";

export default function ContactUs({ onBack }) {
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null);

  const send = async () => {
    if (!subject.trim() || !message.trim() || sending) return;
    try {
      setSending(true);
      await viewerRequest("post", "/support/contact-admin", {
        subject: subject.trim(),
        message: message.trim(),
        type: "contact_admin",
      });
      setSubject("");
      setMessage("");
      setNotice("success");
    } catch (err) {
      setNotice(err?.response?.status === 401 ? "login" : "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <SettingsScreen titleEn="Contact us" titleSw="Wasiliana nasi" onBack={onBack}>
      <Txt
        en="Send a private message to the Work Loading support team."
        sw="Tuma ujumbe wa faragha kwa timu ya msaada ya Work Loading."
        style={styles.intro}
      />
      <TextInput
        value={subject}
        onChangeText={setSubject}
        placeholder={language === "sw" ? "Kichwa cha ujumbe" : "Subject"}
        placeholderTextColor={theme.colors.textMuted}
        style={styles.input}
      />
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder={language === "sw" ? "Ujumbe" : "Message"}
        placeholderTextColor={theme.colors.textMuted}
        multiline
        textAlignVertical="top"
        style={[styles.input, styles.message]}
      />
      <TouchableOpacity
        onPress={send}
        disabled={!subject.trim() || !message.trim() || sending}
        style={[styles.button, (!subject.trim() || !message.trim() || sending) && styles.disabled]}
      >
        {sending ? <ActivityIndicator color={theme.colors.onPrimary} /> : <Txt en="Send" sw="Tuma" style={styles.buttonText} />}
      </TouchableOpacity>
      <NoticeModal value={notice} onClose={() => setNotice(null)} styles={styles} />
    </SettingsScreen>
  );
}

function NoticeModal({ value, onClose, styles }) {
  return (
    <Modal visible={!!value} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.notice}>
          <Txt
            en={value === "success" ? "Message sent" : value === "login" ? "Please login first" : "Could not send message"}
            sw={value === "success" ? "Ujumbe umetumwa" : value === "login" ? "Tafadhali ingia kwanza" : "Ujumbe haukutumwa"}
            style={styles.noticeTitle}
          />
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
    input: { minHeight: 44, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, backgroundColor: theme.colors.surface, color: theme.colors.text, paddingHorizontal: 12, fontSize: 13 },
    message: { minHeight: 130, paddingTop: 12 },
    button: { minHeight: 46, borderRadius: 10, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
    disabled: { opacity: 0.45 },
    buttonText: { color: theme.colors.onPrimary, fontSize: 13, fontWeight: "900" },
    overlay: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.overlay },
    notice: { width: "100%", maxWidth: 360, padding: 18, borderRadius: 12, backgroundColor: theme.colors.surface },
    noticeTitle: { textAlign: "center", color: theme.colors.text, fontSize: 15, fontWeight: "900" },
    noticeButton: { marginTop: 16, minHeight: 42, borderRadius: 9, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
    noticeButtonText: { color: theme.colors.onPrimary, fontWeight: "900" },
  });

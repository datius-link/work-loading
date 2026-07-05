import React, { useMemo, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import AppIcon from "../../icons/AppIcon";
import Txt from "../../Txt";
import { useAppTheme } from "../../theme";
import { viewerRequest } from "../../api/api";
import { useLanguage } from "../../LanguageContext";

const FEEDBACK_CATEGORIES = [
  ["UI", "UI"],
  ["Jobs", "Kazi"],
  ["Posts", "Machapisho"],
  ["Notifications", "Notifications"],
  ["Performance", "Utendaji"],
  ["Other", "Nyingine"],
];
const PROBLEM_TYPES = [
  ["Account issue", "Tatizo la akaunti"],
  ["Job issue", "Tatizo la kazi"],
  ["Fake profile", "Profaili bandia"],
  ["Fake job", "Kazi bandia"],
  ["Scam or fraud", "Utapeli"],
  ["Harassment", "Unyanyasaji"],
  ["Bug or technical issue", "Hitilafu au tatizo la kiufundi"],
  ["Other", "Nyingine"],
];

export default function SupportActionSheet({ visible, onClose }) {
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [action, setAction] = useState(null);
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null);

  const reset = () => {
    setAction(null);
    setSelectionOpen(false);
    setCategory("");
    setMessage("");
    setSending(false);
    setNotice(null);
  };

  const close = () => {
    reset();
    onClose?.();
  };

  const options = action === "feedback" ? FEEDBACK_CATEGORIES : PROBLEM_TYPES;
  const selectedSwLabel = options.find(([value]) => value === category)?.[1] || category;
  const submit = async () => {
    if (!category || !message.trim() || sending) return;
    try {
      setSending(true);
      const endpoint = action === "feedback" ? "/support/feedback" : "/support/reports";
      await viewerRequest("post", endpoint, action === "feedback"
        ? { category, message: message.trim(), type: "feedback" }
        : { problem_type: category, description: message.trim(), type: "report_problem" });
      // Close the sheet itself once it's sent instead of leaving the form
      // sitting open behind the success notice — the notice is a separate
      // Modal, so it still shows on top even though the sheet below it closes.
      setNotice("success");
      setAction(null);
      setCategory("");
      setMessage("");
      onClose?.();
    } catch (err) {
      setNotice(err?.response?.status === 401 ? "login" : "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={close} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Txt
              en={action === "feedback" ? "Send Feedback" : action === "report" ? "Tell us what happened" : "Support Actions"}
              sw={action === "feedback" ? "Tuma Maoni" : action === "report" ? "Tuambie kilichotokea" : "Hatua za Msaada"}
              style={styles.title}
            />
            <TouchableOpacity onPress={close} hitSlop={8}>
              <AppIcon name="close" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {!action ? (
            <View style={styles.actions}>
              <ActionRow icon="message" en="Send Feedback" sw="Tuma Maoni" onPress={() => setAction("feedback")} styles={styles} theme={theme} />
              <View style={styles.divider} />
              <ActionRow icon="warning" en="Report Problem" sw="Ripoti Tatizo" onPress={() => setAction("report")} styles={styles} theme={theme} />
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Txt
                en={action === "feedback" ? "Category" : "Problem type"}
                sw={action === "feedback" ? "Aina" : "Aina ya tatizo"}
                style={styles.label}
              />
              <TouchableOpacity style={styles.select} onPress={() => setSelectionOpen(!selectionOpen)}>
                <Txt en={category || "Select one"} sw={selectedSwLabel || "Chagua moja"} style={[styles.selectText, !category && styles.placeholder]} />
                <AppIcon name={selectionOpen ? "minus" : "plus"} size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
              {selectionOpen ? (
                <View style={styles.optionList}>
                  {options.map(([value, swLabel]) => (
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
              <Txt en={action === "feedback" ? "Message" : "Description"} sw={action === "feedback" ? "Ujumbe" : "Maelezo"} style={styles.label} />
              <TextInput
                value={message}
                onChangeText={setMessage}
                multiline
                textAlignVertical="top"
                placeholder={language === "sw"
                  ? action === "feedback" ? "Andika maoni yako" : "Eleza kilichotokea"
                  : action === "feedback" ? "Share your feedback" : "Describe what happened"}
                placeholderTextColor={theme.colors.textMuted}
                style={styles.input}
              />
              {action === "report" ? (
                <TouchableOpacity style={styles.attachment} onPress={() => setNotice("attachment")}>
                  <AppIcon name="upload" size={16} color={theme.colors.textMuted} />
                  <Txt en="Add attachment (coming later)" sw="Ongeza attachment (itakuja baadaye)" style={styles.attachmentText} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                onPress={submit}
                disabled={!category || !message.trim() || sending}
                style={[styles.send, (!category || !message.trim() || sending) && styles.disabled]}
              >
                {sending ? <ActivityIndicator color={theme.colors.onPrimary} /> : <Txt en="Send" sw="Tuma" style={styles.sendText} />}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setAction(null)} style={styles.back}>
                <Txt en="Back to support actions" sw="Rudi kwenye hatua za msaada" style={styles.backText} />
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>

      <Modal visible={!!notice} transparent animationType="fade" onRequestClose={() => setNotice(null)}>
        <View style={styles.noticeOverlay}>
          <View style={styles.notice}>
            <Txt
              en={notice === "success" ? "Sent successfully" : notice === "login" ? "Please login first" : notice === "attachment" ? "Attachments are not enabled yet" : "Could not send"}
              sw={notice === "success" ? "Imetumwa vizuri" : notice === "login" ? "Tafadhali ingia kwanza" : notice === "attachment" ? "Attachments bado hazijawashwa" : "Haikuweza kutumwa"}
              style={styles.noticeTitle}
            />
            <TouchableOpacity style={styles.noticeButton} onPress={() => setNotice(null)}>
              <Txt en="OK" sw="Sawa" style={styles.noticeButtonText} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

function ActionRow({ icon, en, sw, onPress, styles, theme }) {
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress}>
      <View style={styles.iconWrap}><AppIcon name={icon} size={18} color={theme.colors.primary} /></View>
      <Txt en={en} sw={sw} style={styles.actionText} />
      <AppIcon name="chevron-right" size={16} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: theme.colors.overlay },
    dismissArea: { flex: 1 },
    sheet: { maxHeight: "82%", padding: 16, paddingBottom: 28, borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: theme.colors.surface },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, alignSelf: "center", marginBottom: 12 },
    header: { minHeight: 38, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
    title: { color: theme.colors.text, fontSize: 18, fontWeight: "900" },
    actions: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, marginTop: 8 },
    actionRow: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: 10 },
    iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft },
    actionText: { flex: 1, color: theme.colors.text, fontSize: 13, fontWeight: "800" },
    divider: { height: 1, backgroundColor: theme.colors.border },
    label: { color: theme.colors.text, fontSize: 12, fontWeight: "900", marginTop: 12, marginBottom: 5 },
    select: { minHeight: 44, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: theme.colors.surfaceSoft },
    selectText: { color: theme.colors.text, fontSize: 13, fontWeight: "700" },
    placeholder: { color: theme.colors.textMuted },
    optionList: { marginTop: 5, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, overflow: "hidden" },
    option: { minHeight: 40, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
    optionText: { color: theme.colors.text, fontSize: 12 },
    input: { minHeight: 112, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, padding: 12, color: theme.colors.text, backgroundColor: theme.colors.surfaceSoft, fontSize: 13 },
    attachment: { minHeight: 42, marginTop: 8, borderWidth: 1, borderStyle: "dashed", borderColor: theme.colors.border, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
    attachmentText: { color: theme.colors.textMuted, fontSize: 11.5, fontWeight: "700" },
    send: { minHeight: 46, marginTop: 12, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primary },
    disabled: { opacity: 0.45 },
    sendText: { color: theme.colors.onPrimary, fontSize: 13, fontWeight: "900" },
    back: { paddingVertical: 13, alignItems: "center" },
    backText: { color: theme.colors.primary, fontSize: 12, fontWeight: "800" },
    noticeOverlay: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.overlay },
    notice: { width: "100%", maxWidth: 360, padding: 18, borderRadius: 12, backgroundColor: theme.colors.surface },
    noticeTitle: { color: theme.colors.text, textAlign: "center", fontSize: 15, fontWeight: "900" },
    noticeButton: { minHeight: 42, marginTop: 15, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primary },
    noticeButtonText: { color: theme.colors.onPrimary, fontWeight: "900" },
  });

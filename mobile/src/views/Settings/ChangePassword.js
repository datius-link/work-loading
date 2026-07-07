import React, { useMemo, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import Txt from "../../Txt";
import { useAppTheme } from "../../theme";
import { useLanguage } from "../../LanguageContext";
import { getFriendlyApiError, viewerRequest } from "../../api/api";
import SettingsScreen from "./SettingsScreen";

export default function ChangePassword({ onBack }) {
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= 4 &&
    newPassword === confirmPassword &&
    !saving;

  const submit = async () => {
    if (!canSubmit) return;
    try {
      setSaving(true);
      await viewerRequest("post", "/profiles/me/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice({ type: "success" });
    } catch (err) {
      setNotice({ type: "error", message: getFriendlyApiError(err, language) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsScreen titleEn="Change Password" titleSw="Badili Nywila" onBack={onBack}>
      <Txt
        en="Choose a new password for your account. You'll need your current password to confirm this change."
        sw="Chagua nywila mpya ya akaunti yako. Utahitaji nywila yako ya sasa kuthibitisha mabadiliko haya."
        style={styles.intro}
      />

      <Txt en="Current password" sw="Nywila ya sasa" style={styles.label} />
      <TextInput
        value={currentPassword}
        onChangeText={setCurrentPassword}
        placeholder={language === "sw" ? "Weka nywila ya sasa" : "Enter current password"}
        placeholderTextColor={theme.colors.textMuted}
        secureTextEntry
        style={styles.input}
      />

      <Txt en="New password" sw="Nywila mpya" style={styles.label} />
      <TextInput
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder={language === "sw" ? "Angalau herufi 4" : "At least 4 characters"}
        placeholderTextColor={theme.colors.textMuted}
        secureTextEntry
        style={styles.input}
      />

      <Txt en="Confirm new password" sw="Thibitisha nywila mpya" style={styles.label} />
      <TextInput
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder={language === "sw" ? "Rudia nywila mpya" : "Re-enter new password"}
        placeholderTextColor={theme.colors.textMuted}
        secureTextEntry
        style={styles.input}
      />
      {!!confirmPassword && newPassword !== confirmPassword ? (
        <Txt en="Passwords do not match" sw="Nywila hazifanani" style={styles.errorText} />
      ) : null}

      <TouchableOpacity
        onPress={submit}
        disabled={!canSubmit}
        style={[styles.button, !canSubmit && styles.disabled]}
      >
        {saving ? (
          <ActivityIndicator color={theme.colors.onPrimary} />
        ) : (
          <Txt en="Update password" sw="Sasisha nywila" style={styles.buttonText} />
        )}
      </TouchableOpacity>

      <NoticeModal notice={notice} onClose={() => setNotice(null)} onBack={onBack} styles={styles} />
    </SettingsScreen>
  );
}

function NoticeModal({ notice, onClose, onBack, styles }) {
  if (!notice) return null;
  const isSuccess = notice.type === "success";
  const close = () => {
    onClose();
    if (isSuccess) onBack?.();
  };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.notice}>
          <Txt
            en={isSuccess ? "Password updated" : "Could not update password"}
            sw={isSuccess ? "Nywila imesasishwa" : "Imeshindwa kusasisha nywila"}
            style={styles.noticeTitle}
          />
          {!isSuccess && notice.message ? <Txt en={notice.message} sw={notice.message} style={styles.noticeBody} /> : null}
          <TouchableOpacity style={styles.noticeButton} onPress={close}>
            <Txt en="OK" sw="Sawa" style={styles.noticeButtonText} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    intro: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 6 },
    label: { color: theme.colors.text, fontSize: 12, fontWeight: "800", marginTop: 4 },
    input: {
      minHeight: 46,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 10,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
      paddingHorizontal: 12,
      fontSize: 14,
    },
    errorText: { color: theme.colors.danger, fontSize: 12, fontWeight: "700" },
    button: { minHeight: 48, borderRadius: 10, marginTop: 10, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
    disabled: { opacity: 0.45 },
    buttonText: { color: theme.colors.onPrimary, fontSize: 14, fontWeight: "900" },
    overlay: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.overlay },
    notice: { width: "100%", maxWidth: 360, padding: 18, borderRadius: 12, backgroundColor: theme.colors.surface },
    noticeTitle: { textAlign: "center", color: theme.colors.text, fontSize: 15, fontWeight: "900" },
    noticeBody: { textAlign: "center", color: theme.colors.textMuted, fontSize: 12, marginTop: 8, lineHeight: 18 },
    noticeButton: { marginTop: 16, minHeight: 42, borderRadius: 9, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
    noticeButtonText: { color: theme.colors.onPrimary, fontWeight: "900" },
  });

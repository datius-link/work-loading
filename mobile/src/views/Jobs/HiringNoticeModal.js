import React from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../../theme";
import AppIcon from "../../icons/AppIcon";

export default function HiringNoticeModal({
  visible,
  title,
  body,
  type = "info",
  primaryLabel = "OK",
  secondaryLabel,
  loading = false,
  onPrimary,
  onSecondary,
  onClose,
}) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const icon = type === "error" ? "warning" : type === "success" ? "check" : "briefcase";
  const iconColor = type === "error" ? theme.colors.danger : theme.colors.primary;

  const close = () => {
    if (loading) return;
    onClose?.();
  };

  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.overlay} onPress={close}>
        <Pressable style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.iconWrap}>
            <AppIcon name={icon} size={24} color={iconColor} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {body ? <Text style={styles.body}>{body}</Text> : null}
          <View style={styles.actions}>
            {secondaryLabel ? (
              <TouchableOpacity style={styles.secondaryBtn} onPress={onSecondary || close} disabled={loading}>
                <Text style={styles.secondaryText}>{secondaryLabel}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.primaryBtn} onPress={onPrimary || close} disabled={loading}>
              {loading ? <ActivityIndicator color={theme.colors.onPrimary} /> : <Text style={styles.primaryText}>{primaryLabel}</Text>}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.58)",
    },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 22,
    },
    handle: {
      alignSelf: "center",
      width: 42,
      height: 5,
      borderRadius: 999,
      backgroundColor: theme.colors.border,
      marginBottom: 16,
    },
    iconWrap: {
      width: 52,
      height: 52,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primarySoft,
      marginBottom: 12,
    },
    title: { color: theme.colors.text, fontSize: 19, fontWeight: "900", marginBottom: 6 },
    body: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 21, fontWeight: "700", marginBottom: 16 },
    actions: { flexDirection: "row", gap: 10 },
    primaryBtn: {
      flex: 1,
      minHeight: 48,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
    },
    primaryText: { color: theme.colors.onPrimary, fontWeight: "900" },
    secondaryBtn: {
      flex: 1,
      minHeight: 48,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceSoft,
    },
    secondaryText: { color: theme.colors.text, fontWeight: "900" },
  });

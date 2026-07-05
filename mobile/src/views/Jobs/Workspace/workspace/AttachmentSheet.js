/**
 * AttachmentSheet.js — bottom sheet shown when the user taps the chat's
 * attach/media icon. Offers Gallery, Camera, and Record Video, instead of
 * jumping straight into the gallery picker like before.
 */
import React from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AppIcon from "../../../../icons/AppIcon";
import { useAppTheme } from "../../../../theme";

export default function AttachmentSheet({ visible, onClose, onPickGallery, onPickCamera, onPickVideo }) {
  const { theme } = useAppTheme();
  const s = createStyles(theme);

  const OPTIONS = [
    { key: "gallery", icon: "image", label: "Gallery", sub: "Choose photos or videos", onPress: onPickGallery },
    { key: "camera", icon: "camera", label: "Camera", sub: "Take a photo", onPress: onPickCamera },
    { key: "video", icon: "video", label: "Record Video", sub: "Capture a short clip", onPress: onPickVideo },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <View style={s.grabber} />
          {OPTIONS.map((opt) => (
            <TouchableOpacity key={opt.key} style={s.row} onPress={opt.onPress} activeOpacity={0.75}>
              <View style={s.iconWrap}>
                <AppIcon name={opt.icon} size={20} color={theme.colors.primaryStrong} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>{opt.label}</Text>
                <Text style={s.sub}>{opt.sub}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={s.cancelBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={s.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 28,
    },
    grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, alignSelf: "center", marginBottom: 12 },
    row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12 },
    iconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.colors.primarySoft, alignItems: "center", justifyContent: "center" },
    label: { fontSize: 15, fontWeight: "800", color: theme.colors.text },
    sub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
    cancelBtn: { marginTop: 10, minHeight: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surfaceSoft },
    cancelTxt: { fontSize: 14, fontWeight: "800", color: theme.colors.textMuted },
  });

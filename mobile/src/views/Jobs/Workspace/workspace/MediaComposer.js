/**
 * MediaComposer.js — full-screen "review before you send" screen shown after
 * picking/capturing photos or videos in the Job Workspace chat, matching the
 * WhatsApp/Telegram pattern: big preview on top, a thumbnail strip of every
 * selected item at the bottom, a caption field, and a send button.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import AppIcon from "../../../../icons/AppIcon";
import { useAppTheme } from "../../../../theme";

function formatDuration(ms) {
  if (!ms || Number.isNaN(ms)) return null;
  const totalSeconds = Math.round(ms > 1000 ? ms / 1000 : ms);
  const m = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function BigPreview({ item, width, height }) {
  const isVideo = item?.type === "video";
  const player = useVideoPlayer(isVideo ? item.uri : null, (instance) => {
    if (instance) instance.muted = false;
  });
  if (!item) return null;
  if (isVideo) {
    return <VideoView player={player} style={{ width, height }} contentFit="contain" nativeControls />;
  }
  return <Image source={{ uri: item.uri }} style={{ width, height }} resizeMode="contain" />;
}

function Thumb({ item, active, onPress, onRemove, theme, s }) {
  const isVideo = item?.type === "video";
  return (
    <TouchableOpacity style={[s.thumb, active && s.thumbActive]} onPress={onPress} activeOpacity={0.85}>
      <Image source={{ uri: item.uri }} style={s.thumbImage} />
      {isVideo ? (
        <View style={s.thumbPlay}>
          <AppIcon name="play" size={12} color="#fff" />
          {formatDuration(item.duration) ? <Text style={s.thumbDuration}>{formatDuration(item.duration)}</Text> : null}
        </View>
      ) : null}
      <TouchableOpacity style={s.thumbRemove} onPress={onRemove} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <AppIcon name="close" size={10} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function MediaComposer({
  visible,
  items,
  initialCaption = "",
  sending = false,
  onClose,
  onChangeItems,
  onAddMore,
  onSend,
}) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const s = useMemo(() => createStyles(theme), [theme]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [caption, setCaption] = useState(initialCaption);

  useEffect(() => {
    if (visible) setCaption(initialCaption);
  }, [visible, initialCaption]);

  useEffect(() => {
    if (activeIndex >= items.length) setActiveIndex(Math.max(0, items.length - 1));
  }, [items.length, activeIndex]);

  if (!visible || !items.length) return null;
  const active = items[activeIndex];
  const previewHeight = height - insets.top - 190;

  const removeAt = (index) => {
    const next = items.filter((_, i) => i !== index);
    if (!next.length) {
      onClose?.();
      return;
    }
    onChangeItems?.(next);
  };

  const handleSend = () => {
    if (sending) return;
    onSend?.(caption.trim(), items);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={s.root}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <View style={[s.safeArea, { paddingTop: insets.top }]}>
        <View style={s.topBar}>
          <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <AppIcon name="close" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          {items.length > 1 ? <Text style={s.counter}>{activeIndex + 1} / {items.length}</Text> : <View />}
          <View style={s.closeBtn} />
        </View>

        <View style={s.previewArea}>
          <BigPreview item={active} width={width} height={Math.max(220, previewHeight)} />
        </View>
        <View style={[s.bottomPanel, { paddingBottom: insets.bottom + 10 }]}>
            {items.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.thumbRow}>
                {items.map((item, i) => (
                  <Thumb
                    key={item.uri + i}
                    item={item}
                    active={i === activeIndex}
                    onPress={() => setActiveIndex(i)}
                    onRemove={() => removeAt(i)}
                    theme={theme}
                    s={s}
                  />
                ))}
                <TouchableOpacity style={s.addMore} onPress={onAddMore} activeOpacity={0.8}>
                  <AppIcon name="plus" size={18} color="#fff" />
                </TouchableOpacity>
              </ScrollView>
            ) : null}

            <View style={s.captionRow}>
              <TouchableOpacity style={s.addMoreSmall} onPress={onAddMore} activeOpacity={0.8}>
                <AppIcon name="image" size={18} color="#fff" />
              </TouchableOpacity>
              <TextInput
                style={s.captionInput}
                placeholder="Add a caption..."
                placeholderTextColor="rgba(255,255,255,0.55)"
                value={caption}
                onChangeText={setCaption}
                multiline
              />
              <TouchableOpacity style={s.sendBtn} onPress={handleSend} disabled={sending} activeOpacity={0.85}>
                {sending ? <ActivityIndicator color="#fff" size="small" /> : <AppIcon name="send" size={18} color="#fff" />}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: "#000000" },
    safeArea: { flex: 1 },
    topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10 },
    closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
    counter: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
    previewArea: { flex: 1, alignItems: "center", justifyContent: "center" },
    bottomPanel: { backgroundColor: "rgba(20,20,20,0.92)", paddingTop: 10 },
    thumbRow: { paddingHorizontal: 12, gap: 8, alignItems: "center" },
    thumb: { width: 52, height: 52, borderRadius: 10, overflow: "hidden", borderWidth: 2, borderColor: "transparent" },
    thumbActive: { borderColor: theme.colors.primaryStrong },
    thumbImage: { width: "100%", height: "100%" },
    thumbPlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", gap: 2, backgroundColor: "rgba(0,0,0,0.25)" },
    thumbDuration: { color: "#fff", fontSize: 8, fontWeight: "800" },
    thumbRemove: { position: "absolute", top: 2, right: 2, width: 16, height: 16, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center" },
    addMore: { width: 52, height: 52, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
    captionRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingTop: 10 },
    addMoreSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center", marginBottom: 1 },
    captionInput: {
      flex: 1, minHeight: 40, maxHeight: 100, borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.14)", color: "#FFFFFF",
      paddingHorizontal: 16, paddingVertical: 10, fontSize: 15,
    },
    sendBtn: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary,
      alignItems: "center", justifyContent: "center", marginBottom: 1,
    },
  });

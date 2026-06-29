import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppIcon from "../../../../icons/AppIcon";
import { useAppTheme } from "../../../../theme";

function avatarUri(u) {
  if (u?.profile_pic) return u.profile_pic;
  const name = encodeURIComponent(u?.username || u?.full_name || "U");
  return `https://ui-avatars.com/api/?name=${name}&background=0B6B63&color=fff&bold=true&rounded=true`;
}

function toTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function dayLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

function sameDay(a, b) {
  if (!a || !b) return false;
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function mediaUrl(item) {
  return item?.url || item?.uri || item?.thumbnail || item?.poster || null;
}

function statusLabel(item) {
  if (item._pending) return "Sending";
  if (item._failed) return "Failed";
  if (item.read_at) return "Read";
  if (item.delivered_at) return "Delivered";
  return "Sent";
}

function MediaTile({ item, styles, theme, mine }) {
  const uri = mediaUrl(item);
  const isVideo = item?.type === "video";
  const player = useVideoPlayer(isVideo ? uri : null, (instance) => {
    if (instance) instance.muted = true;
  });

  if (!uri) return null;

  if (isVideo) {
    return (
      <View style={styles.mediaTile}>
        <VideoView player={player} style={styles.mediaImage} contentFit="cover" nativeControls />
        <View style={styles.videoBadge}>
          <AppIcon name="play" size={12} color="#fff" />
          <Text style={styles.videoBadgeText}>Video</Text>
        </View>
      </View>
    );
  }

  return <Image source={{ uri }} style={[styles.mediaTile, styles.mediaImage, mine && styles.mediaImageMine]} />;
}

export default function WorkspaceChat({ messages, myUuid, sending, onSend }) {
  const { theme } = useAppTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const flatRef = useRef(null);
  const [msgText, setMsgText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [inputFocused, setInputFocused] = useState(false);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (messages.length) {
      const t = setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [messages]);

  const pickMedia = async () => {
    if (sending || picking) return;
    setPicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: true,
        quality: 0.85,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType?.Medium,
      });
      if (result.canceled) return;
      const selected = (result.assets || []).slice(0, Math.max(0, 8 - attachments.length)).map((asset) => ({
        uri: asset.uri,
        type: asset.type === "video" ? "video" : "image",
        width: asset.width,
        height: asset.height,
        duration: asset.duration,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      }));
      setAttachments((prev) => [...prev, ...selected].slice(0, 8));
    } finally {
      setPicking(false);
    }
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSend = async () => {
    const text = msgText.trim();
    if ((!text && !attachments.length) || sending) return;
    const ok = await onSend({ text, mediaAssets: attachments });
    if (ok !== false) {
      setMsgText("");
      setAttachments([]);
    }
  };

  const canSend = (msgText.trim().length > 0 || attachments.length > 0) && !sending;
  const inputBarPb = insets.bottom > 0 ? insets.bottom : 8;
  const shellStyle = isWide ? s.desktopShell : s.mobileShell;
  const bubbleLimit = isWide ? 620 : "78%";

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 110 : 0}
    >
      <View style={shellStyle}>
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={[s.listContent, isWide && s.listContentWide]}
          showsVerticalScrollIndicator={Platform.OS === "web"}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <View style={s.emptyIcon}>
                <AppIcon name="message" size={28} color={theme.colors.primary} />
              </View>
              <Text style={s.emptyTitle}>Start the conversation</Text>
              <Text style={s.emptySub}>Send updates, photos, and videos for this job workspace.</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const mine = item.sender_uuid === myUuid;
            const prevItem = messages[index - 1];
            const nextItem = messages[index + 1];
            const groupedWithPrev = prevItem && prevItem.sender_uuid === item.sender_uuid && sameDay(prevItem.created_at, item.created_at);
            const groupedWithNext = nextItem && nextItem.sender_uuid === item.sender_uuid && sameDay(nextItem.created_at, item.created_at);
            const media = Array.isArray(item.media) ? item.media : [];
            const showDay = !sameDay(prevItem?.created_at, item.created_at);
            const showAvatar = !mine && !groupedWithNext;

            return (
              <View>
                {showDay ? <Text style={s.dayDivider}>{dayLabel(item.created_at)}</Text> : null}
                <View style={[s.row, mine ? s.rowMine : s.rowTheirs, groupedWithPrev && s.rowGrouped]}>
                  {!mine && (
                    <View style={s.avatarCol}>
                      {showAvatar ? <Image source={{ uri: avatarUri(item.sender || {}) }} style={s.avatar} /> : <View style={s.avatarGap} />}
                    </View>
                  )}

                  <View style={[s.messageStack, { maxWidth: bubbleLimit }, mine ? s.messageStackMine : s.messageStackTheirs]}>
                    {!mine && !groupedWithPrev && item.sender?.username ? <Text style={s.senderName}>@{item.sender.username}</Text> : null}
                    <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleTheirs, groupedWithPrev && (mine ? s.bubbleMineGrouped : s.bubbleTheirsGrouped), groupedWithNext && (mine ? s.bubbleMineContinues : s.bubbleTheirsContinues), media.length && s.bubbleWithMedia]}>
                      {media.length ? (
                        <View style={media.length === 1 ? s.mediaGridSingle : s.mediaGrid}>
                          {media.map((mediaItem, mediaIndex) => (
                            <MediaTile key={String(mediaItem.url || mediaItem.uri || mediaIndex)} item={mediaItem} styles={s} theme={theme} mine={mine} />
                          ))}
                        </View>
                      ) : null}
                      {item.message ? <Text style={[s.bubbleText, mine && s.bubbleTextMine, media.length && s.captionText]}>{item.message}</Text> : null}
                    </View>
                    <View style={[s.metaRow, mine ? s.metaRowMine : s.metaRowTheirs]}>
                      <Text style={[s.timeText, mine && s.timeTextMine]}>{toTime(item.created_at)}</Text>
                      {mine ? (
                        <View style={s.statusWrap}>
                          <Text style={[s.statusText, item._failed && s.statusFailed]}>{statusLabel(item)}</Text>
                          {!item._pending && !item._failed ? <AppIcon name="check" size={11} color={item.read_at ? theme.colors.primary : theme.colors.textMuted} /> : null}
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
        />

        <View style={[s.inputBar, { paddingBottom: inputBarPb }, inputFocused && s.inputBarFocused, isWide && s.inputBarWide]}>
          {attachments.length ? (
            <View style={s.previewStrip}>
              {attachments.map((item, index) => (
                <View key={item.uri} style={s.previewItem}>
                  {item.type === "video" ? (
                    <View style={s.previewVideo}>
                      <AppIcon name="play" size={16} color="#fff" />
                    </View>
                  ) : (
                    <Image source={{ uri: item.uri }} style={s.previewImage} />
                  )}
                  <TouchableOpacity style={s.previewRemove} onPress={() => removeAttachment(index)} activeOpacity={0.85}>
                    <Text style={s.previewRemoveText}>x</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}

          <View style={s.composerRow}>
            <TouchableOpacity style={[s.attachBtn, (sending || picking || attachments.length >= 8) && s.attachBtnOff]} onPress={pickMedia} disabled={sending || picking || attachments.length >= 8} activeOpacity={0.85}>
              {picking ? <ActivityIndicator color={theme.colors.primary} size="small" /> : <AppIcon name="image" size={20} color={theme.colors.primary} />}
            </TouchableOpacity>
            <TextInput
              style={s.input}
              placeholder="Message"
              placeholderTextColor={theme.colors.textMuted}
              value={msgText}
              onChangeText={setMsgText}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              multiline
              maxLength={1000}
              blurOnSubmit={false}
            />
            <TouchableOpacity style={[s.sendBtn, !canSend && s.sendBtnOff]} onPress={handleSend} disabled={!canSend} activeOpacity={0.86}>
              {sending ? <ActivityIndicator color={theme.colors.onPrimary} size="small" /> : <AppIcon name="send" size={18} color={theme.colors.onPrimary} />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.bg },
    mobileShell: { flex: 1 },
    desktopShell: { flex: 1, width: "100%", maxWidth: 1120, alignSelf: "center", borderLeftWidth: 1, borderRightWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.bg },
    listContent: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12, flexGrow: 1 },
    listContentWide: { paddingHorizontal: 24 },
    emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
    emptyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: theme.colors.primarySoft, alignItems: "center", justifyContent: "center" },
    emptyTitle: { fontSize: 16, fontWeight: "800", color: theme.colors.text },
    emptySub: { fontSize: 13, color: theme.colors.textMuted, textAlign: "center", maxWidth: 260, lineHeight: 18 },
    dayDivider: { alignSelf: "center", marginVertical: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: "hidden", backgroundColor: theme.colors.surfaceSoft, color: theme.colors.textMuted, fontSize: 11, fontWeight: "800" },
    row: { flexDirection: "row", alignItems: "flex-end", marginVertical: 2 },
    rowMine: { justifyContent: "flex-end" },
    rowTheirs: { justifyContent: "flex-start" },
    rowGrouped: { marginTop: 1 },
    avatarCol: { width: 34, marginRight: 7, alignItems: "center", justifyContent: "flex-end" },
    avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.surfaceSoft },
    avatarGap: { width: 30, height: 30 },
    messageStack: { gap: 3 },
    messageStackMine: { alignItems: "flex-end", marginLeft: 42 },
    messageStackTheirs: { alignItems: "flex-start", marginRight: 42 },
    senderName: { fontSize: 11, fontWeight: "800", color: theme.colors.primary, marginLeft: 2, marginBottom: 1 },
    bubble: { borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9 },
    bubbleMine: { backgroundColor: theme.colors.primary, borderBottomRightRadius: 5 },
    bubbleTheirs: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderBottomLeftRadius: 5 },
    bubbleMineGrouped: { borderTopRightRadius: 10 },
    bubbleTheirsGrouped: { borderTopLeftRadius: 10 },
    bubbleMineContinues: { borderBottomRightRadius: 10 },
    bubbleTheirsContinues: { borderBottomLeftRadius: 10 },
    bubbleWithMedia: { padding: 5, overflow: "hidden" },
    bubbleText: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
    bubbleTextMine: { color: theme.colors.onPrimary },
    captionText: { paddingHorizontal: 8, paddingTop: 7, paddingBottom: 3 },
    mediaGridSingle: { width: 220, maxWidth: "100%" },
    mediaGrid: { width: 238, maxWidth: "100%", flexDirection: "row", flexWrap: "wrap", gap: 4 },
    mediaTile: { width: "100%", height: 178, borderRadius: 14, overflow: "hidden", backgroundColor: theme.colors.surfaceSoft },
    mediaImage: { width: "100%", height: "100%" },
    mediaImageMine: { backgroundColor: theme.colors.primary },
    videoBadge: { position: "absolute", left: 8, bottom: 8, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.58)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    videoBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 1, paddingHorizontal: 3 },
    metaRowMine: { justifyContent: "flex-end" },
    metaRowTheirs: { justifyContent: "flex-start" },
    timeText: { fontSize: 10, color: theme.colors.textMuted, fontWeight: "600" },
    timeTextMine: { color: theme.colors.textMuted },
    statusWrap: { flexDirection: "row", alignItems: "center", gap: 3 },
    statusText: { fontSize: 10, color: theme.colors.textMuted, fontWeight: "700" },
    statusFailed: { color: theme.colors.danger || "#E11D48" },
    inputBar: { paddingHorizontal: 10, paddingTop: 8, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border },
    inputBarFocused: { borderTopColor: theme.colors.primary },
    inputBarWide: { paddingHorizontal: 24 },
    previewStrip: { flexDirection: "row", gap: 8, paddingBottom: 8, flexWrap: "wrap" },
    previewItem: { width: 54, height: 54, borderRadius: 12, overflow: "hidden", backgroundColor: theme.colors.surfaceSoft },
    previewImage: { width: "100%", height: "100%" },
    previewVideo: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primary },
    previewRemove: { position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(0,0,0,0.62)", alignItems: "center", justifyContent: "center" },
    previewRemoveText: { color: "#fff", fontSize: 12, fontWeight: "900", lineHeight: 14 },
    composerRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
    attachBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: 1 },
    attachBtnOff: { opacity: 0.45 },
    input: { flex: 1, minHeight: 42, maxHeight: 116, borderRadius: 21, backgroundColor: theme.colors.surfaceSoft, paddingHorizontal: 15, paddingVertical: 10, fontSize: 15, color: theme.colors.text, lineHeight: 20 },
    sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 1, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.24, shadowRadius: 6, elevation: 4 },
    sendBtnOff: { backgroundColor: theme.colors.border, shadowOpacity: 0, elevation: 0 },
  });

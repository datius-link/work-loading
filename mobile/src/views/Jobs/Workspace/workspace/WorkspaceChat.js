import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
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
import MediaViewer from "./MediaViewer";
import AttachmentSheet from "./AttachmentSheet";
import MediaComposer from "./MediaComposer";
import CustomCamera from "./CustomCamera";

function avatarUri(u) {
  if (u?.profile_pic) return u.profile_pic;
  const name = encodeURIComponent(u?.username || u?.full_name || "U");
  return `https://ui-avatars.com/api/?name=${name}&background=1683C7&color=fff&bold=true&rounded=true`;
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
  if (item._pending) return "Uploading";
  if (item._failed) return "Failed";
  if (item.read_at) return "Read";
  if (item.delivered_at) return "Delivered";
  return "Sent";
}

function formatDuration(ms) {
  if (!ms || Number.isNaN(ms)) return null;
  const totalSeconds = Math.round(ms > 1000 ? ms / 1000 : ms); // tolerate seconds or ms
  const m = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

const SINGLE_MAX_HEIGHT = 320;
const SINGLE_WIDTH_RATIO = 0.72; // ~70-75% of screen width

// Multi-media grid tile size scales with the screen instead of a fixed
// pixel value, so a 2-column grid looks proportional on both small and
// large phones (e.g. a compact device vs. a tablet-ish screen).
function gridTileSizeFor(screenWidth) {
  return Math.max(90, Math.min(140, Math.round(screenWidth * 0.34)));
}

// Single photo/video messages render at their real aspect ratio (falls back
// to a 4:3 box only if no width/height were ever recorded — e.g. very old
// messages sent before dimensions were captured). Multi-media messages use
// a fixed square grid instead, same as WhatsApp/Telegram.
function MediaTile({ item, styles, theme, mine, isSingle, screenWidth, onPress, onRetryMessage }) {
  const uri = mediaUrl(item);
  const isVideo = item?.type === "video";
  const pending = !!item?._pending;
  const failed = !!item?._failed;
  const [loadState, setLoadState] = useState("loading"); // loading | loaded | error
  const [reloadKey, setReloadKey] = useState(0);
  const player = useVideoPlayer(isVideo ? uri : null, (instance) => {
    if (instance) instance.muted = true;
  });

  useEffect(() => {
    setLoadState("loading");
  }, [uri]);

  if (!uri) return null;

  let tileStyle;
  if (isSingle) {
    const maxW = Math.round(screenWidth * SINGLE_WIDTH_RATIO);
    let w = maxW;
    let h = Math.round(maxW * 0.75);
    if (item.width && item.height) {
      h = Math.round(maxW * (item.height / item.width));
      if (h > SINGLE_MAX_HEIGHT) {
        h = SINGLE_MAX_HEIGHT;
        w = Math.round(SINGLE_MAX_HEIGHT * (item.width / item.height));
      }
    } else if (h > SINGLE_MAX_HEIGHT) {
      h = SINGLE_MAX_HEIGHT;
    }
    tileStyle = { width: w, height: h };
  } else {
    const gridTileSize = gridTileSizeFor(screenWidth);
    tileStyle = { width: gridTileSize, height: gridTileSize };
  }

  const handlePress = () => {
    if (failed) { onRetryMessage?.(); return; }
    if (loadState === "error" && !isVideo) { setLoadState("loading"); setReloadKey((k) => k + 1); return; }
    onPress?.();
  };

  return (
    <TouchableOpacity style={[styles.mediaTileBase, tileStyle]} onPress={handlePress} activeOpacity={0.9}>
      {isVideo ? (
        <VideoView player={player} style={styles.mediaImage} contentFit="cover" nativeControls={false} />
      ) : (
        <Image
          key={reloadKey}
          source={{ uri }}
          style={[styles.mediaImage, mine && styles.mediaImageMine]}
          onLoad={() => setLoadState("loaded")}
          onError={() => setLoadState("error")}
        />
      )}

      {isVideo && !pending && !failed ? (
        <View style={styles.videoBadge}>
          <AppIcon name="play" size={12} color="#fff" />
          <Text style={styles.videoBadgeText}>{formatDuration(item.duration) || "Video"}</Text>
        </View>
      ) : null}

      {/* Loading spinner — only for images actually fetching over the network. */}
      {!isVideo && !pending && !failed && loadState === "loading" ? (
        <View style={styles.mediaOverlay}>
          <ActivityIndicator color="#fff" size="small" />
        </View>
      ) : null}

      {/* Image bytes failed to load (broken/expired URL) — distinct from a failed send. */}
      {!isVideo && !pending && !failed && loadState === "error" ? (
        <View style={[styles.mediaOverlay, styles.mediaOverlayDim]}>
          <AppIcon name="alert-circle" size={18} color="#fff" />
          <Text style={styles.mediaOverlayTxt}>Tap to retry</Text>
        </View>
      ) : null}

      {/* Still uploading to the server. */}
      {pending ? (
        <View style={styles.mediaOverlay}>
          <ActivityIndicator color="#fff" size="small" />
          <Text style={styles.mediaOverlayTxt}>Uploading…</Text>
        </View>
      ) : null}

      {/* Whole message failed to send — tap anywhere on the media to resend. */}
      {failed ? (
        <View style={[styles.mediaOverlay, styles.mediaOverlayDim]}>
          <AppIcon name="alert-circle" size={18} color="#fff" />
          <Text style={styles.mediaOverlayTxt}>Failed — tap to retry</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export default function WorkspaceChat({ messages, myUuid, sending, onSend, onRetry }) {
  const { theme } = useAppTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const flatRef = useRef(null);
  const [msgText, setMsgText] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [keyboardLift, setKeyboardLift] = useState(0);
  const [picking, setPicking] = useState(false);
  const [viewer, setViewer] = useState(null); // { media, index } — full-screen viewer state
  const [showSheet, setShowSheet] = useState(false); // Gallery / Camera / Record Video sheet
  const [draftMedia, setDraftMedia] = useState([]); // items staged in the full-screen composer
  const [cameraMode, setCameraMode] = useState(null); // "photo" | "video" | null (closed)

  // "Stick to bottom" scroll behavior, like WhatsApp/Telegram: only
  // auto-scroll when a new message arrives if the user was already near the
  // bottom (or it's their own message, e.g. one they just sent). This
  // replaces the old onContentSizeChange->scrollToEnd approach, which fired
  // on every layout change (including an image finishing loading and
  // resizing) and would yank the user back down even while they were
  // reading older messages — the main cause of "can't scroll properly".
  const nearBottomRef = useRef(true);
  const messageCountRef = useRef(0);
  const lastMineRef = useRef(false);
  const hasScrolledInitialRef = useRef(false);

  useEffect(() => {
    const prevCount = messageCountRef.current;
    const grew = messages.length > prevCount;
    messageCountRef.current = messages.length;
    const last = messages[messages.length - 1];
    const lastIsMine = last?.sender_uuid === myUuid;
    lastMineRef.current = lastIsMine;

    if (!messages.length) return;

    const shouldScroll = !hasScrolledInitialRef.current || (grew && (nearBottomRef.current || lastIsMine));
    if (shouldScroll) {
      const animated = hasScrolledInitialRef.current;
      hasScrolledInitialRef.current = true;
      const t = setTimeout(() => flatRef.current?.scrollToEnd({ animated }), 60);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [messages, myUuid]);

  const handleScroll = useCallback((e) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    nearBottomRef.current = distanceFromBottom < 120;
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") return undefined;

    // Previously this subtracted insets.bottom from the reported keyboard
    // height, on the assumption that Android's own "resize" window mode
    // already shifted the layout up by that much and only the remainder
    // needed a manual lift. With edgeToEdgeEnabled, that assumption doesn't
    // hold — the window doesn't reliably resize on its own, so subtracting
    // insets.bottom under-lifted the input bar and left it behind the
    // keyboard. Use the full reported keyboard height instead.
    const showSub = Keyboard.addListener("keyboardDidShow", (event) => {
      const nextHeight = event?.endCoordinates?.height || 0;
      setKeyboardLift(nextHeight);
      if (nearBottomRef.current) {
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
      }
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardLift(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  const mapAssets = (assets) =>
    (assets || []).map((asset) => ({
      uri: asset.uri,
      type: asset.type === "video" ? "video" : "image",
      width: asset.width,
      height: asset.height,
      duration: asset.duration,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
    }));

  // Tapping the attach icon opens a Gallery / Camera / Record Video sheet
  // instead of jumping straight into the gallery. Whatever gets picked or
  // captured is staged into the full-screen composer (MediaComposer) for a
  // real preview + caption, rather than showing raw thumbnails inline in
  // the composer bar.
  const openAttachMedia = (count) => {
    setShowSheet(false);
    if (!count) return;
    setDraftMedia((prev) => [...prev, ...count].slice(0, 8));
  };

  const pickFromGallery = async () => {
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
      openAttachMedia(mapAssets(result.assets).slice(0, Math.max(0, 8 - draftMedia.length)));
    } finally {
      setPicking(false);
    }
  };

  // Camera and video recording happen inside e-kazi (CustomCamera), never by
  // handing off to the phone's default camera app.
  const openCamera = () => {
    setShowSheet(false);
    setCameraMode("photo");
  };

  const openVideoCamera = () => {
    setShowSheet(false);
    setCameraMode("video");
  };

  const handleCameraCapture = (asset) => {
    setCameraMode(null);
    openAttachMedia([asset]);
  };

  // "Add more" from inside the composer — same gallery picker, but appends
  // to the existing draft instead of opening a fresh composer.
  const addMoreMedia = async () => {
    if (picking) return;
    setPicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: true,
        quality: 0.85,
      });
      if (result.canceled) return;
      setDraftMedia((prev) => [...prev, ...mapAssets(result.assets)].slice(0, 8));
    } finally {
      setPicking(false);
    }
  };

  const closeComposer = () => setDraftMedia([]);

  const sendMediaMessage = async (caption, items) => {
    const ok = await onSend({ text: caption, mediaAssets: items });
    if (ok !== false) {
      setDraftMedia([]);
      setMsgText("");
    }
  };

  const handleSend = async () => {
    const text = msgText.trim();
    if (!text || sending) return;
    const ok = await onSend({ text, mediaAssets: [] });
    if (ok !== false) {
      setMsgText("");
    }
  };

  const canSend = msgText.trim().length > 0 && !sending;
  // Resting-state bottom padding must always respect the safe-area inset —
  // this used to be hard-coded to 8 on Android regardless of how tall the
  // gesture/nav bar is, which is exactly why the send button and input sat
  // underneath the system nav bar on devices with a tall gesture area.
  // Once the keyboard is up (Android), keyboardLift already carries the full
  // keyboard height (see effect above), so paddingBottom drops to a small
  // fixed gap instead of also adding insets.bottom on top of that — otherwise
  // the bar would float insets.bottom-worth of extra space above the keyboard.
  const inputBarPb = keyboardLift > 0 ? 8 : (insets.bottom > 0 ? insets.bottom : 8);
  const inputBarLift = Platform.OS === "android" ? keyboardLift : 0;
  const shellStyle = isWide ? s.desktopShell : s.mobileShell;
  const bubbleLimit = isWide ? 620 : "78%";

  return (
    <>
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={shellStyle}>
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={[s.listContent, isWide && s.listContentWide]}
          showsVerticalScrollIndicator={Platform.OS === "web"}
          keyboardShouldPersistTaps="handled"
          onScroll={handleScroll}
          scrollEventThrottle={100}
          removeClippedSubviews={Platform.OS !== "web"}
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
                    <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleTheirs, groupedWithPrev && (mine ? s.bubbleMineGrouped : s.bubbleTheirsGrouped), groupedWithNext && (mine ? s.bubbleMineContinues : s.bubbleTheirsContinues), media.length && s.bubbleWithMedia, media.length && (mine ? s.bubbleMineMedia : s.bubbleTheirsMedia), media.length && s.bubbleNoBorder]}>
                      {media.length ? (
                        <View style={media.length === 1 ? s.mediaWrapSingle : [s.mediaGrid, { width: gridTileSizeFor(width) * 2 + 4 }]}>
                          {media.map((mediaItem, mediaIndex) => (
                            <MediaTile
                              key={String(mediaItem.url || mediaItem.uri || mediaIndex)}
                              item={mediaItem}
                              styles={s}
                              theme={theme}
                              mine={mine}
                              isSingle={media.length === 1}
                              screenWidth={width}
                              onPress={() => setViewer({ media, index: mediaIndex })}
                              onRetryMessage={() => onRetry?.(item)}
                            />
                          ))}
                        </View>
                      ) : null}
                      {item.message ? <Text style={[s.bubbleText, mine && s.bubbleTextMine, media.length && s.captionText, media.length && (mine ? s.captionTextMine : s.captionTextTheirs)]}>{item.message}</Text> : null}
                    </View>
                    <View style={[s.metaRow, mine ? s.metaRowMine : s.metaRowTheirs]}>
                      <Text style={[s.timeText, mine && s.timeTextMine]}>{toTime(item.created_at)}</Text>
                      {mine ? (
                        item._failed ? (
                          <TouchableOpacity style={s.statusWrap} onPress={() => onRetry?.(item)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                            <AppIcon name="alert-circle" size={11} color={theme.colors.danger} />
                            <Text style={[s.statusText, s.statusFailed]}>Failed — tap to retry</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={s.statusWrap}>
                            <Text style={s.statusText}>{statusLabel(item)}</Text>
                            {!item._pending ? <AppIcon name="check" size={11} color={item.read_at ? theme.colors.primary : theme.colors.textMuted} /> : null}
                          </View>
                        )
                      ) : null}
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
        />

        <View style={[s.inputBar, { paddingBottom: inputBarPb, marginBottom: inputBarLift }, inputFocused && s.inputBarFocused, isWide && s.inputBarWide]}>
          <View style={s.composerRow}>
            <TouchableOpacity style={[s.attachBtn, (sending || picking) && s.attachBtnOff]} onPress={() => setShowSheet(true)} disabled={sending || picking} activeOpacity={0.85}>
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
    {viewer ? (
      <MediaViewer
        visible
        media={viewer.media}
        initialIndex={viewer.index}
        onClose={() => setViewer(null)}
      />
    ) : null}
    <AttachmentSheet
      visible={showSheet}
      onClose={() => setShowSheet(false)}
      onPickGallery={pickFromGallery}
      onPickCamera={openCamera}
      onPickVideo={openVideoCamera}
    />
    <CustomCamera
      visible={!!cameraMode}
      initialMode={cameraMode || "photo"}
      onClose={() => setCameraMode(null)}
      onCapture={handleCameraCapture}
    />
    {draftMedia.length ? (
      <MediaComposer
        visible
        items={draftMedia}
        initialCaption={msgText}
        sending={sending}
        onClose={closeComposer}
        onChangeItems={setDraftMedia}
        onAddMore={addMoreMedia}
        onSend={sendMediaMessage}
      />
    ) : null}
    </>
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
    bubbleWithMedia: { padding: 0, overflow: "hidden", backgroundColor: "transparent" },
    // WhatsApp/Telegram media bubbles have rounded corners only — no stroke
    // outline. bubbleTheirs normally carries a border for text bubbles;
    // this zeroes it out specifically when the bubble contains media.
    bubbleMineMedia: { backgroundColor: "transparent" },
    bubbleTheirsMedia: { backgroundColor: "transparent" },
    bubbleNoBorder: { borderWidth: 0 },
    bubbleText: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
    bubbleTextMine: { color: theme.colors.onPrimary },
    captionText: { alignSelf: "stretch", marginTop: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14, overflow: "hidden" },
    captionTextMine: { backgroundColor: theme.colors.primary, color: theme.colors.onPrimary },
    captionTextTheirs: { backgroundColor: theme.colors.surface, color: theme.colors.text },
    // Single-media messages: the tile sizes itself from the real image/video
    // aspect ratio (computed in MediaTile), so this wrapper has no fixed
    // width of its own — that fixed-220 box was part of why media used to
    // look like an arbitrary blank rectangle instead of the actual photo.
    mediaWrapSingle: { maxWidth: "100%" },
    // Multi-media messages: a real fixed-size grid (previously each tile
    // was set to width:"100%" inside this wrapper, which made every image
    // take the full row and stack vertically instead of gridding).
    // Width is applied inline per-render (see mediaGrid usage below) since it
    // depends on screen width, not just theme.
    mediaGrid: { maxWidth: "100%", flexDirection: "row", flexWrap: "wrap", gap: 3 },
    mediaTileBase: { borderRadius: 14, overflow: "hidden", backgroundColor: theme.colors.media },
    mediaImage: { width: "100%", height: "100%" },
    mediaImageMine: { backgroundColor: theme.colors.media },
    mediaOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center", justifyContent: "center", gap: 6,
      backgroundColor: "rgba(0,0,0,0.28)",
    },
    mediaOverlayDim: { backgroundColor: "rgba(0,0,0,0.5)" },
    mediaOverlayTxt: { color: "#fff", fontSize: 11.5, fontWeight: "800" },
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
    composerRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
    attachBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: 1 },
    attachBtnOff: { opacity: 0.45 },
    input: { flex: 1, minHeight: 42, maxHeight: 116, borderRadius: 21, backgroundColor: theme.colors.surfaceSoft, paddingHorizontal: 15, paddingVertical: 10, fontSize: 15, color: theme.colors.text, lineHeight: 20 },
    sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 1, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.24, shadowRadius: 6, elevation: 4 },
    sendBtnOff: { backgroundColor: theme.colors.border, shadowOpacity: 0, elevation: 0 },
  });

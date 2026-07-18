// EditMedia.js — media preview/adjustment screen.
//
// Every selected image gets its own persisted transform: { fit, scale,
// offsetXRatio, offsetYRatio }. offsetX/Y are stored as a *ratio* of the
// preview frame size (not raw pixels) so the same framing can be
// reapplied consistently wherever the image is rendered later (e.g. the
// feed), without ever touching/cropping the original file — see
// PostCard.js's `mediaTransformStyle` for where this gets replayed.
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEventListener } from "expo";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Icon from "../../../icons/MaterialIcon";
import { useAppTheme } from "../../../theme";

const { width } = Dimensions.get("window");
const PREVIEW_SIZE = width;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.2;

function itemKey(item, index) {
  return item?.id || item?.uri || String(index);
}

function defaultTransform(fit = "cover") {
  return { fit, scale: 1, offsetXRatio: 0, offsetYRatio: 0 };
}

// Pinch-to-zoom + pan-to-reposition + double-tap-to-zoom, the same gesture
// pattern used by the job workspace's MediaViewer — but here the position
// PERSISTS per item (this is a crop editor, not a look-then-snap-back
// viewer), and it commits normalized offsets via onCommit so the parent can
// restore this exact framing if the user switches away and back.
function ZoomableFrame({ uri, size, fit, initialTransform, onCommit }) {
  const scale = useSharedValue(initialTransform.scale);
  const savedScale = useSharedValue(initialTransform.scale);
  const translateX = useSharedValue(initialTransform.offsetXRatio * size);
  const translateY = useSharedValue(initialTransform.offsetYRatio * size);
  const savedTranslateX = useSharedValue(initialTransform.offsetXRatio * size);
  const savedTranslateY = useSharedValue(initialTransform.offsetYRatio * size);

  const commit = (s, tx, ty) => {
    onCommit({ scale: s, offsetXRatio: tx / size, offsetYRatio: ty / size });
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      const next = savedScale.value * e.scale;
      scale.value = next < 1 ? 1 : next > MAX_SCALE ? MAX_SCALE : next;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      runOnJS(commit)(scale.value, translateX.value, translateY.value);
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      runOnJS(commit)(scale.value, translateX.value, translateY.value);
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const isZoomedNow = scale.value > 1.02;
      const nextScale = isZoomedNow ? 1 : DOUBLE_TAP_SCALE;
      scale.value = withTiming(nextScale);
      savedScale.value = nextScale;
      if (isZoomedNow) {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
      runOnJS(commit)(nextScale, isZoomedNow ? 0 : translateX.value, isZoomedNow ? 0 : translateY.value);
    });

  const composedGesture = Gesture.Exclusive(doubleTapGesture, Gesture.Simultaneous(pinchGesture, panGesture));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.Image
        source={{ uri }}
        resizeMode={fit}
        style={[{ width: size, height: size }, animatedStyle]}
        accessibilityLabel="Photo preview — pinch to zoom, drag to reposition"
      />
    </GestureDetector>
  );
}

function Thumbnail({ item, active, onPress, theme, styles }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.thumb, active && styles.thumbActive]}
      activeOpacity={0.7}
      accessibilityLabel={`Select media ${item.type === "video" ? "video" : "photo"}`}
    >
      <Image
        source={{ uri: item.uri }}
        style={styles.thumbImg}
        resizeMode="cover"
        onLoad={() => setLoaded(true)}
      />
      {!loaded && (
        <View style={styles.thumbLoading}>
          <ActivityIndicator size="small" color={theme.colors.primaryStrong || theme.colors.primary} />
        </View>
      )}
      {item.type === "video" && (
        <Icon
          name="play-circle-filled"
          size={24}
          color="rgba(255,255,255,0.9)"
          style={styles.videoIcon}
        />
      )}
    </TouchableOpacity>
  );
}

function EditMediaContent({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const { mediaList = [], postType = "moment" } = route.params || {};

  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [transformById, setTransformById] = useState({});
  const [resetTokenById, setResetTokenById] = useState({});

  const hasMedia = mediaList.length > 0;
  const current = mediaList[index] || {};
  const isVideo = hasMedia && current.type === "video";
  const totalMedia = mediaList.length;
  const currentKey = itemKey(current, index);
  const currentTransform = transformById[currentKey] || defaultTransform(current.fit || "cover");
  const currentResetToken = resetTokenById[currentKey] || 0;

  const player = useVideoPlayer(null, (p) => {
    p.loop = true;
    p.muted = muted;
  });

  useEffect(() => {
    if (player) player.muted = muted;
  }, [muted, player]);

  const togglePlayPause = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (isVideo) {
      player.replaceAsync(current.uri).then(() => {
        if (isPlaying) player.play();
      });
    } else {
      player.pause();
      player.replaceAsync(null);
    }
    setIsPlaying(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current.uri, isVideo, player]);

  useEventListener(player, "statusChange", ({ status }) => {
    if (status === "readyToPlay" && isVideo && isPlaying) {
      player.play();
    }
  });

  const setFit = (nextFit) => {
    setTransformById((prev) => ({
      ...prev,
      [currentKey]: { ...(prev[currentKey] || defaultTransform(currentTransform.fit)), fit: nextFit },
    }));
  };

  const resetTransform = () => {
    setTransformById((prev) => ({ ...prev, [currentKey]: defaultTransform(currentTransform.fit) }));
    setResetTokenById((prev) => ({ ...prev, [currentKey]: (prev[currentKey] || 0) + 1 }));
  };

  const commitTransform = (partial) => {
    setTransformById((prev) => ({
      ...prev,
      [currentKey]: { ...(prev[currentKey] || defaultTransform(currentTransform.fit)), ...partial },
    }));
  };

  const goNext = () => {
    const mediaWithTransform = mediaList.map((item, itemIndex) => {
      const key = itemKey(item, itemIndex);
      const t = transformById[key] || defaultTransform(item.fit || "cover");
      return {
        ...item,
        fit: t.fit,
        transform: { scale: t.scale, offsetXRatio: t.offsetXRatio, offsetYRatio: t.offsetYRatio },
      };
    });
    navigation.navigate("PostDetails", {
      mediaList: mediaWithTransform,
      postType,
      muted,
    });
  };

  if (!hasMedia) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.emptyText}>No media selected</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Go back">
          <Icon name="chevron-left" size={30} color={theme.colors.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Preview</Text>

        <TouchableOpacity onPress={goNext} accessibilityLabel="Continue to caption">
          <Text style={styles.next}>Next</Text>
        </TouchableOpacity>
      </View>

      {/* MAIN PREVIEW */}
      <View style={styles.previewContainer}>
        <View style={styles.preview}>
          {isVideo ? (
            <View style={StyleSheet.absoluteFill}>
              <VideoView
                style={styles.media}
                player={player}
                contentFit={currentTransform.fit}
                nativeControls={false}
              />
              <TouchableOpacity
                style={styles.playPauseOverlay}
                onPress={togglePlayPause}
                accessibilityLabel={isPlaying ? "Pause video" : "Play video"}
              >
                <Icon
                  name={isPlaying ? "pause-circle-filled" : "play-circle-filled"}
                  size={60}
                  color="rgba(255,255,255,0.85)"
                />
              </TouchableOpacity>
            </View>
          ) : (
            <ZoomableFrame
              key={`${currentKey}-${currentResetToken}`}
              uri={current.uri}
              size={PREVIEW_SIZE}
              fit={currentTransform.fit}
              initialTransform={currentTransform}
              onCommit={commitTransform}
            />
          )}
        </View>

        {/* Compact [Fit] [Fill] [Reset] control */}
        <View style={styles.controlRow}>
          <View style={styles.segmented}>
            <TouchableOpacity
              onPress={() => setFit("contain")}
              style={[styles.segment, currentTransform.fit === "contain" && styles.segmentActive]}
              accessibilityLabel="Fit — show the full image"
            >
              <Text style={[styles.segmentText, currentTransform.fit === "contain" && styles.segmentTextActive]}>Fit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFit("cover")}
              style={[styles.segment, currentTransform.fit === "cover" && styles.segmentActive]}
              accessibilityLabel="Fill — fill the frame, drag and pinch to reposition"
            >
              <Text style={[styles.segmentText, currentTransform.fit === "cover" && styles.segmentTextActive]}>Fill</Text>
            </TouchableOpacity>
          </View>

          {!isVideo && (
            <TouchableOpacity style={styles.resetBtn} onPress={resetTransform} accessibilityLabel="Reset zoom and position">
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          )}

          {isVideo && (
            <TouchableOpacity
              style={styles.soundBtn}
              onPress={() => setMuted(!muted)}
              accessibilityLabel={muted ? "Unmute video" : "Mute video"}
            >
              <Icon name={muted ? "volume-off" : "volume-up"} size={18} color={theme.colors.text} />
              <Text style={styles.resetText}>{muted ? "Muted" : "Sound"}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* THUMBNAILS + COUNTER */}
      {totalMedia > 1 && (
        <View style={styles.bottomSection}>
          <Text style={styles.counter}>
            {index + 1} / {totalMedia}
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbsContent}
            style={styles.thumbsScroll}
          >
            {mediaList.map((item, i) => (
              <Thumbnail
                key={itemKey(item, i)}
                item={item}
                active={i === index}
                onPress={() => setIndex(i)}
                theme={theme}
                styles={styles}
              />
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export default function EditMedia(props) {
  return <EditMediaContent {...props} />;
}

const createStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  emptyText: { color: theme.colors.text, textAlign: "center", marginTop: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: "700" },
  next: { color: theme.colors.primary, fontWeight: "700", fontSize: 16 },
  previewContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  preview: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    backgroundColor: theme.colors.media,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  media: { width: "100%", height: "100%" },
  playPauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },

  // Compact control row — replaces the old oversized vertical icon buttons
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  segment: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 17,
  },
  segmentActive: {
    backgroundColor: theme.colors.primary,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  segmentTextActive: {
    color: theme.colors.onPrimary,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
  },
  soundBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
  },
  resetText: { color: theme.colors.text, fontSize: 13, fontWeight: "700" },

  // Bottom section with counter + thumbnails
  bottomSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 8,
  },
  counter: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
    opacity: 0.9,
  },
  thumbsScroll: {
    maxHeight: 90,
  },
  thumbsContent: {
    alignItems: "center",
  },
  thumb: {
    width: 76,
    height: 76,
    marginHorizontal: 6,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  thumbActive: {
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  thumbImg: {
    width: "100%",
    height: "100%",
  },
  thumbLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  videoIcon: { position: "absolute" },
});

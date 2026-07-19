import React, { useEffect, useState } from "react";
import { View, Image, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import AppIcon from "../../icons/AppIcon";
import { useAppTheme } from "../../theme";
import { getGridMediaUri } from "./commentUtils";

function PlayIcon({ size = 22 }) {
  return <AppIcon name="play" size={size} color="#fff" filled />;
}

export default function PostGridItem({ post, size, onPress }) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const firstMedia = post?.media?.[0];
  const isVideo = firstMedia?.type === "video";
  const hasMultipleMedia = (post?.media?.length || 0) > 1;
  const imageUri = getGridMediaUri(firstMedia);
  const videoUri = isVideo ? firstMedia?.url : null;
  const imageCoverUri = isVideo ? firstMedia?.thumbnail || firstMedia?.poster || null : imageUri;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.container, size ? styles.sized : null, size ? { width: size, height: size } : null]}
      onPress={onPress}
    >
      {imageCoverUri ? (
        <Image source={{ uri: imageCoverUri }} style={styles.image} resizeMode="cover" pointerEvents="none" />
      ) : isVideo && videoUri ? (
        <VideoCover uri={videoUri} styles={styles} />
      ) : (
        <View style={styles.placeholder}>
          {isVideo ? (
            <View style={styles.playCircle}>
              <PlayIcon />
            </View>
          ) : (
            <Text style={styles.placeholderText}>No media</Text>
          )}
        </View>
      )}

      {isVideo && (imageCoverUri || videoUri) && (
        <View style={styles.videoOverlay} pointerEvents="none">
          <View style={styles.playCircleSmall}>
            <PlayIcon size={16} />
          </View>
        </View>
      )}

      {hasMultipleMedia && (
        <View style={styles.countBadge} pointerEvents="none">
          <Text style={styles.countText}>{post.media.length}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function VideoCover({ uri, styles }) {
  const [ready, setReady] = useState(false);
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
    instance.muted = true;
  });

  useEffect(() => {
    try {
      player.pause();
    } catch (error) {
      console.log("video cover pause error:", error?.message);
    }
  }, [player]);

  // pointerEvents must live on the wrapper View: the native VideoView eats
  // taps itself (its own pointerEvents prop isn't forwarded on Android), which
  // made video tiles impossible to open from profile grids.
  return (
    <View style={styles.videoCover} pointerEvents="none">
      <VideoView
        player={player}
        style={styles.image}
        contentFit="cover"
        nativeControls={false}
        pointerEvents="none"
        fullscreenOptions={{ enable: false }}
        onFirstFrameRender={() => setReady(true)}
      />
      {!ready ? <View style={styles.placeholder} pointerEvents="none" /> : null}
    </View>
  );
}


const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      aspectRatio: 1,
      backgroundColor: theme.colors.surfaceSoft,
      overflow: "hidden",
      position: "relative",
    },
    sized: {
      flex: undefined,
      aspectRatio: undefined,
    },
    image: { width: "100%", height: "100%", backgroundColor: theme.colors.surfaceSoft },
    videoCover: { width: "100%", height: "100%", backgroundColor: theme.colors.surfaceSoft },
    placeholder: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.surfaceSoft,
    },
    placeholderText: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: "600",
    },
    playCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      alignItems: "center",
      paddingLeft: 3,
    },
    playCircleSmall: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      alignItems: "center",
      paddingLeft: 2,
    },
    videoOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
    },
    countBadge: {
      position: "absolute",
      top: 8,
      right: 8,
      backgroundColor: "rgba(0,0,0,0.65)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    countText: { color: theme.colors.onPrimary, fontSize: 12, fontWeight: "700" },
  });


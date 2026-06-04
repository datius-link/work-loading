import React from "react";
import { View, Image, Text, TouchableOpacity, StyleSheet } from "react-native";
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
  const showVideoPlaceholder = isVideo && !firstMedia?.thumbnail && !firstMedia?.poster;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.container, size ? styles.sized : null, size ? { width: size, height: size } : null]}
      onPress={onPress}
    >
      {imageUri && !showVideoPlaceholder ? (
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
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

      {isVideo && imageUri && !showVideoPlaceholder && (
        <View style={styles.videoOverlay}>
          <View style={styles.playCircleSmall}>
            <PlayIcon size={16} />
          </View>
        </View>
      )}

      {hasMultipleMedia && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{post.media.length}</Text>
        </View>
      )}
    </TouchableOpacity>
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


// EditMedia.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEventListener } from "expo";
import Icon from "../../../icons/MaterialIcon";
import { useAppTheme } from "../../../theme";

const { width } = Dimensions.get("window");
const PREVIEW_SIZE = width;

function EditMediaContent({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const { mediaList = [], postType = "moment" } = route.params || {};

  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [fitById, setFitById] = useState({});

  if (!mediaList.length) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.emptyText}>No media selected</Text>
      </View>
    );
  }

  const current = mediaList[index];
  const isVideo = current.type === "video";
  const totalMedia = mediaList.length;
  const currentKey = current.id || current.uri || String(index);
  const currentFit = fitById[currentKey] || current.fit || "cover";
  const mediaWithFit = mediaList.map((item, itemIndex) => {
    const key = item.id || item.uri || String(itemIndex);
    return {
      ...item,
      fit: fitById[key] || item.fit || "cover",
    };
  });

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
  }, [index, current.uri, isVideo, player]);

  useEventListener(player, "statusChange", ({ status }) => {
    if (status === "readyToPlay" && isVideo && isPlaying) {
      player.play();
    }
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={30} color={theme.colors.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Preview</Text>

        <TouchableOpacity
          onPress={() =>
            navigation.navigate("PostDetails", {
              mediaList: mediaWithFit,
              postType,
              muted,
            })
          }
        >
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
                contentFit={currentFit}
                nativeControls={false}
              />
              <TouchableOpacity
                style={styles.playPauseOverlay}
                onPress={togglePlayPause}
              >
                <Icon
                  name={isPlaying ? "pause-circle-filled" : "play-circle-filled"}
                  size={60}
                  color="rgba(255,255,255,0.85)"
                />
              </TouchableOpacity>
            </View>
          ) : (
            <Image source={{ uri: current.uri }} style={styles.media} resizeMode={currentFit} />
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() =>
              setFitById((prev) => ({
                ...prev,
                [currentKey]: currentFit === "cover" ? "contain" : "cover",
              }))
            }
            style={styles.actionButton}
          >
            <Icon
              name={currentFit === "cover" ? "collections" : "photo-library"}
              size={26}
              color={theme.colors.onPrimary}
            />
            <Text style={styles.actionText}>
              {currentFit === "cover" ? "Fill" : "Fit"}
            </Text>
          </TouchableOpacity>

          {isVideo && (
            <TouchableOpacity onPress={() => setMuted(!muted)}>
              <Icon
                name={muted ? "volume-off" : "volume-up"}
                size={28}
                color={theme.colors.onPrimary}
              />
              <Text style={styles.actionText}>
                {muted ? "Muted" : "Sound"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* THUMBNAILS + COUNTER */}
      {totalMedia > 1 && (
        <View style={styles.bottomSection}>
          {/* Counter */}
          <Text style={styles.counter}>
            {index + 1} / {totalMedia}
          </Text>

          {/* Thumbnails */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbsContent}
            style={styles.thumbsScroll}
          >
            {mediaList.map((item, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setIndex(i)}
                style={[
                  styles.thumb,
                  i === index && styles.thumbActive,
                ]}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: item.uri }}
                  style={styles.thumbImg}
                  resizeMode="cover"
                />
                {item.type === "video" && (
                  <Icon
                    name="play-circle-filled"
                    size={24}
                    color="rgba(255,255,255,0.9)"
                    style={styles.videoIcon}
                  />
                )}
              </TouchableOpacity>
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
  },
  media: { width: "100%", height: "100%" },
  playPauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    paddingVertical: 24,
  },
  actionButton: { alignItems: "center" },
  actionText: { color: theme.colors.text, fontSize: 13, marginTop: 6, fontWeight: "700" },

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
  videoIcon: { position: "absolute" },
});

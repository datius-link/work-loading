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
import Icon from "react-native-vector-icons/MaterialIcons";

const { width } = Dimensions.get("window");
const PREVIEW_SIZE = width;

function EditMediaContent({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { mediaList = [], postType = "moment" } = route.params || {};

  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

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
          <Icon name="chevron-left" size={30} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.title}>Preview</Text>

        <TouchableOpacity
          onPress={() =>
            navigation.navigate("PostDetails", {
              mediaList,
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
                contentFit="contain"
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
            <Image source={{ uri: current.uri }} style={styles.media} />
          )}
        </View>

        {/* Mute Button - Only for video */}
        {isVideo && (
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => setMuted(!muted)}>
              <Icon
                name={muted ? "volume-off" : "volume-up"}
                size={28}
                color="#fff"
              />
              <Text style={styles.actionText}>
                {muted ? "Muted" : "Sound"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#343e3eff" },
  emptyText: { color: "#fff", textAlign: "center", marginTop: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "700" },
  next: { color: "#0095f6", fontWeight: "700", fontSize: 16 },
  previewContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  preview: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    backgroundColor: "#000",
    borderRadius: 12,
    overflow: "hidden",
  },
  media: { width: "100%", height: "100%" },
  playPauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  actions: { alignItems: "center", paddingVertical: 24 },
  actionText: { color: "#fff", fontSize: 13, marginTop: 6 },

  // Bottom section with counter + thumbnails
  bottomSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 8,
  },
  counter: {
    color: "#fff",
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
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
  },
  thumbActive: {
    borderWidth: 3,
    borderColor: "#0095f6",
  },
  thumbImg: {
    width: "100%",
    height: "100%",
  },
  videoIcon: { position: "absolute" },
});
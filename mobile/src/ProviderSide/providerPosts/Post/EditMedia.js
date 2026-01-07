import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  Image,
  ScrollView,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEventListener } from "expo"; // For listening to events
import Icon from "react-native-vector-icons/MaterialIcons";

const { width } = Dimensions.get("window");
const PREVIEW_SIZE = width;

export default function EditMedia({ route, navigation }) {
  const { mediaList = [], postType = "moment" } = route.params || {};

  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(false);

  if (!Array.isArray(mediaList) || mediaList.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ color: "#fff", textAlign: "center", marginTop: 40 }}>
          No media selected
        </Text>
      </SafeAreaView>
    );
  }

  const current = mediaList[index];

  // Create player – start with null source for images, set when video
  const player = useVideoPlayer(null, (player) => {
    player.loop = true;
    player.muted = muted;
  });

  // Update muted
  useEffect(() => {
    if (player) player.muted = muted;
  }, [muted, player]);

  // Listen to status change – play when ready
  useEventListener(player, "statusChange", ({ status }) => {
    if (status === "readyToPlay" && current.type === "video") {
      player.play();
    }
  });

  // When current media changes
  useEffect(() => {
    if (current.type === "video") {
      player.replace(current.uri);
      // replay() to reset + play when ready (handled by listener above)
      player.replay();
    }
  }, [index, current.uri, player]);

  // Initial setup for first video
  useEffect(() => {
    if (current.type === "video") {
      player.replace(current.uri);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={30} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.title}>Preview</Text>

        <TouchableOpacity
          onPress={() =>
            navigation.navigate("PostDetails", {
              media: mediaList,
              postType,
              muted,
            })
          }
        >
          <Text style={styles.next}>Next</Text>
        </TouchableOpacity>
      </View>

      {/* PREVIEW */}
      <View style={styles.preview}>
        {current.type === "image" ? (
          <Image
            source={{ uri: current.uri }}
            style={styles.media}
            resizeMode="contain"
          />
        ) : (
          <VideoView
            style={styles.media}
            player={player}
            contentFit="contain"
            nativeControls={false}
            fullscreenOptions={{ enabled: false }}
            surfaceType="textureView"  // Fix for Android rendering issues
          />
        )}

        {/* COUNTER */}
        {mediaList.length > 1 && (
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {index + 1}/{mediaList.length}
            </Text>
          </View>
        )}
      </View>

      {/* ACTIONS */}
      <View style={styles.actions}>
        {current.type === "video" && (
          <TouchableOpacity onPress={() => setMuted(!muted)}>
            <Icon
              name={muted ? "volume-off" : "volume-up"}
              size={26}
              color="#fff"
            />
            <Text style={styles.actionText}>
              {muted ? "Muted" : "Sound"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* THUMBNAILS */}
      {mediaList.length > 1 && (
        <ScrollView horizontal style={styles.thumbs}>
          {mediaList.map((item, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setIndex(i)}
              style={[
                styles.thumb,
                i === index && styles.thumbActive,
              ]}
            >
              <Image source={{ uri: item.uri }} style={styles.thumbImg} />
              {item.type === "video" && (
                <Icon
                  name="play-circle-filled"
                  size={22}
                  color="#fff"
                  style={styles.playIcon}
                />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ... (styles same as before, no change)
  container: { flex: 1, backgroundColor: "#000" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },

  title: { color: "#fff", fontSize: 16, fontWeight: "700" },
  next: { color: "#0095f6", fontWeight: "700" },

  preview: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  media: {
    width: "100%",
    height: "100%",
  },

  counter: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  counterText: { color: "#fff", fontSize: 12 },

  actions: {
    alignItems: "center",
    paddingVertical: 20,
  },

  actionText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },

  thumbs: {
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderColor: "#222",
  },

  thumb: {
    width: 70,
    height: 70,
    marginRight: 8,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },

  thumbActive: {
    borderColor: "#0095f6",
  },

  thumbImg: {
    width: "100%",
    height: "100%",
  },

  playIcon: {
    position: "absolute",
    alignSelf: "center",
    top: "35%",
    opacity: 0.9,
  },
});
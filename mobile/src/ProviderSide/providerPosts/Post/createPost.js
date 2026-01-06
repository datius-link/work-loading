import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  SafeAreaView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

const MAX_MOMENT_MEDIA = 10;
const MAX_CLIP_DURATION = 60; // seconds

export default function CreatePost({ navigation }) {
  const [type, setType] = useState("moment"); // moment | clip
  const [media, setMedia] = useState([]);

  /* ---------------- PICK MEDIA ---------------- */
  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        type === "clip"
          ? ImagePicker.MediaType.Video
          : [ImagePicker.MediaType.Image, ImagePicker.MediaType.Video],
      allowsMultipleSelection: type === "moment",
      quality: 1,
    });

    if (result.canceled) return;

    const assets = result.assets || [];

    // ---- CLIP RULES ----
    if (type === "clip") {
      const video = assets[0];
      if (!video) return;

      if (video.duration && video.duration / 1000 > MAX_CLIP_DURATION) {
        Alert.alert("Clip too long", "Max clip length is 60 seconds");
        return;
      }

      setMedia([video]);
      return;
    }

    // ---- MOMENT RULES ----
    if (media.length + assets.length > MAX_MOMENT_MEDIA) {
      Alert.alert(
        "Too many media",
        `You can add up to ${MAX_MOMENT_MEDIA} items`
      );
      return;
    }

    setMedia((prev) => [...prev, ...assets]);
  };

  /* ---------------- NEXT ---------------- */
  const goNext = () => {
    if (media.length === 0) {
      Alert.alert("No media", "Pick something first");
      return;
    }

    navigation.navigate("EditMedia", {
      type,
      media,
    });
  };

  /* ---------------- UI ---------------- */
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create</Text>
          <Text style={styles.headerSub}>
            {type === "clip"
              ? "Share a short clip"
              : "Share moments with your people"}
          </Text>
        </View>

        {/* TYPE SWITCH */}
        <View style={styles.toggleRow}>
          <ToggleBtn
            label="Moment"
            active={type === "moment"}
            onPress={() => {
              setType("moment");
              setMedia([]);
            }}
          />
          <ToggleBtn
            label="Clip"
            active={type === "clip"}
            onPress={() => {
              setType("clip");
              setMedia([]);
            }}
          />
        </View>

        {/* PICK MEDIA CARD */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.pickCard,
            type === "clip" && styles.pickCardClip,
          ]}
          onPress={pickMedia}
        >
          <Text style={styles.pickIcon}>
            {type === "clip" ? "🎬" : "🖼️"}
          </Text>

          <Text style={styles.pickTitle}>
            {type === "clip" ? "Pick a Clip" : "Pick Media"}
          </Text>

          <Text style={styles.pickSubtitle}>
            {type === "clip"
              ? "Max 60 seconds • 1 video"
              : `Up to ${MAX_MOMENT_MEDIA} photos or videos`}
          </Text>
        </TouchableOpacity>

        {/* PREVIEW */}
        {media.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Nothing here yet 👀{"\n"}Start by picking media
            </Text>
          </View>
        ) : (
          <FlatList
            data={media}
            keyExtractor={(_, i) => i.toString()}
            numColumns={3}
            contentContainerStyle={{ marginTop: 20 }}
            renderItem={({ item }) => (
              <Image source={{ uri: item.uri }} style={styles.thumb} />
            )}
          />
        )}

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.counter}>
            {media.length} / {type === "moment" ? MAX_MOMENT_MEDIA : 1}
          </Text>

          <TouchableOpacity
            style={[
              styles.nextBtn,
              media.length === 0 && { opacity: 0.4 },
            ]}
            disabled={media.length === 0}
            onPress={goNext}
          >
            <Text style={styles.nextText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

/* ---------------- TOGGLE BUTTON ---------------- */
function ToggleBtn({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.toggleBtn, active && styles.toggleActive]}
      onPress={onPress}
    >
      <Text style={[styles.toggleText, active && { color: "#fff" }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },

  screen: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },

  header: {
    marginBottom: 20,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0F172A",
  },

  headerSub: {
    marginTop: 4,
    fontSize: 14,
    color: "#64748B",
  },

  toggleRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 20,
  },

  toggleBtn: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },

  toggleActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },

  toggleText: {
    fontWeight: "700",
    color: "#0F172A",
  },

  pickCard: {
    paddingVertical: 30,
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: "#0F172A",
  },

  pickCardClip: {
    backgroundColor: "#064E3B",
  },

  pickIcon: {
    fontSize: 36,
    marginBottom: 10,
  },

  pickTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
  },

  pickSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
  },

  emptyState: {
    marginTop: 30,
    alignItems: "center",
  },

  emptyText: {
    textAlign: "center",
    color: "#94A3B8",
    fontWeight: "600",
  },

  thumb: {
    width: "30%",
    aspectRatio: 1,
    margin: "1.5%",
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
  },

  footer: {
    marginTop: "auto",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },

  counter: {
    fontWeight: "700",
    color: "#64748B",
  },

  nextBtn: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 26,
  },

  nextText: {
    color: "#fff",
    fontWeight: "800",
  },
});

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, STORAGE_BUCKET } from "../../../lib/supabase";
import { API } from "../../../api/api";

export default function PostDetails({ route, navigation }) {
  const { type, media } = route.params;

  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [uploading, setUploading] = useState(false);

  /* =============== SHARE =============== */
  const handleShare = async () => {
    if (uploading) return;

    try {
      setUploading(true);

      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const res = await API.get("/service-provider/me");
      const providerId = res.data?.provider?.id;
      if (!providerId) throw new Error("Missing provider id");

      const folder = Date.now().toString();
      const uploadedMedia = [];

      for (let i = 0; i < media.length; i++) {
        const item = media[i];
        const ext = item.uri.split(".").pop();
        const fileName = `media_${i}.${ext}`;

        const path = `users/${providerId}/posts/${folder}/${fileName}`;

        const file = {
          uri: item.uri,
          name: fileName,
          type: item.type === "video" ? "video/mp4" : "image/jpeg",
        };

        const { error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, file);

        if (error) throw error;

        const { data } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(path);

        uploadedMedia.push({
          type: item.type,
          url: data.publicUrl,
        });
      }

      await API.post("/posts", {
        type,
        caption,
        location,
        media: uploadedMedia,
      });

      Alert.alert("Posted", "Your content is live 🎉");
      navigation.popToTop();
    } catch (e) {
      console.log("Upload error:", e);
      Alert.alert("Error", "Failed to share");
    } finally {
      setUploading(false);
    }
  };

  /* =============== UI =============== */
  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          {type === "clip" ? "Your Clip" : "Your Post"}
        </Text>

        <View style={{ width: 24 }} />
      </View>

      {/* MEDIA PREVIEW */}
      <View style={styles.mediaWrap}>
        <Image source={{ uri: media[0].uri }} style={styles.media} />

        {/* LOCATION TOP LEFT */}
        {location ? (
          <View style={styles.locBadge}>
            <Text style={styles.locText}>📍 {location}</Text>
          </View>
        ) : null}

        {/* COUNT TOP RIGHT */}
        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            1/{media.length}
          </Text>
        </View>
      </View>

      {/* CAPTION */}
      <TextInput
        style={styles.caption}
        placeholder="Write a caption…"
        multiline
        value={caption}
        onChangeText={setCaption}
      />

      {/* LOCATION INPUT */}
      <TextInput
        style={styles.locationInput}
        placeholder="Add location"
        value={location}
        onChangeText={setLocation}
      />

      {/* SHARE */}
      <TouchableOpacity
        style={[styles.shareBtn, uploading && { opacity: 0.6 }]}
        onPress={handleShare}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.shareText}>
            {type === "clip" ? "Share the clip" : "Share the post"}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

/* =============== STYLES =============== */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  back: {
    fontSize: 22,
    fontWeight: "700",
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
  },

  mediaWrap: {
    position: "relative",
    height: 260,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
    backgroundColor: "#eee",
  },

  media: {
    width: "100%",
    height: "100%",
  },

  locBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  locText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  countBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  countText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  caption: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    height: 100,
    textAlignVertical: "top",
    marginBottom: 10,
  },

  locationInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },

  shareBtn: {
    backgroundColor: "#111",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  shareText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Alert,
  Image,
  Platform,
} from "react-native";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ImagePicker from "expo-image-picker";
import Icon from "react-native-vector-icons/MaterialIcons";

const { width } = Dimensions.get("window");
const SIZE = width / 3;

// FIXED: Convert duration from milliseconds to seconds
const normalizeDuration = (duration) => {
  const dur = duration || 0;
  
  // Video ya sekunde 13 inakuwa 13000ms kwenye iOS/Android
  // Hivyo kama duration ni kubwa kuliko 60, labda iko kwenye milliseconds
  if (dur > 60) {
    return dur / 1000; // Convert milliseconds to seconds
  }
  
  return dur; // Already in seconds
};

function CreatePostContent({ navigation, route }) {
  const [type, setType] = useState("moment"); // "moment" | "reel"
  const [media, setMedia] = useState([]);

  useEffect(() => {
    if (route.params?.selectedMedia) {
      setMedia(route.params.selectedMedia);
    }
    if (route.params?.postType) {
      setType(route.params.postType);
    }
  }, [route.params]);

  // Request permission
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "We need access to your media library to select photos and videos."
        );
      }
    })();
  }, []);

  const openPicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: type === "moment",
        selectionLimit: type === "moment" ? 10 : 1,
        videoMaxDuration: type === "reel" ? 60 : undefined,
        quality: 1,
        orderedSelection: true,
        exif: false,
      });

      if (result.canceled) return;

      const picked = result.assets.map((a, index) => {
        const rawDuration = a.duration || 0;
        const durationInSeconds = normalizeDuration(rawDuration);
        
        console.log(`Media ${index}:`, {
          rawDuration: rawDuration,
          normalized: durationInSeconds,
          type: a.type,
          fileName: a.fileName
        });

        return {
          id: a.assetId || `media_${Date.now()}_${index}`,
          uri: a.uri,
          type: a.type === "video" ? "video" : "image",
          duration: durationInSeconds,
          width: a.width,
          height: a.height,
          fileName: a.fileName || `media_${index}`,
          fileSize: a.fileSize,
          mimeType: a.mimeType,
        };
      });

      // REEL VALIDATION - FIXED
      if (type === "reel") {
        if (picked.length === 0) {
          Alert.alert("No Media Selected", "Please select a video for your reel.");
          return;
        }

        const video = picked[0];

        if (video.type !== "video") {
          Alert.alert("Invalid Selection", "Reel must be a video file.");
          return;
        }

        // Debug log to see actual duration
        console.log("Video validation:", {
          rawDuration: video.duration,
          isVideo: video.type === "video",
          fileName: video.fileName
        });

        // HAPA NDIO FIX MUHIMU - CHECK KWA SEKUNDE
        if (video.duration > 60) {
          Alert.alert(
            "Video Too Long",
            `This video is ${video.duration.toFixed(1)} seconds long.\nReels must be 60 seconds or less.`
          );
          return;
        }

        // Additional check: video must be at least 1 second
        if (video.duration < 1) {
          Alert.alert("Video Too Short", "Video must be at least 1 second long.");
          return;
        }
      }

      // MOMENT VALIDATION
      if (type === "moment" && picked.length > 10) {
        Alert.alert("Limit Exceeded", "Moments can have up to 10 items only.");
        return;
      }

      setMedia(picked);
    } catch (error) {
      console.error("Error picking media:", error);
      Alert.alert("Error", "Failed to select media. Please try again.");
    }
  };

  const removeMedia = (id) => {
    setMedia((prev) => prev.filter((item) => item.id !== id));
  };

  const imageCount = media.filter((m) => m.type === "image").length;
  const videoCount = media.filter((m) => m.type === "video").length;
  const totalCount = media.length;

  const countText =
    totalCount === 0
      ? "No media selected"
      : `${totalCount} item${totalCount > 1 ? "s" : ""} selected`;

  const goNext = () => {
    if (media.length === 0) {
      Alert.alert("No Media", "Please select at least one photo or video.");
      return;
    }

    // Additional validation for reel
    if (type === "reel") {
      const video = media[0];
      if (video.duration > 60) {
        Alert.alert(
          "Video Too Long",
          `This video is ${video.duration.toFixed(1)} seconds long.\nReels must be 60 seconds or less.`
        );
        return;
      }
    }

    const mediaData = {
      mediaList: media,
      postType: type,
      imageCount,
      videoCount,
      totalCount,
    };

    navigation.navigate("EditMedia", mediaData);
  };

  const MediaItem = ({ item, index }) => (
    <View style={styles.itemContainer}>
      <Image source={{ uri: item.uri }} style={styles.media} resizeMode="cover" />

      {item.type === "video" && (
        <View style={styles.videoBadge}>
          <Icon name="videocam" size={12} color="#fff" />
          {item.duration > 0 && (
            <Text style={styles.durationText}>
              {Math.floor(item.duration)}s
            </Text>
          )}
        </View>
      )}

      {type === "moment" && media.length > 1 && (
        <View style={styles.selectionNumber}>
          <Text style={styles.numberText}>{index + 1}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeMedia(item.id)}
      >
        <Icon name="close" size={14} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="close" size={24} color="#000" />
        </TouchableOpacity>

        <Text style={styles.title}>
          {type === "moment" ? "Create Moment" : "Create Reel"}
        </Text>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={goNext}
          disabled={media.length === 0}
        >
          <Text
            style={[
              styles.nextText,
              media.length === 0 && styles.nextDisabled,
            ]}
          >
            Next
          </Text>
        </TouchableOpacity>
      </View>

      {/* Type Selector */}
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            type === "moment" && styles.typeButtonActive,
          ]}
          onPress={() => {
            if (type !== "moment") {
              Alert.alert(
                "Switch to Moment",
                "Switching will clear your current selection. Continue?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Switch",
                    onPress: () => {
                      setType("moment");
                      setMedia([]);
                    },
                  },
                ]
              );
            }
          }}
        >
          <Text
            style={[
              styles.typeButtonText,
              type === "moment" && styles.typeButtonTextActive,
            ]}
          >
            Moment
          </Text>
          <Text style={styles.typeSubText}>Up to 10 photos/videos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeButton,
            type === "reel" && styles.typeButtonActive,
          ]}
          onPress={() => {
            if (type !== "reel") {
              Alert.alert(
                "Switch to Reel",
                "Switching will clear your current selection. Continue?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Switch",
                    onPress: () => {
                      setType("reel");
                      setMedia([]);
                    },
                  },
                ]
              );
            }
          }}
        >
          <Text
            style={[
              styles.typeButtonText,
              type === "reel" && styles.typeButtonTextActive,
            ]}
          >
            Reel
          </Text>
          <Text style={styles.typeSubText}>60s video</Text>
        </TouchableOpacity>
      </View>

      {/* Selection Info */}
      <View style={styles.selectionInfo}>
        <TouchableOpacity style={styles.selectButton} onPress={openPicker}>
          <Icon name="photo-library" size={20} color="#0095f6" />
          <Text style={styles.selectButtonText}>Select from Gallery</Text>
        </TouchableOpacity>
        <Text style={styles.countText}>{countText}</Text>
      </View>

      {/* Media Grid or Empty */}
      {media.length > 0 ? (
        <FlatList
          data={media}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <MediaItem item={item} index={index} />
          )}
          numColumns={3}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            type === "moment" && media.length < 10 ? (
              <TouchableOpacity style={styles.addMoreButton} onPress={openPicker}>
                <Icon name="add" size={24} color="#0095f6" />
                <Text style={styles.addMoreText}>
                  Add more ({10 - media.length} left)
                </Text>
              </TouchableOpacity>
            ) : null
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Icon
              name={type === "moment" ? "collections" : "videocam"}
              size={60}
              color="#ddd"
            />
          </View>
          <Text style={styles.emptyTitle}>
            {type === "moment" ? "Create a Moment" : "Create a Reel"}
          </Text>
          <Text style={styles.emptyDescription}>
            {type === "moment"
              ? "Select up to 10 photos and videos to share together"
              : "Select a video up to 60 seconds to share as a reel"}
          </Text>
          <TouchableOpacity style={styles.selectMediaButton} onPress={openPicker}>
            <Icon name="photo-library" size={20} color="#fff" />
            <Text style={styles.selectMediaText}>Select Media</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Bar */}
      {media.length > 0 && (
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarInfo}>
            <Icon
              name={type === "moment" ? "collections" : "videocam"}
              size={18}
              color="#666"
            />
            <Text style={styles.bottomBarText}>
              {type === "moment"
                ? `${imageCount} photo${imageCount !== 1 ? "s" : ""}${
                    videoCount > 0
                      ? `, ${videoCount} video${videoCount !== 1 ? "s" : ""}`
                      : ""
                  }`
                : `${Math.floor(media[0]?.duration || 0)}s video`}
            </Text>
          </View>

          <TouchableOpacity style={styles.nextButton} onPress={goNext}>
            <Text style={styles.nextButtonText}>Next</Text>
            <Icon name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// Main Component with SafeAreaProvider
export default function CreatePost({ navigation, route }) {
  return (
    <SafeAreaProvider>
      <CreatePostContent navigation={navigation} route={route} />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerButton: { padding: 8, minWidth: 50 },
  title: { fontSize: 18, fontWeight: "700", color: "#000" },
  nextText: { fontSize: 16, fontWeight: "700", color: "#0095f6" },
  nextDisabled: { opacity: 0.3 },
  typeSelector: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
  },
  typeButtonActive: { backgroundColor: "#e3f2fd", borderWidth: 1.5, borderColor: "#0095f6" },
  typeButtonText: { fontSize: 15, fontWeight: "600", color: "#666" },
  typeButtonTextActive: { color: "#0095f6" },
  typeSubText: { fontSize: 11, color: "#888", marginTop: 2 },
  selectionInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  selectButton: { flexDirection: "row", alignItems: "center", gap: 8 },
  selectButtonText: { fontSize: 15, fontWeight: "600", color: "#0095f6" },
  countText: { fontSize: 14, color: "#666" },
  gridContainer: { padding: 8, paddingBottom: 100 },
  itemContainer: {
    width: SIZE - 8,
    height: SIZE - 8,
    margin: 4,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
    position: "relative",
  },
  media: { width: "100%", height: "100%" },
  videoBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: { fontSize: 10, color: "#fff", fontWeight: "600" },
  selectionNumber: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "#0095f6",
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  numberText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  removeButton: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.7)",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  addMoreButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 20, gap: 8 },
  addMoreText: { color: "#0095f6", fontSize: 15, fontWeight: "600" },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40, paddingBottom: 60 },
  emptyIcon: { marginBottom: 24 },
  emptyTitle: { fontSize: 24, fontWeight: "700", color: "#333", marginBottom: 12, textAlign: "center" },
  emptyDescription: { fontSize: 16, color: "#666", textAlign: "center", lineHeight: 22, marginBottom: 32 },
  selectMediaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0095f6",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
  },
  selectMediaText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  bottomBarInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  bottomBarText: { fontSize: 14, color: "#666" },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0095f6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  nextButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
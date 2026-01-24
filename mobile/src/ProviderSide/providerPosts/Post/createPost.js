import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Alert,
  Image,
  ActivityIndicator
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from 'expo-file-system';
import Icon from "react-native-vector-icons/MaterialIcons";

const { width } = Dimensions.get("window");
const SIZE = width / 3;
const MAX_MOMENT_ITEMS = 10;
const MAX_REEL_DURATION = 60;
const MIN_REEL_DURATION = 1;

/* ---------------- utils ---------------- */
const normalizeDuration = (duration) => {
  const dur = duration || 0;
  return dur > 60 ? dur / 1000 : dur;
};

const formatDuration = (seconds) => {
  if (!seconds) return "0s";
  return seconds >= 1 ? `${Math.floor(seconds)}s` : "<1s";
};

/* ---------------- screen ---------------- */
function CreatePostContent({ navigation, route }) {
  const insets = useSafeAreaInsets();

  const [type, setType] = useState("moment");
  const [media, setMedia] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  /* params sync */
  useEffect(() => {
    if (route.params?.selectedMedia) setMedia(route.params.selectedMedia);
    if (route.params?.postType) setType(route.params.postType);
  }, [route.params]);

  /* permissions */
  useEffect(() => {
    (async () => {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "We need access to your media library to select photos and videos.",
          [{ text: "OK", style: "default" }]
        );
      }
    })();
  }, []);

  /* picker */
  const openPicker = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: type === "moment",
        selectionLimit: type === "moment" ? MAX_MOMENT_ITEMS : 1,
        videoMaxDuration: type === "reel" ? MAX_REEL_DURATION : undefined,
        orderedSelection: true,
        quality: 1,
        exif: false, // Improve performance
      });

      if (result.canceled) {
        setIsLoading(false);
        return;
      }

      const mediaItems = await Promise.all(
        result.assets.map(async (asset, index) => {
          let fileSize = asset.fileSize;
          
          // Get file size if not provided
          if (!fileSize && asset.uri) {
            try {
              const fileInfo = await FileSystem.getInfoAsync(asset.uri);
              fileSize = fileInfo.size || 0;
            } catch (error) {
              console.warn('Could not get file size:', error);
            }
          }

          return {
            id: asset.assetId || `media_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
            uri: asset.uri,
            type: asset.type === "video" ? "video" : "image",
            duration: normalizeDuration(asset.duration),
            width: asset.width,
            height: asset.height,
            fileName: asset.fileName || `media_${Date.now()}_${index}`,
            fileSize,
            mimeType: asset.mimeType,
          };
        })
      );

      /* reel validation */
      if (type === "reel") {
        const video = mediaItems[0];
        if (!video || video.type !== "video") {
          Alert.alert("Invalid Selection", "Reel must be a video file.");
          setIsLoading(false);
          return;
        }

        if (video.duration > MAX_REEL_DURATION) {
          Alert.alert("Video Too Long", `Reels must be ${MAX_REEL_DURATION} seconds or less.`);
          setIsLoading(false);
          return;
        }

        if (video.duration < MIN_REEL_DURATION) {
          Alert.alert("Video Too Short", "Reels must be at least 1 second.");
          setIsLoading(false);
          return;
        }
      }

      if (type === "moment" && mediaItems.length > MAX_MOMENT_ITEMS) {
        Alert.alert("Limit Exceeded", `Moments can have up to ${MAX_MOMENT_ITEMS} items.`);
        setIsLoading(false);
        return;
      }

      setMedia(mediaItems);
    } catch (error) {
      console.error('Picker Error:', error);
      Alert.alert(
        "Selection Error",
        "Failed to select media. Please try again.",
        [{ text: "OK", style: "default" }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const removeMedia = (id) => {
    setMedia((prev) => prev.filter((item) => item.id !== id));
  };

  const switchPostType = (newType) => {
    if (type === newType) return;
    
    if (media.length > 0) {
      Alert.alert(
        "Switch Post Type?",
        "Changing post type will clear your current selection.",
        [
          { 
            text: "Cancel", 
            style: "cancel" 
          },
          {
            text: "Switch",
            style: "destructive",
            onPress: () => {
              setType(newType);
              setMedia([]);
            },
          },
        ]
      );
    } else {
      setType(newType);
    }
  };

  const goNext = () => {
    if (!media.length) {
      Alert.alert(
        "No Media Selected",
        "Please select at least one photo or video to continue.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    const imageCount = media.filter((item) => item.type === "image").length;
    const videoCount = media.filter((item) => item.type === "video").length;

    navigation.navigate("EditMedia", {
      mediaList: media,
      postType: type,
      imageCount,
      videoCount,
      totalCount: media.length,
    });
  };

  const renderMediaItem = ({ item, index }) => (
    <View style={styles.mediaItem}>
      <Image 
        source={{ uri: item.uri }} 
        style={styles.mediaImage}
        resizeMode="cover"
      />

      {item.type === "video" && (
        <View style={styles.videoBadge}>
          <Icon name="videocam" size={12} color="#fff" />
          <Text style={styles.videoDuration}>
            {formatDuration(item.duration)}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeMedia(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon name="close" size={14} color="#fff" />
      </TouchableOpacity>
      
      {index === 0 && type === "moment" && media.length > 1 && (
        <View style={styles.coverBadge}>
          <Text style={styles.coverText}>Cover</Text>
        </View>
      )}
    </View>
  );

  const renderTypeButton = (postType, label, description) => (
    <TouchableOpacity
      style={[
        styles.typeButton,
        type === postType && styles.typeButtonActive,
      ]}
      onPress={() => switchPostType(postType)}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.typeButtonLabel,
          type === postType && styles.typeButtonLabelActive,
        ]}
      >
        {label}
      </Text>
      <Text style={styles.typeButtonDescription}>
        {description}
      </Text>
    </TouchableOpacity>
  );

  /* ---------------- UI ---------------- */
  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
        },
      ]}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          disabled={isLoading}
        >
          <Icon name="close" size={24} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {type === "moment" ? "Create Moment" : "Create Reel"}
        </Text>

        <TouchableOpacity 
          disabled={!media.length || isLoading} 
          onPress={goNext}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[
            styles.nextButtonText, 
            (!media.length || isLoading) && styles.nextButtonDisabled
          ]}>
            Next
          </Text>
        </TouchableOpacity>
      </View>

      {/* TYPE SELECTOR */}
      <View style={styles.typeSelector}>
        {renderTypeButton("moment", "Moment", "Up to 10 items")}
        {renderTypeButton("reel", "Reel", "60s video")}
      </View>

      {/* SELECTION INFO */}
      <View style={styles.selectionInfo}>
        <TouchableOpacity 
          style={styles.galleryButton} 
          onPress={openPicker}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#0095f6" />
          ) : (
            <>
              <Icon name="photo-library" size={20} color="#0095f6" />
              <Text style={styles.galleryButtonText}>Select from Gallery</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.selectionCount}>
          {media.length
            ? `${media.length} item${media.length !== 1 ? 's' : ''} selected`
            : "No media selected"}
        </Text>
      </View>

      {/* MEDIA GRID */}
      {media.length > 0 ? (
        <FlatList
          data={media}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={[
            styles.mediaGrid,
            { paddingBottom: 120 + insets.bottom }
          ]}
          renderItem={renderMediaItem}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Icon name="collections" size={64} color="#ddd" />
          <Text style={styles.emptyStateText}>
            {type === "moment" 
              ? "Select up to 10 photos & videos" 
              : "Select a video up to 60 seconds"}
          </Text>
          <TouchableOpacity 
            style={styles.emptyStateButton} 
            onPress={openPicker}
            disabled={isLoading}
          >
            <Text style={styles.emptyStateButtonText}>Browse Gallery</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* BOTTOM BAR */}
      {media.length > 0 && (
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: 12 + insets.bottom },
          ]}
        >
          <View>
            <Text style={styles.bottomBarText}>
              {type === "moment"
                ? `${media.filter(m => m.type === "image").length} photos, ${media.filter(m => m.type === "video").length} videos`
                : `${formatDuration(media[0]?.duration)} video`}
            </Text>
            {type === "moment" && media.length === MAX_MOMENT_ITEMS && (
              <Text style={styles.maxLimitText}>Maximum limit reached</Text>
            )}
          </View>

          <TouchableOpacity 
            style={styles.bottomNextButton} 
            onPress={goNext}
            activeOpacity={0.8}
          >
            <Text style={styles.bottomNextButtonText}>Next</Text>
            <Icon name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/* wrapper */
export default function CreatePost(props) {
  return (
    <SafeAreaProvider>
      <CreatePostContent {...props} />
    </SafeAreaProvider>
  );
}

/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff" 
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#e0e0e0",
  },

  headerTitle: { 
    fontSize: 18, 
    fontWeight: "700",
    color: "#000"
  },
  
  nextButtonText: { 
    fontWeight: "700", 
    fontSize: 16,
    color: "#0095f6" 
  },
  
  nextButtonDisabled: { 
    opacity: 0.3 
  },

  typeSelector: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  
  typeButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f8f9fa",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  
  typeButtonActive: {
    backgroundColor: "#e7f5ff",
    borderColor: "#0095f6",
    borderWidth: 2,
  },
  
  typeButtonLabel: { 
    fontWeight: "600", 
    fontSize: 16,
    color: "#495057",
    marginBottom: 4
  },
  
  typeButtonLabelActive: { 
    color: "#0095f6" 
  },
  
  typeButtonDescription: { 
    fontSize: 12, 
    color: "#868e96" 
  },

  selectionInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#e0e0e0",
  },
  
  galleryButton: { 
    flexDirection: "row", 
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f8f9fa"
  },
  
  galleryButtonText: { 
    color: "#0095f6", 
    fontWeight: "600",
    fontSize: 15
  },
  
  selectionCount: { 
    color: "#666",
    fontSize: 14
  },

  mediaGrid: {
    padding: 8,
  },

  mediaItem: {
    width: SIZE - 8,
    height: SIZE - 8,
    margin: 4,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
  },

  mediaImage: { 
    width: "100%", 
    height: "100%" 
  },

  videoBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  videoDuration: { 
    color: "#fff", 
    fontSize: 10,
    fontWeight: "500"
  },

  removeButton: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  coverBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(0,149,246,0.9)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  coverText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },

  emptyStateText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
    lineHeight: 22,
  },

  emptyStateButton: {
    backgroundColor: "#0095f6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },

  emptyStateButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 4,
  },

  bottomBarText: { 
    color: "#495057",
    fontSize: 14,
    fontWeight: "500"
  },

  maxLimitText: {
    color: "#fa5252",
    fontSize: 12,
    marginTop: 2,
  },

  bottomNextButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0095f6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },

  bottomNextButtonText: { 
    color: "#fff", 
    fontWeight: "700",
    fontSize: 15
  },
});
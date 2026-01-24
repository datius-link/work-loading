import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { UploadManager } from "../../../lib/storage/ProviderPosts";
import VideoPlayer from "./VideoPlayer";
import { theme } from "../../../theme";
import { api } from "../../../api/api";

const { width, height } = Dimensions.get("window");
const MEDIA_HEIGHT = 400;

const UPLOAD_STATUS = {
  PENDING: "pending",
  UPLOADING: "uploading",
  DONE: "done",
  ERROR: "error",
};

export default function PostDetails({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { mediaList = [], postType = "moment" } = route.params || {};

  const [activeIndex, setActiveIndex] = useState(0);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [uploadStatus, setUploadStatus] = useState(UPLOAD_STATUS.PENDING);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedMedia, setUploadedMedia] = useState([]);

  // Mention / hashtag logic
  const [suggestions, setSuggestions] = useState([]);
  const [trigger, setTrigger] = useState(null);
  const [keyword, setKeyword] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isCaptionFocused, setIsCaptionFocused] = useState(false);

  const flatListRef = useRef(null);
  const videoPlayersRef = useRef([]);
  const captionInputRef = useRef(null);
  const captionContainerRef = useRef(null);
  const scrollViewRef = useRef(null);
  const isMounted = useRef(true);

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Scroll to caption when keyboard opens
        setTimeout(() => {
          if (scrollViewRef.current && isCaptionFocused) {
            scrollViewRef.current.scrollTo({ y: 300, animated: true });
          }
        }, 100);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [isCaptionFocused]);

  useEffect(() => {
    isMounted.current = true;
    if (!mediaList.length) {
      Alert.alert("No media", "Please select media first.");
      navigation.goBack();
      return;
    }
    startUpload();

    return () => {
      isMounted.current = false;
      releaseAllVideos();
      UploadManager.callbacks.onProgress = null;
      UploadManager.callbacks.onError = null;
      UploadManager.callbacks.onComplete = null;
    };
  }, []);

  useEffect(() => {
    if (!isFocused) releaseAllVideos();
  }, [isFocused]);

  const isVideoItem = useCallback((item) => {
    const uri = item?.uri || "";
    return uri.endsWith(".mp4") || uri.endsWith(".mov") || item?.type === "video";
  }, []);

  const registerVideoPlayer = useCallback((index, player) => {
    videoPlayersRef.current[index] = player;
  }, []);

  const releaseAllVideos = useCallback(async () => {
    videoPlayersRef.current.forEach((p) => {
      p?.pause?.();
      p?.cleanup?.();
    });
    videoPlayersRef.current = [];
  }, []);

  const handleBack = async () => {
    if (uploadStatus === UPLOAD_STATUS.UPLOADING) {
      Alert.alert("Cancel upload?", "Post is still uploading.", [
        { text: "Continue", style: "cancel" },
        {
          text: "Cancel",
          style: "destructive",
          onPress: async () => {
            await releaseAllVideos();
            navigation.goBack();
          },
        },
      ]);
    } else {
      await releaseAllVideos();
      navigation.goBack();
    }
  };

  // ── Upload logic ─────────────────────────────────────────────────────────────
  const startUpload = () => {
    setUploadStatus(UPLOAD_STATUS.UPLOADING);
    setUploadProgress(0);

    UploadManager.callbacks.onProgress = (p) => {
      if (!isMounted.current) return;
      setUploadProgress(p.percentage);
    };

    UploadManager.callbacks.onComplete = (media) => {
      if (!isMounted.current) return;
      setUploadedMedia(media);
      setUploadStatus(UPLOAD_STATUS.DONE);
    };

    UploadManager.callbacks.onError = (err) => {
      console.log("Upload error:", err);
      if (!isMounted.current) return;
      setUploadStatus(UPLOAD_STATUS.ERROR);
      Alert.alert("Upload failed", "Please check connection and try again.");
    };

    UploadManager.startUpload(mediaList, postType).catch(() => {});
  };

  // ── Share ────────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    if (uploadStatus !== UPLOAD_STATUS.DONE) {
      Alert.alert("Please wait", "Media still uploading.");
      return;
    }
    if (!caption.trim()) {
      Alert.alert("Caption required", "Please write something.");
      return;
    }

    try {
      const payload = {
        type: postType,
        caption: caption.trim(),
        location: location.trim() || null,
        media: uploadedMedia.map((m) => ({ url: m.url, type: m.type })),
        created_at: new Date().toISOString(),
      };

      await api.post("/posts", payload);
      UploadManager.reset();

      Alert.alert("Success!", "Posted.", [
        { text: "OK", onPress: () => navigation.popToTop() },
      ]);
    } catch (err) {
      console.error(err?.response);
      Alert.alert("Error", "Could not share post.");
    }
  };

  // ── Mention / Hashtag logic ───────────────────────────────────────────────
  const insertSuggestion = (value) => {
    const words = caption.split(/\s/);
    words.pop(); // remove last (trigger + partial)
    const newPart = trigger === "@" ? `@${value} ` : `#${value.replace(/\s/g, "_")} `;
    const newCaption = words.join(" ") + (words.length ? " " : "") + newPart;
    
    setCaption(newCaption);
    setSuggestions([]);
    setTrigger(null);
    setShowSuggestions(false);
    setKeyword("");
    
    // Focus back to input
    if (captionInputRef.current) {
      captionInputRef.current.focus();
    }
  };

  const fetchMentions = async (type, q) => {
    if (!q?.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    const endpoint = type === "users" ? "/posts/mentions/users" : "/posts/mentions/services";

    try {
      const { data = [] } = await api.get(endpoint, { params: { q } });
      const formattedSuggestions = data.map((item) => ({
        id: item.id || item.username || item,
        name: item.name || item.username || item,
        value: item.username || item,
        type: type === "users" ? "user" : "service",
      }));
      
      setSuggestions(formattedSuggestions);
      setShowSuggestions(formattedSuggestions.length > 0);
    } catch (err) {
      console.log("Fetch suggestions error:", err);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleCaptionChange = (text) => {
    setCaption(text);

    const words = text.split(/\s/);
    const lastWord = words[words.length - 1] || "";

    if (lastWord.startsWith("@")) {
      const q = lastWord.slice(1);
      setTrigger("@");
      setKeyword(q);
      fetchMentions("users", q);
    } else if (lastWord.startsWith("#")) {
      const q = lastWord.slice(1);
      setTrigger("#");
      setKeyword(q);
      fetchMentions("services", q);
    } else if (trigger) {
      setTrigger(null);
      setSuggestions([]);
      setShowSuggestions(false);
      setKeyword("");
    }
  };

  const handleCaptionFocus = () => {
    setIsCaptionFocused(true);
    // If there's already a trigger and keyword, show suggestions
    if (trigger && keyword) {
      fetchMentions(trigger === "@" ? "users" : "services", keyword);
    }
  };

  const handleCaptionBlur = () => {
    setIsCaptionFocused(false);
    // Don't hide suggestions immediately on blur (let user click them)
    setTimeout(() => {
      if (!isCaptionFocused) {
        setShowSuggestions(false);
      }
    }, 200);
  };

  const renderSuggestionItem = ({ item }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => insertSuggestion(item.value)}
    >
      <View style={styles.suggestionIcon}>
        <Icon 
          name={item.type === "user" ? "person" : "category"} 
          size={20} 
          color={theme.colors.primary} 
        />
      </View>
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionName}>{item.name}</Text>
        <Text style={styles.suggestionValue}>
          {item.type === "user" ? "@" : "#"}{item.value}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // ── Media render ─────────────────────────────────────────────────────────────
  const renderMediaItem = ({ item, index }) => {
    const isVideo = isVideoItem(item);
    const shouldPlayVideo =
      isVideo &&
      (Platform.OS === "android"
        ? index === activeIndex && uploadStatus !== UPLOAD_STATUS.UPLOADING
        : Math.abs(index - activeIndex) <= 1);

    return (
      <View style={styles.mediaSlide}>
        {isVideo && shouldPlayVideo ? (
          <VideoPlayer
            index={index}
            uri={item.uri}
            isActive={index === activeIndex}
            onRegisterPlayer={registerVideoPlayer}
            paused={uploadStatus === UPLOAD_STATUS.UPLOADING}
          />
        ) : isVideo ? (
          <View style={styles.videoPlaceholder}>
            <Icon name="play-circle-outline" size={64} color="#ffffff66" />
          </View>
        ) : (
          <Image source={{ uri: item.uri }} style={styles.mediaImage} resizeMode="cover" />
        )}

        {uploadStatus === UPLOAD_STATUS.UPLOADING && index === activeIndex && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.uploadingText}>
              Uploading {isVideo ? "video" : "photo"}... {Math.round(uploadProgress)}%
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderUploadStatus = () => {
    if (uploadStatus === UPLOAD_STATUS.PENDING) return null;

    const configs = {
      [UPLOAD_STATUS.UPLOADING]: {
        icon: "cloud-upload",
        color: theme.colors.primary,
        text: `Uploading… ${Math.round(uploadProgress)}%`,
      },
      [UPLOAD_STATUS.DONE]: {
        icon: "check-circle",
        color: theme.colors.success,
        text: "Upload complete — ready to share",
      },
      [UPLOAD_STATUS.ERROR]: {
        icon: "error",
        color: theme.colors.error,
        text: "Upload failed. Try again.",
      },
    };

    const cfg = configs[uploadStatus];
    if (!cfg) return null;

    return (
      <View style={[styles.statusBar, { borderColor: cfg.color + "44" }]}>
        <Icon name={cfg.icon} size={20} color={cfg.color} />
        <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.text}</Text>
        {uploadStatus === UPLOAD_STATUS.UPLOADING && (
          <View style={styles.progress}>
            <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
          </View>
        )}
      </View>
    );
  };

  // Calculate available height for suggestions
  const getSuggestionsMaxHeight = () => {
    const availableHeight = height - keyboardHeight - 200;
    return Math.min(300, availableHeight);
  };

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
    >
      {/* Fixed Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.btn} onPress={handleBack}>
          <Icon name="close" size={26} color={theme.colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.title}>New {postType === "reel" ? "Reel" : "Post"}</Text>
          {mediaList.length > 0 && (
            <Text style={styles.subtitle}>
              {mediaList.length} item{mediaList.length !== 1 ? "s" : ""}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.shareButton,
            (uploadStatus !== UPLOAD_STATUS.DONE || !caption.trim()) && styles.shareDisabled,
          ]}
          disabled={uploadStatus !== UPLOAD_STATUS.DONE || !caption.trim()}
          onPress={handleShare}
        >
          {uploadStatus === UPLOAD_STATUS.UPLOADING ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.shareText}>Share</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Upload status bar */}
      {renderUploadStatus()}

      {/* FULLY SCROLLABLE CONTENT */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Media Carousel */}
        <View style={styles.mediaContainer}>
          <FlatList
            ref={flatListRef}
            data={mediaList}
            horizontal
            pagingEnabled
            keyExtractor={(_, i) => i.toString()}
            renderItem={renderMediaItem}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / width);
              setActiveIndex(idx);
            }}
          />

          {mediaList.length > 1 && (
            <View style={styles.counter}>
              <Text style={styles.counterText}>
                {activeIndex + 1} / {mediaList.length}
              </Text>
            </View>
          )}
        </View>

        {/* Caption Section */}
        <View 
          ref={captionContainerRef}
          style={styles.captionSection}
          onLayout={() => {}}
        >
          <Text style={styles.sectionTitle}>Caption</Text>
          <Text style={styles.sectionHint}>
            Share what's on your mind • @mention • #hashtags
          </Text>

          <View style={styles.captionContainer}>
            <TextInput
              ref={captionInputRef}
              style={styles.captionInput}
              placeholder="Write a caption..."
              placeholderTextColor={theme.colors.textMuted}
              value={caption}
              onChangeText={handleCaptionChange}
              onFocus={handleCaptionFocus}
              onBlur={handleCaptionBlur}
              multiline
              maxLength={2200}
              textAlignVertical="top"
            />
            
            {/* Quick action buttons */}
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => {
                  const newCaption = caption + (caption.endsWith(" ") ? "" : " ") + "@";
                  setCaption(newCaption);
                  captionInputRef.current?.focus();
                }}
              >
                <Icon name="alternate-email" size={20} color={theme.colors.primary} />
                <Text style={styles.quickActionText}>Mention</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => {
                  const newCaption = caption + (caption.endsWith(" ") ? "" : " ") + "#";
                  setCaption(newCaption);
                  captionInputRef.current?.focus();
                }}
              >
                <Icon name="tag" size={20} color={theme.colors.primary} />
                <Text style={styles.quickActionText}>Hashtag</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.captionFooter}>
            <Text style={styles.charCount}>
              {caption.length} / 2200
            </Text>
          </View>
        </View>

        {/* Post Info */}
        <View style={styles.infoBox}>
          <Icon name="info" size={18} color={theme.colors.textMuted} />
          <Text style={styles.infoText}>
            Your {postType === "reel" ? "reel" : "post"} will be visible to your followers
          </Text>
        </View>

        {/* Spacer for keyboard */}
        <View style={{ height: keyboardHeight > 0 ? 20 : 50 }} />
      </ScrollView>

      {/* Suggestions - RENDERED ABOVE KEYBOARD */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={[
          styles.suggestionsWrapper,
          { bottom: keyboardHeight + 10 }
        ]}>
          <View style={styles.suggestionsContainer}>
            <View style={styles.suggestionsHeader}>
              <Text style={styles.suggestionsTitle}>
                {trigger === "@" ? "Mention People" : "Add Hashtag"}
              </Text>
              <TouchableOpacity onPress={() => setShowSuggestions(false)}>
                <Icon name="close" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={suggestions}
              keyExtractor={(item) => `${item.type}-${item.id}`}
              renderItem={renderSuggestionItem}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: getSuggestionsMaxHeight() }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      )}

      {/* Overlay when suggestions are visible */}
      {showSuggestions && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowSuggestions(false)}
        />
      )}
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  keyboardAvoid: { 
    flex: 1, 
    backgroundColor: theme.colors.bg 
  },
  
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    zIndex: 100,
    elevation: 100,
  },
  btn: { 
    padding: 8 
  },
  headerCenter: { 
    alignItems: "center" 
  },
  title: { 
    fontSize: 17, 
    fontWeight: "700", 
    color: theme.colors.text 
  },
  subtitle: { 
    fontSize: 12, 
    color: theme.colors.textMuted, 
    marginTop: 2 
  },
  shareButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 20,
    minWidth: 80,
    alignItems: "center",
  },
  shareDisabled: { 
    opacity: 0.5, 
    backgroundColor: theme.colors.textMuted 
  },
  shareText: { 
    color: "#fff", 
    fontWeight: "700", 
    fontSize: 16 
  },

  // Upload Status
  statusBar: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 100,
    elevation: 100,
  },
  statusText: { 
    flex: 1, 
    marginLeft: 10, 
    fontWeight: "600",
    fontSize: 14,
  },
  progress: {
    height: 3,
    backgroundColor: "#e0e0e0",
    borderRadius: 2,
    overflow: "hidden",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  progressFill: { 
    height: "100%", 
    backgroundColor: theme.colors.primary 
  },

  // Scroll Content
  scroll: { 
    flex: 1 
  },
  scrollContent: { 
    paddingBottom: 20 
  },
  
  // Media
  mediaContainer: {
    height: MEDIA_HEIGHT,
    backgroundColor: "#000",
    position: "relative",
    marginBottom: 20,
  },
  mediaSlide: { 
    width, 
    height: MEDIA_HEIGHT 
  },
  mediaImage: { 
    width: "100%", 
    height: "100%" 
  },
  videoPlaceholder: {
    flex: 1,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadingText: { 
    color: "#fff", 
    marginTop: 16, 
    fontSize: 15,
    fontWeight: "600",
  },
  counter: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  counterText: { 
    color: "#fff", 
    fontWeight: "700", 
    fontSize: 13 
  },

  // Caption Section
  captionSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 16,
    lineHeight: 20,
  },
  captionContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 12,
  },
  captionInput: {
    minHeight: 120,
    fontSize: 16,
    color: theme.colors.text,
    textAlignVertical: "top",
    lineHeight: 22,
  },
  quickActions: {
    flexDirection: "row",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  quickActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
  },
  quickActionText: {
    marginLeft: 6,
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "500",
  },
  captionFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  charCount: { 
    fontSize: 13, 
    color: theme.colors.textMuted 
  },

  // Info Box
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },

  // Suggestions
  suggestionsWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 1000,
    paddingHorizontal: 16,
  },
  suggestionsContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    maxHeight: 300,
  },
  suggestionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  suggestionsTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  suggestionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceSoft,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.text,
    marginBottom: 2,
  },
  suggestionValue: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },

  // Overlay
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
    elevation: 999,
  },
});
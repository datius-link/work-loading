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
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import Icon from "../../../icons/MaterialIcon";
import VideoPlayer from "./VideoPlayer";
import { useAppTheme } from "../../../theme";
import { getFriendlyApiError, socialRequest } from "../../../api/api";
import { UploadManager } from "../../../utils/UploadManager";
import { useLanguage } from "../../../LanguageContext";
import { getUserSession } from "../../../utils/userSession";
import { searchPlaces } from "../../../utils/placesAutocomplete";
import HiringNoticeModal from "../../Jobs/HiringNoticeModal";

const { width, height } = Dimensions.get("window");
const MEDIA_HEIGHT = 400;

const UPLOAD_STATUS = {
  PENDING: "pending",
  UPLOADING: "uploading",
  DONE: "done",
  ERROR: "error",
};

export default function PostDetails({ route, navigation }) {
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { mediaList = [], postType = "moment" } = route.params || {};

  const [activeIndex, setActiveIndex] = useState(0);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [uploadStatus, setUploadStatus] = useState(UPLOAD_STATUS.PENDING);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedMedia, setUploadedMedia] = useState([]);
  const [notice, setNotice] = useState(null);
  const [successPost, setSuccessPost] = useState(null);
  const [isSharing, setIsSharing] = useState(false);

  // Mention / hashtag logic
  const [suggestions, setSuggestions] = useState([]);
  const [trigger, setTrigger] = useState(null);
  const [keyword, setKeyword] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isCaptionFocused, setIsCaptionFocused] = useState(false);
  const [isLocationFocused, setIsLocationFocused] = useState(false);
  // Measured (via onLayout) y-offset of each section inside the ScrollView's
  // content, so we can scroll the actually-focused input above the keyboard
  // instead of the previous hardcoded y:300 (which only ever worked for the
  // caption field and left location covered by the keyboard entirely).
  const [captionSectionY, setCaptionSectionY] = useState(0);
  const [locationSectionY, setLocationSectionY] = useState(0);
  const [locationSuggestions, setLocationSuggestions] = useState([]);

  const flatListRef = useRef(null);
  const locationSearchRef = useRef({ timer: null, controller: null });
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
        // Scroll whichever input is actually focused above the keyboard.
        setTimeout(() => {
          if (!scrollViewRef.current) return;
          if (isCaptionFocused) {
            scrollViewRef.current.scrollTo({ y: Math.max(captionSectionY - 16, 0), animated: true });
          } else if (isLocationFocused) {
            scrollViewRef.current.scrollTo({ y: Math.max(locationSectionY - 16, 0), animated: true });
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
  }, [isCaptionFocused, isLocationFocused, captionSectionY, locationSectionY]);

  // Street-level location autocomplete (debounced ~350ms — Nominatim's free
  // usage policy asks for roughly 1 request/second, so we can't search on
  // every keystroke). Aborts the in-flight request if the user keeps typing.
  useEffect(() => {
    const handle = locationSearchRef.current;
    if (handle.timer) clearTimeout(handle.timer);
    if (handle.controller) handle.controller.abort();

    if (!isLocationFocused || !location.trim()) {
      setLocationSuggestions([]);
      return;
    }

    handle.timer = setTimeout(() => {
      const controller = new AbortController();
      handle.controller = controller;
      searchPlaces(location, { signal: controller.signal })
        .then((results) => {
          if (isMounted.current) setLocationSuggestions(results);
        })
        .catch((err) => {
          if (err?.name !== "AbortError" && isMounted.current) setLocationSuggestions([]);
        });
    }, 350);

    return () => {
      if (handle.timer) clearTimeout(handle.timer);
    };
  }, [location, isLocationFocused]);

  useEffect(() => {
    isMounted.current = true;
    if (!mediaList.length) {
      // Shouldn't be reachable through normal navigation (EditMedia always
      // passes media) — just bail out quietly rather than flashing a
      // dialog the user has no time to read before the screen unmounts.
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
      setNotice({
        type: "warning",
        title: "Cancel upload?",
        body: "Your post is still uploading. Leaving now will stop it.",
        primaryLabel: "Continue editing",
        secondaryLabel: "Cancel upload",
        onSecondary: async () => {
          setNotice(null);
          await releaseAllVideos();
          navigation.goBack();
        },
      });
    } else {
      await releaseAllVideos();
      navigation.goBack();
    }
  };

  // Upload logic
  const startUpload = () => {
    setNotice(null);
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
      setNotice({
        type: "error",
        title: language === "sw" ? "Media haijapakiwa" : "Media upload failed",
        body: language === "sw"
          ? "Media haijapakiwa kwa sababu ya tatizo la mtandao. Jaribu tena."
          : "Media upload failed because of connection problem. Try again.",
        primaryLabel: language === "sw" ? "Jaribu tena" : "Try again",
        onPrimary: () => startUpload(),
      });
    };

    UploadManager.startUpload(mediaList, postType).catch((err) => {
      console.error("START UPLOAD ERROR:", err);
    });
  };

  // Share — guarded against double taps (isSharing) so rapidly pressing
  // Share can't create duplicate posts. The draft (caption/media/location)
  // is only ever cleared after the backend confirms success, never on
  // failure, so a failed publish doesn't lose the user's work.
  const handleShare = async () => {
    if (isSharing) return;

    if (uploadStatus !== UPLOAD_STATUS.DONE) {
      setNotice({ type: "warning", title: "Please wait", body: "Your media is still uploading." });
      return;
    }

    if (!caption.trim()) {
      setNotice({ type: "warning", title: "Caption required", body: "Please write something before sharing." });
      return;
    }

    if (!uploadedMedia || uploadedMedia.length === 0) {
      setNotice({ type: "error", title: "Upload error", body: "No uploaded media found. Please try uploading again.", primaryLabel: "Try again", onPrimary: () => startUpload() });
      return;
    }

    setIsSharing(true);
    try {
      const payload = {
        type: postType,
        caption: caption.trim(),
        location: location.trim() || null,

        media: uploadedMedia.map((m) => ({
          url: m.url,
          type: m.type,
          fit: m.fit || "cover",
          transform: m.transform || null,
        })),

        created_at: new Date().toISOString(),
      };

      const response = await socialRequest("post", "/posts", payload, {
        preferredAuthActor: "viewer",
      });

      console.log("POST SUCCESS:", response.data);

      UploadManager.reset();

      // Build the published post from data we already have — no need for
      // a dedicated "get post by id" endpoint just to show it back to the
      // user immediately.
      const session = await getUserSession().catch(() => null);
      const profile = session?.profile || session?.user || {};
      setSuccessPost({
        id: response?.data?.postId,
        type: postType === "reel" ? "clip" : postType,
        caption: payload.caption,
        location: payload.location,
        created_at: payload.created_at,
        username: profile.username,
        full_name: profile.full_name || profile.fullName,
        profile_pic: profile.profile_pic || profile.profilePic,
        likes_count: 0,
        comments_count: 0,
        media: payload.media,
      });
    } catch (err) {
      console.log(
        "POST ERROR:",
        err?.response?.data || err.message || err
      );

      setNotice({
        type: "error",
        title: language === "sw" ? "Post haikutumwa" : "Post failed",
        body: getFriendlyApiError(err, language),
        primaryLabel: language === "sw" ? "Jaribu tena" : "Try again",
        onPrimary: () => handleShare(),
      });
    } finally {
      setIsSharing(false);
    }
  };

  const goToPublishedPost = () => {
    const post = successPost;
    setSuccessPost(null);
    // Clear CreatePost/EditMedia/PostDetails off the stack FIRST — posting is
    // done, so there's nothing to "go back" into. Only after that do we push
    // the media viewer, so it opens on top of the profile (back from it
    // returns to the profile, not into the posting flow).
    navigation.popToTop();
    if (!post) return;
    navigation.navigate("PostFeedView", {
      posts: [post],
      initialPostId: post.id,
      preferredAuthActor: "viewer",
    });
  };

  const finishAfterPublish = () => {
    setSuccessPost(null);
    navigation.popToTop();
  };

  // Mention and hashtag logic
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
    
    const endpoint = type === "users" ? "/posts/mentions/users" : "/posts/mentions/hashtags";

    try {
      const res = await socialRequest("get", endpoint, undefined, {
        params: { q },
        preferredAuthActor: "viewer",
      });
      const data = res?.data || [];
      const formattedSuggestions =
        type === "users"
          ? data.map((item) => ({
              id: item.id || item.username || item,
              name: item.name || item.username || item,
              value: item.username || item,
              type: "user",
            }))
          : // Real hashtags people have already used (post_mentions), ranked
            // by how often each appears — this now actually dropdowns like
            // @ mentions do, instead of listing provider service categories.
            data.map((item) => ({
              id: item.value,
              name: item.value,
              value: item.value,
              type: "hashtag",
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
      fetchMentions("hashtags", q);
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
      fetchMentions(trigger === "@" ? "users" : "hashtags", keyword);
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
        {item.type === "user" ? (
          <Icon name="person" size={20} color={theme.colors.primary} />
        ) : (
          <Text style={styles.quickActionSymbol}>#</Text>
        )}
      </View>
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionName}>{item.name}</Text>
        <Text style={styles.suggestionValue}>
          {item.type === "user" ? "@" : "#"}{item.value}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Media render
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
            contentFit={item.fit === "contain" ? "contain" : "cover"}
          />
        ) : isVideo ? (
          <View style={styles.videoPlaceholder}>
            <Icon name="play-circle-outline" size={64} color="#ffffff66" />
          </View>
        ) : (
          <Image
            source={{ uri: item.uri }}
            style={styles.mediaImage}
            resizeMode={item.fit === "contain" ? "contain" : "cover"}
          />
        )}

        {uploadStatus === UPLOAD_STATUS.UPLOADING && index === activeIndex && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.onPrimary} />
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
        text: `Uploading... ${Math.round(uploadProgress)}%`,
      },
      [UPLOAD_STATUS.DONE]: {
        icon: "check-circle",
        color: theme.colors.success,
        text: "Upload complete - ready to share",
      },
      [UPLOAD_STATUS.ERROR]: {
        icon: "error",
        color: theme.colors.error,
        text: language==="sw"?"Media haijapakiwa. Jaribu tena.":"Media upload failed. Try again.",
      },
    };

    const cfg = configs[uploadStatus];
    if (!cfg) return null;

    return (
      <View style={[styles.statusBar, { borderColor: cfg.color + "44" }]}>
        <Icon name={cfg.icon} size={20} color={cfg.color} />
        <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.text}</Text>
        {uploadStatus === UPLOAD_STATUS.ERROR && (
          <TouchableOpacity style={styles.retryUploadBtn} onPress={startUpload}>
            <Text style={styles.retryUploadText}>{language==="sw"?"Jaribu tena":"Retry"}</Text>
          </TouchableOpacity>
        )}
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

  // Main render
  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      // Same fix used in CommentsSheet/LoginModal/CreateJobModal: "undefined"
      // on Android means KeyboardAvoidingView does nothing at all, so the
      // keyboard just covers the caption/location inputs instead of the
      // content lifting above it.
      behavior={Platform.OS === "ios" ? "padding" : "height"}
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
            (uploadStatus !== UPLOAD_STATUS.DONE || !caption.trim() || isSharing) && styles.shareDisabled,
          ]}
          disabled={uploadStatus !== UPLOAD_STATUS.DONE || !caption.trim() || isSharing}
          onPress={handleShare}
          accessibilityLabel="Share post"
        >
          {uploadStatus === UPLOAD_STATUS.UPLOADING || isSharing ? (
            <ActivityIndicator color={theme.colors.onPrimary} size="small" />
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
          onLayout={(e) => setCaptionSectionY(e.nativeEvent.layout.y)}
        >
          <Text style={styles.sectionTitle}>Caption</Text>
          <Text style={styles.sectionHint}>
            Share what's on your mind - @mention - #hashtags
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
                <Text style={styles.quickActionSymbol}>@</Text>
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
                <Text style={styles.quickActionSymbol}>#</Text>
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

        {/* Location Section */}
        <View
          style={styles.locationSection}
          onLayout={(e) => setLocationSectionY(e.nativeEvent.layout.y)}
        >
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.sectionHint}>
            Add where you're sharing from (optional)
          </Text>

          <View style={styles.locationContainer}>
            <View style={styles.locationIconWrapper}>
              <Icon name="location-on" size={20} color={theme.colors.primary} />
            </View>
            <TextInput
              style={styles.locationInput}
              placeholder="Enter location or street..."
              placeholderTextColor={theme.colors.textMuted}
              value={location}
              onChangeText={setLocation}
              onFocus={() => setIsLocationFocused(true)}
              // Delayed so a tap on a dropdown suggestion below still
              // registers before the dropdown disappears.
              onBlur={() => setTimeout(() => setIsLocationFocused(false), 150)}
              maxLength={100}
              accessibilityLabel="Location"
            />
            {location.trim() ? (
              <TouchableOpacity
                onPress={() => {
                  setLocation("");
                  setLocationSuggestions([]);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Clear location"
              >
                <Icon name="close" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {isLocationFocused && locationSuggestions.length > 0 ? (
            <View style={styles.locationDropdown}>
              {locationSuggestions.map((item) => (
                <TouchableOpacity
                  key={`${item.name}-${item.region}`}
                  style={styles.locationOption}
                  onPress={() => {
                    setLocation(item.name);
                    setLocationSuggestions([]);
                    setIsLocationFocused(false);
                  }}
                  activeOpacity={0.85}
                >
                  <Icon name="location-on" size={16} color={theme.colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locationOptionText}>{item.name}</Text>
                    {item.region ? (
                      <Text style={styles.locationOptionRegion}>{item.region}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <View style={styles.locationFooter}>
            <Text style={styles.charCount}>
              {location.length} / 100
            </Text>
          </View>
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

      <HiringNoticeModal
        visible={!!notice}
        type={notice?.type}
        title={notice?.title}
        body={notice?.body}
        primaryLabel={notice?.primaryLabel || "OK"}
        secondaryLabel={notice?.secondaryLabel}
        onPrimary={notice?.onPrimary}
        onSecondary={notice?.onSecondary}
        onClose={() => setNotice(null)}
      />

      {/* Success — non-blocking, contextual actions instead of a native
          Alert.alert. The draft is only cleared once we get here, i.e.
          after the backend has confirmed the post exists. */}
      <HiringNoticeModal
        visible={!!successPost}
        type="success"
        title="Post shared!"
        body="Your post is now visible to your followers."
        primaryLabel="View post"
        secondaryLabel="Done"
        onPrimary={goToPublishedPost}
        onSecondary={finishAfterPublish}
        onClose={finishAfterPublish}
      />
    </KeyboardAvoidingView>
  );
}

// Styles
const createStyles = (theme) => StyleSheet.create({
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
    color: theme.colors.onPrimary,
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
  retryUploadBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
  },
  retryUploadText: {
    color: theme.colors.onPrimary,
    fontSize: 11,
    fontWeight: "900",
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
    color: theme.colors.onPrimary,
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
    color: theme.colors.onPrimary,
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
    borderTopColor: theme.colors.border,
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
  quickActionSymbol: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: "800",
    color: theme.colors.primary,
    minWidth: 14,
    textAlign: "center",
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

  // Location Section
  locationSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  locationContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  locationIconWrapper: {
    marginRight: 12,
  },
  locationInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    paddingVertical: 4,
  },
  locationDropdown: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: -4,
    marginBottom: 12,
    overflow: "hidden",
  },
  locationOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  locationOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  locationOptionRegion: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  locationFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
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

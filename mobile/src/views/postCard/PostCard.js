import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  Pressable,
  Modal,
  ScrollView,
} from "react-native";

import { VideoView, useVideoPlayer } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import { useMutation, useQuery } from "convex/react";
import { api as convexApi } from "../../../convex/_generated/api";

import { api, getFriendlyApiError, socialRequest, viewerRequest } from "../../api/api";
import { useAppTheme } from "../../theme";
import { MentionText } from "./commentUtils";
import AppIcon from "../../icons/AppIcon";

import CommentsSheet from "./CommentsSheet";
import LoginModal from "../Auth/LoginModal";
import CreateJobModal from "../Jobs/MyJobs/CreateJobModal";
import HiringNoticeModal from "../Jobs/HiringNoticeModal";
import { UploadManager } from "../../utils/UploadManager";
import { getUserSession } from "../../utils/userSession";
import { useLanguage } from "../../LanguageContext";
import { isNetworkError } from "../../utils/network";

const { width } = Dimensions.get("window");
const CAPTION_PREVIEW = 120;
const BOTTOM_PANEL_HEIGHT = 148;

function normalizePostMedia(post) {
  const items = Array.isArray(post?.media)
    ? post.media.filter((item) => item?.url)
    : [];
  const normalized = items.map((item) => ({
    ...item,
    fit: item.fit || item.fit_mode || item.contentFit || "cover",
  }));
  if (post?.type === "clip") return normalized.slice(0, 1);
  return normalized.slice(0, 10);
}

const PlayIcon = ({ size = 48 }) => (
  <AppIcon name="play" size={size} color="#fff" filled />
);

function MediaItem({ item, active: isActive, muted: isMuted, onToggleMute, onLike, mediaHeight, paused, onTogglePause, onZoomImage, styles, theme }) {
  const isVideo = item?.type === "video";
  const contentFit = item?.fit === "contain" ? "contain" : "cover";
  const lastTap = useRef(null);

  const player = useVideoPlayer(isVideo ? item?.url : null, (instance) => {
    if (instance) instance.loop = true;
  });

  useEffect(() => {
    if (!player || !isVideo) return;
    player.muted = isMuted;
    if (isActive && !paused) player.play();
    else player.pause();
  }, [isActive, paused, isMuted, player, isVideo]);

  const handleTap = () => {
    const now = Date.now();
    if (lastTap.current && now - lastTap.current < 280) {
      onLike?.();
      return;
    }
    lastTap.current = now;
    setTimeout(() => {
      if (Date.now() - lastTap.current >= 280) {
        if (isVideo) onTogglePause?.();
      }
    }, 280);
  };

  return (
    <Pressable onPress={handleTap} style={[styles.mediaSlide, { height: mediaHeight }]}>
      {isVideo ? (
        <VideoView player={player} style={styles.media} contentFit={contentFit} nativeControls={false} />
      ) : (
        <Pressable onPress={() => onZoomImage?.(item?.url)} style={styles.media}>
          <Image source={{ uri: item?.url }} style={styles.media} resizeMode={contentFit} />
        </Pressable>
      )}

      {isVideo && paused && (
        <View style={styles.pauseOverlay}>
          <View style={styles.pauseCircle}>
            <PlayIcon size={40} />
          </View>
        </View>
      )}

      {isVideo && (
        <TouchableOpacity
          style={styles.muteBtn}
          onPress={onToggleMute}
          activeOpacity={0.85}
          hitSlop={8}
        >
          <AppIcon
            name={isMuted ? "volumeOff" : "volumeUp"}
            size={22}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      )}
    </Pressable>
  );
}

function PostCaption({ caption, username, mentions, onMentionPress, onUsernamePress, styles, theme }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = (caption?.length || 0) > CAPTION_PREVIEW || caption?.includes("\n");

  if (!caption) return null;

  return (
    <View style={styles.captionWrap}>
      <View style={styles.captionLine}>
        <Text style={styles.captionName} onPress={onUsernamePress}>
          {username}
        </Text>
        <View style={styles.captionTextWrap}>
          <MentionText
            text={caption}
            mentions={mentions}
            onMentionPress={onMentionPress}
            style={styles.captionInline}
            mentionStyle={styles.captionMention}
            numberOfLines={2}
            ellipsizeMode="tail"
          />
        </View>
        {isLong && (
          <TouchableOpacity
            onPress={() => setExpanded(true)}
            style={styles.captionMoreBtn}
            hitSlop={8}
          >
            <AppIcon name="dots" size={21} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={expanded} animationType="slide" transparent onRequestClose={() => setExpanded(false)}>
        <View style={styles.captionModalRoot}>
          <View style={styles.captionSheet}>
            <View style={styles.captionSheetHeader}>
              <Text style={styles.captionSheetTitle}>Caption</Text>
              <TouchableOpacity onPress={() => setExpanded(false)} style={styles.captionSheetClose}>
                <AppIcon name="close" size={22} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.captionSheetScroll}>
              <Text style={styles.captionName} onPress={onUsernamePress}>
                {username}
              </Text>
              <MentionText
                text={caption}
                mentions={mentions}
                onMentionPress={onMentionPress}
                style={styles.captionSheetBody}
                mentionStyle={styles.captionMention}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function PostCard({
  post,
  active,
  navigation,
  height,
  showHireButton = true,
  showFollowButton = true,
  preferredAuthActor,
  onPostStateChange,
}) {
  const { theme: liveTheme } = useAppTheme();
  const { language } = useLanguage();
  const styles = useMemo(() => createStyles(liveTheme), [liveTheme]);

  const media = useMemo(() => normalizePostMedia(post), [post]);

  const flatListRef = useRef(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showHireModal, setShowHireModal] = useState(false);
  const [hireNotice, setHireNotice] = useState(null);
  const [hireSubmitting, setHireSubmitting] = useState(false);
  const [videoPaused, setVideoPaused] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);

  const [liked, setLiked] = useState(!!post?.is_liked);
  const [likesCount, setLikesCount] = useState(Number(post?.likes_count) || 0);
  const [commentsCount, setCommentsCount] = useState(Number(post?.comments_count) || 0);
  const [following, setFollowing] = useState(!!post?.is_following);
  const [likeSubmitting, setLikeSubmitting] = useState(false);
  const [followSubmitting, setFollowSubmitting] = useState(false);
  const [muted, setMuted] = useState(true);
  const [captionMentions, setCaptionMentions] = useState([]);
  const postSignal = useQuery(
    convexApi.realtimeEvents.latest,
    post?.id ? { channel: `post:${post.id}` } : "skip"
  );
  const publishRealtimeEvent = useMutation(convexApi.realtimeEvents.publish);

  const CARD_HEIGHT = height ?? 640;
  const MEDIA_HEIGHT = Math.max(260, CARD_HEIGHT - BOTTOM_PANEL_HEIGHT);
  const displayUsername = post?.username || post?.full_name || "user";
  const providerUuid = post?.profile_uuid || post?.uuid || post?.provider_uuid || post?.provider_id;
  const socialAuthActor = preferredAuthActor || (showHireButton ? "viewer" : "provider");

  // ------------------------------------------------------------
  // Effects and handlers
  // ------------------------------------------------------------
  useEffect(() => {
    setLiked(!!post?.is_liked);
    setLikesCount(Number(post?.likes_count) || 0);
    setCommentsCount(Number(post?.comments_count) || 0);
    setFollowing(!!post?.is_following);
  }, [post?.id, post?.is_liked, post?.likes_count, post?.comments_count, post?.is_following]);
  useEffect(() => {
    if (postSignal?.event === "likes_changed" && Number.isFinite(postSignal?.count)) {
      setLikesCount(postSignal.count);
      onPostStateChange?.(post.id, { likes_count: postSignal.count });
    }
  }, [postSignal?._id, postSignal?.count, postSignal?.event, post?.id, onPostStateChange]);

  useEffect(() => {
    if (active) {
      setCurrentMediaIndex(0);
      setVideoPaused(false);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    } else {
      setVideoPaused(true);
    }
  }, [active]);

  useEffect(() => {
    const loadMentions = async () => {
      if (!post?.caption?.includes("@")) return;
      const matches = [...post.caption.matchAll(/@([a-zA-Z0-9_]+)/g)].map((m) => m[1]);
      const unique = [...new Set(matches)];
      const resolved = await Promise.all(
        unique.map(async (username) => {
          try {
            const res = await api.get(`/posts/mentions/provider/${username}`);
            return res?.data?.provider;
          } catch {
            return null;
          }
        })
      );
      setCaptionMentions(resolved.filter(Boolean));
    };
    loadMentions();
  }, [post?.caption]);

  const handleLike = async () => {
    if (likeSubmitting) return;
    const previousLiked = liked;
    const previousCount = Number(likesCount) || 0;
    const optimisticLiked = !previousLiked;
    const optimisticCount = optimisticLiked ? previousCount + 1 : Math.max(0, previousCount - 1);
    setLiked(optimisticLiked);
    setLikesCount(optimisticCount);
    onPostStateChange?.(post.id, { is_liked: optimisticLiked, likes_count: optimisticCount });
    setLikeSubmitting(true);
    try {
      const res = await socialRequest("post", `/posts/${post.id}/like`, undefined, {
        preferredAuthActor: socialAuthActor,
      });
      const likedNow = !!res.data.liked;
      const nextCount = likedNow === optimisticLiked
        ? optimisticCount
        : likedNow
          ? previousCount + 1
          : Math.max(0, previousCount - 1);

      setLiked(likedNow);
      setLikesCount(nextCount);
      onPostStateChange?.(post.id, { is_liked: likedNow, likes_count: nextCount });
      await publishRealtimeEvent({
        channel: `post:${post.id}`,
        event: "likes_changed",
        count: nextCount,
      });
    } catch (err) {
      setLiked(previousLiked);
      setLikesCount(previousCount);
      onPostStateChange?.(post.id, { is_liked: previousLiked, likes_count: previousCount });
      if (err.response?.status === 401 && err.config?.authActor !== "provider") {
        setShowLogin(true);
      }
    } finally {
      setLikeSubmitting(false);
    }
  };

  const handleFollow = async () => {
    if (followSubmitting || !providerUuid) return;
    setFollowSubmitting(true);
    try {
      const res = await socialRequest("post", `/posts/follow/${providerUuid}`, undefined, {
        preferredAuthActor: socialAuthActor,
      });
      setFollowing(!!res.data.following);
      await publishRealtimeEvent({
        channel: `profile:${providerUuid}`,
        event: res.data.following ? "followed" : "unfollowed",
      });
      if (res?.data?.actor_uuid) {
        await publishRealtimeEvent({
          channel: `profile:${res.data.actor_uuid}`,
          event: res.data.following ? "following_added" : "following_removed",
          count: Number(res?.data?.following_count) || 0,
        });
      }
    } catch (err) {
      if (err.response?.status === 401 && err.config?.authActor !== "provider") {
        setShowLogin(true);
      }
    } finally {
      setFollowSubmitting(false);
    }
  };

  const openUserProfile = (uuid) => {
    if (!uuid) return;
    navigation?.navigate("UserProfile", {
      providerId: uuid,
      preferredAuthActor: socialAuthActor,
    });
  };

  const openHireModal = async () => {
    if (!providerUuid) {
      setHireNotice({ type: "error", title: "Provider missing", body: "This post is missing provider information." });
      return;
    }

    const session = await getUserSession();
    if (!session.isLoggedIn) {
      setShowLogin(true);
      return;
    }

    setShowHireModal(true);
  };

  const submitHireRequest = async (payload) => {
    setHireSubmitting(true);
    try {
      const media = payload.images?.length
        ? await UploadManager.startUpload(payload.images, "jobs")
        : [];
      await viewerRequest("post", "/hiring/direct-hire", {
        target_provider_uuid: providerUuid,
        title: payload.title,
        description: payload.description,
        service_type: payload.service_type || post?.service_type || "Direct Hire",
        location: payload.location || "Direct hire",
        availability_required: payload.availability_required,
        scheduled_for: payload.scheduled_for || null,
        availability_notes: payload.availability_notes || null,
        media,
      });

      setShowHireModal(false);
      setHireNotice({ type: "success", title: "Request sent", body: `${displayUsername} will see this in Requests.` });
    } catch (err) {
      const mediaNetworkFailure = payload.images?.length && isNetworkError(err);
      setHireNotice({
        type: "error",
        title: language === "sw" ? "Ombi halikutumwa" : "Could not send request",
        body: mediaNetworkFailure
          ? (language === "sw" ? "Media haijapakiwa kwa sababu ya tatizo la mtandao. Jaribu tena." : "Media upload failed because of connection problem. Try again.")
          : getFriendlyApiError(err, language),
      });
    } finally {
      setHireSubmitting(false);
    }
  };

  const handleMentionPress = async (username, mention) => {
    if (mention?.uuid) {
      openUserProfile(mention.uuid);
      return;
    }
    try {
      const res = await api.get(`/posts/mentions/provider/${username}`);
      openUserProfile(res?.data?.provider?.uuid);
    } catch {
      // ignore
    }
  };

  const renderMediaItem = ({ item, index }) => (
    <MediaItem
      item={item}
      active={active && currentMediaIndex === index}
      muted={muted}
      paused={videoPaused}
      onTogglePause={() => setVideoPaused((p) => !p)}
      onToggleMute={() => setMuted((prev) => !prev)}
      onLike={handleLike}
      onZoomImage={setZoomImage}
      mediaHeight={MEDIA_HEIGHT}
      styles={styles}
      theme={liveTheme}
    />
  );

  const onMediaScroll = useCallback((event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentMediaIndex(index);
    setVideoPaused(false);
  }, []);

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  return (
    <View style={[styles.container, height ? { height } : styles.containerAuto]}>
      <View style={[styles.mediaArea, { height: MEDIA_HEIGHT }]}>
        <FlatList
          ref={flatListRef}
          horizontal
          pagingEnabled
          data={media}
          keyExtractor={(item, idx) => `${post.id}-${idx}`}
          renderItem={renderMediaItem}
          onScroll={onMediaScroll}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
        />

        {media.length > 1 && (
          <View style={styles.mediaCounter}>
            <Text style={styles.mediaCounterText}>
              {currentMediaIndex + 1}/{media.length}
            </Text>
          </View>
        )}

        <LinearGradient
          colors={["rgba(0,0,0,0.75)", "rgba(0,0,0,0.35)", "transparent"]}
          style={styles.topOverlay}
        >
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => openUserProfile(providerUuid)} style={styles.userInfo}>
              <Image
                source={{
                  uri:
                    post?.profile_pic ||
                    `https://ui-avatars.com/api/?name=${displayUsername}&background=0B6B63&color=fff`,
                }}
                style={styles.avatar}
              />
              <View style={styles.userMeta}>
                <Text style={styles.usernameOverlay}>{displayUsername}</Text>
                {!!post?.location && <Text style={styles.location}>{post.location}</Text>}
              </View>
            </TouchableOpacity>

          </View>
        </LinearGradient>
      </View>

      <View style={styles.bottomPanel}>
        <View style={styles.actionsRow}>
          <View style={styles.actionGroup}>
            <TouchableOpacity onPress={handleLike} style={styles.actionBtn} disabled={likeSubmitting}>
              <AppIcon
                name="heart"
                filled={liked}
                size={32}
                color={liked ? liveTheme.colors.primary : liveTheme.colors.text}
              />
            </TouchableOpacity>
            <Text style={[styles.actionCount, liked && styles.actionCountLiked]}>{likesCount}</Text>
          </View>

          <View style={styles.actionGroup}>
            <TouchableOpacity onPress={() => setShowComments(true)} style={styles.actionBtn}>
              <AppIcon name="comment" size={32} color={liveTheme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.actionCount}>{commentsCount}</Text>
          </View>

          {showFollowButton ? (
            <TouchableOpacity
              style={[styles.followBtn, following && styles.followingBtn]}
              onPress={handleFollow}
              disabled={followSubmitting}
            >
              <Text style={[styles.followBtnText, following && styles.followingBtnText]}>
                {following ? "Following" : "Follow"}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.actionSpacer} />
          )}

            {showHireButton ? (
              <TouchableOpacity style={styles.hireBtn} onPress={openHireModal}>
                <Text style={styles.hireBtnText}>Hire Me</Text>
              </TouchableOpacity>
            ) : null}
          </View>

        <PostCaption
          caption={post?.caption}
          username={displayUsername}
          mentions={captionMentions}
          onMentionPress={handleMentionPress}
          onUsernamePress={() => openUserProfile(providerUuid)}
          styles={styles}
          theme={liveTheme}
        />
      </View>

      <CommentsSheet
        visible={showComments}
        onClose={() => setShowComments(false)}
        postId={post?.id}
        navigation={navigation}
        postProviderUuid={providerUuid}
        postUsername={post?.username}
        postProfilePic={post?.profile_pic}
        onCommentAdded={() => setCommentsCount((prev) => prev + 1)}
        onCommentDeleted={(count) =>
          setCommentsCount((prev) => Math.max(0, (Number(prev) || 0) - count))
        }
        onRequireLogin={() => setShowLogin(true)}
        preferredAuthActor={socialAuthActor}
      />

      <LoginModal
        visible={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={async ({ session }) => {
          console.log("[POST CARD] user session after login", {
            uuid: session?.profile?.uuid || session?.user?.uuid || null,
            email: session?.email || null,
            hasToken: !!session?.token,
          });
          setShowLogin(false);
        }}
      />

      <CreateJobModal
        visible={showHireModal}
        onClose={() => setShowHireModal(false)}
        mode="direct"
        provider={{ uuid: providerUuid, username: displayUsername }}
        onSubmit={submitHireRequest}
        submitting={hireSubmitting}
      />
      <HiringNoticeModal
        visible={!!hireNotice}
        type={hireNotice?.type}
        title={hireNotice?.title}
        body={hireNotice?.body}
        onPrimary={() => setHireNotice(null)}
        onClose={() => setHireNotice(null)}
      />

      <Modal visible={!!zoomImage} transparent animationType="fade" onRequestClose={() => setZoomImage(null)}>
        <View style={styles.zoomRoot}>
          <TouchableOpacity style={styles.zoomClose} onPress={() => setZoomImage(null)}>
            <AppIcon name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <ScrollView
            style={styles.zoomScroll}
            contentContainerStyle={styles.zoomContent}
            maximumZoomScale={4}
            minimumZoomScale={1}
            centerContent
          >
            {zoomImage ? <Image source={{ uri: zoomImage }} style={styles.zoomImage} resizeMode="contain" /> : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ------------------------------------------------------------
// Styles creator (pure function, no direct theme reference)
// ------------------------------------------------------------
const createStyles = (theme) =>
  StyleSheet.create({
    container: { width, backgroundColor: theme.colors.surface },
    containerAuto: { minHeight: 640 },

    mediaArea: { width: "100%", backgroundColor: theme.colors.media, position: "relative" },
    mediaSlide: { width, backgroundColor: theme.colors.media },
    media: { width: "100%", height: "100%" },

    pauseOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.25)",
    },
    pauseCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      alignItems: "center",
      paddingLeft: 4,
    },

    muteBtn: {
      position: "absolute",
      left: 14,
      bottom: 14,
      backgroundColor: "rgba(0,0,0,0.55)",
      borderRadius: 999,
      padding: 10,
    },

    mediaCounter: {
      position: "absolute",
      bottom: 14,
      right: 14,
      backgroundColor: "rgba(0,0,0,0.6)",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    mediaCounterText: { color: "#fff", fontSize: 13, fontWeight: "600" },

    topOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      paddingTop: 12,
      paddingHorizontal: 14,
      paddingBottom: 40,
    },
    topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    userInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
    avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 10 },
    userMeta: { flex: 1 },
    usernameOverlay: { color: "#fff", fontSize: 15, fontWeight: "800" },
    location: { color: "#e2e8f0", fontSize: 12, marginTop: 2 },

    hireBtn: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
    },
    hireBtnText: { color: theme.colors.onPrimary, fontWeight: "700", fontSize: 13 },

    zoomRoot: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)" },
    zoomScroll: { flex: 1 },
    zoomContent: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
    zoomImage: { width, height: "100%" },
    zoomClose: {
      position: "absolute",
      top: 44,
      right: 18,
      zIndex: 2,
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: "rgba(255,255,255,0.16)",
      alignItems: "center",
      justifyContent: "center",
    },

    bottomPanel: {
      minHeight: BOTTOM_PANEL_HEIGHT,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 14,
    },

    actionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 20,
      marginBottom: 8,
    },
    actionGroup: { alignItems: "center" },
    actionBtn: { padding: 4 },
    actionCount: { marginTop: 2, fontSize: 13, fontWeight: "700", color: theme.colors.text },
    actionCountLiked: { color: theme.colors.primary },

    followBtn: {
      marginLeft: "auto",
      borderWidth: 1.5,
      borderColor: theme.colors.text,
      borderRadius: 999,
      paddingHorizontal: 18,
      paddingVertical: 8,
    },
    followingBtn: { backgroundColor: theme.colors.text, borderColor: theme.colors.text },
    followBtnText: { color: theme.colors.text, fontWeight: "800", fontSize: 13 },
    followingBtnText: { color: theme.colors.bg },
    actionSpacer: { marginLeft: "auto" },

    captionWrap: { marginTop: 4, minHeight: 44 },
    captionLine: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    captionTextWrap: {
      flex: 1,
      minWidth: 0,
      marginLeft: 6,
    },
    captionInline: { color: theme.colors.text, fontSize: 14.5, lineHeight: 20 },
    captionName: { fontWeight: "800", color: theme.colors.text },
    captionMention: { color: theme.colors.primary, fontWeight: "800" },
    captionMoreBtn: {
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 4,
      marginTop: -2,
    },

    captionModalRoot: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: theme.colors.overlay,
    },
    captionSheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      maxHeight: "70%",
      minHeight: "40%",
    },
    captionSheetHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 18,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    captionSheetTitle: { fontSize: 17, fontWeight: "800", color: theme.colors.text },
    captionSheetClose: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    captionSheetScroll: { padding: 18, paddingBottom: 40 },
    captionSheetBody: { marginTop: 8, fontSize: 15, lineHeight: 24, color: theme.colors.text },
  });

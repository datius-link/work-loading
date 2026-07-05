import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, getFriendlyApiError, socialRequest } from "../../api/api";
import { useAppTheme } from "../../theme";
import AppIcon from "../../icons/AppIcon";
import { CommentBody } from "./commentUtils";
import { getUserSession } from "../../utils/userSession";
import { useLanguage } from "../../LanguageContext";

function avatarFor(username, profilePic) {
  if (profilePic) return profilePic;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    username || "U"
  )}&background=0B6B63&color=fff`;
}

function flattenReplies(comment) {
  const output = [];
  const walk = (items = []) => {
    items.forEach((item) => {
      output.push({ ...item, replies: [] });
      if (Array.isArray(item.replies) && item.replies.length) walk(item.replies);
    });
  };
  walk(comment?.replies || []);
  return output;
}

function CommentRow({
  comment,
  depth = 0,
  onAuthorPress,
  onMentionPress,
  onReply,
  onOpenActions,
  styles,
  currentProviderUuid,
  currentViewerUuid,
}) {
  const isProviderAuthor =
    comment.author_type === "provider" ||
    comment.author_type === "service_provider" ||
    comment.author_type === "user";
  const isViewerAuthor =
    comment.author_type === "viewer" ||
    comment.author_type === "light_user" ||
    comment.author_type === "user";
  const canDelete =
    (isProviderAuthor &&
      currentProviderUuid &&
      comment.author_id === currentProviderUuid) ||
    (isViewerAuthor &&
      currentViewerUuid &&
      comment.author_id === currentViewerUuid);

  const replies = depth === 0 ? flattenReplies(comment) : [];
  const targetUsername = comment.reply_to_username || comment.parent_username;

  return (
    <View style={depth > 0 ? styles.replyBlock : styles.commentBlock}>
      {/* Avatar column */}
      <View style={styles.avatarCol}>
        <TouchableOpacity activeOpacity={0.82} onPress={() => onAuthorPress(comment)}>
          <Image
            source={{ uri: avatarFor(comment.username, comment.profile_pic) }}
            style={depth > 0 ? styles.avatarSmall : styles.avatar}
          />
        </TouchableOpacity>
        {/* Vertical rail for parent comments that have replies */}
        {depth === 0 && replies.length > 0 ? (
          <View style={styles.threadLine} />
        ) : null}
      </View>

      {/* Content column */}
      <Pressable
        style={styles.commentMain}
        onLongPress={() => onOpenActions(comment, canDelete)}
        delayLongPress={280}
      >
        {/* username + time on same row */}
        <View style={styles.nameRow}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => onAuthorPress(comment)}>
            <Text style={styles.username}>{comment.username || "user"}</Text>
          </TouchableOpacity>
          {!!targetUsername && depth > 0 ? (
            <Text style={styles.replyArrow}>{" \u203A "}</Text>
          ) : null}
          {!!targetUsername && depth > 0 ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                onMentionPress(targetUsername, {
                  username: targetUsername,
                  provider_uuid: comment.reply_to_provider_uuid || comment.reply_to_profile_uuid,
                })
              }
            >
              <Text style={styles.replyTarget}>{targetUsername}</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={styles.time}>{comment.time_text || "now"}</Text>
        </View>

        {/* Comment body */}
        <CommentBody
          text={comment.text}
          mentions={comment.mentions}
          onMentionPress={onMentionPress}
          style={styles.commentText}
          mentionStyle={styles.commentMention}
        />

        {/* Actions row */}
        <View style={styles.commentActions}>
          <TouchableOpacity
            style={styles.replyBtnWrap}
            onPress={() => onReply(comment)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.replyBtn}>Reply</Text>
          </TouchableOpacity>
          {depth === 0 && replies.length > 0 ? (
            <Text style={styles.replyCount}>
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </Text>
          ) : null}
        </View>

        {/* Flat replies — all at depth=1, no further nesting */}
        {replies.length > 0 ? (
          <View style={styles.repliesGroup}>
            {replies.map((reply) => (
              <CommentRow
                key={reply.id}
                comment={reply}
                depth={1}
                onAuthorPress={onAuthorPress}
                onMentionPress={onMentionPress}
                onReply={onReply}
                onOpenActions={onOpenActions}
                styles={styles}
                currentProviderUuid={currentProviderUuid}
                currentViewerUuid={currentViewerUuid}
              />
            ))}
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

export default function CommentsSheet({
  visible,
  onClose,
  postId,
  navigation,
  onCommentAdded,
  onCommentDeleted,
  onRequireLogin,
  postProviderUuid,
  postUsername,
  postProfilePic,
  preferredAuthActor = "viewer",
}) {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const styles = createStyles(theme);

  const [comments, setComments] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteMenuComment, setDeleteMenuComment] = useState(null);
  const draftPostIdRef = useRef(postId);
  const [sending, setSending] = useState(false);

  const [currentProviderUuid, setCurrentProviderUuid] = useState(null);
  const [currentViewerUuid, setCurrentViewerUuid] = useState(null);
  const [currentUsername, setCurrentUsername] = useState("");
  const [currentProfilePic, setCurrentProfilePic] = useState("");

  const loadCurrentUser = useCallback(async () => {
    try {
      const loadProvider = async () => {
        try {
          const token = await AsyncStorage.getItem("token");
          if (!token) return false;
          const res = await api.get("/service-provider/me");
          const provider = res?.data?.provider;
          if (provider) {
            setCurrentProviderUuid(provider.provider_uuid || provider.uuid || null);
            setCurrentViewerUuid(null);
            setCurrentUsername(provider.username || provider.full_name || "Me");
            setCurrentProfilePic(provider.profilePic || provider.profile_pic || "");
            return true;
          }
        } catch {
          return false;
        }
        return false;
      };

      const loadViewer = async () => {
        const session = await getUserSession();
        if (!session.isLoggedIn || (!session.user && !session.profile)) return false;
        const viewer = session.user || session.profile;
        setCurrentProviderUuid(null);
        setCurrentViewerUuid(viewer?.uuid || null);
        setCurrentUsername(viewer?.username || viewer?.email || "Me");
        setCurrentProfilePic(viewer?.profile_pic || viewer?.profilePic || "");
        return true;
      };

      if (preferredAuthActor === "provider") {
        if (await loadProvider()) return;
        await loadViewer();
      } else {
        if (await loadViewer()) return;
        await loadProvider();
      }
    } catch {
      setCurrentUsername("Me");
      setCurrentProfilePic("");
    }
  }, [preferredAuthActor]);

  const fetchComments = useCallback(async () => {
    if (!postId) return;
    try {
      setLoading(true);
      setError("");
      const res = await api.get(`/posts/${postId}/comments`);
      setComments(res?.data?.comments || []);
      setTotalCount(Number(res?.data?.total_count) || 0);
    } catch (err) {
      console.log("Comments error:", err?.response?.data || err?.message);
      setError(getFriendlyApiError(err, language));
      setComments([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  if (postId !== draftPostIdRef.current) {
    draftPostIdRef.current = postId;
    setReplyingTo(null);
    setComment("");
  }

  useEffect(() => {
    if (visible && postId) {
      loadCurrentUser();
      fetchComments();
    }
  }, [visible, postId, loadCurrentUser, fetchComments]);

  const sendComment = async () => {
    if (!comment.trim() || !postId || sending) return;
    try {
      setSending(true);
      const payload = { text: comment.trim() };
      if (replyingTo?.id) payload.parent_id = replyingTo.id;
      await socialRequest("post", `/posts/${postId}/comments`, payload, {
        preferredAuthActor,
      });
      await fetchComments();
      setComment("");
      setReplyingTo(null);
      onCommentAdded?.();
    } catch (err) {
      if (err.response?.status === 401 && err.config?.authActor !== "provider") {
        onRequireLogin?.();
        return;
      }
      console.log("Send comment error:", err?.response?.data || err?.message);
    } finally {
      setSending(false);
    }
  };

  const confirmDeleteComment = async () => {
    if (!pendingDelete?.id || !postId) return;
    try {
      const res = await socialRequest(
        "delete",
        `/posts/${postId}/comments/${pendingDelete.id}`,
        undefined,
        { preferredAuthActor }
      );
      setPendingDelete(null);
      onCommentDeleted?.(Number(res?.data?.deleted_count) || 1);
      await fetchComments();
    } catch (err) {
      setPendingDelete(null);
      if (err.response?.status === 401 && err.config?.authActor !== "provider") {
        onRequireLogin?.();
        return;
      }
      setError(getFriendlyApiError(err, language));
    }
  };

  const openUserProfile = async (providerUuid, username) => {
    onClose?.();
    if (providerUuid) {
      navigation?.navigate("UserProfile", { providerId: providerUuid, preferredAuthActor });
      return;
    }
    if (!username) return;
    try {
      const res = await api.get(`/posts/mentions/provider/${username}`);
      const uuid = res?.data?.provider?.provider_uuid || res?.data?.provider?.uuid;
      if (uuid) {
        navigation?.navigate("UserProfile", { providerId: uuid, preferredAuthActor });
      }
    } catch {
      console.log("Professional profile not found for", username);
    }
  };

  const handleAuthorPress = (item) => {
    const isProviderAuthor =
      item.author_type === "provider" ||
      item.author_type === "service_provider" ||
      item.author_type === "user";
    if (isProviderAuthor) {
      openUserProfile(item.author_id, item.username);
      return;
    }
    if (item.author_id) {
      onClose?.();
      navigation?.navigate("UserProfile", { uuid: item.author_id });
    }
  };

  const handleMentionPress = async (username, mention) => {
    if (!username) return;
    await openUserProfile(mention?.provider_uuid || mention?.uuid, username);
  };

  // Long-press handler: if owner show delete popup, otherwise do nothing
  const handleOpenActions = (commentItem, canDelete) => {
    if (canDelete) {
      setDeleteMenuComment(commentItem);
    }
  };

  const inputAvatar = avatarFor(currentUsername || "Me", currentProfilePic);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Same fix as LoginModal/CreateJobModal: a Modal's Android window
         doesn't get the Activity's adjustResize behavior for free, so this
         needs an explicit "height" behavior on Android too, or the keyboard
         just covers the comment input instead of the sheet lifting. */}
      <KeyboardAvoidingView
        style={styles.modalRoot}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {totalCount ? `${totalCount} comments` : "Comments"}
            </Text>
          </View>

          {/* Comments list */}
          <View style={styles.contentArea}>
            {loading ? (
              <View style={styles.loader}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : error ? (
              <View style={styles.loader}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={fetchComments} style={styles.retryBtn}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {comments.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <View style={styles.emptyIcon}>
                      <AppIcon name="comment" size={26} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.emptyTitle}>{"Start the conversation"}</Text>
                    <Text style={styles.emptyText}>{"No comments yet. Be the first!"}</Text>
                  </View>
                ) : (
                  comments.map((item) => (
                    <CommentRow
                      key={item.id}
                      comment={item}
                      onAuthorPress={handleAuthorPress}
                      onMentionPress={handleMentionPress}
                      onReply={setReplyingTo}
                      onOpenActions={handleOpenActions}
                      styles={styles}
                      currentProviderUuid={currentProviderUuid}
                      currentViewerUuid={currentViewerUuid}
                    />
                  ))
                )}
              </ScrollView>
            )}
          </View>

          {/* Input bar */}
          <View style={styles.inputWrapper}>
            {!!replyingTo && (
              <View style={styles.replyingBox}>
                <Text style={styles.replyingText}>
                  {"Reply to "}
                  <Text style={styles.replyingName}>{"@" + (replyingTo.username || "user")}</Text>
                </Text>
                <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={8}>
                  <AppIcon name="close" size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.inputRow}>
              <Image source={{ uri: inputAvatar }} style={styles.inputAvatar} />
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder={currentUsername ? `Comment as ${currentUsername}` : "Write a comment"}
                placeholderTextColor={theme.colors.textMuted}
                style={styles.input}
                multiline
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
                onPress={sendComment}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color={theme.colors.onPrimary} size="small" />
                ) : (
                  <AppIcon name="send" size={20} color={theme.colors.onPrimary} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Delete comment popup — shown on long press (owner only) */}
      <Modal
        visible={!!deleteMenuComment}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteMenuComment(null)}
      >
        <Pressable style={styles.deleteOverlay} onPress={() => setDeleteMenuComment(null)}>
          <Pressable style={styles.deletePopup}>
            <TouchableOpacity
              style={styles.deletePopupRow}
              activeOpacity={0.7}
              onPress={() => {
                const c = deleteMenuComment;
                setDeleteMenuComment(null);
                setPendingDelete(c);
              }}
            >
              <AppIcon name="trash" size={18} color={theme.colors.danger} />
              <Text style={styles.deletePopupText}>{"Delete comment"}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete confirmation bottom sheet */}
      <Modal
        visible={!!pendingDelete}
        transparent
        animationType="slide"
        onRequestClose={() => setPendingDelete(null)}
      >
        <Pressable style={styles.confirmOverlay} onPress={() => setPendingDelete(null)}>
          <Pressable style={[styles.confirmSheet, { paddingBottom: insets.bottom + 8 }]}>
            <View style={styles.confirmHandle} />
            <View style={styles.confirmRow}>
              <View style={styles.confirmIconSmall}>
                <AppIcon name="trash" size={16} color={theme.colors.onPrimary} />
              </View>
              <View style={styles.confirmTextGroup}>
                <Text style={styles.confirmTitle}>{"Delete comment?"}</Text>
                <Text style={styles.confirmBody}>{"This will also remove all replies."}</Text>
              </View>
            </View>
            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setPendingDelete(null)}
                activeOpacity={0.85}
              >
                <Text style={styles.confirmCancelText}>{"Cancel"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={confirmDeleteComment}
                activeOpacity={0.85}
              >
                <Text style={styles.confirmDeleteText}>{"Delete"}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    /* ── Modal shell ── */
    modalRoot: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.overlay,
    },
    sheet: {
      flex: 1,
      marginTop: 54,
      backgroundColor: theme.colors.bgElevated || theme.colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: theme.colors.border,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: -6 },
      elevation: 18,
    },
    handle: {
      alignSelf: "center",
      width: 46,
      height: 5,
      borderRadius: 999,
      backgroundColor: theme.colors.textMuted,
      opacity: 0.36,
      marginTop: 9,
      marginBottom: 8,
    },

    /* ── Header ── */
    header: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 18,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.text,
    },

    /* ── Content area ── */
    contentArea: {
      flex: 1,
      minHeight: 0,
    },
    list: { flex: 1 },
    listContent: { paddingTop: 10, paddingBottom: 24 },

    /* ── Loading / error / empty ── */
    loader: {
      flex: 1,
      minHeight: 260,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 24,
    },
    errorText: {
      color: theme.colors.danger,
      textAlign: "center",
      marginBottom: 12,
      fontWeight: "700",
    },
    retryBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: theme.colors.primarySoft,
    },
    retryText: { color: theme.colors.primary, fontWeight: "900" },
    emptyBox: {
      minHeight: 260,
      paddingHorizontal: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primarySoft,
      marginBottom: 14,
    },
    emptyTitle: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: "900",
      marginBottom: 6,
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: "700",
      textAlign: "center",
      lineHeight: 20,
    },

    /* ── Comment row ── */
    commentBlock: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    // Replies: indented under parent, share the same thread line
    replyBlock: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingLeft: 0,
      paddingRight: 0,
      paddingTop: 8,
      paddingBottom: 2,
    },

    /* Avatar column — fixed width so content lines up */
    avatarCol: {
      width: 48,
      alignItems: "center",
    },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: theme.colors.surfaceSoft,
    },
    avatarSmall: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.colors.surfaceSoft,
    },
    // Vertical thread line that grows below the parent avatar
    threadLine: {
      flex: 1,
      width: 1.5,
      marginTop: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      minHeight: 12,
    },

    /* Content column */
    commentMain: {
      flex: 1,
      minWidth: 0,
      paddingRight: 16,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 4,
      marginBottom: 3,
    },
    username: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.textSecondary,
    },
    replyArrow: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    replyTarget: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.textSecondary,
    },
    time: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: "500",
    },
    commentText: {
      color: theme.colors.text,
      fontSize: 14,
      lineHeight: 20,
    },
    commentMention: {
      color: theme.colors.primary,
      fontWeight: "700",
    },
    commentActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingTop: 6,
    },
    replyBtnWrap: {
      justifyContent: "center",
    },
    replyBtn: {
      color: theme.colors.textMuted,
      fontWeight: "700",
      fontSize: 12,
    },
    replyCount: {
      color: theme.colors.textMuted,
      fontWeight: "600",
      fontSize: 12,
    },
    repliesGroup: {
      marginTop: 4,
    },

    /* ── Input bar ── */
    inputWrapper: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      paddingHorizontal: 14,
      paddingTop: 8,
      paddingBottom: 8,
      backgroundColor: theme.colors.bgElevated || theme.colors.surface,
    },
    replyingBox: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      backgroundColor: theme.colors.primarySoft,
    },
    replyingText: {
      color: theme.colors.textMuted,
      fontWeight: "600",
      fontSize: 12,
    },
    replyingName: {
      color: theme.colors.primary,
      fontWeight: "700",
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 10,
      paddingHorizontal: 4,
    },
    inputAvatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.colors.surfaceSoft,
    },
    input: {
      flex: 1,
      minHeight: 40,
      maxHeight: 110,
      backgroundColor: theme.colors.surfaceSoft,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 10,
      fontSize: 14,
      color: theme.colors.text,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    sendBtnDisabled: { opacity: 0.6 },

    /* ── Long-press delete popup ── */
    deleteOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "center",
      alignItems: "center",
    },
    deletePopup: {
      backgroundColor: theme.colors.bgElevated || theme.colors.surface,
      borderRadius: 12,
      overflow: "hidden",
      minWidth: 200,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    deletePopupRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 18,
      paddingVertical: 16,
    },
    deletePopupText: {
      color: theme.colors.danger,
      fontSize: 15,
      fontWeight: "700",
    },

    /* ── Delete confirmation bottom sheet ── */
    confirmOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    confirmSheet: {
      backgroundColor: theme.colors.bgElevated || theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: 0,
      borderColor: theme.colors.border,
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 18,
      elevation: 16,
    },
    confirmHandle: {
      alignSelf: "center",
      width: 38,
      height: 4,
      borderRadius: 999,
      backgroundColor: theme.colors.textMuted,
      opacity: 0.35,
      marginBottom: 16,
    },
    confirmRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 18,
    },
    confirmIconSmall: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.danger,
    },
    confirmTextGroup: { flex: 1 },
    confirmTitle: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: "800",
      marginBottom: 2,
    },
    confirmBody: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: "500",
      lineHeight: 18,
    },
    confirmBtnRow: {
      flexDirection: "row",
      gap: 10,
    },
    confirmCancelBtn: {
      flex: 1,
      height: 46,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    confirmCancelText: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: "700",
    },
    confirmDeleteBtn: {
      flex: 1,
      height: 46,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.danger,
    },
    confirmDeleteText: {
      color: theme.colors.onPrimary,
      fontSize: 15,
      fontWeight: "800",
    },
  });
import React, { useCallback, useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
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

import { api, viewerRequest } from "../../api/api";
import { useAppTheme } from "../../theme";
import AppIcon from "../../icons/AppIcon";
import { CommentBody } from "./commentUtils";

function avatarFor(username, profilePic) {
  if (profilePic) return profilePic;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    username || "U"
  )}&background=0B6B63&color=fff`;
}

function CommentRow({
  comment,
  depth = 0,
  onAuthorPress,
  onMentionPress,
  onReply,
  onDelete,
  styles,
  theme,
  currentProviderUuid,
  currentViewerUuid,
}) {
  const canDelete =
    (comment.author_type === "provider" &&
      currentProviderUuid &&
      comment.author_id === currentProviderUuid) ||
    (comment.author_type === "viewer" &&
      currentViewerUuid &&
      comment.author_id === currentViewerUuid);

  return (
    <View style={[styles.commentBlock, depth > 0 && styles.replyBlock]}>
      <View style={styles.commentItem}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => onAuthorPress(comment)}>
          <Image
            source={{ uri: avatarFor(comment.username, comment.profile_pic) }}
            style={depth > 0 ? styles.avatarSmall : styles.avatar}
          />
        </TouchableOpacity>

        <View style={styles.commentContent}>
          <View style={styles.nameRow}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => onAuthorPress(comment)}>
              <Text style={styles.username}>{comment.username || "user"}</Text>
            </TouchableOpacity>
            <Text style={styles.dot}>{"\u00B7"}</Text>
            <Text style={styles.time}>{comment.time_text || "now"}</Text>
            {canDelete && (
              <TouchableOpacity
                onPress={() => onDelete(comment)}
                style={styles.deleteBtn}
                hitSlop={8}
              >
                <AppIcon name="trash" size={15} color={theme.colors.danger} />
              </TouchableOpacity>
            )}
          </View>

          {!!comment.reply_to_username && (
            <Text style={styles.replyingTo}>
              Replying to{" "}
              <Text
                style={styles.replyingToUser}
                onPress={() =>
                  onMentionPress(comment.reply_to_username, {
                    username: comment.reply_to_username,
                    provider_uuid: comment.reply_to_provider_uuid,
                  })
                }
              >
                @{comment.reply_to_username}
              </Text>
            </Text>
          )}

          <CommentBody
            text={comment.text}
            mentions={comment.mentions}
            onMentionPress={onMentionPress}
            style={styles.commentText}
            mentionStyle={styles.commentMention}
          />

          <TouchableOpacity style={styles.replyBtnWrap} onPress={() => onReply(comment)}>
            <Text style={styles.replyBtn}>Reply</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!!comment.replies?.length &&
        comment.replies.map((reply) => (
          <CommentRow
            key={reply.id}
            comment={reply}
            depth={Math.min(depth + 1, 1)}
            onAuthorPress={onAuthorPress}
            onMentionPress={onMentionPress}
            onReply={onReply}
            onDelete={onDelete}
            styles={styles}
            theme={theme}
            currentProviderUuid={currentProviderUuid}
            currentViewerUuid={currentViewerUuid}
          />
        ))}
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
}) {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  const [comments, setComments] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [sending, setSending] = useState(false);

  const [currentProviderUuid, setCurrentProviderUuid] = useState(null);
  const [currentViewerUuid, setCurrentViewerUuid] = useState(null);
  const [currentUsername, setCurrentUsername] = useState("");
  const [currentProfilePic, setCurrentProfilePic] = useState("");

  const loadCurrentUser = useCallback(async () => {
    try {
      const savedViewer = await AsyncStorage.getItem("viewer_user");
      if (savedViewer) {
        const viewer = JSON.parse(savedViewer);
        setCurrentViewerUuid(viewer?.uuid || null);
        setCurrentUsername(viewer?.username || viewer?.email || "Me");
        setCurrentProfilePic(viewer?.profile_pic || viewer?.profilePic || "");
        return;
      }

      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await api.get("/service-provider/me");
      const provider = res?.data?.provider;
      if (!provider) return;

      setCurrentProviderUuid(provider.provider_uuid || null);
      setCurrentUsername(provider.username || "");
      setCurrentProfilePic(provider.profilePic || provider.profile_pic || "");
    } catch {
      setCurrentUsername("Me");
      setCurrentProfilePic("");
    }
  }, []);

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
      setError(err?.response?.data?.message || "Could not load comments");
      setComments([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (visible && postId) {
      setReplyingTo(null);
      setComment("");
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

      const providerToken = await AsyncStorage.getItem("token");
      if (providerToken) {
        await api.post(`/posts/${postId}/comments`, payload);
      } else {
        await viewerRequest("post", `/posts/${postId}/comments`, payload);
      }

      await fetchComments();
      setComment("");
      setReplyingTo(null);
      onCommentAdded?.();
    } catch (err) {
      if (err.response?.status === 401) {
        onRequireLogin?.();
        return;
      }
      console.log("Send comment error:", err?.response?.data || err?.message);
    } finally {
      setSending(false);
    }
  };

  const deleteComment = async (item) => {
    if (!item?.id || !postId) return;

    Alert.alert("Delete comment", "Delete this comment and all replies under it?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const providerToken = await AsyncStorage.getItem("token");
            if (providerToken) {
              const res = await api.delete(`/posts/${postId}/comments/${item.id}`);
              onCommentDeleted?.(Number(res?.data?.deleted_count) || 1);
            } else {
              const res = await viewerRequest(
                "delete",
                `/posts/${postId}/comments/${item.id}`
              );
              onCommentDeleted?.(Number(res?.data?.deleted_count) || 1);
            }
            await fetchComments();
          } catch (err) {
            if (err.response?.status === 401) {
              onRequireLogin?.();
              return;
            }
            Alert.alert(
              "Could not delete",
              err?.response?.data?.message || "Please try again."
            );
          }
        },
      },
    ]);
  };

  const openProviderProfile = async (providerUuid, username) => {
    onClose?.();

    if (providerUuid) {
      navigation?.navigate("ProviderProfile", { providerId: providerUuid });
      return;
    }

    if (!username) return;

    try {
      const res = await api.get(`/posts/mentions/provider/${username}`);
      const uuid = res?.data?.provider?.provider_uuid;
      if (uuid) navigation?.navigate("ProviderProfile", { providerId: uuid });
    } catch {
      console.log("Provider profile not found for", username);
    }
  };

  const handleAuthorPress = (item) => {
    const providerUuid = item.author_type === "provider" ? item.author_id : null;
    openProviderProfile(providerUuid, item.username);
  };

  const handleMentionPress = async (username, mention) => {
    if (!username) return;
    await openProviderProfile(mention?.provider_uuid, username);
  };

  const inputAvatar = avatarFor(currentUsername || "Me", currentProfilePic);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalRoot}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>
              {totalCount ? `${totalCount} comments` : "Comments"}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <AppIcon name="close" size={24} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

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
                  <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
                </View>
              ) : (
                comments.map((item) => (
                  <CommentRow
                    key={item.id}
                    comment={item}
                    onAuthorPress={handleAuthorPress}
                    onMentionPress={handleMentionPress}
                    onReply={setReplyingTo}
                    onDelete={deleteComment}
                    styles={styles}
                    theme={theme}
                    currentProviderUuid={currentProviderUuid}
                    currentViewerUuid={currentViewerUuid}
                  />
                ))
              )}
            </ScrollView>
          )}

          <View style={styles.inputWrapper}>
            {!!replyingTo && (
              <View style={styles.replyingBox}>
                <Text style={styles.replyingText}>Replying to {replyingTo.username}</Text>
                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                  <AppIcon name="close" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputRow}>
              <Image source={{ uri: inputAvatar }} style={styles.inputAvatar} />
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder={
                  currentUsername
                    ? `Comment as ${currentUsername}...`
                    : "Write a comment..."
                }
                placeholderTextColor={theme.colors.textMuted}
                style={styles.input}
                multiline
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
                onPressIn={sendComment}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color={theme.colors.onPrimary} size="small" />
                ) : (
                  <AppIcon name="send" size={22} color={theme.colors.onPrimary} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (theme) => StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: "88%",
    minHeight: "58%",
  },
  handle: {
    alignSelf: "center",
    width: 70,
    height: 5,
    borderRadius: 999,
    backgroundColor: theme.colors.border,
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.text,
  },
  closeBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    flexGrow: 0,
    flexShrink: 1,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 24,
  },
  loader: {
    minHeight: 220,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  errorText: {
    color: theme.colors.danger,
    textAlign: "center",
    marginBottom: 12,
    fontWeight: "600",
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.primarySoft,
  },
  retryText: {
    color: theme.colors.primary,
    fontWeight: "800",
  },
  emptyBox: {
    paddingVertical: 48,
    alignItems: "center",
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  commentBlock: {
    paddingHorizontal: 16,
  },
  replyBlock: {
    marginLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.border,
    paddingLeft: 8,
  },
  commentItem: {
    flexDirection: "row",
    paddingVertical: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: theme.colors.surfaceSoft,
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    backgroundColor: theme.colors.surfaceSoft,
  },
  commentContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.colors.text,
  },
  dot: {
    marginHorizontal: 6,
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
  time: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  deleteBtn: {
    marginLeft: "auto",
    width: 30,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  replyingTo: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  replyingToUser: {
    color: theme.colors.primary,
    fontWeight: "800",
  },
  commentText: {
    color: theme.colors.text,
  },
  commentMention: {
    color: theme.colors.primary,
  },
  replyBtnWrap: {
    marginTop: 8,
  },
  replyBtn: {
    color: theme.colors.textMuted,
    fontWeight: "700",
    fontSize: 13,
  },
  inputWrapper: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingTop: 10,
    backgroundColor: theme.colors.surface,
  },
  replyingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  replyingText: {
    color: theme.colors.textSecondary,
    fontWeight: "700",
    fontSize: 13,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  inputAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceSoft,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    color: theme.colors.text,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    opacity: 0.7,
  },
});

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppIcon from "../../../../icons/AppIcon";
import { useAppTheme } from "../../../../theme";
import { formatRelativeDate } from "../../../Jobs/jobDate";

function avatarUri(u) {
  if (u?.profile_pic) return u.profile_pic;
  const name = encodeURIComponent(u?.username || u?.full_name || "U");
  return `https://ui-avatars.com/api/?name=${name}&background=0B6B63&color=fff&bold=true&rounded=true`;
}

export default function WorkspaceChat({ messages, myUuid, sending, onSend }) {
  const { theme } = useAppTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const flatRef = useRef(null);
  const [msgText, setMsgText] = useState("");
  const [inputFocused, setInputFocused] = useState(false);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messages.length) {
      const t = setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [messages]);

  const handleSend = () => {
    const text = msgText.trim();
    if (!text || sending) return;
    onSend(text);
    setMsgText("");
  };

  const canSend = msgText.trim().length > 0 && !sending;

  // Bottom padding: input bar lifts naturally via KeyboardAvoidingView
  const inputBarPb = insets.bottom > 0 ? insets.bottom : 8;
  const shellStyle = isWide ? s.desktopShell : s.mobileShell;
  const bubbleLimit = isWide ? 620 : "72%";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 110 : 0}
    >
      <View style={shellStyle}>
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={[s.listContent, isWide && s.listContentWide]}
          showsVerticalScrollIndicator={Platform.OS === "web"}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <View style={s.emptyIcon}>
                <AppIcon name="message" size={28} color={theme.colors.primary} />
              </View>
              <Text style={s.emptyTitle}>Start the conversation</Text>
              <Text style={s.emptySub}>Messages between you and the other party appear here.</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const mine = item.sender_uuid === myUuid;
            const prevItem = messages[index - 1];
            const sameSenderAsPrev = prevItem && prevItem.sender_uuid === item.sender_uuid;
            const showAvatar = !mine && !sameSenderAsPrev;

            return (
              <View style={[s.row, mine ? s.rowMine : s.rowTheirs, sameSenderAsPrev && s.rowGrouped]}>
                {/* Avatar area — always takes up space so bubbles align */}
                {!mine && (
                  <View style={s.avatarCol}>
                    {showAvatar ? (
                      <Image source={{ uri: avatarUri(item.sender || {}) }} style={s.avatar} />
                    ) : (
                      <View style={s.avatarGap} />
                    )}
                  </View>
                )}

                <View style={[s.bubble, { maxWidth: bubbleLimit }, mine ? s.bubbleMine : s.bubbleTheirs]}>
                  {!mine && !sameSenderAsPrev && item.sender?.username ? (
                    <Text style={s.senderName}>@{item.sender.username}</Text>
                  ) : null}
                  <Text style={[s.bubbleText, mine && s.bubbleTextMine]}>{item.message}</Text>
                  <View style={s.metaRow}>
                    <Text style={[s.timeText, mine && s.timeTextMine]}>
                      {item._pending ? "Sending…" : item._failed ? "⚠ Failed" : formatRelativeDate(item.created_at)}
                    </Text>
                    {mine && !item._pending && !item._failed && (
                      <AppIcon
                        name="check"
                        size={11}
                        color={theme.colors.onPrimary}
                        style={{ marginLeft: 3, opacity: 0.6 }}
                      />
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />

        {/* Input bar — sits just above the keyboard */}
        <View style={[s.inputBar, { paddingBottom: inputBarPb }, inputFocused && s.inputBarFocused, isWide && s.inputBarWide]}>
          <TextInput
            style={s.input}
            placeholder="Type a message…"
            placeholderTextColor={theme.colors.textMuted}
            value={msgText}
            onChangeText={setMsgText}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            multiline
            maxLength={800}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[s.sendBtn, !canSend && s.sendBtnOff]}
            onPress={handleSend}
            disabled={!canSend}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator color={theme.colors.onPrimary} size="small" />
            ) : (
              <AppIcon name="send" size={18} color={theme.colors.onPrimary} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    mobileShell: {
      flex: 1,
    },
    desktopShell: {
      flex: 1,
      width: "100%",
      maxWidth: 1120,
      alignSelf: "center",
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.bg,
    },
    listContent: {
      paddingHorizontal: 12,
      paddingTop: 16,
      paddingBottom: 8,
      gap: 2,
      flexGrow: 1,
    },
    listContentWide: {
      paddingHorizontal: 24,
    },

    // Empty state
    emptyWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 80,
      gap: 10,
    },
    emptyIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyTitle: { fontSize: 16, fontWeight: "800", color: theme.colors.text },
    emptySub: { fontSize: 13, color: theme.colors.textMuted, textAlign: "center", maxWidth: 240 },

    // Message rows
    row: { flexDirection: "row", alignItems: "flex-end", marginVertical: 1 },
    rowMine: { justifyContent: "flex-end" },
    rowTheirs: { justifyContent: "flex-start" },
    rowGrouped: { marginTop: 1 },

    avatarCol: { width: 34, marginRight: 6, alignItems: "center", justifyContent: "flex-end" },
    avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.surfaceSoft },
    avatarGap: { width: 30, height: 30 },

    // Bubbles
    bubble: {
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 9,
      ...theme.shadow.soft,
    },
    bubbleMine: {
      backgroundColor: theme.colors.primary,
      borderBottomRightRadius: 4,
      marginLeft: 60,
    },
    bubbleTheirs: {
      backgroundColor: theme.colors.surface,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginRight: 60,
    },

    senderName: { fontSize: 11, fontWeight: "800", color: theme.colors.primary, marginBottom: 3 },

    bubbleText: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
    bubbleTextMine: { color: theme.colors.onPrimary },

    metaRow: { flexDirection: "row", alignItems: "center", marginTop: 4, alignSelf: "flex-end" },
    timeText: { fontSize: 10, color: theme.colors.textMuted },
    timeTextMine: { color: theme.colors.onPrimary, opacity: 0.7 },

    // Input bar
    inputBar: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 10,
      paddingHorizontal: 12,
      paddingTop: 10,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    inputBarFocused: {
      borderTopColor: theme.colors.primary,
    },
    inputBarWide: {
      paddingHorizontal: 24,
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      borderRadius: 22,
      backgroundColor: theme.colors.surfaceSoft,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.colors.text,
      lineHeight: 20,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4,
      marginBottom: 0,
    },
    sendBtnOff: {
      backgroundColor: theme.colors.border,
      shadowOpacity: 0,
      elevation: 0,
    },
  });

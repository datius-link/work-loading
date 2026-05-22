import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../api/api";
import LightLoginModal from "../LightUsers/LightLoginModal";
import Txt from "../../Txt";
import { theme } from "../../theme";
import AppIcon from "../../icons/AppIcon";

const fallbackPosts = [
  {
    id: "sample-1",
    username: "e-kaziProvider_482910",
    full_name: "Asha Plumbing",
    caption: "Bathroom repair, pipe installation, and emergency plumbing around town.",
    location: "Dar es Salaam",
    media: [],
  },
  {
    id: "sample-2",
    username: "e-kaziProvider_194625",
    full_name: "Musa Electrical",
    caption: "Wiring, sockets, lighting, and quick electrical diagnostics.",
    location: "Kampala",
    media: [],
  },
];

export default function ExploreTab() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hireTarget, setHireTarget] = useState(null);

  const loadPosts = useCallback(async () => {
    try {
      const res = await api.get("/posts/public");
      setPosts(res.data.posts || []);
    } catch (err) {
      console.log("Explore posts fallback:", err.response?.data || err.message);
      setPosts(fallbackPosts);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleHire = async (contact) => {
    if (!hireTarget) return;

    await AsyncStorage.setItem(
      "lightUser",
      JSON.stringify({
        type: "email",
        contact: contact.email,
        createdAt: new Date().toISOString(),
      })
    );

    console.log("[DEV MOCK] Light hire request", {
      provider: hireTarget.username,
      postId: hireTarget.id,
      contactEmail: contact.email,
    });

    Alert.alert(
      "Request saved",
      "For development, the hire request is logged in the mobile console."
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadPosts();
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <AppIcon name="posts" size={32} color={theme.colors.textVeryMuted} />
            <Txt
              en="Provider posts will appear here."
              sw="Posts za watoa huduma zitaonekana hapa."
              style={styles.emptyText}
            />
          </View>
        }
        renderItem={({ item }) => (
          <ProviderPost post={item} onHire={() => setHireTarget(item)} />
        )}
      />

      <LightLoginModal
        visible={!!hireTarget}
        onClose={() => setHireTarget(null)}
        onSuccess={handleHire}
      />
    </>
  );
}

function ProviderPost({ post, onHire }) {
  const media = Array.isArray(post.media) ? post.media.slice(0, 10) : [];
  const primaryMedia = media[0];
  const displayName = post.full_name || post.username || "Service Provider";
  const avatarName = encodeURIComponent(displayName);
  const avatarUrl =
    post.profile_pic ||
    post.profilePic ||
    `https://ui-avatars.com/api/?name=${avatarName}&background=0B6B63&color=fff`;

  return (
    <View style={styles.card}>
      <View style={styles.postHeader}>
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        <View style={styles.providerMeta}>
          <Text style={styles.providerName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.username} numberOfLines={1}>
            @{post.username || "provider"}
          </Text>
        </View>

        <TouchableOpacity style={styles.hireBtn} onPress={onHire}>
          <Txt en="Hire me" sw="Niajiri" style={styles.hireText} />
        </TouchableOpacity>
      </View>

      {primaryMedia?.url ? (
        <Image source={{ uri: primaryMedia.url }} style={styles.media} />
      ) : (
        <View style={styles.mediaPlaceholder}>
          <AppIcon name="image" size={34} color={theme.colors.textVeryMuted} />
        </View>
      )}

      {media.length > 1 ? (
        <Text style={styles.mediaCount}>1 / {media.length}</Text>
      ) : null}

      <Text style={styles.caption}>{post.caption}</Text>

      {post.location ? (
        <Text style={styles.location}>{post.location}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    padding: 16,
    paddingBottom: 28,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 42,
  },
  emptyText: {
    marginTop: 10,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 14,
    overflow: "hidden",
    ...theme.shadow.soft,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.surfaceSoft,
  },
  providerMeta: {
    flex: 1,
    minWidth: 0,
  },
  providerName: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.colors.text,
  },
  username: {
    marginTop: 2,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  hireBtn: {
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
  },
  hireText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  media: {
    width: "100%",
    aspectRatio: 1.1,
    backgroundColor: theme.colors.surfaceSoft,
  },
  mediaPlaceholder: {
    width: "100%",
    aspectRatio: 1.1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceSoft,
  },
  mediaCount: {
    position: "absolute",
    right: 12,
    top: 66,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    backgroundColor: "rgba(15, 23, 42, 0.72)",
  },
  caption: {
    paddingHorizontal: 12,
    paddingTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
  },
  location: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 12,
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
});

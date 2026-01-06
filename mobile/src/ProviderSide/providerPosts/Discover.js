// Discover.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { theme } from "../../theme/theme";
import { API } from "../../api/api";

export default function Discover() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch posts from API (adjust endpoint as per your backend)
  const fetchPosts = async () => {
    try {
      // Example endpoint: get public/discoverable posts from providers
      const res = await API.get("/posts/discover");
      setPosts(res.data?.posts || []);
    } catch (error) {
      console.log("Discover posts error:", error);
      setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  // Simple client-side search filter (you can move this to backend later)
  const filteredPosts = posts.filter((post) =>
    post.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.providerName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderPost = ({ item }) => (
    <TouchableOpacity style={styles.postCard} activeOpacity={0.9}>
      {/* Post Media (Image or Video Thumbnail) */}
      {item.media?.[0]?.type === "image" ? (
        <Image source={{ uri: item.media[0].url }} style={styles.postImage} />
      ) : item.media?.[0]?.type === "video" ? (
        <View style={styles.postImage}>
          <Image
            source={{ uri: item.media[0].thumbnail || item.media[0].url }}
            style={styles.postImage}
          />
          <View style={styles.playIcon}>
            <Text style={{ fontSize: 32 }}>▶</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.postImage, styles.noMedia]}>
          <Text style={styles.noMediaText}>No media</Text>
        </View>
      )}

      {/* Post Info */}
      <View style={styles.postInfo}>
        <Text style={styles.caption} numberOfLines={2}>
          {item.caption || "No caption"}
        </Text>
        <View style={styles.providerRow}>
          <Image
            source={{
              uri:
                item.providerProfilePic ||
                "https://ui-avatars.com/api/?background=6D5AE6&color=fff",
            }}
            style={styles.providerAvatar}
          />
          <Text style={styles.providerName}>{item.providerName || "Provider"}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search posts or providers..."
          placeholderTextColor={theme.colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Posts List */}
      <FlatList
        data={filteredPosts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPost}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {searchQuery ? "No posts found" : "No posts available yet"}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? "Try searching with different keywords"
                : "Providers will start sharing soon!"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.bg,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.bg,
  },
  searchInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
    ...theme.shadow.card,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  postCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    marginBottom: 16,
    overflow: "hidden",
    ...theme.shadow.card,
  },
  postImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#f0f0f0",
  },
  playIcon: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  noMedia: {
    justifyContent: "center",
    alignItems: "center",
  },
  noMediaText: {
    color: theme.colors.muted,
    fontSize: 16,
  },
  postInfo: {
    padding: 16,
  },
  caption: {
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: 12,
    lineHeight: 22,
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  providerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  providerName: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    marginTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: theme.colors.muted,
    textAlign: "center",
  },
});
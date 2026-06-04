import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useAppTheme } from "../../theme";
import { api } from "../../api/api";
import Icon from "../../icons/MaterialIcon";

const { width: screenWidth } = Dimensions.get("window");

export default function Explore({ navigation }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch posts from API
  const fetchPosts = useCallback(async () => {
    try {
      const res = await api.get("/posts/public");
      setPosts(res.data?.posts || []);
    } catch (error) {
      console.error("Explore posts error:", error);
      setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts();
  }, [fetchPosts]);

  // Filter posts based on debounced search query
  const filteredPosts = useMemo(() => {
    if (!debouncedQuery.trim()) return posts;
    const query = debouncedQuery.toLowerCase();
    return posts.filter(
      (post) =>
        post.caption?.toLowerCase().includes(query) ||
        post.full_name?.toLowerCase().includes(query) ||
        post.location?.toLowerCase().includes(query)
    );
  }, [posts, debouncedQuery]);

  // Format date helper
  const formatDate = useCallback((dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  }, []);

  // Navigate to provider profile
  const navigateToProvider = useCallback(
    (userId, fullName) => {
      navigation?.navigate("ProviderProfile", { userId, name: fullName });
    },
    [navigation]
  );

  // Render individual post
  const renderPost = useCallback(
    ({ item }) => {
      if (!item) return null;
      const firstMedia = item.media?.[0];
      const hasMultipleMedia = item.media && item.media.length > 1;

      return (
        <View style={styles.postCard}>
          {/* Header - Provider Info */}
          <TouchableOpacity
            style={styles.postHeader}
            activeOpacity={0.7}
            onPress={() => navigateToProvider(item.user_id, item.full_name)}
          >
            <View style={styles.headerLeft}>
              <Image
                source={{
                  uri:
                    item.profile_pic ||
                    `https://ui-avatars.com/api/?background=6D5AE6&color=fff&size=96&name=${encodeURIComponent(
                      item.full_name || "Provider"
                    )}`,
                }}
                style={styles.avatar}
              />
              <View style={styles.providerInfo}>
                <Text style={styles.providerName} numberOfLines={1}>
                  {item.full_name || "Provider"}
                </Text>
                <Text style={styles.timestamp}>
                  {formatDate(item.created_at)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Media Section */}
          <View style={styles.mediaContainer}>
            {firstMedia?.type === "image" ? (
              <Image
                source={{ uri: firstMedia.url }}
                style={styles.media}
                resizeMode="cover"
              />
            ) : firstMedia?.type === "video" ? (
              <TouchableOpacity
                style={styles.mediaWrapper}
                activeOpacity={0.8}
                onPress={() => {
                  // You can integrate a video player modal here
                  console.log("Play video:", firstMedia.url);
                }}
              >
                <Image
                  source={{
                    uri: firstMedia.thumbnail || firstMedia.url,
                  }}
                  style={styles.media}
                  resizeMode="cover"
                />
                <View style={styles.playIconOverlay}>
                  <Icon name="play-circle-filled" size={56} color="#fff" />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={[styles.media, styles.noMedia]}>
                <Icon
                  name="image-not-supported"
                  size={48}
                  color={theme.colors.border}
                />
                <Text style={styles.noMediaText}>No media</Text>
              </View>
            )}

            {hasMultipleMedia && (
              <View style={styles.mediaCounter}>
                <Text style={styles.mediaCounterText}>1/{item.media.length}</Text>
              </View>
            )}
          </View>

          {/* Content Section */}
          <View style={styles.contentSection}>
            {item.caption ? (
              <Text style={styles.caption} numberOfLines={3}>
                {item.caption}
              </Text>
            ) : null}

            {item.location ? (
              <View style={styles.locationRow}>
                <Icon name="location-on" size={14} color={theme.colors.textMuted} />
                <Text style={styles.location} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
            ) : null}

            {/* Footer - Provider Link */}
            <TouchableOpacity
              style={styles.providerFooter}
              activeOpacity={0.7}
              onPress={() => navigateToProvider(item.user_id, item.full_name)}
            >
              <Image
                source={{
                  uri:
                    item.profile_pic ||
                    `https://ui-avatars.com/api/?background=6D5AE6&color=fff&size=64&name=${encodeURIComponent(
                      item.full_name || "Provider"
                    )}`,
                }}
                style={styles.footerAvatar}
              />
              <Text style={styles.footerName} numberOfLines={1}>
                {item.full_name || "Provider"}
              </Text>
              <Icon name="chevron-right" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [styles, theme, formatDate, navigateToProvider]
  );

  const keyExtractor = useCallback((item) => item.id?.toString() || Math.random().toString(), []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color={theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search posts, people, places..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Icon name="close" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Posts Feed */}
        <FlatList
          data={filteredPosts}
          keyExtractor={keyExtractor}
          renderItem={renderPost}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="photo-library" size={64} color={theme.colors.border} />
              <Text style={styles.emptyTitle}>
                {debouncedQuery ? "No posts found" : "No posts available yet"}
              </Text>
              <Text style={styles.emptyText}>
                {debouncedQuery
                  ? "Try searching with different keywords or locations"
                  : "Providers will start sharing their work soon!"}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
          initialNumToRender={3}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={true}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
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

    /* Search Bar */
    searchContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    searchInput: {
      flex: 1,
      backgroundColor: theme.colors.surfaceSoft,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.colors.text,
    },

    /* List */
    listContent: {
      paddingVertical: 12,
    },

    /* Post Card */
    postCard: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: 12,
      marginVertical: 8,
      borderRadius: theme.radius?.lg || 16,
      overflow: "hidden",
      // Safe shadow spreading - theme.shadow.card must exist, fallback to default
      ...(theme.shadow?.card || {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
      }),
    },

    /* Header */
    postHeader: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.surfaceSoft,
    },
    providerInfo: {
      flex: 1,
    },
    providerName: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 2,
    },
    timestamp: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },

    /* Media */
    mediaContainer: {
      width: "100%",
      height: 320,
      backgroundColor: "#000",
      position: "relative",
    },
    mediaWrapper: {
      width: "100%",
      height: "100%",
      position: "relative",
    },
    media: {
      width: "100%",
      height: "100%",
    },
    noMedia: {
      backgroundColor: theme.colors.surfaceSoft,
      justifyContent: "center",
      alignItems: "center",
    },
    noMediaText: {
      fontSize: 14,
      color: theme.colors.textMuted,
      marginTop: 8,
    },
    playIconOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.2)",
    },
    mediaCounter: {
      position: "absolute",
      bottom: 12,
      right: 12,
      backgroundColor: "rgba(0,0,0,0.7)",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
    },
    mediaCounterText: {
      fontSize: 12,
      fontWeight: "600",
      color: "#fff",
    },

    /* Content */
    contentSection: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    caption: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
      marginBottom: 10,
    },
    locationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 12,
    },
    location: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.colors.textMuted,
      flex: 1,
    },

    /* Provider Footer */
    providerFooter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    footerAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceSoft,
    },
    footerName: {
      flex: 1,
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.primary,
    },

    /* Empty State */
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
      marginTop: 16,
      marginBottom: 8,
      textAlign: "center",
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.textMuted,
      textAlign: "center",
      lineHeight: 20,
    },
  });
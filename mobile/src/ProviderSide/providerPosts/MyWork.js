import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  Platform,
  Dimensions,
} from "react-native";

import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, clearViewerAuthOverride } from "../../api/api";
import { useAppTheme } from "../../theme";

import PostGridItem from "../../views/postCard/PostGridItem";

const { width } = Dimensions.get("window");
const GRID_GAP = 2;
const ITEM_SIZE = (width - GRID_GAP * 2) / 3;

export default function MyWork({ navigation }) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);

  const [activeTab, setActiveTab] = useState("Moments");
  const isFirstFocus = useRef(true);

  const loadData = async (options = {}) => {
    const { showFullLoader = true } = options;

    try {
      if (showFullLoader) {
        setLoading(true);
      }

      clearViewerAuthOverride();

      try {
        const profileRes = await api.get("/service-provider/me");
        setProfile(profileRes?.data?.provider || null);
      } catch (profileErr) {
        console.log(
          "MyWork profile error:",
          profileErr?.response?.data || profileErr?.message
        );
      }

      try {
        const postsRes = await api.get("/posts/me");
        setPosts(postsRes?.data?.posts || []);
      } catch (postsErr) {
        console.log(
          "MyWork posts error:",
          postsErr?.response?.data || postsErr?.message
        );
        setPosts([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData({ showFullLoader: isFirstFocus.current });
      isFirstFocus.current = false;
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData({ showFullLoader: false });
  }, []);

  const filteredPosts = useMemo(() => {
    if (activeTab === "Moments") {
      return posts.filter((p) => p?.type === "moment");
    }
    return posts.filter((p) => p?.type === "reel");
  }, [posts, activeTab]);

  const postsCount = profile?.posts_count ?? posts.length;
  const followersCount = profile?.followers ?? 0;
  const followingCount = profile?.following ?? 0;

  const openPost = (item) => {
    if (!item?.id) return;

    navigation.navigate("PostFeedView", {
      posts: filteredPosts,
      initialPostId: item.id,
    });
  };

  const renderItem = ({ item }) => {
    if (!item) return null;

    return (
      <PostGridItem
        post={item}
        size={ITEM_SIZE}
        onPress={() => openPost(item)}
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <View style={[styles.profileSection, { paddingTop: insets.top + theme.spacing.sm }]}>
        <View style={styles.topRow}>
          <View style={styles.leftSection}>
            <Text style={styles.username}>{profile?.username || "provider"}</Text>

            <Text style={styles.fullName}>
              {profile?.full_name || "Service Provider"}
            </Text>

            {!!profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.engagementButton}
              onPress={() => navigation.navigate("EngagementSummary")}
            >
              <Text style={styles.engagementButtonText}>Engagements</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate("MyProfile")}
          >
            <Image
              source={{
                uri:
                  profile?.profilePic ||
                  profile?.profile_pic ||
                  "https://ui-avatars.com/api/?name=E-Kazi&background=0B6B63&color=fff",
              }}
              style={styles.profilePic}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{postsCount}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{followersCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{followingCount}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.createPostButton}
          onPress={() => navigation.navigate("CreatePost")}
        >
          <Text style={styles.createPostText}>Create Post</Text>
        </TouchableOpacity>

        <View style={styles.tabs}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.tab}
            onPress={() => setActiveTab("Moments")}
          >
            <Text
              style={[styles.tabText, activeTab === "Moments" && styles.activeTabText]}
            >
              Moments
            </Text>
            {activeTab === "Moments" && <View style={styles.activeLine} />}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.tab}
            onPress={() => setActiveTab("Reels")}
          >
            <Text
              style={[styles.tabText, activeTab === "Reels" && styles.activeTabText]}
            >
              Reels
            </Text>
            {activeTab === "Reels" && <View style={styles.activeLine} />}
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredPosts}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={12}
        maxToRenderPerBatch={18}
        windowSize={15}
        contentContainerStyle={styles.gridContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No {activeTab.toLowerCase()} yet</Text>
            <Text style={styles.emptySubText}>Create your first post!</Text>
          </View>
        }
      />
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
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

  profileSection: {
    backgroundColor: theme.colors.surface,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
  },

  leftSection: {
    flex: 1,
    paddingRight: theme.spacing.md,
  },

  username: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "800",
  },

  fullName: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 6,
  },

  bio: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },

  engagementButton: {
    marginTop: 16,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    height: 38,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primarySoft,
    justifyContent: "center",
  },

  engagementButtonText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },

  profilePic: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 24,
    marginBottom: 18,
  },

  statBox: {
    alignItems: "center",
  },

  statNumber: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "800",
  },

  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },

  createPostButton: {
    height: 46,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  createPostText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  tabs: {
    flexDirection: "row",
    marginTop: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },

  tab: {
    flex: 1,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },

  tabText: {
    color: theme.colors.textMuted,
    fontSize: 15,
    fontWeight: "700",
  },

  activeTabText: {
    color: theme.colors.primary,
  },

  activeLine: {
    position: "absolute",
    bottom: 0,
    width: "50%",
    height: 2,
    backgroundColor: theme.colors.primary,
  },

  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },

  gridContent: {
    paddingTop: GRID_GAP,
    paddingHorizontal: 0,
    paddingBottom: 120,
  },

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },

  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 18,
    fontWeight: "600",
  },

  emptySubText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginTop: 8,
  },
});


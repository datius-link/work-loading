import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { api, socialRequest } from "../../api/api";
import { getUserSession } from "../../utils/userSession";
import { useAppTheme } from "../../theme";
import AppIcon from "../../icons/AppIcon";
import PostGridItem from "../postCard/PostGridItem";

function avatarFor(profile) {
  if (profile?.profile_pic) return profile.profile_pic;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.username || profile?.full_name || "User")}&background=0B6B63&color=fff&bold=true&length=2&fontsize=0.33&rounded=true`;
}

function listFrom(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function formatCount(count) {
  if (!count && count !== 0) return "0";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export default function UserProfile() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Core profile state
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [isMine, setIsMine] = useState(false);
  const [following, setFollowing] = useState(false);

  const [activeTab, setActiveTab] = useState("media");

  // Load profile data
  const loadProfile = useCallback(async ({ refresh = false } = {}) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      setError("");
      const session = await getUserSession();
      const uuid = route.params?.uuid || route.params?.providerUuid || route.params?.providerId || session.profile?.uuid || session.user?.uuid;
      if (!uuid) throw new Error("Profile not found");

      const myUuid = session.profile?.uuid || session.user?.uuid;
      setIsMine(uuid === myUuid);

      const [profileRes, postsRes] = await Promise.all([
        api.get(`/profiles/${uuid}`),
        api.get(`/posts/provider/${uuid}`),
      ]);
      const nextProfile = profileRes?.data?.profile || null;
      setProfile(nextProfile);
      setFollowing(!!nextProfile?.is_following || !!nextProfile?.is_followed_by_me);
      setPosts(Array.isArray(postsRes?.data?.posts) ? postsRes.data.posts : []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load profile");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [route.params?.uuid, route.params?.providerUuid, route.params?.providerId]);

  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  const onRefresh = useCallback(() => {
    loadProfile({ refresh: true });
  }, [loadProfile]);

  const toggleFollow = async () => {
    if (!profile?.uuid || isMine) return;
    try {
      const res = await socialRequest("post", `/posts/follow/${profile.uuid}`, undefined, { preferredAuthActor: "viewer" });
      setFollowing(!!res?.data?.following);
    } catch (err) {
      console.log("follow profile error:", err?.response?.data || err?.message);
    }
  };

  const openFutureScreen = (kind) => {
    navigation.navigate(kind === "recommendations" ? "ProfileRecommendations" : "ProfileWorksDone", {
      profileUuid: profile?.uuid,
      username: profile?.username,
      count: kind === "recommendations"
        ? Number(profile?.recommendations_count || profile?.ratings_count || 0)
        : Number(profile?.completed_jobs_count || profile?.jobs_attained_count || 0),
    });
  };

  const navigateToFollowers = (type) => {
    navigation.navigate("ConnectionsScreen", { providerUuid: profile?.uuid, initialTab: type });
  };

  // Render different tab content
  const renderTabContent = () => {
    if (activeTab === "media") {
      if (posts.length === 0) {
        return (
          <View style={styles.emptyTabContainer}>
            <AppIcon name="image" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyTabText}>No media posts yet</Text>
          </View>
        );
      }
      return (
        <View style={styles.mediaGrid}>
          {posts.map((post) => (
            <PostGridItem
              key={String(post.id)}
              post={post}
              onPress={() => navigation.navigate("PostFeedView", { posts, initialPostId: post.id, preferredAuthActor: "viewer" })}
            />
          ))}
        </View>
      );
    }

    if (activeTab === "jobsDone") {
      const completedJobs = Array.isArray(profile?.completed_jobs) ? profile.completed_jobs : [];
      if (completedJobs.length === 0) {
        return (
          <View style={styles.emptyTabContainer}>
            <AppIcon name="briefcase" size={42} color={theme.colors.textMuted} />
            <Text style={styles.emptyTabText}>No completed jobs yet</Text>
          </View>
        );
      }
      return (
        <View style={styles.jobsList}>
          {completedJobs.map((item, index) => (
            <TouchableOpacity
              key={String(item.id || item.job_code || index)}
              style={styles.jobRow}
              activeOpacity={0.86}
              onPress={() => navigation.navigate("ProfileWorksDone", { profileUuid: profile?.uuid, username: profile?.username, count: completedJobs.length })}
            >
              <View style={styles.jobIcon}>
                <AppIcon name="check-circle" size={18} color={theme.colors.primary} />
              </View>
              <View style={styles.jobInfo}>
                <Text style={styles.jobTitle} numberOfLines={1}>{item.title || "Completed job"}</Text>
                <Text style={styles.jobSub} numberOfLines={1}>{item.job_code || item.status || "Completed"}</Text>
              </View>
              <AppIcon name="arrowRight" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.emptyTitle}>{error || "Profile not found"}</Text>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => loadProfile()}>
          <Text style={styles.secondaryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const services = listFrom(profile.services);
  const completedJobs = Array.isArray(profile.completed_jobs) ? profile.completed_jobs : [];
  const recommendationsCount = Number(profile.recommendations_count || profile.ratings_count || 0);
  const worksDoneCount = Number(profile.completed_jobs_count || profile.jobs_attained_count || completedJobs.length || 0);
  const followerCount = Number(profile.followers_count || profile.follower_count || 0);
  const followingCount = Number(profile.following_count || 0);

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <AppIcon name="arrowLeft" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <Image source={{ uri: avatarFor(profile) }} style={styles.avatar} />
          <View style={styles.nameContainer}>
            <Text style={styles.username}>@{profile.username || "user"}</Text>
            {profile.full_name ? <Text style={styles.fullName}>{profile.full_name}</Text> : null}
          </View>
          
          {/* Stats Row */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem} onPress={() => navigateToFollowers("followers")}>
              <Text style={styles.statNumber}>{formatCount(followerCount)}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem} onPress={() => navigateToFollowers("following")}>
              <Text style={styles.statNumber}>{formatCount(followingCount)}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{formatCount(profile.ratings || 0)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {!isMine ? (
              <TouchableOpacity 
                style={[styles.followBtn, following && styles.followingBtn]} 
                onPress={toggleFollow}
              >
                <Text style={[styles.followText, following && styles.followingText]}>
                  {following ? "Following" : "Follow"}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Bio Section */}
        {profile.bio ? (
          <View style={styles.section}>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        ) : null}

        {/* Services Section */}
        {services.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.tags}>
              {services.map((service) => (
                <View key={String(service)} style={styles.tag}>
                  <Text style={styles.tagText}>{String(service)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.actionList}>
          <TouchableOpacity style={styles.actionRow} onPress={() => openFutureScreen("recommendations")}>
            <View style={styles.actionIcon}>
              <AppIcon name="star" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Recommendations</Text>
              <Text style={styles.actionMeta}>{formatCount(recommendationsCount)} received</Text>
            </View>
            <AppIcon name="arrowRight" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionRow} onPress={() => openFutureScreen("works")}>
            <View style={styles.actionIcon}>
              <AppIcon name="briefcase" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Jobs</Text>
              <Text style={styles.actionMeta}>{formatCount(worksDoneCount)} completed</Text>
            </View>
            <AppIcon name="arrowRight" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === "media" && styles.activeTab]} 
            onPress={() => setActiveTab("media")}
          >
            <AppIcon name="image" size={20} color={activeTab === "media" ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={[styles.tabText, activeTab === "media" && styles.activeTabText]}>Media</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === "jobsDone" && styles.activeTab]} 
            onPress={() => setActiveTab("jobsDone")}
          >
            <AppIcon name="briefcase" size={20} color={activeTab === "jobsDone" ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={[styles.tabText, activeTab === "jobsDone" && styles.activeTabText]}>Jobs</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {renderTabContent()}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg, padding: 24 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.bg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border + "30",
    },
    iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20 },
    headerTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "700" },
    content: { paddingHorizontal: 16 },
    
    heroContainer: { alignItems: "center", paddingTop: 20, paddingBottom: 16 },
    avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: theme.colors.primary, marginBottom: 12 },
    nameContainer: { alignItems: "center", marginBottom: 16 },
    username: { color: theme.colors.text, fontSize: 22, fontWeight: "800" },
    fullName: { color: theme.colors.textSecondary, fontSize: 15, marginTop: 4 },
    
    statsRow: { flexDirection: "row", justifyContent: "space-around", width: "100%", marginBottom: 20 },
    statItem: { alignItems: "center", flex: 1 },
    statNumber: { color: theme.colors.text, fontSize: 20, fontWeight: "800" },
    statLabel: { color: theme.colors.textMuted, fontSize: 13, marginTop: 4 },
    
    actionButtons: { flexDirection: "row", gap: 12, width: "100%", marginBottom: 8 },
    followBtn: { flex: 1, backgroundColor: theme.colors.primary, paddingVertical: 12, borderRadius: 30, alignItems: "center" },
    followingBtn: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: theme.colors.primary },
    followText: { color: theme.colors.onPrimary, fontWeight: "700", fontSize: 15 },
    followingText: { color: theme.colors.primary },
    
    section: { marginVertical: 12 },
    bioText: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 22, textAlign: "center" },
    tags: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 },
    tag: { backgroundColor: theme.colors.primarySoft, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    tagText: { color: theme.colors.primary, fontSize: 13, fontWeight: "600" },
    
    actionList: { marginVertical: 14, borderTopWidth: 1, borderTopColor: theme.colors.border },
    actionRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingVertical: 9 },
    actionIcon: { width: 38, height: 38, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft },
    actionCopy: { flex: 1, minWidth: 0 },
    actionTitle: { color: theme.colors.text, fontSize: 14, fontWeight: "900" },
    actionMeta: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "700", marginTop: 2 },
    
    tabBar: { flexDirection: "row", marginTop: 16, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
    activeTab: { borderBottomColor: theme.colors.primary },
    tabText: { color: theme.colors.textMuted, fontSize: 14, fontWeight: "600" },
    activeTabText: { color: theme.colors.primary },
    
    tabContent: { paddingTop: 16, paddingBottom: 24 },
    mediaGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
    emptyTabContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
    emptyTabText: { color: theme.colors.textMuted, fontSize: 14 },
    centerTabLoading: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
    
    jobsList: { borderTopWidth: 1, borderTopColor: theme.colors.border },
    jobRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingVertical: 9 },
    jobIcon: { width: 38, height: 38, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft },
    jobInfo: { flex: 1, minWidth: 0 },
    jobTitle: { color: theme.colors.text, fontSize: 14, fontWeight: "900" },
    jobSub: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "700", marginTop: 2 },
    
    emptyTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "900", textAlign: "center" },
    secondaryBtn: { marginTop: 18, minHeight: 46, borderRadius: 8, paddingHorizontal: 18, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center", justifyContent: "center" },
    secondaryText: { color: theme.colors.text, fontWeight: "900" },
  });

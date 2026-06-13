import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  FlatList,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { api, socialRequest } from "../../api/api";
import { getUserSession } from "../../utils/userSession";
import { useAppTheme } from "../../theme";
import AppIcon from "../../icons/AppIcon";
import PostGridItem from "../postCard/PostGridItem";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_COLUMNS = 3;
const GRID_SPACING = 2;
const GRID_ITEM_SIZE = (SCREEN_WIDTH - GRID_SPACING * (GRID_COLUMNS + 1)) / GRID_COLUMNS;

// ─── Helpers ────────────────────────────────────────────────────────────────

function avatarFor(profile) {
  if (profile?.profile_pic) return profile.profile_pic;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    profile?.username || profile?.full_name || "User"
  )}&background=0B6B63&color=fff&bold=true&length=2&fontsize=0.33&rounded=true`;
}

function listFrom(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function formatCount(count) {
  if (!count && count !== 0) return "0";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatPill({ label, value, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={statPillStyles.wrap} activeOpacity={0.7}>
      <Text style={statPillStyles.value}>{value}</Text>
      <Text style={statPillStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const statPillStyles = StyleSheet.create({
  wrap: { alignItems: "center", flex: 1 },
  value: { fontSize: 18, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0 },
  label: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.7)", marginTop: 2, textTransform: "uppercase", letterSpacing: 0 },
});

function ServiceChip({ label, theme }) {
  return (
    <View style={[chipStyles.wrap, { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.border }]}>
      <Text style={[chipStyles.text, { color: theme.colors.primary }]}>{label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  text: { fontSize: 12, fontWeight: "600", letterSpacing: 0 },
});

function JobCard({ item, badge, badgeColor, badgeTextColor, placeholderIcon, onPress, theme }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={[jobCardStyles.card, { backgroundColor: theme.colors.surface }]}>
      {item.media_url ? (
        <Image source={{ uri: item.media_url }} style={jobCardStyles.image} />
      ) : (
        <LinearGradient colors={[theme.colors.primarySoft, theme.colors.surfaceSoft]} style={jobCardStyles.imagePlaceholder}>
          <AppIcon name={placeholderIcon} size={26} color={theme.colors.primary} />
        </LinearGradient>
      )}
      <View style={jobCardStyles.body}>
        <Text style={[jobCardStyles.title, { color: theme.colors.text }]} numberOfLines={2}>{item.title || "Untitled"}</Text>
        <View style={jobCardStyles.footer}>
          <Text style={[jobCardStyles.price, { color: theme.colors.primary }]}>${item.budget || 0}</Text>
          <View style={[jobCardStyles.badge, { backgroundColor: badgeColor }]}>
            <Text style={[jobCardStyles.badgeText, { color: badgeTextColor }]}>{badge}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const jobCardStyles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 4,
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  image: { width: "100%", height: 130, resizeMode: "cover" },
  imagePlaceholder: { width: "100%", height: 130, alignItems: "center", justifyContent: "center" },
  body: { padding: 10 },
  title: { fontSize: 13, fontWeight: "700", lineHeight: 18, marginBottom: 8 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  price: { fontSize: 13, fontWeight: "800" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0 },
});

function EmptyState({ icon, title, subtitle, theme }) {
  return (
    <View style={emptyStyles.wrap}>
      <View style={[emptyStyles.iconWrap, { backgroundColor: theme.colors.primarySoft }]}>
        <AppIcon name={icon} size={32} color={theme.colors.primary} />
      </View>
      <Text style={[emptyStyles.title, { color: theme.colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[emptyStyles.subtitle, { color: theme.colors.textMuted }]}>{subtitle}</Text> : null}
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 56, paddingHorizontal: 32, gap: 12 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 13, textAlign: "center", lineHeight: 20 },
});

// ─── Main Component ──────────────────────────────────────────────────────────

export default function UserProfile() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [isMine, setIsMine] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followSubmitting, setFollowSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("media");
  const [jobsDone, setJobsDone] = useState([]);
  const [jobsPosted, setJobsPosted] = useState([]);
  const [loadingJobsDone, setLoadingJobsDone] = useState(false);
  const [loadingJobsPosted, setLoadingJobsPosted] = useState(false);

  const scrollY = useMemo(() => new Animated.Value(0), []);

  const headerOpacity = scrollY.interpolate({ inputRange: [0, 120], outputRange: [0, 1], extrapolate: "clamp" });

  // ── Data Fetching ──────────────────────────────────────────────────────────

  const loadProfile = useCallback(async ({ refresh = false } = {}) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      setError("");
      const session = await getUserSession();
      const uuid =
        route.params?.uuid ||
        route.params?.providerUuid ||
        route.params?.providerId ||
        session.profile?.uuid ||
        session.user?.uuid;
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
      setJobsDone(Array.isArray(nextProfile?.completed_jobs) ? nextProfile.completed_jobs : []);
      setJobsPosted(Array.isArray(nextProfile?.posted_jobs) ? nextProfile.posted_jobs : []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load profile");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [route.params?.uuid, route.params?.providerUuid, route.params?.providerId]);

  const fetchJobsDone = useCallback(async (uuid) => {
    if (!uuid) return;
    setLoadingJobsDone(true);
    try {
      setJobsDone(Array.isArray(profile?.completed_jobs) ? profile.completed_jobs : []);
    } catch {
      setJobsDone([]);
    } finally {
      setLoadingJobsDone(false);
    }
  }, [profile?.completed_jobs]);

  const fetchJobsPosted = useCallback(async (uuid) => {
    if (!uuid) return;
    setLoadingJobsPosted(true);
    try {
      setJobsPosted(Array.isArray(profile?.posted_jobs) ? profile.posted_jobs : []);
    } catch {
      setJobsPosted([]);
    } finally {
      setLoadingJobsPosted(false);
    }
  }, [profile?.posted_jobs]);

  useEffect(() => {
    if (profile?.uuid) {
      fetchJobsDone(profile.uuid);
      fetchJobsPosted(profile.uuid);
    }
  }, [profile?.uuid, fetchJobsDone, fetchJobsPosted]);

  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  const onRefresh = useCallback(() => {
    loadProfile({ refresh: true });
    if (profile?.uuid) {
      fetchJobsDone(profile.uuid);
      fetchJobsPosted(profile.uuid);
    }
  }, [loadProfile, fetchJobsDone, fetchJobsPosted, profile?.uuid]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const toggleFollow = async () => {
    if (!profile?.uuid || isMine || followSubmitting) return;
    setFollowSubmitting(true);
    try {
      const res = await socialRequest("post", `/posts/follow/${profile.uuid}`, undefined, {
        preferredAuthActor: "viewer",
      });
      const nextFollowing = !!res?.data?.following;
      setFollowing(nextFollowing);
      setProfile((current) => {
        if (!current) return current;
        const currentFollowers = Number(current.followers_count || current.follower_count || 0);
        const delta = nextFollowing ? 1 : -1;
        const nextFollowers = Math.max(0, currentFollowers + delta);
        return {
          ...current,
          followers_count: nextFollowers,
          follower_count: nextFollowers,
          is_following: nextFollowing,
          is_followed_by_me: nextFollowing,
        };
      });
    } catch (err) {
      console.log("follow error:", err?.message);
    } finally {
      setFollowSubmitting(false);
    }
  };

  const navigateToInsights = () =>
    navigation.navigate("Insights", { profileUuid: profile?.uuid, username: profile?.username });

  const navigateToRecommendations = () =>
    navigation.navigate("ProfileRecommendations", {
      profileUuid: profile?.uuid,
      username: profile?.username,
      count: Number(profile?.recommendations_count || profile?.ratings_count || 0),
    });

  const navigateToRatings = () =>
    navigation.navigate("ProfileRatings", {
      profileUuid: profile?.uuid,
      username: profile?.username,
      count: Number(profile?.ratings_count || 0),
    });

  const navigateToFollowers = () =>
    navigation.navigate("ConnectionsScreen", { providerUuid: profile?.uuid, initialTab: "followers" });

  const navigateToFollowing = () =>
    navigation.navigate("ConnectionsScreen", { providerUuid: profile?.uuid, initialTab: "following" });

  // ── Tab Content ────────────────────────────────────────────────────────────

  const renderMediaTab = () => {
    if (!posts.length)
      return <EmptyState icon="image" title="No posts yet" subtitle="Media will appear here once shared" theme={theme} />;
    return (
      <View style={styles.mediaGrid}>
        {posts.map((post) => (
          <TouchableOpacity
            key={String(post.id)}
            style={styles.mediaItem}
            activeOpacity={0.9}
            onPress={() => navigation.navigate("PostFeedView", { posts, initialPostId: post.id, preferredAuthActor: "viewer" })}
          >
            <PostGridItem post={post} />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderJobsTab = (items, loading_, icon, emptyTitle, badge, badgeColor, badgeTextColor) => {
    if (loading_) return (
      <View style={styles.centerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
    if (!items.length)
      return <EmptyState icon={icon} title={emptyTitle} theme={theme} />;
    return (
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        scrollEnabled={false}
        contentContainerStyle={{ paddingBottom: 8 }}
        renderItem={({ item }) => (
          <JobCard
            item={item}
            badge={badge}
            badgeColor={badgeColor}
            badgeTextColor={badgeTextColor}
            placeholderIcon={icon}
            onPress={() => navigation.navigate("JobDetails", { jobId: item.id })}
            theme={theme}
          />
        )}
      />
    );
  };

  const renderTabContent = () => {
    if (activeTab === "media") return renderMediaTab();
    if (activeTab === "jobsDone")
      return renderJobsTab(jobsDone, loadingJobsDone, "check-circle", "No completed jobs yet", "Done", "#E8F5E9", "#2E7D32");
    if (activeTab === "jobsPosted")
      return jobsPosted.length
        ? renderJobsTab(jobsPosted, loadingJobsPosted, "briefcase", "No jobs posted yet", "Open", "#FFF3E0", "#E65100")
        : <EmptyState icon="briefcase" title={postedJobsCount ? `${formatCount(postedJobsCount)} jobs posted` : "No jobs posted yet"} subtitle={postedJobsCount ? "Job post preview is not available yet" : null} theme={theme} />;
  };

  // ── States ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <LinearGradient colors={[theme.colors.primary, theme.colors.primaryDark || theme.colors.primary]} style={[styles.fullCenter, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.colors.onPrimary} />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </LinearGradient>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.fullCenter, { paddingTop: insets.top, backgroundColor: theme.colors.bg }]}>
        <AppIcon name="alert-circle" size={48} color={theme.colors.primary} />
        <Text style={styles.errorTitle}>{error || "Profile not found"}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadProfile()}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const services = listFrom(profile.services);
  const worksDoneCount = Number(profile.completed_jobs_count || profile.jobs_attained_count || 0);
  const postedJobsCount = Number(profile.posted_jobs_count || jobsPosted.length || 0);
  const followerCount = profile.followers_count || profile.follower_count || 0;
  const followingCount = profile.following_count || 0;

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>

      {/* ── Sticky floating header (fades in on scroll) ── */}
      <Animated.View style={[styles.floatingHeader, { opacity: headerOpacity, paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <AppIcon name="arrowLeft" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.floatingHeaderTitle}>@{profile.username || "user"}</Text>
        {isMine ? (
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate("EditProfile", { profile })}>
            <AppIcon name="edit" size={18} color={theme.colors.text} />
          </TouchableOpacity>
        ) : <View style={styles.headerSpacer} />}
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 40) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {/* ── Hero Banner ── */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark || theme.colors.primary, theme.colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          {/* Top nav row */}
          <View style={styles.heroNav}>
            <TouchableOpacity style={styles.heroNavBtn} onPress={() => navigation.goBack()}>
              <AppIcon name="arrowLeft" size={20} color={theme.colors.onPrimary} />
            </TouchableOpacity>
            {isMine ? (
              <TouchableOpacity style={styles.heroNavBtn} onPress={() => navigation.navigate("EditProfile", { profile })}>
                <AppIcon name="edit" size={18} color={theme.colors.onPrimary} />
              </TouchableOpacity>
            ) : <View style={styles.heroNavSpacer} />}
          </View>

          {/* Avatar + name */}
          <View style={styles.heroCenter}>
            <View style={styles.avatarRing}>
              <Image source={{ uri: avatarFor(profile) }} style={styles.avatar} />
              {!isMine && (
                <View style={[styles.onlineDot, { backgroundColor: following ? "#4ADE80" : "#94A3B8" }]} />
              )}
            </View>

            <Text style={styles.heroUsername}>@{profile.username || "user"}</Text>
            {profile.full_name ? <Text style={styles.heroFullName}>{profile.full_name}</Text> : null}
          </View>

          {/* Stats row */}
          <View style={styles.heroStats}>
            <StatPill label="Followers" value={formatCount(followerCount)} onPress={navigateToFollowers} />
            <View style={styles.statDivider} />
            <StatPill label="Following" value={formatCount(followingCount)} onPress={navigateToFollowing} />
            <View style={styles.statDivider} />
            <StatPill label="Rating" value={profile.ratings || "0"} />
          </View>

          {/* Wave bottom */}
          <View style={styles.heroWave} />
        </LinearGradient>

        {/* ── Action Buttons ── */}
        <View style={styles.actionRow}>
          {!isMine ? (
            <TouchableOpacity
              style={[styles.followBtn, following && styles.followingBtn, followSubmitting && styles.disabledBtn]}
              onPress={toggleFollow}
              disabled={followSubmitting}
              activeOpacity={0.85}
            >
              {following ? (
                <AppIcon name="user-check" size={16} color={theme.colors.primary} />
              ) : (
                <AppIcon name="user-plus" size={16} color={theme.colors.onPrimary} />
              )}
              <Text style={[styles.followText, following && styles.followingText]}>
                {following ? "Following" : "Follow"}
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.insightsBtn} onPress={navigateToInsights} activeOpacity={0.85}>
            <AppIcon name="trending-up" size={16} color={theme.colors.primary} />
            <Text style={styles.insightsBtnText}>Insights</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.recommendationsBtn} onPress={navigateToRecommendations} activeOpacity={0.86}>
          <View style={styles.recommendationsIcon}>
            <AppIcon name="star" size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.recommendationsCopy}>
            <Text style={styles.recommendationsTitle}>Recommendations</Text>
            <Text style={styles.recommendationsMeta}>Coming soon as a list</Text>
          </View>
          <Text style={styles.recommendationsCount}>{formatCount(profile.recommendations_count || profile.ratings_count || 0)}</Text>
          <AppIcon name="arrowRight" size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.recommendationsBtn} onPress={navigateToRatings} activeOpacity={0.86}>
          <View style={styles.recommendationsIcon}>
            <AppIcon name="star" size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.recommendationsCopy}>
            <Text style={styles.recommendationsTitle}>Ratings</Text>
            <Text style={styles.recommendationsMeta}>Per completed job</Text>
          </View>
          <Text style={styles.recommendationsCount}>{formatCount(profile.ratings_count || 0)}</Text>
          <AppIcon name="arrowRight" size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>

        {/* ── Bio ── */}
        {profile.bio ? (
          <View style={styles.bioSection}>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        ) : null}

        {/* ── Services ── */}
        {services.length > 0 ? (
          <View style={styles.servicesSection}>
            <Text style={styles.sectionLabel}>Services</Text>
            <View style={styles.chipsRow}>
              {services.map((s) => <ServiceChip key={String(s)} label={String(s)} theme={theme} />)}
            </View>
          </View>
        ) : null}

        {/* ── Post Tabs ── */}
        <View style={styles.tabContainer}>
          {[
            { id: "media",      icon: "image",     label: "Media"       },
            { id: "jobsDone",   icon: "briefcase", label: "Jobs Done"   },
            { id: "jobsPosted", icon: "upload",    label: "Jobs Posted" },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, active && styles.activeTab]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.8}
              >
                <AppIcon name={tab.icon} size={16} color={active ? theme.colors.primary : theme.colors.textMuted} />
                <Text style={[styles.tabLabel, active && styles.activeTabLabel]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Tab Content ── */}
        <View style={styles.tabContent}>
          {renderTabContent()}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const createStyles = (theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  fullCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: theme.colors.onPrimary || "#fff", fontSize: 14, fontWeight: "500", marginTop: 8, opacity: 0.82 },
  errorTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "700", textAlign: "center", marginTop: 12 },
  retryBtn: {
    marginTop: 8, paddingHorizontal: 28, paddingVertical: 12,
    backgroundColor: theme.colors.primary, borderRadius: 24,
  },
  retryText: { color: theme.colors.onPrimary, fontWeight: "700", fontSize: 14 },

  // Floating header
  floatingHeader: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: theme.colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingHeaderTitle: { fontSize: 16, fontWeight: "700", color: theme.colors.text },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.colors.surfaceSoft, alignItems: "center", justifyContent: "center" },
  headerSpacer: { width: 38, height: 38 },

  // Hero
  heroBanner: { paddingBottom: 22, position: "relative" },
  heroNav: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 2 },
  heroNavBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  heroNavSpacer: { width: 38, height: 38 },
  heroCenter: { alignItems: "center", paddingVertical: 10 },
  avatarRing: { position: "relative", marginBottom: 10 },
  avatar: {
    width: 86, height: 86, borderRadius: 43,
    borderWidth: 3.5, borderColor: "rgba(255,255,255,0.9)",
  },
  onlineDot: {
    position: "absolute", bottom: 2, right: 2,
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: theme.colors.primary,
  },
  heroUsername: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0 },
  heroFullName: { fontSize: 14, color: "rgba(255,255,255,0.72)", fontWeight: "500", marginTop: 4 },
  heroStats: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.18)",
    marginHorizontal: 20,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  statDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.2)", marginHorizontal: 8 },
  heroWave: {
    position: "absolute",
    bottom: -1, left: 0, right: 0,
    height: 18,
    backgroundColor: theme.colors.bg,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },

  // Actions
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 8,
  },
  followBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: theme.colors.primary, paddingVertical: 11, borderRadius: 8,
    shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4,
    elevation: 1,
  },
  followingBtn: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5, borderColor: theme.colors.primary,
    shadowOpacity: 0.06,
  },
  disabledBtn: { opacity: 0.62 },
  followText: { color: theme.colors.onPrimary, fontWeight: "700", fontSize: 15 },
  followingText: { color: theme.colors.primary },
  insightsBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: theme.colors.surface, paddingVertical: 11, borderRadius: 8,
    borderWidth: 1.5, borderColor: theme.colors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6,
    elevation: 2,
  },
  insightsBtnText: { color: theme.colors.primary, fontWeight: "700", fontSize: 15 },
  recommendationsBtn: {
    minHeight: 56,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  recommendationsIcon: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft },
  recommendationsCopy: { flex: 1, minWidth: 0 },
  recommendationsTitle: { color: theme.colors.text, fontSize: 14, fontWeight: "900" },
  recommendationsMeta: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "700", marginTop: 2 },
  recommendationsCount: { color: theme.colors.primary, fontSize: 14, fontWeight: "900" },

  // Bio
  bioSection: { paddingHorizontal: 16, paddingVertical: 8 },
  bioText: { fontSize: 14, color: theme.colors.textSecondary || theme.colors.text, lineHeight: 20, textAlign: "left" },

  // Services
  servicesSection: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 2 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: theme.colors.textMuted, textTransform: "uppercase", letterSpacing: 0, marginBottom: 8 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap" },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 2,
    marginBottom: 2,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 4, paddingVertical: 9, borderRadius: 6,
  },
  activeTab: {
    backgroundColor: theme.colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  tabLabel: { fontSize: 11, fontWeight: "700", color: theme.colors.textMuted },
  activeTabLabel: { color: theme.colors.primary },

  // Tab content
  tabContent: { paddingHorizontal: 12, paddingTop: 8 },
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: GRID_SPACING },
  mediaItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceSoft,
  },
  centerLoader: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
});

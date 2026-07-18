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
  Linking,
  Dimensions,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useMutation } from "convex/react";
import { api as convexApi } from "../../../convex/_generated/api";
import { api, getFriendlyApiError, socialRequest, viewerRequest } from "../../api/api";
import { getUserSession } from "../../utils/userSession";
import { UploadManager } from "../../utils/UploadManager";
import { useAppTheme } from "../../theme";
import AppIcon from "../../icons/AppIcon";
import PostGridItem from "../postCard/PostGridItem";
import OverallRating from "./OverallRating";
import CreateJobModal from "../Jobs/MyJobs/CreateJobModal";
import HiringNoticeModal from "../Jobs/HiringNoticeModal";
import { cachedGet } from "../../utils/offlineCache";
import { useLanguage } from "../../LanguageContext";
import CachedDataNotice from "../../components/CachedDataNotice";
import { isNetworkError } from "../../utils/network";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_COLUMNS = 3;
const GRID_SPACING = 2;
const GRID_ITEM_SIZE = (SCREEN_WIDTH - GRID_SPACING * (GRID_COLUMNS + 1)) / GRID_COLUMNS;
const COPY = {
  en: { followers:"Followers",following:"Following",follow:"Follow",hire:"Hire Me",edit:"Edit Profile",insights:"Insights",services:"Services",media:"Media",done:"Jobs Done",posted:"Jobs Posted",noPosts:"No posts yet",noPostsBody:"Media will appear here once shared",notFound:"Profile not found",retry:"Try again",noDone:"No completed jobs yet",noPosted:"No jobs posted yet" },
  sw: { followers:"Followers",following:"Following",follow:"Fuata",hire:"Niajiri",edit:"Hariri Profaili",insights:"Maarifa",services:"Huduma",media:"Media",done:"Kazi Zilizofanyika",posted:"Kazi Zilizowekwa",noPosts:"Hakuna posts bado",noPostsBody:"Media itaonekana hapa ikishachapishwa",notFound:"Profaili haikupatikana",retry:"Jaribu tena",noDone:"Hakuna kazi zilizokamilika",noPosted:"Hakuna kazi zilizowekwa" },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function profilePhotosFor(profile) {
  const photos = listFrom(profile?.profile_photos || profile?.profilePhotos || profile?.profile_pictures || profile?.profilePictures);
  const primary = profile?.profile_pic || profile?.profilePic;
  return [primary, ...photos].filter(Boolean).filter((item, index, arr) => arr.indexOf(item) === index).slice(0, 2);
}

function avatarFor(profile) {
  const primary = profilePhotosFor(profile)[0];
  if (primary) return primary;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    profile?.username || profile?.full_name || "User"
  )}&background=1683C7&color=fff&bold=true&length=2&fontsize=0.33&rounded=true`;
}

function parseSocialItem(item) {
  const str = String(item || "").toLowerCase();
  if (str.includes("instagram")) return "instagram";
  if (str.includes("facebook")) return "facebook";
  if (str.includes("twitter") || str.includes("x.com")) return "twitter";
  if (str.includes("github")) return "github";
  if (str.includes("linkedin")) return "linkedin";
  if (str.includes("youtube")) return "youtube";
  if (str.includes("tiktok")) return "music";
  return "globe";
}

function openSocialUrl(platform, rawString) {
  const username = String(rawString || "").replace(/^(instagram|facebook|twitter|github|linkedin|youtube|tiktok):\s*/i, "").trim();
  let url = username.startsWith("http") ? username : (username.includes(".") ? `https://${username}` : "");
  if (platform === "instagram") url = `https://instagram.com/${username.replace(/^@/, "")}`;
  if (platform === "facebook") url = `https://facebook.com/${username.replace(/\s/g, "")}`;
  if (platform === "twitter") url = `https://twitter.com/${username.replace(/^@/, "")}`;
  if (platform === "github") url = `https://github.com/${username}`;
  if (platform === "linkedin") url = `https://linkedin.com/in/${username}`;
  if (platform === "youtube") url = `https://youtube.com/@${username}`;
  if (url) Linking.openURL(url).catch(() => {});
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
  value: { fontSize: 20, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0 },
  label: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.65)", marginTop: 2, textTransform: "uppercase", letterSpacing: 0 },
});

function ServiceChip({ label, theme }) {
  return (
    <View style={[chipStyles.wrap, { backgroundColor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.08)" }]}>
      <Text style={[chipStyles.text, { color: "#FFFFFF" }]}>{label}</Text>
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

function PublicStatBlock({ label, value, onPress, styles }) {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container onPress={onPress} style={styles.publicStatBlock} activeOpacity={0.72}>
      <Text style={styles.publicStatValue}>{value}</Text>
      <Text style={styles.publicStatLabel}>{label}</Text>
    </Container>
  );
}

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
  const { language } = useLanguage();
  const t = COPY[language] || COPY.en;
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showingCached, setShowingCached] = useState(false);
  const [isMine, setIsMine] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followSubmitting, setFollowSubmitting] = useState(false);
  const [showHireModal, setShowHireModal] = useState(false);
  const [hireSubmitting, setHireSubmitting] = useState(false);
  const [hireNotice, setHireNotice] = useState(null);
  const publishRealtimeEvent = useMutation(convexApi.realtimeEvents.publish);
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

      const [profileResult, postsResult] = await Promise.all([
        cachedGet(`profile:${uuid}`, () => api.get(`/profiles/${uuid}`).then((res) => res.data)),
        cachedGet(`posts:provider:${uuid}`, () => api.get(`/posts/provider/${uuid}`).then((res) => res.data)),
      ]);
      const nextProfile = profileResult?.data?.profile || null;
      setProfile(nextProfile);
      setFollowing(!!nextProfile?.is_following || !!nextProfile?.is_followed_by_me);
      setPosts(Array.isArray(postsResult?.data?.posts) ? postsResult.data.posts : []);
      setShowingCached(profileResult.fromCache || postsResult.fromCache);
      setJobsDone(Array.isArray(nextProfile?.completed_jobs) ? nextProfile.completed_jobs : []);
      setJobsPosted(Array.isArray(nextProfile?.posted_jobs) ? nextProfile.posted_jobs : []);
    } catch (err) {
      setError(getFriendlyApiError(err, language));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [language, route.params?.uuid, route.params?.providerUuid, route.params?.providerId]);

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
        const fallbackFollowers = Math.max(0, currentFollowers + (nextFollowing ? 1 : -1));
        const nextFollowers = Number.isFinite(Number(res?.data?.followers_count))
          ? Number(res.data.followers_count)
          : fallbackFollowers;
        const nextFollowingCount = Number.isFinite(Number(res?.data?.profile_following_count))
          ? Number(res.data.profile_following_count)
          : Number(current.following_count || 0);
        return {
          ...current,
          followers_count: nextFollowers,
          follower_count: nextFollowers,
          following_count: nextFollowingCount,
          is_following: nextFollowing,
          is_followed_by_me: nextFollowing,
        };
      });
      if (res?.data?.actor_uuid) {
        await publishRealtimeEvent({
          channel: `profile:${res.data.actor_uuid}`,
          event: nextFollowing ? "following_added" : "following_removed",
          count: Number(res?.data?.following_count) || 0,
        });
      }
    } catch (err) {
      console.log("follow error:", err?.message);
    } finally {
      setFollowSubmitting(false);
    }
  };

  const submitHireRequest = async (payload) => {
    if (!profile?.uuid || hireSubmitting) return;
    setHireSubmitting(true);
    try {
      const media = payload.images?.length
        ? await UploadManager.startUpload(payload.images, "jobs")
        : [];
      await viewerRequest("post", "/hiring/direct-hire", {
        target_provider_uuid: profile.uuid,
        title: payload.title,
        description: payload.description,
        service_type: payload.service_type || services[0] || "Direct Hire",
        location: payload.location || "Direct hire",
        availability_required: payload.availability_required,
        scheduled_for: payload.scheduled_for || null,
        availability_notes: payload.availability_notes || null,
        budget: payload.budget || null,
        requirements: payload.requirements || [],
        skills: payload.skills || [],
        media,
      });
      setShowHireModal(false);
      setHireNotice({
        type: "success",
        title: language === "sw" ? "Ombi limetumwa" : "Request sent",
        body: language === "sw"
          ? `@${profile.username || "user"} ataona direct hire hii kwenye Maombi.`
          : `@${profile.username || "user"} will see this direct hire in Requests.`,
      });
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

  const navigateToFollowers = () =>
    navigation.navigate("ConnectionsScreen", {
      initialTab: "followers",
      profileUuid: profile?.uuid,
      username: profile?.username,
    });

  const navigateToFollowing = () =>
    navigation.navigate("ConnectionsScreen", {
      initialTab: "following",
      profileUuid: profile?.uuid,
      username: profile?.username,
    });

  // ── Tab Content ────────────────────────────────────────────────────────────

  const renderMediaTab = () => {
    if (!posts.length)
      return <EmptyState icon="image" title={t.noPosts} subtitle={t.noPostsBody} theme={theme} />;
    const openPost = (post) => {
      const mediaPosts = posts.filter((item) => Array.isArray(item?.media) && item.media.length > 0);
      navigation.navigate("PostFeedView", {
        posts: mediaPosts.length ? mediaPosts : posts,
        initialPostId: post.id,
        preferredAuthActor: "viewer",
      });
    };
    return (
      <View style={styles.mediaGrid}>
        {posts.map((post) => (
          <PostGridItem
            key={String(post.id)}
            post={post}
            size={GRID_ITEM_SIZE}
            onPress={() => openPost(post)}
          />
        ))}
      </View>
    );
  };

  // Per-item badge instead of one fixed label for the whole list — "Jobs
  // Done" is always a completed job so a constant badge is accurate there,
  // but "Jobs Posted" spans open/filled/closed/cancelled jobs, so the badge
  // has to reflect each job's own status.
  const renderJobsTab = (items, loading_, icon, emptyTitle, badgeFor) => {
    if (loading_) return (
      <View style={styles.centerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
    if (!items.length)
      return <EmptyState icon={icon} title={emptyTitle} theme={theme} />;
    return (
      <View>
        {items.map((item) => {
          const b = badgeFor(item);
          return (
            <TouchableOpacity key={String(item.id)} style={styles.profileJobRow} onPress={() => navigation.navigate("JobDetails", { jobId: item.id })}>
              <View style={styles.profileJobIcon}><AppIcon name={icon} size={15} color={theme.colors.primary} /></View>
              <Text style={styles.profileJobTitle} numberOfLines={1}>{item.title || "Untitled"}</Text>
              <Text style={[styles.profileJobBadge, { color: b.color }]}>{b.label}</Text>
              <AppIcon name="chevron-right" size={14} color={theme.colors.textMuted} />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const doneBadge = () => ({ label: language === "sw" ? "Imekamilika" : "Done", color: "#2E7D32" });
  const postedBadge = (item) => {
    const st = String(item?.status || "").toLowerCase();
    if (["filled", "closed", "completed"].includes(st)) return { label: language === "sw" ? "Imefungwa" : "Closed", color: "#2E7D32" };
    if (st === "cancelled") return { label: language === "sw" ? "Imeghairiwa" : "Cancelled", color: "#C62828" };
    return { label: language === "sw" ? "Wazi" : "Open", color: "#E65100" };
  };

  const renderTabContent = () => {
    if (activeTab === "media") return renderMediaTab();
    if (activeTab === "jobsDone")
      return renderJobsTab(jobsDone, loadingJobsDone, "check-circle", t.noDone, doneBadge);
    if (activeTab === "jobsPosted")
      return renderJobsTab(jobsPosted, loadingJobsPosted, "briefcase", t.noPosted, postedBadge);
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
        <Text style={styles.errorTitle}>{error || t.notFound}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadProfile()}>
          <Text style={styles.retryText}>{t.retry}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const services = listFrom(profile.services);
  const worksDoneCount = Number(profile.completed_jobs_count || profile.jobs_attained_count || 0);
  const followerCount = profile.followers_count || profile.follower_count || 0;
  const followingCount = profile.following_count || 0;

  const socialsRaw = listFrom(profile.socials);
  const phoneNumber = profile.phone_number || profile.phone_numbers?.[0]?.number || profile.phone_numbers?.[0] || "";
  const coverPhoto = profilePhotosFor(profile)[0] || avatarFor(profile);

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 40) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        <CachedDataNotice visible={showingCached} />
        <View style={styles.publicTopBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <AppIcon name="arrowLeft" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.publicNavTitle}>@{profile.username || "user"}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.publicCoverWrap}>
          <Image source={{ uri: coverPhoto }} style={styles.publicCoverImage} blurRadius={16} />
          <LinearGradient colors={["rgba(22,131,199,0.12)", "rgba(22,131,199,0.52)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.publicCover} />
          <View style={styles.publicAvatarRing}>
            <Image source={{ uri: avatarFor(profile) }} style={styles.publicAvatar} />
          </View>
        </View>

        <View style={styles.publicInfo}>
          <View style={styles.publicInfoHeader}>
            <View style={styles.publicNameBlock}>
              <Text style={styles.publicUsername}>@{profile.username || "user"}</Text>
              {profile.full_name ? <Text style={styles.publicFullName}>{profile.full_name}</Text> : null}
              <OverallRating value={profile.ratings} count={profile.ratings_count} theme={theme} compact textColor={theme.colors.warning} mutedColor={theme.colors.textMuted} />
            </View>
            {!isMine ? (
              <View style={styles.publicActionStack}>
                <TouchableOpacity
                  style={[styles.publicFollowBtn, following && styles.publicFollowingBtn, followSubmitting && styles.disabledBtn]}
                  onPress={toggleFollow}
                  disabled={followSubmitting}
                  activeOpacity={0.85}
                >
                  <AppIcon name={following ? "check-circle" : "plusUser"} size={15} color={following ? theme.colors.primary : theme.colors.onPrimary} />
                  <Text style={[styles.publicFollowText, following && styles.publicFollowingText]}>{following ? t.following : t.follow}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.publicHireBtn} onPress={() => setShowHireModal(true)} activeOpacity={0.85}>
                  <AppIcon name="briefcase" size={15} color={theme.colors.onAccent} />
                  <Text style={styles.publicHireText}>{t.hire}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
          {profile.bio ? <Text style={styles.publicBio}>{profile.bio}</Text> : null}
          <View style={styles.publicStatsRow}>
            <PublicStatBlock label={t.followers} value={formatCount(followerCount)} onPress={navigateToFollowers} styles={styles} />
            <PublicStatBlock label={t.following} value={formatCount(followingCount)} onPress={navigateToFollowing} styles={styles} />
            <PublicStatBlock label={t.done} value={formatCount(worksDoneCount)} styles={styles} />
          </View>
        </View>

        {(phoneNumber || socialsRaw.length || services.length) ? (
          <View style={styles.publicDetails}>
            {phoneNumber ? (
              <View style={styles.publicContactItem}>
                <AppIcon name="phone" size={17} color={theme.colors.primary} />
                <Text style={styles.publicContactText}>{phoneNumber}</Text>
              </View>
            ) : null}
            {socialsRaw.length ? (
              <View style={styles.publicSocialRow}>
                {socialsRaw.map((raw, index) => {
                  const platform = parseSocialItem(raw);
                  return (
                    <TouchableOpacity key={String(raw) + index} style={styles.publicSocialBtn} onPress={() => openSocialUrl(platform, raw)}>
                      <AppIcon name={platform} size={17} color={theme.colors.primary} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
            {services.length ? (
              <View style={styles.publicServicesGroup}>
                <Text style={styles.publicDetailLabel}>{t.services}</Text>
                <View style={styles.publicChipsRow}>
                  {services.map((s) => <View key={String(s)} style={styles.publicServiceChip}><Text style={styles.publicServiceText}>{String(s)}</Text></View>)}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.postsSection}>
          <View style={styles.tabContainer}>
            {[
              { id: "media",      icon: "image",     label: t.media },
              { id: "jobsDone",   icon: "briefcase", label: t.done },
              { id: "jobsPosted", icon: "upload",    label: t.posted },
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
          <View style={styles.tabContent}>{renderTabContent()}</View>
        </View>
      </Animated.ScrollView>
      <CreateJobModal
        visible={showHireModal}
        onClose={() => setShowHireModal(false)}
        mode="direct"
        provider={{ uuid: profile?.uuid, username: profile?.username }}
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

  publicTopBar: { minHeight: 54, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.bg },
  publicNavTitle: { flex: 1, color: theme.colors.text, fontSize: 18, fontWeight: "900", textAlign: "center" },
  publicCoverWrap: { position: "relative", minHeight: 203, overflow: "hidden" },
  publicCover: { height: 150, width: "100%" },
  publicCoverImage: { position: "absolute", top: 0, left: 0, right: 0, height: 150, width: "100%", opacity: 0.82 },
  publicAvatarRing: { position: "absolute", left: 20, bottom: 6, borderRadius: 30, borderWidth: 4, borderColor: theme.colors.bg, backgroundColor: theme.colors.bg },
  publicAvatar: { width: 112, height: 112, borderRadius: 24, backgroundColor: theme.colors.surfaceSoft },
  publicInfo: { paddingHorizontal: 20, paddingBottom: 10 },
  publicInfoHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  publicNameBlock: { flex: 1, minWidth: 0 },
  publicUsername: { color: theme.colors.text, fontSize: 25, lineHeight: 30, fontWeight: "900" },
  publicFullName: { color: theme.colors.textMuted, fontSize: 13, fontWeight: "800", marginTop: 2 },
  publicActionStack: { width: 112, gap: 8 },
  publicFollowBtn: { minHeight: 38, borderRadius: theme.radius.xs, backgroundColor: theme.colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  publicFollowingBtn: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  publicFollowText: { color: theme.colors.onPrimary, fontSize: 13, fontWeight: "900" },
  publicFollowingText: { color: theme.colors.primary },
  publicHireBtn: { minHeight: 38, borderRadius: theme.radius.xs, backgroundColor: theme.colors.accent, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  publicHireText: { color: theme.colors.onAccent, fontSize: 13, fontWeight: "900" },
  publicBio: { color: theme.colors.textSecondary, fontSize: 14.5, lineHeight: 21, marginTop: 14 },
  publicStatsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.border },
  publicStatBlock: { flex: 1, alignItems: "center" },
  publicStatValue: { color: theme.colors.text, fontSize: 24, fontWeight: "900" },
  publicStatLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: "800", marginTop: 2 },
  publicDetails: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, gap: 10 },
  publicContactItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  publicContactText: { flex: 1, color: theme.colors.text, fontSize: 13, fontWeight: "800" },
  publicSocialRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  publicSocialBtn: { width: 34, height: 34, borderRadius: theme.radius.xs, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft },
  publicServicesGroup: { gap: 8 },
  publicDetailLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  publicChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  publicServiceChip: { borderRadius: theme.radius.xs, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.primarySoft, paddingHorizontal: 10, minHeight: 32, justifyContent: "center" },
  publicServiceText: { color: theme.colors.primary, fontSize: 12, fontWeight: "900" },
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

  // Header gradient (dark)
  headerGradient: {
    paddingBottom: 0,
    position: "relative",
  },
  heroNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 0,
  },
  heroNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroNavSpacer: { width: 38, height: 38 },

  heroCenter: {
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  avatarRing: {
    position: "relative",
    marginBottom: 0,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  heroUsername: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
  },
  heroFullName: {
    fontSize: 12,
    color: "rgba(255,255,255,0.72)",
    fontWeight: "700",
    marginTop: 3,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  ratingContainer: {
    marginTop: 6,
    alignItems: "center",
  },
  heroCopy: { width: "100%", alignItems: "center" },

  // Bio – centred
  bioText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 21,
    textAlign: "center",
    paddingHorizontal: 30,
    paddingBottom: 12,
  },

  // Stats row – tight
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: 20,
  },

  // Action row
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 8,
  },
  followBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    minHeight: 48,
    paddingVertical: 11,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  followingBtn: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    shadowOpacity: 0,
  },
  disabledBtn: { opacity: 0.62 },
  followText: { color: theme.colors.primary, fontWeight: "700", fontSize: 15 },
  followingText: { color: "#FFFFFF" },
  insightsBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    minHeight: 48,
    paddingVertical: 11,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  insightsBtnText: { color: theme.colors.primary, fontWeight: "700", fontSize: 15 },
  hireBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    minHeight: 48,
    paddingVertical: 11,
    borderRadius: 14,
  },
  hireBtnText: { color: theme.colors.primary, fontWeight: "800", fontSize: 14 },

  // Services
  servicesSection: {
    paddingHorizontal: 16,
    paddingTop: 5,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  // Wave divider
  waveDivider: {
    display: "none",
    marginLeft: -20,
    marginRight: -20,
    marginBottom: -2,
  },

  // Posts section (light)
  postsSection: {
    backgroundColor: theme.colors.bg,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 16,
    marginTop: -2,
  },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 8,
    padding: 4,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 9,
    borderRadius: 6,
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
  tabContent: { paddingTop: 4 },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_SPACING,
  },
  mediaItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceSoft,
  },
  centerLoader: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  profileJobRow: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 9, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  profileJobIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft },
  profileJobTitle: { flex: 1, color: theme.colors.text, fontSize: 13, fontWeight: "800" },
  profileJobBadge: { fontSize: 10.5, fontWeight: "900" },
});

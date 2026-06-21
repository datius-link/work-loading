import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { useAppTheme } from "../theme";
import { useLanguage } from "../LanguageContext";
import AppIcon from "../icons/AppIcon";
import LoginModal from "./Auth/LoginModal";
import { useUserSession } from "../utils/userSession";
import { api, getFriendlyApiError, viewerRequest } from "../api/api";
import PostGridItem from "./postCard/PostGridItem";
import OverallRating from "./Profile/OverallRating";
import { cachedGet } from "../utils/offlineCache";
import CachedDataNotice from "../components/CachedDataNotice";

const T = {
  en: {
    title: "Profile",
    guestTitle: "Login to manage your profile",
    guestBody:
      "Create one user account to post jobs, request work, comment, like, and hire.",
    login: "Login / Register",
    edit: "Edit profile",
    insights: "Insights",
    bio: "Bio",
    socials: "Socials",
    services: "Services",
    followers: "Followers",
    following: "Following",
    media: "Media",
    jobsDone: "Jobs Done",
    jobsPosted: "Jobs Posted",
    mediaPosts: "Media Posts",
    jobPosts: "Job Posts",
    createTitle: "What do you want to create?",
    createMedia: "Create media",
    createMediaBody: "Post photos or videos about your work.",
    createJob: "Create job",
    createJobBody: "Post a job and find a service provider.",
    noBio: "No bio yet",
    noSocials: "No socials added",
    noServices: "No services added",
    noMedia: "No media posts yet",
    noJobs: "No jobs posted yet",
    visits: "Visits",
    views: "Views",
    jobsHires: "Jobs/Hires",
    vsLastMonth: "vs last month",
    totalVisits: "Total visits",
    worksDone: "Jobs Done",
    noJobsDone: "No completed jobs yet",
  },
  sw: {
    title: "Profaili",
    guestTitle: "Ingia kusimamia profaili yako",
    guestBody:
      "Tumia akaunti moja kupost kazi, kuomba kazi, comment, like, na kuajiri.",
    login: "Ingia / Jisajili",
    edit: "Hariri profaili",
    insights: "Maarifa",
    bio: "Bio",
    socials: "Socials",
    services: "Huduma",
    followers: "Followers",
    following: "Following",
    media: "Media",
    jobsDone: "Kazi zilizofanyika",
    jobsPosted: "Kazi ulizopost",
    mediaPosts: "Media Posts",
    jobPosts: "Job Posts",
    createTitle: "Unataka kutengeneza nini?",
    createMedia: "Tengeneza media",
    createMediaBody: "Post picha au video kuhusu kazi zako.",
    createJob: "Tengeneza kazi",
    createJobBody: "Post kazi ili umpate mtoa huduma.",
    noBio: "Hakuna bio bado",
    noSocials: "Hakuna socials bado",
    noServices: "Hakuna huduma bado",
    noMedia: "Hakuna media posts bado",
    noJobs: "Hakuna jobs bado",
    visits: "Waliotembelea",
    views: "Watazamaji",
    jobsHires: "Kazi/Kuajiri",
    vsLastMonth: "ikilinganishwa na mwezi uliopita",
    totalVisits: "Jumla ya waliotembelea",
    worksDone: "Kazi zilizokamilika",
    noJobsDone: "Hakuna kazi zilizokamilika bado",
  },
};

function avatarFor(profile) {
  if (profile?.profile_pic) return profile.profile_pic;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    profile?.username || profile?.email || "U"
  )}&background=0B6B63&color=fff`;
}

function listFrom(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function parseSocialItem(item) {
  const str = String(item || "").toLowerCase();
  if (str.includes("instagram")) return "instagram";
  if (str.includes("facebook")) return "facebook";
  if (str.includes("twitter") || str.includes("x.com")) return "twitter";
  if (str.includes("github")) return "github";
  if (str.includes("linkedin")) return "linkedin";
  if (str.includes("youtube")) return "youtube";
  return "link";
}

function openSocialUrl(platform, rawString) {
  let url = "";
  const username = rawString.replace(/^(instagram|facebook|twitter|github|linkedin|youtube):\s*/i, "").trim();
  switch (platform) {
    case "instagram": url = `https://instagram.com/${username.replace(/^@/, "")}`; break;
    case "facebook": url = `https://facebook.com/${username.replace(/\s/g, "")}`; break;
    case "twitter": url = `https://twitter.com/${username.replace(/^@/, "")}`; break;
    case "github": url = `https://github.com/${username}`; break;
    case "linkedin": url = `https://linkedin.com/in/${username}`; break;
    case "youtube": url = `https://youtube.com/@${username}`; break;
    default: url = username.startsWith("http") ? username : `https://${username}`;
  }
  Linking.openURL(url).catch(() => {});
}

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

export default function Profile() {
  const navigation = useNavigation();
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const t = T[language] || T.en;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { loaded, profile, email, refresh } = useUserSession();
  const [showLogin, setShowLogin] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState("media");
  const [posts, setPosts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [profileSummary, setProfileSummary] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showingCached, setShowingCached] = useState(false);
  const [profileError, setProfileError] = useState("");

  const loadProfileData = useCallback(async ({ pull = false } = {}) => {
    if (pull) setRefreshing(true);
    try {
      setProfileError("");
      const session = await refresh();
      const profileUuid = session?.profile?.uuid || session?.user?.uuid || profile?.uuid;
      const [postsRes, jobsRes] = await Promise.allSettled([
        cachedGet("posts:me", () => viewerRequest("get", "/posts/me").then((res) => res.data)),
        cachedGet("hiring:my-jobs", () => viewerRequest("get", "/hiring/my-jobs").then((res) => res.data)),
      ]);
      if (profileUuid) {
        cachedGet(`profile:${profileUuid}`, () => api.get(`/profiles/${profileUuid}`).then((res) => res.data))
          .then((result) => {
            setProfileSummary(result?.data?.profile || null);
            setShowingCached((current) => current || result.fromCache);
          })
          .catch(() => setProfileSummary(null));
      }
      setPosts(postsRes.status === "fulfilled" && Array.isArray(postsRes.value?.data?.posts) ? postsRes.value.data.posts : []);
      setJobs(jobsRes.status === "fulfilled" && Array.isArray(jobsRes.value?.data?.jobs) ? jobsRes.value.data.jobs : []);
      setShowingCached(
        (postsRes.status === "fulfilled" && postsRes.value.fromCache) ||
        (jobsRes.status === "fulfilled" && jobsRes.value.fromCache)
      );
      if (postsRes.status === "rejected" && jobsRes.status === "rejected") {
        setProfileError(getFriendlyApiError(postsRes.reason || jobsRes.reason, language));
      }
    } catch (err) {
      setProfileError(getFriendlyApiError(err, language));
    } finally {
      setRefreshing(false);
    }
  }, [language, profile?.uuid, refresh]);

  useFocusEffect(useCallback(() => { loadProfileData(); }, [loadProfileData]));

  const services = listFrom(profile?.services);
  const socialsRaw = listFrom(profile?.socials);
  const socialPlatforms = socialsRaw.map(raw => ({ platform: parseSocialItem(raw), raw })).slice(0, 10);
  const followers = Number(profile?.followers_count || profile?.followers || 0);
  const following = Number(profile?.following_count || profile?.following || 0);
  const phoneNumber = profile?.phone_number || profile?.phone_numbers?.[0]?.number || profile?.phone_numbers?.[0] || "";
  const completedJobs = Array.isArray(profileSummary?.completed_jobs) ? profileSummary.completed_jobs : [];

  function formatCount(count) {
    if (!count && count !== 0) return "0";
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  }

  if (!loaded) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!email) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <View style={styles.guest}>
          <View style={styles.guestIcon}><AppIcon name="user" size={30} color={theme.colors.primary} /></View>
          <Text style={styles.guestTitle}>{t.guestTitle}</Text>
          <Text style={styles.guestBody}>{t.guestBody}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowLogin(true)}>
            <AppIcon name="login" size={17} color={theme.colors.onPrimary} />
            <Text style={styles.primaryText}>{t.login}</Text>
          </TouchableOpacity>
        </View>
        <LoginModal visible={showLogin} onClose={() => setShowLogin(false)} onSuccess={async () => { setShowLogin(false); await refresh(); }} />
      </View>
    );
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 36 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadProfileData({ pull: true })} tintColor={theme.colors.primary} />}
      >
        <CachedDataNotice visible={showingCached} />
        {profileError ? (
          <View style={styles.offlineEmpty}>
            <Text style={styles.offlineText}>{profileError}</Text>
            <TouchableOpacity style={styles.offlineRetry} onPress={() => loadProfileData()}>
              <Text style={styles.offlineRetryText}>{language === "sw" ? "Jaribu tena" : "Retry"}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ─── DARK HEADER (avatar → services) ─── */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark || '#08544d']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          {/* Top bar: title + create button */}
          <View style={styles.topBar}>
            <Text style={styles.pageTitle}>{t.title}</Text>
            <TouchableOpacity style={styles.roundBtn} onPress={() => setShowCreate(true)}>
              <AppIcon name="plus" size={20} color={theme.colors.onPrimary} />
            </TouchableOpacity>
          </View>

          {/* Avatar + name + rating */}
          <View style={styles.hero}>
            <Image source={{ uri: avatarFor(profile) }} style={styles.avatar} />
            <View style={styles.heroInfo}>
              <Text style={styles.username}>@{profile?.username || "user"}</Text>
              <Text style={styles.fullName}>{profile?.full_name || email}</Text>
              <View style={styles.ratingContainer}>
                <OverallRating
                  value={profileSummary?.ratings ?? profile?.ratings}
                  count={profileSummary?.ratings_count ?? profile?.ratings_count}
                  theme={theme}
                  compact
                  textColor={theme.colors.onPrimary}
                  mutedColor="rgba(255,255,255,0.68)"
                />
              </View>
            </View>
          </View>

          {/* Bio (centered) */}
          {profile?.bio ? <Text style={styles.bioText}>{profile.bio}</Text> : null}

          {/* Stats row (followers / following) – tight */}
          <View style={styles.statsRow}>
            <StatPill label={t.followers} value={formatCount(followers)} onPress={() => navigation.navigate("ConnectionsScreen", { initialTab: "followers" })} />
            <View style={styles.statDivider} />
            <StatPill label={t.following} value={formatCount(following)} onPress={() => navigation.navigate("ConnectionsScreen", { initialTab: "following" })} />
          </View>

          {/* Action row: Edit + Insights */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate("EditProfile", { profile })}>
              <AppIcon name="edit" size={16} color={theme.colors.primary} />
              <Text style={styles.editBtnText}>{t.edit}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.insightsBtn} onPress={() => navigation.navigate("Insights")}>
              <AppIcon name="trending-up" size={16} color={theme.colors.primary} />
              <Text style={styles.insightsBtnText}>{t.insights}</Text>
            </TouchableOpacity>
          </View>

          {/* Services */}
          {services.length > 0 ? (
            <View style={styles.servicesSection}>
              <Text style={styles.sectionLabel}>{t.services}</Text>
              <View style={styles.chipsRow}>
                {services.map((s) => <ServiceChip key={String(s)} label={String(s)} theme={theme} />)}
              </View>
            </View>
          ) : null}

          {/* Wave divider */}
          <View style={styles.waveDivider} />
        </LinearGradient>

        {/* ─── LIGHT SECTION (tabs + posts) ─── */}
        {(phoneNumber || socialPlatforms.length) ? (
          <View style={styles.privateDetails}>
            {phoneNumber ? (
              <View style={styles.privateRow}>
                <AppIcon name="phone" size={15} color={theme.colors.primary} />
                <Text style={styles.privateValue}>{phoneNumber}</Text>
              </View>
            ) : null}
            {socialPlatforms.length ? (
              <View style={styles.socialRow}>
                {socialPlatforms.map(({ platform, raw }, index) => (
                  <TouchableOpacity key={`${raw}-${index}`} style={styles.socialBtn} onPress={() => openSocialUrl(platform, raw)}>
                    <AppIcon name={platform} size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.postsSection}>
          <View style={styles.tabs}>
            {[
              { id: "media",      label: t.media },
              { id: "jobsDone",   label: t.jobsDone },
              { id: "jobsPosted", label: t.jobsPosted },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={styles.tabBtn}
                  onPress={() => setActiveTab(tab.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
                  <View style={[styles.tabIndicator, active && styles.tabIndicatorActive]} />
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.tabContent}>
            {activeTab === "media" ? (
              posts.length ? (
                <View style={styles.mediaGrid}>
                  {posts.map((post) => (
                    <PostGridItem
                      key={String(post.id)}
                      post={post}
                      onPress={() => navigation.navigate("PostFeedView", { posts, initialPostId: post.id, preferredAuthActor: "viewer" })}
                    />
                  ))}
                </View>
              ) : <EmptyState text={t.noMedia} styles={styles} />
            ) : activeTab === "jobsDone" ? (
              completedJobs.length ? (
                completedJobs.map((job, idx) => (
                  <TouchableOpacity key={job.id || idx} style={styles.jobRow} onPress={() => navigation.navigate("ProfileWorksDone", { profileUuid: profile?.uuid, username: profile?.username, count: completedJobs.length })}>
                    <View style={styles.jobIcon}><AppIcon name="check-circle" size={17} color={theme.colors.primary} /></View>
                    <View style={styles.jobBody}><Text style={styles.jobTitle}>{job.title || "Completed"}</Text></View>
                    <AppIcon name="arrowRight" size={16} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                ))
              ) : <EmptyState text={t.noJobsDone} styles={styles} />
            ) : (
              jobs.length ? (
                jobs.map((job, idx) => (
                  <TouchableOpacity key={job.id || idx} style={styles.jobRow} onPress={() => navigation.navigate("JobDetails", { jobId: job.id })}>
                    <View style={styles.jobIcon}><AppIcon name="briefcase" size={17} color={theme.colors.primary} /></View>
                    <View style={styles.jobBody}><Text style={styles.jobTitle}>{job.title || "Posted"}</Text></View>
                    <Text style={styles.jobStatus}>{job.status}</Text>
                  </TouchableOpacity>
                ))
              ) : <EmptyState text={t.noJobs} styles={styles} />
            )}
          </View>
        </View>
      </ScrollView>

      <CreateModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreateMedia={() => { setShowCreate(false); navigation.navigate("CreatePost"); }}
        onCreateJob={() => { setShowCreate(false); navigation.navigate("MainTabs", { screen: "Jobs", params: { initialTab: "myJobs" } }); }}
        t={t}
        styles={styles}
        theme={theme}
      />
    </View>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function EmptyState({ text, styles }) {
  return <View style={styles.emptyState}><Text style={styles.emptyText}>{text}</Text></View>;
}

function CreateModal({ visible, onClose, onCreateMedia, onCreateJob, t, styles, theme }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{t.createTitle}</Text>
          <TouchableOpacity style={styles.modalOption} onPress={onCreateMedia} activeOpacity={0.85}>
            <View style={styles.modalIcon}><AppIcon name="image" size={20} color={theme.colors.primary} /></View>
            <View style={styles.modalCopy}><Text style={styles.modalOptionTitle}>{t.createMedia}</Text><Text style={styles.modalOptionBody}>{t.createMediaBody}</Text></View>
            <AppIcon name="arrowRight" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalOption} onPress={onCreateJob} activeOpacity={0.85}>
            <View style={styles.modalIcon}><AppIcon name="briefcase" size={20} color={theme.colors.primary} /></View>
            <View style={styles.modalCopy}><Text style={styles.modalOptionTitle}>{t.createJob}</Text><Text style={styles.modalOptionBody}>{t.createJobBody}</Text></View>
            <AppIcon name="arrowRight" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const createStyles = (theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg },
  content: { paddingHorizontal: 0 },
  offlineEmpty: { marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, alignItems: "center", gap: 8 },
  offlineText: { color: theme.colors.text, fontSize: 12, lineHeight: 17, textAlign: "center" },
  offlineRetry: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: theme.colors.primary },
  offlineRetryText: { color: theme.colors.onPrimary, fontSize: 12, fontWeight: "900" },

  // Guest
  guest: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  guestIcon: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft, marginBottom: 16 },
  guestTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "900", textAlign: "center" },
  guestBody: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 8 },
  primaryBtn: { marginTop: 18, minHeight: 48, borderRadius: 24, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: theme.colors.primary },
  primaryText: { color: theme.colors.onPrimary, fontWeight: "900" },

  // Header gradient (dark)
  headerGradient: {
    paddingBottom: 14,
    position: "relative",
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 8,
  },
  pageTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  roundBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  hero: {
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
    paddingBottom: 10,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
    backgroundColor: theme.colors.surfaceSoft,
  },
  heroInfo: {
    width: "100%",
    alignItems: "center",
  },
  username: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  fullName: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
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

  // Bio – centred
  bioText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 21,
    textAlign: "center",
    paddingHorizontal: 10,
    paddingBottom: 12,
  },

  // Stats row – tight
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 13,
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
    paddingTop: 14,
    paddingBottom: 12,
    gap: 10,
  },
  editBtn: {
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
  editBtnText: {
    color: theme.colors.primary,
    fontWeight: "700",
    fontSize: 15,
  },
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
  },
  insightsBtnText: {
    color: theme.colors.primary,
    fontWeight: "700",
    fontSize: 15,
  },

  // Services
  servicesSection: {
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
  },

  // Posts section (light)
  postsSection: {
    backgroundColor: theme.colors.bg,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
    marginTop: 0,
  },
  privateDetails: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.bg,
  },
  privateRow: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 7 },
  privateValue: { flex: 1, color: theme.colors.text, fontSize: 12.5, fontWeight: "800" },
  socialRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  socialBtn: { width: 31, height: 31, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft },

  // Tabs
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginTop: 2,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  tabText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: "900",
  },
  tabTextActive: {
    color: theme.colors.text,
  },
  tabIndicator: {
    height: 2,
    width: "100%",
    marginTop: 8,
    backgroundColor: "transparent",
  },
  tabIndicatorActive: {
    backgroundColor: theme.colors.primary,
  },

  tabContent: {
    marginTop: 8,
  },

  // Media grid
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -1,
  },

  // Jobs list
  jobRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  jobIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
  },
  jobBody: { flex: 1 },
  jobTitle: { color: theme.colors.text, fontSize: 14, fontWeight: "900" },
  jobStatus: { color: theme.colors.primary, fontSize: 12, fontWeight: "900" },

  // Empty state
  emptyState: {
    paddingVertical: 52,
    alignItems: "center",
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: "800",
  },

  // Create modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
  },
  modalHandle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    alignSelf: "center",
    backgroundColor: theme.colors.border,
    marginBottom: 18,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 12,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
  },
  modalCopy: { flex: 1 },
  modalOptionTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  modalOptionBody: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
    lineHeight: 17,
  },
});

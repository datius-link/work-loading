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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { useAppTheme } from "../theme";
import { useLanguage } from "../LanguageContext";
import AppIcon from "../icons/AppIcon";
import LoginModal from "./Auth/LoginModal";
import { useUserSession } from "../utils/userSession";
import { api, viewerRequest } from "../api/api";
import PostGridItem from "./postCard/PostGridItem";

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
    recommendations: "Recommendations",
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
    recommendations: "Mapendekezo",
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

  const loadProfileData = useCallback(async ({ pull = false } = {}) => {
    if (pull) setRefreshing(true);
    try {
      const session = await refresh();
      const profileUuid = session?.profile?.uuid || session?.user?.uuid || profile?.uuid;
      const [postsRes, jobsRes] = await Promise.allSettled([
        viewerRequest("get", "/posts/me"),
        viewerRequest("get", "/hiring/my-jobs"),
      ]);
      if (profileUuid) {
        api.get(`/profiles/${profileUuid}`)
          .then((res) => setProfileSummary(res?.data?.profile || null))
          .catch(() => setProfileSummary(null));
      }
      setPosts(postsRes.status === "fulfilled" && Array.isArray(postsRes.value?.data?.posts) ? postsRes.value.data.posts : []);
      setJobs(jobsRes.status === "fulfilled" && Array.isArray(jobsRes.value?.data?.jobs) ? jobsRes.value.data.jobs : []);
    } finally {
      setRefreshing(false);
    }
  }, [profile?.uuid, refresh]);

  useFocusEffect(useCallback(() => { loadProfileData(); }, [loadProfileData]));

  const services = listFrom(profile?.services);
  const socialsRaw = listFrom(profile?.socials);
  const socialPlatforms = socialsRaw.map(raw => ({ platform: parseSocialItem(raw), raw })).slice(0, 10);
  const followers = Number(profile?.followers_count || profile?.followers || 0);
  const following = Number(profile?.following_count || profile?.following || 0);
  const visits = Number(profile?.visits_count || profile?.visits || 0);
  const views = Number(profile?.views_count || profile?.views || 0);
  const jobsHires = Number(profile?.jobs_hires_count || profile?.jobs_hires || jobs.length || 0);
  const completedJobs = Array.isArray(profileSummary?.completed_jobs) ? profileSummary.completed_jobs : [];
  const postedJobsCount = Number(profileSummary?.posted_jobs_count || profile?.posted_jobs_count || jobs.length || 0);
  const recommendationsCount = Number(profileSummary?.recommendations_count || profile?.recommendations_count || profile?.ratings_count || 0);
  const worksDoneCount = Number(profileSummary?.completed_jobs_count || profileSummary?.jobs_attained_count || completedJobs.length || 0);

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
        {/* Header */}
        <View style={styles.topBar}>
          <Text style={styles.pageTitle}>{t.title}</Text>
          <TouchableOpacity style={styles.roundBtn} onPress={() => setShowCreate(true)}>
            <AppIcon name="plus" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Hero: Avatar, Username, Fullname */}
        <View style={styles.hero}>
          <Image source={{ uri: avatarFor(profile) }} style={styles.avatar} />
          <View style={styles.heroInfo}>
            <Text style={styles.username}>@{profile?.username || "user"}</Text>
            <Text style={styles.fullName}>{profile?.full_name || email}</Text>
          </View>
        </View>

        {/* Followers / Following row */}
        <View style={styles.statsLine}>
          <TouchableOpacity onPress={() => navigation.navigate("ConnectionsScreen", { initialTab: "followers" })}>
            <Text style={styles.statValue}>{followers.toLocaleString()}</Text>
            <Text style={styles.statLabel}>{t.followers}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("ConnectionsScreen", { initialTab: "following" })}>
            <Text style={styles.statValue}>{following.toLocaleString()}</Text>
            <Text style={styles.statLabel}>{t.following}</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.statValue}>{posts.length.toLocaleString()}</Text>
            <Text style={styles.statLabel}>{t.mediaPosts}</Text>
          </View>
          <View>
            <Text style={styles.statValue}>{jobs.length.toLocaleString()}</Text>
            <Text style={styles.statLabel}>{t.jobPosts}</Text>
          </View>
        </View>

        {/* Bio */}
        {profile?.bio ? <Text style={styles.bioText}>{profile.bio}</Text> : null}

        <TouchableOpacity style={styles.insightsButton} onPress={() => navigation.navigate("Insights")} activeOpacity={0.86}>
          <View style={styles.insightsIcon}>
            <AppIcon name="chart" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.insightsCopy}>
            <Text style={styles.insightsTitle}>{t.insights}</Text>
            <Text style={styles.insightsSub}>
              {`${visits.toLocaleString()} ${t.visits} • ${views.toLocaleString()} ${t.views} • ${jobsHires.toLocaleString()} ${t.jobsHires}`}
            </Text>
          </View>
          <AppIcon name="arrowRight" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.communityActions}>
          <CommunityButton
            label={t.recommendations}
            count={recommendationsCount}
            icon="activity"
            onPress={() => navigation.navigate("ProfileRecommendations", { profileUuid: profile?.uuid, username: profile?.username, count: recommendationsCount })}
            styles={styles}
            theme={theme}
          />
          <CommunityButton
            label={t.worksDone}
            count={worksDoneCount}
            icon="briefcase"
            onPress={() => navigation.navigate("ProfileWorksDone", { profileUuid: profile?.uuid, username: profile?.username, count: worksDoneCount })}
            styles={styles}
            theme={theme}
          />
        </View>

        {/* Edit Button */}
        <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate("EditProfile", { profile })}>
          <AppIcon name="edit" size={18} color={theme.colors.primary} />
          <Text style={styles.editBtnText}>{t.edit}</Text>
        </TouchableOpacity>

        {services.length ? (
          <View style={styles.servicesSection}>
            <Text style={styles.sectionTitle}>{t.services}</Text>
            <View style={styles.chipsWrap}>
              {services.map((item) => (
                <View key={String(item)} style={styles.chip}>
                  <Text style={styles.chipText}>{String(item)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {socialPlatforms.length ? (
          <View style={styles.socialsSection}>
            <Text style={styles.sectionTitle}>{t.socials}</Text>
            <View style={styles.socialIconsRow}>
              {socialPlatforms.map((social, idx) => (
                <TouchableOpacity key={idx} onPress={() => openSocialUrl(social.platform, social.raw)} style={styles.socialIconBtn}>
                  <AppIcon name={social.platform} size={28} color={theme.colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        {/* Tabs */}
        <View style={styles.tabs}>
          <TabButton label={t.media} active={activeTab === "media"} onPress={() => setActiveTab("media")} styles={styles} />
          <TabButton label={t.jobsDone} active={activeTab === "jobsDone"} onPress={() => setActiveTab("jobsDone")} styles={styles} />
          <TabButton label={t.jobsPosted} active={activeTab === "jobsPosted"} onPress={() => setActiveTab("jobsPosted")} styles={styles} />
        </View>

        {/* Tab Content */}
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
          <View style={styles.jobsList}>
            {completedJobs.map((job, index) => (
              <TouchableOpacity
                key={job.id || job.job_code || index}
                style={styles.jobRow}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("ProfileWorksDone", { profileUuid: profile?.uuid, username: profile?.username, count: worksDoneCount })}
              >
                <View style={styles.jobIcon}><AppIcon name="check-circle" size={17} color={theme.colors.primary} /></View>
                <View style={styles.jobBody}>
                  <Text style={styles.jobTitle} numberOfLines={1}>{job.title || "Completed job"}</Text>
                  <Text style={styles.jobMeta}>{job.job_code || job.status || "Completed"}</Text>
                </View>
                <AppIcon name="arrowRight" size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
          ) : <EmptyState text={t.noJobsDone} styles={styles} />
        ) : jobs.length ? (
          <View style={styles.jobsList}>
            {jobs.map((job, index) => (
              <TouchableOpacity
                key={job.id || job.job_code || index}
                style={styles.jobRow}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("JobDetails", { jobId: job.id })}
              >
                <View style={styles.jobIcon}><AppIcon name="briefcase" size={17} color={theme.colors.primary} /></View>
                <View style={styles.jobBody}>
                  <Text style={styles.jobTitle} numberOfLines={1}>{job.title || "Posted job"}</Text>
                  <Text style={styles.jobMeta}>{job.location || job.job_code || "Posted"}</Text>
                </View>
                <Text style={styles.jobStatus}>{job.status}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : <EmptyState text={postedJobsCount ? `${postedJobsCount.toLocaleString()} ${t.jobPosts}` : t.noJobs} styles={styles} />}
      </ScrollView>

      <CreateModal visible={showCreate} onClose={() => setShowCreate(false)} onCreateMedia={() => { setShowCreate(false); navigation.navigate("CreatePost"); }} onCreateJob={() => { setShowCreate(false); navigation.navigate("MainTabs", { screen: "Jobs", params: { initialTab: "myJobs" } }); }} t={t} styles={styles} theme={theme} />
    </View>
  );
}

function CommunityButton({ label, count, icon, onPress, styles, theme }) {
  return (
    <TouchableOpacity style={styles.communityButton} onPress={onPress} activeOpacity={0.86}>
      <View style={styles.communityIcon}>
        <AppIcon name={icon} size={18} color={theme.colors.primary} />
      </View>
      <View style={styles.communityCopy}>
        <Text style={styles.communityCount}>{Number(count || 0).toLocaleString()}</Text>
        <Text style={styles.communityLabel}>{label}</Text>
      </View>
      <AppIcon name="arrowRight" size={17} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );
}

function InsightMetric({ label, data, styles, theme, t }) {
  const isPositive = data.change >= 0;
  return (
    <View style={styles.insightMetric}>
      <Text style={styles.insightValue}>{data.value.toLocaleString()}</Text>
      <Text style={styles.insightLabel}>{label}</Text>
      <View style={styles.changeRow}>
        <AppIcon name={isPositive ? "arrowUp" : "arrowDown"} size={12} color={isPositive ? theme.colors.success : theme.colors.error} />
        <Text style={[styles.changeText, { color: isPositive ? theme.colors.success : theme.colors.error }]}>
          {Math.abs(data.change)}% ({isPositive ? "+" : ""}{data.changeValue.toLocaleString()})
        </Text>
      </View>
      <Text style={styles.vsText}>{t.vsLastMonth}</Text>
    </View>
  );
}

function TabButton({ label, active, onPress, styles }) {
  return (
    <TouchableOpacity style={styles.tabBtn} onPress={onPress} activeOpacity={0.85}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
      <View style={[styles.tabIndicator, active && styles.tabIndicatorActive]} />
    </TouchableOpacity>
  );
}

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

const createStyles = (theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg },
  content: { paddingHorizontal: 16 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  pageTitle: { color: theme.colors.text, fontSize: 24, fontWeight: "900" },
  roundBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surfaceSoft },
  guest: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  guestIcon: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft, marginBottom: 16 },
  guestTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "900", textAlign: "center" },
  guestBody: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 8 },
  primaryBtn: { marginTop: 18, minHeight: 48, borderRadius: 24, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: theme.colors.primary },
  primaryText: { color: theme.colors.onPrimary, fontWeight: "900" },
  hero: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 8 },
  avatar: { width: 86, height: 86, borderRadius: 43, backgroundColor: theme.colors.surfaceSoft },
  heroInfo: { flex: 1 },
  username: { color: theme.colors.text, fontSize: 23, fontWeight: "900" },
  fullName: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: "800", marginTop: 4 },
  statsLine: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 10 },
  statValue: { color: theme.colors.text, fontSize: 17, fontWeight: "900", textAlign: "center" },
  statLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: "700", textAlign: "center" },
  bioText: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 14 },
  sectionTitle: { color: theme.colors.text, fontSize: 16, fontWeight: "900", marginBottom: 10 },
  insightsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 10,
  },
  insightsIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
  },
  insightsCopy: { flex: 1, minWidth: 0 },
  insightsTitle: { color: theme.colors.text, fontSize: 15, fontWeight: "900" },
  insightsSub: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "700", marginTop: 3 },
  insightsSection: { marginBottom: 20 },
  communityActions: { gap: 4, marginBottom: 12 },
  communityButton: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingVertical: 6 },
  communityIcon: { width: 38, height: 38, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft },
  communityCopy: { flex: 1, minWidth: 0 },
  communityCount: { color: theme.colors.text, fontSize: 18, fontWeight: "900" },
  communityLabel: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: 2 },
  insightsRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  insightMetric: { flex: 1, alignItems: "center", backgroundColor: theme.colors.surfaceSoft, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8 },
  insightValue: { color: theme.colors.text, fontSize: 18, fontWeight: "900" },
  insightLabel: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "700", marginTop: 2 },
  changeRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 6 },
  changeText: { fontSize: 10, fontWeight: "800" },
  vsText: { fontSize: 9, color: theme.colors.textMuted, marginTop: 3 },
  editBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: theme.colors.surfaceSoft, borderRadius: 8, paddingVertical: 11, marginBottom: 14 },
  editBtnText: { color: theme.colors.primary, fontSize: 15, fontWeight: "800" },
  contactRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: theme.colors.surfaceSoft, borderRadius: 16, padding: 14, marginBottom: 20, gap: 12 },
  contactItem: { flex: 1, alignItems: "center", gap: 4 },
  contactLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  contactValue: { color: theme.colors.text, fontSize: 12, fontWeight: "700", textAlign: "center" },
  servicesSection: { marginBottom: 14 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: theme.colors.surfaceSoft },
  chipText: { color: theme.colors.text, fontSize: 13, fontWeight: "800" },
  socialsSection: { marginBottom: 14 },
  socialIconsRow: { flexDirection: "row", flexWrap: "wrap", gap: 18, alignItems: "center" },
  socialIconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surfaceSoft, alignItems: "center", justifyContent: "center" },
  placeholderText: { color: theme.colors.textMuted, fontSize: 13 },
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: theme.colors.border, marginTop: 2 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabText: { color: theme.colors.textMuted, fontSize: 14, fontWeight: "900" },
  tabTextActive: { color: theme.colors.text },
  tabIndicator: { height: 2, width: "100%", marginTop: 8, backgroundColor: "transparent" },
  tabIndicatorActive: { backgroundColor: theme.colors.primary },
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -1, marginTop: 4 },
  mediaItem: { width: "33.333%", aspectRatio: 1, padding: 1 },
  mediaImage: { width: "100%", height: "100%", backgroundColor: theme.colors.surfaceSoft },
  mediaBadge: { position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  jobsList: { marginTop: 8 },
  jobRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  jobIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft },
  jobBody: { flex: 1 },
  jobTitle: { color: theme.colors.text, fontSize: 14, fontWeight: "900" },
  jobMeta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  jobStatus: { color: theme.colors.primary, fontSize: 12, fontWeight: "900" },
  emptyState: { paddingVertical: 52, alignItems: "center" },
  emptyText: { color: theme.colors.textMuted, fontSize: 14, fontWeight: "800" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28 },
  modalHandle: { width: 42, height: 5, borderRadius: 999, alignSelf: "center", backgroundColor: theme.colors.border, marginBottom: 18 },
  modalTitle: { color: theme.colors.text, fontSize: 19, fontWeight: "900", marginBottom: 12 },
  modalOption: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  modalIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft },
  modalCopy: { flex: 1 },
  modalOptionTitle: { color: theme.colors.text, fontSize: 15, fontWeight: "900" },
  modalOptionBody: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "700", marginTop: 3, lineHeight: 17 },
});

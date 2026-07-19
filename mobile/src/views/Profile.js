import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Dimensions, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, Linking } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { useAppTheme } from "../theme";
import { useLanguage } from "../LanguageContext";
import AppIcon from "../icons/AppIcon";
import EkaziLogo from "../../assets/e-kazi-logo.svg";
import { useUserSession } from "../utils/userSession";
import { api, getFriendlyApiError, viewerRequest } from "../api/api";
import PostGridItem from "./postCard/PostGridItem";
import OverallRating from "./Profile/OverallRating";
import { cachedGet } from "../utils/offlineCache";
import CachedDataNotice from "../components/CachedDataNotice";
import OverflowMenu from "../components/OverflowMenu";

const T = {
  en: { title: "Profile", guestTitle: "Login to manage your profile", guestBody: "Create one user account to post jobs, request work, comment, like, and hire.", login: "Login / Register", edit: "Edit", insights: "Insights", services: "Services", followers: "Followers", following: "Following", jobsDone: "Jobs Done", media: "Media", jobsPosted: "Jobs Posted", createTitle: "What do you want to create?", createMedia: "Create media", createMediaBody: "Post photos or videos about your work.", createJob: "Create job", createJobBody: "Post a job and find a service provider.", noMedia: "No media posts yet", noJobs: "No jobs posted yet", noJobsDone: "No completed jobs yet", mediaCount: "media items" },
  sw: { title: "Profaili", guestTitle: "Ingia kusimamia profaili yako", guestBody: "Tumia akaunti moja kupost kazi, kuomba kazi, comment, like, na kuajiri.", login: "Ingia / Jisajili", edit: "Hariri", insights: "Maarifa", services: "Huduma", followers: "Followers", following: "Following", jobsDone: "Kazi Zilizofanyika", media: "Media", jobsPosted: "Kazi Ulizopost", createTitle: "Unataka kutengeneza nini?", createMedia: "Tengeneza media", createMediaBody: "Post picha au video kuhusu kazi zako.", createJob: "Tengeneza kazi", createJobBody: "Post kazi ili umpate mtoa huduma.", noMedia: "Hakuna media posts bado", noJobs: "Hakuna jobs bado", noJobsDone: "Hakuna kazi zilizokamilika bado", mediaCount: "media" },
};

// Media grid must be a fixed 3-column square grid (like UserProfile.js's own
// grid) — PostGridItem's container defaults to flex:1/aspectRatio:1 when no
// explicit `size` is passed, and flex:1 inside a wrapped row stretches each
// item to fill whatever's left in its row instead of a clean 1/3 width, which
// is what was producing the uneven, non-square tiles.
const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_COLUMNS = 3;
const GRID_SPACING = 2;
const MEDIA_SECTION_PADDING = 14;
const GRID_ITEM_SIZE =
  (SCREEN_WIDTH - MEDIA_SECTION_PADDING * 2 - GRID_SPACING * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

function listFrom(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function profilePhotosFor(profile) {
  const photos = listFrom(profile?.profile_photos || profile?.profilePhotos || profile?.profile_pictures || profile?.profilePictures);
  const primary = profile?.profile_pic || profile?.profilePic;
  return [primary, ...photos].filter(Boolean).filter((item, index, arr) => arr.indexOf(item) === index).slice(0, 2);
}

function avatarFor(profile) {
  const primary = profilePhotosFor(profile)[0];
  if (primary) return primary;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.username || profile?.email || "U")}&background=1683C7&color=fff&bold=true&rounded=true`;
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

function formatCount(count) {
  const value = Number(count || 0);
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

function StatBlock({ label, value, onPress, styles }) {
  const Container = onPress ? TouchableOpacity : View;
  return <Container onPress={onPress} style={styles.statBlock} activeOpacity={0.72}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></Container>;
}

function EmptyState({ text, styles }) {
  return <View style={styles.emptyState}><Text style={styles.emptyText}>{text}</Text></View>;
}

export default function Profile() {
  const navigation = useNavigation();
  const { theme, mode } = useAppTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const t = T[language] || T.en;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { loaded, profile, email, refresh } = useUserSession();
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState("media");
  const [posts, setPosts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [profileSummary, setProfileSummary] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showingCached, setShowingCached] = useState(false);
  const [profileError, setProfileError] = useState("");

  const displayProfile = profileSummary || profile || {};
  const services = listFrom(displayProfile.services);
  const socialsRaw = listFrom(displayProfile.socials);
  const completedJobs = Array.isArray(displayProfile.completed_jobs) ? displayProfile.completed_jobs : [];
  const phoneNumber = displayProfile.phone_number || displayProfile.phone_numbers?.[0]?.number || displayProfile.phone_numbers?.[0] || "";
  const followers = displayProfile.followers_count || displayProfile.followers || 0;
  const following = displayProfile.following_count || displayProfile.following || 0;
  const profilePhotos = profilePhotosFor(displayProfile);
  const coverPhoto = profilePhotos[0] || avatarFor(displayProfile);

  const loadProfileData = useCallback(async ({ pull = false } = {}) => {
    if (pull) setRefreshing(true);
    try {
      setProfileError("");
      const session = await refresh();
      const profileUuid = session?.profile?.uuid || session?.user?.uuid || profile?.uuid;
      const [postsRes, jobsRes, profileRes] = await Promise.allSettled([
        cachedGet("posts:me", () => viewerRequest("get", "/posts/me").then((res) => res.data)),
        cachedGet("hiring:my-jobs", () => viewerRequest("get", "/hiring/my-jobs").then((res) => res.data)),
        profileUuid ? cachedGet(`profile:${profileUuid}`, () => api.get(`/profiles/${profileUuid}`).then((res) => res.data)) : Promise.resolve(null),
      ]);
      setPosts(postsRes.status === "fulfilled" && Array.isArray(postsRes.value?.data?.posts) ? postsRes.value.data.posts : []);
      setJobs(jobsRes.status === "fulfilled" && Array.isArray(jobsRes.value?.data?.jobs) ? jobsRes.value.data.jobs : []);
      setProfileSummary(profileRes.status === "fulfilled" ? profileRes.value?.data?.profile || null : null);
      setShowingCached((postsRes.status === "fulfilled" && postsRes.value.fromCache) || (jobsRes.status === "fulfilled" && jobsRes.value.fromCache) || (profileRes.status === "fulfilled" && profileRes.value?.fromCache));
      if (postsRes.status === "rejected" && jobsRes.status === "rejected") setProfileError(getFriendlyApiError(postsRes.reason || jobsRes.reason, language));
    } catch (err) {
      setProfileError(getFriendlyApiError(err, language));
    } finally {
      setRefreshing(false);
    }
  }, [language, profile?.uuid, refresh]);

  useFocusEffect(useCallback(() => { loadProfileData(); }, [loadProfileData]));

  if (!loaded) return <View style={[styles.center, { paddingTop: insets.top }]}><ActivityIndicator color={theme.colors.primary} /></View>;

  if (!email) {
    return <View style={[styles.safe, { paddingTop: insets.top }]}><View style={styles.guest}><View style={styles.guestIcon}><AppIcon name="user" size={30} color={theme.colors.primary} /></View><Text style={styles.guestTitle}>{t.guestTitle}</Text><Text style={styles.guestBody}>{t.guestBody}</Text><TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate("Login", { onSuccess: async () => { await refresh(); } })}><AppIcon name="login" size={17} color={theme.colors.onPrimary} /><Text style={styles.primaryText}>{t.login}</Text></TouchableOpacity></View></View>;
  }

  const menuItems = [
    { icon: "bell", en: "Notifications", sw: "Arifa", onPress: () => navigation.navigate("Alerts") },
    { icon: "plus", en: "Make a Post", sw: "Tengeneza Post", onPress: () => setShowCreate(true) },
    { icon: "edit", en: "Edit Profile", sw: "Hariri Profaili", onPress: () => navigation.navigate("EditProfile", { profile: displayProfile }) },
    { icon: "settings", en: "Settings", sw: "Mipangilio", onPress: () => navigation.navigate("Settings") },
    { icon: "help", en: "Help & Support", sw: "Msaada", onPress: () => navigation.navigate("Settings", { openScreen: "help" }) },
  ];

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 34 }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadProfileData({ pull: true })} tintColor={theme.colors.primary} />}>
        <CachedDataNotice visible={showingCached} />
        {profileError ? <View style={styles.inlineError}><Text style={styles.inlineErrorText}>{profileError}</Text><TouchableOpacity style={styles.retryBtn} onPress={() => loadProfileData()}><Text style={styles.retryText}>{language === "sw" ? "Jaribu tena" : "Retry"}</Text></TouchableOpacity></View> : null}
        <View style={styles.topBar}><View style={styles.navLeft}><TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}><AppIcon name="arrowLeft" size={22} color={theme.colors.text} /></TouchableOpacity><View style={styles.logoBadge}><EkaziLogo width={18} height={18} /></View><Text style={styles.navTitle}>{t.title}</Text></View><View style={styles.navActions}><TouchableOpacity style={styles.iconBtn} onPress={() => setShowCreate(true)}><AppIcon name="plus" size={22} color={theme.colors.primary} /></TouchableOpacity><OverflowMenu items={menuItems} iconColor={theme.colors.primary} /></View></View>
        <View style={styles.coverWrap}><Image source={{ uri: coverPhoto }} style={styles.coverImage} blurRadius={16} /><LinearGradient colors={mode === "dark" ? ["rgba(0,0,0,0.18)", "rgba(0,0,0,0.58)"] : ["rgba(22,131,199,0.12)", "rgba(22,131,199,0.52)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cover} /><View style={styles.avatarRing}><Image source={{ uri: avatarFor(displayProfile) }} style={styles.avatar} /></View></View>
        <View style={styles.info}><View style={styles.infoHeader}><View style={styles.nameBlock}><Text style={styles.username}>@{displayProfile.username || "user"}</Text><Text style={styles.fullName}>{displayProfile.full_name || email}</Text><OverallRating value={displayProfile.ratings} count={displayProfile.ratings_count} theme={theme} compact textColor={theme.colors.warning} mutedColor={theme.colors.textMuted} /></View><View style={styles.actionStack}><TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate("EditProfile", { profile: displayProfile })}><AppIcon name="edit" size={14} color={theme.colors.onPrimary} /><Text style={styles.editText}>{t.edit}</Text></TouchableOpacity><TouchableOpacity style={styles.outlineBtn} onPress={() => navigation.navigate("Insights")}><AppIcon name="trending-up" size={14} color={theme.colors.text} /><Text style={styles.outlineText}>{t.insights}</Text></TouchableOpacity></View></View>{displayProfile.bio ? <Text style={styles.bio}>{displayProfile.bio}</Text> : null}<View style={styles.statsRow}><StatBlock label={t.followers} value={formatCount(followers)} styles={styles} onPress={() => navigation.navigate("ConnectionsScreen", { initialTab: "followers" })} /><StatBlock label={t.following} value={formatCount(following)} styles={styles} onPress={() => navigation.navigate("ConnectionsScreen", { initialTab: "following" })} /><StatBlock label={t.jobsDone} value={formatCount(displayProfile.completed_jobs_count || completedJobs.length)} styles={styles} /></View></View>
        {(phoneNumber || socialsRaw.length || services.length) ? <View style={styles.details}>{services.length ? <View style={styles.detailGroup}><Text style={styles.detailLabel}>{t.services}</Text><View style={styles.chipsRow}>{services.map((service) => <View key={String(service)} style={styles.serviceChip}><Text style={styles.serviceText}>{String(service)}</Text></View>)}</View></View> : null}{(phoneNumber || socialsRaw.length) ? <View style={styles.contactStack}>{phoneNumber ? <View style={styles.contactItem}><AppIcon name="phone" size={17} color={theme.colors.primary} /><Text style={styles.contactText}>{phoneNumber}</Text></View> : null}{socialsRaw.length ? <View style={styles.socialRow}>{socialsRaw.map((raw, index) => { const platform = parseSocialItem(raw); return <TouchableOpacity key={String(raw) + index} style={styles.socialBtn} onPress={() => openSocialUrl(platform, raw)}><AppIcon name={platform} size={17} color={theme.colors.primary} /></TouchableOpacity>; })}</View> : null}</View> : null}</View> : null}
        <View style={styles.tabsWrap}>{[{ id: "media", label: t.media }, { id: "jobsDone", label: t.jobsDone }, { id: "jobsPosted", label: t.jobsPosted }].map((tab) => { const active = activeTab === tab.id; return <TouchableOpacity key={tab.id} style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={() => setActiveTab(tab.id)} activeOpacity={0.82}><Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text></TouchableOpacity>; })}</View>
        {activeTab === "media" ? <View style={styles.mediaSection}>{posts.length ? <View style={styles.mediaGrid}>{posts.map((post) => <PostGridItem key={String(post.id)} post={post} size={GRID_ITEM_SIZE} onPress={() => navigation.navigate("PostFeedView", { posts, initialPostId: post.id, preferredAuthActor: "viewer" })} />)}</View> : <EmptyState text={t.noMedia} styles={styles} />}<Text style={styles.countHint}>{posts.length} {t.mediaCount}</Text></View> : activeTab === "jobsDone" ? <View style={styles.listSection}>{completedJobs.length ? completedJobs.map((job, index) => <TouchableOpacity key={job.id || index} style={styles.jobRow} onPress={() => navigation.navigate("ProfileWorksDone", { profileUuid: displayProfile.uuid, username: displayProfile.username, count: completedJobs.length })}><View style={styles.jobIcon}><AppIcon name="check-circle" size={17} color={theme.colors.primary} /></View><View style={styles.jobBody}><Text style={styles.jobTitle}>{job.title || "Completed"}</Text><Text style={styles.jobMeta}>{job.job_code || job.status || ""}</Text></View><AppIcon name="arrowRight" size={16} color={theme.colors.textMuted} /></TouchableOpacity>) : <EmptyState text={t.noJobsDone} styles={styles} />}</View> : <View style={styles.listSection}>{jobs.length ? jobs.map((job, index) => <TouchableOpacity key={job.id || index} style={styles.jobRow} onPress={() => navigation.navigate("JobDetails", { jobId: job.id })}><View style={styles.jobIcon}><AppIcon name="briefcase" size={17} color={theme.colors.primary} /></View><View style={styles.jobBody}><Text style={styles.jobTitle}>{job.title || "Posted"}</Text><Text style={styles.jobMeta}>{job.job_code || job.location || ""}</Text></View>{job.status ? <Text style={styles.jobStatus}>{job.status}</Text> : null}</TouchableOpacity>) : <EmptyState text={t.noJobs} styles={styles} />}</View>}
      </ScrollView>
      <CreateModal visible={showCreate} onClose={() => setShowCreate(false)} onCreateMedia={() => { setShowCreate(false); navigation.navigate("CreatePost"); }} onCreateJob={() => { setShowCreate(false); navigation.navigate("MainTabs", { screen: "Jobs", params: { initialTab: "myJobs" } }); }} t={t} styles={styles} theme={theme} />
    </View>
  );
}

function CreateModal({ visible, onClose, onCreateMedia, onCreateJob, t, styles, theme }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><Pressable style={styles.modalOverlay} onPress={onClose}><Pressable style={styles.modalSheet}><View style={styles.modalHandle} /><Text style={styles.modalTitle}>{t.createTitle}</Text><TouchableOpacity style={styles.modalOption} onPress={onCreateMedia} activeOpacity={0.85}><View style={styles.modalIcon}><AppIcon name="image" size={20} color={theme.colors.primary} /></View><View style={styles.modalCopy}><Text style={styles.modalOptionTitle}>{t.createMedia}</Text><Text style={styles.modalOptionBody}>{t.createMediaBody}</Text></View><AppIcon name="arrowRight" size={18} color={theme.colors.textMuted} /></TouchableOpacity><TouchableOpacity style={styles.modalOption} onPress={onCreateJob} activeOpacity={0.85}><View style={styles.modalIcon}><AppIcon name="briefcase" size={20} color={theme.colors.primary} /></View><View style={styles.modalCopy}><Text style={styles.modalOptionTitle}>{t.createJob}</Text><Text style={styles.modalOptionBody}>{t.createJobBody}</Text></View><AppIcon name="arrowRight" size={18} color={theme.colors.textMuted} /></TouchableOpacity></Pressable></Pressable></Modal>;
}

const createStyles = (theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg }, center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg }, content: { paddingHorizontal: 0 },
  inlineError: { marginHorizontal: 14, marginTop: 8, padding: 10, borderRadius: theme.radius.xs, borderWidth: 1, borderColor: theme.colors.danger + "55", backgroundColor: theme.colors.surface, alignItems: "center", gap: 7 }, inlineErrorText: { color: theme.colors.text, fontSize: 12, lineHeight: 17, textAlign: "center" }, retryBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: theme.radius.xs, backgroundColor: theme.colors.primary }, retryText: { color: theme.colors.onPrimary, fontSize: 12, fontWeight: "900" },
  guest: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 }, guestIcon: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft, marginBottom: 16 }, guestTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "900", textAlign: "center" }, guestBody: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 8 }, primaryBtn: { marginTop: 18, minHeight: 46, borderRadius: theme.radius.xs, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: theme.colors.primary }, primaryText: { color: theme.colors.onPrimary, fontWeight: "900" },
  topBar: { minHeight: 54, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.bg }, navLeft: { flexDirection: "row", alignItems: "center", gap: 8 }, iconBtn: { width: 40, height: 40, borderRadius: theme.radius.xs, alignItems: "center", justifyContent: "center" }, logoBadge: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "transparent" }, navTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "900" }, navActions: { flexDirection: "row", alignItems: "center" },
  coverWrap: { position: "relative", minHeight: 203, overflow: "hidden" }, cover: { height: 150, width: "100%" }, coverImage: { position: "absolute", top: 0, left: 0, right: 0, height: 150, width: "100%", opacity: 0.82 }, avatarRing: { position: "absolute", left: 20, bottom: 6, borderRadius: 30, borderWidth: 4, borderColor: theme.colors.bg, backgroundColor: theme.colors.bg }, avatar: { width: 112, height: 112, borderRadius: 24, backgroundColor: theme.colors.surfaceSoft },
  info: { paddingHorizontal: 20, paddingBottom: 10 }, infoHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }, nameBlock: { flex: 1, minWidth: 0 }, username: { color: theme.colors.text, fontSize: 25, lineHeight: 30, fontWeight: "900" }, fullName: { color: theme.colors.textMuted, fontSize: 13, fontWeight: "800", marginTop: 2 }, actionStack: { width: 112, gap: 8 }, editBtn: { minHeight: 38, borderRadius: theme.radius.xs, backgroundColor: theme.colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }, editText: { color: theme.colors.onPrimary, fontSize: 13, fontWeight: "900" }, outlineBtn: { minHeight: 38, borderRadius: theme.radius.xs, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }, outlineText: { color: theme.colors.text, fontSize: 13, fontWeight: "900" }, bio: { color: theme.colors.textSecondary, fontSize: 14.5, lineHeight: 21, marginTop: 14 },
  statsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.border }, statBlock: { flex: 1, alignItems: "center" }, statValue: { color: theme.colors.text, fontSize: 24, fontWeight: "900" }, statLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: "800", marginTop: 2 },
  details: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }, detailGroup: { gap: 8 }, detailLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: "900", textTransform: "uppercase" }, chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, serviceChip: { borderRadius: theme.radius.xs, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.primarySoft, paddingHorizontal: 10, minHeight: 32, justifyContent: "center" }, serviceText: { color: theme.colors.primary, fontSize: 12, fontWeight: "900" }, contactStack: { marginTop: 12, gap: 10 }, contactItem: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8 }, contactText: { flex: 1, color: theme.colors.text, fontSize: 13, fontWeight: "800" }, socialRow: { flexDirection: "row", alignItems: "center", gap: 6 }, socialBtn: { width: 34, height: 34, borderRadius: theme.radius.xs, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft },
  tabsWrap: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, paddingTop: 13, borderBottomWidth: 1, borderBottomColor: theme.colors.border }, tabBtn: { flex: 1, minHeight: 45, alignItems: "center", justifyContent: "center", borderBottomWidth: 2, borderBottomColor: "transparent" }, tabBtnActive: { borderBottomColor: theme.colors.primary }, tabText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: "900" }, tabTextActive: { color: theme.colors.primary },
  mediaSection: { paddingHorizontal: 14, paddingTop: 12 }, mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: GRID_SPACING }, countHint: { color: theme.colors.textMuted, textAlign: "center", fontSize: 12, fontWeight: "800", marginTop: 14 }, listSection: { paddingHorizontal: 16, paddingTop: 8 }, jobRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: theme.colors.border }, jobIcon: { width: 38, height: 38, borderRadius: theme.radius.xs, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft }, jobBody: { flex: 1, minWidth: 0 }, jobTitle: { color: theme.colors.text, fontSize: 14, fontWeight: "900" }, jobMeta: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: 2 }, jobStatus: { color: theme.colors.primary, fontSize: 12, fontWeight: "900", textTransform: "capitalize" }, emptyState: { paddingVertical: 54, alignItems: "center" }, emptyText: { color: theme.colors.textMuted, fontSize: 14, fontWeight: "800" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: theme.colors.overlay }, modalSheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.md, borderTopRightRadius: theme.radius.md, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28, borderTopWidth: 1, borderColor: theme.colors.border }, modalHandle: { width: 42, height: 5, borderRadius: 999, alignSelf: "center", backgroundColor: theme.colors.border, marginBottom: 18 }, modalTitle: { color: theme.colors.text, fontSize: 19, fontWeight: "900", marginBottom: 12 }, modalOption: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border }, modalIcon: { width: 42, height: 42, borderRadius: theme.radius.xs, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft }, modalCopy: { flex: 1 }, modalOptionTitle: { color: theme.colors.text, fontSize: 15, fontWeight: "900" }, modalOptionBody: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "700", marginTop: 3, lineHeight: 17 },
});

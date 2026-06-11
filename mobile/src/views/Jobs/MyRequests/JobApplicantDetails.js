/**
 * JobApplicantDetails.js - src/views/Jobs/MyRequests/JobApplicantDetails.js
 *
 * - Theme: ThemeContext (light/dark reactive — zero hardcoded colors)
 * - Language: LanguageContext (EN / SW)
 * - Bottom action bar uses useSafeAreaInsets for proper inset
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../../theme";
import { useLanguage } from "../../../LanguageContext";
import AppIcon from "../../../icons/AppIcon";
import { viewerRequest } from "../../../api/api";
import { formatJobDate, formatRelativeDate } from "../jobDate";
import HiringNoticeModal from "../HiringNoticeModal";

// ─── Strings ─────────────────────────────────────────────────────────────────
const T = {
  en: {
    screenTitle: "Provider Request",
    howIWork: "How I will do this work",
    budget: "Budget",
    time: "Estimated Time",
    available: "Available From",
    experience: "Experience",
    workImages: "Tools / Devices / Previous Work",
    notes: "Additional Notes",
    jobInfo: "Job Information",
    hire: "Hire Provider",
    closed: "Request Closed",
    confirmTitle: "Hire provider",
    confirmMsg: (user, code) => `Hire @${user} for job ${code}?`,
    confirmBack: "Back",
    confirmHire: "Hire",
    hired: "Provider hired",
    hiredMsg: (user, code) =>
      `You hired @${user}.\n\nJob ${code} has been assigned.\nOther providers will be notified.`,
    errHire: "Could not hire provider",
    ratingLabel: (r) => `★  ${r}`,
    noRating: "No rating yet",
  },
  sw: {
    screenTitle: "Ombi la Mtoa Huduma",
    howIWork: "Jinsi nitakavyofanya kazi hii",
    budget: "Bajeti",
    time: "Muda Unaokadiriwa",
    available: "Anapatikana Kuanzia",
    experience: "Uzoefu",
    workImages: "Zana / Vifaa / Kazi Zilizopita",
    notes: "Maelezo ya Ziada",
    jobInfo: "Taarifa ya Kazi",
    hire: "Mwajiri Mtoa Huduma",
    closed: "Ombi Limefungwa",
    confirmTitle: "Mwajiri mtoa huduma",
    confirmMsg: (user, code) => `Mwajiri @${user} kwa kazi ${code}?`,
    confirmBack: "Rudi",
    confirmHire: "Mwajiri",
    hired: "Mtoa huduma ameajiriwa",
    hiredMsg: (user, code) =>
      `Umemwajiri @${user}.\n\nKazi ${code} imepewa.\nWatoa huduma wengine wataarifiwa.`,
    errHire: "Imeshindwa kumwajiri mtoa huduma",
    ratingLabel: (r) => `★  ${r}`,
    noRating: "Hakuna ukadiriaji",
  },
};

function formatBudget(value) {
  const raw = String(value || "").trim();
  if (!raw) return "Not set";
  if (/^TZS\b/i.test(raw)) return raw;
  const numeric = raw.replace(/[^\d.]/g, "");
  return numeric ? `TZS ${Number(numeric).toLocaleString("en-US")}` : raw;
}

function formatAvailability(value) {
  const raw = String(value || "").trim();
  if (!raw) return "Not set";
  const lower = raw.toLowerCase();
  if (lower === "today") return "Today";
  if (lower === "tomorrow") {
    return "Tomorrow";
  }
  const formatted = formatJobDate(raw);
  if (formatted) return formatted;
  return raw;
}

export default function JobApplicantDetails() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme, mode } = useAppTheme();
  const { language } = useLanguage();
  const t = T[language] || T.en;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const [hiring, setHiring] = useState(false);
  const [notice, setNotice] = useState(null);
  const [detailJob, setDetailJob] = useState(null);

  const request = route.params?.request || null;
  const provider = request?.provider;
  const jobId = request?.job?.id;
  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    viewerRequest("get", `/hiring/jobs/${jobId}`)
      .then((res) => {
        if (!cancelled && res?.data?.job) setDetailJob(res.data.job);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const reloadJobDetails = async () => {
    if (!jobId) return null;
    const res = await viewerRequest("get", `/hiring/jobs/${jobId}`);
    const nextJob = res?.data?.job || null;
    if (nextJob) setDetailJob(nextJob);
    return nextJob;
  };

  if (!request || !provider || !request.job) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <StatusBar
          barStyle={mode === "dark" ? "light-content" : "dark-content"}
          backgroundColor={theme.colors.surface}
        />
        <View style={styles.navHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <AppIcon name="arrowLeft" size={18} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>{t.screenTitle}</Text>
        </View>
        <View style={styles.missingRequest}>
          <Text style={styles.missingTitle}>Request not available</Text>
          <Text style={styles.bodyText}>Open an applicant from one of your real jobs.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isClosed = request.status === "closed";
  const assignedContact = detailJob?.contact_details?.service_provider || request.job?.contact_details?.service_provider || null;

  const BOTTOM_BAR = 80 + insets.bottom;

  const hireProvider = () => {
    if (isClosed) {
      setNotice({ type: "error", title: t.closed });
      return;
    }
    setNotice({
      type: "confirm",
      title: t.confirmTitle,
      body: t.confirmMsg(provider.username, request.job.code),
      primaryLabel: t.confirmHire,
      secondaryLabel: t.confirmBack,
      onPrimary: async () => {
        try {
          setHiring(true);
          await viewerRequest("post", `/hiring/jobs/${request.job.id}/assign`, { profile_uuid: provider.uuid });
          await reloadJobDetails();
          setNotice({ type: "success", title: t.hired, body: t.hiredMsg(provider.username, request.job.code), onPrimary: () => navigation.goBack() });
        } catch (err) {
          setNotice({ type: "error", title: t.errHire, body: err?.response?.data?.message || "Please try again." });
        } finally {
          setHiring(false);
        }
      },
    });
  };

  const InfoBox = ({ label, value }) => (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar
        barStyle={mode === "dark" ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.surface}
      />

      {/* ── Nav Header ── */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <AppIcon name="arrowLeft" size={18} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>{t.screenTitle}</Text>
      </View>

      {/* ── Scrollable Content ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: BOTTOM_BAR + 16 }]}
      >
        {/* Profile card */}
        <View style={styles.profileCard}>
          {provider.profilePic ? (
            <Image source={{ uri: provider.profilePic }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <AppIcon name="user" size={40} color={theme.colors.textMuted} />
            </View>
          )}
          <Text style={styles.username}>@{provider.username}</Text>
          <Text style={styles.fullName}>{provider.fullName}</Text>
          <Text style={styles.rating}>{provider.rating ? t.ratingLabel(provider.rating) : "Rating pending"}</Text>
        </View>

        {/* Explanation */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{t.howIWork}</Text>
          <Text style={styles.bodyText}>{request.explanation}</Text>
        </View>

        {/* Info grid */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Offer summary</Text>
          <View style={styles.infoGrid}>
            <InfoBox label={t.budget}     value={formatBudget(request.budget)}        />
            <InfoBox label={t.time}       value={request.duration || "Not set"}      />
            <InfoBox label={t.available}  value={formatAvailability(request.availableFrom)} />
            <InfoBox label={t.experience} value={request.experience || "Not set"}    />
          </View>
        </View>

        {/* Work images */}
        {request.images?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>{t.workImages}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imagesRow}
            >
              {request.images.map((uri, i) => (
                <Image key={`${uri}-${i}`} source={{ uri }} style={styles.workImage} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Notes */}
        {request.notes ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>{t.notes}</Text>
            <Text style={styles.bodyText}>{request.notes}</Text>
          </View>
        ) : null}

        {/* Job info */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{t.jobInfo}</Text>
          <View style={styles.jobMini}>
            <Text style={styles.jobCode}>{request.job.code}</Text>
            <Text style={styles.jobTitle}>{request.job.title}</Text>
            <View style={styles.jobMetaRow}>
              <AppIcon name="map-pin" size={12} color={theme.colors.primary} />
              <Text style={styles.jobMeta}>{request.job.location}</Text>
            </View>
            <View style={styles.jobMetaRow}>
              <AppIcon name="calendar" size={12} color={theme.colors.primary} />
              <Text style={styles.jobMeta}>
                {[formatRelativeDate(request.job.postedAt), request.job.deadline ? formatJobDate(request.job.deadline) : null].filter(Boolean).join(" • ")}
              </Text>
            </View>
          </View>
        </View>

        {assignedContact ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Assigned Job Contact</Text>
            <ContactRows contact={assignedContact} styles={styles} theme={theme} />
          </View>
        ) : null}
      </ScrollView>

      {/* ── Bottom Action Bar ── */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: insets.bottom + 14,
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          disabled={isClosed || hiring}
          style={[
            styles.hireBtn,
            (isClosed || hiring) && styles.hireBtnDisabled,
          ]}
          onPress={hireProvider}
          activeOpacity={0.85}
        >
          {hiring ? (
            <ActivityIndicator color={theme.colors.onPrimary} />
          ) : (
            <>
              <AppIcon
                name={isClosed ? "lock" : "check"}
                size={18}
                color={isClosed ? theme.colors.textMuted : theme.colors.onPrimary}
              />
              <Text style={[styles.hireBtnText, isClosed && styles.hireBtnTextDisabled]}>
                {isClosed ? t.closed : t.hire}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      <HiringNoticeModal
        visible={!!notice}
        type={notice?.type}
        title={notice?.title}
        body={notice?.body}
        primaryLabel={notice?.primaryLabel}
        secondaryLabel={notice?.secondaryLabel}
        loading={hiring}
        onPrimary={async () => {
          const next = notice;
          if (next?.onPrimary) await next.onPrimary();
          else setNotice(null);
        }}
        onSecondary={() => setNotice(null)}
        onClose={() => setNotice(null)}
      />
    </SafeAreaView>
  );
}

function ContactRows({ contact, styles, theme }) {
  const rows = [
    contact.phone_number ? { icon: "phone", label: "Phone", value: contact.phone_number } : null,
    contact.email ? { icon: "mail", label: "Email", value: contact.email } : null,
  ].filter(Boolean);
  const socials = Array.isArray(contact.socials) ? contact.socials : [];

  if (!rows.length && !socials.length) {
    return <Text style={styles.bodyText}>Contact details are hidden by privacy settings.</Text>;
  }

  return (
    <View style={styles.contactRows}>
      {rows.map((row) => (
        <View key={row.label} style={styles.contactRow}>
          <AppIcon name={row.icon} size={16} color={theme.colors.primary} />
          <Text style={styles.contactLabel}>{row.label}</Text>
          <Text style={styles.contactValue}>{row.value}</Text>
        </View>
      ))}
      {socials.length ? <Text style={styles.contactValue}>{socials.map((item) => item.handle || item.url || item.platform || String(item)).join("  ")}</Text> : null}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const createStyles = (theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },

    /* Nav */
    navHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 14,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    navTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "900" },

    scroll: { padding: theme.spacing.md, gap: 14 },

    /* Profile */
    profileCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      padding: 24,
      ...theme.shadow.soft,
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: theme.colors.surfaceSoft,
      marginBottom: 14,
    },
    avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
    username: { color: theme.colors.text, fontSize: 22, fontWeight: "900", letterSpacing: -0.3 },
    fullName: { color: theme.colors.textMuted, fontSize: 14, fontWeight: "700", marginTop: 4 },
    rating: { color: theme.colors.warning, fontWeight: "900", marginTop: 8, fontSize: 15 },

    /* Card */
    card: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      ...theme.shadow.soft,
    },
    sectionLabel: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 10,
    },
    bodyText: { color: theme.colors.textSecondary, fontSize: 15, lineHeight: 24 },
    contactRows: { gap: 4 },
    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    contactLabel: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "900", width: 54 },
    contactValue: { color: theme.colors.text, fontSize: 13, fontWeight: "800", flex: 1 },
    missingRequest: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    missingTitle: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: "900",
      marginBottom: 8,
    },

    /* Info grid */
    infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    infoBox: {
      width: "47%",
      backgroundColor: theme.colors.surfaceSoft,
      borderRadius: theme.radius.sm,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    infoLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: "800", marginBottom: 6 },
    infoValue: { color: theme.colors.text, fontSize: 15, fontWeight: "900" },

    /* Images */
    imagesRow: { gap: 10, paddingRight: 4 },
    workImage: {
      width: 140,
      height: 105,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.surfaceSoft,
    },

    /* Job mini */
    jobMini: {
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.radius.sm,
      padding: 14,
      gap: 5,
    },
    jobCode: { color: theme.colors.primary, fontWeight: "900", fontSize: 13 },
    jobTitle: { color: theme.colors.text, fontSize: 16, fontWeight: "900" },
    jobMetaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    jobMeta: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: "700" },

    /* Bottom bar */
    bottomBar: {
      borderTopWidth: 1,
      paddingHorizontal: theme.spacing.md,
      paddingTop: 14,
    },
    hireBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      minHeight: 56,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.primary,
      ...{
        shadowColor: theme.colors.primary,
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
        elevation: 6,
      },
    },
    hireBtnDisabled: {
      backgroundColor: theme.colors.surfaceSoft,
      shadowOpacity: 0,
      elevation: 0,
    },
    hireBtnText: { color: theme.colors.onPrimary, fontSize: 17, fontWeight: "900" },
    hireBtnTextDisabled: { color: theme.colors.textMuted },
  });

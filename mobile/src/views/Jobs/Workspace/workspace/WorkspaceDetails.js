import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../../../../theme";
import AppIcon from "../../../../icons/AppIcon";
import { Card, SectionHeading } from "../../../Jobs/jobsUI";
import { formatJobDate, formatRelativeDate } from "../../../Jobs/jobDate";
import { useLanguage } from "../../../../LanguageContext";
import { useCall } from "../../../../calling/CallProvider";
import AnimatedJobPipeline from "./AnimatedJobPipeline";
import { pipelineIndex } from "./WorkspaceProgress";
import MediaViewer from "./MediaViewer";

const UNIT_LABELS = {
  minutes: { en: "minutes", sw: "dakika" },
  hours: { en: "hours", sw: "masaa" },
  days: { en: "days", sw: "siku" },
  weeks: { en: "weeks", sw: "wiki" },
  months: { en: "months", sw: "miezi" },
};

function avatarUri(u) {
  if (u?.profile_pic) return u.profile_pic;
  const name = encodeURIComponent(u?.username || u?.full_name || "U");
  return `https://ui-avatars.com/api/?name=${name}&background=1683C7&color=fff&bold=true&rounded=true`;
}

// Parses either a plain number/decimal string (budget_min/max/final_budget,
// already numeric from the API) or a free-text offer string like
// "TZS 28,000" (job_applications.budget) into a clean number.
function toNumber(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value).replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function formatTZS(value) {
  const n = toNumber(value);
  if (n == null) return null;
  return `TZS ${Math.round(n).toLocaleString("en-US")}`;
}

// Lightweight staggered fade + rise entrance, matching the animated feel
// already used elsewhere in the workspace (see AnimatedJobPipeline).
function FadeIn({ children, delay = 0, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}

function StarRow({ rating, size = 12, color, emptyColor }) {
  const full = Math.round(Number(rating) || 0);
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <AppIcon key={i} name="star" size={size} filled={i <= full} color={i <= full ? color : emptyColor} />
      ))}
    </View>
  );
}

export default function WorkspaceDetails({ job, role, onOpenChat }) {
  const nav = useNavigation();
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const s = useMemo(() => createStyles(theme), [theme]);
  const tx = (en, sw) => (language === "sw" ? sw : en);
  const call = useCall();

  const [negotiationOpen, setNegotiationOpen] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  if (!job) return null;

  const contact = job.contact_details;
  const otherParty = contact?.viewer_role === "hirer" ? contact?.service_provider : contact?.hirer;
  const code = job.job_code || job.code || "JOB";
  const isDirect = job.hire_type === "direct";

  // ── Budget ──────────────────────────────────────────────────────────────
  const rangeMin = toNumber(job.budget_min);
  const rangeMax = toNumber(job.budget_max);
  const finalBudget = toNumber(job.final_budget);
  const providerOffer = toNumber(job.hired_application?.budget);
  const budgetFinalized = finalBudget != null;
  const hasRange = rangeMin != null && rangeMax != null && rangeMin !== rangeMax;
  const employerBudgetLabel = hasRange
    ? `${formatTZS(rangeMin)} - ${formatTZS(rangeMax)}`
    : formatTZS(rangeMin ?? rangeMax) || "—";
  const canShowNegotiation = !isDirect && (hasRange || providerOffer != null || rangeMin != null);

  // ── Duration ─────────────────────────────────────────────────────────────
  const durationUnitLabel = job.estimated_duration_unit
    ? tx(
        UNIT_LABELS[job.estimated_duration_unit]?.en || job.estimated_duration_unit,
        UNIT_LABELS[job.estimated_duration_unit]?.sw || job.estimated_duration_unit
      )
    : "";
  const durationText = job.estimated_duration_value
    ? `${job.estimated_duration_value} ${durationUnitLabel}`
    : tx("Not set", "Haijawekwa");

  // ── Description parsed into paragraphs / bullets ────────────────────────
  const descriptionLines = (job.description || "").split(/\r?\n/).filter((line) => line.trim().length > 0);

  // ── Attachments ──────────────────────────────────────────────────────────
  const media = Array.isArray(job.media) ? job.media : [];
  const visualMedia = media.filter((m) => m.type === "image" || m.type === "video");
  const otherMedia = media.filter((m) => m.type !== "image" && m.type !== "video");

  const requirements = Array.isArray(job.requirements) ? job.requirements : [];
  const skills = Array.isArray(job.skills) ? job.skills : [];

  const infoTiles = [
    { icon: "map-pin", label: tx("Location", "Eneo"), value: job.location || tx("Not set", "Halijawekwa") },
    { icon: "calendar", label: tx("Posted", "Ilichapishwa"), value: formatRelativeDate(job.created_at) || tx("Today", "Leo") },
    isDirect
      ? { icon: "play-circle", label: tx("Start date", "Tarehe ya kuanza"), value: formatJobDate(job.provider_start_date || job.scheduled_for) || tx("Flexible", "Inabadilika") }
      : { icon: "clock", label: tx("Deadline", "Mwisho"), value: formatJobDate(job.tender_closes_at) || "—" },
    { icon: "award", label: tx("Duration", "Muda"), value: durationText },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
      {/* ── Job summary header ─────────────────────────────────────────── */}
      <FadeIn delay={0}>
        <View style={s.headerRow}>
          <View style={s.codePill}>
            <Text style={s.codeText}>{code}</Text>
          </View>
        </View>
        <Text style={s.detailTitle}>{job.title}</Text>

        <View style={s.infoGrid}>
          {infoTiles.map((tile) => (
            <View key={tile.label} style={s.infoTile}>
              <View style={s.infoTileIconWrap}>
                <AppIcon name={tile.icon} size={15} color={theme.colors.primaryStrong} />
              </View>
              <Text style={s.infoTileLabel}>{tile.label}</Text>
              <Text style={s.infoTileValue} numberOfLines={1}>{tile.value}</Text>
            </View>
          ))}
        </View>
      </FadeIn>

      {/* ── Budget ──────────────────────────────────────────────────────── */}
      <FadeIn delay={70}>
        <Card style={s.budgetCard}>
          <View style={s.budgetTopRow}>
            <SectionHeading label={tx("Budget", "Bajeti")} />
            <View style={[s.budgetPill, { backgroundColor: budgetFinalized ? theme.colors.successSoft : theme.colors.warningSoft }]}>
              <View style={[s.budgetDot, { backgroundColor: budgetFinalized ? theme.colors.success : theme.colors.warning }]} />
              <Text style={[s.budgetPillText, { color: budgetFinalized ? theme.colors.success : theme.colors.warning }]}>
                {budgetFinalized ? tx("Final", "Ya Mwisho") : tx("Not finalized", "Bado Haijaamuliwa")}
              </Text>
            </View>
          </View>

          {budgetFinalized ? (
            <>
              <Text style={s.budgetAmount}>{formatTZS(finalBudget)}</Text>
              <Text style={s.budgetSub}>
                {isDirect
                  ? tx("Direct hire offer, accepted", "Ofa ya kuajiri moja kwa moja, imekubaliwa")
                  : tx("Final budget from the hired provider", "Bajeti ya mwisho kutoka kwa mtoa huduma aliyeajiriwa")}
              </Text>
            </>
          ) : (
            <>
              {/* There's no negotiation or approval screen — hiring a provider
                  IS what finalizes the budget, so this only ever says the
                  budget isn't final yet, never that something is "pending
                  agreement" (which would imply a step that doesn't exist). */}
              <Text style={s.budgetWaiting}>{tx("Budget not finalized", "Bajeti bado haijaamuliwa")}</Text>
              <Text style={s.budgetSub}>
                {tx("Will be finalized once a provider is hired", "Itaamuliwa mara mtoa huduma atakapoajiriwa")}
              </Text>
              {isDirect && rangeMin != null ? (
                <Text style={s.budgetSub}>{tx("Offered", "Imetolewa")}: {formatTZS(rangeMin)}</Text>
              ) : !isDirect && (rangeMin != null || rangeMax != null) ? (
                <Text style={s.budgetSub}>{tx("Posted range", "Kiwango kilichowekwa")}: {employerBudgetLabel}</Text>
              ) : null}
            </>
          )}

          {canShowNegotiation && (
            <>
              <TouchableOpacity style={s.negotiationToggle} onPress={() => setNegotiationOpen((v) => !v)} activeOpacity={0.8}>
                <Text style={s.negotiationToggleText}>{tx("View breakdown", "Angalia Maelezo")}</Text>
                <View style={{ transform: [{ rotate: negotiationOpen ? "90deg" : "0deg" }] }}>
                  <AppIcon name="chevron-right" size={14} color={theme.colors.primary} strokeWidth={2.5} />
                </View>
              </TouchableOpacity>
              {negotiationOpen && (
                <View style={s.negotiationBody}>
                  <View style={s.negotiationRow}>
                    <Text style={s.negotiationLabel}>{tx("Employer Budget", "Bajeti ya Mwajiri")}</Text>
                    <Text style={s.negotiationValue}>{employerBudgetLabel}</Text>
                  </View>
                  <View style={s.negotiationRow}>
                    <Text style={s.negotiationLabel}>{tx("Provider's Offer", "Ofa ya Mtoa Huduma")}</Text>
                    <Text style={s.negotiationValue}>{formatTZS(providerOffer) || "—"}</Text>
                  </View>
                  <View style={[s.negotiationRow, { borderBottomWidth: 0 }]}>
                    <Text style={[s.negotiationLabel, s.negotiationFinalLabel]}>{tx("Final", "Mwisho")}</Text>
                    <Text style={[s.negotiationValue, s.negotiationFinalValue]}>
                      {budgetFinalized ? formatTZS(finalBudget) : tx("Not finalized", "Bado Haijaamuliwa")}
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
        </Card>
      </FadeIn>

      {/* ── Status timeline ─────────────────────────────────────────────── */}
      <FadeIn delay={140}>
        <Card style={{ paddingHorizontal: 4 }}>
          <SectionHeading label={tx("Status", "Hali")} />
          <AnimatedJobPipeline activeIndex={pipelineIndex(job.status)} language={language} />
        </Card>
      </FadeIn>

      {/* ── Description ─────────────────────────────────────────────────── */}
      {descriptionLines.length > 0 && (
        <FadeIn delay={200}>
          <Card>
            <SectionHeading label={tx("About this job", "Kuhusu kazi hii")} />
            {descriptionLines.map((line, i) => {
              const bulletMatch = /^[-*•]\s*(.+)/.exec(line.trim());
              return bulletMatch ? (
                <View key={i} style={s.bulletRow}>
                  <View style={s.bulletDot} />
                  <Text style={s.bulletText}>{bulletMatch[1]}</Text>
                </View>
              ) : (
                <Text key={i} style={s.detailBody}>{line}</Text>
              );
            })}
          </Card>
        </FadeIn>
      )}

      {/* ── Requirements ────────────────────────────────────────────────── */}
      {requirements.length > 0 && (
        <FadeIn delay={250}>
          <Card>
            <SectionHeading label={tx("Requirements", "Mahitaji")} />
            {requirements.map((req, i) => (
              <View key={i} style={s.reqRow}>
                <View style={s.reqCheck}>
                  <AppIcon name="check" size={11} color={theme.colors.onPrimary} strokeWidth={3} />
                </View>
                <Text style={s.reqText}>{req}</Text>
              </View>
            ))}
          </Card>
        </FadeIn>
      )}

      {/* ── Skills ──────────────────────────────────────────────────────── */}
      {skills.length > 0 && (
        <FadeIn delay={300}>
          <Card>
            <SectionHeading label={tx("Skills required", "Ujuzi unaohitajika")} />
            <View style={s.chipsRow}>
              {skills.map((skill, i) => (
                <View key={i} style={s.chip}>
                  <Text style={s.chipText}>{skill}</Text>
                </View>
              ))}
            </View>
          </Card>
        </FadeIn>
      )}

      {/* ── Attachments ─────────────────────────────────────────────────── */}
      {media.length > 0 && (
        <FadeIn delay={350}>
          <Card>
            <SectionHeading label={tx("Attachments", "Viambatisho")} />
            {visualMedia.length > 0 && (
              <View style={s.attachGrid}>
                {visualMedia.map((item, i) => (
                  <TouchableOpacity
                    key={i}
                    style={s.attachTile}
                    activeOpacity={0.85}
                    onPress={() => { setViewerIndex(i); setViewerVisible(true); }}
                  >
                    <Image source={{ uri: item.url }} style={s.attachImg} />
                    {item.type === "video" && (
                      <View style={s.attachPlayOverlay}>
                        <AppIcon name="play" size={16} color="#fff" filled />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {otherMedia.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={s.fileRow}
                activeOpacity={0.8}
                onPress={() => item.url && Linking.openURL(item.url)}
              >
                <AppIcon name="file-text" size={17} color={theme.colors.primary} />
                <Text style={s.fileName} numberOfLines={1}>{item.name || tx("Attachment", "Kiambatisho")}</Text>
                <AppIcon name="chevron-right" size={14} color={theme.colors.textMuted} />
              </TouchableOpacity>
            ))}
          </Card>
        </FadeIn>
      )}

      {/* ── Contact ─────────────────────────────────────────────────────── */}
      {otherParty && (
        <FadeIn delay={400}>
          <Card>
            <SectionHeading label={tx("Contact", "Mawasiliano")} />
            <View style={s.contactHeader}>
              <Image source={{ uri: avatarUri(otherParty) }} style={s.contactAvatarLg} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={s.contactNameRow}>
                  <Text style={s.contactFullLg} numberOfLines={1}>
                    {otherParty.full_name || `@${otherParty.username || "user"}`}
                  </Text>
                  {otherParty.is_verified ? (
                    <AppIcon name="check-circle" size={15} color={theme.colors.primary} filled />
                  ) : null}
                </View>
                <Text style={s.contactUsernameLg} numberOfLines={1}>@{otherParty.username || "user"}</Text>
                {otherParty.ratings != null ? (
                  <View style={s.ratingRow}>
                    <StarRow rating={otherParty.ratings} color={theme.colors.warning} emptyColor={theme.colors.border} />
                    <Text style={s.ratingText}>
                      {Number(otherParty.ratings).toFixed(1)}
                      {otherParty.ratings_count ? ` (${otherParty.ratings_count})` : ""}
                    </Text>
                  </View>
                ) : null}
                {otherParty.joined_at ? (
                  <Text style={s.joinedText}>
                    {tx("Joined", "Amejiunga")} {new Date(otherParty.joined_at).getFullYear()}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={s.contactActionsRow}>
              <TouchableOpacity style={s.actionBtn} onPress={onOpenChat} activeOpacity={0.85}>
                <AppIcon name="message-circle" size={16} color={theme.colors.primary} />
                <Text style={s.actionBtnText}>{tx("Message", "Ujumbe")}</Text>
              </TouchableOpacity>
              {call?.supported && otherParty.uuid ? (
                <TouchableOpacity
                  style={s.actionBtn}
                  activeOpacity={0.85}
                  onPress={() => call.startCall({ calleeUuid: otherParty.uuid, calleeName: otherParty.username || otherParty.full_name, calleePhoto: otherParty.profile_pic, jobId: job.id, jobTitle: job.title })}
                >
                  <AppIcon name="phone" size={16} color={theme.colors.primary} />
                  <Text style={s.actionBtnText}>{tx("Call", "Piga simu")}</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={s.actionBtn}
                activeOpacity={0.85}
                onPress={() => nav.navigate("UserProfile", { uuid: otherParty.uuid })}
              >
                <AppIcon name="user" size={16} color={theme.colors.primary} />
                <Text style={s.actionBtnText}>{tx("Profile", "Profaili")}</Text>
              </TouchableOpacity>
            </View>

            {otherParty.phone_number ? (
              <View style={s.contactMetaRow}>
                <AppIcon name="phone" size={13} color={theme.colors.textMuted} />
                <Text style={s.contactMetaText}>{otherParty.phone_number}</Text>
              </View>
            ) : null}
            {otherParty.email ? (
              <View style={s.contactMetaRow}>
                <AppIcon name="mail" size={13} color={theme.colors.textMuted} />
                <Text style={s.contactMetaText}>{otherParty.email}</Text>
              </View>
            ) : null}
          </Card>
        </FadeIn>
      )}

      <MediaViewer
        visible={viewerVisible}
        media={visualMedia}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />
    </ScrollView>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    scroll: { padding: 16, gap: 12, paddingBottom: 100 },

    headerRow: { flexDirection: "row", marginBottom: 8 },
    codePill: {
      backgroundColor: theme.colors.primarySoft,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    codeText: { color: theme.colors.primary, fontSize: 12, fontWeight: "800" },
    detailTitle: { fontSize: 20, fontWeight: "800", color: theme.colors.text, lineHeight: 26, marginBottom: 14 },
    detailBody: { fontSize: 14, color: theme.colors.textMuted, lineHeight: 22, marginBottom: 4 },

    // Info grid — small workspace-style tiles instead of a settings list
    infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
    infoTile: {
      width: "47.5%",
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 16,
      padding: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    infoTileIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 9,
      backgroundColor: theme.colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    infoTileLabel: { fontSize: 10, fontWeight: "800", color: theme.colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
    infoTileValue: { fontSize: 14, fontWeight: "800", color: theme.colors.text },

    // Budget card
    budgetCard: { gap: 2 },
    budgetTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    budgetPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginBottom: 10 },
    budgetDot: { width: 6, height: 6, borderRadius: 3 },
    budgetPillText: { fontSize: 11, fontWeight: "800" },
    budgetAmount: { fontSize: 28, fontWeight: "900", color: theme.colors.text, marginBottom: 4 },
    budgetWaiting: { fontSize: 16, fontWeight: "800", color: theme.colors.warning, marginBottom: 4 },
    budgetSub: { fontSize: 12.5, color: theme.colors.textMuted, marginBottom: 4 },
    negotiationToggle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 10,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    negotiationToggleText: { fontSize: 13, fontWeight: "800", color: theme.colors.primary },
    negotiationBody: { marginTop: 10, gap: 0 },
    negotiationRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    negotiationLabel: { fontSize: 12.5, color: theme.colors.textMuted, fontWeight: "600" },
    negotiationValue: { fontSize: 13, color: theme.colors.text, fontWeight: "800" },
    negotiationFinalLabel: { color: theme.colors.text, fontWeight: "800" },
    negotiationFinalValue: { color: theme.colors.primaryStrong, fontSize: 15 },

    // Bulleted description
    bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
    bulletDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: theme.colors.primary, marginTop: 8 },
    bulletText: { flex: 1, fontSize: 14, color: theme.colors.textMuted, lineHeight: 21 },

    // Requirements checklist
    reqRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7 },
    reqCheck: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.success,
      alignItems: "center",
      justifyContent: "center",
    },
    reqText: { flex: 1, fontSize: 14, color: theme.colors.text, fontWeight: "600" },

    // Skills chips
    chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      backgroundColor: theme.colors.primarySoft,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.primary + "33",
    },
    chipText: { fontSize: 12.5, fontWeight: "800", color: theme.colors.primaryStrong },

    // Attachments
    attachGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
    attachTile: {
      width: "31%",
      aspectRatio: 1,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: theme.colors.surfaceSoft,
    },
    attachImg: { width: "100%", height: "100%" },
    attachPlayOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.25)",
    },
    fileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    fileName: { flex: 1, fontSize: 13, fontWeight: "700", color: theme.colors.text },

    // Contact
    contactHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
    contactAvatarLg: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.surfaceSoft },
    contactNameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    contactFullLg: { fontSize: 16, fontWeight: "900", color: theme.colors.text, flexShrink: 1 },
    contactUsernameLg: { fontSize: 12.5, color: theme.colors.textMuted, marginTop: 1, fontWeight: "600" },
    ratingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
    ratingText: { fontSize: 12, fontWeight: "800", color: theme.colors.textMuted },
    joinedText: { fontSize: 11.5, color: theme.colors.textVeryMuted, marginTop: 4, fontWeight: "600" },

    contactActionsRow: { flexDirection: "row", gap: 8 },
    actionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      minHeight: 44,
      borderRadius: 12,
      backgroundColor: theme.colors.primarySoft,
      borderWidth: 1,
      borderColor: theme.colors.primary + "33",
    },
    actionBtnText: { fontSize: 12.5, fontWeight: "800", color: theme.colors.primary },

    contactMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
    contactMetaText: { fontSize: 12.5, color: theme.colors.textMuted, fontWeight: "600" },
  });

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
  RefreshControl,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../../theme";
import { socialRequest } from "../../../api/api";
import AppIcon from "../../../icons/AppIcon";
import { useLanguage } from "../../../LanguageContext";

// ------------------------------------------------------------------
// Constants & helpers
// ------------------------------------------------------------------
const RANGE_OPTIONS = [
  { value: "1h",  label: "Last hour" },
  { value: "24h", label: "Last 24h" },
  { value: "7d",  label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

const EMPTY_SUMMARY = {
  activity_score: 0, activity_likes: 0, activity_comments: 0,
  activity_posts: 0, activity_jobs_applied: 0, activity_jobs_posted: 0,
  views: 0, likes: 0, comments: 0, shares: 0, saves: 0,
  media_posts: 0, followers: 0, followers_gained: 0,
  average_rating: 0, rating_count: 0,
  jobs_posted: 0, jobs_filled: 0, jobs_open: 0, jobs_waiting_decision: 0,
  applicants_received: 0, average_applicants_per_job: 0,
  direct_hires_made: 0, average_time_to_first_applicant: null,
  average_time_to_fill: null,
  jobs_applied: 0, jobs_attained: 0, pending_applications: 0,
  rejected_applications: 0, direct_hires_received: 0,
  application_success_rate: 0,
  activity_streak: 0, longest_streak: 0,
  achievements: [],
  suggestions: [],
  top_posts: [],
  top_jobs: [],
};

function number(v) { return Number(v ?? 0); }

function formatCount(v) { return number(v).toLocaleString(); }

const { width: SCREEN_W } = Dimensions.get("window");

// ------------------------------------------------------------------
// Custom hook to fetch ranged summary
// ------------------------------------------------------------------
function useRangedSummary(ranges) {
  const [data, setData] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const lastRangesRef = useRef({});

  const fetchData = useCallback(async (r, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      setError("");
      const params = new URLSearchParams({
        activity_range: r.activity,
        content_range:  r.content,
        hiring_range:   r.hiring,
        work_range:     r.work,
      }).toString();
      const res = await socialRequest("get", `/posts/engagement/summary?${params}`, undefined, { preferredAuthActor: "viewer" });
      if (res?.data?.summary) {
        setData({
          ...EMPTY_SUMMARY,
          ...res.data.summary,
          rating_count: Number(
            res.data.summary.rating_count ??
            res.data.summary.ratings_count ??
            0
          ),
          top_posts: res.data.summary.top_posts || [],
          top_jobs:  res.data.summary.top_jobs || [],
          achievements: res.data.summary.achievements || [],
          suggestions:  res.data.summary.suggestions || [],
        });
      }
    } catch (err) {
      console.warn("Insights fetch error", err);
      setError(err?.response?.data?.message || err?.message || "Could not load insights.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const prev = lastRangesRef.current;
    const changed = Object.keys(ranges).some(k => ranges[k] !== prev[k]);
    if (!changed && Object.keys(prev).length > 0) return;
    lastRangesRef.current = ranges;
    fetchData(ranges, false);
  }, [ranges, fetchData]);

  const refresh = useCallback(() => {
    fetchData(ranges, true);
  }, [fetchData, ranges]);

  return { data, loading, refreshing, error, refresh };
}

// ------------------------------------------------------------------
// Range Picker (Modal bottom sheet)
// ------------------------------------------------------------------
function RangePicker({ value, onChange, theme }) {
  const c = theme.colors;
  const [open, setOpen] = useState(false);
  const label = RANGE_OPTIONS.find(o => o.value === value)?.label ?? value;

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: theme.radius?.xs ?? 6,
          borderWidth: 0.5,
          borderColor: c.border,
          backgroundColor: c.surfaceSoft || c.surface,
        }}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 12, color: c.textSecondary, fontWeight: "500" }}>{label}</Text>
        <Text style={{ fontSize: 9, color: c.textMuted, marginTop: 1 }}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={{
            backgroundColor: c.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: 32,
            paddingTop: 8,
          }}>
            <View style={{
              width: 36, height: 4, borderRadius: 2,
              backgroundColor: c.border, alignSelf: "center", marginBottom: 16,
            }} />
            <Text style={{
              fontSize: 13, color: c.textMuted, fontWeight: "500",
              paddingHorizontal: 20, marginBottom: 8,
              textTransform: "uppercase",
            }}>Time range</Text>
            {RANGE_OPTIONS.map(opt => {
              const active = opt.value === value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => { onChange(opt.value); setOpen(false); }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    backgroundColor: active ? (c.primarySoft || c.primary + "20") : "transparent",
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{
                    fontSize: 15,
                    color: active ? c.primary : c.text,
                    fontWeight: active ? "600" : "400",
                  }}>{opt.label}</Text>
                  {active && <Text style={{ fontSize: 16, color: c.primary }}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ------------------------------------------------------------------
// SectionHeader with its own picker
// ------------------------------------------------------------------
function SectionHeader({ title, range, onRangeChange, theme }) {
  const c = theme.colors;
  return (
    <View style={{
      flexDirection: "row", alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
      paddingBottom: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: c.borderLight || c.border,
    }}>
      <Text style={{ fontSize: 15, fontWeight: "600", color: c.text }}>{title}</Text>
      <RangePicker value={range} onChange={onRangeChange} theme={theme} />
    </View>
  );
}

// ------------------------------------------------------------------
// Stat tile (3‑col grid item)
// ------------------------------------------------------------------
function Stat({ label, value, sub, accent }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  return (
    <View style={{ flex: 1, minWidth: (SCREEN_W - 64) / 3 }}>
      <Text style={{ fontSize: 11, color: c.textMuted, marginBottom: 3 }} numberOfLines={1}>
        {label}
      </Text>
      <Text style={{
        fontSize: 22, fontWeight: "600", lineHeight: 26,
        color: accent ? (c.success || "#2e7d32") : c.text,
      }}>
        {value ?? "—"}
      </Text>
      {sub ? <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>{sub}</Text> : null}
    </View>
  );
}

function RatingStat({ value, count }) {
  const { theme } = useAppTheme();
  const rating = Math.max(0, Math.min(5, Number(value) || 0));
  const filledStars = Math.round(rating);
  return (
    <View style={{ flex: 1, minWidth: (SCREEN_W - 64) / 3 }}>
      <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginBottom: 5 }}>Rating</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <AppIcon key={star} name="star" size={15} color="#F5B301" filled={star <= filledStars} />
        ))}
      </View>
      <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginTop: 4 }}>
        {rating.toFixed(1)} · {Number(count) || 0} ratings
      </Text>
    </View>
  );
}

function StatGrid({ children }) {
  const childArray = React.Children.toArray(children);
  const rows = [];
  for (let i = 0; i < childArray.length; i += 3) {
    rows.push(childArray.slice(i, i + 3));
  }
  return (
    <View style={{ gap: 20 }}>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: "row", gap: 12 }}>
          {row.map((child, ci) => <View key={ci} style={{ flex: 1 }}>{child}</View>)}
          {row.length < 3 && Array(3 - row.length).fill().map((_, ei) => (
            <View key={`empty-${ei}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

// ------------------------------------------------------------------
// Animated score bar (for activity breakdown)
// ------------------------------------------------------------------
function ScoreBar({ label, value, max = 100 }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const pct = Math.min(1, (value || 0) / (max || 1));
  const [width, setWidth] = useState("0%");
  useEffect(() => {
    setWidth(`${pct * 100}%`);
  }, [pct]);
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
        <Text style={{ fontSize: 13, color: c.textSecondary }}>{label}</Text>
        <Text style={{ fontSize: 13, fontWeight: "500", color: c.text }}>{value}</Text>
      </View>
      <View style={{ height: 5, backgroundColor: c.borderLight || "#e0e0e0", borderRadius: 3, overflow: "hidden" }}>
        <View style={{ height: "100%", width, backgroundColor: c.primary, borderRadius: 3 }} />
      </View>
    </View>
  );
}

// ------------------------------------------------------------------
// Big score display
// ------------------------------------------------------------------
function BigScore({ value }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ fontSize: 48, fontWeight: "700", color: c.text, lineHeight: 52 }}>
        {formatCount(value)}
      </Text>
      <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>
        Likes · comments · posts · applications combined
      </Text>
    </View>
  );
}

// ------------------------------------------------------------------
// Top post / job rows
// ------------------------------------------------------------------
function TopPostRow({ post, rank }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const engagement = (post.likes || 0) + (post.comments || 0) + (post.shares || 0) + (post.saves || 0);
  return (
    <View style={{ flexDirection: "row", gap: 12, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: c.borderLight }}>
      <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: "600", minWidth: 18 }}>{rank}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: "500", color: c.text, marginBottom: 3 }} numberOfLines={2}>
          {post.caption ? (post.caption.length > 70 ? post.caption.slice(0,70)+"…" : post.caption) : "(no caption)"}
        </Text>
        <Text style={{ fontSize: 11, color: c.textMuted }}>
          {post.likes || 0} likes · {post.comments || 0} comments · {post.views || 0} views
          {post.engagement_rate ? ` · ${post.engagement_rate}%` : ""}
        </Text>
      </View>
      <View style={{ paddingHorizontal: 8, paddingVertical: 3, backgroundColor: c.primarySoft, borderRadius: 6 }}>
        <Text style={{ fontSize: 11, fontWeight: "600", color: c.primary }}>{engagement}</Text>
      </View>
    </View>
  );
}

function TopJobRow({ job, rank }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const statusColors = {
    open:      { bg: c.primarySoft, text: c.primary },
    filled:    { bg: c.successSoft || "#e8f5e9", text: c.success || "#2e7d32" },
    closed:    { bg: c.surfaceSoft, text: c.textMuted },
    default:   { bg: c.surfaceSoft, text: c.textMuted },
  };
  const sc = statusColors[job.status] || statusColors.default;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: c.borderLight }}>
      <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: "600", minWidth: 18 }}>{rank}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: "500", color: c.text }} numberOfLines={1}>
          {job.title ? (job.title.length > 44 ? job.title.slice(0,44)+"…" : job.title) : "Untitled"}
        </Text>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 2 }}>
          <Text style={{ fontSize: 11, color: c.textMuted }}>{job.job_code}</Text>
          <View style={{ paddingHorizontal: 6, paddingVertical: 1, backgroundColor: sc.bg, borderRadius: 4 }}>
            <Text style={{ fontSize: 10, color: sc.text, fontWeight: "600" }}>{job.status || "open"}</Text>
          </View>
        </View>
      </View>
      <Text style={{ fontSize: 13, fontWeight: "600", color: c.text }}>{job.applicant_count || 0}</Text>
      <Text style={{ fontSize: 11, color: c.textMuted }}>applicants</Text>
    </View>
  );
}

// ------------------------------------------------------------------
// Achievement badges
// ------------------------------------------------------------------
function AchievementsList({ items }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  if (!items.length) return <Text style={{ fontSize: 13, color: c.textMuted }}>No achievements yet. Keep posting and engaging!</Text>;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
      {items.map((item, idx) => (
        <View key={idx} style={{ backgroundColor: c.primarySoft, borderRadius: 30, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ color: c.primary, fontWeight: "900", fontSize: 12 }}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

// ------------------------------------------------------------------
// Smart suggestions list
// ------------------------------------------------------------------
function SuggestionsList({ items }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  if (!items.length) return <Text style={{ fontSize: 13, color: c.textMuted }}>Stay active to see personalized tips.</Text>;
  return items.map((item, idx) => (
    <View key={idx} style={{ flexDirection: "row", gap: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: c.borderLight }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: c.onPrimary, fontWeight: "900", fontSize: 12 }}>{idx+1}</Text>
      </View>
      <Text style={{ flex: 1, fontSize: 13, color: c.textSecondary, lineHeight: 20 }}>{item}</Text>
    </View>
  ));
}

// ------------------------------------------------------------------
// Footer note
// ------------------------------------------------------------------
function FooterNote() {
  const { theme } = useAppTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: "row", gap: 8, padding: 14, backgroundColor: c.surfaceSoft, borderRadius: 12, marginTop: 8 }}>
      <Text style={{ fontSize: 13, color: c.textMuted }}>ⓘ</Text>
      <Text style={{ flex: 1, fontSize: 12, color: c.textMuted, lineHeight: 18 }}>
        Profile visits and job views aren‘t tracked yet. Average time metrics need at least one completed job cycle.
        Each section uses its own time filter.
      </Text>
    </View>
  );
}

// ------------------------------------------------------------------
// Main component
// ------------------------------------------------------------------
export default function Insights({ navigation }) {
  const { theme, mode } = useAppTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const c = theme.colors;
  const tx = (en, sw) => language === "sw" ? sw : en;

  // Per‑section time ranges
  const [ranges, setRanges] = useState({
    activity: "7d",
    content:  "30d",
    hiring:   "all",
    work:     "all",
  });

  const setRange = (section) => (val) => setRanges(prev => ({ ...prev, [section]: val }));

  const { data: s, loading, refreshing, error, refresh } = useRangedSummary(ranges);

  // Compute max for score bars (avoid division by zero)
  const scoreMax = Math.max(s.activity_score, 1);

  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: c.bg }}>
        <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} backgroundColor={c.surface} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: c.bg }}>
      <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} backgroundColor={c.surface} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: Math.max(insets.bottom, 16) + 36 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[c.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ minHeight: 54, marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
          <TouchableOpacity
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate("MainTabs", { screen: "Profile" })}
            style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSoft }}
          >
            <AppIcon name="arrowLeft" size={18} color={c.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 19, fontWeight: "800", color: c.text }}>{language === "sw" ? "Maarifa" : "Insights"}</Text>
            <Text style={{ fontSize: 11.5, color: c.textMuted }}>{language === "sw" ? "Shughuli, maudhui na kuajiri" : "Activity, content and hiring"}</Text>
          </View>
          {loading && <ActivityIndicator size="small" color={c.primary} />}
        </View>

        {error ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, marginBottom: 18, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
            <AppIcon name="warning" size={18} color={c.warning} />
            <Text style={{ flex: 1, color: c.textSecondary, fontSize: 12.5, lineHeight: 18 }}>{error}</Text>
            <TouchableOpacity onPress={refresh}>
              <Text style={{ color: c.primary, fontWeight: "800", fontSize: 12 }}>{tx("Retry", "Jaribu tena")}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ───────── Activity score ───────── */}
        <SectionHeader title={tx("Activity score", "Kiwango cha shughuli")} range={ranges.activity} onRangeChange={setRange("activity")} theme={theme} />
        <BigScore value={s.activity_score} />
        <ScoreBar label={tx("Likes given", "Likes ulizoweka")} value={s.activity_likes} max={scoreMax} />
        <ScoreBar label={tx("Comments made", "Comments ulizoandika")} value={s.activity_comments} max={scoreMax} />
        <ScoreBar label={tx("Posts published", "Posts ulizochapisha")} value={s.activity_posts} max={scoreMax} />
        <ScoreBar label={tx("Jobs applied to", "Kazi ulizoomba")} value={s.activity_jobs_applied} max={scoreMax} />
        <ScoreBar label={tx("Jobs posted", "Kazi ulizoweka")} value={s.activity_jobs_posted} max={scoreMax} />

        <View style={{ height: 0.5, backgroundColor: c.border, marginVertical: 28 }} />

        {/* ───────── Overview ───────── */}
        <SectionHeader title={tx("Overview", "Muhtasari")} range={ranges.content} onRangeChange={setRange("content")} theme={theme} />
        <StatGrid>
          <Stat label={tx("Followers", "Followers")} value={formatCount(s.followers)} sub={s.followers_gained > 0 ? `+${s.followers_gained} ${tx("new", "wapya")}` : undefined} />
          <Stat label={tx("Posts", "Posts")} value={s.media_posts} />
          <Stat label={tx("Total views", "Jumla ya views")} value={formatCount(s.views)} />
          <Stat label="Likes" value={formatCount(s.likes)} />
          <Stat label="Comments" value={formatCount(s.comments)} />
          <Stat label={tx("Shares", "Shares")} value={formatCount(s.shares)} />
          <Stat label={tx("Saves", "Saved")} value={formatCount(s.saves)} />
          <RatingStat value={s.average_rating} count={s.rating_count} />
          <Stat label={tx("Profile visits", "Waliotembelea profaili")} value="—" sub={tx("Coming soon", "Inakuja")} />
        </StatGrid>

        <View style={{ height: 0.5, backgroundColor: c.border, marginVertical: 28 }} />

        {/* ───────── Content performance ───────── */}
        <SectionHeader title={tx("Content performance", "Matokeo ya maudhui")} range={ranges.content} onRangeChange={setRange("content")} theme={theme} />
        {s.top_posts.length === 0 ? (
          <Text style={{ fontSize: 13, color: c.textMuted, paddingVertical: 8 }}>No posts in this time window yet.</Text>
        ) : (
          <>
            <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: "500", letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 4, marginTop: 4 }}>
              Top posts by engagement
            </Text>
            {s.top_posts.slice(0,5).map((post, i) => <TopPostRow key={post.id} post={post} rank={i+1} />)}
          </>
        )}

        <View style={{ height: 0.5, backgroundColor: c.border, marginVertical: 28 }} />

        {/* ───────── Hiring insights ───────── */}
        <SectionHeader title={tx("Hiring insights", "Taarifa za kuajiri")} range={ranges.hiring} onRangeChange={setRange("hiring")} theme={theme} />
        <StatGrid>
          <Stat label="Jobs posted" value={s.jobs_posted} />
          <Stat label="Jobs open" value={s.jobs_open} />
          <Stat label="Jobs filled" value={s.jobs_filled} accent />
          <Stat label="Waiting decision" value={s.jobs_waiting_decision} />
          <Stat label="Applicants received" value={s.applicants_received} />
          <Stat label="Avg / job" value={s.average_applicants_per_job} />
          <Stat label="Direct hires made" value={s.direct_hires_made} />
          <Stat label="Time to first applicant" value={s.average_time_to_first_applicant ?? "—"} sub={!s.average_time_to_first_applicant ? "Not enough data" : undefined} />
          <Stat label="Time to fill" value={s.average_time_to_fill ?? "—"} sub={!s.average_time_to_fill ? "Not enough data" : undefined} />
        </StatGrid>
        {s.top_jobs.length > 0 && (
          <>
            <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: "500", marginTop: 20, marginBottom: 8, textTransform: "uppercase" }}>
              Top jobs by applicants
            </Text>
            {s.top_jobs.map((job, i) => <TopJobRow key={job.id} job={job} rank={i+1} />)}
          </>
        )}

        <View style={{ height: 0.5, backgroundColor: c.border, marginVertical: 28 }} />

        {/* ───────── Work insights ───────── */}
        <SectionHeader title={tx("Work insights", "Taarifa za kazi")} range={ranges.work} onRangeChange={setRange("work")} theme={theme} />
        <StatGrid>
          <Stat label="Applied to" value={s.jobs_applied} />
          <Stat label="Jobs attained" value={s.jobs_attained} accent />
          <Stat label="Pending review" value={s.pending_applications} />
          <Stat label="Not selected" value={s.rejected_applications} />
          <Stat label="Direct hires received" value={s.direct_hires_received} />
          <Stat label="Success rate" value={s.jobs_applied ? `${s.application_success_rate}%` : "—"} accent={s.application_success_rate >= 50} />
        </StatGrid>
        {s.jobs_applied > 0 && (
          <View style={{ marginTop: 20 }}>
            <ScoreBar label="Application success rate" value={s.application_success_rate} max={100} />
          </View>
        )}

        {/* ───────── Activity streak ───────── */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: c.text, marginBottom: 12 }}>Activity streak</Text>
          <StatGrid>
            <Stat label="Current streak" value={`${s.activity_streak} days`} accent={s.activity_streak > 0} />
            <Stat label="Longest streak" value={`${s.longest_streak} days`} />
          </StatGrid>
          <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 8 }}>Streak counts consecutive days you posted, liked, commented, applied or followed.</Text>
        </View>

        {/* ───────── Achievements ───────── */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: c.text, marginBottom: 12 }}>Achievements</Text>
          <AchievementsList items={s.achievements} />
          <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 8 }}>Earned by reaching milestones like first job, 100 profile visits, 10 applications.</Text>
        </View>

        {/* ───────── Smart suggestions ───────── */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: c.text, marginBottom: 12 }}>Smart suggestions</Text>
          <SuggestionsList items={s.suggestions} />
        </View>

        <FooterNote />
      </ScrollView>
    </View>
  );
}

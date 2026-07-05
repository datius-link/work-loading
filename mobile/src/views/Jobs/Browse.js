import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { api, getFriendlyApiError } from "../../api/api";
import { useLanguage } from "../../LanguageContext";
import { getUserSession } from "../../utils/userSession";
import { formatRelativeDate, formatDeadline } from "./jobDate";
import AppIcon from "../../icons/AppIcon";
import { useAppTheme } from "../../theme";
import { cachedGet } from "../../utils/offlineCache";
import CachedDataNotice from "../../components/CachedDataNotice";

const T = {
  en: {
    search: "Search jobs…",
    empty: "No jobs found.",
    emptyFiltered: "No jobs match this filter.",
    loading: "Finding jobs…",
    retry: "Try again",
    location: "Location not set",
    posted: "Posted",
    today: "Today",
    applicants: (n) => `${n} applicant${n === 1 ? "" : "s"}`,
    recommended: "Recommended",
    filterAll: "All",
    filterRecommended: "Recommended",
    filterNewest: "Newest",
    filterClosingSoon: "Closing soon",
    budgetFrom: "From",
    budgetUpTo: "Up to",
  },
  sw: {
    search: "Tafuta kazi…",
    empty: "Hakuna kazi.",
    emptyFiltered: "Hakuna kazi zinazolingana na kichujio hiki.",
    loading: "Inatafuta…",
    retry: "Jaribu tena",
    location: "Eneo halijawekwa",
    posted: "Imechapishwa",
    today: "Leo",
    applicants: (n) => `${n} ${n === 1 ? "mwombaji" : "waombaji"}`,
    recommended: "Inapendekezwa",
    filterAll: "Zote",
    filterRecommended: "Zinazopendekezwa",
    filterNewest: "Mpya Zaidi",
    filterClosingSoon: "Zinakaribia Kufunga",
    budgetFrom: "Kuanzia",
    budgetUpTo: "Hadi",
  },
};

const FILTERS = ["all", "recommended", "newest", "closing_soon"];

function toJobRow(job) {
  return {
    ...job,
    code: job.job_code || job.code || "JOB",
    service: job.service_type || "",
    postedAt: formatRelativeDate(job.created_at),
    closesFriendly: job.tender_closes_at ? formatDeadline(job.tender_closes_at) : "",
    applicants: Number(job.applicant_count || 0),
  };
}

function formatBudget(min, max, t) {
  const fmt = (v) => `TZS ${Number(v).toLocaleString()}`;
  if (min && max) return Number(min) === Number(max) ? fmt(min) : `${fmt(min)}–${fmt(max)}`;
  if (min) return `${t.budgetFrom} ${fmt(min)}`;
  if (max) return `${t.budgetUpTo} ${fmt(max)}`;
  return null;
}

function applyQuickFilter(list, key) {
  if (key === "recommended") return list.filter((j) => j.is_recommended);
  if (key === "newest") return [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (key === "closing_soon")
    return [...list].sort((a, b) => {
      const da = a.tender_closes_at ? new Date(a.tender_closes_at).getTime() : Infinity;
      const db = b.tender_closes_at ? new Date(b.tender_closes_at).getTime() : Infinity;
      return da - db;
    });
  return list;
}

// ─── Flat, divider-style job row (no card background/border/shadow) ───────
function JobRow({ item, theme, t, onPress }) {
  const s = useMemo(() => createStyles(theme), [theme]);
  const scale = useRef(new Animated.Value(1)).current;
  const budget = formatBudget(item.budget_min, item.budget_max, t);

  const pressIn = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 60, bounciness: 0 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View style={[s.row, { transform: [{ scale }] }]}>
        <View style={s.rowMain}>
          <View style={s.rowTop}>
            <View style={s.codeRow}>
              <View style={s.statusDot} />
              <Text style={s.codeTxt}>{item.code}</Text>
            </View>
            {item.is_recommended ? (
              <View style={s.recBadge}>
                <AppIcon name="star" size={11} color={theme.colors.warning} filled />
                <Text style={s.recTxt}>{t.recommended}</Text>
              </View>
            ) : null}
          </View>

          <Text style={s.title} numberOfLines={1}>
            {item.title}
          </Text>

          <View style={s.chipsRow}>
            <View style={s.metaItem}>
              <AppIcon name="map-pin" size={11} color={theme.colors.textMuted} />
              <Text style={s.metaTxt} numberOfLines={1}>
                {item.location || t.location}
              </Text>
            </View>
            {item.service ? (
              <View style={s.tagChip}>
                <Text style={s.tagChipTxt} numberOfLines={1}>
                  {item.service}
                </Text>
              </View>
            ) : null}
            {budget ? (
              <View style={s.budgetChip}>
                <Text style={s.budgetChipTxt} numberOfLines={1}>
                  {budget}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={s.footerRow}>
            <Text style={s.metaSm} numberOfLines={1}>
              {t.posted} {item.postedAt || t.today}
              {item.closesFriendly ? ` · ${item.closesFriendly}` : ""}
            </Text>
            {item.applicants > 0 ? (
              <View style={s.applicantsInline}>
                <AppIcon name="users" size={11} color={theme.colors.accent} />
                <Text style={s.applicantsTxt}>{t.applicants(item.applicants)}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <AppIcon name="chevron-right" size={16} color={theme.colors.textMuted} />
      </Animated.View>
    </Pressable>
  );
}

// ─── Skeleton row shown while the first load is in flight ─────────────────
function SkeletonRow({ theme }) {
  const s = useMemo(() => createStyles(theme), [theme]);
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View style={[s.row, { opacity: pulse }]}>
      <View style={s.rowMain}>
        <View style={[s.skelBlock, { width: 56, height: 9 }]} />
        <View style={[s.skelBlock, { width: "68%", height: 15, marginTop: 8 }]} />
        <View style={[s.skelBlock, { width: "46%", height: 9, marginTop: 8 }]} />
        <View style={[s.skelBlock, { width: "38%", height: 9, marginTop: 8 }]} />
      </View>
    </Animated.View>
  );
}

export default function BrowseJobs() {
  const nav = useNavigation();
  const { theme } = useAppTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const { language } = useLanguage();
  const t = T[language] || T.en;
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState("all");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showingCached, setShowingCached] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const session = await getUserSession();
      const me = session.profile?.uuid || session.user?.uuid || null;
      setError("");
      const cacheKey = `hiring:requests:browse:${search.trim().toLowerCase() || "all"}`;
      const result = await cachedGet(cacheKey, () =>
        api.get("/hiring/requests", { params: { q: search.trim() || undefined, scope: "browse" } }).then((res) => res.data)
      );
      setShowingCached(result.fromCache);
      setJobs(
        (result?.data?.jobs || [])
          .filter((j) => {
            const o = j.created_by || j.client_user_uuid || j.poster_uuid || j.poster?.uuid;
            const isDirect = j.hire_type === "direct" || !!j.target_provider_uuid || !!j.direct_status;
            return !isDirect && !j.has_applied && ["open", "applied"].includes(j.status) && !(o && me && o === me);
          })
          .map(toJobRow)
      );
    } catch (e) {
      setError(getFriendlyApiError(e, language));
      setShowingCached(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [language, search]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const searched = jobs.filter((j) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return [j.title, j.code, j.location, j.service].some((v) => String(v || "").toLowerCase().includes(q));
  });
  const filtered = applyQuickFilter(searched, quickFilter);

  return (
    <View style={s.safe}>
      <View style={s.searchWrap}>
        <AppIcon name="search" size={16} color={theme.colors.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder={t.search}
          placeholderTextColor={theme.colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity style={s.clearBtn} onPress={() => setSearch("")} hitSlop={8}>
            <AppIcon name="close" size={13} color={theme.colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
      >
        {FILTERS.map((key) => {
          const active = quickFilter === key;
          const label = { all: t.filterAll, recommended: t.filterRecommended, newest: t.filterNewest, closing_soon: t.filterClosingSoon }[key];
          return (
            <TouchableOpacity
              key={key}
              style={[s.filterChip, active && s.filterChipActive]}
              onPress={() => setQuickFilter(key)}
              activeOpacity={0.75}
            >
              <Text style={[s.filterChipTxt, active && s.filterChipTxtActive]} numberOfLines={1}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <CachedDataNotice visible={showingCached} />
      {error ? (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} style={s.retryBtn}>
            <Text style={s.retryText}>{t.retry}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <View style={s.list}>
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonRow key={i} theme={theme} />
          ))}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => String(i.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.list, !filtered.length && { flexGrow: 1 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={theme.colors.primary}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          renderItem={({ item }) => (
            <JobRow item={item} theme={theme} t={t} onPress={() => nav.navigate("RequestDetails", { job: item })} />
          )}
          ListEmptyComponent={
            error ? null : (
              <View style={s.empty}>
                <AppIcon name="briefcase" size={36} color={theme.colors.textMuted} />
                <Text style={s.emptyTxt}>{quickFilter === "all" ? t.empty : t.emptyFiltered}</Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },

    // Search
    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      height: 40,
      marginHorizontal: 16,
      marginTop: 10,
      marginBottom: 10,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    searchInput: { flex: 1, fontSize: 14, color: theme.colors.text, padding: 0 },
    clearBtn: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceSoft,
    },

    // Quick filter chips — compact, horizontal scroll, not the wide pills
    // used elsewhere.
    filterRow: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 16,
      paddingBottom: 10,
    },
    filterChip: {
      height: 30,
      paddingHorizontal: 13,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterChipActive: {
      backgroundColor: theme.colors.primarySoft,
      borderColor: theme.colors.primary,
    },
    filterChipTxt: { fontSize: 12.5, fontWeight: "600", color: theme.colors.textMuted },
    filterChipTxtActive: { color: theme.colors.primaryStrong, fontWeight: "800" },

    // List — flat rows separated by a divider only, no card surface.
    list: { paddingHorizontal: 16, paddingBottom: 100 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    rowMain: { flex: 1, gap: 5 },
    rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    codeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.primaryStrong },
    codeTxt: { color: theme.colors.textMuted, fontSize: 10.5, fontWeight: "800", letterSpacing: 0.4 },

    recBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
    recTxt: { color: theme.colors.warning, fontSize: 11, fontWeight: "800" },

    title: { fontSize: 18, fontWeight: "800", color: theme.colors.text, lineHeight: 23 },

    chipsRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 4, maxWidth: 160 },
    metaTxt: { color: theme.colors.textMuted, fontSize: 12 },
    tagChip: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tagChipTxt: { color: theme.colors.textMuted, fontSize: 10.5, fontWeight: "700" },
    budgetChip: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: theme.colors.successSoft,
    },
    budgetChipTxt: { color: theme.colors.success, fontSize: 10.5, fontWeight: "700" },

    footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    metaSm: { color: theme.colors.textMuted, fontSize: 11, flex: 1 },
    applicantsInline: { flexDirection: "row", alignItems: "center", gap: 4 },
    applicantsTxt: { color: theme.colors.accent, fontSize: 11.5, fontWeight: "700" },

    // Skeleton
    skelBlock: { borderRadius: 6, backgroundColor: theme.colors.surfaceSoft },

    // Empty / error
    empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 40 },
    emptyTxt: { color: theme.colors.textMuted, fontSize: 15, fontWeight: "600", textAlign: "center" },
    errorBox: {
      marginHorizontal: 16,
      marginBottom: 8,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      alignItems: "center",
      gap: 8,
    },
    errorText: { color: theme.colors.text, fontSize: 12, textAlign: "center" },
    retryBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: theme.colors.primary },
    retryText: { color: theme.colors.onPrimary, fontSize: 12, fontWeight: "800" },
  });

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AppIcon from "../../../../icons/AppIcon";
import { useAppTheme } from "../../../../theme";
import { useLanguage } from "../../../../LanguageContext";
import { getFriendlyApiError, viewerRequest } from "../../../../api/api";
import { formatRelativeDate } from "../../jobDate";
import { useCall } from "../../../../calling/CallProvider";

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return "—";
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// One row can mean something different for each side of the call, exactly
// like a real phone's call log — "Outgoing call to John" for whoever placed
// it, "Incoming call from John" for whoever received it, but only if it
// actually connected. Anything that never connected reads as a miss/decline/
// busy line instead, regardless of duration.
function describeCall(item, tx) {
  const other = item.direction === "outgoing" ? item.callee : item.caller;
  const name = other?.full_name || other?.username || "e-kazi user";

  if (item.direction === "incoming") {
    if (item.outcome === "completed") return { label: tx(`Incoming call from ${name}`, `Simu iliyopokewa kutoka ${name}`), tone: "incoming" };
    if (item.outcome === "declined") return { label: tx(`You declined a call from ${name}`, `Ulikataa simu kutoka ${name}`), tone: "declined" };
    if (item.outcome === "busy") return { label: tx(`Missed call from ${name} (you were on another call)`, `Simu uliyokosa kutoka ${name} (ulikuwa kwenye simu nyingine)`), tone: "missed" };
    // missed, cancelled, failed all read the same from the receiving side:
    // a call I never actually answered.
    return { label: tx(`Missed call from ${name}`, `Simu uliyokosa kutoka ${name}`), tone: "missed" };
  }

  // Outgoing
  if (item.outcome === "completed") return { label: tx(`Outgoing call to ${name}`, `Simu uliyopiga kwa ${name}`), tone: "outgoing" };
  if (item.outcome === "declined") return { label: tx(`${name} declined your call`, `${name} amekataa simu yako`), tone: "declined" };
  if (item.outcome === "busy") return { label: tx(`${name} was on another call`, `${name} alikuwa kwenye simu nyingine`), tone: "missed" };
  if (item.outcome === "cancelled") return { label: tx(`You cancelled your call to ${name}`, `Umeghairi simu yako kwa ${name}`), tone: "declined" };
  if (item.outcome === "failed") return { label: tx(`Call to ${name} disconnected`, `Simu kwa ${name} imekatika`), tone: "missed" };
  return { label: tx(`No answer from ${name}`, `Hakuna jibu kutoka ${name}`), tone: "missed" };
}

const TONE = {
  incoming: { icon: "phone", colorKey: "success" },
  outgoing: { icon: "phone", colorKey: "primary" },
  missed: { icon: "phone", colorKey: "danger" },
  declined: { icon: "phone", colorKey: "textMuted" },
};

function CallRow({ item, index, theme, tx }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 320,
      delay: Math.min(index, 10) * 45,
      useNativeDriver: true,
    }).start();
  }, [anim, index]);

  const { label, tone } = describeCall(item, tx);
  const toneInfo = TONE[tone] || TONE.outgoing;
  const color = theme.colors[toneInfo.colorKey] || theme.colors.textMuted;
  const other = item.direction === "outgoing" ? item.callee : item.caller;

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  return (
    <Animated.View style={[styles.row, { opacity: anim, transform: [{ translateY }] }]}>
      <View style={[styles.iconWrap, { borderColor: color, backgroundColor: `${color}18` }]}>
        <AppIcon name={tone === "outgoing" ? "arrow-up-right" : tone === "incoming" ? "arrow-down-left" : toneInfo.icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.label, { color: theme.colors.text }]} numberOfLines={1}>{label}</Text>
        <Text style={[styles.meta, { color: theme.colors.textMuted }]}>
          {formatRelativeDate(item.initiated_at)}, {formatTime(item.initiated_at)}
        </Text>
      </View>
      <View style={styles.durationWrap}>
        <Text style={[styles.duration, { color: theme.colors.textMuted }]}>{formatDuration(item.duration_seconds)}</Text>
        {other?.username ? <Text style={[styles.username, { color: theme.colors.textVeryMuted }]} numberOfLines={1}>@{other.username}</Text> : null}
      </View>
    </Animated.View>
  );
}

export default function WorkspaceCalls({ jobId, otherParty, jobTitle }) {
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const call = useCall();
  const tx = (en, sw) => (language === "sw" ? sw : en);
  const s = useMemo(() => createStyles(theme), [theme]);

  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async ({ refresh = false } = {}) => {
    if (!jobId) return;
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      setError("");
      const res = await viewerRequest("get", `/calls/job/${jobId}`);
      setCalls(Array.isArray(res?.data?.calls) ? res.data.calls : []);
    } catch (err) {
      setError(getFriendlyApiError(err, language));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [jobId, language]);

  useEffect(() => { load(); }, [load]);

  // A call that just ended (this workspace's own CallProvider session) is
  // the one moment the list is stale without a manual pull-to-refresh —
  // reload the moment the in-app call goes back to idle.
  const prevCallState = useRef(call?.callState);
  useEffect(() => {
    if (prevCallState.current !== "idle" && call?.callState === "idle") load();
    prevCallState.current = call?.callState;
  }, [call?.callState, load]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={s.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ refresh: true })} tintColor={theme.colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {call?.supported && otherParty?.uuid ? (
        <TouchableOpacity
          style={s.callCta}
          onPress={() =>
            call.startCall({
              calleeUuid: otherParty.uuid,
              calleeName: otherParty.username || otherParty.full_name,
              calleePhoto: otherParty.profile_pic,
              jobId,
              jobTitle,
            })
          }
        >
          <View style={s.callCtaIcon}>
            <AppIcon name="phone" size={18} color={theme.colors.onPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.callCtaTitle}>{tx("Start a call", "Anzisha simu")}</Text>
            <Text style={s.callCtaBody}>
              {tx(`Call ${otherParty.username || otherParty.full_name || "the other side"} about this job`, `Piga simu ${otherParty.username || otherParty.full_name || "upande mwingine"} kuhusu kazi hii`)}
            </Text>
          </View>
          <AppIcon name="chevron-right" size={16} color={theme.colors.onPrimary} />
        </TouchableOpacity>
      ) : null}

      {error ? (
        <View style={s.center}>
          <Text style={{ color: theme.colors.danger, fontWeight: "700" }}>{error}</Text>
        </View>
      ) : calls.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIcon}><AppIcon name="phone" size={26} color={theme.colors.primary} /></View>
          <Text style={s.emptyTitle}>{tx("No calls yet", "Hakuna simu bado")}</Text>
          <Text style={s.emptyBody}>
            {tx("Calls made about this job will show up here — missed, incoming, and outgoing.", "Simu zinazohusu kazi hii zitaonekana hapa — zilizokosekana, zilizopokewa na zilizopigwa.")}
          </Text>
        </View>
      ) : (
        calls.map((item, index) => <CallRow key={item.id} item={item} index={index} theme={theme} tx={tx} />)
      )}
    </ScrollView>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    list: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl, gap: 2 },
    center: { alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 24 },
    callCta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      borderRadius: 14,
      backgroundColor: theme.colors.primary,
      marginBottom: 16,
    },
    callCtaIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.18)",
    },
    callCtaTitle: { color: theme.colors.onPrimary, fontWeight: "900", fontSize: 14.5 },
    callCtaBody: { color: theme.colors.onPrimary, opacity: 0.85, fontSize: 12, marginTop: 2 },
    emptyIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primarySoft,
      marginBottom: 14,
    },
    emptyTitle: { color: theme.colors.text, fontSize: 16, fontWeight: "900" },
    emptyBody: { color: theme.colors.textMuted, fontSize: 12.5, textAlign: "center", marginTop: 6, lineHeight: 18 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1.5,
      alignItems: "center",
      justifyContent: "center",
    },
    label: { fontSize: 13.5, fontWeight: "800" },
    meta: { fontSize: 11.5, fontWeight: "700", marginTop: 2 },
    durationWrap: { alignItems: "flex-end" },
    duration: { fontSize: 12.5, fontWeight: "800" },
    username: { fontSize: 10.5, marginTop: 2, maxWidth: 100 },
  });

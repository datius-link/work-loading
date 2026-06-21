import React, { useMemo } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../../../../theme";
import { Card, SectionHeading, InfoRow } from "../../../Jobs/jobsUI";
import { formatJobDate, formatRelativeDate } from "../../../Jobs/jobDate";
import { useLanguage } from "../../../../LanguageContext";

function avatarUri(u) {
  if (u?.profile_pic) return u.profile_pic;
  const name = encodeURIComponent(u?.username || u?.full_name || "U");
  return `https://ui-avatars.com/api/?name=${name}&background=0B6B63&color=fff&bold=true&rounded=true`;
}

function formatBudget(v) {
  const raw = String(v || "").trim();
  if (!raw) return "TBD";
  if (/^TZS\b/i.test(raw)) return raw;
  const n = raw.replace(/[^\d.]/g, "");
  return n ? `TZS ${Number(n).toLocaleString("en-US")}` : raw;
}

export default function WorkspaceDetails({ job }) {
  const nav = useNavigation();
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const s = useMemo(() => createStyles(theme), [theme]);
  const tx = (en, sw) => language === "sw" ? sw : en;

  if (!job) return null;

  const contact = job.contact_details;
  const otherParty = contact?.viewer_role === "hirer" ? contact?.service_provider : contact?.hirer;
  const code = job.job_code || job.code || "JOB";

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
      <Card>
        <SectionHeading label={tx("Job summary", "Muhtasari wa kazi")} />
        <View style={s.codePill}>
          <Text style={s.codeText}>{code}</Text>
        </View>
        <Text style={s.detailTitle}>{job.title}</Text>
        <InfoRow icon="map-pin"     label={tx("Location", "Eneo")}  value={job.location || tx("Not set", "Halijawekwa")} />
        <InfoRow icon="calendar"    label={tx("Posted", "Ilichapishwa")} value={formatRelativeDate(job.created_at) || tx("Today", "Leo")} />
        <InfoRow icon="clock" label={tx("Deadline", "Mwisho")} value={formatJobDate(job.tender_closes_at) || "—"} />
        <InfoRow icon="play-circle" label={tx("Started", "Ilianza")} value={formatJobDate(job.started_at) || tx("Not confirmed", "Haijathibitishwa")} />
        <InfoRow icon="award"       label={tx("Completed", "Imekamilika")} value={formatJobDate(job.completed_at) || tx("Not confirmed", "Haijathibitishwa")} />
        <InfoRow icon="dollar-sign" label={tx("Budget", "Bajeti")} value={formatBudget(job.assigned_budget || job.budget)} />
      </Card>

      {job.description ? (
        <Card>
          <SectionHeading label={tx("Description", "Maelezo")} />
          <Text style={s.detailBody}>{job.description}</Text>
        </Card>
      ) : null}

      {otherParty ? (
        <Card>
          <SectionHeading label={tx("Your contact", "Mawasiliano yako")} />
          <View style={s.contactCard}>
            <Image source={{ uri: avatarUri(otherParty) }} style={s.contactAvatar} />
            <View style={{ flex: 1 }}>
              <Text style={s.contactName}>@{otherParty.username || "user"}</Text>
              <Text style={s.contactFull}>{otherParty.full_name || ""}</Text>
            </View>
            <TouchableOpacity
              style={s.profileBtn}
              onPress={() => nav.navigate("UserProfile", { uuid: otherParty.uuid })}
            >
              <Text style={s.profileBtnTxt}>{tx("View Profile", "Angalia Profaili")}</Text>
            </TouchableOpacity>
          </View>
          {otherParty.phone_number && <InfoRow icon="phone" label={tx("Phone", "Simu")} value={otherParty.phone_number} />}
          {otherParty.email && <InfoRow icon="mail" label="Email" value={otherParty.email} />}
        </Card>
      ) : null}
    </ScrollView>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    scroll: { padding: 16, gap: 12, paddingBottom: 100 },

    codePill: {
      backgroundColor: theme.colors.primarySoft,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
      alignSelf: "flex-start",
      marginBottom: 8,
    },
    codeText: { color: theme.colors.primary, fontSize: 12, fontWeight: "800" },
    detailTitle: { fontSize: 20, fontWeight: "800", color: theme.colors.text, lineHeight: 26, marginBottom: 8 },
    detailBody: { fontSize: 14, color: theme.colors.textMuted, lineHeight: 22 },

    contactCard: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
    contactAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.surfaceSoft },
    contactName: { fontSize: 15, fontWeight: "800", color: theme.colors.text },
    contactFull: { fontSize: 12, color: theme.colors.textMuted },

    profileBtn: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    profileBtnTxt: { color: theme.colors.primary, fontSize: 12, fontWeight: "700" },
  });

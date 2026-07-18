import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Txt from "../../Txt";
import { useAppTheme } from "../../theme";
import SettingsScreen from "./SettingsScreen";

const SECTIONS = [
  ["What Work Loading collects", "Tunachokusanya", "We collect account, profile, job, message, rating, recommendation, and app activity data needed to operate Work Loading.", "Tunakusanya taarifa za akaunti, profaili, kazi, ujumbe, ratings, mapendekezo na matumizi ya app zinazohitajika kuendesha Work Loading."],
  ["How jobs and messages work", "Kazi na ujumbe vinavyofanya kazi", "Job and message data is shared with the people involved in that work and used to support the job lifecycle.", "Taarifa za kazi na ujumbe hushirikiwa na watu wanaohusika na kazi hiyo na kusaidia mzunguko wa kazi."],
  ["Media uploads", "Media unazopakia", "Photos and videos you upload may appear in posts, profiles, job applications, or workspaces according to the feature you use.", "Picha na video unazopakia zinaweza kuonekana kwenye posts, profaili, maombi ya kazi au workspace kulingana na sehemu unayotumia."],
  ["Notifications", "Notifications", "We use notifications for messages, jobs, follows, posts, and important account activity. You can control available notification preferences.", "Tunatumia notifications kwa ujumbe, kazi, follows, posts na shughuli muhimu za akaunti. Unaweza kudhibiti mapendeleo yake."],
  ["Contact visibility after job assignment", "Mawasiliano baada ya kupewa kazi", "Contact details are not placed on public profiles. Enabled contact details are shown only inside assigned job screens.", "Mawasiliano hayawekwi kwenye profaili za umma. Uliyowasha huonekana ndani ya screen za kazi iliyopangiwa tu."],
  ["Account safety", "Usalama wa akaunti", "Keep your login details private and report suspicious profiles, jobs, fraud, harassment, or technical problems.", "Linda taarifa zako za kuingia na ripoti profaili, kazi, utapeli, unyanyasaji au matatizo ya kiufundi yanayotia shaka."],
  ["Contact us", "Wasiliana nasi", "Use Contact us in Settings when you need private help about your account or Work Loading activity.", "Tumia Wasiliana nasi kwenye Settings ukihitaji msaada wa faragha kuhusu akaunti au shughuli zako za Work Loading."],
];

export default function PrivacyPolicy({ onBack }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <SettingsScreen titleEn="Privacy Policy" titleSw="Sera ya Faragha" onBack={onBack}>
      {SECTIONS.map(([en, sw, bodyEn, bodySw]) => (
        <View key={en} style={styles.section}>
          <Txt en={en} sw={sw} style={styles.title} />
          <Txt en={bodyEn} sw={bodySw} style={styles.body} />
        </View>
      ))}
    </SettingsScreen>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    section: { paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    title: { color: theme.colors.text, fontSize: 13, fontWeight: "900" },
    body: { color: theme.colors.textMuted, fontSize: 11.5, lineHeight: 18, marginTop: 4 },
  });

import React, { useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import AppIcon from "../../icons/AppIcon";
import Txt from "../../Txt";
import { useAppTheme } from "../../theme";
import SettingsScreen, { SettingDivider } from "./SettingsScreen";

const FAQS = [
  [
    "How do I browse or find jobs?",
    "Ninatafutaje kazi?",
    "Open the Jobs tab and tap \"Browse\". You'll see all open jobs with their budget, location, and closing date. Use the search bar to look for a keyword, or use the filter chips (All, Recommended, Newest, Closing soon) to sort the list. Tap any job card to see its full description, requirements, and to apply.",
    "Fungua kichupo cha Kazi kisha ugonge \"Browse\". Utaona kazi zote zilizo wazi pamoja na bajeti, eneo, na tarehe ya mwisho. Tumia sehemu ya utafutaji kutafuta neno, au tumia vitufe vya kuchuja (Zote, Zinazopendekezwa, Mpya, Zinazokaribia kufungwa) kupanga orodha. Gonga kadi yoyote ya kazi kuona maelezo kamili na kuomba.",
  ],
  [
    "How do I post a job (as a hirer)?",
    "Ninawekaje kazi (kama mwajiri)?",
    "Go to the Jobs tab, make sure you're on the \"My Jobs\" section, and tap \"Post a Job\". Fill in the title, description, category, budget, and any requirements (like availability or a specific date), then submit. Your job becomes visible to providers immediately and moves through the pipeline as people apply.",
    "Nenda kwenye kichupo cha Kazi, hakikisha upo kwenye sehemu ya \"Kazi Zangu\", kisha gonga \"Chapisha Kazi\". Jaza kichwa, maelezo, aina ya kazi, bajeti, na mahitaji yoyote (kama upatikanaji au tarehe maalum), kisha wasilisha. Kazi yako inaonekana mara moja kwa watoa huduma na inaendelea kwenye hatua za kazi kadri watu wanavyoomba.",
  ],
  [
    "How do I apply to a job (as a provider)?",
    "Ninaombaje kazi (kama mtoa huduma)?",
    "Open a job from Browse and tap \"Apply\" (or respond to a direct hire offer from your My Requests list). Add your proposed budget, estimated delivery time, your experience, and an optional message explaining why you're a good fit. The hirer will review your application alongside other applicants and choose who to assign the job to.",
    "Fungua kazi kutoka Browse kisha gonga \"Omba\" (au jibu ombi la kuajiriwa moja kwa moja kutoka orodha yako ya Maombi Yangu). Ongeza bajeti unayopendekeza, muda wa kukamilisha, uzoefu wako, na ujumbe wa hiari unaoeleza kwa nini unafaa. Mwajiri atapitia ombi lako pamoja na waombaji wengine na kuchagua wa kumpa kazi.",
  ],
  [
    "How do in-app chat and attachments work?",
    "Mazungumzo na viambatanisho vinafanyaje kazi?",
    "Once a provider is assigned, a Job Workspace opens for both sides with a Chat tab. Messages update live for both people. You can attach photos or short videos to a message (tap the attachment icon before sending) — this is useful for sharing progress photos, reference images, or proof of work. Attachments are uploaded and appear inline in the conversation.",
    "Mara mtoa huduma anapopangiwa, Eneo la Kazi linafunguliwa kwa pande zote mbili likiwa na kichupo cha Mazungumzo. Ujumbe unasasishwa papo hapo kwa pande zote. Unaweza kuambatanisha picha au video fupi kwenye ujumbe (gonga aikoni ya kuambatanisha kabla ya kutuma) — hii ni muhimu kwa kushiriki picha za maendeleo, picha za rejea, au uthibitisho wa kazi. Viambatanisho vinapakiwa na kuonekana ndani ya mazungumzo.",
  ],
  [
    "How does the job pipeline / progress tracking work?",
    "Hatua za kazi zinafuatiliwaje?",
    "Every job moves through clear stages shown as a pipeline in the Progress tab: Posted/Assigned, then the provider requests to start and the hirer confirms it (Started), then the provider works and submits the finished work (Submitted), and finally the hirer reviews and accepts it (Completed). If the hirer isn't satisfied, they can request a revision and the provider resubmits — this can repeat until the work is accepted. Every step is recorded in the Activity log so both sides can see exactly what happened and when.",
    "Kila kazi inapitia hatua wazi zinazoonyeshwa kama mstari wa hatua kwenye kichupo cha Maendeleo: Imechapishwa/Imepangiwa, kisha mtoa huduma anaomba kuanza na mwajiri anathibitisha (Imeanza), kisha mtoa huduma anafanya kazi na kuwasilisha kazi iliyokamilika (Imewasilishwa), na hatimaye mwajiri anapitia na kukubali (Imekamilika). Kama mwajiri hajaridhika, anaweza kuomba marekebisho na mtoa huduma anawasilisha tena — hii inaweza kurudiwa mpaka kazi ikubaliwe. Kila hatua inarekodiwa kwenye Historia ya Shughuli ili pande zote ziweze kuona kilichotokea na lini.",
  ],
  [
    "How do ratings work?",
    "Ratings zinafanyaje kazi?",
    "After a job is marked Completed, the hirer rates the provider from 1 to 5 stars and can leave a written comment. This rating is saved on the provider's profile and contributes to their overall reputation score, which other hirers see before assigning future jobs. Ratings can only be submitted once per completed job.",
    "Baada ya kazi kuwekwa Imekamilika, mwajiri anampa mtoa huduma kipimo cha nyota 1 hadi 5 na anaweza kuacha maoni ya maandishi. Kipimo hiki kinahifadhiwa kwenye profaili ya mtoa huduma na kinachangia sifa yake ya jumla, ambayo waajiri wengine wanaiona kabla ya kumpangia kazi nyingine. Kipimo kinaweza kuwasilishwa mara moja tu kwa kila kazi iliyokamilika.",
  ],
  [
    "How do recommendations work?",
    "Mapendekezo yanafanyaje kazi?",
    "After rating a provider 5 stars, the hirer can also write a public recommendation explaining why they'd recommend that provider to others, and choose whether to show their own identity alongside it. Recommendations appear on the provider's profile as social proof for future hirers. Submitting the recommendation decision closes that job's workspace.",
    "Baada ya kumpa mtoa huduma nyota 5, mwajiri pia anaweza kuandika pendekezo la hadhara linaloeleza kwa nini angependekeza mtoa huduma huyo kwa wengine, na kuchagua kama ataonyesha utambulisho wake. Mapendekezo yanaonekana kwenye profaili ya mtoa huduma kama uthibitisho wa kijamii kwa waajiri wa baadaye. Kuwasilisha uamuzi wa pendekezo kunafunga eneo la kazi la kazi hiyo.",
  ],
  [
    "How do notifications work?",
    "Notifications zinafanyaje kazi?",
    "e-kazi sends you push notifications for things that need your attention — new messages, job applications, status changes (like a start request or a completed job), and account activity. You can control which categories you receive, along with sound, vibration, and message previews, from Settings > Notification Settings. You'll also see an in-app banner for real-time events while the app is open.",
    "e-kazi inakutumia notifications kwa mambo yanayohitaji uangalifu wako — ujumbe mpya, maombi ya kazi, mabadiliko ya hali (kama ombi la kuanza au kazi iliyokamilika), na shughuli za akaunti. Unaweza kudhibiti ni aina zipi unazopokea, pamoja na sauti, mtetemo, na muhtasari wa ujumbe, kutoka Mipangilio > Mipangilio ya Notifications. Utaona pia banner ndani ya app kwa matukio ya papo hapo wakati app iko wazi.",
  ],
  [
    "How do I edit my account/profile settings?",
    "Ninabadilishaje mipangilio ya akaunti/profaili?",
    "Go to the Profile tab and tap \"Edit Profile\" to update your name, bio, profile photo, skills, and services. Account-wide preferences — privacy (who can see your contact details), notification settings, language, and light/dark theme — are all under the Settings tab. Changes save immediately and apply across the app.",
    "Nenda kwenye kichupo cha Profaili na ugonge \"Edit Profile\" kubadilisha jina lako, maelezo mafupi, picha ya profaili, ujuzi, na huduma. Mapendeleo ya akaunti kwa ujumla — faragha (nani anaweza kuona mawasiliano yako), mipangilio ya notifications, lugha, na muonekano wa nyeusi/nyepesi — vyote viko chini ya kichupo cha Mipangilio. Mabadiliko yanahifadhiwa mara moja na kutumika kwenye app nzima.",
  ],
  [
    "Why can't I see contacts?",
    "Kwa nini sioni mawasiliano?",
    "Contact details (phone number, email, social links) are only shared once a job is actively assigned between a hirer and provider — this protects both sides from being contacted outside the platform before a job is agreed. You can also control what's visible in Settings > Privacy, including whether your phone, email, or socials show up on jobs at all.",
    "Mawasiliano (namba ya simu, barua pepe, mitandao ya kijamii) yanashirikiwa tu pale kazi inapopangiwa rasmi kati ya mwajiri na mtoa huduma — hii inalinda pande zote zisiwasiliane nje ya jukwaa kabla kazi haijakubaliwa. Unaweza pia kudhibiti kinachoonekana kwenye Mipangilio > Faragha, ikiwemo kama simu, barua pepe, au mitandao yako inaonekana kwenye kazi.",
  ],
  [
    "How do I change language or theme?",
    "Ninabadilishaje lugha au theme?",
    "Open Settings — the Language row switches the whole app between English and Kiswahili instantly, and the Theme row switches between Light and Dark mode. Both preferences are saved on your device and stay set the next time you open the app.",
    "Fungua Mipangilio — safu ya Lugha inabadilisha app nzima kati ya Kiingereza na Kiswahili papo hapo, na safu ya Theme inabadilisha kati ya muonekano wa Nyepesi na Nyeusi. Mapendeleo yote mawili yanahifadhiwa kwenye kifaa chako na yanabaki hivyo utakapofungua app tena.",
  ],
];

export default function HelpCenter({ onBack }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [open, setOpen] = useState(null);

  return (
    <SettingsScreen titleEn="Help Center" titleSw="Kituo cha Msaada" onBack={onBack}>
      <View style={styles.panel}>
        {FAQS.map(([en, sw, answerEn, answerSw], index) => (
          <React.Fragment key={en}>
            {index ? <SettingDivider /> : null}
            <TouchableOpacity style={styles.question} onPress={() => setOpen(open === index ? null : index)}>
              <Txt en={en} sw={sw} style={styles.title} />
              <AppIcon name={open === index ? "minus" : "plus"} size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
            {open === index ? (
              <Txt
                en={answerEn}
                sw={answerSw}
                style={styles.answer}
              />
            ) : null}
          </React.Fragment>
        ))}
      </View>
    </SettingsScreen>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    panel: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, backgroundColor: theme.colors.surface },
    question: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    title: { flex: 1, color: theme.colors.text, fontSize: 13, fontWeight: "800" },
    answer: { color: theme.colors.textMuted, fontSize: 11.5, lineHeight: 17, paddingBottom: 11, paddingRight: 20 },
  });

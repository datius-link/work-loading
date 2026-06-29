import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import Txt from "../../../Txt";
import { useAppTheme } from "../../../theme";
import { getFriendlyApiError, viewerRequest } from "../../../api/api";
import { getUserSession, saveUserSession } from "../../../utils/userSession";
import { UploadManager } from "../../../utils/UploadManager";
import AppIcon from "../../../icons/AppIcon";
import { isNetworkError } from "../../../utils/network";
import { cachedGet } from "../../../utils/offlineCache";
import CachedDataNotice from "../../../components/CachedDataNotice";

const SOCIAL_PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: "instagram", placeholder: "@username" },
  { id: "tiktok", label: "TikTok", icon: "music", placeholder: "@username" },
  { id: "facebook", label: "Facebook", icon: "facebook", placeholder: "profile name" },
  { id: "twitter", label: "X / Twitter", icon: "twitter", placeholder: "@username" },
  { id: "youtube", label: "YouTube", icon: "youtube", placeholder: "channel" },
  { id: "linkedin", label: "LinkedIn", icon: "linkedin", placeholder: "profile name" },
];

function normalizeDialCode(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 4);
  return digits ? `+${digits}` : "";
}

function normalizeLocalPhone(value) {
  return String(value || "").replace(/\D/g, "").replace(/^0+/, "").slice(0, 15);
}

function toE164(dialCode, localPhone) {
  const code = normalizeDialCode(dialCode);
  const local = normalizeLocalPhone(localPhone);
  if (!local) return "";
  if (!code) return "";
  const combined = `${code}${local}`;
  return /^\+[1-9]\d{6,14}$/.test(combined) ? combined : "";
}

function splitPhone(value) {
  const raw = String(value || "").trim();
  if (!raw.startsWith("+")) return { dialCode: "+255", localPhone: normalizeLocalPhone(raw) };
  const digits = raw.replace(/\D/g, "");
  if (!digits) return { dialCode: "+255", localPhone: "" };
  const known = ["255", "254", "256", "250", "257", "1", "44", "91", "27"];
  const code = known.find((item) => digits.startsWith(item)) || digits.slice(0, Math.min(3, digits.length - 6));
  return { dialCode: `+${code || "255"}`, localPhone: digits.slice(String(code || "255").length) };
}

function normalizeList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function normalizeProfilePhotos(profile) {
  const photos = normalizeList(profile?.profile_photos || profile?.profilePhotos || profile?.profile_pictures || profile?.profilePictures);
  const primary = profile?.profile_pic || profile?.profilePic;
  return [primary, ...photos].filter(Boolean).filter((item, index, arr) => arr.indexOf(item) === index).slice(0, 2);
}

function parseSocials(value) {
  const result = Object.fromEntries(SOCIAL_PLATFORMS.map((item) => [item.id, ""]));
  if (!Array.isArray(value)) return result;
  value.forEach((item) => {
    if (typeof item === "string") {
      const [platform, ...rest] = item.split(":");
      const id = String(platform || "").trim().toLowerCase();
      if (result[id] !== undefined) result[id] = rest.join(":").trim();
      return;
    }
    const id = String(item?.platform || item?.id || "").trim().toLowerCase();
    const handle = String(item?.handle || item?.url || item?.value || "").trim();
    if (result[id] !== undefined) result[id] = handle;
  });
  return result;
}

function socialsToArray(value) {
  return SOCIAL_PLATFORMS
    .map((platform) => {
      const handle = String(value[platform.id] || "").trim();
      return handle ? `${platform.id}:${handle}` : null;
    })
    .filter(Boolean);
}

export default function EditProfile() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profilePic, setProfilePic] = useState("");
  const [profilePhotos, setProfilePhotos] = useState([""]);
  const [tempImages, setTempImages] = useState({});
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [dialCode, setDialCode] = useState("+255");
  const [localPhone, setLocalPhone] = useState("");
  const [originalPhone, setOriginalPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [skills, setSkills] = useState([]);
  const [skillDraft, setSkillDraft] = useState("");
  const [socials, setSocials] = useState(() => parseSocials([]));
  const [notice, setNotice] = useState(null);
  const [showingCached, setShowingCached] = useState(false);

  const e164Phone = toE164(dialCode, localPhone);
  const phoneChanged = e164Phone !== originalPhone;

  const applyProfile = useCallback((profile) => {
    const phone = profile?.phone_number || profile?.phone_numbers?.[0]?.number || profile?.phone_numbers?.[0] || "";
    const split = splitPhone(phone);
    setUsername(profile?.username || "");
    setFullName(profile?.full_name || "");
    setBio(profile?.bio || "");
    const photos = normalizeProfilePhotos(profile);
    setProfilePic(photos[0] || "");
    setProfilePhotos([photos[0] || ""]);
    setTempImages({});
    setDialCode(split.dialCode);
    setLocalPhone(split.localPhone);
    setOriginalPhone(phone || "");
    setPhoneVerified(!!phone);
    setSkills(normalizeList(profile?.services).slice(0, 8));
    setSocials(parseSocials(profile?.socials));
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      if (route.params?.profile) {
        applyProfile(route.params.profile);
        return;
      }
      const result = await cachedGet("profile:me", () => viewerRequest("get", "/profiles/me").then((res) => res.data));
      applyProfile(result?.data?.profile || {});
      setShowingCached(result.fromCache);
    } catch (_err) {
      const session = await getUserSession();
      applyProfile(session?.profile || session?.user || {});
    } finally {
      setLoading(false);
    }
  }, [applyProfile, route.params?.profile]);

  useFocusEffect(useCallback(() => {
    loadProfile();
  }, [loadProfile]));

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      const asset = result.assets[0];
      setTempImages({ 0: asset });
      setProfilePhotos([asset.uri]);
      setProfilePic(asset.uri);
    }
  };

  const addSkill = () => {
    const value = skillDraft.trim();
    if (!value || skills.some((item) => item.toLowerCase() === value.toLowerCase())) return;
    setSkills((prev) => [...prev, value].slice(0, 8));
    setSkillDraft("");
  };

  const requestPhoneOtp = async () => {
    if (!localPhone) {
      setNotice({ type: "error", en: "Enter a phone number first.", sw: "Weka namba ya simu kwanza." });
      return;
    }
    if (!e164Phone) {
      setNotice({ type: "error", en: "Use a valid country code and phone number.", sw: "Tumia code ya nchi na namba sahihi." });
      return;
    }
    try {
      await viewerRequest("post", "/profiles/me/phone/request-otp", { phone_number: e164Phone });
      setOtpCode("");
      setNotice({ type: "otp", en: `Enter the OTP sent to ${e164Phone}.`, sw: `Weka OTP iliyotumwa ${e164Phone}.` });
    } catch (err) {
      setNotice({ type: "error", en: getFriendlyApiError(err, "en"), sw: getFriendlyApiError(err, "sw") });
    }
  };

  const verifyPhoneOtp = async () => {
    try {
      await viewerRequest("post", "/profiles/me/phone/verify-otp", {
        phone_number: e164Phone,
        code: otpCode.trim(),
      });
      setPhoneVerified(true);
      setOriginalPhone(e164Phone);
      setNotice({ type: "success", en: "Phone number verified.", sw: "Namba ya simu imethibitishwa." });
    } catch (err) {
      setNotice({ type: "error", en: getFriendlyApiError(err, "en"), sw: getFriendlyApiError(err, "sw") });
    }
  };

  const saveProfile = async () => {
    if (saving) return;
    if (!username.trim()) {
      setNotice({ type: "error", en: "Username is required.", sw: "Jina la mtumiaji linahitajika." });
      return;
    }
    if (localPhone && !e164Phone) {
      setNotice({ type: "error", en: "Phone must be saved in valid international format.", sw: "Namba ihifadhiwe kwa mfumo sahihi wa kimataifa." });
      return;
    }
    if (e164Phone && phoneChanged && !phoneVerified) {
      setNotice({ type: "error", en: "Verify the new phone number before saving.", sw: "Thibitisha namba mpya kabla ya kuhifadhi." });
      return;
    }

    setSaving(true);
    try {
      let finalPhotos = [...profilePhotos].slice(0, 1);
      const uploadEntries = Object.entries(tempImages).filter(([, image]) => image?.uri);
      if (uploadEntries.length) {
        const uploaded = await UploadManager.startUpload(uploadEntries.map(([, image]) => ({ ...image, type: "image" })), "profiles");
        uploadEntries.forEach(([slot], index) => {
          finalPhotos[Number(slot)] = uploaded?.[index]?.url || finalPhotos[Number(slot)];
        });
      }
      finalPhotos = finalPhotos.map((item) => String(item || "").trim()).filter(Boolean).filter((item, index, arr) => arr.indexOf(item) === index).slice(0, 1);
      const finalProfilePic = finalPhotos[0] || "";
      const cleanUsername = username.trim().replace(/^@/, "").toLowerCase();
      const cleanSocials = socialsToArray(socials);
      const cleanSkills = normalizeList(skills);
      const payload = {
        username: cleanUsername,
        full_name: fullName.trim(),
        bio: bio.trim(),
        phone_number: e164Phone || "",
        phone_numbers: e164Phone ? [e164Phone] : [],
        services: cleanSkills,
        socials: cleanSocials,
        profile_pic: finalProfilePic || "",
        profile_photos: finalPhotos,
      };
      const res = await viewerRequest("put", "/profiles/me", payload);
      const session = await getUserSession();
      const updated = {
        ...(session?.profile || session?.user || {}),
        ...(res?.data?.profile || {}),
        ...payload,
        phone_number: e164Phone || null,
      };
      await saveUserSession({ token: session?.token, viewer: updated, email: updated.email });
      setNotice({
        type: "success",
        en: "Profile updated successfully.",
        sw: "Profaili imesasishwa.",
        onClose: () => navigation.goBack(),
      });
    } catch (err) {
      const mediaNetworkFailure=Object.values(tempImages).some((image) => image?.uri)&&isNetworkError(err);
      setNotice({
        type: "error",
        en: mediaNetworkFailure?"Media upload failed because of connection problem. Try again.":getFriendlyApiError(err,"en"),
        sw: mediaNetworkFailure?"Media haijapakiwa kwa sababu ya tatizo la mtandao. Jaribu tena.":getFriendlyApiError(err,"sw"),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <ActivityIndicator color={theme.colors.primary} />
        <Txt en="Loading profile..." sw="Inapakia profaili..." style={styles.loadingText} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: insets.top }]} edges={["top"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <AppIcon name="arrowLeft" size={19} color={theme.colors.text} />
          </TouchableOpacity>
          <Txt en="Edit Profile" sw="Hariri Profaili" style={styles.headerTitle} />
          <TouchableOpacity style={[styles.saveBtn, saving && styles.disabled]} onPress={saveProfile} disabled={saving}>
            {saving ? <ActivityIndicator color={theme.colors.onPrimary} /> : <Txt en="Save" sw="Hifadhi" style={styles.saveText} />}
          </TouchableOpacity>
        </View>
        <CachedDataNotice visible={showingCached} />

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.identity}>
            <TouchableOpacity onPress={pickImage} style={styles.photoHero} activeOpacity={0.9}>
              {profilePic ? <Image source={{ uri: profilePic }} style={styles.photoBackdrop} blurRadius={18} /> : null}
              <View style={styles.photoShade} />
              <Image source={{ uri: profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(username || "U")}&background=0B6B63&color=fff` }} style={styles.avatar} />
              <View style={styles.cameraBadge}>
                <AppIcon name="camera" size={15} color="#fff" />
              </View>
            </TouchableOpacity>
            <Txt en="Profile photo" sw="Picha ya profaili" style={styles.photoTitle} />
            <Txt en="This single photo also styles your profile header background." sw="Picha hii moja pia inapamba background ya header yako." style={styles.photoHint} />
            <View style={styles.identityFields}>
              <TextInput value={username} onChangeText={(text) => setUsername(text.replace(/\s/g, "").toLowerCase())} placeholder="username" placeholderTextColor={theme.colors.textMuted} autoCapitalize="none" style={styles.input} />
              <TextInput value={fullName} onChangeText={setFullName} placeholder="Full name" placeholderTextColor={theme.colors.textMuted} style={styles.input} />
            </View>
          </View>

          <SectionTitle icon="edit" en="About" sw="Kuhusu" styles={styles} theme={theme} />
          <TextInput
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={220}
            placeholder="Write a short bio"
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.input, styles.bioInput]}
          />
          <Text style={styles.counter}>{bio.length}/220</Text>

          <SectionTitle icon="phone" en="Phone" sw="Simu" styles={styles} theme={theme} />
          <View style={styles.phoneRow}>
            <TextInput value={dialCode} onChangeText={(text) => { setDialCode(normalizeDialCode(text)); setPhoneVerified(false); }} placeholder="+255" placeholderTextColor={theme.colors.textMuted} keyboardType="phone-pad" style={[styles.input, styles.codeInput]} />
            <TextInput value={localPhone} onChangeText={(text) => { setLocalPhone(normalizeLocalPhone(text)); setPhoneVerified(false); }} placeholder="Phone number" placeholderTextColor={theme.colors.textMuted} keyboardType="phone-pad" style={[styles.input, styles.phoneInput]} />
          </View>
          <View style={styles.phoneMetaRow}>
            <Text style={styles.e164Text}>{e164Phone || "E.164 preview appears here"}</Text>
            {phoneVerified && e164Phone ? (
              <View style={styles.verifiedPill}>
                <AppIcon name="check-circle" size={13} color={theme.colors.success || "#15803d"} />
                <Txt en="Verified" sw="Imethibitishwa" style={styles.verifiedText} />
              </View>
            ) : null}
          </View>
          <TouchableOpacity style={styles.outlineBtn} onPress={requestPhoneOtp}>
            <AppIcon name="message" size={16} color={theme.colors.primary} />
            <Txt en="Verify phone" sw="Thibitisha simu" style={styles.outlineBtnText} />
          </TouchableOpacity>

          <SectionTitle icon="briefcase" en="Services" sw="Huduma" styles={styles} theme={theme} />
          <View style={styles.skillInputRow}>
            <TextInput value={skillDraft} onChangeText={setSkillDraft} placeholder="Add service, e.g. Plumbing" placeholderTextColor={theme.colors.textMuted} style={[styles.input, styles.skillInput]} onSubmitEditing={addSkill} />
            <TouchableOpacity style={styles.addBtn} onPress={addSkill}>
              <AppIcon name="plus" size={18} color={theme.colors.onPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.chipWrap}>
            {skills.map((skill) => (
              <TouchableOpacity key={skill} style={styles.chip} onPress={() => setSkills((prev) => prev.filter((item) => item !== skill))}>
                <Text style={styles.chipText}>{skill}</Text>
                <AppIcon name="close" size={13} color={theme.colors.primary} />
              </TouchableOpacity>
            ))}
          </View>

          <SectionTitle icon="globe" en="Social media" sw="Mitandao" styles={styles} theme={theme} />
          {SOCIAL_PLATFORMS.map((platform) => (
            <View key={platform.id} style={styles.socialRow}>
              <AppIcon name={platform.icon} size={18} color={theme.colors.primary} />
              <Text style={styles.socialLabel}>{platform.label}</Text>
              <TextInput
                value={socials[platform.id] || ""}
                onChangeText={(text) => setSocials((prev) => ({ ...prev, [platform.id]: text }))}
                placeholder={platform.placeholder}
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
                style={styles.socialInput}
              />
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>

      <NoticeModal notice={notice} setNotice={setNotice} otpCode={otpCode} setOtpCode={setOtpCode} verifyPhoneOtp={verifyPhoneOtp} styles={styles} theme={theme} />
    </SafeAreaView>
  );
}

function FieldIcon({ icon, theme }) {
  return (
    <View style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
      <AppIcon name={icon} size={18} color={theme.colors.primary} />
    </View>
  );
}

function SectionTitle({ icon, en, sw, styles, theme }) {
  return (
    <View style={styles.sectionTitleRow}>
      <AppIcon name={icon} size={17} color={theme.colors.primary} />
      <Txt en={en} sw={sw} style={styles.sectionTitle} />
    </View>
  );
}

function NoticeModal({ notice, setNotice, otpCode, setOtpCode, verifyPhoneOtp, styles, theme }) {
  if (!notice) return null;
  const close = () => {
    const onClose = notice.onClose;
    setNotice(null);
    onClose?.();
  };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.modalOverlay} onPress={close}>
        <Pressable style={styles.noticeSheet}>
          <View style={styles.noticeIcon}>
            <AppIcon name={notice.type === "error" ? "warning" : notice.type === "otp" ? "shield" : "check-circle"} size={24} color={theme.colors.primary} />
          </View>
          <Txt en={notice.type === "otp" ? "Phone Verification" : notice.type === "error" ? "Check details" : "Saved"} sw={notice.type === "otp" ? "Uthibitisho wa Simu" : notice.type === "error" ? "Kagua taarifa" : "Imehifadhiwa"} style={styles.noticeTitle} />
          <Txt en={notice.en} sw={notice.sw} style={styles.noticeBody} />
          {notice.type === "otp" ? (
            <TextInput
              value={otpCode}
              onChangeText={(text) => setOtpCode(text.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              style={styles.otpInput}
            />
          ) : null}
          <TouchableOpacity style={styles.noticeBtn} onPress={notice.type === "otp" ? verifyPhoneOtp : close}>
            <Txt en={notice.type === "otp" ? "Verify" : "OK"} sw={notice.type === "otp" ? "Thibitisha" : "Sawa"} style={styles.noticeBtnText} />
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (theme) => StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg },
  loadingText: { color: theme.colors.textMuted, marginTop: 10, fontWeight: "800" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, color: theme.colors.text, fontSize: 18, fontWeight: "900" },
  saveBtn: { minWidth: 78, minHeight: 40, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primary },
  saveText: { color: theme.colors.onPrimary, fontWeight: "900", fontSize: 14 },
  disabled: { opacity: 0.55 },
  content: { padding: 16, paddingBottom: 34 },
  identity: { gap: 10, marginBottom: 18 },
  photoHero: { height: 168, borderRadius: 10, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surfaceSoft, borderWidth: 1, borderColor: theme.colors.border },
  photoBackdrop: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%", opacity: 0.55 },
  photoShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.18)" },
  avatar: { width: 104, height: 104, borderRadius: 52, backgroundColor: theme.colors.surfaceSoft, borderWidth: 4, borderColor: theme.colors.bg },
  cameraBadge: { position: "absolute", right: 16, bottom: 16, width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primary, borderWidth: 2, borderColor: theme.colors.bg },
  photoTitle: { color: theme.colors.text, fontSize: 15, fontWeight: "900", textAlign: "center", marginTop: 2 },
  photoHint: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17, textAlign: "center", marginBottom: 8 },
  identityFields: { gap: 10 },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    fontSize: 15,
  },
  bioInput: { minHeight: 92, paddingTop: 12, textAlignVertical: "top" },
  counter: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "700", textAlign: "right", marginTop: 6, marginBottom: 8 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, marginBottom: 9 },
  sectionTitle: { color: theme.colors.text, fontSize: 15, fontWeight: "900" },
  phoneRow: { flexDirection: "row", gap: 8 },
  codeInput: { width: 88, textAlign: "center", fontWeight: "900" },
  phoneInput: { flex: 1 },
  phoneMetaRow: { minHeight: 32, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 8 },
  e164Text: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "800" },
  verifiedPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, backgroundColor: theme.colors.successSoft || "#dcfce7" },
  verifiedText: { color: theme.colors.success || "#15803d", fontSize: 12, fontWeight: "900" },
  outlineBtn: { minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8, backgroundColor: theme.colors.surface },
  outlineBtnText: { color: theme.colors.primary, fontSize: 14, fontWeight: "900" },
  skillInputRow: { flexDirection: "row", gap: 8 },
  skillInput: { flex: 1 },
  addBtn: { width: 46, height: 46, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primary },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, paddingHorizontal: 10, minHeight: 34, backgroundColor: theme.colors.primarySoft },
  chipText: { color: theme.colors.primary, fontSize: 13, fontWeight: "900" },
  socialRow: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  socialLabel: { width: 86, color: theme.colors.text, fontSize: 13, fontWeight: "900" },
  socialInput: { flex: 1, color: theme.colors.text, fontSize: 14, minHeight: 46 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", alignItems: "center", justifyContent: "center", padding: 20 },
  noticeSheet: { width: "100%", maxWidth: 360, borderRadius: 8, padding: 18, alignItems: "center", backgroundColor: theme.colors.surface },
  noticeIcon: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft, marginBottom: 12 },
  noticeTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "900", textAlign: "center" },
  noticeBody: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 8 },
  otpInput: { width: "100%", minHeight: 52, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, color: theme.colors.text, textAlign: "center", fontSize: 20, fontWeight: "900", marginTop: 14, letterSpacing: 3 },
  noticeBtn: { minWidth: 128, minHeight: 44, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primary, marginTop: 16 },
  noticeBtnText: { color: theme.colors.onPrimary, fontSize: 14, fontWeight: "900" },
});






import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useAppTheme } from "../../../theme";
import { useLanguage } from "../../../LanguageContext";
import { viewerRequest } from "../../../api/api";
import { getLightUserSession, saveLightUserSession } from "../../../utils/lightUserSession";
import { UploadManager } from "../../../utils/UploadManager";
import AppIcon from "../../../icons/AppIcon";

const T = {
  en: {
    title: "Edit Profile",
    subtitle: "Keep your light user profile reachable",
    save: "Save",
    loading: "Loading profile...",
    saved: "Saved",
    savedBody: "Profile updated.",
    failed: "Could not save",
    username: "Username",
    fullName: "Full name",
    email: "Email",
    phone: "Phone number",
    bio: "Bio",
    photoHint: "Tap photo to change it",
    usernameRequired: "Username is required.",
    phoneLength: "Phone number must be exactly 9 digits.",
  },
  sw: {
    title: "Hariri Profaili",
    subtitle: "Weka profaili yako ya light user iwe rahisi kufikiwa",
    save: "Hifadhi",
    loading: "Inapakia profaili...",
    saved: "Imehifadhiwa",
    savedBody: "Profaili imesasishwa.",
    failed: "Imeshindikana kuhifadhi",
    username: "Username",
    fullName: "Jina kamili",
    email: "Email",
    phone: "Namba ya simu",
    bio: "Maelezo",
    photoHint: "Gusa picha kuibadilisha",
    usernameRequired: "Username inahitajika.",
    phoneLength: "Namba ya simu iwe tarakimu 9.",
  },
};

function avatarFor(profile) {
  if (profile?.profile_pic) return profile.profile_pic;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.username || profile?.email || "U")}&background=0B6B63&color=fff`;
}

function stripTzPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("255")) return digits.slice(3, 12);
  if (digits.startsWith("0")) return digits.slice(1, 10);
  return digits.slice(0, 9);
}

export default function EditLightUserProfile() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const t = T[language] || T.en;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [profilePic, setProfilePic] = useState("");
  const [tempImage, setTempImage] = useState(null);

  const applyProfile = useCallback((profile) => {
    setUsername(profile?.username || "");
    setFullName(profile?.full_name || "");
    setEmail(profile?.email || "");
    setPhone(stripTzPhone(profile?.phone_number));
    setBio(profile?.bio || "");
    setProfilePic(profile?.profile_pic || "");
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const passed = route.params?.profile;
      if (passed) {
        applyProfile(passed);
        return;
      }
      const session = await getLightUserSession();
      applyProfile(session.profile || session.user || {});
    } finally {
      setLoading(false);
    }
  }, [applyProfile, route.params?.profile]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

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
      setTempImage(result.assets[0]);
      setProfilePic(result.assets[0].uri);
    }
  };

  const saveProfile = async () => {
    if (saving) return;
    if (!username.trim()) {
      Alert.alert(t.failed, t.usernameRequired);
      return;
    }
    if (phone && !/^\d{9}$/.test(phone)) {
      Alert.alert(t.failed, t.phoneLength);
      return;
    }

    setSaving(true);
    try {
      let finalProfilePic = profilePic;
      if (tempImage?.uri) {
        const uploaded = await UploadManager.startUpload([{ ...tempImage, type: "image" }], "profiles");
        finalProfilePic = uploaded?.[0]?.url || finalProfilePic;
      }

      await viewerRequest("put", "/profiles/me", {
        username: username.trim().toLowerCase(),
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone_numbers: phone ? [`+255${phone}`] : [],
        bio: bio.trim(),
        profile_pic: finalProfilePic || "",
      });

      const session = await getLightUserSession();
      const updatedViewer = {
        ...(session.profile || session.user || {}),
        username: username.trim().toLowerCase(),
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone_number: phone ? `+255${phone}` : null,
        bio: bio.trim(),
        profile_pic: finalProfilePic || "",
      };
      await saveLightUserSession({
        token: session.token,
        viewer: updatedViewer,
        email: updatedViewer.email,
      });

      Alert.alert(t.saved, t.savedBody, [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert(t.failed, err?.response?.data?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <Text style={styles.loadingText}>{t.loading}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
            <AppIcon name="arrowLeft" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>{t.title}</Text>
            <Text style={styles.headerSub}>{t.subtitle}</Text>
          </View>
          <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={saveProfile} disabled={saving}>
            {saving ? <ActivityIndicator color={theme.colors.onPrimary} /> : <Text style={styles.saveText}>{t.save}</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <TouchableOpacity onPress={pickImage} activeOpacity={0.86}>
              <View style={styles.avatarWrap}>
                <Image source={{ uri: profilePic || avatarFor({ username, email }) }} style={styles.avatar} />
                <View style={styles.cameraBadge}>
                  <AppIcon name="camera" size={16} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>
            <Text style={styles.photoHint}>{t.photoHint}</Text>
          </View>

          <View style={styles.section}>
            <Field label={t.username} value={username} onChangeText={(text) => setUsername(text.replace(/\s/g, "").toLowerCase())} styles={styles} autoCapitalize="none" />
            <Field label={t.fullName} value={fullName} onChangeText={setFullName} styles={styles} />
            <Field label={t.email} value={email} onChangeText={setEmail} styles={styles} keyboardType="email-address" autoCapitalize="none" />
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>{t.phone}</Text>
              <View style={styles.phoneLine}>
                <Text style={styles.prefix}>+255</Text>
                <TextInput
                  value={phone}
                  onChangeText={(text) => setPhone(text.replace(/\D/g, "").slice(0, 9))}
                  keyboardType="phone-pad"
                  placeholder="712345678"
                  placeholderTextColor={theme.colors.textMuted}
                  style={styles.phoneInput}
                />
              </View>
            </View>
            <Field label={t.bio} value={bio} onChangeText={setBio} styles={styles} multiline maxLength={500} />
            <Text style={styles.counter}>{bio.length}/500</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, styles, multiline, ...props }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        placeholderTextColor={styles.placeholder.color}
        style={[styles.input, multiline && styles.textArea]}
      />
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    flex: { flex: 1 },
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg },
    loadingText: { color: theme.colors.textMuted, fontWeight: "700", marginTop: 12 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    headerCopy: { flex: 1 },
    headerTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "900" },
    headerSub: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "700", marginTop: 2 },
    saveBtn: {
      minWidth: 70,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 14,
    },
    saveBtnDisabled: { opacity: 0.55 },
    saveText: { color: theme.colors.onPrimary, fontWeight: "900" },
    content: { paddingBottom: theme.spacing.xxl },
    hero: {
      backgroundColor: theme.colors.surface,
      alignItems: "center",
      paddingVertical: 24,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    avatarWrap: { position: "relative" },
    avatar: {
      width: 104,
      height: 104,
      borderRadius: 52,
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: 3,
      borderColor: theme.colors.primarySoft,
    },
    cameraBadge: {
      position: "absolute",
      right: 2,
      bottom: 2,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary,
      borderWidth: 2,
      borderColor: theme.colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    photoHint: { marginTop: 10, color: theme.colors.textMuted, fontSize: 12, fontWeight: "700" },
    section: {
      backgroundColor: theme.colors.surface,
      marginTop: 10,
      paddingHorizontal: 18,
      paddingVertical: 16,
    },
    fieldWrap: { marginBottom: 14 },
    label: {
      marginBottom: 7,
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    input: {
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceSoft,
      paddingHorizontal: 14,
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: "700",
    },
    textArea: { minHeight: 112, paddingTop: 12, lineHeight: 20 },
    placeholder: { color: theme.colors.textMuted },
    phoneLine: { flexDirection: "row", alignItems: "center", gap: 10 },
    prefix: { color: theme.colors.text, fontSize: 15, fontWeight: "900" },
    phoneInput: {
      flex: 1,
      minHeight: 44,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: "800",
    },
    counter: { color: theme.colors.textMuted, textAlign: "right", fontSize: 12, fontWeight: "700" },
  });

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Haptics from "expo-haptics";

import { api } from "../../api/api";
import { UploadManager } from "../../utils/UploadManager";
import { SOCIAL_ICONS } from "../../icons/socialIcons";
import { useAppTheme } from "../../theme";
import AppIcon from "../../icons/AppIcon";

const SOCIAL_LIMIT = 3;
const CONTACT_LIMIT = 2;

function makeId(prefix = "local") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeProfile(profile) {
  const contacts = (Array.isArray(profile?.contacts) ? profile.contacts : [])
    .map((contact) => ({
      id: makeId("contact"),
      number: String(contact?.number || ""),
      allowCall: !!contact?.call,
      allowSMS: !!contact?.sms,
    }))
    .filter((contact) => contact.number);

  const services = (Array.isArray(profile?.services) ? profile.services : [])
    .map((service) => String(service || "").trim())
    .filter(Boolean)
    .map((service) => ({ id: makeId("service"), value: service }));

  const socials = (Array.isArray(profile?.socials) ? profile.socials : [])
    .map((social) => ({
      id: makeId("social"),
      platform: String(social?.platform || ""),
      handle: String(social?.handle || "").replace(/^@/, ""),
    }))
    .filter((social) => social.platform && SOCIAL_ICONS[social.platform]);

  return {
    full_name: profile?.full_name || "",
    username: profile?.username || "",
    field: profile?.field || "",
    location: profile?.location || "",
    bio: profile?.bio || "",
    profilePic: profile?.profilePic || profile?.profile_pic || "",
    contacts,
    services,
    socials,
  };
}

export default function EditProvider({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgressPct, setUploadProgressPct] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [field, setField] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [profilePicUrl, setProfilePicUrl] = useState("");
  const [tempProfilePicUri, setTempProfilePicUri] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [services, setServices] = useState([]);
  const [socials, setSocials] = useState([]);

  const markChanged = useCallback(() => setHasChanges(true), []);

  const applyProfile = useCallback((profile) => {
    setFullName(profile.full_name);
    setUsername(profile.username);
    setField(profile.field);
    setLocation(profile.location);
    setBio(profile.bio);
    setProfilePicUrl(profile.profilePic);
    setTempProfilePicUri(null);
    setContacts(profile.contacts);
    setServices(profile.services);
    setSocials(profile.socials);
    setHasChanges(false);
  }, []);

  const handleGoBack = useCallback(() => {
    if (!hasChanges) {
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate("MyProfile");
      return;
    }

    Alert.alert("Discard changes?", "You have unsaved profile edits.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: () => {
          if (navigation.canGoBack()) navigation.goBack();
          else navigation.navigate("MyProfile");
        },
      },
    ]);
  }, [hasChanges, navigation]);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/service-provider/me");
      applyProfile(normalizeProfile(res?.data?.provider || {}));
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }).start();
    } catch (err) {
      Alert.alert("Profile", err.response?.data?.message || "Failed to load profile.");
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate("MyProfile");
    } finally {
      setLoading(false);
    }
  }, [applyProfile, fadeAnim, navigation]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        handleGoBack();
        return true;
      });
      return () => sub.remove();
    }, [handleGoBack])
  );

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Allow photo access to change your profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]) return;

    try {
      setUploadingImage(true);
      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 768 } }],
        { compress: 0.76, format: ImageManipulator.SaveFormat.JPEG }
      );
      setTempProfilePicUri(manipulated.uri);
      setProfilePicUrl(manipulated.uri);
      markChanged();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      setTempProfilePicUri(result.assets[0].uri);
      setProfilePicUrl(result.assets[0].uri);
      markChanged();
    } finally {
      setUploadingImage(false);
    }
  };

  const uploadProfilePicture = async () => {
    if (!tempProfilePicUri) return profilePicUrl;

    setUploadingImage(true);
    setUploadProgressPct(0);

    try {
      const uploadedUrl = await new Promise((resolve, reject) => {
        UploadManager.callbacks.onComplete = (media) => {
          media?.[0]?.url ? resolve(media[0].url) : reject(new Error("No URL returned"));
        };
        UploadManager.callbacks.onProgress = (progress) => {
          if (typeof progress?.percentage === "number") {
            setUploadProgressPct(Math.round(progress.percentage));
          }
        };
        UploadManager.callbacks.onError = reject;
        UploadManager.startUpload([{ uri: tempProfilePicUri, type: "image" }]);
      });
      setTempProfilePicUri(null);
      setProfilePicUrl(uploadedUrl);
      return uploadedUrl;
    } finally {
      setUploadingImage(false);
      setUploadProgressPct(null);
      UploadManager.reset?.();
    }
  };

  const validate = () => {
    if (!fullName.trim()) return "Full name is required.";
    if (!username.trim()) return "Username is required.";
    if (username.trim().length < 3) return "Username must be at least 3 characters.";

    const activeContacts = contacts.filter((contact) => contact.number.trim());
    if (activeContacts.length > CONTACT_LIMIT) return "Maximum 2 contact numbers allowed.";
    for (const contact of activeContacts) {
      if (!/^\d{9}$/.test(contact.number)) return "Phone number must be exactly 9 digits.";
      if (!contact.allowCall && !contact.allowSMS) {
        return "Each contact must allow at least Call or SMS.";
      }
    }
    if (socials.filter((social) => social.handle.trim()).length > SOCIAL_LIMIT) {
      return "Maximum 3 social media accounts.";
    }
    return "";
  };

  const handleSave = async () => {
    if (saving) return;
    const validationMessage = validate();
    if (validationMessage) {
      Alert.alert("Check profile", validationMessage);
      return;
    }

    try {
      setSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const finalProfilePic = await uploadProfilePicture();
      const storedContacts = contacts
        .filter((contact) => contact.number.trim())
        .map((contact) => ({
          number: contact.number.trim(),
          call: !!contact.allowCall,
          sms: !!contact.allowSMS,
        }));
      const storedServices = services
        .map((service) => String(service.value || "").trim())
        .filter(Boolean);
      const storedSocials = socials
        .filter((social) => social.handle.trim())
        .map((social) => ({
          platform: social.platform,
          handle: social.handle.trim().replace(/^@/, ""),
        }));

      await api.put("/service-provider/update", {
        fullName: fullName.trim(),
        username: username.trim(),
        field: field.trim(),
        location: location.trim(),
        bio: bio.trim(),
        contacts: storedContacts,
        services: storedServices,
        socials: storedSocials,
        profilePic: finalProfilePic || "",
      });

      setHasChanges(false);
      Alert.alert("Saved", "Profile updated.", [
        {
          text: "OK",
          onPress: () => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate("MyProfile");
          },
        },
      ]);
    } catch (err) {
      Alert.alert("Could not save", err.response?.data?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const addContact = () => {
    if (contacts.length >= CONTACT_LIMIT) {
      Alert.alert("Limit", "Maximum 2 numbers.");
      return;
    }
    setContacts((prev) => [
      ...prev,
      { id: makeId("contact"), number: "", allowCall: true, allowSMS: true },
    ]);
    markChanged();
  };

  const updateContact = (index, patch) => {
    setContacts((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    markChanged();
  };

  const removeContact = (index) => {
    setContacts((prev) => prev.filter((_, i) => i !== index));
    markChanged();
  };

  const addService = () => {
    setServices((prev) => [...prev, { id: makeId("service"), value: "" }]);
    markChanged();
  };

  const updateService = (index, value) => {
    setServices((prev) => prev.map((item, i) => (i === index ? { ...item, value } : item)));
    markChanged();
  };

  const removeService = (index) => {
    setServices((prev) => prev.filter((_, i) => i !== index));
    markChanged();
  };

  const addSocial = (platform) => {
    if (socials.some((social) => social.platform === platform)) return;
    if (socials.length >= SOCIAL_LIMIT) {
      Alert.alert("Limit", "Maximum 3 social accounts.");
      return;
    }
    setSocials((prev) => [...prev, { id: makeId("social"), platform, handle: "" }]);
    markChanged();
  };

  const updateSocial = (index, handle) => {
    setSocials((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, handle: handle.replace(/^@/, "") } : item
      )
    );
    markChanged();
  };

  const removeSocial = (index) => {
    setSocials((prev) => prev.filter((_, i) => i !== index));
    markChanged();
  };

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={handleGoBack} style={styles.headerIcon}>
              <AppIcon name="arrowLeft" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>Edit Profile</Text>
              <Text style={styles.headerSub}>Keep your public profile sharp</Text>
            </View>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!hasChanges || saving}
              style={[styles.saveBtn, (!hasChanges || saving) && styles.saveBtnDisabled]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 48 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={{ opacity: fadeAnim }}>
              <View style={styles.hero}>
                <TouchableOpacity onPress={pickImage} activeOpacity={0.85}>
                  <View style={styles.avatarWrap}>
                    {profilePicUrl ? (
                      <Image source={{ uri: profilePicUrl }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <AppIcon name="user" size={44} color={theme.colors.textMuted} />
                      </View>
                    )}
                    {uploadingImage && (
                      <View style={styles.uploadOverlay}>
                        <ActivityIndicator size="small" color="#fff" />
                        {typeof uploadProgressPct === "number" && (
                          <Text style={styles.uploadText}>{uploadProgressPct}%</Text>
                        )}
                      </View>
                    )}
                    <View style={styles.cameraBadge}>
                      <AppIcon name="camera" size={16} color="#fff" />
                    </View>
                  </View>
                </TouchableOpacity>
                <Text style={styles.avatarHint}>Tap photo to change it</Text>
              </View>

              <Section title="Identity" styles={styles}>
                <Field
                  label="Full name"
                  value={fullName}
                  onChangeText={(text) => {
                    setFullName(text);
                    markChanged();
                  }}
                  placeholder="Your full name"
                  styles={styles}
                />
                <Field
                  label="Username"
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text.replace(/\s/g, "").toLowerCase());
                    markChanged();
                  }}
                  placeholder="username"
                  autoCapitalize="none"
                  styles={styles}
                />
                <Field
                  label="Field"
                  value={field}
                  onChangeText={(text) => {
                    setField(text);
                    markChanged();
                  }}
                  placeholder="e.g. Plumber, Developer"
                  styles={styles}
                />
                <Field
                  label="Location"
                  value={location}
                  onChangeText={(text) => {
                    setLocation(text);
                    markChanged();
                  }}
                  placeholder="City or area"
                  styles={styles}
                />
                <Field
                  label="Bio"
                  value={bio}
                  onChangeText={(text) => {
                    setBio(text);
                    markChanged();
                  }}
                  placeholder="Tell clients what you do best"
                  multiline
                  maxLength={500}
                  styles={styles}
                />
                <Text style={styles.counter}>{bio.length}/500</Text>
              </Section>

              <Section title="Contact" subtitle="Up to 2 numbers" styles={styles}>
                {contacts.map((contact, index) => (
                  <View key={contact.id} style={styles.contactRow}>
                    <View style={styles.phoneLine}>
                      <Text style={styles.prefix}>+255</Text>
                      <TextInput
                        value={contact.number}
                        onChangeText={(text) =>
                          updateContact(index, { number: text.replace(/\D/g, "").slice(0, 9) })
                        }
                        placeholder="712345678"
                        placeholderTextColor={theme.colors.textMuted}
                        keyboardType="phone-pad"
                        style={styles.phoneInput}
                      />
                      <TouchableOpacity onPress={() => removeContact(index)} style={styles.smallIcon}>
                        <AppIcon name="trash" size={16} color={theme.colors.danger} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.toggleRow}>
                      <ToggleChip
                        icon="phone"
                        label="Call"
                        active={contact.allowCall}
                        onPress={() => updateContact(index, { allowCall: !contact.allowCall })}
                        styles={styles}
                        theme={theme}
                      />
                      <ToggleChip
                        icon="mail"
                        label="SMS"
                        active={contact.allowSMS}
                        onPress={() => updateContact(index, { allowSMS: !contact.allowSMS })}
                        styles={styles}
                        theme={theme}
                      />
                    </View>
                  </View>
                ))}
                {contacts.length < CONTACT_LIMIT && (
                  <AddButton label="Add number" onPress={addContact} styles={styles} theme={theme} />
                )}
              </Section>

              <Section title="Services" styles={styles}>
                {services.map((service, index) => (
                  <View key={service.id} style={styles.itemRow}>
                    <TextInput
                      value={service.value}
                      onChangeText={(text) => updateService(index, text)}
                      placeholder="e.g. Plumbing, Web design"
                      placeholderTextColor={theme.colors.textMuted}
                      style={styles.inlineInput}
                    />
                    <TouchableOpacity onPress={() => removeService(index)} style={styles.smallIcon}>
                      <AppIcon name="trash" size={16} color={theme.colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
                <AddButton label="Add service" onPress={addService} styles={styles} theme={theme} />
              </Section>

              <Section title="Socials" subtitle="Icon buttons only on profile" styles={styles}>
                <View style={styles.socialPicker}>
                  {Object.entries(SOCIAL_ICONS).map(([platform, Icon]) => {
                    const added = socials.some((social) => social.platform === platform);
                    return (
                      <TouchableOpacity
                        key={platform}
                        style={[styles.socialPickBtn, added && styles.socialPickBtnAdded]}
                        disabled={added}
                        onPress={() => addSocial(platform)}
                      >
                        <Icon
                          width={24}
                          height={24}
                          stroke={added ? theme.colors.textMuted : theme.colors.primary}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {socials.map((social, index) => {
                  const Icon = SOCIAL_ICONS[social.platform];
                  return (
                    <View key={social.id} style={styles.socialRow}>
                      <View style={styles.socialIconWrap}>
                        {Icon && <Icon width={21} height={21} stroke={theme.colors.primary} />}
                      </View>
                      <Text style={styles.socialName}>{social.platform}</Text>
                      <TextInput
                        value={social.handle}
                        onChangeText={(text) => updateSocial(index, text)}
                        placeholder="username"
                        autoCapitalize="none"
                        placeholderTextColor={theme.colors.textMuted}
                        style={styles.socialInput}
                      />
                      <TouchableOpacity onPress={() => removeSocial(index)} style={styles.smallIcon}>
                        <AppIcon name="trash" size={16} color={theme.colors.danger} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </Section>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

function Section({ title, subtitle, children, styles }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.sectionSub}>{subtitle}</Text>}
      </View>
      {children}
    </View>
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

function ToggleChip({ icon, label, active, onPress, styles, theme }) {
  return (
    <TouchableOpacity style={[styles.toggleChip, active && styles.toggleChipActive]} onPress={onPress}>
      <AppIcon name={icon} size={14} color={active ? "#fff" : theme.colors.textMuted} />
      <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function AddButton({ label, onPress, styles, theme }) {
  return (
    <TouchableOpacity style={styles.addBtn} onPress={onPress}>
      <AppIcon name="plus" size={15} color={theme.colors.accent} />
      <Text style={styles.addText}>{label}</Text>
    </TouchableOpacity>
  );
}

const createStyles = (theme) => StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.bg,
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
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
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  headerSub: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  saveBtn: {
    minWidth: 70,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveText: {
    color: "#fff",
    fontWeight: "900",
  },
  scrollContent: {
    backgroundColor: theme.colors.bg,
  },
  hero: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 3,
    borderColor: theme.colors.primarySoft,
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 52,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
    marginTop: 4,
  },
  cameraBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.accent,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHint: {
    color: theme.colors.textMuted,
    fontWeight: "700",
    fontSize: 12,
    marginTop: 10,
  },
  section: {
    backgroundColor: theme.colors.surface,
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  sectionSub: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  fieldWrap: {
    marginBottom: 13,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 7,
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
  textArea: {
    minHeight: 112,
    paddingTop: 12,
    lineHeight: 20,
  },
  placeholder: {
    color: theme.colors.textMuted,
  },
  counter: {
    color: theme.colors.textMuted,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "700",
  },
  contactRow: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 14,
    marginBottom: 14,
  },
  phoneLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  prefix: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 15,
  },
  phoneInput: {
    flex: 1,
    minHeight: 44,
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "800",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  smallIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  toggleChip: {
    minHeight: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  toggleChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  toggleText: {
    color: theme.colors.textMuted,
    fontWeight: "900",
    fontSize: 13,
  },
  toggleTextActive: {
    color: "#fff",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  inlineInput: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 14,
    color: theme.colors.text,
    fontWeight: "700",
  },
  addBtn: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  addText: {
    color: theme.colors.accent,
    fontWeight: "900",
  },
  socialPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  socialPickBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  socialPickBtnAdded: {
    opacity: 0.45,
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  socialIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  socialName: {
    width: 78,
    color: theme.colors.text,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  socialInput: {
    flex: 1,
    minHeight: 40,
    color: theme.colors.text,
    fontWeight: "700",
  },
});

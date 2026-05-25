import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Image,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, Keyboard, TouchableWithoutFeedback, BackHandler,
  Animated,
} from "react-native";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { api as backendApi } from "../../api/api";
import { UploadManager } from "../../utils/UploadManager";
import { SOCIAL_ICONS } from "../../icons/socialIcons";
import { theme } from "../../theme";
import AppIcon from "../../icons/AppIcon";
import * as Haptics from "expo-haptics"; // optional, install expo-haptics

export default function EditProvider({ navigation }) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Form state
  const [full_name, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profilePicUrl, setProfilePicUrl] = useState(null);
  const [tempProfilePicUri, setTempProfilePicUri] = useState(null);
  const [profilePicLoaded, setProfilePicLoaded] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [services, setServices] = useState([]);
  const [socials, setSocials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const initialDataRef = useRef(null);

  // Load profile from backend
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await backendApi.get("/service-provider/me");
      const p = res.data.provider;

      setFullName(p.full_name || "");
      setUsername(p.username || "");
      setBio(p.bio || "");
      setProfilePicUrl(p.profilePic || null);
      setProfilePicLoaded(!!p.profilePic);

      const rawContacts = Array.isArray(p.contacts) ? p.contacts : [];
      const parsedContacts = rawContacts
        .map(c => {
          if (typeof c === "object" && c !== null) {
            return {
              number: String(c.number || ""),
              allowCall: !!c.call,
              allowSMS: !!c.sms,
            };
          }
          return null;
        })
        .filter(Boolean);
      setContacts(parsedContacts);

      setServices(Array.isArray(p.services) ? p.services : []);
      
      const rawSocials = Array.isArray(p.socials) ? p.socials : [];
      const parsedSocials = rawSocials
        .map(s => {
          if (typeof s === "object" && s !== null) {
            return {
              platform: String(s.platform || ""),
              handle: String(s.handle || ""),
            };
          }
          return null;
        })
        .filter(Boolean);
      setSocials(parsedSocials);

      initialDataRef.current = {
        full_name: p.full_name || "",
        username: p.username || "",
        bio: p.bio || "",
        profilePic: p.profilePic || null,
        contacts: parsedContacts,
        services: Array.isArray(p.services) ? p.services : [],
        socials: parsedSocials,
      };
    } catch (err) {
      console.error("Load profile error:", err);
      Alert.alert("Error", "Failed to load profile. Please try again.");
      handleGoBack();
    } finally {
      setLoading(false);
      // Fade in after loading
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Hardware back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleGoBack();
        return true;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => sub.remove();
    }, [])
  );

  // Detect changes
  useEffect(() => {
    if (!initialDataRef.current || loading) return;
    const initial = initialDataRef.current;
    const isChanged =
      full_name !== initial.full_name ||
      username !== initial.username ||
      bio !== initial.bio ||
      profilePicUrl !== initial.profilePic ||
      JSON.stringify(contacts) !== JSON.stringify(initial.contacts) ||
      JSON.stringify(services) !== JSON.stringify(initial.services) ||
      JSON.stringify(socials) !== JSON.stringify(initial.socials) ||
      tempProfilePicUri !== null;
    setHasChanges(isChanged);
  }, [full_name, username, bio, profilePicUrl, contacts, services, socials, tempProfilePicUri, loading]);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "We need camera roll permissions to change your photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setTempProfilePicUri(asset.uri);
      setProfilePicUrl(asset.uri);
      setProfilePicLoaded(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const saveProfileData = async (finalProfilePicUrl) => {
    const storedContacts = contacts
      .filter(c => c.number && c.number.trim())
      .map(c => ({
        number: String(c.number || "").trim(),
        call: !!c.allowCall,
        sms: !!c.allowSMS,
      }));

    const storedServices = services
      .map(s => String(s || "").trim())
      .filter(Boolean);

    const storedSocials = socials
      .filter(s => s.handle && s.handle.trim())
      .map(s => ({
        platform: String(s.platform || ""),
        handle: String(s.handle || "").trim().replace(/^@/, ""),
      }));

    const payload = {
      fullName: String(full_name || "").trim(),
      username: String(username || "").trim(),
      bio: String(bio || "").trim(),
      contacts: storedContacts,
      services: storedServices,
      socials: storedSocials,
      profilePic: typeof finalProfilePicUrl === "string" ? finalProfilePicUrl : "",
    };

    await backendApi.put("/service-provider/update", payload);
  };

  const handleSave = async () => {
    if (saving) return;

    if (!full_name.trim()) {
      Alert.alert("Validation Error", "Full name is required.");
      return;
    }
    if (!username.trim()) {
      Alert.alert("Validation Error", "Username is required.");
      return;
    }
    if (username.length < 3) {
      Alert.alert("Validation Error", "Username must be at least 3 characters.");
      return;
    }
    if (contacts.length > 2) {
      Alert.alert("Validation Error", "Maximum 2 contact numbers allowed.");
      return;
    }
    for (const c of contacts) {
      if (c.number.trim()) {
        if (!/^\d{9}$/.test(c.number)) {
          Alert.alert("Validation Error", "Phone number must be exactly 9 digits (e.g., 712345678).");
          return;
        }
        if (!c.allowCall && !c.allowSMS) {
          Alert.alert("Validation Error", "Each contact must allow at least Call or SMS.");
          return;
        }
      }
    }
    if (socials.length > 3) {
      Alert.alert("Validation Error", "Maximum 3 social media accounts allowed.");
      return;
    }

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let finalProfilePic = profilePicUrl;

      if (tempProfilePicUri) {
        setUploadingImage(true);
        try {
          const mediaItem = { uri: tempProfilePicUri, type: "image" };
          const uploadPromise = new Promise((resolve, reject) => {
            UploadManager.callbacks.onComplete = (media) => {
              if (media && media[0] && media[0].url) {
                resolve(media[0].url);
              } else {
                reject(new Error("UploadManager did not return a valid URL"));
              }
            };
            UploadManager.callbacks.onError = reject;
            UploadManager.startUpload([mediaItem], "profile");
          });
          const publicUrl = await uploadPromise;
          finalProfilePic = publicUrl;
          setProfilePicUrl(publicUrl);
          setTempProfilePicUri(null);
        } catch (uploadErr) {
          console.error("Image upload failed:", uploadErr);
          Alert.alert(
            "Upload Failed",
            "Could not upload profile photo. Do you want to continue without changing the photo?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Continue",
                onPress: async () => {
                  await saveProfileData(profilePicUrl);
                  Alert.alert("Success", "Profile updated successfully!", [
                    { text: "OK", onPress: handleGoBack },
                  ]);
                  setSaving(false);
                },
              },
            ]
          );
          setUploadingImage(false);
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      await saveProfileData(finalProfilePic);
      Alert.alert("Success", "Profile updated successfully!", [
        { text: "OK", onPress: handleGoBack },
      ]);
    } catch (err) {
      console.error("Save error:", err);
      Alert.alert("Error", err.response?.data?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  // Contact handlers
  const addContact = () => {
    if (contacts.length >= 2) {
      Alert.alert("Limit", "Maximum 2 contact numbers allowed.");
      return;
    }
    setContacts([...contacts, { number: "", allowCall: true, allowSMS: true }]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const updateContactNumber = (index, text) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 9);
    const newContacts = [...contacts];
    newContacts[index].number = cleaned;
    setContacts(newContacts);
  };
  const toggleContactCall = (index) => {
    const newContacts = [...contacts];
    newContacts[index].allowCall = !newContacts[index].allowCall;
    setContacts(newContacts);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const toggleContactSMS = (index) => {
    const newContacts = [...contacts];
    newContacts[index].allowSMS = !newContacts[index].allowSMS;
    setContacts(newContacts);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const removeContact = (index) => {
    setContacts(contacts.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const addService = () => {
    setServices([...services, ""]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const updateService = (index, text) => {
    const newServices = [...services];
    newServices[index] = text;
    setServices(newServices);
  };
  const removeService = (index) => {
    setServices(services.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const addSocialMedia = (platform) => {
    if (socials.length >= 3) {
      Alert.alert("Limit", "Maximum 3 social accounts allowed.");
      return;
    }
    if (!socials.some(s => s.platform === platform)) {
      setSocials([...socials, { platform, handle: "" }]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };
  const updateSocialHandle = (index, handle) => {
    const newSocials = [...socials];
    newSocials[index].handle = handle.replace(/^@/, "");
    setSocials(newSocials);
  };
  const removeSocialMedia = (index) => {
    setSocials(socials.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Loading skeleton
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Header with gradient background */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleGoBack} style={styles.headerButton}>
              <AppIcon name="arrowLeft" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || !hasChanges}
              style={[styles.headerButton, (!hasChanges || saving) && { opacity: 0.5 }]}
            >
              <Text style={styles.saveText}>{saving ? "Saving..." : "Save"}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={{ opacity: fadeAnim }}>
              {/* Profile Picture - Modern circular with shadow */}
              <View style={styles.avatarSection}>
                <View style={styles.avatarWrap}>
                  <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                    <View style={styles.avatarContainer}>
                      {profilePicUrl && profilePicLoaded ? (
                        <Image
                          source={{ uri: profilePicUrl }}
                          style={styles.avatar}
                          onLoad={() => setProfilePicLoaded(true)}
                          onError={() => setProfilePicLoaded(false)}
                        />
                      ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                          <AppIcon name="user" size={50} color={theme.colors.textMuted} />
                        </View>
                      )}
                      {uploadingImage && (
                        <View style={styles.uploadingOverlay}>
                          <ActivityIndicator size="small" color="#fff" />
                        </View>
                      )}
                      <View style={styles.cameraBadge}>
                        <AppIcon name="camera" size={16} color="#fff" />
                      </View>
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.changePicHint}>Tap to change photo</Text>
                </View>
              </View>

              {/* Basic Info Card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <AppIcon name="user" size={22} color={theme.colors.primary} />
                  <Text style={styles.cardTitle}>Basic Information</Text>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    value={full_name}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                    maxLength={100}
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Username</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="username"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={50}
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Bio</Text>
                  <TextInput
                    style={[styles.input, styles.bioInput]}
                    placeholder="Tell clients about yourself"
                    value={bio}
                    onChangeText={setBio}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    maxLength={500}
                    placeholderTextColor={theme.colors.textMuted}
                  />
                  <Text style={styles.charCount}>{bio.length}/500</Text>
                </View>
              </View>

              {/* Contacts Card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <AppIcon name="phone" size={22} color={theme.colors.primary} />
                  <Text style={styles.cardTitle}>Contact Numbers</Text>
                </View>
                <Text style={styles.sectionHint}>Maximum 2 numbers · 9 digits (e.g., 712345678)</Text>
                {contacts.map((contact, idx) => (
                  <View key={`contact-${idx}-${contact.number}`} style={styles.contactCard}>
                    <View style={styles.phoneRow}>
                      <Text style={styles.phonePrefix}>+255</Text>
                      <TextInput
                        style={styles.phoneInput}
                        placeholder="712345678"
                        keyboardType="phone-pad"
                        value={contact.number}
                        onChangeText={(text) => updateContactNumber(idx, text)}
                        maxLength={9}
                        placeholderTextColor={theme.colors.textMuted}
                      />
                    </View>
                    <View style={styles.contactActions}>
                      <TouchableOpacity style={styles.toggleBtn} onPress={() => toggleContactCall(idx)}>
                        <View style={[styles.toggleIcon, contact.allowCall && styles.toggleActive]}>
                          <AppIcon name="phone" size={16} color={contact.allowCall ? "#fff" : theme.colors.textMuted} />
                        </View>
                        <Text style={[styles.toggleLabel, contact.allowCall && styles.toggleLabelActive]}>Call</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.toggleBtn} onPress={() => toggleContactSMS(idx)}>
                        <View style={[styles.toggleIcon, contact.allowSMS && styles.toggleActive]}>
                          <AppIcon name="mail" size={16} color={contact.allowSMS ? "#fff" : theme.colors.textMuted} />
                        </View>
                        <Text style={[styles.toggleLabel, contact.allowSMS && styles.toggleLabelActive]}>SMS</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeContact(idx)} style={styles.removeBtn}>
                        <AppIcon name="trash" size={18} color={theme.colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                {contacts.length < 2 && (
                  <TouchableOpacity style={styles.addButton} onPress={addContact}>
                    <AppIcon name="plus" size={16} color={theme.colors.accent} />
                    <Text style={styles.addButtonText}>Add Contact Number</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Services Card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <AppIcon name="briefcase" size={22} color={theme.colors.primary} />
                  <Text style={styles.cardTitle}>Services Offered</Text>
                </View>
                {services.map((service, idx) => (
                  <View key={`service-${idx}-${service}`} style={styles.serviceRow}>
                    <TextInput
                      style={styles.serviceInput}
                      placeholder="e.g., Plumbing, Web Design"
                      value={service}
                      onChangeText={(text) => updateService(idx, text)}
                      maxLength={100}
                      placeholderTextColor={theme.colors.textMuted}
                    />
                    <TouchableOpacity onPress={() => removeService(idx)}>
                      <AppIcon name="trash" size={18} color={theme.colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.addButton} onPress={addService}>
                  <AppIcon name="plus" size={16} color={theme.colors.accent} />
                  <Text style={styles.addButtonText}>Add Service</Text>
                </TouchableOpacity>
              </View>

              {/* Social Media Card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <AppIcon name="share" size={22} color={theme.colors.primary} />
                  <Text style={styles.cardTitle}>Social Media</Text>
                </View>
                <Text style={styles.sectionHint}>Add up to 3 accounts</Text>
                <View style={styles.socialGrid}>
                  {Object.entries(SOCIAL_ICONS).map(([platform, Icon]) => {
                    const isAdded = socials.some(s => s.platform === platform);
                    return (
                      <TouchableOpacity
                        key={platform}
                        style={[styles.socialIcon, isAdded && styles.socialIconAdded]}
                        onPress={() => !isAdded && addSocialMedia(platform)}
                        disabled={isAdded}
                      >
                        <Icon width={28} height={28} stroke={isAdded ? "#aaa" : "#fff"} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {socials.map((social, idx) => {
                  const Icon = SOCIAL_ICONS[social.platform];
                  return (
                    <View key={`social-${idx}-${social.platform}`} style={styles.socialRow}>
                      {Icon && <Icon width={24} height={24} stroke={theme.colors.primary} />}
                      <Text style={styles.socialPlatform}>{social.platform}</Text>
                      <TextInput
                        style={styles.socialInput}
                        placeholder="username"
                        value={social.handle}
                        onChangeText={(text) => updateSocialHandle(idx, text)}
                        autoCapitalize="none"
                        placeholderTextColor={theme.colors.textMuted}
                      />
                      <TouchableOpacity onPress={() => removeSocialMedia(idx)}>
                        <AppIcon name="trash" size={18} color={theme.colors.danger} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8F9FA" }, // light background
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F9FA" },
  loadingText: { marginTop: 12, color: theme.colors.text, fontSize: 16 },
  
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 2,
  },
  headerButton: { padding: 8, minWidth: 60 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#212529", letterSpacing: -0.3 },
  saveText: { color: theme.colors.primary, fontWeight: "700", fontSize: 17 },
  
  scrollContent: { padding: 20 },
  
  avatarSection: { alignItems: "center", marginBottom: 32 },
  avatarWrap: { alignItems: "center" },
  avatarContainer: { position: "relative" },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: "#FFFFFF", backgroundColor: "#E9ECEF" },
  avatarPlaceholder: { backgroundColor: "#E9ECEF", justifyContent: "center", alignItems: "center" },
  uploadingOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  changePicHint: { fontSize: 13, color: theme.colors.textMuted, marginTop: 12 },
  
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 10 },
  cardTitle: { fontSize: 18, fontWeight: "600", color: "#212529", letterSpacing: -0.2 },
  
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "500", color: "#495057", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
    color: "#212529",
  },
  bioInput: { height: 100, textAlignVertical: "top" },
  charCount: { textAlign: "right", fontSize: 12, color: "#ADB5BD", marginTop: 4 },
  
  sectionHint: { fontSize: 12, color: "#6C757D", marginBottom: 12, marginTop: -6 },
  
  contactCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  phoneRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  phonePrefix: { fontSize: 16, fontWeight: "600", marginRight: 8, color: "#212529" },
  phoneInput: { flex: 1, fontSize: 16, borderBottomWidth: 1, borderBottomColor: "#DEE2E6", paddingVertical: 4, color: "#212529" },
  contactActions: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  toggleBtn: { alignItems: "center", gap: 4 },
  toggleIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#E9ECEF", justifyContent: "center", alignItems: "center" },
  toggleActive: { backgroundColor: theme.colors.primary },
  toggleLabel: { fontSize: 12, color: "#6C757D" },
  toggleLabelActive: { color: theme.colors.primary, fontWeight: "500" },
  removeBtn: { padding: 8 },
  
  serviceRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  serviceInput: { flex: 1, borderWidth: 1, borderColor: "#DEE2E6", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, backgroundColor: "#FFFFFF", color: "#212529" },
  
  socialGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginBottom: 20 },
  socialIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.primary, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  socialIconAdded: { backgroundColor: "#DEE2E6" },
  socialRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8F9FA", borderRadius: 12, padding: 10, marginBottom: 10, gap: 12, borderWidth: 1, borderColor: "#E9ECEF" },
  socialPlatform: { width: 80, fontWeight: "600", color: "#212529" },
  socialInput: { flex: 1, fontSize: 16, paddingVertical: 6, color: "#212529" },
  
  addButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#F8F9FA", borderWidth: 1, borderColor: theme.colors.accent, borderStyle: "dashed", borderRadius: 14, padding: 14, marginTop: 8 },
  addButtonText: { color: theme.colors.accent, fontWeight: "600", fontSize: 16 },
});
import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { api } from "../../api/api";
import { SOCIAL_ICONS } from "../../icons/socialIcons";
import { uploadProviderPhoto } from "../../lib/storage/ProviderProfile";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../theme";

/* Image Picker */
let ImagePicker;
try {
  ImagePicker = require("expo-image-picker");
} catch {
  ImagePicker = null;
}

export default function EditProvider({ navigation, route }) {
  // State
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profilePic, setProfilePic] = useState("");
  const [tempProfilePic, setTempProfilePic] = useState(null);
  const [tempProfilePicType, setTempProfilePicType] = useState("");
  const [contacts, setContacts] = useState([]);
  const [services, setServices] = useState([]);
  const [socials, setSocials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Refs
  const slideAnim = useRef(new Animated.Value(-70)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef(null);
  const initialDataRef = useRef(null);
  const providerIdRef = useRef(null);

  const insets = useSafeAreaInsets();

  // Navigation function
  const goToMyProfile = () => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: "ProviderTabs",
          state: {
            index: 4,
            routes: [{ name: "MyProfile" }],
          },
        },
      ],
    });
  };

  // Animation functions
  const showSaveBar = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 240,
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 160,
          useNativeDriver: false,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: false,
        }),
      ]),
    ]).start();
  }, [slideAnim, fadeAnim]);

  const hideSaveBar = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: -70,
      duration: 240,
      useNativeDriver: false,
    }).start();
  }, [slideAnim]);

  // Parse services from backend response - FIXED VERSION
  const parseServices = (servicesData) => {
    let rawServices = servicesData;

    // Handle different data formats from backend
    if (Array.isArray(rawServices)) {
      // Already an array from backend (expected format)
      rawServices = rawServices;
    } else if (typeof rawServices === "string") {
      // Fallback if backend ever sends string
      rawServices = rawServices.split(",");
    } else if (!rawServices) {
      // Handle null/undefined
      rawServices = [];
    }

    // Convert to array of objects for the UI
    return rawServices
      .map((s) => {
        if (typeof s === "string") {
          return { name: s.trim() };
        } else if (s && typeof s === "object" && s.name) {
          // Already in object format
          return { name: s.name.trim() };
        }
        return { name: "" };
      })
      .filter((s) => s.name);
  };

  // Load profile data
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/service-provider/me");
      const p = res.data.provider;

      // Store provider ID in ref for later use
      providerIdRef.current = p.id;

      setFullName(p.full_name || "");
      setUsername(p.username || "");
      setBio(p.bio || "");
      setProfilePic(p.profile_pic || "");

      // Parse services - using the fixed function
      const serviceList = parseServices(p.services);
      setServices(serviceList);

      // Parse contacts from string "phone:422853366:call,sms" to object
      const rawContacts = Array.isArray(p.contacts)
        ? p.contacts
        : typeof p.contacts === "string"
        ? [p.contacts]
        : [];

      const contactList = rawContacts.map((c) => {
        if (typeof c === "string") {
          const parts = c.split(":");
          const number = parts[1] || "";
          const access = parts[2] || "";
          return {
            type: "phone",
            number,
            allowCall: access.includes("call"),
            allowSMS: access.includes("sms"),
          };
        }
        return c;
      });

      setContacts(contactList);

      // Parse socials from string "instagram:johndoe" to object
      const socialList = (p.socials || []).map((s) => {
        if (typeof s === "string") {
          const [platform, handle] = s.split(":");
          return { platform: platform || "", handle: handle || "" };
        } else if (s && typeof s === "object") {
          // If already object (fallback)
          return { platform: s.platform || "", handle: s.handle || "" };
        }
        return { platform: "", handle: "" };
      }).filter(s => s.platform);
      
      setSocials(socialList);

      // Store initial data for change detection
      initialDataRef.current = {
        fullName: p.full_name || "",
        username: p.username || "",
        bio: p.bio || "",
        profilePic: p.profile_pic || "",
        services: serviceList,
        contacts: contactList,
        socials: socialList,
      };
    } catch (error) {
      console.error("Load profile error:", error);
      Alert.alert(
        "Error",
        "Failed to load profile. Please check your connection and try again.",
        [{ text: "OK", onPress: goToMyProfile }]
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Check for changes
  useEffect(() => {
    if (!initialDataRef.current || loading) return;

    const currentData = {
      fullName,
      username,
      bio,
      profilePic,
      services,
      contacts,
      socials,
    };

    const isChanged =
      JSON.stringify(currentData) !== JSON.stringify(initialDataRef.current) ||
      tempProfilePic !== null;
    setHasChanges(isChanged);

    if (isChanged) {
      showSaveBar();
    } else {
      hideSaveBar();
    }
  }, [
    fullName,
    username,
    bio,
    profilePic,
    services,
    contacts,
    socials,
    loading,
    tempProfilePic,
    showSaveBar,
    hideSaveBar,
  ]);

  // Pick image from device
  const pickImage = useCallback(async () => {
    if (!ImagePicker) {
      Alert.alert("Error", "Image picker is not available on this device.");
      return;
    }

    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Sorry, we need camera roll permissions to upload photos."
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];

      // Store the base64 image locally for preview
      setTempProfilePic(asset.base64);
      setTempProfilePicType(asset.mimeType || "image/jpeg");

      // Create a preview URL for display
      const previewUri = `data:${asset.mimeType || "image/jpeg"};base64,${
        asset.base64
      }`;
      setProfilePic(previewUri);
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  }, []);

  // Upload image to Supabase
  const uploadImageToSupabase = useCallback(async () => {
    if (!tempProfilePic) return profilePic;

    try {
      setUploadingImage(true);

      const providerId = providerIdRef.current;

      if (!providerId) {
        throw new Error("Provider ID not available");
      }

      const imageUrl = await uploadProviderPhoto(
        providerId,
        tempProfilePic,
        tempProfilePicType
      );

      if (!imageUrl.startsWith(process.env.EXPO_PUBLIC_SUPABASE_URL)) {
        throw new Error("Invalid URL from Supabase");
      }

      // Clear temp data
      setTempProfilePic(null);
      setTempProfilePicType("");

      return imageUrl;
    } catch (error) {
      console.error("Image upload error:", error);
      throw new Error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  }, [tempProfilePic, tempProfilePicType, profilePic]);

  // Separate function to save profile data to backend
  const saveProfileData = useCallback(
    async (profilePicUrl) => {
      try {
        // Normalize contacts: Convert back to colon-separated strings
        const storedContacts = contacts
          .filter((c) => c.number.trim())
          .map((c) => {
            // Clean the number
            const normalizedNumber = c.number
              .replace(/\D/g, "")
              .replace(/^0/, "")
              .slice(0, 9);

            // Build access string
            const access = [];
            if (c.allowCall) access.push("call");
            if (c.allowSMS) access.push("sms");

            // Format: "phone:NUMBER:call,sms"
            return `phone:${normalizedNumber}:${access.join(",")}`;
          });

        // Normalize services: Convert to comma-separated string for backend
        const storedServices = services
          .map((s) => s.name.trim())
          .filter(Boolean)
          .join(","); // "Plumber,Carpenter,Technician"

        // Normalize socials: Convert to colon-separated strings
        const storedSocials = socials
          .map((s) => {
            const platform = s.platform || "";
            const handle = s.handle.trim();
            return handle ? `${platform}:${handle}` : null;
          })
          .filter(Boolean); // ["instagram:johndoe", "twitter:john_doe"]

        // Prepare update data
        const updateData = {
          fullName: fullName.trim(),
          bio: bio.trim(),
          contacts: storedContacts, // Array of strings
          services: storedServices, // Comma-separated string (backend expects this)
          socials: storedSocials, // Array of strings
        };

        // Include username only if it changed
        if (username !== initialDataRef.current?.username) {
          updateData.username = username.trim();
        }

        // Only include profilePic if it's different from initial
        if (
          profilePicUrl &&
          profilePicUrl.startsWith("http") &&
          profilePicUrl !== initialDataRef.current?.profilePic
        ) {
          updateData.profilePic = profilePicUrl;
        }

        // Send update request
        await api.put("/service-provider/update", updateData);

        // Update initial data ref
        initialDataRef.current = {
          fullName: fullName.trim(),
          username: username.trim(),
          bio: bio.trim(),
          profilePic: profilePicUrl,
          services: services,
          contacts: contacts,
          socials: socials,
        };

        // Clear temp image data
        setTempProfilePic(null);
        setTempProfilePicType("");

        setHasChanges(false);

        // Show success message and navigate to profile
        Alert.alert("Success", "Profile updated successfully!", [
          {
            text: "OK",
            onPress: goToMyProfile,
          },
        ]);
      } catch (error) {
        console.error("Save data error:", error);
        const errorMessage =
          error.response?.data?.message ||
          "Failed to save profile. Please try again.";
        Alert.alert("Error", errorMessage);
        throw error;
      } finally {
        setSaving(false);
        hideSaveBar();
      }
    },
    [fullName, username, bio, contacts, services, socials, hideSaveBar]
  );

  // Save profile
  const handleSaveProfile = useCallback(async () => {
    if (saving || !hasChanges) return;

    // Validation
    if (!fullName.trim()) {
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

    // Validate phone numbers
    const validContacts = contacts.filter((c) => c.number.trim());
    if (validContacts.length > 0) {
      const invalidContacts = validContacts.filter(
        (c) => c.number.replace(/\D/g, "").length !== 9
      );
      if (invalidContacts.length > 0) {
        Alert.alert(
          "Validation Error",
          "Phone numbers must be 9 digits (without leading 0 or country code)."
        );
        return;
      }
    }

    setSaving(true);

    try {
      let finalProfilePic = profilePic;

      // Step 1: Upload image to Supabase if there's a new one
      if (tempProfilePic) {
        try {
          finalProfilePic = await uploadImageToSupabase();
        } catch (error) {
          Alert.alert(
            "Upload Failed",
            "Could not upload profile photo. Do you want to save without the new photo?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Save Without Photo",
                onPress: () => {
                  // Continue saving without the new photo
                  saveProfileData(finalProfilePic);
                },
              },
            ]
          );
          setSaving(false);
          return;
        }
      }

      // Step 2: Save all data to backend
      await saveProfileData(finalProfilePic);
    } catch (error) {
      console.error("Save error:", error);
      setSaving(false);
    }
  }, [
    saving,
    hasChanges,
    fullName,
    username,
    contacts,
    tempProfilePic,
    profilePic,
    uploadImageToSupabase,
    saveProfileData,
  ]);

  // Handle phone input change
  const handlePhoneChange = useCallback((index, value) => {
    setContacts((prev) => {
      const newContacts = [...prev];
      // Clean input: digits only, max 9, no leading 0
      const cleaned = value.replace(/\D/g, "").replace(/^0/, "").slice(0, 9);
      newContacts[index].number = cleaned;
      return newContacts;
    });
  }, []);

  // Add contact
  const addContact = useCallback(() => {
    setContacts([
      ...contacts,
      { type: "phone", number: "", allowCall: true, allowSMS: true },
    ]);
  }, [contacts]);

  // Remove contact
  const removeContact = useCallback(
    (index) => {
      setContacts(contacts.filter((_, idx) => idx !== index));
    },
    [contacts]
  );

  // Add service
  const addService = useCallback(() => {
    setServices([...services, { name: "" }]);
  }, [services]);

  // Remove service
  const removeService = useCallback(
    (index) => {
      setServices(services.filter((_, idx) => idx !== index));
    },
    [services]
  );

  // Handle service name change
  const handleServiceChange = useCallback((index, value) => {
    setServices((prev) => {
      const newServices = [...prev];
      newServices[index].name = value;
      return newServices;
    });
  }, []);

  // Add social media
  const addSocialMedia = useCallback(
    (platform) => {
      if (!socials.some((s) => s.platform === platform)) {
        setSocials([...socials, { platform, handle: "" }]);
      }
    },
    [socials]
  );

  // Remove social media
  const removeSocialMedia = useCallback(
    (index) => {
      setSocials(socials.filter((_, idx) => idx !== index));
    },
    [socials]
  );

  // Update social media handle
  const updateSocialHandle = useCallback((index, handle) => {
    setSocials((prev) =>
      prev.map((x, idx) =>
        idx === index ? { ...x, handle: handle.replace(/^@/, "") } : x
      )
    );
  }, []);

  // Dismiss keyboard
  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  // Handle back press with unsaved changes warning
  const handleBackPress = useCallback(() => {
    if (hasChanges) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Are you sure you want to leave?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Leave",
            style: "destructive",
            onPress: goToMyProfile,
          },
        ]
      );
    } else {
      goToMyProfile();
    }
  }, [hasChanges]);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Loading state
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={insets.bottom + theme.spacing.md}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleBackPress}
              style={styles.headerButton}
            >
              <FontAwesome5
                name="arrow-left"
                size={20}
                color={theme.colors.text}
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <TouchableOpacity
              onPress={handleSaveProfile}
              disabled={saving || !hasChanges}
              style={[
                styles.headerButton,
                (!hasChanges || saving) && { opacity: 0.5 },
              ]}
            >
              <Text style={styles.saveText}>
                {saving ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Save Bar */}
          {hasChanges && (
            <Animated.View
              style={[
                styles.saveBar,
                {
                  transform: [{ translateY: slideAnim }],
                  backgroundColor: theme.colors.primary,
                  opacity: fadeAnim,
                },
              ]}
            >
              <Text style={styles.saveBarText}>
                {saving ? "Saving changes..." : "You have unsaved changes"}
              </Text>
            </Animated.View>
          )}

          <ScrollView
            ref={scrollViewRef}
            style={styles.container}
            contentContainerStyle={{
              paddingBottom: insets.bottom + theme.spacing.xxl,
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Profile Picture Section */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarWrap}>
                {profilePic ? (
                  <Image
                    source={{ uri: profilePic }}
                    style={styles.avatar}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <FontAwesome5
                      name="user"
                      size={40}
                      color={theme.colors.muted}
                    />
                  </View>
                )}

                {/* Uploading indicator */}
                {uploadingImage && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.surface}
                    />
                  </View>
                )}

                <TouchableOpacity
                  onPress={pickImage}
                  style={styles.changePicButton}
                  disabled={uploadingImage}
                >
                  <Text style={styles.changePic}>
                    {tempProfilePic ? "Change Photo" : "Choose Photo"}
                  </Text>
                </TouchableOpacity>

                {tempProfilePic && (
                  <Text style={styles.newPhotoLabel}>New photo selected</Text>
                )}
              </View>
            </View>

            {/* Basic Information Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionLabel}>Basic Information</Text>

              <TextInput
                style={styles.input}
                placeholder="Full Name *"
                placeholderTextColor={theme.colors.muted}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                maxLength={100}
              />

              <TextInput
                style={styles.input}
                placeholder="Username *"
                placeholderTextColor={theme.colors.muted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={50}
              />

              <TextInput
                style={[styles.input, styles.bioInput]}
                placeholder="Bio (Tell clients about yourself)"
                placeholderTextColor={theme.colors.muted}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.charCount}>{bio.length}/500</Text>
            </View>

            {/* Contacts Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionLabel}>Contact Numbers</Text>
              <Text style={styles.sectionDescription}>
                Add phone numbers that clients can use to contact you
              </Text>

              {contacts.map((contact, index) => (
                <View key={`contact-${index}`} style={styles.contactRow}>
                  <View style={styles.phoneInputContainer}>
                    <Text style={styles.phonePrefix}>+255</Text>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="9 digits"
                      placeholderTextColor={theme.colors.muted}
                      value={contact.number}
                      onChangeText={(text) => handlePhoneChange(index, text)}
                      keyboardType="phone-pad"
                      maxLength={9}
                    />
                  </View>

                  <View style={styles.contactControls}>
                    <TouchableOpacity
                      onPress={() => {
                        const newContacts = [...contacts];
                        newContacts[index].allowCall =
                          !newContacts[index].allowCall;
                        setContacts(newContacts);
                      }}
                      style={styles.contactToggle}
                    >
                      <FontAwesome5
                        name="phone"
                        size={16}
                        color={
                          contact.allowCall
                            ? theme.colors.primary
                            : theme.colors.muted
                        }
                      />
                      <Text
                        style={[
                          styles.toggleLabel,
                          !contact.allowCall && { color: theme.colors.muted },
                        ]}
                      >
                        Call
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        const newContacts = [...contacts];
                        newContacts[index].allowSMS =
                          !newContacts[index].allowSMS;
                        setContacts(newContacts);
                      }}
                      style={styles.contactToggle}
                    >
                      <FontAwesome5
                        name="sms"
                        size={16}
                        color={
                          contact.allowSMS
                            ? theme.colors.primary
                            : theme.colors.muted
                        }
                      />
                      <Text
                        style={[
                          styles.toggleLabel,
                          !contact.allowSMS && { color: theme.colors.muted },
                        ]}
                      >
                        SMS
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => removeContact(index)}
                      style={styles.removeButton}
                    >
                      <FontAwesome5
                        name="trash"
                        size={16}
                        color={theme.colors.danger}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={styles.addButton}
                onPress={addContact}
                disabled={contacts.length >= 5}
              >
                <FontAwesome5
                  name="plus"
                  size={14}
                  color={theme.colors.accent}
                />
                <Text style={styles.addButtonText}>Add Contact Number</Text>
              </TouchableOpacity>
              {contacts.length >= 5 && (
                <Text style={styles.limitText}>
                  Maximum 5 contact numbers allowed
                </Text>
              )}
            </View>

            {/* Services Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionLabel}>Services Offered</Text>
              <Text style={styles.sectionDescription}>
                List the services you provide
              </Text>

              {services.map((service, index) => (
                <View key={`service-${index}`} style={styles.serviceRow}>
                  <TextInput
                    style={styles.serviceInput}
                    placeholder="Service name"
                    placeholderTextColor={theme.colors.muted}
                    value={service.name}
                    onChangeText={(text) => handleServiceChange(index, text)}
                    maxLength={100}
                  />
                  <TouchableOpacity
                    onPress={() => removeService(index)}
                    style={styles.removeButton}
                  >
                    <FontAwesome5
                      name="trash"
                      size={16}
                      color={theme.colors.danger}
                    />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={styles.addButton}
                onPress={addService}
                disabled={services.length >= 10}
              >
                <FontAwesome5
                  name="plus"
                  size={14}
                  color={theme.colors.accent}
                />
                <Text style={styles.addButtonText}>Add Service</Text>
              </TouchableOpacity>
              {services.length >= 10 && (
                <Text style={styles.limitText}>
                  Maximum 10 services allowed
                </Text>
              )}
            </View>

            {/* Social Media Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionLabel}>Social Media</Text>
              <Text style={styles.sectionDescription}>
                Connect your social media accounts
              </Text>

              <View style={styles.socialGrid}>
                {Object.entries(SOCIAL_ICONS).map(([platform, Icon]) => {
                  const isAdded = socials.some((s) => s.platform === platform);
                  return (
                    <TouchableOpacity
                      key={platform}
                      style={[
                        styles.socialButton,
                        isAdded && styles.socialButtonAdded,
                      ]}
                      onPress={() => !isAdded && addSocialMedia(platform)}
                      disabled={isAdded}
                    >
                      <Icon
                        width={24}
                        height={24}
                        stroke={
                          isAdded ? theme.colors.muted : theme.colors.surface
                        }
                      />
                      {isAdded && (
                        <View style={styles.addedBadge}>
                          <FontAwesome5
                            name="check"
                            size={10}
                            color={theme.colors.surface}
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {socials.map((social, index) => {
                const Icon = SOCIAL_ICONS[social.platform];
                return (
                  <View key={`social-${index}`} style={styles.socialRow}>
                    <View style={styles.socialIconContainer}>
                      {Icon ? (
                        <Icon
                          width={20}
                          height={20}
                          stroke={theme.colors.primary}
                        />
                      ) : (
                        <FontAwesome5
                          name="question-circle"
                          size={20}
                          color={theme.colors.muted}
                        />
                      )}
                    </View>
                    <TextInput
                      style={styles.socialInput}
                      placeholder={`Enter your ${social.platform} username`}
                      placeholderTextColor={theme.colors.muted}
                      value={social.handle}
                      onChangeText={(text) => updateSocialHandle(index, text)}
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={50}
                    />
                    <TouchableOpacity
                      onPress={() => removeSocialMedia(index)}
                      style={styles.removeButton}
                    >
                      <FontAwesome5
                        name="trash"
                        size={16}
                        color={theme.colors.danger}
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}

              {socials.length === 0 && (
                <Text style={styles.emptyText}>
                  Tap on social icons above to add accounts
                </Text>
              )}
            </View>

            {/* Bottom Spacing */}
            <View style={{ height: theme.spacing.xxl * 2 }} />
          </ScrollView>

          {/* Fixed Save Button */}
          {hasChanges && (
            <View
              style={[
                styles.bottomSaveContainer,
                Platform.OS === "ios" && { paddingBottom: insets.bottom },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.bottomSaveButton,
                  (saving || uploadingImage) && styles.bottomSaveButtonDisabled,
                ]}
                onPress={handleSaveProfile}
                disabled={saving || uploadingImage}
              >
                {saving || uploadingImage ? (
                  <View style={styles.saveButtonContent}>
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.surface}
                    />
                    <Text style={styles.bottomSaveText}>
                      {uploadingImage ? "Uploading..." : "Saving..."}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.bottomSaveText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
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
    marginTop: theme.spacing.md,
    color: theme.colors.text,
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    ...theme.shadow.card,
  },
  headerButton: {
    padding: theme.spacing.sm,
    minWidth: 50,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  saveText: {
    color: theme.colors.primary,
    fontWeight: "700",
    fontSize: 16,
  },
  saveBar: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  saveBarText: {
    color: theme.colors.surface,
    fontWeight: "700",
    fontSize: 16,
  },
  container: {
    flex: 1,
    padding: theme.spacing.md,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: theme.spacing.xl,
  },
  avatarWrap: {
    alignItems: "center",
    position: "relative",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: theme.radius.pill,
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: theme.radius.pill,
    justifyContent: "center",
    alignItems: "center",
  },
  changePicButton: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  changePic: {
    color: theme.colors.accent,
    fontWeight: "600",
    fontSize: 16,
  },
  newPhotoLabel: {
    color: theme.colors.success,
    fontSize: 12,
    marginTop: 4,
    fontStyle: "italic",
  },
  sectionContainer: {
    marginBottom: theme.spacing.xl,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.colors.muted,
    marginBottom: theme.spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    fontSize: 16,
  },
  bioInput: {
    height: 100,
    textAlignVertical: "top",
    paddingTop: theme.spacing.sm,
  },
  charCount: {
    textAlign: "right",
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: -theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  contactRow: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  phonePrefix: {
    fontSize: 16,
    color: theme.colors.text,
    marginRight: theme.spacing.sm,
    fontWeight: "600",
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: theme.spacing.xs,
  },
  contactControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  contactToggle: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.xs,
    flex: 1,
  },
  toggleLabel: {
    marginLeft: theme.spacing.xs,
    color: theme.colors.text,
    fontSize: 14,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  serviceInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  socialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  socialButtonAdded: {
    backgroundColor: theme.colors.border,
    opacity: 0.7,
  },
  addedBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: theme.colors.success,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  socialIconContainer: {
    width: 40,
    alignItems: "center",
  },
  socialInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    marginHorizontal: theme.spacing.sm,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderStyle: "dashed",
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  addButtonText: {
    color: theme.colors.accent,
    fontWeight: "600",
    fontSize: 16,
    marginLeft: theme.spacing.sm,
  },
  removeButton: {
    padding: theme.spacing.xs,
  },
  limitText: {
    color: theme.colors.muted,
    fontSize: 12,
    textAlign: "center",
    marginTop: theme.spacing.xs,
  },
  emptyText: {
    color: theme.colors.muted,
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: theme.spacing.sm,
  },
  bottomSaveContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.md,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  bottomSaveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomSaveButtonDisabled: {
    backgroundColor: theme.colors.muted,
    opacity: 0.7,
  },
  saveButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  bottomSaveText: {
    color: theme.colors.surface,
    fontWeight: "700",
    fontSize: 16,
  },
});
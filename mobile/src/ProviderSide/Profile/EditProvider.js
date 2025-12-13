// EditProvider.js
// Full service provider profile editor with image upload, contacts, services, socials,
// real-time sync, animations, and clean normalized data handling.

import React, { useEffect, useRef, useState } from "react";
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
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { API } from "../../api/api";
import io from "socket.io-client";
import { SOCIAL_ICONS } from "../../icons/socialIcons";

/* ---------------- CONFIG ---------------- */
const SOCKET_URL = "http://10.125.36.51:5000";

/* ---------------- IMAGE PICKER ---------------- */
let ImagePicker;
try {
  ImagePicker = require("expo-image-picker");
} catch {
  ImagePicker = null;
}

export default function EditProvider({ navigation }) {
  /* ---------------- STATE ---------------- */
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profilePic, setProfilePic] = useState("");

  const [contacts, setContacts] = useState([]);
  const [services, setServices] = useState([]);
  const [socials, setSocials] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("idle");

  /* ---------------- ANIMATION ---------------- */
  const slideAnim = useRef(new Animated.Value(-70)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const showSaveBar = () => {
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
  };

  const hideSaveBar = () => {
    Animated.timing(slideAnim, {
      toValue: -70,
      duration: 240,
      useNativeDriver: false,
    }).start();
  };

  /* ---------------- LOAD PROFILE ---------------- */
  const loadProfile = async () => {
    try {
      const res = await API.get("/service-provider/me");
      const p = res.data.provider;

      setFullName(p.fullName || "");
      setUsername(p.username || "");
      setBio(p.bio || "");
      setProfilePic(p.profilePic || "");

      setServices((p.services || []).map(s => ({ name: s })));

      setContacts(
        (p.contacts || []).map(c => {
          const [, number, access] = c.split(":");
          return {
            number,
            allowCall: access?.includes("call"),
            allowSMS: access?.includes("sms"),
          };
        })
      );

      setSocials(
        (p.socials || []).map(s => {
          const [platform, handle] = s.split(":");
          return { platform, handle };
        })
      );
    } catch (e) {
      console.log("Load profile error:", e);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- SOCKET ---------------- */
  useEffect(() => {
    loadProfile();

    const socket = io(SOCKET_URL);
    socket.on("providerUpdated", () => loadProfile());

    return () => socket.disconnect();
  }, []);

  /* ---------------- IMAGE PICK ---------------- */
  const pickImage = async () => {
    if (!ImagePicker) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const base64 = "data:image/jpg;base64," + result.assets[0].base64;
      const upload = await API.post("/service-provider/upload-pic", { image: base64 });
      if (upload.data.success) setProfilePic(upload.data.url);
    }
  };

  /* ---------------- SAVE ---------------- */
  const saveProfile = async () => {
    setSaving(true);
    setStatus("saving");
    showSaveBar();

    try {
      await API.put("/service-provider/update", {
        fullName,
        username,
        bio,
        profilePic,
        services: services.map(s => s.name),
        socials: socials.map(s => `${s.platform}:${s.handle.replace(/^@/, "")}`),
        contacts,
      });

      setStatus("success");
      setTimeout(() => {
        hideSaveBar();
        navigation.navigate("ProviderTabs", { screen: "MyProfile" });
      }, 1200);
    } catch (e) {
      console.log("Save error:", e);
      setStatus("error");
      Alert.alert("Error", "Failed to save profile");
      setTimeout(hideSaveBar, 1500);
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- UI ---------------- */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0B6B63" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <FontAwesome5 name="arrow-left" size={20} color="#0B6B63" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* SAVE BAR */}
      <Animated.View
        style={[
          styles.saveBar,
          {
            top: slideAnim,
            opacity: fadeAnim,
            backgroundColor:
              status === "success"
                ? "#2ECC71"
                : status === "error"
                ? "#E74C3C"
                : "#0B6B63",
          },
        ]}
      >
        <TouchableOpacity onPress={saveProfile}>
          <Text style={styles.saveText}>
            {status === "saving"
              ? "Saving..."
              : status === "success"
              ? "Saved ✓"
              : status === "error"
              ? "Error ✕"
              : "Save Changes"}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          {/* PROFILE PIC */}
          <TouchableOpacity style={styles.avatarWrap} onPress={pickImage}>
            <Image
              source={{ uri: profilePic || "https://via.placeholder.com/120" }}
              style={styles.avatar}
            />
            <Text style={styles.changePic}>Change photo</Text>
          </TouchableOpacity>

          {/* BASIC INFO */}
          <TextInput
            style={styles.input}
            placeholder="Full name"
            value={fullName}
            onChangeText={setFullName}
          />

          <TextInput
            style={styles.input}
            placeholder="Username (optional)"
            value={username}
            onChangeText={setUsername}
          />

          <TextInput
            style={[styles.input, styles.bio]}
            placeholder="Bio"
            multiline
            value={bio}
            onChangeText={setBio}
          />

          {/* CONTACTS */}
          <Text style={styles.section}>Contacts</Text>
          {contacts.map((c, i) => (
            <View key={i} style={styles.row}>
              <Text>+255</Text>
              <TextInput
                style={styles.phoneInput}
                keyboardType="numeric"
                maxLength={9}
                value={c.number}
                onChangeText={t =>
                  setContacts(prev =>
                    prev.map((x, idx) =>
                      idx === i ? { ...x, number: t.replace(/\D/g, "") } : x
                    )
                  )
                }
              />
            </View>
          ))}

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() =>
              setContacts([...contacts, { number: "", allowCall: true, allowSMS: true }])
            }
          >
            <Text style={styles.addText}>+ Add Contact</Text>
          </TouchableOpacity>

          {/* SERVICES */}
          <Text style={styles.section}>Services</Text>
          {services.map((s, i) => (
            <View key={i} style={styles.row}>
              <TextInput
                style={styles.serviceInput}
                placeholder="Service name"
                value={s.name}
                onChangeText={t =>
                  setServices(prev =>
                    prev.map((x, idx) => (idx === i ? { ...x, name: t } : x))
                  )
                }
              />
              <TouchableOpacity
                onPress={() => setServices(prev => prev.filter((_, idx) => idx !== i))}
              >
                <Text style={styles.remove}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setServices([...services, { name: "" }])}
          >
            <Text style={styles.addText}>+ Add Service</Text>
          </TouchableOpacity>

          {/* SOCIALS */}
          <Text style={styles.section}>Social Media</Text>
          <View style={styles.socialGrid}>
            {Object.keys(SOCIAL_ICONS).map(p => {
              const Icon = SOCIAL_ICONS[p];
              return (
                <TouchableOpacity
                  key={p}
                  style={styles.socialBtn}
                  onPress={() =>
                    !socials.find(s => s.platform === p) &&
                    setSocials([...socials, { platform: p, handle: "" }])
                  }
                >
                  <Icon width={22} height={22} stroke="#fff" />
                </TouchableOpacity>
              );
            })}
          </View>

          {socials.map((s, i) => {
            const Icon = SOCIAL_ICONS[s.platform];
            return (
              <View key={i} style={styles.row}>
                <Icon width={22} height={22} stroke="#0B6B63" />
                <TextInput
                  style={styles.socialInput}
                  placeholder={`${s.platform} username`}
                  value={s.handle}
                  onChangeText={t =>
                    setSocials(prev =>
                      prev.map((x, idx) => (idx === i ? { ...x, handle: t } : x))
                    )
                  }
                />
                <TouchableOpacity
                  onPress={() => setSocials(prev => prev.filter((_, idx) => idx !== i))}
                >
                  <Text style={styles.remove}>✕</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4FFFD" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0B6B63" },

  saveBar: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  container: { padding: 18 },
  avatarWrap: { alignItems: "center", marginBottom: 20 },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  changePic: { marginTop: 6, color: "#4ECDC4", fontWeight: "600" },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  bio: { height: 100, textAlignVertical: "top" },

  section: { fontWeight: "700", marginVertical: 10, color: "#0B6B63" },

  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 6,
  },
  serviceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 6,
  },
  socialInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 6,
  },

  addBtn: { alignSelf: "center", marginBottom: 14 },
  addText: { color: "#4ECDC4", fontWeight: "700" },

  remove: { fontSize: 18, color: "#E74C3C" },

  socialGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 10 },
  socialBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0B6B63",
    justifyContent: "center",
    alignItems: "center",
  },
});

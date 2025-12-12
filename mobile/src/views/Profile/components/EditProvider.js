import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  SafeAreaView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import { API } from "../../../api/api";
import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SOCKET_URL = "http://10.125.36.51:5000";

/* ---------------------- IMAGE PICKER ---------------------- */
let ImagePicker;
try {
  ImagePicker = require("expo-image-picker");
} catch {
  ImagePicker = null;
}

export default function EditProvider({ navigation, route }) {
  /* ---------------------- STATE ---------------------- */
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [contacts, setContacts] = useState([]);
  const [socials, setSocials] = useState([]);
  const [services, setServices] = useState([]);
  const [profilePic, setProfilePic] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("idle");

  const incoming = route.params?.provider;

  /* ----------------REAL-TIME SOCKET LISTENER -----------*/
  useEffect(() => {
    const setupSocket = async () => {
      try {
        const socket = io(SOCKET_URL);

        // Get logged-in provider
        const res = await API.get("/service-provider/me");
        const userId = res.data.provider.user_id;

        // Join private room
        socket.emit("join", userId);

        // When backend says data updated...
        socket.on("providerUpdated", () => {
          console.log("🔥 Profile updated — refreshing…");
          loadProfile(); // reload your edit page data too
        });
      } catch (e) {
        console.log("Socket setup error:", e);
      }
    };

    setupSocket();
  }, []);

  /* ---------------------- FUNCTION: Load profile ---------------------- */
  const loadProfile = async () => {
    try {
      const res = await API.get("/service-provider/me");
      const data = res.data.provider;

      setFullName(data.fullName || "");
      setUsername(data.username || "");
      setProfilePic(data.profilePic || "");
      setBio(data.bio || "");

      setContacts(
        (data.contacts || []).map((c) => {
          const [type, number, access] = c.split(":");
          return {
            type: type || "phone",
            value: number || "",
            allowCall: access?.includes("call") ?? true,
            allowSMS: access?.includes("sms") ?? true,
          };
        })
      );

      setSocials(
        (data.socials || []).map((s) => {
          const [platform, handle] = s.split(":");
          return { platform, icon: platform, handle };
        })
      );

      setServices((data.services || []).map((name) => ({ name })));
    } catch (err) {
      console.log("Load profile error:", err);
    }
  };

  /* existing useEffect for incoming props — keep it */
  useEffect(() => {
    if (!incoming) return;
    loadProfile();
  }, []);  

  /* ---------------------- ANIMATIONS ---------------------- */
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const triggerSlide = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.45,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]),
    ]).start();
  };

  const hideSlide = () => {
    Animated.timing(slideAnim, {
      toValue: -70,
      duration: 240,
      useNativeDriver: false,
    }).start();
  };

  /* ---------------------- SOCIAL URL BUILDER ---------------------- */
  const SOCIAL_MAP = {
    instagram: (v) => `https://instagram.com/${v}`,
    twitter: (v) => `https://twitter.com/${v}`,
    tiktok: (v) => `https://www.tiktok.com/@${v}`,
    youtube: (v) => `https://youtube.com/@${v}`,
    threads: (v) => `https://www.threads.net/@${v}`,
    facebook: (v) => `https://facebook.com/${v}`,
    snapchat: (v) => `https://www.snapchat.com/add/${v}`,
  };

  const socialPlatforms = [
    { id: "instagram", icon: "instagram" },
    { id: "twitter", icon: "twitter" },
    { id: "tiktok", icon: "music" },
    { id: "youtube", icon: "youtube-play" },
    { id: "threads", icon: "at" },
    { id: "facebook", icon: "facebook" },
    { id: "snapchat", icon: "snapchat-ghost" },
  ];

  const placeholder = "https://via.placeholder.com/150";

  /* ---------------------- LOAD EXISTING DATA ---------------------- */
  useEffect(() => {
    setTimeout(() => {
      triggerSlide();
      setStatus("idle");
    }, 100);
  }, []);

  useEffect(() => {
    if (!incoming) return;

    setFullName(incoming.fullName || "");
    setUsername(incoming.username || "");
    setProfilePic(incoming.profilePic || "");
    setBio(incoming.bio || "");

    setContacts(
      (incoming.contacts || []).map((c) => {
        const [type, number, access] = c.split(":");
        return {
          type: type || "phone",
          value: number || "",
          allowCall: access?.includes("call") ?? true,
          allowSMS: access?.includes("sms") ?? true,
        };
      })
    );

    setSocials(
      (incoming.socials || []).map((s) => {
        const [platform, handle] = s.split(":");
        return { platform, icon: platform, handle };
      })
    );

    // SERVICES — NO EMOJIS
    setServices((incoming.services || []).map((name) => ({ name })));
  }, []);

  /* ---------------------- IMAGE PICKER ---------------------- */
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      const base64Img = "data:image/jpg;base64," + result.assets[0].base64;

      const upload = await API.post("/service-provider/upload-pic", {
        image: base64Img,
      });

      if (upload.data.success) {
        setProfilePic(upload.data.url); // PUBLIC URL from Cloudinary
      }
    }
  };


  /* ---------------------- VALIDATION ---------------------- */
  const validateContacts = () => {
    const nums = contacts.map((c) => c.value.trim()).filter((n) => n !== "");
    const unique = new Set(nums);
    if (unique.size !== nums.length) {
      Alert.alert("Duplicate phone numbers are not allowed.");
      return false;
    }
    return true;
  };

  /* ---------------------- SAVE ---------------------- */
  const handleSave = async () => {
    if (!validateContacts()) return;

    setStatus("saving");
    setLoading(true);
    triggerSlide();

    try {
      const formattedContacts = contacts.map((c) => {
        const access = [];
        if (c.allowCall) access.push("call");
        if (c.allowSMS) access.push("sms");
        return `${c.type}:${c.value}:${access.join(",")}`;
      });

      const formattedSocials = socials.map((s) => {
        let handle = s.handle.trim();

        if (handle.startsWith("@")) handle = handle.substring(1);
        if (handle.startsWith("http")) return `${s.platform}:${handle}`;

        const makeUrl = SOCIAL_MAP[s.platform];
        return `${s.platform}:${makeUrl ? makeUrl(handle) : handle}`;
      });

      await API.put("/service-provider/update", {
        fullName,
        username,
        contacts: formattedContacts,
        socials: formattedSocials,
        services: services.map((s) => s.name), // CLEAN — NO ICONS
        profilePic,
      });

      setStatus("success");
      triggerSlide();

      setTimeout(() => {
        setStatus("idle");
        hideSlide();
      }, 2000);

      setLoading(false);
      navigation.navigate("ServiceProviderProfile", { updated: true });
    } catch (err) {
      console.log(err);
      setStatus("error");
      triggerSlide();

      setTimeout(() => {
        setStatus("idle");
        hideSlide();
      }, 2000);

      setLoading(false);
    }
  };

  /* ---------------------- CONTACT HELPERS ---------------------- */
  const updateContact = (i, key, value) => {
    const arr = [...contacts];
    if (key === "value") {
      const cleaned = value.replace(/\s+/g, "");
      if (!/^\d*$/.test(cleaned)) return;
      if (cleaned.startsWith("0")) return;
      if (cleaned.length > 9) return;
      arr[i].value = cleaned;
    } else {
      arr[i][key] = value;
    }
    setContacts(arr);
  };

  const removeContact = (i) => {
    setContacts((prev) => prev.filter((_, idx) => idx !== i));
  };

  /* ---------------------- SERVICE HELPERS ---------------------- */
  const updateService = (i, key, value) => {
    const arr = [...services];
    arr[i][key] = value;
    setServices(arr);
  };

  const removeService = (i) => {
    setServices((prev) => prev.filter((_, idx) => idx !== i));
  };

  /* ---------------------- SOCIAL HELPERS ---------------------- */
  const handleSelectSocial = (platform, icon) => {
    if (socials.some((s) => s.platform === platform)) return;
    setSocials([...socials, { platform, icon, handle: "" }]);
  };

  /* ---------------------- UI ---------------------- */
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* SAVE BAR */}
      <Animated.View
        style={[
          styles.saveBar,
          {
            top: slideAnim,
            backgroundColor:
              status === "success"
                ? "#2ECC71"
                : status === "error"
                ? "#E74C3C"
                : "#FFFFFF",
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity style={styles.saveBarBtn} onPress={handleSave}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {status === "saving" && (
              <ActivityIndicator size="small" color="#333" />
            )}
            <Text style={styles.saveBarText}>
              {status === "saving"
                ? "Saving..."
                : status === "success"
                ? "✓ Saved"
                : status === "error"
                ? "✕ Error"
                : "Save Changes"}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Edit Profile</Text>

          {/* PROFILE PIC */}
          <View style={styles.profilePicSection}>
            <TouchableOpacity onPress={pickImage} style={styles.imageWrapper}>
              <Image
                source={{ uri: profilePic || placeholder }}
                style={styles.profileImage}
              />
              <Text style={styles.editPicText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          {/* BASIC INFO */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Info</Text>

            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={fullName}
              onChangeText={setFullName}
            />

            <TextInput
              style={styles.input}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
            />

            <TextInput
              style={[styles.input, { height: 90 }]}
              placeholder="Bio"
              multiline
              value={bio}
              onChangeText={setBio}
            />
          </View>

          {/* CONTACTS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contacts</Text>

            {contacts.map((c, i) => (
              <View style={styles.contactRow} key={i}>
                <TouchableOpacity
                  style={[
                    styles.smallCircleIcon,
                    { borderColor: c.allowCall ? "#007BFF" : "#ccc" },
                  ]}
                  onPress={() =>
                    updateContact(i, "allowCall", !c.allowCall)
                  }
                >
                  <Icon name="phone" size={15} color="#007BFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.smallCircleIcon,
                    { borderColor: c.allowSMS ? "#007BFF" : "#ccc" },
                  ]}
                  onPress={() =>
                    updateContact(i, "allowSMS", !c.allowSMS)
                  }
                >
                  <Icon name="comment" size={15} color="#007BFF" />
                </TouchableOpacity>

                <Text>+255</Text>

                <TextInput
                  style={styles.contactInput}
                  placeholder="712345678"
                  value={c.value}
                  keyboardType="numeric"
                  maxLength={9}
                  onChangeText={(t) => updateContact(i, "value", t)}
                />

                <TouchableOpacity onPress={() => removeContact(i)}>
                  <Text style={styles.removeXSmall}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addBtn}
              onPress={() =>
                setContacts([
                  ...contacts,
                  { type: "phone", value: "", allowCall: true, allowSMS: true },
                ])
              }
            >
              <Text style={styles.addText}>+ Add Contact</Text>
            </TouchableOpacity>
          </View>

          {/* SERVICES — CLEAN, NO EMOJI */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services</Text>

            <TouchableOpacity
              style={styles.addServiceBtn}
              onPress={() => setServices([...services, { name: "" }])}
            >
              <Text style={styles.addServiceText}>+ Add Service</Text>
            </TouchableOpacity>

            {services.map((s, i) => (
              <View style={styles.serviceRow} key={i}>
                <TextInput
                  style={styles.serviceNameInput}
                  placeholder="Service name"
                  value={s.name}
                  onChangeText={(t) => updateService(i, "name", t)}
                />

                <TouchableOpacity onPress={() => removeService(i)}>
                  <Text style={styles.removeXSmall}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* SOCIALS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Social Media</Text>

            <View style={styles.socialGrid}>
              {socialPlatforms.map((sp) => (
                <TouchableOpacity
                  key={sp.id}
                  style={styles.socialGridBtn}
                  onPress={() => handleSelectSocial(sp.id, sp.icon)}
                >
                  <Icon name={sp.icon} size={20} color="#fff" />
                </TouchableOpacity>
              ))}
            </View>

            {socials.map((s, i) => (
              <View style={styles.socialRow} key={i}>
                <Icon
                  name={s.icon}
                  size={20}
                  style={{ color: "#007BFF", marginRight: 8 }}
                />

                <TextInput
                  style={styles.socialInputRow}
                  placeholder={`Enter ${s.platform} username or link`}
                  value={s.handle}
                  onChangeText={(text) => {
                    const arr = [...socials];
                    arr[i].handle = text;
                    setSocials(arr);
                  }}
                />

                <TouchableOpacity
                  onPress={() =>
                    setSocials((prev) => prev.filter((_, idx) => idx !== i))
                  }
                >
                  <Text style={styles.removeXSmall}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ------------------- STYLES ------------------- */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f4f4f4" },

  saveBar: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 60,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
    elevation: 10,
    shadowColor: "#000",
  },

  saveBarBtn: { width: "100%", alignItems: "center" },
  saveBarText: { fontSize: 17, fontWeight: "700" },

  container: { padding: 22, paddingTop: 80, paddingBottom: 150 },

  title: { fontSize: 22, fontWeight: "700", textAlign: "center" },

  /* PROFILE */
  profilePicSection: { alignItems: "center", marginBottom: 15 },
  imageWrapper: { alignItems: "center" },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ddd",
  },
  editPicText: { marginTop: 8, color: "#007BFF", fontWeight: "600" },

  /* SECTIONS */
  section: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 10,
    marginTop: 20,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },

  input: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },

  /* CONTACTS */
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 10,
  },
  smallCircleIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  contactInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 8,
  },
  removeXSmall: { fontWeight: "700", fontSize: 16, color: "red" },
  addBtn: { alignSelf: "center", marginTop: 6 },
  addText: { color: "#007BFF", fontWeight: "700" },

  /* SERVICES */
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  serviceNameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
  },
  addServiceBtn: {
    borderWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  addServiceText: { fontWeight: "700", color: "#007BFF" },

  /* SOCIALS */
  socialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 10,
  },
  socialGridBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1E1E1E",
    justifyContent: "center",
    alignItems: "center",
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 10,
  },
  socialInputRow: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 8,
  },
});

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

let ImagePicker;
try {
  ImagePicker = require("expo-image-picker");
} catch {
  ImagePicker = null;
}

/**
 * EditProvider.js
 * - Full upgraded Save Bar (slide + fade + rounded bottom)
 * - Contacts (compact rows)
 * - Socials (grid + rows)
 * - Services (add minimal rows; emoji picker via hidden TextInput)
 *
 * This file is built from and restores parts of your previous EditProvider.js. :contentReference[oaicite:1]{index=1}
 */

export default function EditProvider({ navigation, route }) {
  // Profile fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [contacts, setContacts] = useState([]);
  const [socials, setSocials] = useState([]);
  const [services, setServices] = useState([]); // { icon: "🛠", name: "Plumbing" }
  const [profilePic, setProfilePic] = useState("");
  const [loading, setLoading] = useState(false);

  // Save bar status
  const [status, setStatus] = useState("idle"); // idle | saving | success | error

  // Animations
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const incoming = route.params?.provider;

  useEffect(() => {
    setTimeout(() => {
      triggerSlide();   // slide down on load
      setStatus("idle");
    }, 100);
  }, []);


  // Refs for emoji inputs of services
  const emojiRefs = useRef([]); // array of refs for hidden emoji TextInputs

  const placeholder = "https://via.placeholder.com/150";

  // ----------------- life cycle: load profile -----------------
  useEffect(() => {
    if (incoming) {
      // preload current profile details
      setFullName(incoming.fullName || "");
      setUsername(incoming.username || "");
      setProfilePic(incoming.profilePic || "");
      setBio(incoming.bio || "");

      // parse contacts
      setContacts(
        (incoming.contacts || []).map((c) => {
          const parts = c.split(":");
          return {
            type: parts[0] || "phone",
            value: parts[1] || "",
            allowCall: parts[2]?.includes("call") ?? true,
            allowSMS: parts[2]?.includes("sms") ?? true,
          };
        })
      );

      // parse socials
      setSocials(
        (incoming.socials || []).map((s) => {
          const parts = s.split(":");
          return {
            platform: parts[0],
            icon: parts[0],
            handle: parts[1] || "",
          };
        })
      );

      // parse services
      setServices(
        (incoming.services || []).map((srv) => {
          const parts = srv.split(":");
          return { icon: parts[0] || "🔧", name: parts[1] || "" };
        })
      );

      return; // we don’t fetch again
    }

    // fallback: if nothing was passed, fetch manually
    loadFromBackend();
  }, []);


  // ----------------- image picker -----------------
  const pickImage = async () => {
    if (!ImagePicker) return Alert.alert("expo-image-picker not installed.");
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") return Alert.alert("Allow gallery access.");
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!result.canceled) setProfilePic(result.assets[0].uri);
  };

  // ----------------- animations helpers -----------------
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
          duration: 220,
          useNativeDriver: false,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
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

  // ----------------- save handler -----------------
  const handleSave = async () => {
    setStatus("saving");
    triggerSlide();
    setLoading(true);

    try {
      const formattedContacts = contacts.map((c) => {
        const access = [];
        if (c.allowCall) access.push("call");
        if (c.allowSMS) access.push("sms");
        return `${c.type}:${c.value}:${access.join(",")}`;
      });

await API.put("/service-provider/update", {
  fullName,
  username,
  contacts: formattedContacts,

  socials: socials.map((s) => {
    let final = (s.handle || "").trim();

    // force https:// if missing
    if (final !== "" && !final.startsWith("http")) {
      final = "https://" + final;
    }

    return `${s.platform}:${final}`;
  }),

  services: services.map((s) => `${s.icon || "🔧"}:${s.name || ""}`),
  profilePic,
});


      setStatus("success");
      triggerSlide();

      // stay success for 2s then collapse
      setTimeout(() => {
        setStatus("idle");
        hideSlide();
      }, 2000);

      setLoading(false);
      // optional: navigate back after success
      navigation.navigate("ServiceProviderProfile", { updated: true });
    } catch (e) {
      console.log("Update error:", e);
      setStatus("error");
      triggerSlide();

      setTimeout(() => {
        setStatus("idle");
        hideSlide();
      }, 2800);

      setLoading(false);
    }
  };

  // ----------------- contacts helpers -----------------
  const updateContact = (index, field, value) => {
    const arr = [...contacts];
    if (field === "value") {
      let cleaned = value.replace(/\s+/g, "");
      if (!/^\d*$/.test(cleaned)) return;
      if (cleaned.startsWith("0")) return;
      if (cleaned.length > 9) return;
      value = cleaned;
    }
    arr[index][field] = value;
    setContacts(arr);
  };

  const toggleContactAccess = (i, type) => {
    const arr = [...contacts];
    arr[i][type] = !arr[i][type];
    setContacts(arr);
  };

  // ----------------- socials helpers -----------------
  const socialPlatforms = [
    { id: "instagram", icon: "instagram" },
    { id: "facebook", icon: "facebook" },
    { id: "threads", icon: "at" },
    { id: "meta", icon: "circle-o" },
    { id: "youtube", icon: "youtube-play" },
    { id: "twitter", icon: "twitter" },
  ];

  const handleSelectSocial = (platform, icon) => {
    if (socials.some((s) => s.platform === platform)) return;
    setSocials([...socials, { platform, icon, handle: "" }]);
  };

  const removeSocial = (index) => setSocials((p) => p.filter((_, i) => i !== index));

  // ----------------- services helpers (emoji button via hidden TextInput) -----------------
  const addService = () => {
    setServices((p) => [...p, { icon: "🔧", name: "" }]);
    // create a new ref slot
    emojiRefs.current = [...emojiRefs.current, React.createRef()];
  };

  const updateService = (i, field, value) => {
    const arr = [...services];
    arr[i][field] = value;
    setServices(arr);
  };

  const removeService = (i) => {
    setServices((p) => p.filter((_, idx) => idx !== i));
    emojiRefs.current.splice(i, 1);
  };

  // Focus hidden emoji TextInput for service i (Option B)
  const focusEmojiInput = (i) => {
    if (!emojiRefs.current[i]) {
      emojiRefs.current[i] = React.createRef();
    }
    const ref = emojiRefs.current[i];
    if (ref && ref.current && ref.current.focus) {
      ref.current.focus();
    }
  };

  // ----------------- render -----------------
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* TOP SAVE BAR (animated) */}
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
                : status === "saving"
                ? "#F2F2F2"
                : "#FFFFFF",
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.saveBarBtn}
          onPress={handleSave}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {status === "saving" && (
              <ActivityIndicator size="small" color="#666" style={{ marginRight: 6 }} />
            )}
            <Text style={[styles.saveBarText, { color: status === "idle" ? "#333" : "#fff" }]}>
              {status === "saving"
                ? "Saving…"
                : status === "success"
                ? "✓ Saved Successfully"
                : status === "error"
                ? "✕ Failed to Save"
                : "Save Changes"}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>User Profile</Text>

          {/* PROFILE PIC */}
          <View style={styles.profilePicSection}>
            <TouchableOpacity onPress={pickImage} style={styles.imageWrapper}>
              <Image source={{ uri: profilePic || placeholder }} style={styles.profileImage} />
              <Text style={styles.editPicText}>Edit profile</Text>
            </TouchableOpacity>
          </View>

          {/* NAME FIELDS */}
          <View style={styles.namesSection}>
            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />
            </View>

            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>Username</Text>
              <TextInput style={styles.input} value={username} onChangeText={setUsername} />
            </View>
          </View>

          {/* CONTACTS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contacts</Text>

            {contacts.map((c, index) => (
              <View style={styles.contactRow} key={index}>
                <TouchableOpacity
                  onPress={() => toggleContactAccess(index, "allowCall")}
                  style={[styles.smallCircleIcon, { borderColor: c.allowCall ? "#007BFF" : "#bbb" }]}
                >
                  <Icon name="phone" size={16} color="#007BFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => toggleContactAccess(index, "allowSMS")}
                  style={[styles.smallCircleIcon, { borderColor: c.allowSMS ? "#007BFF" : "#bbb" }]}
                >
                  <Icon name="comment" size={16} color="#007BFF" />
                </TouchableOpacity>

                <Text style={styles.prefixMini}>+255</Text>

                <TextInput
                  style={styles.contactInput}
                  placeholder="712345678"
                  keyboardType="numeric"
                  maxLength={9}
                  value={c.value.replace("+255", "")}
                  onChangeText={(t) => updateContact(index, "value", t)}
                />

                <TouchableOpacity onPress={() => setContacts((prev) => prev.filter((_, i) => i !== index))}>
                  <Text style={styles.removeXSmall}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addBtn}
              onPress={() =>
                setContacts((p) => [...p, { type: "phone", value: "", allowCall: true, allowSMS: true }])
              }
            >
              <Text style={styles.addText}>+ Add Contact</Text>
            </TouchableOpacity>
          </View>

          {/* SERVICES - minimal rows with emoji picker */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services Provided</Text>

            {/* Add Service button when there are no services or always visible */}
            <TouchableOpacity style={styles.addServiceBtn} onPress={addService}>
              <Text style={styles.addServiceText}>+ Add Service</Text>
            </TouchableOpacity>

            <View style={{ marginTop: 12 }}>
              {services.map((s, idx) => (
                <View style={styles.serviceRow} key={idx}>
                  {/* visible emoji button */}
                  <TouchableOpacity
                    style={styles.emojiBtn}
                    onPress={() => focusEmojiInput(idx)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.emojiText}>{s.icon || "🔧"}</Text>
                  </TouchableOpacity>

                  {/* hidden emoji TextInput (focus opens emoji keyboard) */}
                  <TextInput
                    ref={(el) => {
                      if (!emojiRefs.current[idx]) emojiRefs.current[idx] = { current: el };
                      else emojiRefs.current[idx].current = el;
                    }}
                    style={styles.hiddenEmojiInput}
                    value={s.icon}
                    onChangeText={(t) => {
                      // allow only short input (emoji). We'll accept the first char(s)
                      updateService(idx, "icon", t);
                    }}
                    maxLength={2}
                    caretHidden={false}
                    // keep keyboard default so emoji keyboard shows
                  />

                  {/* service name */}
                  <TextInput
                    style={styles.serviceNameInput}
                    placeholder="Service name (e.g. Plumbing)"
                    value={s.name}
                    onChangeText={(t) => updateService(idx, "name", t)}
                  />

                  {/* remove */}
                  <TouchableOpacity onPress={() => removeService(idx)}>
                    <Text style={styles.removeXSmall}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* SOCIAL MEDIA */}
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

            <View style={{ marginTop: 16 }}>
              {socials.map((item, index) => (
                <View style={styles.socialRow} key={index}>
                  <Icon name={item.icon} size={20} color="#007BFF" style={{ marginRight: 8 }} />

                  <TextInput
                    style={styles.socialInputRow}
                    placeholder={`Enter ${item.platform} link`}
                    value={item.handle}
                  onChangeText={(t) =>
                    setSocials((prev) => prev.map((p, i) =>
                      i === index ? { ...p, handle: t.trim() } : p
                    ))
                  }

                  />

                  <TouchableOpacity onPress={() => removeSocial(index)}>
                    <Text style={styles.removeXSmall}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ----------------- STYLES -----------------
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f4f4f4" },

  /** SAVE BAR */
  saveBar: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 60,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  saveBarBtn: {
    width: "100%",
    alignItems: "center",
  },

  saveBarText: {
    fontSize: 17,
    fontWeight: "700",
  },

  // Container pushes content below the save bar (space = bar height + padding)
  container: {
    padding: 20,
    paddingTop: 80,
    paddingBottom: 160,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },

  profilePicSection: { alignItems: "center", marginBottom: 24 },
  imageWrapper: { alignItems: "center" },

  profileImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#ddd",
  },

  editPicText: { color: "#007BFF", marginTop: 8, fontWeight: "600" },

  namesSection: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 10,
    marginBottom: 18,
  },

  fieldWrapper: { marginBottom: 12 },

  label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },

  input: {
    backgroundColor: "#f8f9fa",
    padding: 10,
    fontSize: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
  },

  section: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 10,
    marginBottom: 18,
  },

  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },

  /** CONTACT ROW */
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 10,
    gap: 10,
  },

  smallCircleIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    backgroundColor: "#fff",
  },

  prefixMini: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: -5,
  },

  contactInput: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 14,
  },

  removeXSmall: {
    fontSize: 16,
    color: "red",
    fontWeight: "700",
    paddingHorizontal: 6,
  },

  addBtn: { alignItems: "center", marginTop: 8 },

  addText: { color: "#007BFF", fontWeight: "600" },

  /** SERVICES */
  addServiceBtn: {
    borderWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 6,
    backgroundColor: "#fafafa",
  },

  addServiceText: {
    color: "#007BFF",
    fontWeight: "700",
  },

  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 10,
  },

  emojiBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
  },

  emojiText: {
    fontSize: 20,
  },

  // hidden input receives emoji (focus opens system emoji keyboard)
  hiddenEmojiInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
    left: -1000,
  },

  serviceNameInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 14,
  },

  /** SOCIAL GRID */
  socialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  socialGridBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1E1E1E",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    marginBottom: 8,
  },

  /** SOCIAL ROW */
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 10,
    gap: 10,
  },

  socialInputRow: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
  },
});

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Linking,
} from "react-native";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { API } from "../../api/api";

const placeholder = "https://via.placeholder.com/150";

export default function ServiceProviderProfile({ navigation }) {
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await API.get("/service-provider/me");
        setProvider(res.data.provider);
      } catch (err) {
        console.log("Error fetching profile:", err);
      }
    };

    fetchProfile();
    const unsubscribe = navigation.addListener("focus", fetchProfile);
    return unsubscribe;
  }, [navigation]);

  if (!provider) return null;

  const {
    fullName,
    username,
    profilePic,
    bio,
    contacts = [],
    socials = [],
    services = [],
    email,
  } = provider;

  // ---- Helpers ----
  const openUrl = (url) => {
    if (!url) return;
    Linking.openURL(url.startsWith("http") ? url : `https://${url}`);
  };

  const formatContact = (item) => {
    const [type, number, options] = item.split(":");
    return {
      number,
      allowCall: options?.includes("call"),
      allowSMS: options?.includes("sms"),
    };
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* SECTION 1 — TOP ROW */}
      <View style={styles.topRow}>
        <Text style={styles.title}>Service Provider</Text>

        <View style={styles.topRight}>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => navigation.navigate("ProviderSettings")}
          >
            <Feather name="settings" size={20} color="#2C6BED" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() =>
              navigation.navigate("EditProvider", {
                provider,
                focus: "general",
              })
            }
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SECTION 2 — PROFILE PIC + NAMES + BIO */}
      <View style={styles.centerBlock}>
        <Image
          source={{ uri: profilePic || placeholder }}
          style={styles.profilePic}
        />
        <Text style={styles.username}>@{username}</Text>
        <Text style={styles.fullName}>{fullName}</Text>

        {bio ? <Text style={styles.bio}>{bio}</Text> : null}
      </View>

      {/* SECTION 3 — CONTACTS */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Contacts</Text>

        {contacts.length === 0 ? (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() =>
              navigation.navigate("EditProvider", { provider, focus: "contacts" })
            }
          >
            <Text style={styles.addBtnText}>Add Phone Number</Text>
          </TouchableOpacity>
        ) : (
          contacts.map((raw, i) => {
            const c = formatContact(raw);
            return (
              <View key={i} style={styles.rowBetween}>
                <View style={styles.contactLeft}>
                  <FontAwesome name="phone" size={18} color="#2C6BED" />
                  <Text style={styles.contactText}>+255 {c.number}</Text>
                </View>

                <View style={styles.contactActions}>
                  {c.allowCall && (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`tel:+255${c.number}`)}
                    >
                      <Feather name="phone-call" size={20} color="#2C6BED" />
                    </TouchableOpacity>
                  )}

                  {c.allowSMS && (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`sms:+255${c.number}`)}
                    >
                      <Feather name="message-square" size={20} color="#2C6BED" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* SECTION 4 — EMAIL */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Email</Text>

        {email ? (
          <Text style={styles.email}>{email}</Text>
        ) : (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() =>
              navigation.navigate("EditProvider", { provider, focus: "email" })
            }
          >
            <Text style={styles.addBtnText}>Add Email</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* SECTION 5 — SERVICES */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Services</Text>

        {services.length === 0 ? (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() =>
              navigation.navigate("EditProvider", { provider, focus: "services" })
            }
          >
            <Text style={styles.addBtnText}>Add Service</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.chipWrap}>
            {services.map((item, i) => {
              const [icon, name] = item.split(":");
              return (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>{icon} {name}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* SECTION 6 — SOCIAL MEDIA */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Social Media</Text>

        {socials.length === 0 ? (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() =>
              navigation.navigate("EditProvider", { provider, focus: "socials" })
            }
          >
            <Text style={styles.addBtnText}>Add Social Media</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.socialGrid}>
            {socials.map((item, i) => {
              const [platform, handle] = item.split(":");
              return (
                <TouchableOpacity
                  key={i}
                  style={styles.socialIcon}
                  onPress={() => openUrl(handle)}
                >
                  <Feather name="link" size={22} color="#555" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#F8F9FB",
  },

  // TOP ROW
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  title: { fontSize: 22, fontWeight: "700" },

  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  settingsBtn: {
    backgroundColor: "#E8EEFF",
    padding: 8,
    borderRadius: 10,
  },

  editBtn: {
    backgroundColor: "#2C6BED",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
  },

  editBtnText: { color: "#fff", fontWeight: "700" },

  // PROFILE
  centerBlock: {
    alignItems: "center",
    marginBottom: 20,
  },

  profilePic: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
  },

  username: { color: "#777", fontSize: 14 },
  fullName: { fontSize: 20, fontWeight: "700", marginBottom: 6 },

  bio: {
    marginTop: 8,
    textAlign: "center",
    color: "#444",
    lineHeight: 20,
  },

  // CARDS
  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 12,
    marginBottom: 15,
  },

  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10 },

  // CONTACTS
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  contactLeft: { flexDirection: "row", alignItems: "center", gap: 10 },

  contactActions: { flexDirection: "row", gap: 14 },

  contactText: { fontSize: 15, color: "#333" },

  // EMAIL
  email: { fontSize: 16, color: "#444" },

  // BUTTONS
  addBtn: {
    backgroundColor: "#E8EEFF",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: "flex-start",
  },

  addBtnText: { color: "#2C6BED", fontWeight: "700" },

  // SERVICES
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  chip: {
    backgroundColor: "#E8EEFF",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },

  chipText: {
    color: "#2C6BED",
    fontWeight: "600",
  },

  // SOCIALS
  socialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },

  socialIcon: {
    backgroundColor: "#F2F4F7",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
});
 
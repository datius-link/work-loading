// MyProfile.js
// Service Provider Profile (read-only view)
// Clean, consistent phone formatting, realtime updates

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { API } from "../../api/api";
import io from "socket.io-client";
import { SOCIAL_ICONS } from "../../icons/socialIcons";

/* ================= CONFIG ================= */
const SOCKET_URL = "http://10.125.36.51:5000";

/* ================= PHONE HELPERS ================= */
/**
 * System rule:
 * - Backend stores phone as digits only (9 digits)
 * - UI adds +255 everywhere
 */
const normalizePhone = (phone = "") =>
  phone.replace(/\D/g, "").replace(/^255/, "");

const formatPhoneDisplay = (phone = "") =>
  `+255 ${normalizePhone(phone)}`;

const formatPhoneLink = (phone = "") =>
  `+255${normalizePhone(phone)}`;

/* ================= COMPONENT ================= */
export default function MyProfile({ navigation }) {
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ---------- LOAD PROFILE ---------- */
  const loadProfile = useCallback(async () => {
    try {
      setError(null);
      const res = await API.get("/service-provider/me");
      setProvider(res.data?.provider ?? null);
    } catch (err) {
      console.log("Profile load error:", err);
      setError("Failed to load profile");
      setProvider(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ---------- SOCKET ---------- */
  useEffect(() => {
    loadProfile();

    const socket = io(SOCKET_URL);
    socket.on("providerUpdated", loadProfile);

    return () => socket.disconnect();
  }, [loadProfile]);

  /* ---------- LINK HANDLER ---------- */
  const openUrl = async (url) => {
    try {
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
      }
    } catch (e) {
      console.log("Open URL error:", e);
    }
  };

  /* ================= STATES ================= */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0B6B63" />
      </View>
    );
  }

  if (error || !provider) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {error || "Profile not found"}
        </Text>
        <TouchableOpacity onPress={loadProfile} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ---------- DATA ---------- */
  const {
    fullName = "",
    username = "",
    bio = "",
    profilePic = "",
    contacts = [],
    services = [],
    socials = [],
  } = provider;

  /* ================= UI ================= */
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ---------- HEADER ---------- */}
      <View style={styles.header}>
        <Text style={styles.logo}>e-kazi</Text>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("ProviderSettings", { from: "MyProfile" })
          }
        >
          <FontAwesome5 name="cog" size={22} color="#0B6B63" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* ---------- PROFILE CARD ---------- */}
        <View style={styles.profileCard}>
          <Image
            source={{
              uri: profilePic || "https://via.placeholder.com/150",
            }}
            style={styles.avatar}
          />

          <Text style={styles.name}>
            {fullName || "Unnamed Provider"}
          </Text>

          {!!username && (
            <Text style={styles.username}>@{username}</Text>
          )}

          {!!bio && <Text style={styles.bio}>{bio}</Text>}

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate("EditProvider")}
          >
            <Text style={styles.editText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* ---------- CONTACTS ---------- */}
        <Section title="Contacts">
          {contacts.length === 0 ? (
            <Muted text="No contacts added" />
          ) : (
            contacts.map((c, i) => {
              const [, number, access] = c.split(":");

              return (
                <View key={i} style={styles.contactRow}>
                  <Text style={styles.contactText}>
                    {formatPhoneDisplay(number)}
                  </Text>

                  <View style={styles.contactActions}>
                    {access?.includes("call") && (
                      <TouchableOpacity
                        onPress={() =>
                          openUrl(`tel:${formatPhoneLink(number)}`)
                        }
                      >
                        <Text style={styles.actionIcon}>📞</Text>
                      </TouchableOpacity>
                    )}

                    {access?.includes("sms") && (
                      <TouchableOpacity
                        onPress={() =>
                          openUrl(`sms:${formatPhoneLink(number)}`)
                        }
                      >
                        <Text style={styles.actionIcon}>💬</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </Section>

        {/* ---------- SERVICES ---------- */}
        <Section title="Services">
          {services.length === 0 ? (
            <Muted text="No services added" />
          ) : (
            <View style={styles.chipsWrap}>
              {services.map((s, i) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>{s}</Text>
                </View>
              ))}
            </View>
          )}
        </Section>

        {/* ---------- SOCIAL MEDIA ---------- */}
        <Section title="Social Media">
          {socials.length === 0 ? (
            <Muted text="No social accounts added" />
          ) : (
            <View style={styles.socialGrid}>
              {socials.map((s, i) => {
                const [platform, handle] = s.split(":");
                const Icon = SOCIAL_ICONS[platform];
                if (!Icon) return null;

                const url = handle.startsWith("http")
                  ? handle
                  : `https://${platform}.com/${handle}`;

                return (
                  <TouchableOpacity
                    key={i}
                    style={styles.socialIcon}
                    onPress={() => openUrl(url)}
                  >
                    <Icon width={26} height={26} stroke="#4ECDC4" />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Section>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ================= SMALL COMPONENTS ================= */
const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const Muted = ({ text }) => (
  <Text style={styles.muted}>{text}</Text>
);

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4FFFD" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  errorText: { color: "#E74C3C", marginBottom: 10 },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#0B6B63",
  },
  retryText: { color: "#fff", fontWeight: "700" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#E4E4E4",
  },
  logo: { fontSize: 22, fontWeight: "800", color: "#0B6B63" },

  container: { padding: 18 },

  profileCard: {
    backgroundColor: "#E9F7F5",
    alignItems: "center",
    paddingVertical: 30,
    borderRadius: 16,
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#fff",
  },
  name: { fontSize: 24, fontWeight: "700", color: "#0B6B63", marginTop: 12 },
  username: { fontSize: 16, color: "#555", marginTop: 4 },
  bio: {
    marginTop: 12,
    paddingHorizontal: 30,
    textAlign: "center",
    color: "#444",
  },

  editBtn: {
    marginTop: 20,
    backgroundColor: "#0B6B63",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 30,
  },
  editText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  section: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E4E4E4",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0B6B63",
    marginBottom: 12,
  },
  muted: { color: "#777", fontStyle: "italic" },

  contactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  contactText: { fontSize: 16, fontWeight: "600", color: "#333" },
  contactActions: { flexDirection: "row", gap: 16 },
  actionIcon: { fontSize: 22, color: "#4ECDC4" },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    backgroundColor: "#E8F7F5",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  chipText: { color: "#0B6B63", fontWeight: "600" },

  socialGrid: { flexDirection: "row", flexWrap: "wrap", gap: 20 },
  socialIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E8F7F5",
    justifyContent: "center",
    alignItems: "center",
  },
});

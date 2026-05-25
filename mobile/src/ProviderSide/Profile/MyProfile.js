import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../api/api";
import { theme } from "../../theme";
import AppIcon from "../../icons/AppIcon";

export default function MyProfile({ navigation }) {
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState(null);

  /* ================= FETCH PROFILE ================= */
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/service-provider/me");

      if (!res?.data?.provider) {
        throw new Error("Invalid profile response");
      }

      setProvider(res.data.provider);
    } catch (err) {
      console.log("MyProfile error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load profile. Pull up later."
      );
      setProvider(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ================= LOAD ON TAB FOCUS ================= */
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  /* ================= ERROR ================= */
  if (error || !provider) {
    return (
      <SafeAreaView style={[styles.center, { paddingTop: insets.top }]}>
        <AppIcon name="warning" size={48} color={theme.colors.danger} />
        <Text style={styles.errorTitle}>Profile unavailable</Text>
        <Text style={styles.errorText}>{error}</Text>

        <TouchableOpacity style={styles.retryBtn} onPress={loadProfile}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  /* ================= SAFE DATA ================= */
  const {
    full_name = "",
    username = "",
    bio = "",
    profilePic = "",
    contacts = [],
    services = [],
    socials = [],
  } = provider;

  // Parse contacts from objects {number, call, sms}
  const parsedContacts = Array.isArray(contacts) ? contacts
    .filter(c => c?.number)
    .map(c => {
      const flags = [];
      if (c.call) flags.push("Call");
      if (c.sms) flags.push("SMS");
      return `+255 ${c.number}${flags.length > 0 ? ` (${flags.join(", ")})` : ""}`;
    }) : [];

  // Services are already array of strings
  const parsedServices = Array.isArray(services) ? services.filter(Boolean) : [];

  // Parse socials from objects {platform, handle}
  const parsedSocials = Array.isArray(socials) ? socials
    .filter(s => s?.handle)
    .map(s => `${s.platform}: @${s.handle}`)
    : [];

  /* ================= UI ================= */
  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>e-kazi</Text>
        <TouchableOpacity onPress={() => navigation.navigate("ProviderSettings")}>
          <AppIcon name="settings" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.card}>
          <Image
            source={{
              uri:
                profilePic ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  full_name || "User"
                )}&background=0D47A1&color=fff`,
            }}
            style={styles.avatar}
          />

          <Text style={styles.name}>{full_name || "No name"}</Text>
          {username ? <Text style={styles.username}>@{username}</Text> : null}

          <Text style={styles.bio}>
            {bio || "No bio yet. Add something cool."}
          </Text>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate("EditProvider")}
          >
            <AppIcon name="edit" size={14} color="#fff" />
            <Text style={styles.editText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Services */}
        <Section title="Services">
          {parsedServices.length === 0 ? (
            <Empty text="No services added" />
          ) : (
            parsedServices.map((s, i) => (
              <Chip key={i} label={s} />
            ))
          )}
        </Section>

        {/* Contacts */}
        <Section title="Contacts">
          {parsedContacts.length === 0 ? (
            <Empty text="No contacts available" />
          ) : (
            parsedContacts.map((c, i) => (
              <Text key={i} style={styles.listItem}>
                {c}
              </Text>
            ))
          )}
        </Section>

        {/* Socials */}
        <Section title="Socials">
          {parsedSocials.length === 0 ? (
            <Empty text="No socials linked" />
          ) : (
            parsedSocials.map((s, i) => (
              <Text key={i} style={styles.listItem}>
                {s}
              </Text>
            ))
          )}
        </Section>
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

const Empty = ({ text }) => (
  <Text style={styles.empty}>{text}</Text>
);

const Chip = ({ label }) => (
  <View style={styles.chip}>
    <Text style={styles.chipText}>{label}</Text>
  </View>
);

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  loadingText: { marginTop: 12, color: theme.colors.text },

  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 12,
  },
  errorText: {
    marginVertical: 12,
    textAlign: "center",
    color: theme.colors.textMuted,
  },

  retryBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: { color: "#fff", fontWeight: "700" },

  header: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  logo: { fontSize: 22, fontWeight: "800", color: theme.colors.primary },

  card: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 12,
  },
  name: { fontSize: 22, fontWeight: "700" },
  username: { color: theme.colors.textMuted },
  bio: { textAlign: "center", marginVertical: 12 },

  editBtn: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 20,
    marginTop: 8,
  },
  editText: { color: "#fff", fontWeight: "700" },

  section: { marginHorizontal: 16, marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },

  empty: { color: theme.colors.textMuted, fontStyle: "italic" },

  chip: {
    backgroundColor: theme.colors.border,
    padding: 10,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { fontWeight: "600", color: theme.colors.primary },

  listItem: { paddingVertical: 6 },
});

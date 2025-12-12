import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
  ActivityIndicator,
} from "react-native";

import { API } from "../../api/api";
import io from "socket.io-client";
import { SOCIAL_ICONS } from "../../icons/socialIcons";

const SOCKET_URL = "http://10.125.36.51:5000";

export default function MyProfile({ navigation }) {
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ---------------------- LOAD PROVIDER DATA ---------------------- */
  const loadProfile = async () => {
    try {
      const res = await API.get("/service-provider/me");
      setProvider(res.data.provider || null);
    } catch (err) {
      console.log("Profile load error:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  /* ---------------------- REAL-TIME SOCKET LISTENER ---------------------- */
  useEffect(() => {
    const setupSocket = async () => {
      try {
        const socket = io(SOCKET_URL);

        const res = await API.get("/service-provider/me");
        const userId = res.data.provider.user_id;

        socket.emit("join", userId);

        socket.on("providerUpdated", () => {
          console.log("🔥 Real-time update received → refreshing profile");
          loadProfile();
        });
      } catch (err) {
        console.log("Socket setup error:", err);
      }
    };

    setupSocket();
  }, []);

  /* ---------------------- LOADING UI ---------------------- */
  if (loading || !provider) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  /* ---------------------- PARSED FIELDS ---------------------- */
  const {
    fullName,
    username,
    bio,
    profilePic,
    contacts = [],
    socials = [],
    services = [],
  } = provider;

  /* ---------------------- OPEN LINK ---------------------- */
  const openUrl = async (url) => {
    try {
      if (await Linking.canOpenURL(url)) Linking.openURL(url);
    } catch (err) {
      console.log("URL open error:", err);
    }
  };

  /* ---------------------- UI ---------------------- */
  return (
    <ScrollView style={styles.container}>
      {/* PROFILE HEADER */}
      <View style={styles.header}>
        <Image
          source={{
            uri: profilePic || "https://via.placeholder.com/150",
          }}
          style={styles.profileImage}
        />

        <Text style={styles.name}>{fullName}</Text>
        <Text style={styles.username}>@{username}</Text>

        {bio ? <Text style={styles.bio}>{bio}</Text> : null}

        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate("EditProvider", { provider })}
        >
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* CONTACTS */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Contacts</Text>

        {contacts.length === 0 ? (
          <Text style={{ color: "#777" }}>No contacts added</Text>
        ) : (
          contacts.map((item, i) => {
            const [_, number, access] = item.split(":");

            return (
              <View style={styles.contactRow} key={i}>
                <Text style={styles.contactText}>+255 {number}</Text>

                <View style={styles.contactIcons}>
                  {access?.includes("call") && (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`tel:+255${number}`)}
                    >
                      <Text style={styles.callIcon}>📞</Text>
                    </TouchableOpacity>
                  )}

                  {access?.includes("sms") && (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`sms:+255${number}`)}
                    >
                      <Text style={styles.smsIcon}>💬</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* SERVICES */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Services</Text>

        {services.length === 0 ? (
          <Text style={{ color: "#777" }}>No services added</Text>
        ) : (
          <View style={styles.chipWrap}>
            {services.map((serviceName, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>{serviceName}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* SOCIAL MEDIA */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Social Media</Text>

        {socials.length === 0 ? (
          <Text style={{ color: "#777" }}>No social accounts added</Text>
        ) : (
          <View style={styles.socialGrid}>
            {socials.map((item, i) => {
              const platform = item.split(":")[0];
              const link = item.substring(item.indexOf(":") + 1);

              const IconComponent = SOCIAL_ICONS[platform];

              if (!IconComponent) return null;

              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => openUrl(link)}
                  style={styles.socialIcon}
                >
                  <IconComponent width={26} height={26} stroke="#007BFF" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

/* ---------------------- STYLES ---------------------- */
const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F5F6FA",
    flex: 1,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "#fff",
    marginBottom: 12,
  },

  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#ddd",
  },

  name: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 12,
  },

  username: {
    fontSize: 15,
    color: "#555",
    marginTop: 3,
  },

  bio: {
    marginTop: 10,
    paddingHorizontal: 25,
    textAlign: "center",
    color: "#666",
  },

  editBtn: {
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#007BFF",
    borderRadius: 25,
  },

  editBtnText: {
    color: "#fff",
    fontWeight: "700",
  },

  card: {
    backgroundColor: "#fff",
    padding: 18,
    marginHorizontal: 14,
    borderRadius: 10,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 10,
  },

  contactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  contactText: {
    fontSize: 15,
    fontWeight: "600",
  },

  contactIcons: {
    flexDirection: "row",
    alignItems: "center",
  },

  callIcon: {
    fontSize: 20,
    color: "#007BFF",
  },

  smsIcon: {
    fontSize: 20,
    color: "#007BFF",
    marginLeft: 12,
  },

  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: "#E8F0FF",
    borderRadius: 20,
  },

  chipText: {
    color: "#0366FF",
    fontWeight: "600",
  },

  socialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
    marginTop: 10,
  },

  socialIcon: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#E8F0FF",
    justifyContent: "center",
    alignItems: "center",
  },
});
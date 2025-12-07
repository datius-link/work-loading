import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from "react-native";
import { Feather, FontAwesome, MaterialCommunityIcons } from "@expo/vector-icons";

export default function ServiceProviderHeader({
  provider,
  onEdit,
  onSettings,
}) {
  if (!provider) return null;

  const {
    username,
    fullName,
    profilePic,
    services = [],
    contacts = [],
    socials = [],
    bio,
  } = provider;

  // ----------------------------
  // PARSE CONTACTS FORMAT
  // Format inside DB is:
  // phone:value:call,sms
  // ----------------------------
  const formatContact = (item) => {
    const [type, number, options] = item.split(":");
    const allowCall = options?.includes("call");
    const allowSMS = options?.includes("sms");

    return {
      type,
      number,
      allowCall,
      allowSMS,
    };
  };

  // ----------------------------
  // SOCIAL PLATFORM ICONS
  // ----------------------------
  const socialIcons = {
    instagram: <FontAwesome name="instagram" size={24} color="#E1306C" />,
    facebook: <FontAwesome name="facebook" size={24} color="#1877F2" />,
    youtube: <FontAwesome name="youtube-play" size={24} color="red" />,
    twitter: <FontAwesome name="twitter" size={24} color="#1DA1F2" />,
    threads: <MaterialCommunityIcons name="at" size={24} color="black" />,
  };

  const openSocial = (platform, handle) => {
    if (!handle) return;

    let url = handle;

    // Auto add https:// if missing
    if (!url.startsWith("http")) url = "https://" + url;

    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>

      {/* Title + Settings */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>Service Provider</Text>

        <TouchableOpacity style={styles.settingsBtn} onPress={onSettings}>
          <Feather name="settings" size={22} color="#2C6BED" />
        </TouchableOpacity>
      </View>

      <View style={styles.mainRow}>

        {/* LEFT SIDE */}
        <View style={styles.leftColumn}>
          {username ? <Text style={styles.username}>@{username}</Text> : null}
          {fullName ? <Text style={styles.fullName}>{fullName}</Text> : null}

          {/* Services */}
          {services.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Services Provided</Text>
              <View style={styles.serviceList}>
                {services.map((item, i) => {
                  const [icon, name] = item.split(":");
                  return (
                    <View key={i} style={styles.serviceTag}>
                      <Text style={styles.serviceTagText}>{icon} {name}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Contacts */}
          {contacts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contacts</Text>

              {contacts.map((raw, i) => {
                const c = formatContact(raw);

                return (
                  <View key={i} style={styles.contactRow}>
                    {/* Icon */}
                    <FontAwesome name="phone" size={18} color="#2C6BED" />

                    <Text style={styles.contactText}>+255 {c.number}</Text>

                    {/* Call button */}
                    {c.allowCall && (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`tel:+255${c.number}`)}
                      >
                        <Feather name="phone-call" size={20} color="#2C6BED" />
                      </TouchableOpacity>
                    )}

                    {/* SMS button */}
                    {c.allowSMS && (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`sms:+255${c.number}`)}
                        style={{ marginLeft: 10 }}
                      >
                        <Feather name="message-square" size={20} color="#2C6BED" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Social Media */}
          {socials.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Social Media</Text>

              <View style={styles.socialGrid}>
                {socials.map((item, i) => {
                  const [platform, handle] = item.split(":");

                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => openSocial(platform, handle)}
                      style={styles.socialIconBtn}
                    >
                      {socialIcons[platform] || (
                        <Feather name="link" size={22} color="#555" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* RIGHT SIDE - Profile Pic only */}
        <View style={styles.rightColumn}>
          <Image source={{ uri: profilePic }} style={styles.profilePic} />

          {/* Edit Profile */}
          <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
            <Text style={styles.editText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 16,
    elevation: 3,
    marginBottom: 25,
  },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  title: { fontSize: 20, fontWeight: "700" },

  settingsBtn: {
    backgroundColor: "#E8EEFF",
    padding: 8,
    borderRadius: 10,
  },

  mainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  leftColumn: { flex: 1, paddingRight: 15 },

  username: { color: "#888" },

  fullName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },

  section: { marginTop: 12 },

  sectionTitle: {
    fontWeight: "700",
    marginBottom: 4,
  },

  /* Services */
  serviceList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  serviceTag: {
    backgroundColor: "#E8EEFF",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },

  serviceTagText: {
    fontWeight: "600",
    color: "#2C6BED",
  },

  /* Contacts */
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 5,
  },

  contactText: {
    fontSize: 14,
    color: "#444",
    flex: 1,
  },

  /* Socials */
  socialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 6,
  },

  socialIconBtn: {
    backgroundColor: "#F2F4F7",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },

  /* Right Column */
  rightColumn: { width: 150, alignItems: "center" },

  profilePic: {
    width: 110,
    height: 110,
    borderRadius: 60,
    marginBottom: 10,
  },

  editBtn: {
    backgroundColor: "#2C6BED",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },

  editText: {
    color: "white",
    fontWeight: "700",
  },
});

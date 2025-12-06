import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";

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
    teammates = [],
    bio,
  } = provider;

  return (
    <View style={styles.container}>

      {/* TITLE + SETTINGS */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>Service Provider</Text>

        <TouchableOpacity style={styles.settingsBtn} onPress={onSettings}>
          <Feather name="settings" size={20} color="#2C6BED" />
        </TouchableOpacity>
      </View>

      {/* MAIN PROFILE SECTION */}
      <View style={styles.mainRow}>

        {/* LEFT SIDE */}
        <View style={styles.leftColumn}>
          {/* Username */}
          {username && (
            <Text style={styles.username}>@{username}</Text>
          )}

          {/* Full Name */}
          {fullName && (
            <Text style={styles.fullName}>{fullName}</Text>
          )}

          {/* Services Provided */}
          {services.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Services Provided</Text>

              <View style={styles.tagsRow}>
                {services.map((item, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Contacts */}
          {contacts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contacts</Text>
              {contacts.map((item, index) => (
                <Text key={index} style={styles.sectionItem}>• {item}</Text>
              ))}
            </View>
          )}

          {/* Social Media */}
          {socials.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Social Media</Text>
              {socials.map((item, index) => (
                <Text key={index} style={styles.sectionItem}>• {item}</Text>
              ))}
            </View>
          )}
        </View>

        {/* RIGHT SIDE */}
        <View style={styles.rightColumn}>

          {/* Profile Picture */}
          <Image
            source={{ uri: profilePic }}
            style={styles.profilePic}
          />

          <TouchableOpacity style={styles.uploadBtn}>
            <Text style={styles.uploadText}>Change Photo</Text>
          </TouchableOpacity>

          {/* Team Members */}
          {teammates.length > 0 && (
            <View style={styles.teamSection}>
              <Text style={styles.sectionTitleSmall}>Team Members</Text>

              <View style={styles.teamRow}>
                {teammates.map((member, index) => (
                  <Image
                    key={index}
                    source={{ uri: member }}
                    style={styles.teamPic}
                  />
                ))}
              </View>
            </View>
          )}

          {/* BIO */}
          {bio && (
            <Text style={styles.bioText}>{bio}</Text>
          )}

          {/* EDIT PROFILE */}
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
    borderRadius: 14,
    elevation: 3,
    marginBottom: 20,
  },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
  },

  settingsBtn: {
    backgroundColor: "#E8EEFF",
    padding: 8,
    borderRadius: 8,
  },

  mainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  leftColumn: {
    flex: 1,
    paddingRight: 20,
  },

  username: {
    fontSize: 15,
    color: "#6a6a6a",
  },

  fullName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },

  section: {
    marginBottom: 16,
  },

  sectionTitle: {
    fontWeight: "700",
    marginBottom: 6,
  },

  sectionItem: {
    fontSize: 14,
    color: "#555",
  },

  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  tag: {
    backgroundColor: "#E8EEFF",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },

  tagText: {
    color: "#2C6BED",
    fontWeight: "600",
  },

  rightColumn: {
    width: 150,
    alignItems: "center",
  },

  profilePic: {
    width: 110,
    height: 110,
    borderRadius: 60,
    marginBottom: 10,
  },

  uploadBtn: {
    backgroundColor: "#2C6BED",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 15,
  },

  uploadText: {
    color: "white",
    fontSize: 13,
  },

  teamSection: {
    marginBottom: 15,
  },

  sectionTitleSmall: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },

  teamRow: {
    flexDirection: "row",
    gap: 6,
  },

  teamPic: {
    width: 35,
    height: 35,
    borderRadius: 20,
    backgroundColor: "#ddd",
  },

  bioText: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginBottom: 15,
  },

  editBtn: {
    backgroundColor: "#2C6BED",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },

  editText: {
    color: "white",
    fontWeight: "700",
  },
});

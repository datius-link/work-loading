import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { API } from "../../../api/api";

export default function EditProvider({ route, navigation }) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [contacts, setContacts] = useState("");
  const [socials, setSocials] = useState("");
  const [services, setServices] = useState("");
  const [profilePic, setProfilePic] = useState("");

  const [loading, setLoading] = useState(false);

  // Load current provider data
  useEffect(() => {
    (async () => {
      try {
        const res = await API.get("/service-provider/me");
        const p = res.data.provider;

        setFullName(p.fullName || "");
        setUsername(p.username || "");
        setBio(p.bio || "");
        setContacts((p.contacts || []).join(", "));
        setSocials((p.socials || []).join(", "));
        setServices((p.services || []).join(", "));
        setProfilePic(p.profilePic || "");
      } catch (err) {
        console.log("Load profile error:", err);
      }
    })();
  }, []);

  const handleSave = async () => {
    setLoading(true);

    try {
      await API.put("/service-provider/update", {
        fullName,
        username,
        bio,
        contacts: contacts.split(",").map((i) => i.trim()),
        socials: socials.split(",").map((i) => i.trim()),
        services: services.split(",").map((i) => i.trim()),
        profilePic,
      });

      setLoading(false);

      navigation.goBack(); // return to profile
    } catch (err) {
      setLoading(false);
      console.log("Update error:", err);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Edit Your Profile</Text>

      <Text style={styles.label}>Full Name</Text>
      <TextInput
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
      />

      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
      />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, { height: 90 }]}
        value={bio}
        onChangeText={setBio}
        multiline
      />

      <Text style={styles.label}>Contacts (comma separated)</Text>
      <TextInput
        style={styles.input}
        value={contacts}
        onChangeText={setContacts}
        placeholder="0712..., email..., etc"
      />

      <Text style={styles.label}>Socials (comma separated)</Text>
      <TextInput
        style={styles.input}
        value={socials}
        onChangeText={setSocials}
        placeholder="@instagram, @tiktok"
      />

      <Text style={styles.label}>Services (comma separated)</Text>
      <TextInput
        style={styles.input}
        value={services}
        onChangeText={setServices}
        placeholder="Plumbing, Welding, Security"
      />

      <Text style={styles.label}>Profile Picture URL</Text>
      <TextInput
        style={styles.input}
        value={profilePic}
        onChangeText={setProfilePic}
        placeholder="https://..."
      />

      <TouchableOpacity
        style={styles.saveBtn}
        onPress={handleSave}
        disabled={loading}
      >
        <Text style={styles.saveText}>
          {loading ? "Saving..." : "Save Changes"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    marginTop: 10,
    marginBottom: 4,
    color: "#555",
  },

  input: {
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },

  saveBtn: {
    backgroundColor: "#2C6BED",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 30,
  },

  saveText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

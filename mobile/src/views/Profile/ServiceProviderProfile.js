import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  Image,
  TouchableOpacity,
} from "react-native";

import ServiceProviderHeader from "./components/ServiceProviderHeader";
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

  // Refresh when screen gains focus
  const unsubscribe = navigation.addListener("focus", fetchProfile);

  return unsubscribe;
}, [navigation]);


  // 🛡️ Safe fallback provider to avoid crashes
  const safeProvider = {
    id: provider?.id ?? null,
    username: provider?.username ?? "loading...",
    fullName: provider?.fullName ?? "loading...",
    profilePic: provider?.profilePic ?? placeholder,
    services: provider?.services ?? [],
    contacts: provider?.contacts ?? [],
    socials: provider?.socials ?? [],
    teammates: provider?.teammates ?? [],
    bio: provider?.bio ?? "",
    posts: provider?.posts ?? [], // 🛠️ prevents undefined.length crash
    staffCount: provider?.staffCount ?? 0,
  };

  // -------------------------------------------------------------
  // SERVICES SECTION
  // -------------------------------------------------------------
  const renderServicesSection = () => {
    if (!safeProvider.services || safeProvider.services.length === 0) {
      return (
        <View style={styles.emptyStateBox}>
          <Text style={styles.emptyStateText}>
            No services listed yet. Add some to get started!
          </Text>

          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={() =>
              navigation.navigate("AddService", { providerId: safeProvider.id })
            }
          >
            <Text style={styles.buttonPrimaryText}>Add Service</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Services</Text>
        <View style={styles.divider} />

        {safeProvider.services.map((service, index) => (
          <View key={index} style={styles.cardRow}>
            <Text style={styles.cardText}>{service}</Text>
          </View>
        ))}
      </View>
    );
  };

  // -------------------------------------------------------------
  // STAFF SECTION
  // -------------------------------------------------------------
  const renderStaffSection = () => {
    if (!safeProvider.staffCount || safeProvider.staffCount === 0) {
      return (
        <View style={styles.emptyStateBox}>
          <Text style={styles.emptyStateText}>
            No staff members yet. Add staff to your team.
          </Text>

          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={() =>
              navigation.navigate("AddStaff", { providerId: safeProvider.id })
            }
          >
            <Text style={styles.buttonPrimaryText}>Add Staff</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Text style={styles.sectionTitle}>Team</Text>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("ManageStaff", {
                providerId: safeProvider.id,
              })
            }
          >
            <Text style={{ color: "#2C6BED", fontSize: 14 }}>Manage</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.cardText}>
          Total Staff: {safeProvider.staffCount}
        </Text>
      </View>
    );
  };

  // -------------------------------------------------------------
  // POSTS SECTION
  // -------------------------------------------------------------
  const renderPostsSection = () => {
    if (!safeProvider.posts || safeProvider.posts.length === 0) {
      return (
        <View style={styles.emptyStateBox}>
          <Text style={styles.emptyStateText}>
            No posts yet. Share updates with your clients!
          </Text>

          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={() =>
              navigation.navigate("CreatePost", { providerId: safeProvider.id })
            }
          >
            <Text style={styles.buttonPrimaryText}>Create Post</Text>
          </TouchableOpacity>
        </View>
      );
    }


    const { provider } = route.params;

    useEffect(() => {
      if (provider) {
        setFullName(provider.fullName);
        setUsername(provider.username);
        setBio(provider.bio);
        setContacts(provider.contacts.join(", "));
        setSocials(provider.socials.join(", "));
        setServices(provider.services.join(", "));
        setProfilePic(provider.profilePic);
      }
    }, []);


    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recent Posts</Text>
        <View style={styles.divider} />

        {safeProvider.posts.slice(0, 3).map((post, index) => (
          <View key={index} style={styles.postCard}>
            <Text style={styles.postTitle}>{post.title}</Text>
            <Text style={styles.postDescription}>{post.description}</Text>

            {post.image && (
              <Image
                source={{ uri: post.image }}
                style={styles.postImage}
              />
            )}
          </View>
        ))}
      </View>
    );
  };

  // -------------------------------------------------------------
  // MAIN JSX
  // -------------------------------------------------------------
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ServiceProviderHeader
        provider={safeProvider}

        onEdit={() =>
          navigation.navigate("EditProvider", { provider: safeProvider })
        }

        onSettings={() => navigation.navigate("ProviderSettings")}
        onCall={(phone) => Linking.openURL(`tel:${phone}`)}
        onEmail={(email) => Linking.openURL(`mailto:${email}`)}
        onMessage={() =>
          provider &&
          navigation.navigate("ProviderChat", { id: provider.id })
        }
      />

      {renderServicesSection()}
      {renderStaffSection()}
      {renderPostsSection()}
    </ScrollView>
  );
}

// -------------------------------------------------------------
// STYLES
// -------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#F8F9FB",
    flexGrow: 1,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 10,
    color: "#1A1A1A",
  },

  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 12,
    marginTop: 15,
    marginBottom: 16,
    elevation: 2,
  },

  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  cardText: {
    fontSize: 15,
    color: "#444",
    marginBottom: 6,
  },

  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 10,
  },

  buttonPrimary: {
    backgroundColor: "#2C6BED",
    paddingVertical: 14,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },

  buttonPrimaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  emptyStateBox: {
    padding: 30,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 10,
    alignItems: "center",
  },

  emptyStateText: {
    fontSize: 16,
    color: "#777",
    textAlign: "center",
  },

  postCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },

  postTitle: {
    fontSize: 16,
    fontWeight: "700",
  },

  postDescription: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
  },

  postImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginTop: 10,
  },
});

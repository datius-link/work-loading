import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { API } from "../../api/api";
import { theme } from "../../theme/theme";

const { width } = Dimensions.get("window");
const GRID_SIZE = width / 3;

export default function MyWork({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("Moments");

  // placeholder
  const posts = [];

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await API.get("/service-provider/me");
      setProfile(res.data?.provider ?? null);
    } catch (e) {
      console.log("MyWork profile error:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ===== HEADER ROW ===== */}
      <View style={styles.headerRow}>
        {/* LEFT: ENGAGEMENT + PICKS */}
        <View style={styles.leftColumn}>
          <TouchableOpacity
            onPress={() => navigation.navigate("EngagementSummary")}
          >
            <Text style={styles.engagementTitle}>Engagements</Text>
            <Text style={styles.engagementLink}>View summary</Text>
          </TouchableOpacity>

          <View style={styles.picksRow}>
            <TouchableOpacity
              style={styles.pickBtn}
              onPress={() =>
                navigation.navigate("PicksScreen", { type: "my" })
              }
            >
              <Text style={styles.pickCount}>0</Text>
              <Text style={styles.pickLabel}>My Picks</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickBtn}
              onPress={() =>
                navigation.navigate("PicksScreen", { type: "pickedMe" })
              }
            >
              <Text style={styles.pickCount}>0</Text>
              <Text style={styles.pickLabel}>Picked Me</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* RIGHT: BIG PROFILE PIC */}
        <TouchableOpacity
          onPress={() => navigation.navigate("MyProfile")}
        >
          <Image
            source={{
              uri:
                profile?.profilePic ||
                "https://ui-avatars.com/api/?background=6D5AE6&color=fff&size=256",
            }}
            style={styles.profilePic}
          />
        </TouchableOpacity>
      </View>

      {/* ===== POST ACTION ===== */}
      <TouchableOpacity
        style={styles.postBtn}
        onPress={() => navigation.navigate("CreatePost")}
      >
        <Text style={styles.postBtnText}>+ Post something</Text>
      </TouchableOpacity>

      {/* ===== POSTS TOP BAR ===== */}
      <View style={styles.tabs}>
        {["Moments", "Clips"].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.tabBtn,
              activeTab === tab && styles.tabActive,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ===== POSTS GRID ===== */}
      {posts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptyText}>
            Start sharing moments or clips.
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          numColumns={3}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Image source={{ uri: item.media }} style={styles.gridItem} />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    paddingHorizontal: theme.spacing.lg,
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  /* HEADER */
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },

  leftColumn: {
    flex: 1,
    paddingRight: theme.spacing.md,
  },

  engagementTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.text,
  },

  engagementLink: {
    fontSize: 13,
    color: theme.colors.primary,
    marginTop: 2,
    fontWeight: "600",
  },

  picksRow: {
    flexDirection: "row",
    marginTop: theme.spacing.md,
  },

  pickBtn: {
    marginRight: theme.spacing.lg,
  },

  pickCount: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.text,
  },

  pickLabel: {
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 2,
  },

  profilePic: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },

  /* POST BUTTON */
  postBtn: {
    backgroundColor: theme.colors.text,
    borderRadius: theme.radius.pill,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },

  postBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  /* TABS */
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },

  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: theme.spacing.md,
  },

  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.primary,
  },

  tabText: {
    fontSize: 16,
    color: theme.colors.muted,
    fontWeight: "600",
  },

  tabTextActive: {
    color: theme.colors.text,
    fontWeight: "700",
  },

  /* GRID */
  gridItem: {
    width: GRID_SIZE,
    height: GRID_SIZE,
  },

  /* EMPTY */
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 15,
    color: theme.colors.muted,
    textAlign: "center",
  },
});

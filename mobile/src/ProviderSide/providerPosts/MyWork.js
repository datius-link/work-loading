import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

const API_BASE_URL = "https://api.yourapp.com";

export default function MyWork({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [picks, setPicks] = useState({
    myPicks: 0,
    pickedMe: 0,
  });

useFocusEffect(
  React.useCallback(() => {
    loadData();
  }, [])
);


  const loadData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      await Promise.all([
        fetchProfile(token),
        fetchPicksSummary(token),
      ]);
    } catch (err) {
      console.log("MyWork load error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- API CALLS ---------------- */

  const fetchProfile = async (token) => {
    const res = await fetch(`${API_BASE_URL}/me/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const json = await res.json();
    setProfile(json);
  };

  const fetchPicksSummary = async (token) => {
    const res = await fetch(`${API_BASE_URL}/me/picks/summary`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const json = await res.json();
    setPicks(json);
  };

  /* ---------------- UI ---------------- */

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="small" color="#111" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate("EngagementSummary")}
        >
          <Text style={styles.title}>Engagements</Text>
          <Text style={styles.subtitle}>View summary</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("MyProfile")}
        >
          <Image
            source={{
              uri:
                profile?.profile_pic ||
                "https://ui-avatars.com/api/?background=ddd",
            }}
            style={styles.avatar}
          />
        </TouchableOpacity>
      </View>

      {/* ===== PICKS ===== */}
      <View style={styles.picksRow}>
        <TouchableOpacity
          style={styles.pickItem}
          onPress={() =>
            navigation.navigate("PicksScreen", { tab: "my" })
          }
        >
          <Text style={styles.pickLabel}>My Picks</Text>
          <Text style={styles.pickCount}>{picks.myPicks}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pickItem}
          onPress={() =>
            navigation.navigate("PicksScreen", { tab: "picked" })
          }
        >
          <Text style={styles.pickLabel}>Picked Me</Text>
          <Text style={styles.pickCount}>{picks.pickedMe}</Text>
        </TouchableOpacity>
      </View>

      {/* ===== CREATE POST ===== */}
      <TouchableOpacity
        style={styles.postBtn}
        onPress={() => navigation.navigate("CreatePost")}
      >
        <Text style={styles.postBtnText}>+ Post something</Text>
      </TouchableOpacity>

      {/* POSTS FEED COMES BELOW */}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#FFFFFF",
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
  },

  subtitle: {
    fontSize: 13,
    color: "#777",
    marginTop: 2,
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },

  picksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },

  pickItem: {
    alignItems: "center",
    flex: 1,
  },

  pickLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },

  pickCount: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    marginTop: 4,
  },

  postBtn: {
    marginTop: 24,
    width: "100%",
    backgroundColor: "#111",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  postBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

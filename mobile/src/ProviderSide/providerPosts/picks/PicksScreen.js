import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BackIcon from "../../../icons/huge/back-navigation.svg";

const Tab = createMaterialTopTabNavigator();
const API_BASE_URL = "https://api.yourapp.com";

export default function PicksScreen({ navigation }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Custom top */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() =>
            navigation.canGoBack()
              ? navigation.goBack()
              : navigation.navigate("PostsHome")
          }
        >
          <BackIcon width={24} height={24} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Connections</Text>
      </View>

      <Tab.Navigator
        screenOptions={{
          tabBarIndicatorStyle: styles.indicator,
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tab.Screen name="My Picks">
          {() => <PicksList type="my" />}
        </Tab.Screen>

        <Tab.Screen name="Picked Me">
          {() => <PicksList type="picked" />}
        </Tab.Screen>
      </Tab.Navigator>
    </View>
  );
}

/* ---------- LIST ---------- */

function PicksList({ type }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    const res = await fetch(
      `${API_BASE_URL}/me/picks?type=${type}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const json = await res.json();
    setData(json);
  };

  if (!data) {
    return <ActivityIndicator style={{ marginTop: 40 }} />;
  }

  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>
          {type === "my" ? "No picks yet" : "No one has picked you yet"}
        </Text>
        <Text style={styles.emptyText}>
          {type === "my"
            ? "When you pick people, they will appear here."
            : "When people pick you, they will appear here."}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.userRow}>
          <Image source={{ uri: item.profile_pic }} style={styles.avatar} />
          <View>
            <Text style={styles.name}>{item.full_name}</Text>
            <Text style={styles.username}>@{item.username}</Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  topTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  indicator: {
    backgroundColor: "#111",
    height: 3,
  },
  tabLabel: {
    fontWeight: "700",
    textTransform: "none",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  name: {
    fontWeight: "700",
    fontSize: 15,
  },
  username: {
    fontSize: 13,
    color: "#777",
  },
  empty: {
    padding: 40,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    color: "#666",
    textAlign: "center",
  },
});

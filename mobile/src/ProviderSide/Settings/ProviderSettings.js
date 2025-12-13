import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";

export default function ProviderSettings({ navigation, route }) {
  const from = route.params?.from || "Others";

  const handleBack = () => {
    navigation.replace("ProviderTabs", {
      screen: from === "MyProfile" ? "MyProfile" : "Others",
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <FontAwesome5 name="arrow-left" size={20} color="#0B6B63" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 20 }} />
      </View>

      {/* BODY */}
      <View style={styles.body}>
        <TouchableOpacity style={styles.row}>
          <FontAwesome5 name="bell" size={18} color="#0B6B63" />
          <Text style={styles.text}>Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row}>
          <FontAwesome5 name="lock" size={18} color="#0B6B63" />
          <Text style={styles.text}>Security</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row}>
          <FontAwesome5 name="user-slash" size={18} color="#E74C3C" />
          <Text style={[styles.text, { color: "#E74C3C" }]}>
            Deactivate Account
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row}>
          <FontAwesome5 name="sign-out-alt" size={18} color="#E74C3C" />
          <Text style={[styles.text, { color: "#E74C3C" }]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F4FFFD",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0B6B63",
  },
  body: {
    padding: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
});

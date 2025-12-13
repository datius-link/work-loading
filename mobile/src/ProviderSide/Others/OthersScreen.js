import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";

export default function OthersScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Others</Text>

        {/* My Activities */}
        <TouchableOpacity style={styles.row}>
          <FontAwesome5 name="history" size={18} color="#0B6B63" />
          <Text style={styles.text}>My Activities</Text>
        </TouchableOpacity>

        {/* Settings */}
        <TouchableOpacity
          style={styles.row}
          onPress={() =>
            navigation.navigate("ProviderSettings", {
              from: "Others",
            })
          }
        >
          <FontAwesome5 name="cog" size={18} color="#0B6B63" />
          <Text style={styles.text}>Settings</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Placeholder for future */}
        <TouchableOpacity style={styles.row}>
          <FontAwesome5 name="question-circle" size={18} color="#777" />
          <Text style={[styles.text, { color: "#777" }]}>
            Help & Support
          </Text>
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
  container: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0B6B63",
    marginBottom: 20,
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
  divider: {
    height: 20,
  },
});

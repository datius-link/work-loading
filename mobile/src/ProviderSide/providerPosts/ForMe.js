import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function ForMe() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>For Me</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F6FA",
  },
  text: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
});

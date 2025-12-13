import { View, Text } from "react-native";

export default function Activities() {
  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Activities</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>
        Alerts, requests, and messages will appear here.
      </Text>
    </View>
  );
}

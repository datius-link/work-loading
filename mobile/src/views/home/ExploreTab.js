import { View, Text } from "react-native";

export default function ExploreTab() {
  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>Explore</Text>
      <Text style={{ marginTop: 6, color: "#666" }}>
        Search services, categories and locations.
      </Text>
    </View>
  );
}

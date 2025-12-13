import { View, Text } from "react-native";

export default function FeedTab() {
  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>Feed</Text>
      <Text style={{ marginTop: 6, color: "#666" }}>
        Provider posts, works & highlights will appear here.
      </Text>
    </View>
  );
}

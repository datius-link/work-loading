import { View, Text, TouchableOpacity } from "react-native";

export default function MyJobs() {
  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>My Jobs</Text>

      <Text style={{ marginTop: 8, color: "#666" }}>
        Jobs you’ve posted will appear here.
      </Text>

      <TouchableOpacity
        style={{
          marginTop: 20,
          backgroundColor: "#0B6B63",
          paddingVertical: 14,
          borderRadius: 10,
        }}
      >
        <Text
          style={{
            color: "#fff",
            textAlign: "center",
            fontWeight: "700",
            fontSize: 16,
          }}
        >
          Post a Job
        </Text>
      </TouchableOpacity>
    </View>
  );
}

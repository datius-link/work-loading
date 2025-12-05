import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";

export default function Home() {
  return (
    <ScrollView style={styles.container}>

      {/* Stories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.storiesContainer}
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <View key={i} style={styles.storyBubble}>
            <Text style={styles.storyText}>Story {i + 1}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Choose staff button */}
      <TouchableOpacity style={styles.staffButton}>
        <Text style={styles.staffButtonText}>CHOOSE YOUR STAFF</Text>
      </TouchableOpacity>

      {/* Workspace area */}
      <View style={styles.workspace}>
        <Text style={styles.workspaceTitle}>Workspace Area</Text>
        <Text style={{ color: "#666" }}>Posts will appear here…</Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
  },

  /** STORIES **/
  storiesContainer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  storyBubble: {
    width: 70,
    height: 70,
    backgroundColor: "#e8e8e8",
    borderRadius: 40,
    marginRight: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  storyText: {
    fontSize: 12,
    color: "#333",
  },

  /** CHOOSE STAFF BUTTON **/
  staffButton: {
    backgroundColor: "#0b7cff",
    marginHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
  },
  staffButtonText: {
    textAlign: "center",
    color: "#fff",
    fontWeight: "bold",
    letterSpacing: 0.6,
  },

  /** WORKSPACE **/
  workspace: {
    backgroundColor: "#fff",
    padding: 20,
    marginHorizontal: 15,
    borderRadius: 12,
    elevation: 1,
    marginBottom: 30,
  },
  workspaceTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
});

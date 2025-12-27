import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from "react-native";

/**
 * MyJobs
 * ----------------------------
 * Screen for SERVICE PROVIDERS
 * Shows jobs that have been assigned / hired directly
 * ❌ No "Post a Job"
 * ❌ No Light Login
 * ❌ No Modals
 */

export default function MyJobs() {
  // For now: empty list (later from backend)
  const jobs = [];

  const renderJob = ({ item }) => (
    <View style={styles.jobCard}>
      <Text style={styles.jobTitle}>{item.title}</Text>
      <Text style={styles.jobMeta}>{item.location}</Text>
      <Text style={styles.jobStatus}>Active</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>My Jobs</Text>
          <Text style={styles.subtitle}>
            Jobs you’ve been hired for will appear here
          </Text>
        </View>

        {/* JOB LIST */}
        <FlatList
          data={jobs}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderJob}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No jobs yet</Text>
              <Text style={styles.emptyText}>
                When a client hires you directly, the job will show up here
              </Text>
            </View>
          }
          contentContainerStyle={{ flexGrow: 1 }}
        />
      </View>
    </SafeAreaView>
  );
}

/* -----------------------------
 * STYLES
 * ----------------------------- */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F4FFFD",
  },

  container: {
    flex: 1,
    backgroundColor: "#F4FFFD",
  },

  /* HEADER */
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#EAEAEA",
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0B6B63",
  },

  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#666",
  },

  /* JOB CARD */
  jobCard: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },

  jobTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },

  jobMeta: {
    marginTop: 4,
    fontSize: 13,
    color: "#666",
  },

  jobStatus: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    color: "#0B6B63",
  },

  /* EMPTY STATE */
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
  },

  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: "#777",
    textAlign: "center",
    lineHeight: 20,
  },
});

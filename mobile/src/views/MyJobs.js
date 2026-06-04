import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useAppTheme } from "../theme";

export default function MyJobs() {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

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
          <View>
            <Text style={styles.title}>My Jobs</Text>
            <Text style={styles.subtitle}>
              Jobs you have been hired for will appear here
            </Text>
          </View>
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


const createStyles = (theme) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },

    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },

    /* HEADER */
    header: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },

    title: {
      fontSize: 24,
      fontWeight: "800",
      color: theme.colors.primary,
    },

    subtitle: {
      marginTop: 6,
      fontSize: 13,
      color: theme.colors.textSecondary,
    },

    /* JOB CARD */
    jobCard: {
      marginHorizontal: 20,
      marginTop: 16,
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },

    jobTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.text,
    },

    jobMeta: {
      marginTop: 4,
      fontSize: 13,
      color: theme.colors.textSecondary,
    },

    jobStatus: {
      marginTop: 10,
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.primary,
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
      color: theme.colors.text,
    },

    emptyText: {
      marginTop: 8,
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
  });

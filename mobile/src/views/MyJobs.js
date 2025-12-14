import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";
import LightLoginModal from "./LightUsers/LightLoginModal";
import PostJobModal from "./LightUsers/PostJobModal";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function MyJobs() {
  /* --------------------------------
   * AUTH STATE (MVP)
   * -------------------------------- */
  const [isLightUser, setIsLightUser] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showPostJob, setShowPostJob] = useState(false);


  
  const navigation = useNavigation();

  



  const [jobs] = useState([
    {
      id: "1",
      title: "Fix kitchen sink",
      location: "Kinondoni",
      status: "waiting",
      providersCount: 0,
    },
    {
      id: "2",
      title: "Electrical wiring check",
      location: "Mbezi",
      status: "interested",
      providersCount: 1,
    },
  ]);

  /* --------------------------------
   * STATUS CONFIG
   * -------------------------------- */
  const STATUS_MAP = {
    waiting: {
      label: "Waiting for providers",
      color: "#999",
    },
    interested: {
      label: "Provider interested",
      color: "#0B6B63",
    },
    active: {
      label: "Job in progress",
      color: "#1E88E5",
    },
    completed: {
      label: "Completed",
      color: "#4CAF50",
    },
  };

  /* --------------------------------
   * RENDER JOB CARD
   * -------------------------------- */
  const renderJob = ({ item }) => {
    const status = STATUS_MAP[item.status];

    return (
      <TouchableOpacity activeOpacity={0.85} style={styles.jobCard}>
        <Text style={styles.jobTitle}>{item.title}</Text>
        <Text style={styles.jobMeta}>{item.location}</Text>

        <View style={styles.statusRow}>
          <Text style={[styles.jobStatus, { color: status.color }]}>
            {status.label}
          </Text>

          {item.providersCount > 0 && (
            <Text style={styles.providersCount}>
              {item.providersCount} provider(s)
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  /* --------------------------------
   * EMPTY STATE
   * -------------------------------- */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No jobs yet</Text>
      <Text style={styles.emptyText}>
        Post a job and service providers will come to you.
      </Text>
    </View>
  );

  /* --------------------------------
   * CTA HANDLER (THE INTERLOCK)
   * -------------------------------- */
  const handlePostJob = async () => {
    const token = await AsyncStorage.getItem("lightToken");

    if (!token) {
      setShowLogin(true);
      return;
    }

    setShowPostJob(true);
  };


  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>My Jobs</Text>
        <Text style={styles.subtitle}>
          Track and manage the jobs you’ve posted
        </Text>
      </View>

      {/* JOB LIST */}
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={renderJob}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={
          jobs.length === 0 ? { flex: 1 } : { paddingBottom: 140 }
        }
        showsVerticalScrollIndicator={false}
      />

      {/* PRIMARY CTA */}
      <TouchableOpacity style={styles.postBtn} onPress={handlePostJob}>
        <Text style={styles.postBtnText}>Post a Job</Text>
      </TouchableOpacity>

      <PostJobModal
        visible={showPostJob}
        onClose={() => setShowPostJob(false)}
        onSubmit={(job) => {
          console.log("Job posted:", job);
          // later → send to backend + refresh list
        }}
      />


      {/* LIGHT LOGIN MODAL */}
      <LightLoginModal
        visible={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={() => {
          setShowLogin(false);
          setShowPostJob(true);
        }}
      />

    </View>
  );
}

/* --------------------------------
 * STYLES
 * -------------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  /* HEADER */
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: "#EFEFEF",
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111",
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#666",
  },

  /* JOB CARD */
  jobCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#EFEFEF",
  },

  jobTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
  },

  jobMeta: {
    marginTop: 4,
    fontSize: 13,
    color: "#777",
  },

  statusRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  jobStatus: {
    fontSize: 13,
    fontWeight: "700",
  },

  providersCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555",
  },

  /* EMPTY STATE */
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
  },

  emptyText: {
    marginTop: 6,
    fontSize: 14,
    color: "#777",
    textAlign: "center",
  },

  /* CTA */
  postBtn: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#0B6B63",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    elevation: 3,
  },

  postBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});

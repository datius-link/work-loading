import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

import LightLoginModal from "./LightUsers/LightLoginModal";
import { API } from "../api/api"; // adjust path if needed

export default function MyJobs() {
  /* -----------------------------
   * AUTH STATE
   * ----------------------------- */
  const [isLightUser, setIsLightUser] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showPostJob, setShowPostJob] = useState(false);

  /* -----------------------------
   * JOBS STATE
   * ----------------------------- */
  const [jobs, setJobs] = useState([]);

  /* -----------------------------
   * CHECK LIGHT LOGIN ON MOUNT
   * ----------------------------- */
  useEffect(() => {
    const checkLightUser = async () => {
      const token = await AsyncStorage.getItem("lightToken");
      if (token) {
        setIsLightUser(true);
      }
    };

    checkLightUser();
  }, []);

  /* -----------------------------
   * POST JOB HANDLER
   * ----------------------------- */
  const handleSubmitJob = async (job) => {
    try {
      const token = await AsyncStorage.getItem("lightToken");

      const res = await axios.post(`${API}/api/jobs`, job, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // add new job to list
      setJobs((prev) => [res.data.job, ...prev]);
      setShowPostJob(false);
    } catch (err) {
      console.log("Post job error:", err);
      Alert.alert("Error", "Failed to post job");
    }
  };

  /* -----------------------------
   * CTA HANDLER
   * ----------------------------- */
  const handlePostJob = () => {
    if (!isLightUser) {
      setShowLogin(true);
      return;
    }

    setShowPostJob(true);
  };

  /* -----------------------------
   * RENDER JOB
   * ----------------------------- */
  const renderJob = ({ item }) => (
    <View style={styles.jobCard}>
      <Text style={styles.jobTitle}>{item.title}</Text>
      <Text style={styles.jobMeta}>{item.location}</Text>
      <Text style={styles.jobStatus}>Waiting for providers</Text>
    </View>
  );

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
        keyExtractor={(item) => item.id?.toString()}
        renderItem={renderJob}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No jobs yet</Text>
            <Text style={styles.emptyText}>
              Post a job and providers will find you
            </Text>
          </View>
        }
      />

      {/* CTA */}
      <TouchableOpacity style={styles.postBtn} onPress={handlePostJob}>
        <Text style={styles.postBtnText}>Post a Job</Text>
      </TouchableOpacity>

      {/* POST JOB MODAL */}
      <PostJobModal
        visible={showPostJob}
        onClose={() => setShowPostJob(false)}
        onSubmit={handleSubmitJob}
      />

      {/* LIGHT LOGIN MODAL */}
      <LightLoginModal
        visible={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={() => {
          setIsLightUser(true);
          setShowLogin(false);
          setShowPostJob(true);
        }}
      />
    </View>
  );
}

/* -----------------------------
 * STYLES
 * ----------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#EFEFEF",
  },

  title: { fontSize: 24, fontWeight: "800" },
  subtitle: { marginTop: 4, fontSize: 13, color: "#666" },

  jobCard: {
    margin: 16,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#F9F9F9",
  },

  jobTitle: { fontSize: 16, fontWeight: "700" },
  jobMeta: { marginTop: 4, color: "#777" },
  jobStatus: { marginTop: 8, fontWeight: "600", color: "#999" },

  emptyState: {
    marginTop: 80,
    alignItems: "center",
  },

  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyText: { marginTop: 6, color: "#777" },

  postBtn: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#0B6B63",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },

  postBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});

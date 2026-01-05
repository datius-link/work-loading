import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Share,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BackIcon from "../../../icons/huge/back-navigation.svg";

export default function EngagementSummary({ navigation }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    const token = await AsyncStorage.getItem("token");

    // MOCKED – future backend ready
    const mocked = {
      accountReached: 391,
      profileVisits: 61,
      interactions: 23,
      pickedMe: 17,

      discovery: {
        search: 58,
        discover: 31,
        referrals: 11,
      },

      growth7d: {
        profileVisits: 12,
        pickedMe: 4,
        interactions: 9,
      },
    };

    // For now, always show something
    setSummary(mocked);
  };

  if (!summary) {
    return <ActivityIndicator style={{ marginTop: 80 }} />;
  }

  const handleShare = async () => {
    // TEMP – text (image comes next step)
    await Share.share({
      message: `My professional reach on e-kazi 🚀

• Account reached: ${summary.accountReached}
• Profile visits: ${summary.profileVisits}
• Picked me: ${summary.pickedMe}

Available for work on e-kazi.`,
    });
  };

  return (
    <View style={styles.root}>
      {/* ---------- HEADER ---------- */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            navigation.canGoBack()
              ? navigation.goBack()
              : navigation.navigate("Posts")
          }
          style={styles.backBtn}
        >
          <BackIcon width={22} height={22} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Professional insights</Text>
      </View>

      {/* ---------- CONTENT ---------- */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subTitle}>Your performance overview</Text>

        {/* HERO METRICS */}
        <View style={styles.metrics}>
          <Metric value={summary.accountReached} label="Account reached" />
          <Metric value={summary.profileVisits} label="Profile visits" />
          <Metric value={summary.interactions} label="Interactions" />
          <Metric value={summary.pickedMe} label="Picked me" />
        </View>

        {/* DISCOVERY */}
        <Card title="How people found you">
          <Row label="Search" value={`${summary.discovery.search}%`} />
          <Row label="Discover" value={`${summary.discovery.discover}%`} />
          <Row label="Referrals / picks" value={`${summary.discovery.referrals}%`} />
        </Card>

        {/* GROWTH */}
        <Card title="Growth (last 7 days)">
          <Row
            label="Profile visits"
            value={`+${summary.growth7d.profileVisits}`}
            positive
          />
          <Row
            label="Picked me"
            value={`+${summary.growth7d.pickedMe}`}
            positive
          />
          <Row
            label="Interactions"
            value={`+${summary.growth7d.interactions}`}
            positive
          />
        </Card>

        {/* INSIGHTS – NUMBERED */}
        <View style={styles.insightsBox}>
          <Text style={styles.cardTitle}>Insights</Text>

          <Insight
            number={1}
            text="Post consistently. Short videos, full videos, and images of your work keep your profile active and visible."
          />
          <Insight
            number={2}
            text="Add more real work examples. Profiles with proof of work get picked more."
          />
          <Insight
            number={3}
            text="Use @mentions and #hashtags. They help your posts appear in search and discover."
          />
        </View>

        {/* SHARE */}
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareText}>Share your insights</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

/* ---------- COMPONENTS ---------- */

function Metric({ value, label }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Card({ title, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value, positive }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          positive && { color: "#1A7F37", fontWeight: "700" },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function Insight({ number, text }) {
  return (
    <View style={styles.insightRow}>
      <Text style={styles.insightNumber}>{number}</Text>
      <Text style={styles.insightText}>{text}</Text>
    </View>
  );
}

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },

  /* Header */
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
  },

  /* Content */
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  subTitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 16,
  },

  /* Metrics */
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  metric: {
    width: "50%",
    marginBottom: 20,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "900",
  },
  metricLabel: {
    fontSize: 12,
    color: "#666",
  },

  /* Cards */
  card: {
    marginTop: 16,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
  },
  cardTitle: {
    fontWeight: "800",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  rowLabel: {
    fontSize: 13,
    color: "#444",
  },
  rowValue: {
    fontSize: 13,
    color: "#444",
  },

  /* Insights */
  insightsBox: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
  },
  insightRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  insightNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#111",
    color: "#FFF",
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "800",
    marginRight: 10,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: "#333",
  },

  /* Share */
  shareBtn: {
    marginTop: 28,
    paddingVertical: 14,
    backgroundColor: "#111",
    borderRadius: 14,
    alignItems: "center",
  },
  shareText: {
    color: "#FFF",
    fontWeight: "800",
  },
});

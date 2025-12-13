import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import FeedTab from "./home/FeedTab";
import ExploreTab from "./home/ExploreTab";
import { useNavigation } from "@react-navigation/native";

const TopTab = createMaterialTopTabNavigator();

export default function Home() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.logo}>e-kazi</Text>

        <TouchableOpacity style={styles.selector}>
          <Text style={styles.selectorText}>What do you need?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.postJobBtn}
          onPress={() => navigation.navigate("MyJobs")}
        >
          <Text style={styles.postJobText}> Post a Job</Text>
        </TouchableOpacity>
      </View>

      {/* TOP TABS */}
      <TopTab.Navigator
        screenOptions={{
          // Hide the default underline indicator
          tabBarIndicatorStyle: { display: "none" },
          tabBarStyle: {
            backgroundColor: "#F2F2F2",
            borderRadius: 30,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarItemStyle: {
            borderRadius: 26,
            margin: 2,
            padding: 0, // stop internal inflation
          },
          tabBarActiveTintColor: "#0B6B63",
          tabBarInactiveTintColor: "#666",
          tabBarLabelStyle: {
            fontWeight: "700",
            textTransform: "none",
            fontSize: 15,
          },
          tabBarPressColor: "transparent",
        }}
      >
        <TopTab.Screen
          name="Feed"
          component={FeedTab}
          options={{
            tabBarItemStyle: { flex: 0.9 }, // 👈 squeeze Feed
            tabBarLabel: ({ focused }) => (
              <View
                style={[
                  styles.tabLabelContainer,
                  focused && styles.activeTabBackground,
                ]}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    { color: focused ? "#0B6B63" : "#666" },
                  ]}
                >
                  Feed
                </Text>
              </View>
            ),
          }}
        />

        <TopTab.Screen
          name="Explore"
          component={ExploreTab}
          options={{
            tabBarItemStyle: { flex: 1.1 }, // 👈 give Explore more space
            tabBarLabel: ({ focused }) => (
              <View
                style={[
                  styles.tabLabelContainer,
                  focused && styles.activeTabBackground,
                ]}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    { color: focused ? "#0B6B63" : "#666" },
                  ]}
                >
                  Explore
                </Text>
              </View>
            ),
          }}
        />

      </TopTab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: "#EFEFEF",
  },

  logo: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0B6B63",
  },

  selector: {
    flex: 1,
    marginHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F4F4F4",
    alignItems: "center",
  },

  selectorText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },

  postJobBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#0B6B63",
    backgroundColor: "#F4FFFD",
  },

  postJobText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0B6B63",
  },

  /* CUSTOM TAB LABELS */
  tabLabelContainer: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  activeTabBackground: {
    backgroundColor: "#fff",
    borderRadius: 26,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },

  tabLabel: {
    fontWeight: "700",
    textTransform: "none",
  },
});
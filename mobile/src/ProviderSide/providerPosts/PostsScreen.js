import React from "react";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import MyWork from "./MyWork";
import DiscoverScreen from "./ForMe";
import { StyleSheet } from "react-native";

const Tab = createMaterialTopTabNavigator();

export default function ProviderPostsScreen() {
  return (
    <Tab.Navigator
      initialRouteName="MyWork"
      screenOptions={{
        tabBarActiveTintColor: "#111",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIndicatorStyle: styles.indicator,
        tabBarPressColor: "transparent",
      }}
    >
      <Tab.Screen
        name="MyWork"
        component={MyWork}
        options={{ title: "My Work" }}
      />

      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{ title: "Discover" }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#F8FAFC", // light, clean
    elevation: 0,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },

  tabLabel: {
    fontSize: 15,
    fontWeight: "700",
    textTransform: "none",
    letterSpacing: 0.3,
  },

  indicator: {
    backgroundColor: "#111",
    height: 4,
    borderRadius: 4,
    width: "35%",
    marginLeft: "7%",
  },
});

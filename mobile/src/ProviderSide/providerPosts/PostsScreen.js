import React from "react";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { StyleSheet } from "react-native";
import MyWork from "./MyWork";
import Discover from "./Discover";
import { theme } from "../../theme/theme";

const Tab = createMaterialTopTabNavigator();

export default function ProviderPostsScreen() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
        tabBarActiveTintColor: theme.colors.textPrimary,
        tabBarInactiveTintColor: theme.colors.textMuted,
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
        component={Discover}
        options={{ title: "Discover" }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.colors.surface,
    elevation: 0,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  label: {
    fontSize: 15,
    fontWeight: "700",
    textTransform: "none",
  },

  indicator: {
    height: 3,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    width: "30%",
    marginLeft: "10%",
  },
});

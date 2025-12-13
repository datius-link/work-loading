import React from "react";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import MyPosts from "./MyPosts";
import ForMe from "./ForMe";
import MyFriends from "./MyFriends";
import { StyleSheet } from "react-native";

const Tab = createMaterialTopTabNavigator();

export default function PostsScreen() {
  return (
    <Tab.Navigator
      initialRouteName="ForMe"
      screenOptions={{
        tabBarActiveTintColor: "#007BFF",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIndicatorStyle: styles.indicator,
      }}
    >
      <Tab.Screen
        name="MyPosts"
        component={MyPosts}
        options={{ title: "My Posts" }}
      />

      <Tab.Screen
        name="ForMe"
        component={ForMe}
        options={{ title: "For Me" }}
      />

      <Tab.Screen
        name="MyFriends"
        component={MyFriends}
        options={{ title: "My Friends" }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#fff",
    elevation: 3,
  },
  tabLabel: {
    fontWeight: "700",
    fontSize: 14,
  },
  indicator: {
    backgroundColor: "#007BFF",
    height: 3,
  },
});

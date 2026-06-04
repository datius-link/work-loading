import React from "react";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import MyWork from "./MyWork";
import Discover from "./Discover";
import { useAppTheme } from "../../theme";

const Tab = createMaterialTopTabNavigator();

export default function ProviderPostsScreen() {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
        },
      ]}
    >
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.label,
          tabBarActiveTintColor: theme.colors.text,
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
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },

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


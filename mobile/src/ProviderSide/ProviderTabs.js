import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { FontAwesome5 } from "@expo/vector-icons";
import { BackHandler } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

// Screens
import MyProfile from "./Profile/MyProfile";
import OthersScreen from "./Others/OthersScreen";
import ProviderSettings from "./Settings/ProviderSettings";

// STACK
import ProviderPostsStack from "./providerPosts/ProviderPostsStack";

const Tab = createBottomTabNavigator();

function RequestsScreen() {
  return null;
}

function ProviderAlertsScreen() {
  return null;
}

export default function ProviderTabs() {
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => true;
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );
      return () => subscription.remove();
    }, [])
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#007bff",
        tabBarInactiveTintColor: "#777",
        tabBarIcon: ({ color, size }) => {
          let iconName = "circle";

          switch (route.name) {
            case "Others":
              iconName = "ellipsis-h";
              break;
            case "Posts":
              iconName = "newspaper";
              break;
            case "Requests":
              iconName = "tasks";
              break;
            case "Alerts":
              iconName = "bell";
              break;
            case "MyProfile":
              iconName = "user";
              break;
          }

          return (
            <FontAwesome5
              name={iconName}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Others" component={OthersScreen} />
      <Tab.Screen name="Posts" component={ProviderPostsStack} />
      <Tab.Screen name="Requests" component={RequestsScreen} />
      <Tab.Screen name="Alerts" component={ProviderAlertsScreen} />
      <Tab.Screen name="MyProfile" component={MyProfile} />
    </Tab.Navigator>
  );
}

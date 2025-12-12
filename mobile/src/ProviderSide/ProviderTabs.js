import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { FontAwesome5 } from "@expo/vector-icons";

// Screens
import ServiceProviderProfile from "../views/Profile/ServiceProviderProfile";

function OthersScreen() {
  return null; // placeholder — we’ll replace later
}

function PostsScreen() {
  return null; // placeholder
}

function RequestsScreen() {
  return null; // placeholder
}

function ProviderAlertsScreen() {
  return null; // placeholder
}

const Tab = createBottomTabNavigator();

export default function ProviderTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#007bff",
        tabBarInactiveTintColor: "#777",
        tabBarIcon: ({ color, size }) => {
          let iconName;

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

          return <FontAwesome5 name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Others" component={OthersScreen} />
      <Tab.Screen name="Posts" component={PostsScreen} />
      <Tab.Screen name="Requests" component={RequestsScreen} />
      <Tab.Screen name="Alerts" component={ProviderAlertsScreen} />
      <Tab.Screen name="MyProfile" component={ServiceProviderProfile} />
    </Tab.Navigator>
  );
}

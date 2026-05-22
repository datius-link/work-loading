import React, { useEffect, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BackHandler, ActivityIndicator, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLanguage } from "../LanguageContext";
import AppIcon from "../icons/AppIcon";

import MyProfile from "./Profile/MyProfile";
import OthersScreen from "./Others/OthersScreen";
import ProviderPostsStack from "./providerPosts/ProviderPostsStack";

const Tab = createBottomTabNavigator();

function EmptyScreen() {
  return null;
}

export default function ProviderTabs({ navigation }) {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const { language } = useLanguage();

  /* ================= AUTH GUARD ================= */
  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        navigation.reset({
          index: 0,
          routes: [{ name: "ServiceProviderLogin" }],
        });
        return;
      }

      setCheckingAuth(false);
    };

    checkAuth();
  }, [navigation]);

  /* ================= BLOCK BACK BUTTON ================= */
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => true;
      const sub = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );
      return () => sub.remove();
    }, [])
  );

  /* ================= LOADING ================= */
  if (checkingAuth) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  /* ================= TABS ================= */
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#0B6B63",
        tabBarInactiveTintColor: "#64748B",
        tabBarLabel:
          {
            Others: language === "sw" ? "Mengine" : "Others",
            Posts: language === "sw" ? "Posts" : "Posts",
            Requests: language === "sw" ? "Maombi" : "Requests",
            Alerts: language === "sw" ? "Arifa" : "Alerts",
            MyProfile: language === "sw" ? "Profile" : "Profile",
          }[route.name] || route.name,
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Others: "dots",
            Posts: "posts",
            Requests: "tasks",
            Alerts: "bell",
            MyProfile: "user",
          };

          return <AppIcon name={icons[route.name] || "user"} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Others" component={OthersScreen} />
      <Tab.Screen name="Posts" component={ProviderPostsStack} />
      <Tab.Screen name="Requests" component={EmptyScreen} />
      <Tab.Screen name="Alerts" component={EmptyScreen} />
      <Tab.Screen name="MyProfile" component={MyProfile} />
    </Tab.Navigator>
  );
}

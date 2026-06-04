import React, { useEffect, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BackHandler, ActivityIndicator, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLanguage } from "../LanguageContext";
import { useAppTheme } from "../theme";
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
  const { theme } = useAppTheme();

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

  /* ================= BLOCK BACK BUTTON (ONLY WHEN ON MAIN TABS) ================= */
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        return true;
      };
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
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          position: "absolute",
          left: 12,
          right: 12,
          bottom: 10,
          height: 66,
          paddingBottom: 9,
          paddingTop: 8,
          borderTopWidth: 0,
          borderRadius: 22,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
        },
        tabBarItemStyle: {
          borderRadius: 18,
          marginHorizontal: 4,
        },
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

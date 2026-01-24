import React, { useEffect, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { FontAwesome5 } from "@expo/vector-icons";
import { BackHandler, ActivityIndicator, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import MyProfile from "./Profile/MyProfile";
import OthersScreen from "./Others/OthersScreen";
import ProviderPostsStack from "./providerPosts/ProviderPostsStack";

const Tab = createBottomTabNavigator();

function EmptyScreen() {
  return null;
}

export default function ProviderTabs({ navigation }) {
  const [checkingAuth, setCheckingAuth] = useState(true);

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
        tabBarActiveTintColor: "#007bff",
        tabBarInactiveTintColor: "#777",
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Others: "ellipsis-h",
            Posts: "newspaper",
            Requests: "tasks",
            Alerts: "bell",
            MyProfile: "user",
          };

          return (
            <FontAwesome5
              name={icons[route.name] || "circle"}
              size={size}
              color={color}
            />
          );
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

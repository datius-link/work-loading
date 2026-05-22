// 🚨 MUST BE FIRST LINE
import "react-native-gesture-handler";

// FIX: Ondoa hii line - usi-enableScreens() kwa sasa
// import { enableScreens } from 'react-native-screens';
// enableScreens();

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LanguageProvider, useLanguage } from "./src/LanguageContext";
import AppIcon from "./src/icons/AppIcon";

/* ---------------------------
   MAIN USER SCREENS
--------------------------- */
import Home from "./src/views/Home";
import Activities from "./src/views/Activities";
import MyJobs from "./src/views/MyJobs";
import You from "./src/views/You";

/* ---------------------------
   AUTH SCREENS (PROVIDER)
--------------------------- */
import AuthLoading from "./src/AuthLoading";
import ServiceProviderLogin from "./src/views/Profile/ServiceProviderAuth/ServiceProviderLogin";
import ServiceProviderSignUp from "./src/views/Profile/ServiceProviderAuth/ServiceProviderSignUp";
import VerifyProvider from "./src/views/Profile/ServiceProviderAuth/VerifyProvider";
import ForgotPassword from "./src/views/Profile/ServiceProviderAuth/ForgotPassword";
import ResetPassword from "./src/views/Profile/ServiceProviderAuth/ResetPassword";

/* ---------------------------
   PROVIDER SIDE
--------------------------- */
import ProviderTabs from "./src/ProviderSide/ProviderTabs";
import EditProvider from "./src/ProviderSide/Profile/EditProvider";
import ProviderSettings from "./src/ProviderSide/Settings/ProviderSettings";

import PicksScreen from "./src/ProviderSide/providerPosts/picks/PicksScreen";
import EngagementSummary from "./src/ProviderSide/providerPosts/engagement/engagementSummary";
import CreatePost from "./src/ProviderSide/providerPosts/Post/createPost";
import EditMedia from "./src/ProviderSide/providerPosts/Post/EditMedia";
import PostDetails from "./src/ProviderSide/providerPosts/Post/PostDetails";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

/* =====================================================
   MAIN USER TABS
===================================================== */
function MainTabs() {
  const { language } = useLanguage();
  const labels = {
    Home: language === "sw" ? "Gundua" : "Explore",
    Activities: language === "sw" ? "Shughuli" : "Activities",
    MyJobs: language === "sw" ? "Kazi Zangu" : "My Jobs",
    You: language === "sw" ? "Wewe" : "You",
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#0B6B63",
        tabBarInactiveTintColor: "#64748B",
        tabBarLabel: labels[route.name] || route.name,
        tabBarStyle: {
          borderTopColor: "#E2E8F0",
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
        },
        tabBarIcon: ({ color, size }) => {
          let icon = "home";
          if (route.name === "Activities") icon = "activity";
          if (route.name === "MyJobs") icon = "briefcase";
          if (route.name === "You") icon = "user";

          return <AppIcon name={icon} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Activities" component={Activities} />
      <Tab.Screen name="MyJobs" component={MyJobs} />
      <Tab.Screen name="You" component={You} />
    </Tab.Navigator>
  );
}

/* =====================================================
   APP ROOT
===================================================== */
export default function App() {
  return (
    <LanguageProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <NavigationContainer>
            <Stack.Navigator 
              screenOptions={{ 
                headerShown: false,
                // FIX: Usitumie detachPreviousScreen globally
                // presentation: 'modal', // ONDOA HII
              }}
            >

              {/* -------- AUTH CHECK -------- */}
              <Stack.Screen name="AuthLoading" component={AuthLoading} />

              {/* -------- MAIN USER -------- */}
              <Stack.Screen name="MainTabs" component={MainTabs} />

              {/* -------- PROVIDER AUTH -------- */}
              <Stack.Screen name="ServiceProviderLogin" component={ServiceProviderLogin} />
              <Stack.Screen name="ServiceProviderSignUp" component={ServiceProviderSignUp} />
              <Stack.Screen name="VerifyProvider" component={VerifyProvider} />
              <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
              <Stack.Screen name="ResetPassword" component={ResetPassword} />

              {/* -------- PROVIDER APP -------- */}
              <Stack.Screen name="ProviderTabs" component={ProviderTabs} />
              <Stack.Screen name="EditProvider" component={EditProvider} />
              <Stack.Screen name="ProviderSettings" component={ProviderSettings} />

              {/* -------- POSTS -------- */}
              <Stack.Screen name="PicksScreen" component={PicksScreen} />
              <Stack.Screen name="EngagementSummary" component={EngagementSummary} />
              <Stack.Screen name="CreatePost" component={CreatePost} />
              <Stack.Screen name="EditMedia" component={EditMedia} />
              
              {/* -------- POST DETAILS WITH MINIMAL FIXES -------- */}
              <Stack.Screen 
                name="PostDetails" 
                component={PostDetails}
                options={{
                }}
              />

            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </LanguageProvider>
  );
}
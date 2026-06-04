import "react-native-gesture-handler";

import { ConvexReactClient } from "convex/react";
import { ConvexProvider } from "convex/react";

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { LanguageProvider, useLanguage } from "./src/LanguageContext";
import { ThemeProvider, useAppTheme } from "./src/theme";
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
import ProviderProfile from "./src/ProviderSide/Profile/ProviderProfile";
import ProviderSettings from "./src/ProviderSide/Settings/ProviderSettings";

import ConnectionsScreen from "./src/ProviderSide/providerPosts/following-system/ConnectionsScreen";
import EngagementSummary from "./src/ProviderSide/providerPosts/engagement/engagementSummary";
import CreatePost from "./src/ProviderSide/providerPosts/Post/createPost";
import EditMedia from "./src/ProviderSide/providerPosts/Post/EditMedia";
import PostDetails from "./src/ProviderSide/providerPosts/Post/PostDetails";
import PostFeedView from "./src/ProviderSide/providerPosts/PostFeedView";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL); 

/* =====================================================
   MAIN USER TABS
===================================================== */
function MainTabs() {
  const { language } = useLanguage();
  const { theme } = useAppTheme(); 
  const insets = useSafeAreaInsets();
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
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabel: labels[route.name] || route.name,
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          borderTopWidth: 0,
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
    <ConvexProvider client={convex}>
      <LanguageProvider>
        <ThemeProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
              <NavigationContainer>
                <Stack.Navigator 
                  screenOptions={{ 
                    headerShown: false,
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
                  <Stack.Screen name="ProviderProfile" component={ProviderProfile} />
                  <Stack.Screen name="PostFeedView" component={PostFeedView} />

                  {/* -------- POSTS -------- */}
                  <Stack.Screen name="PicksScreen" component={ConnectionsScreen} />
                  <Stack.Screen name="ConnectionsScreen" component={ConnectionsScreen} />
                  <Stack.Screen name="EngagementSummary" component={EngagementSummary} />
                  <Stack.Screen name="CreatePost" component={CreatePost} />
                  <Stack.Screen name="EditMedia" component={EditMedia} />
                  
                  {/* -------- POST DETAILS WITH MINIMAL FIXES -------- */}
                  <Stack.Screen 
                    name="PostDetails" 
                    component={PostDetails}
                    options={{}}
                  />
                </Stack.Navigator>
              </NavigationContainer>
            </SafeAreaProvider>
          </GestureHandlerRootView>
        </ThemeProvider>
      </LanguageProvider>
    </ConvexProvider>
  );
}

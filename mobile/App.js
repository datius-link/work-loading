import "react-native-gesture-handler";

import { ConvexReactClient } from "convex/react";
import { ConvexProvider } from "convex/react";

import React, { useEffect, useState } from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import EkaziLogo from "./assets/e-kazi-logo.svg";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { LanguageProvider, useLanguage } from "./src/LanguageContext";
import { ThemeProvider, useAppTheme } from "./src/theme";
import AppIcon from "./src/icons/AppIcon";
import Txt from "./src/Txt";
import NetworkBanner from "./src/components/NetworkBanner";
import NotificationBanner from "./src/components/NotificationBanner";
import { initOfflineCache } from "./src/utils/offlineCache";
import { consumeEphemeralSessionIfAny, getUserSession, subscribeUserSession } from "./src/utils/userSession";
import { navigationRef } from "./src/notifications/navigationRef";
import {
  attachNotificationListeners,
  flushPendingNavigation,
  initPushNotifications,
  registerDeviceForPush,
  unregisterDeviceForPush,
} from "./src/notifications/pushNotifications";
import { registerBackgroundCallTask } from "./src/notifications/backgroundCallTask";
import { CallProvider } from "./src/calling/CallProvider";
import CallStack from "./src/calling/CallStack";

/* ---------------------------
   MAIN USER SCREENS
--------------------------- */
import Home from "./src/views/Home";
import Alerts from "./src/views/Alert";
import Jobs from "./src/views/Jobs";
import Profile from "./src/views/Profile";
import Settings from "./src/views/Settings";
import Updates from "./src/views/Updates";
import JobDetails from "./src/views/Jobs/MyRequests/JobDetails";
import JobApplicantDetails from "./src/views/Jobs/MyRequests/JobApplicantDetails";
import UserProfile from "./src/views/Profile/UserProfile";
import ProfileFutureList from "./src/views/Profile/ProfileFutureList";
import EditProfile from "./src/views/Profile/editProfile/EditProfile";
import SearchResults from "./src/views/home/SearchResults";

/* ---------------------------
   AUTH CHECK
--------------------------- */
import AuthLoading from "./src/views/Auth/AuthLoading.js";
import Login from "./src/views/Auth/Login";
import Register from "./src/views/Auth/Register";
import ForgotPassword from "./src/views/Auth/ForgotPassword";
import ResetPassword from "./src/views/Auth/ResetPassword";
import VerifyEmail from "./src/views/Auth/VerifyEmail";
import TermsScreen from "./src/views/Auth/TermsScreen";
import PrivacyScreen from "./src/views/Auth/PrivacyScreen";

/* ---------------------------
   USER WORKFLOW SCREENS
--------------------------- */
import ConnectionsScreen from "./src/views/Profile/connections/ConnectionsScreen";
import Insights from "./src/views/Profile/editProfile/Insights";
import CreatePost from "./src/views/Profile/posting/CreatePost";
import EditMedia from "./src/views/Profile/posting/EditMedia";
import PostDetails from "./src/views/Profile/posting/PostDetails";
import PostFeedView from "./src/views/postCard/PostFeedView";
import RequestDetails from "./src/views/Jobs/MyJobs/RequestDetails";
import JobApplication from "./src/views/Jobs/MyRequests/JobApplication";
import JobWorkspace from "./src/views/Jobs/Workspace/JobWorkspace";

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
    Jobs: language === "sw" ? "Kazi" : "Jobs",
    Profile: language === "sw" ? "Profaili" : "Profile",
    Settings: language === "sw" ? "Mipangilio" : "Settings",
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
          if (route.name === "Jobs") icon = "briefcase";
          if (route.name === "Profile") icon = "user";
          if (route.name === "Settings") icon = "settings";

          return <AppIcon name={icon} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Jobs" component={Jobs} />
      <Tab.Screen name="Profile" component={Profile} />
      <Tab.Screen name="Settings" component={Settings} />
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
              <CallProvider>
                <AppShell />
              </CallProvider>
            </SafeAreaProvider>
          </GestureHandlerRootView>
        </ThemeProvider>
      </LanguageProvider>
    </ConvexProvider>
  );
}

function AppShell() {
  const { theme, mode } = useAppTheme();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Must resolve before anything else reads the session (MainTabs guards,
    // etc.) — otherwise a "Nikumbuke" = off login from last
    // time would flash in as still signed-in before being wiped.
    (async () => {
      await consumeEphemeralSessionIfAny();
      initOfflineCache();
    })();
    const timeout = setTimeout(() => setShowSplash(false), 900);
    return () => clearTimeout(timeout);
  }, []);

  // Real OS push/local notifications (expo-notifications). This is separate
  // from the Convex realtimeEvents wiring used elsewhere for in-app live
  // badges/counts - that stays untouched.
  useEffect(() => {
    let cancelled = false;

    initPushNotifications();
    registerBackgroundCallTask();
    const detachListeners = attachNotificationListeners();

    // Requirement: request permission / register a token on app startup if
    // already logged in, and again right after a fresh login.
    getUserSession().then((session) => {
      if (!cancelled && session?.isLoggedIn) registerDeviceForPush();
    });

    const unsubscribeSession = subscribeUserSession((session) => {
      if (session?.isLoggedIn) {
        registerDeviceForPush();
      } else {
        unregisterDeviceForPush();
      }
    });

    return () => {
      cancelled = true;
      detachListeners();
      unsubscribeSession();
    };
  }, []);

  return (
    <View style={[rootStyles.app, { backgroundColor: theme.colors.bg }]}>
      <StatusBar
        barStyle={mode === "dark" ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.bg}
        translucent={false}
      />
      {showSplash ? <SplashScreen /> : <RootNavigator />}
      <NetworkBanner />
      <NotificationBanner />
      <CallStack />
    </View>
  );
}

function SplashScreen() {
  const { theme } = useAppTheme();

  return (
    <View style={[rootStyles.splash, { backgroundColor: theme.colors.bg }]}>
      <View style={rootStyles.logoMark}>
        <EkaziLogo width={68} height={68} />
      </View>
      <Text style={[rootStyles.splashTitle, { color: theme.colors.text }]}>Work Loading</Text>
      <Txt en="Work. Service. Trust." sw="Kazi. Huduma. Uaminifu." style={[rootStyles.splashSub, { color: theme.colors.textMuted }]} />
    </View>
  );
}

function RootNavigator() {
  return (
    <NavigationContainer ref={navigationRef} onReady={() => flushPendingNavigation()}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* -------- AUTH CHECK -------- */}
        <Stack.Screen name="AuthLoading" component={AuthLoading} />

        {/* -------- MAIN USER -------- */}
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Alerts" component={Alerts} />
        <Stack.Screen name="Updates" component={Updates} />

        {/* -------- AUTH -------- */}
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Register" component={Register} />
        <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
        <Stack.Screen name="ResetPassword" component={ResetPassword} />
        <Stack.Screen name="VerifyEmail" component={VerifyEmail} />
        <Stack.Screen name="Terms" component={TermsScreen} />
        <Stack.Screen name="Privacy" component={PrivacyScreen} />

        {/* -------- USER WORKFLOWS -------- */}
        <Stack.Screen name="UserProfile" component={UserProfile} />
        <Stack.Screen name="ProfileWorksDone" component={ProfileFutureList} />
        <Stack.Screen name="SearchResults" component={SearchResults} />
        <Stack.Screen name="PostFeedView" component={PostFeedView} />
        <Stack.Screen name="JobDetails" component={JobDetails} />
        <Stack.Screen name="JobApplicantDetails" component={JobApplicantDetails} />
        <Stack.Screen name="EditProfile" component={EditProfile} />
        <Stack.Screen name="RequestDetails" component={RequestDetails} />
        <Stack.Screen name="JobApplication" component={JobApplication} />
        <Stack.Screen name="JobWorkspace" component={JobWorkspace} />

        {/* -------- POSTS -------- */}
        <Stack.Screen name="PicksScreen" component={ConnectionsScreen} />
        <Stack.Screen name="ConnectionsScreen" component={ConnectionsScreen} />
        <Stack.Screen name="Insights" component={Insights} />
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
  );
}

const rootStyles = StyleSheet.create({
  app: {
    flex: 1,
  },
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  logoMark: {
    width: 92,
    height: 92,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  splashTitle: {
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 0,
  },
  splashSub: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0,
  },
});

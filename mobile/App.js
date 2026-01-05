import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { FontAwesome5 } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

/* ---------------------------
   MAIN USER SCREENS
--------------------------- */
import Home from "./src/views/Home";
import Activities from "./src/views/Activities";
import MyJobs from "./src/views/MyJobs";
import You from "./src/views/You";

/* ---------------------------
   AUTH / ACCOUNT SCREENS
--------------------------- */
import AuthLoading from "./src/AuthLoading";
import ServiceProviderLogin from "./src/views/Profile/ServiceProviderLogin";
import ServiceProviderSignUp from "./src/views/Profile/ServiceProviderSignUp";
import VerifyProvider from "./src/views/Profile/VerifyProvider";
import ForgotPassword from "./src/views/Profile/ForgotPassword";
import ResetPassword from "./src/views/Profile/ResetPassword";

/* ---------------------------
   PROVIDER SIDE
--------------------------- */
import ProviderTabs from "./src/ProviderSide/ProviderTabs";
import EditProvider from "./src/ProviderSide/Profile/EditProvider";
import ProviderSettings from "./src/ProviderSide/Settings/ProviderSettings";

import PicksScreen from "./src/ProviderSide/providerPosts/picks/PicksScreen";
import EngagementSummary from "./src/ProviderSide/providerPosts/engagement/engagementSummary";

/* ---------------------------
   ICONS
--------------------------- */
import ActivitiesIcon from "./src/icons/huge/activities.svg";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

/* =====================================================
   MAIN USER TABS
===================================================== */
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          if (route.name === "Activities") {
            return <ActivitiesIcon width={22} height={22} fill={color} />;
          }

          let icon = "home";
          if (route.name === "MyJobs") icon = "briefcase";
          if (route.name === "You") icon = "user";

          return <FontAwesome5 name={icon} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Activities" component={Activities} />
      <Tab.Screen name="MyJobs" component={MyJobs} options={{ title: "My Jobs" }} />
      <Tab.Screen name="You" component={You} />
    </Tab.Navigator>
  );
}

/* =====================================================
   APP ROOT
===================================================== */
export default function App() {
  return (
    <NavigationContainer>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>

          {/* --------------------------------
              INITIAL AUTH CHECK
          -------------------------------- */}
          <Stack.Screen name="AuthLoading" component={AuthLoading} />

          {/* --------------------------------
              NORMAL USER FLOW
          -------------------------------- */}
          <Stack.Screen name="MainTabs" component={MainTabs} />

          {/* --------------------------------
              PROVIDER AUTH FLOW
          -------------------------------- */}
          <Stack.Screen
            name="ServiceProviderLogin"
            component={ServiceProviderLogin}
            options={{ headerShown: true, title: "Provider Login" }}
          />

          <Stack.Screen
            name="ServiceProviderSignUp"
            component={ServiceProviderSignUp}
            options={{ headerShown: true, title: "Create Provider Account" }}
          />

          <Stack.Screen
            name="VerifyProvider"
            component={VerifyProvider}
          />

          {/* --------------------------------
              PROVIDER ROOT (🔥 IMPORTANT)
              THIS IS WHERE VERIFY SENDS USER
          -------------------------------- */}
          <Stack.Screen
            name="ProviderTabs"
            component={ProviderTabs}
          />

          {/* --------------------------------
              PROVIDER EXTRA SCREENS
          -------------------------------- */}
          <Stack.Screen
            name="EditProvider"
            component={EditProvider}
            options={{ headerShown: true, title: "Edit Profile" }}
          />

          <Stack.Screen
            name="ProviderSettings"
            component={ProviderSettings}
          />

          {/* --------------------------------
              PASSWORD RECOVERY
          -------------------------------- */}
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPassword}
            options={{ headerShown: true, title: "Forgot Password" }}
          />

          <Stack.Screen
            name="ResetPassword"
            component={ResetPassword}
            options={{ headerShown: true, title: "Reset Password" }}
          />

          <Stack.Screen 
            name="PicksScreen" 
            component={PicksScreen} 
          />

          <Stack.Screen 
            name="EngagementSummary" 
            component={EngagementSummary} 
          />

        </Stack.Navigator>
      </SafeAreaView>
    </NavigationContainer>
  );
}

import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { FontAwesome5 } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

// Main Pages
import Home from "./src/views/Home";
import Feed from "./src/views/Feed";
import Alerts from "./src/views/Alerts";
import MyAccount from "./src/views/MyAccount";

// MyAccount Flow
import ServiceProviderSignUp from "./src/views/Profile/ServiceProviderSignUp";
import ServiceProviderLogin from "./src/views/Profile/ServiceProviderLogin";

// Auth
import AuthLoading from "./src/AuthLoading";

//Provider Side
import ProviderTabs from "./src/ProviderSide/ProviderTabs";
import EditProvider from "./src/ProviderSide/Profile/EditProvider";
import ServiceProviderProfile from "./src/ProviderSide/Profile/ServiceProviderProfile";


const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

/* ---------------------------
   MAIN USER BOTTOM TABS
--------------------------- */
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === "Home") iconName = "home";
          else if (route.name === "Feed") iconName = "stream";
          else if (route.name === "Alerts") iconName = "bell";
          else if (route.name === "MyAccount") iconName = "user";

          return <FontAwesome5 name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Feed" component={Feed} />
      <Tab.Screen name="Alerts" component={Alerts} />
      <Tab.Screen name="MyAccount" component={MyAccount} />
    </Tab.Navigator>
  );
}

/* ---------------------------
   APP ROOT NAVIGATION
--------------------------- */
export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <NavigationContainer>
        <Stack.Navigator>

          {/* ----------------------
              AUTH LOADING SCREEN
              - NO BACK
          ----------------------- */}
          <Stack.Screen
            name="AuthLoading"
            component={AuthLoading}
            options={{ headerShown: false }}
          />

          {/* ----------------------
              MAIN USER TABS
              - NO BACK
          ----------------------- */}
          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{ headerShown: false }}
          />

          {/* ----------------------
              PROVIDER LOGIN
              - BACK TO MyAccount ONLY
          ----------------------- */}
          <Stack.Screen
            name="ServiceProviderLogin"
            component={ServiceProviderLogin}
            options={{
              headerShown: true,
              title: "Provider Login",
              headerBackTitleVisible: false,
            }}
          />

          {/* ----------------------
              PROVIDER SIGN UP
              - BACK TO MyAccount ONLY
          ----------------------- */}
          <Stack.Screen
            name="ServiceProviderSignUp"
            component={ServiceProviderSignUp}
            options={{
              headerShown: true,
              title: "Create Provider Account",
              headerBackTitleVisible: false,
            }}
          />

          {/* ----------------------
              PROVIDER PROFILE
              - NO BACK BUTTON
          ----------------------- */}
          <Stack.Screen
            name="ServiceProviderProfile"
            component={ServiceProviderProfile}
            options={{
              headerShown: false,
            }}
          />

          {/* ----------------------
              EDIT PROVIDER
              - BACK ONLY TO PROFILE
          ----------------------- */}
          <Stack.Screen
            name="EditProvider"
            component={EditProvider}
            options={{
              headerShown: true,
              title: "Edit Profile",
              headerBackTitleVisible: false,
            }}
          />

          <Stack.Screen
            name="ProviderTabs"
            component={ProviderTabs}
            options={{ headerShown: false }}
          />


        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
}

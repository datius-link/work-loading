import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { FontAwesome5 } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

// Main Pages
import Home from "./src/views/Home";
import Activities from "./src/views/Activities";
import MyJobs from "./src/views/MyJobs";
import You from "./src/views/You";

// MyAccount Flow
import ServiceProviderSignUp from "./src/views/Profile/ServiceProviderSignUp";
import ServiceProviderLogin from "./src/views/Profile/ServiceProviderLogin";

// Auth
import AuthLoading from "./src/AuthLoading";

//Provider Side
import ProviderTabs from "./src/ProviderSide/ProviderTabs";
import EditProvider from "./src/ProviderSide/Profile/EditProvider";
import ProviderSettings from "./src/ProviderSide/Settings/ProviderSettings";

//icon
import ActivitiesIcon from "./src/icons/huge/activities.svg";
import VerifyProvider from "./src/views/Profile/VerifyProvider";



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
          else if (route.name === "Activities") {
              return <ActivitiesIcon width={22} height={22} fill={color} />;
            }
          else if (route.name === "MyJobs") iconName = "briefcase";
          else if (route.name === "You") iconName = "user";

          return <FontAwesome5 name={iconName} size={size} color={color} />;
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

/* ---------------------------
   APP ROOT NAVIGATION
--------------------------- */
export default function App() {
  return (
    <NavigationContainer>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      
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

          <Stack.Screen
            name="VerifyProvider"
            component={VerifyProvider}
            options={{
              headerShown: false,
              headerBackTitleVisible: true,
            }}
          />


          {/* ----------------------
              PROVIDER PROFILE
              - NO BACK BUTTON
          ----------------------- */}

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

        <Stack.Screen
          name="ProviderSettings"
          component={ProviderSettings}
          options={{ headerShown: false }}
        />

        </Stack.Navigator>
        </SafeAreaView>
    </NavigationContainer>  
  );
}

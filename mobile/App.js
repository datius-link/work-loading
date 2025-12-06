import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { FontAwesome5 } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

// Main Pages
import Home from "./src/views/Home";
import Feed from "./src/views/Feed";
import Alerts from "./src/views/Alerts";
import Profile from "./src/views/Profile";

// Auth / Provider Screens
import ServiceProviderSignUp from "./src/views/Profile/ServiceProviderSignUp";

//Profile for the Service Provider
import ServiceProviderProfile from "./src/views/Profile/ServiceProviderProfile";

import EditProvider from "./src/views/Profile/components/EditProvider";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Bottom Tabs
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === "Home") {
            iconName = "home";
          } else if (route.name === "Feed") {
            iconName = "stream";
          } else if (route.name === "Alerts") {
            iconName = "bell";
          } else if (route.name === "Profile") {
            iconName = "user";
          }

          return <FontAwesome5 name={iconName} size={size} color={color} />;
        },

        tabBarActiveTintColor: "#4ECDC4",
        tabBarInactiveTintColor: "#aaa",

        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#eee",
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Feed" component={Feed} />
      <Tab.Screen name="Alerts" component={Alerts} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          
          {/* Bottom Tabs always available */}
          <Stack.Screen name="Main" component={MainTabs} />

          {/* Service Provider Sign Up */}
          <Stack.Screen 
            name="ServiceProviderSignUp" 
            component={ServiceProviderSignUp} 
          />

          <Stack.Screen
            name="ServiceProviderProfile"
            component={ServiceProviderProfile}
          />

          <Stack.Screen 
            name="EditProvider" 
            component={EditProvider} 
          />


        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
}

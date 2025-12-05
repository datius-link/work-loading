import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { FontAwesome5 } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import Home from "./src/views/Home";
import Feed from "./src/views/Feed";
import Alerts from "./src/views/Alerts";
import Profile from "./src/views/Profile";

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,

          // bottom tab icons
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

          // active / inactive colors
          tabBarActiveTintColor: "#4ECDC4", // Teal Wave
          tabBarInactiveTintColor: "#aaa",

          // tab bar styling
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
    </NavigationContainer>
    </SafeAreaView>
  );
}

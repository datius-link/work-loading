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

// Provider
import ServiceProviderSignUp from "./src/views/Profile/ServiceProviderSignUp";
import ServiceProviderProfile from "./src/views/Profile/ServiceProviderProfile";
import EditProvider from "./src/views/Profile/components/EditProvider";
import ServiceProviderLogin from "./src/views/Profile/ServiceProviderLogin";

// NEW loading screen
import AuthLoading from "./src/views/AuthLoading";

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

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>

          {/* LOAD FIRST */}
          <Stack.Screen name="AuthLoading" component={AuthLoading} />

          {/* User tabs */}
          <Stack.Screen name="Main" component={MainTabs} />

          {/* Provider Routes */}
          <Stack.Screen name="ServiceProviderSignUp" component={ServiceProviderSignUp} />
          <Stack.Screen name="ServiceProviderProfile" component={ServiceProviderProfile} />
          <Stack.Screen name="EditProvider" component={EditProvider} />
          <Stack.Screen name="ServiceProviderLogin" component={ServiceProviderLogin} />

        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
}

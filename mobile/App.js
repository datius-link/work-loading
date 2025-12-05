import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Home from "./src/views/Home";
import Feed from "./src/views/Feed";
import Alerts from "./src/views/Alerts";
import Profile from "./src/views/Profile";

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Home" component={Home} />
        <Tab.Screen name="Feed" component={Feed} />
        <Tab.Screen name="Alerts" component={Alerts} />
        <Tab.Screen name="Profile" component={Profile} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

import PostsScreen from "./PostsScreen";

const Stack = createStackNavigator();

export default function ProviderPostsStack() {
  return (

    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PostsHome" component={PostsScreen} />
    </Stack.Navigator>

  );
}

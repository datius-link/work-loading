import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

import ProviderPostsScreen from "./PostsScreen";
import PostFeedView from "./PostFeedView";

const Stack = createStackNavigator();

export default function ProviderPostsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="ProviderPostsScreen"
        component={ProviderPostsScreen}
      />

      <Stack.Screen
        name="PostFeedView"
        component={PostFeedView}
      />
    </Stack.Navigator>
  );
}
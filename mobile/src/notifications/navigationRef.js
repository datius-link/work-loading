import { createNavigationContainerRef } from "@react-navigation/native";

// A single, app-wide navigation ref so code outside the React tree (the push
// notification tap handler in pushNotifications.js, and the in-app
// <NotificationBanner /> which is mounted as a sibling of the navigator, not
// inside it) can still navigate. Passed to <NavigationContainer ref={...}>
// in App.js.
export const navigationRef = createNavigationContainerRef();

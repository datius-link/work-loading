import React, { useEffect } from "react";
import { TouchableOpacity, Text, StyleSheet, BackHandler } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function AuthBackButton() {
  const navigation = useNavigation();

  const exitToYou = () => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: "MainTabs",
          state: {
            index: 3, // 👈 You tab (0=Home,1=Activities,2=MyJobs,3=You)
            routes: [{ name: "Home" }, { name: "Activities" }, { name: "MyJobs" }, { name: "You" }],
          },
        },
      ],
    });
    return true;
  };

  // 🔒 Block hardware back
  useEffect(() => {
    const sub = BackHandler.addEventListener(
      "hardwareBackPress",
      exitToYou
    );
    return () => sub.remove();
  }, []);

  return (
    <TouchableOpacity style={styles.btn} onPress={exitToYou}>
      <Text style={styles.text}>← Back</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    marginBottom: 16,
  },
  text: {
    fontSize: 15,
    fontWeight: "600",
  },
});

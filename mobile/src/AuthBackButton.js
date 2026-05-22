import React, { useEffect } from "react";
import { BackHandler, StyleSheet, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Txt from "./Txt";
import AppIcon from "./icons/AppIcon";
import { theme } from "./theme";

export default function AuthBackButton() {
  const navigation = useNavigation();

  const exitToYou = () => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: "MainTabs",
          state: {
            index: 3,
            routes: [
              { name: "Home" },
              { name: "Activities" },
              { name: "MyJobs" },
              { name: "You" },
            ],
          },
        },
      ],
    });
    return true;
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", exitToYou);
    return () => sub.remove();
  }, []);

  return (
    <TouchableOpacity style={styles.btn} onPress={exitToYou}>
      <View style={styles.iconWrap}>
        <AppIcon name="arrowLeft" size={18} color={theme.colors.primary} />
      </View>
      <Txt en="Back" sw="Rudi" style={styles.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    marginBottom: 16,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
  },
  text: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.primary,
  },
});

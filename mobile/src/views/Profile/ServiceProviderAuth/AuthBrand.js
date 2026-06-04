import React from "react";
import { View } from "react-native";
import AppIcon from "../../../icons/AppIcon";
import Txt from "../../../Txt";
import { createAuthStyles } from "./auth";
import { useAppTheme } from "../../../theme";

/**
 * Compact brand block shown at the top of every auth screen.
 * Logo  |  e-kazi
 *        |  Service Provider
 */
export default function AuthBrand() {
  const { theme } = useAppTheme();
  const styles = createAuthStyles(theme);

  return (
    <View style={styles.brandBlock}>
      <View style={styles.brandLogo}>
        <AppIcon name="logo" size={24} color="#FFFFFF" />
      </View>
      <View style={styles.brandTextCol}>
        <Txt en="e-kazi" sw="e-kazi" style={styles.brandName} />
        <Txt
          en="Service Provider"
          sw="Mtoa Huduma"
          style={styles.brandSub}
        />
      </View>
    </View>
  );
}

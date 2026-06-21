import React, { useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Txt from "../../Txt";
import { useAppTheme } from "../../theme";
import SettingsScreen from "./SettingsScreen";

export default function BluetoothDemo({ onBack }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [status, setStatus] = useState("Ready for simulated discovery");
  const [connected, setConnected] = useState(false);

  // TODO: Replace these simulated actions with the approved Bluetooth library for the assignment build.
  const discover = () => setStatus("Demo device discovered: e-kazi Demo Device");
  const connect = () => {
    setConnected(true);
    setStatus("Connected to e-kazi Demo Device (simulated)");
  };
  const disconnect = () => {
    setConnected(false);
    setStatus("Disconnected (simulated)");
  };

  return (
    <SettingsScreen titleEn="Bluetooth Demo" titleSw="Bluetooth Demo" onBack={onBack}>
      <View style={styles.status}>
        <Txt en="STATUS" sw="HALI" style={styles.statusLabel} />
        <Txt en={status} sw={status} style={styles.statusText} />
      </View>
      <DemoButton en="Discover Devices" sw="Tafuta Vifaa" onPress={discover} styles={styles} />
      <DemoButton en="Connect" sw="Unganisha" onPress={connect} styles={styles} />
      <DemoButton en="Disconnect" sw="Tenganisha" onPress={disconnect} styles={styles} secondary />
      <DemoButton
        en="Send Demo Text"
        sw="Tuma Demo Text"
        disabled={!connected}
        onPress={() => setStatus("Demo text sent successfully (simulated)")}
        styles={styles}
      />
      <Txt
        en="Assignment demo only. No real Bluetooth package is installed."
        sw="Hii ni demo ya assignment tu. Hakuna package halisi ya Bluetooth iliyowekwa."
        style={styles.note}
      />
    </SettingsScreen>
  );
}

function DemoButton({ en, sw, onPress, disabled, secondary, styles }) {
  return (
    <TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.secondary, disabled && styles.disabled]}>
      <Txt en={en} sw={sw} style={[styles.buttonText, secondary && styles.secondaryText]} />
    </TouchableOpacity>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    status: { padding: 14, borderRadius: 10, backgroundColor: theme.colors.primarySoft },
    statusLabel: { color: theme.colors.primary, fontSize: 10, fontWeight: "900" },
    statusText: { color: theme.colors.text, fontSize: 13, fontWeight: "800", marginTop: 4 },
    button: { minHeight: 44, borderRadius: 10, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
    secondary: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
    buttonText: { color: theme.colors.onPrimary, fontSize: 13, fontWeight: "900" },
    secondaryText: { color: theme.colors.text },
    disabled: { opacity: 0.4 },
    note: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 16, textAlign: "center" },
  });

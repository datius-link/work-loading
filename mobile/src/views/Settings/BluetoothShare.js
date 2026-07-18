import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Platform, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import AppIcon from "../../icons/AppIcon";
import Txt from "../../Txt";
import { useAppTheme } from "../../theme";
import { useLanguage } from "../../LanguageContext";
import SettingsScreen from "./SettingsScreen";
import * as BT from "../../utils/bluetoothService";

// Real Bluetooth Classic quick-share: discover/pair nearby devices, connect
// over RFCOMM, and send a text message or a photo — no simulation anywhere.
// This screen only works inside a custom dev client / installed APK (see
// eas.json + app.json bluetooth permissions); Expo Go can't load the native
// module, so we detect that up front and explain it instead of crashing.
export default function BluetoothShare({ onBack }) {
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const tx = (en, sw) => (language === "sw" ? sw : en);

  const supported = BT.isSupported();
  const [enabled, setEnabled] = useState(null);
  const [paired, setPaired] = useState([]);
  const [discovered, setDiscovered] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [connecting, setConnecting] = useState(null); // address currently connecting
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");
  const [log, setLog] = useState([]); // { id, direction: 'in'|'out', kind: 'text'|'file', text?, name?, uri?, fraction? }
  const [inbox, setInbox] = useState([]); // files previously received over Bluetooth
  const subscriptionRef = useRef(null);

  const pushLog = (entry) => setLog((prev) => [{ id: `${Date.now()}-${Math.random()}`, ...entry }, ...prev]);

  const refreshInbox = () => BT.listInboxFiles().then(setInbox);

  useEffect(() => {
    if (!supported) return;
    refreshInbox();
    (async () => {
      await BT.requestPermissions();
      setEnabled(await BT.isBluetoothEnabled());
      setPaired(await BT.getPairedDevices().catch(() => []));
    })();
    return () => {
      subscriptionRef.current?.remove?.();
      BT.cancelDiscovery().catch(() => {});
      BT.cancelAccept().catch(() => {});
    };
  }, [supported]);

  // The other phone can walk out of range or turn Bluetooth off at any time —
  // without this, "Connected" would keep showing until the next failed send.
  useEffect(() => {
    if (!supported) return undefined;
    const sub = BT.onDeviceDisconnected((device) => {
      setConnectedDevice((current) => {
        if (!current || current.address !== device.address) return current;
        subscriptionRef.current?.remove?.();
        pushLog({ direction: "system", kind: "text", text: tx(`${device.name || device.address} disconnected`, `${device.name || device.address} ametengana`) });
        return null;
      });
    });
    return () => sub.remove?.();
  }, [supported]);

  const enableBluetooth = async () => {
    try {
      await BT.requestEnableBluetooth();
      setEnabled(await BT.isBluetoothEnabled());
      setPaired(await BT.getPairedDevices().catch(() => []));
    } catch (err) {
      pushLog({ direction: "system", kind: "text", text: tx(`Could not enable Bluetooth: ${err?.message || err}`, `Imeshindikana kuwasha Bluetooth: ${err?.message || err}`) });
    }
  };

  const scan = async () => {
    if (scanning) return;
    setScanning(true);
    setDiscovered([]);
    try {
      const granted = await BT.requestPermissions();
      if (!granted) {
        pushLog({ direction: "system", kind: "text", text: tx("Location permission is required to discover nearby devices.", "Ruhusa ya eneo inahitajika kutafuta vifaa vya karibu.") });
        return;
      }
      const found = await BT.discoverDevices();
      setDiscovered(found);
    } catch (err) {
      pushLog({ direction: "system", kind: "text", text: tx(`Discovery failed: ${err?.message || err}`, `Utafutaji umeshindikana: ${err?.message || err}`) });
    } finally {
      setScanning(false);
    }
  };

  const cancelScan = async () => {
    await BT.cancelDiscovery().catch(() => {});
    setScanning(false);
  };

  const attachListener = (device) => {
    subscriptionRef.current?.remove?.();
    subscriptionRef.current = BT.listenForData(device, (evt) => {
      if (evt.type === "text") {
        pushLog({ direction: "in", kind: "text", text: evt.text });
      } else if (evt.type === "file-start") {
        pushLog({ direction: "in", kind: "file", name: evt.name, fraction: 0, id: `incoming-${evt.name}` });
      } else if (evt.type === "file-progress") {
        setLog((prev) => prev.map((e) => (e.kind === "file" && e.direction === "in" && e.name === evt.name && !e.uri ? { ...e, fraction: evt.fraction } : e)));
      } else if (evt.type === "file-complete") {
        setLog((prev) => prev.map((e) => (e.kind === "file" && e.direction === "in" && e.name === evt.name ? { ...e, fraction: 1, uri: evt.uri } : e)));
        refreshInbox();
      } else if (evt.type === "error") {
        pushLog({ direction: "system", kind: "text", text: evt.message });
      }
    });
  };

  const connect = async (device) => {
    setConnecting(device.address);
    try {
      const connected = await BT.connectToDevice(device.address);
      setConnectedDevice(connected);
      attachListener(connected);
      pushLog({ direction: "system", kind: "text", text: tx(`Connected to ${device.name || device.address}`, `Umeunganishwa na ${device.name || device.address}`) });
    } catch (err) {
      pushLog({ direction: "system", kind: "text", text: tx(`Connection failed: ${err?.message || err}`, `Muunganisho umeshindikana: ${err?.message || err}`) });
    } finally {
      setConnecting(null);
    }
  };

  const pairThenConnect = async (device) => {
    try {
      const paired = await BT.pairDevice(device.address);
      connect(paired);
    } catch (err) {
      pushLog({ direction: "system", kind: "text", text: tx(`Pairing failed: ${err?.message || err}`, `Kuoanisha kumeshindikana: ${err?.message || err}`) });
    }
  };

  const waitForConnection = async () => {
    setListening(true);
    try {
      const device = await BT.acceptIncomingConnection();
      setConnectedDevice(device);
      attachListener(device);
      pushLog({ direction: "system", kind: "text", text: tx(`${device.name || device.address} connected to you`, `${device.name || device.address} amekuunganisha`) });
    } catch (err) {
      pushLog({ direction: "system", kind: "text", text: tx(`Listening stopped: ${err?.message || err}`, `Kusubiri kumesimama: ${err?.message || err}`) });
    } finally {
      setListening(false);
    }
  };

  const cancelListening = async () => {
    await BT.cancelAccept().catch(() => {});
    setListening(false);
  };

  const disconnect = async () => {
    if (!connectedDevice) return;
    subscriptionRef.current?.remove?.();
    await BT.disconnectDevice(connectedDevice.address).catch(() => {});
    setConnectedDevice(null);
  };

  const sendMessage = async () => {
    if (!connectedDevice || !message.trim()) return;
    const text = message.trim();
    try {
      await BT.sendText(connectedDevice, text);
      pushLog({ direction: "out", kind: "text", text });
      setMessage("");
    } catch (err) {
      pushLog({ direction: "system", kind: "text", text: tx(`Send failed: ${err?.message || err}`, `Kutuma kumeshindikana: ${err?.message || err}`) });
    }
  };

  const sendFileOverBluetooth = async ({ uri, name, mimeType }) => {
    const entryId = `outgoing-${name}-${Date.now()}`;
    setLog((prev) => [{ id: entryId, direction: "out", kind: "file", name, fraction: 0 }, ...prev]);
    try {
      await BT.sendFile(connectedDevice, { uri, name, mimeType }, (fraction) => {
        setLog((prev) => prev.map((e) => (e.id === entryId ? { ...e, fraction } : e)));
      });
    } catch (err) {
      pushLog({ direction: "system", kind: "text", text: tx(`File send failed: ${err?.message || err}`, `Kutuma faili kumeshindikana: ${err?.message || err}`) });
    }
  };

  const sendPhoto = async () => {
    if (!connectedDevice) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const name = asset.fileName || `photo-${Date.now()}.jpg`;
    await sendFileOverBluetooth({ uri: asset.uri, name, mimeType: asset.mimeType || "image/jpeg" });
  };

  // Any document — PDF, Word, audio, apk, anything the system picker offers.
  const sendDocument = async () => {
    if (!connectedDevice) return;
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const name = asset.name || `document-${Date.now()}`;
    await sendFileOverBluetooth({ uri: asset.uri, name, mimeType: asset.mimeType || "application/octet-stream" });
  };

  const openInboxFile = async (file) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri);
      }
    } catch (err) {
      pushLog({ direction: "system", kind: "text", text: tx(`Could not open ${file.name}: ${err?.message || err}`, `Imeshindikana kufungua ${file.name}: ${err?.message || err}`) });
    }
  };

  const removeInboxFile = async (file) => {
    await BT.deleteInboxFile(file.uri).catch(() => {});
    refreshInbox();
  };

  if (!supported) {
    return (
      <SettingsScreen titleEn="Bluetooth Share" titleSw="Bluetooth Share" onBack={onBack}>
        <View style={styles.unsupported}>
          <AppIcon name="bluetooth" size={30} color={theme.colors.textMuted} />
          <Txt
            en="Bluetooth isn't available in this build. Real Bluetooth (device discovery, pairing, and file transfer) needs a custom dev client or the installed APK — it can't run inside Expo Go because it uses a native module."
            sw="Bluetooth haipatikani kwenye build hii. Bluetooth halisi (kutafuta vifaa, kuoanisha, na kutuma faili) inahitaji dev client maalum au APK iliyowekwa — haiwezi kufanya kazi ndani ya Expo Go kwa sababu inatumia native module."
            style={styles.unsupportedText}
          />
        </View>
      </SettingsScreen>
    );
  }

  return (
    <SettingsScreen titleEn="Bluetooth Share" titleSw="Bluetooth Share" onBack={onBack}>
      {enabled === false ? (
        <TouchableOpacity style={styles.enableButton} onPress={enableBluetooth}>
          <AppIcon name="bluetooth" size={16} color={theme.colors.onPrimary} />
          <Txt en="Turn on Bluetooth" sw="Washa Bluetooth" style={styles.enableButtonText} />
        </TouchableOpacity>
      ) : null}

      {connectedDevice ? (
        <View style={styles.connectedCard}>
          <View style={styles.connectedRow}>
            <AppIcon name="bluetooth" size={16} color={theme.colors.success} />
            <Txt en={`Connected: ${connectedDevice.name || connectedDevice.address}`} sw={`Umeunganishwa: ${connectedDevice.name || connectedDevice.address}`} style={styles.connectedText} />
          </View>
          <TouchableOpacity onPress={disconnect}>
            <Txt en="Disconnect" sw="Tenganisha" style={styles.disconnectText} />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.rowButtons}>
            <TouchableOpacity style={styles.actionBtn} onPress={scanning ? cancelScan : scan} disabled={enabled === false}>
              {scanning ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <AppIcon name="search" size={15} color={theme.colors.primary} />}
              <Txt en={scanning ? "Cancel scan" : "Scan nearby"} sw={scanning ? "Ghairi utafutaji" : "Tafuta karibu"} style={styles.actionBtnText} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={listening ? cancelListening : waitForConnection} disabled={enabled === false}>
              {listening ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <AppIcon name="bluetooth" size={15} color={theme.colors.primary} />}
              <Txt en={listening ? "Cancel waiting" : "Wait for a device"} sw={listening ? "Ghairi kusubiri" : "Subiri kifaa"} style={styles.actionBtnText} />
            </TouchableOpacity>
          </View>

          {paired.length ? (
            <>
              <Txt en="Paired devices" sw="Vifaa vilivyooanishwa" style={styles.sectionLabel} />
              {paired.map((device) => (
                <DeviceRow key={device.address} device={device} onPress={() => connect(device)} busy={connecting === device.address} styles={styles} theme={theme} />
              ))}
            </>
          ) : null}

          {discovered.length ? (
            <>
              <Txt en="Nearby devices" sw="Vifaa vya karibu" style={styles.sectionLabel} />
              {discovered.map((device) => (
                <DeviceRow key={device.address} device={device} onPress={() => pairThenConnect(device)} busy={connecting === device.address} styles={styles} theme={theme} />
              ))}
            </>
          ) : null}
        </>
      )}

      {connectedDevice ? (
        <View style={styles.composer}>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={tx("Type a message to send over Bluetooth...", "Andika ujumbe wa kutuma kupitia Bluetooth...")}
            placeholderTextColor={theme.colors.textMuted}
            style={styles.input}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
            <AppIcon name="send" size={16} color={theme.colors.onPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoBtn} onPress={sendPhoto}>
            <AppIcon name="camera" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoBtn} onPress={sendDocument}>
            <AppIcon name="file-text" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      ) : null}

      {inbox.length ? (
        <>
          <Txt en="Received files (saved on this phone)" sw="Faili zilizopokelewa (zimehifadhiwa kwenye simu hii)" style={styles.sectionLabel} />
          {inbox.map((file) => (
            <View key={file.uri} style={styles.inboxRow}>
              <AppIcon name="file-text" size={16} color={theme.colors.primary} />
              <TouchableOpacity style={{ flex: 1 }} onPress={() => openInboxFile(file)}>
                <Txt en={file.name} sw={file.name} style={styles.deviceName} numberOfLines={1} />
                <Txt en={formatSize(file.size)} sw={formatSize(file.size)} style={styles.deviceAddress} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openInboxFile(file)} style={styles.inboxAction}>
                <AppIcon name="share2" size={15} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeInboxFile(file)} style={styles.inboxAction}>
                <AppIcon name="trash" size={15} color={theme.colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </>
      ) : null}

      <Txt en="Activity" sw="Shughuli" style={styles.sectionLabel} />
      <FlatList
        data={log}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => <LogRow item={item} styles={styles} theme={theme} tx={tx} />}
        ListEmptyComponent={<Txt en="Nothing sent or received yet." sw="Hakuna kilichotumwa au kupokelewa bado." style={styles.emptyText} />}
      />
    </SettingsScreen>
  );
}

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DeviceRow({ device, onPress, busy, styles, theme }) {
  return (
    <TouchableOpacity style={styles.deviceRow} onPress={onPress} disabled={busy}>
      <AppIcon name="bluetooth" size={16} color={theme.colors.primary} />
      <View style={{ flex: 1 }}>
        <Txt en={device.name || "Unknown device"} sw={device.name || "Kifaa kisichojulikana"} style={styles.deviceName} />
        <Txt en={device.address} sw={device.address} style={styles.deviceAddress} />
      </View>
      {busy ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <AppIcon name="chevron-right" size={16} color={theme.colors.textMuted} />}
    </TouchableOpacity>
  );
}

function LogRow({ item, styles, theme, tx }) {
  if (item.direction === "system") {
    return <Txt en={item.text} sw={item.text} style={styles.systemLog} />;
  }
  const isOut = item.direction === "out";
  if (item.kind === "text") {
    return (
      <View style={[styles.bubble, isOut ? styles.bubbleOut : styles.bubbleIn]}>
        <Txt en={item.text} sw={item.text} style={styles.bubbleText} />
      </View>
    );
  }
  return (
    <View style={[styles.bubble, isOut ? styles.bubbleOut : styles.bubbleIn]}>
      <AppIcon name="file-text" size={14} color={theme.colors.text} />
      <Txt en={item.name} sw={item.name} style={styles.bubbleText} />
      <Txt en={item.uri ? tx("Done", "Imekamilika") : `${Math.round((item.fraction || 0) * 100)}%`} sw={item.uri ? tx("Done", "Imekamilika") : `${Math.round((item.fraction || 0) * 100)}%`} style={styles.bubbleMeta} />
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    unsupported: { alignItems: "center", gap: 12, paddingVertical: 30, paddingHorizontal: 10 },
    unsupportedText: { color: theme.colors.textMuted, fontSize: 12.5, lineHeight: 19, textAlign: "center" },
    enableButton: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", minHeight: 44, borderRadius: 10, backgroundColor: theme.colors.primary, marginBottom: 12 },
    enableButtonText: { color: theme.colors.onPrimary, fontWeight: "900", fontSize: 13 },
    rowButtons: { flexDirection: "row", gap: 10, marginBottom: 10 },
    actionBtn: { flex: 1, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
    actionBtnText: { color: theme.colors.primary, fontWeight: "800", fontSize: 12.5 },
    sectionLabel: { color: theme.colors.text, fontWeight: "900", fontSize: 12, marginTop: 12, marginBottom: 6 },
    deviceRow: { flexDirection: "row", gap: 10, alignItems: "center", minHeight: 50, paddingHorizontal: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, backgroundColor: theme.colors.surface, marginBottom: 6 },
    deviceName: { color: theme.colors.text, fontWeight: "800", fontSize: 13 },
    deviceAddress: { color: theme.colors.textMuted, fontSize: 10.5 },
    connectedCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 46, paddingHorizontal: 12, borderRadius: 10, backgroundColor: theme.colors.successSoft, marginBottom: 12 },
    connectedRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
    connectedText: { color: theme.colors.success, fontWeight: "800", fontSize: 12.5, flexShrink: 1 },
    disconnectText: { color: theme.colors.danger, fontWeight: "800", fontSize: 12 },
    composer: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 6, marginBottom: 4 },
    input: { flex: 1, minHeight: 42, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, color: theme.colors.text, backgroundColor: theme.colors.surface, fontSize: 13 },
    sendBtn: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primary },
    photoBtn: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.border },
    inboxRow: { flexDirection: "row", gap: 10, alignItems: "center", minHeight: 50, paddingHorizontal: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, backgroundColor: theme.colors.surface, marginBottom: 6 },
    inboxAction: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    systemLog: { color: theme.colors.textMuted, fontSize: 11, fontStyle: "italic", marginBottom: 6, textAlign: "center" },
    bubble: { maxWidth: "82%", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, marginBottom: 6 },
    bubbleOut: { alignSelf: "flex-end", backgroundColor: theme.colors.primarySoft },
    bubbleIn: { alignSelf: "flex-start", backgroundColor: theme.colors.surfaceSoft },
    bubbleText: { color: theme.colors.text, fontSize: 12.5, fontWeight: "700" },
    bubbleMeta: { color: theme.colors.textMuted, fontSize: 10 },
    emptyText: { color: theme.colors.textMuted, fontSize: 12, textAlign: "center", paddingVertical: 16 },
  });

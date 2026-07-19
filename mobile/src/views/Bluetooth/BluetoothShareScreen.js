import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import AppIcon from "../../icons/AppIcon";
import Txt from "../../Txt";
import { useAppTheme } from "../../theme";
import { useLanguage } from "../../LanguageContext";
import * as BT from "../../utils/bluetoothService";
import {
  clearActiveDevice,
  getActiveDevice,
  subscribeActiveDevice,
  subscribeSessionEvents,
} from "../../utils/bluetoothSession";

// The dedicated share "activity" for one connected device: opened by tapping
// the device after connecting (Settings → Bluetooth Share). Sends photos and
// videos taken with the camera or picked from the phone, receives the other
// side's files, and links into the in-app Bluetooth Gallery.
export default function BluetoothShareScreen({ navigation, route }) {
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const tx = (en, sw) => (language === "sw" ? sw : en);

  const [device, setDevice] = useState(() => getActiveDevice());
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState([]);

  const deviceName = device?.name || route.params?.name || route.params?.address || "";

  const pushLog = (entry) =>
    setLog((prev) => [{ id: `${Date.now()}-${Math.random()}`, ...entry }, ...prev]);

  // Track connection state: if the other phone disconnects while this screen
  // is open, show it immediately instead of failing on the next send.
  useEffect(() => {
    const unsubscribeDevice = subscribeActiveDevice((next) => setDevice(next));
    const unsubscribeEvents = subscribeSessionEvents((evt) => {
      if (evt.type === "text") {
        pushLog({ direction: "in", kind: "text", text: evt.text });
      } else if (evt.type === "file-start") {
        pushLog({ direction: "in", kind: "file", name: evt.name, fraction: 0 });
      } else if (evt.type === "file-progress") {
        setLog((prev) =>
          prev.map((e) =>
            e.kind === "file" && e.direction === "in" && e.name === evt.name && !e.uri
              ? { ...e, fraction: evt.fraction }
              : e
          )
        );
      } else if (evt.type === "file-complete") {
        setLog((prev) =>
          prev.map((e) =>
            e.kind === "file" && e.direction === "in" && e.name === evt.name
              ? { ...e, fraction: 1, uri: evt.uri, savedToAlbum: evt.savedToAlbum }
              : e
          )
        );
      } else if (evt.type === "error") {
        pushLog({ direction: "system", kind: "text", text: evt.message });
      }
    });
    const disconnectSub = BT.onDeviceDisconnected((gone) => {
      if (getActiveDevice()?.address === gone.address) {
        clearActiveDevice();
        pushLog({
          direction: "system",
          kind: "text",
          text: tx(`${gone.name || gone.address} disconnected`, `${gone.name || gone.address} ametengana`),
        });
      }
    });
    return () => {
      unsubscribeDevice();
      unsubscribeEvents();
      disconnectSub.remove?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendText = async () => {
    if (!device || !message.trim()) return;
    const text = message.trim();
    try {
      await BT.sendText(device, text);
      pushLog({ direction: "out", kind: "text", text });
      setMessage("");
    } catch (err) {
      pushLog({ direction: "system", kind: "text", text: tx(`Send failed: ${err?.message || err}`, `Kutuma kumeshindikana: ${err?.message || err}`) });
    }
  };

  const sendAsset = async (asset, fallbackName) => {
    if (!device) return;
    const name = asset.fileName || asset.name || fallbackName;
    const entryId = `out-${name}-${Date.now()}`;
    setLog((prev) => [
      { id: entryId, direction: "out", kind: "file", name, fraction: 0, localUri: asset.uri },
      ...prev,
    ]);
    setBusy(true);
    try {
      await BT.sendFile(device, { uri: asset.uri, name, mimeType: asset.mimeType }, (fraction) => {
        setLog((prev) => prev.map((e) => (e.id === entryId ? { ...e, fraction } : e)));
      });
      setLog((prev) => prev.map((e) => (e.id === entryId ? { ...e, fraction: 1, done: true } : e)));
    } catch (err) {
      pushLog({ direction: "system", kind: "text", text: tx(`File send failed: ${err?.message || err}`, `Kutuma faili kumeshindikana: ${err?.message || err}`) });
    } finally {
      setBusy(false);
    }
  };

  // Camera: photos AND videos, straight from the lens as the assignment asks.
  const captureWithCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.7,
      videoMaxDuration: 60,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const isVideo = asset.type === "video" || BT.isVideoFile(asset.mimeType || asset.uri);
    await sendAsset(asset, `${isVideo ? "video" : "photo"}-${Date.now()}.${isVideo ? "mp4" : "jpg"}`);
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const isVideo = asset.type === "video" || BT.isVideoFile(asset.mimeType || asset.uri);
    await sendAsset(asset, `${isVideo ? "video" : "photo"}-${Date.now()}.${isVideo ? "mp4" : "jpg"}`);
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets?.[0]) return;
    await sendAsset(result.assets[0], `document-${Date.now()}`);
  };

  const disconnect = async () => {
    const active = getActiveDevice();
    if (active) await BT.disconnectDevice(active.address).catch(() => {});
    clearActiveDevice();
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: insets.top }]} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <AppIcon name="arrowLeft" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Txt en={deviceName} sw={deviceName} style={styles.headerTitle} numberOfLines={1} />
          <Txt
            en={device ? "Connected via Bluetooth" : "Disconnected"}
            sw={device ? "Imeunganishwa kwa Bluetooth" : "Imetengana"}
            style={[styles.headerSub, { color: device ? theme.colors.success : theme.colors.danger }]}
          />
        </View>
        <TouchableOpacity style={styles.galleryBtn} onPress={() => navigation.navigate("BluetoothGallery")}>
          <AppIcon name="image" size={17} color={theme.colors.primary} />
        </TouchableOpacity>
        {device ? (
          <TouchableOpacity style={styles.galleryBtn} onPress={disconnect}>
            <AppIcon name="close" size={17} color={theme.colors.danger} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.actionsRow}>
        <ShareAction icon="camera" en="Camera" sw="Kamera" onPress={captureWithCamera} disabled={!device || busy} styles={styles} theme={theme} />
        <ShareAction icon="image" en="Photo / Video" sw="Picha / Video" onPress={pickFromGallery} disabled={!device || busy} styles={styles} theme={theme} />
        <ShareAction icon="file-text" en="Document" sw="Nyaraka" onPress={pickDocument} disabled={!device || busy} styles={styles} theme={theme} />
      </View>

      <FlatList
        style={styles.log}
        contentContainerStyle={{ paddingVertical: 10 }}
        data={log}
        inverted
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <LogRow item={item} styles={styles} theme={theme} tx={tx} />}
        ListEmptyComponent={
          <Txt
            en="Nothing shared yet. Use the camera or pick a photo, video, or document to send."
            sw="Hakuna kilichotumwa bado. Tumia kamera au chagua picha, video, au nyaraka kutuma."
            style={styles.emptyText}
          />
        }
      />

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder={tx("Message...", "Ujumbe...")}
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          editable={!!device}
        />
        <TouchableOpacity style={[styles.sendBtn, !device && { opacity: 0.5 }]} onPress={sendText} disabled={!device}>
          <AppIcon name="send" size={16} color={theme.colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function ShareAction({ icon, en, sw, onPress, disabled, styles, theme }) {
  return (
    <TouchableOpacity style={[styles.shareAction, disabled && { opacity: 0.45 }]} onPress={onPress} disabled={disabled}>
      <AppIcon name={icon} size={19} color={theme.colors.primary} />
      <Txt en={en} sw={sw} style={styles.shareActionText} />
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
  const previewUri = item.localUri || item.uri;
  const isImage = previewUri && BT.isMediaFile(item.name) && !BT.isVideoFile(item.name);
  const done = item.done || item.uri;
  return (
    <View style={[styles.bubble, styles.fileBubble, isOut ? styles.bubbleOut : styles.bubbleIn]}>
      {isImage ? (
        <Image source={{ uri: previewUri }} style={styles.fileThumb} />
      ) : (
        <AppIcon name={BT.isVideoFile(item.name) ? "play" : "file-text"} size={16} color={theme.colors.text} />
      )}
      <View style={{ flexShrink: 1 }}>
        <Txt en={item.name} sw={item.name} style={styles.bubbleText} numberOfLines={1} />
        <Txt
          en={done ? (item.savedToAlbum ? "Saved to workloading album" : "Done") : `${Math.round((item.fraction || 0) * 100)}%`}
          sw={done ? (item.savedToAlbum ? "Imehifadhiwa kwenye albamu ya workloading" : "Imekamilika") : `${Math.round((item.fraction || 0) * 100)}%`}
          style={styles.bubbleMeta}
        />
      </View>
      {!done ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    backBtn: { width: 40, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft },
    headerTitle: { color: theme.colors.text, fontSize: 16, fontWeight: "900" },
    headerSub: { fontSize: 11, fontWeight: "800", marginTop: 1 },
    galleryBtn: { width: 38, height: 38, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.border },
    actionsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
    shareAction: { flex: 1, alignItems: "center", justifyContent: "center", gap: 5, minHeight: 58, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
    shareActionText: { color: theme.colors.text, fontSize: 11, fontWeight: "800" },
    log: { flex: 1, paddingHorizontal: 14 },
    systemLog: { color: theme.colors.textMuted, fontSize: 11, fontStyle: "italic", marginBottom: 6, textAlign: "center" },
    bubble: { maxWidth: "82%", paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, marginBottom: 6 },
    fileBubble: { flexDirection: "row", alignItems: "center", gap: 8 },
    bubbleOut: { alignSelf: "flex-end", backgroundColor: theme.colors.primarySoft },
    bubbleIn: { alignSelf: "flex-start", backgroundColor: theme.colors.surfaceSoft },
    bubbleText: { color: theme.colors.text, fontSize: 12.5, fontWeight: "700" },
    bubbleMeta: { color: theme.colors.textMuted, fontSize: 10, marginTop: 2 },
    fileThumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: theme.colors.surfaceSoft },
    emptyText: { color: theme.colors.textMuted, fontSize: 12, textAlign: "center", paddingVertical: 24, transform: [{ scaleY: -1 }] },
    composer: { flexDirection: "row", gap: 8, alignItems: "center", paddingHorizontal: 14, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border },
    input: { flex: 1, minHeight: 42, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, color: theme.colors.text, backgroundColor: theme.colors.surface, fontSize: 13 },
    sendBtn: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primary },
  });

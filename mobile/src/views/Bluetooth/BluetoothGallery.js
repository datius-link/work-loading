import React, { useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useVideoPlayer, VideoView } from "expo-video";
import * as Sharing from "expo-sharing";
import AppIcon from "../../icons/AppIcon";
import Txt from "../../Txt";
import { useAppTheme } from "../../theme";
import * as BT from "../../utils/bluetoothService";

const COLUMNS = 3;
const GAP = 4;
const TILE = (Dimensions.get("window").width - GAP * (COLUMNS + 1)) / COLUMNS;

// In-app gallery of everything received over Bluetooth. Photos/videos also
// exist in the phone's "workloading" album (see bluetoothService), but this
// screen works even if the user denied media-library permission.
export default function BluetoothGallery({ navigation }) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState(null); // { name, uri, isVideo }

  useFocusEffect(
    useCallback(() => {
      BT.listInboxFiles().then((all) => setFiles(all.filter((f) => BT.isMediaFile(f.name))));
    }, [])
  );

  const removeFile = async (file) => {
    await BT.deleteInboxFile(file.uri).catch(() => {});
    setFiles((prev) => prev.filter((f) => f.uri !== file.uri));
    setPreview(null);
  };

  const shareFile = async (file) => {
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri).catch(() => {});
  };

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: insets.top }]} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <AppIcon name="arrowLeft" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
        <Txt en="Bluetooth Gallery" sw="Bluetooth Gallery" style={styles.headerTitle} />
      </View>

      <FlatList
        data={files}
        numColumns={COLUMNS}
        keyExtractor={(item) => item.uri}
        contentContainerStyle={{ padding: GAP }}
        renderItem={({ item }) => {
          const isVideo = BT.isVideoFile(item.name);
          return (
            <TouchableOpacity
              style={styles.tile}
              activeOpacity={0.85}
              onPress={() => setPreview({ ...item, isVideo })}
            >
              {isVideo ? (
                <View style={styles.videoTile}>
                  <AppIcon name="play" size={22} color="#fff" filled />
                </View>
              ) : (
                <Image source={{ uri: item.uri }} style={styles.tileImage} />
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <AppIcon name="bluetooth" size={30} color={theme.colors.textMuted} />
            <Txt
              en="No media received over Bluetooth yet."
              sw="Hakuna picha au video zilizopokelewa kwa Bluetooth bado."
              style={styles.emptyText}
            />
          </View>
        }
      />

      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <View style={styles.previewOverlay}>
          <View style={styles.previewHeader}>
            <TouchableOpacity style={styles.previewBtn} onPress={() => setPreview(null)}>
              <AppIcon name="close" size={20} color="#fff" />
            </TouchableOpacity>
            <Txt en={preview?.name || ""} sw={preview?.name || ""} style={styles.previewTitle} numberOfLines={1} />
            <TouchableOpacity style={styles.previewBtn} onPress={() => preview && shareFile(preview)}>
              <AppIcon name="share2" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.previewBtn} onPress={() => preview && removeFile(preview)}>
              <AppIcon name="trash" size={18} color="#ff6b6b" />
            </TouchableOpacity>
          </View>
          {preview?.isVideo ? (
            <VideoPreview uri={preview.uri} />
          ) : preview ? (
            <Image source={{ uri: preview.uri }} style={styles.previewImage} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function VideoPreview({ uri }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    instance.play();
  });
  return <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls />;
}

const createStyles = (theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    backBtn: { width: 40, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft },
    headerTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "900" },
    tile: { width: TILE, height: TILE, margin: GAP / 2, borderRadius: 6, overflow: "hidden", backgroundColor: theme.colors.surfaceSoft },
    tileImage: { width: "100%", height: "100%" },
    videoTile: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000" },
    empty: { alignItems: "center", gap: 12, paddingVertical: 60 },
    emptyText: { color: theme.colors.textMuted, fontSize: 12.5, textAlign: "center", paddingHorizontal: 30 },
    previewOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.96)" },
    previewHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingTop: 40, paddingBottom: 10 },
    previewBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)" },
    previewTitle: { flex: 1, color: "#fff", fontSize: 13, fontWeight: "800" },
    previewImage: { flex: 1 },
  });

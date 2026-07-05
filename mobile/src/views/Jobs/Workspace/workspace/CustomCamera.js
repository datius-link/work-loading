/**
 * CustomCamera.js — in-app camera for the Job Workspace chat.
 *
 * Photos and videos are captured without ever leaving e-kazi (no OS camera
 * app hand-off). Captured media is handed back to the caller in the exact
 * same shape used everywhere else in the chat ({uri, type, width, height,
 * duration, fileName, mimeType}) so it plugs straight into MediaComposer.
 *
 * Requires the `expo-camera` package. If it isn't installed yet, run:
 *   npx expo install expo-camera
 * (then reload/rebuild — this is a native module, a JS-only reload isn't
 * enough if you're on a custom dev client rather than Expo Go).
 */
import React, { useRef, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import AppIcon from "../../../../icons/AppIcon";
import { useAppTheme } from "../../../../theme";

export default function CustomCamera({ visible, initialMode = "photo", onClose, onCapture }) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const s = createStyles(theme);
  const cameraRef = useRef(null);
  const recordStartRef = useRef(0);

  const [camPermission, requestCamPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [facing, setFacing] = useState("back");
  const [mode, setMode] = useState(initialMode === "video" ? "video" : "picture");
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!visible) return null;

  const permissionsReady = camPermission?.granted && (mode === "picture" || micPermission?.granted);

  const requestAll = async () => {
    if (!camPermission?.granted) await requestCamPermission();
    if (mode === "video" && !micPermission?.granted) await requestMicPermission();
  };

  const takePhoto = async () => {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      onCapture?.({
        uri: photo.uri,
        type: "image",
        width: photo.width || null,
        height: photo.height || null,
        duration: null,
        fileName: null,
        mimeType: "image/jpeg",
      });
    } catch (e) {
      console.log("camera capture error", e?.message);
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current || recording) return;
    setRecording(true);
    recordStartRef.current = Date.now();
    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: 120 });
      const duration = Date.now() - recordStartRef.current;
      if (video?.uri) {
        onCapture?.({
          uri: video.uri,
          type: "video",
          width: null,
          height: null,
          duration,
          fileName: null,
          mimeType: "video/mp4",
        });
      }
    } catch (e) {
      console.log("camera record error", e?.message);
    } finally {
      setRecording(false);
    }
  };

  const stopRecording = () => {
    cameraRef.current?.stopRecording();
  };

  const handleShutterPress = () => {
    if (mode === "picture") {
      takePhoto();
    } else if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.root}>
        {!permissionsReady ? (
          <View style={[s.permissionWrap, { paddingTop: insets.top + 20 }]}>
            <TouchableOpacity style={[s.closeBtn, s.permissionClose]} onPress={onClose} activeOpacity={0.8}>
              <AppIcon name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={s.permissionIcon}>
              <AppIcon name="camera" size={30} color={theme.colors.primaryStrong} />
            </View>
            <Text style={s.permissionTitle}>Camera access needed</Text>
            <Text style={s.permissionBody}>
              e-kazi needs camera{mode === "video" ? " and microphone" : ""} access to take photos and record videos for this job.
            </Text>
            <TouchableOpacity style={s.permissionBtn} onPress={requestAll} activeOpacity={0.85}>
              <Text style={s.permissionBtnTxt}>Allow Access</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} mode={mode} />

            {/* In-app back button — never rely on the OS back gesture alone. */}
            <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
              <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.8} disabled={recording}>
                <AppIcon name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              {/* "history" is reused here purely for its circular-arrow shape
                 — the icon set has no dedicated flip-camera glyph. */}
              <TouchableOpacity style={s.closeBtn} onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))} activeOpacity={0.8} disabled={recording}>
                <AppIcon name="history" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {recording ? (
              <View style={s.recBadge}>
                <View style={s.recDot} />
                <Text style={s.recTxt}>Recording…</Text>
              </View>
            ) : null}

            <View style={[s.bottomBar, { paddingBottom: insets.bottom + 18 }]}>
              <View style={s.modeRow}>
                <TouchableOpacity onPress={() => !recording && setMode("picture")} disabled={recording}>
                  <Text style={[s.modeTxt, mode === "picture" && s.modeTxtActive]}>Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => !recording && setMode("video")} disabled={recording}>
                  <Text style={[s.modeTxt, mode === "video" && s.modeTxtActive]}>Video</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={s.shutterOuter} onPress={handleShutterPress} activeOpacity={0.8} disabled={busy}>
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={[s.shutterInner, mode === "video" && s.shutterInnerVideo, recording && s.shutterInnerRecording]} />
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: "#000000" },
    topBar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, zIndex: 5 },
    closeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
    recBadge: { position: "absolute", top: 70, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
    recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#E63946" },
    recTxt: { color: "#fff", fontSize: 12, fontWeight: "800" },
    bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center", gap: 16 },
    modeRow: { flexDirection: "row", gap: 22 },
    modeTxt: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
    modeTxtActive: { color: "#FFFFFF" },
    shutterOuter: { width: 74, height: 74, borderRadius: 37, borderWidth: 4, borderColor: "rgba(255,255,255,0.85)", alignItems: "center", justifyContent: "center" },
    shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#FFFFFF" },
    shutterInnerVideo: { backgroundColor: "#E63946" },
    shutterInnerRecording: { width: 28, height: 28, borderRadius: 8 },

    permissionWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 },
    permissionClose: { position: "absolute", top: 20, left: 16 },
    permissionIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 4 },
    permissionTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
    permissionBody: { color: "rgba(255,255,255,0.7)", fontSize: 13.5, textAlign: "center", lineHeight: 20 },
    permissionBtn: { marginTop: 10, backgroundColor: theme.colors.primary, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14 },
    permissionBtnTxt: { color: theme.colors.onPrimary, fontSize: 14, fontWeight: "800" },
  });

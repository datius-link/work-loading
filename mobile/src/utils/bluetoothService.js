// Real Bluetooth Classic (RFCOMM/SPP) wrapper around react-native-bluetooth-classic.
//
// This is Android-only (the assignment's "Bluetooth" requirement is an Android
// feature; iOS Bluetooth Classic requires MFi-certified accessories and isn't
// something a phone-to-phone "quick share" can use). Every function here talks
// to a REAL BluetoothAdapter/BluetoothSocket on the device — there is no
// simulated/demo path left. It only works inside a custom dev client / release
// build (see eas.json) — Expo Go cannot load native modules like this one.
//
// Protocol: the underlying library reads/writes newline-delimited strings, so
// there's no built-in "file" concept — we build one ourselves:
//   TEXT:<message>                                  — a plain chat-style message
//   FILE_META:<name>:<mime>:<totalChunks>            — announces an incoming file
//   FILE_CHUNK:<index>:<base64 chunk>                — one piece of the file
//   FILE_END:<name>                                  — marks the file complete
// Chunks are base64 (never contains the newline delimiter), capped at ~12KB
// per chunk so a single write/read stays fast and reliable over RFCOMM.

import { NativeModules, PermissionsAndroid, Platform } from "react-native";
import * as FileSystem from "expo-file-system";

let RNBluetoothClassic = null;
try {
  // Guarded require: on a build that doesn't include the native module yet
  // (e.g. still running in Expo Go, or before the first dev-client build),
  // this throws instead of crashing the whole app at import time.
  RNBluetoothClassic = require("react-native-bluetooth-classic").default;
} catch {
  RNBluetoothClassic = null;
}

const CHUNK_SIZE = 12000; // base64 chars per chunk

export function isSupported() {
  return Platform.OS === "android" && !!RNBluetoothClassic && !!NativeModules.RNBluetoothClassic;
}

export async function requestPermissions() {
  if (Platform.OS !== "android") return true;
  const sdkInt = Platform.Version;
  const permissions = [];
  if (sdkInt >= 31) {
    permissions.push(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE
    );
  }
  // Discovery (startDiscovery) needs location on every Android version that
  // still supports classic discovery scans, 31+ included unless the app
  // declares neverForLocation — we don't, since we want it to work everywhere.
  permissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);

  const results = await PermissionsAndroid.requestMultiple(permissions);
  return Object.values(results).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
}

export async function isBluetoothEnabled() {
  if (!isSupported()) return false;
  try {
    return await RNBluetoothClassic.isBluetoothEnabled();
  } catch {
    return false;
  }
}

export async function requestEnableBluetooth() {
  if (!isSupported()) return false;
  return RNBluetoothClassic.requestBluetoothEnabled();
}

export async function getPairedDevices() {
  if (!isSupported()) return [];
  return RNBluetoothClassic.getBondedDevices();
}

export async function discoverDevices() {
  if (!isSupported()) return [];
  return RNBluetoothClassic.startDiscovery();
}

export async function cancelDiscovery() {
  if (!isSupported()) return false;
  return RNBluetoothClassic.cancelDiscovery();
}

export async function pairDevice(address) {
  if (!isSupported()) throw new Error("Bluetooth not supported on this build");
  return RNBluetoothClassic.pairDevice(address);
}

// readSize/charset must match on both the connecting and accepting side:
// the library's default readSize (1024 bytes) is well under our ~12KB file
// chunks, which forces many extra native read loops per chunk (slower, more
// chances to stall on weaker Bluetooth radios); the default charset (ascii)
// silently mangles non-ASCII text (emoji, accented characters) sent as utf-8.
const CONNECTION_OPTIONS = { charset: "utf-8", readSize: 16384 };

export async function connectToDevice(address) {
  if (!isSupported()) throw new Error("Bluetooth not supported on this build");
  return RNBluetoothClassic.connectToDevice(address, CONNECTION_OPTIONS);
}

export async function disconnectDevice(address) {
  if (!isSupported()) return false;
  return RNBluetoothClassic.disconnectFromDevice(address);
}

// Puts this device into "listening" mode so a nearby phone can connect to it
// (the receiving side of a quick-share, mirroring accept()/listen() on a
// classic BluetoothServerSocket). Resolves with the connected BluetoothDevice
// once someone connects.
export async function acceptIncomingConnection() {
  if (!isSupported()) throw new Error("Bluetooth not supported on this build");
  return RNBluetoothClassic.accept(CONNECTION_OPTIONS);
}

export async function cancelAccept() {
  if (!isSupported()) return false;
  return RNBluetoothClassic.cancelAccept();
}

export function openBluetoothSettings() {
  if (!isSupported()) return;
  RNBluetoothClassic.openBluetoothSettings();
}

// Fires when the physical link drops (e.g. the other phone walks out of
// range or turns Bluetooth off) — without this the UI has no way to notice
// a "connected" device has actually gone away until the next failed write.
export function onDeviceDisconnected(callback) {
  if (!isSupported()) return { remove: () => {} };
  return RNBluetoothClassic.onDeviceDisconnected((event) => callback(event.device));
}

export async function sendText(device, text) {
  if (!device) throw new Error("No connected device");
  await device.write(`TEXT:${text}`, "utf-8");
}

// Reads a local file (uri from expo-image-picker or similar), base64-encodes
// it, and streams it to the connected device using the chunk protocol above.
// onProgress(fraction) is called after each chunk so the UI can show a bar.
export async function sendFile(device, { uri, name, mimeType }, onProgress) {
  if (!device) throw new Error("No connected device");
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const totalChunks = Math.max(1, Math.ceil(base64.length / CHUNK_SIZE));
  const safeName = (name || `ekazi-share-${Date.now()}`).replace(/:/g, "_");
  const safeMime = (mimeType || "application/octet-stream").replace(/:/g, "_");

  await device.write(`FILE_META:${safeName}:${safeMime}:${totalChunks}`, "utf-8");

  for (let i = 0; i < totalChunks; i++) {
    const chunk = base64.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    await device.write(`FILE_CHUNK:${i}:${chunk}`, "utf-8");
    onProgress?.((i + 1) / totalChunks);
  }

  await device.write(`FILE_END:${safeName}`, "utf-8");
}

// Wraps device.onDataReceived and reassembles the chunk protocol into
// higher-level events for the UI:
//   { type: "text", text }
//   { type: "file-start", name, mime, totalChunks }
//   { type: "file-progress", name, fraction }
//   { type: "file-complete", name, uri }
export function listenForData(device, onEvent) {
  const incoming = { name: null, mime: null, totalChunks: 0, chunks: [] };

  const subscription = device.onDataReceived(async (event) => {
    const line = event?.data ?? "";
    if (line.startsWith("TEXT:")) {
      onEvent({ type: "text", text: line.slice(5) });
      return;
    }
    if (line.startsWith("FILE_META:")) {
      const [, name, mime, totalChunksStr] = line.split(":");
      incoming.name = name;
      incoming.mime = mime;
      incoming.totalChunks = Number(totalChunksStr) || 0;
      incoming.chunks = new Array(incoming.totalChunks).fill("");
      onEvent({ type: "file-start", name, mime, totalChunks: incoming.totalChunks });
      return;
    }
    if (line.startsWith("FILE_CHUNK:")) {
      const rest = line.slice("FILE_CHUNK:".length);
      const sep = rest.indexOf(":");
      const index = Number(rest.slice(0, sep));
      const chunk = rest.slice(sep + 1);
      incoming.chunks[index] = chunk;
      const received = incoming.chunks.filter(Boolean).length;
      onEvent({ type: "file-progress", name: incoming.name, fraction: incoming.totalChunks ? received / incoming.totalChunks : 0 });
      return;
    }
    if (line.startsWith("FILE_END:")) {
      const name = line.slice("FILE_END:".length);
      const base64 = incoming.chunks.join("");
      const destUri = `${FileSystem.documentDirectory}${name}`;
      try {
        await FileSystem.writeAsStringAsync(destUri, base64, { encoding: FileSystem.EncodingType.Base64 });
        onEvent({ type: "file-complete", name, uri: destUri });
      } catch (err) {
        onEvent({ type: "error", message: err?.message || "Could not save received file" });
      }
      incoming.name = null;
      incoming.chunks = [];
      incoming.totalChunks = 0;
      return;
    }
  });

  return subscription;
}

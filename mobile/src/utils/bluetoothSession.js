// Holds the live Bluetooth connection so multiple screens can share it.
//
// React Navigation params must stay serializable, but the connected
// BluetoothDevice from react-native-bluetooth-classic is a live native object
// (it carries the open RFCOMM socket). Screens therefore navigate with just
// the device address and pull the real object from this module.
//
// This module also owns the ONE data listener for the connection. If every
// screen called BT.listenForData itself, each subscription would reassemble
// and write incoming files separately (duplicate saves, double gallery
// entries). Instead the session listens once and fans events out.

import * as BT from "./bluetoothService";

let currentDevice = null;
let dataSubscription = null;
const deviceListeners = new Set();
const eventListeners = new Set();

function emitEvent(event) {
  eventListeners.forEach((listener) => listener(event));
}

export function setActiveDevice(device) {
  dataSubscription?.remove?.();
  dataSubscription = null;
  currentDevice = device;
  if (device) {
    dataSubscription = BT.listenForData(device, emitEvent);
  }
  deviceListeners.forEach((listener) => listener(currentDevice));
}

export function getActiveDevice() {
  return currentDevice;
}

export function clearActiveDevice() {
  setActiveDevice(null);
}

// Fires with the device (or null) whenever the active connection changes.
// Returns an unsubscribe function.
export function subscribeActiveDevice(listener) {
  deviceListeners.add(listener);
  return () => deviceListeners.delete(listener);
}

// Fires with the events produced by bluetoothService.listenForData:
// { type: "text" | "file-start" | "file-progress" | "file-complete" | "error", ... }
// Returns an unsubscribe function.
export function subscribeSessionEvents(listener) {
  eventListeners.add(listener);
  return () => eventListeners.delete(listener);
}

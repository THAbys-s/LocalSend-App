export const UDP_PORT = 53317;
export const HANDSHAKE_PORT = 53317;
export const DEFAULT_TCP_PORT = 53318;
export const BROADCAST_ADDR = "255.255.255.255";
export const BEACON_INTERVAL_MS = 2000;
export const DEVICE_TIMEOUT_MS = 6000; // si no vemos beacon en 6s lo consideramos perdido

export const channels = {
  sendFile: "ipc-send-file",
  getDevices: "ipc-get-devices",
  setConfig: "ipc-set-config",
  transferRequest: "transfer:request",
  transferRespond: "transfer:respond",
  transferProgress: "transfer:progress",
  deviceFound: "device:found",
  deviceLost: "device:lost",
  selectDownloadDir: "ipc-select-download-dir",
  getConfig: "ipc-get-config",
};

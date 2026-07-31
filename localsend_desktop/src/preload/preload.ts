import { contextBridge, ipcRenderer, webUtils } from "electron";
import type {
  DeviceInfo,
  TransferRequestData,
  SendFilePayload,
  ServerStatusData,
} from "../shared";

contextBridge.exposeInMainWorld("electronAPI", {
  onDeviceFound: (cb: (device: DeviceInfo) => void) =>
    ipcRenderer.on("device:found", (_event, device) => cb(device)),
  onDeviceLost: (cb: (deviceId: string) => void) =>
    ipcRenderer.on("device:lost", (_event, deviceId) => cb(deviceId)),
  onTransferRequest: (cb: (data: TransferRequestData) => void) =>
    ipcRenderer.on("transfer:request", (_event, data) => cb(data)),
  onTransferProgress: (cb: (data: any) => void) =>
    ipcRenderer.on("transfer:progress", (_event, data) => cb(data)),
  onServerStatus: (cb: (data: ServerStatusData) => void) =>
    ipcRenderer.on("server:status", (_event, data) => cb(data)),
  respondTransfer: (deviceId: string, accept: boolean, reason?: string) =>
    ipcRenderer.invoke("transfer:respond", { deviceId, accept, reason }),
  removeAllListeners: (channel: string) =>
    ipcRenderer.removeAllListeners(channel),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  sendFile: (payload: SendFilePayload) =>
    ipcRenderer.invoke("ipc-send-file", payload),
  selectDownloadDir: () => ipcRenderer.invoke("ipc-select-download-dir"),
  getConfig: () => ipcRenderer.invoke("ipc-get-config"),
  getServerStatus: () => ipcRenderer.invoke("ipc-get-server-status"),
});

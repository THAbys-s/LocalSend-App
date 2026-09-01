import { contextBridge, ipcRenderer, webUtils } from "electron";
import { channels } from "../shared/constants";
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
  onTransferRequestExpired: (
    cb: (data: { deviceId: string; alias: string }) => void,
  ) => ipcRenderer.on("transfer:request-expired", (_event, data) => cb(data)),
  onTransferResolvedByNotification: (
    cb: (data: { deviceId: string; accepted: boolean }) => void,
  ) =>
    ipcRenderer.on("transfer:resolved-by-notification", (_event, data) =>
      cb(data),
    ),
  onTransferProgress: (cb: (data: any) => void) =>
    ipcRenderer.on("transfer:progress", (_event, data) => cb(data)),
  onServerStatus: (cb: (data: ServerStatusData) => void) =>
    ipcRenderer.on("server:status", (_event, data) => cb(data)),
  cancelTransfer: () => ipcRenderer.invoke("transfer:cancel"),
  respondTransfer: (
    deviceId: string,
    accept: boolean,
    reason?: string,
    collisionPolicy?: "replace" | "keepBoth" | "skip",
  ) =>
    ipcRenderer.invoke("transfer:respond", {
      deviceId,
      accept,
      reason,
      collisionPolicy,
    }),
  removeAllListeners: (channel: string) =>
    ipcRenderer.removeAllListeners(channel),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  sendFile: (payload: SendFilePayload) =>
    ipcRenderer.invoke("ipc-send-file", payload),
  selectFileToSend: () => ipcRenderer.invoke(channels.selectFileToSend),
  selectDownloadDir: () => ipcRenderer.invoke(channels.selectDownloadDir),
  getConfig: () => ipcRenderer.invoke(channels.getConfig),
  getServerStatus: () => ipcRenderer.invoke(channels.getServerStatus),
  getDevices: () => ipcRenderer.invoke(channels.getDevices),
});

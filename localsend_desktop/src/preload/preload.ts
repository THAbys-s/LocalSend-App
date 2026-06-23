import { contextBridge, ipcRenderer } from 'electron';
import type { DeviceInfo, TransferRequestData } from '../shared';

contextBridge.exposeInMainWorld('electronAPI', {
  onDeviceFound: (cb: (device: DeviceInfo) => void) =>
    ipcRenderer.on('device:found', (_event, device) => cb(device)),

  onDeviceLost: (cb: (deviceId: string) => void) =>
    ipcRenderer.on('device:lost', (_event, deviceId) => cb(deviceId)),

  onTransferRequest: (cb: (data: TransferRequestData) => void) =>
    ipcRenderer.on('transfer:request', (_event, data) => cb(data)),

  respondTransfer: (deviceId: string, accept: boolean, reason?: string) =>
    ipcRenderer.invoke('transfer:respond', { deviceId, accept, reason }),

  removeAllListeners: (channel: string) =>
    ipcRenderer.removeAllListeners(channel),
});
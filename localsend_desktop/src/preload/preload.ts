import { contextBridge, ipcRenderer } from 'electron';
import type { DeviceInfo } from '../shared/device.types';

contextBridge.exposeInMainWorld('electronAPI', {
  onDeviceFound: (cb: (device: DeviceInfo) => void) =>
    ipcRenderer.on('device:found', (_event, device) => cb(device)),

  onDeviceLost: (cb: (deviceId: string) => void) =>
    ipcRenderer.on('device:lost', (_event, deviceId) => cb(deviceId)),

  removeAllListeners: (channel: string) =>
    ipcRenderer.removeAllListeners(channel),
});
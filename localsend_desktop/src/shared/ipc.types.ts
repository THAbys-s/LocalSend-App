import type { DeviceInfo } from './device.types';

export const IPC_CHANNELS = {
  DEVICE_FOUND:   'device:found',
  DEVICE_LOST:    'device:lost',
  GET_DEVICES:    'device:get-all',
} as const;

export interface IpcDeviceFoundPayload {
  device: DeviceInfo;
}
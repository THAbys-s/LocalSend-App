import type { DeviceInfo } from './device.types';
import type { TransferRequestData } from './transfer.types';

declare global {
  interface Window {
    electronAPI: {
      onDeviceFound: (cb: (device: DeviceInfo) => void) => void;
      onDeviceLost: (cb: (deviceId: string) => void) => void;
      onTransferRequest: (cb: (data: TransferRequestData) => void) => void;
      respondTransfer: (deviceId: string, accept: boolean, reason?: string) => Promise<{ success: boolean }>;
      removeAllListeners: (channel: string) => void;
    };
  }
}

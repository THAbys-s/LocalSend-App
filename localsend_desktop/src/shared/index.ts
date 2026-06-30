declare global {
  interface Window {
    electronAPI: {
      onDeviceFound: (cb: (device: DeviceInfo) => void) => void;
      onDeviceLost: (cb: (deviceId: string) => void) => void;
      onTransferRequest: (cb: (data: TransferRequestData) => void) => void;
      onTransferProgress: (cb: (data: TransferProgressData) => void) => void; // ← agregado
      respondTransfer: (
        deviceId: string,
        accept: boolean,
        reason?: string,
      ) => Promise<{ success: boolean }>;
      removeAllListeners: (channel: string) => void;
      getPathForFile: (file: File) => string;
      sendFile: (
        payload: SendFilePayload,
      ) => Promise<{ success: boolean; error?: string }>;
    };
  }
}

export type DeviceType = "desktop" | "laptop" | "mobile" | "unknown";
export type DeviceOS =
  | "windows"
  | "macos"
  | "linux"
  | "android"
  | "ios"
  | "unknown";

export interface DeviceInfo {
  id: string;
  alias: string;
  ip: string;
  port: number;
  deviceType: DeviceType;
  os: DeviceOS;
  version: string;
}

export interface BeaconPayload {
  type: "beacon";
  id: string;
  alias: string;
  deviceType: DeviceType;
  os: DeviceOS;
  port: number;
  version: string;
}

export type CollisionPolicy = "replace" | "keepBoth" | "skip";

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
}

export interface Transfer {
  fileName: string;
  progress: number;
  bytesSent: number;
  totalBytes: number;
  speed: number;
  status: TransferStatus;
}

export interface TransferRequest {
  id: string;
  files: FileMetadata[];
  policy: CollisionPolicy;
}

export interface SendFilePayload {
  filePath: string;
  targetIp: string;
  deviceId: string;
}

export interface TransferRequestData {
  deviceId: string;
  alias: string;
  file: {
    name: string;
    size: number;
    mimeType: string;
  };
}

export interface TransferProgressData {
  fileName: string;
  bytesSent: number;
  totalBytes: number;
  progress: number;
  speed?: number;
  done?: boolean;
  error?: string;
}

export type TransferStatus =
  | "connecting"
  | "transferring"
  | "complete"
  | "error";

export interface AppConfig {
  deviceId: string;
  deviceAlias: string;
  downloadDir?: string;
}

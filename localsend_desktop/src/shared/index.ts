declare global {
  interface Window {
    electronAPI: {
      onDeviceFound: (cb: (device: DeviceInfo) => void) => void;
      onDeviceLost: (cb: (deviceId: string) => void) => void;
      onTransferRequest: (cb: (data: TransferRequestData) => void) => void;
      onTransferRequestExpired: (
        cb: (data: { deviceId: string; alias: string }) => void,
      ) => void;
      onTransferResolvedByNotification: (
        cb: (data: { deviceId: string; accepted: boolean }) => void,
      ) => void;
      onTransferProgress: (cb: (data: TransferProgressData) => void) => void;
      respondTransfer: (
        deviceId: string,
        accept: boolean,
        reason?: string,
        collisionPolicy?: CollisionPolicy,
      ) => Promise<{ success: boolean }>;
      removeAllListeners: (channel: string) => void;
      sendFile: (
        payload: SendFilePayload,
      ) => Promise<{ success: boolean; error?: string }>;
      selectDownloadDir: () => Promise<{ success: boolean; path?: string }>;
      selectFileToSend: () => Promise<
        | { canceled: true; file?: undefined }
        | { canceled: false; file: FileToSend }
      >;
      onServerStatus: (cb: (data: ServerStatusData) => void) => void;
      getServerStatus: () => Promise<ServerStatusData>;
      getPathForFile: (file: File) => string;
      getDevices: () => Promise<DeviceInfo[]>;
      getConfig: () => Promise<{
        deviceId: string;
        deviceAlias: string;
        downloadDir: string | null;
      }>;
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

export interface FileToSend {
  path: string;
  name: string;
  size: number;
}

export interface Transfer {
  fileName: string;
  progress: number;
  bytesSent: number;
  totalBytes: number;
  speed: number;
  status: TransferStatus;
  errorCode?: TransferError;
  errorMessage?: string;
  resumable?: boolean;
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
  hasCollision?: boolean;
}

export interface TransferProgressData {
  fileName: string;
  bytesSent: number;
  totalBytes: number;
  progress: number;
  speed?: number;
  status: TransferStatus;
  error?: string;
  errorCode?: TransferError;
  resumable?: boolean;
}

export interface TransferProgress {
  fileName: string;
  bytesSent: number;
  totalBytes: number;
  progress: number;
  speed?: number;
  status: TransferStatus;
  error?: string;
}

export type TransferStatus =
  | "connecting"
  | "transferring"
  | "paused"
  | "waiting"
  | "complete"
  | "cancelled"
  | "error";

type TransferError =
  | "connection_lost"
  | "timeout"
  | "receiver_cancelled"
  | "sender_cancelled"
  | "disk_full"
  | "permission_denied"
  | "rejected";

export interface AppConfig {
  deviceId: string;
  deviceAlias: string;
  downloadDir?: string;
}

export interface ServicesStatus {
  udp: boolean;
  ws: boolean;
  tcp: boolean;
}

export interface ServerStatusData {
  isActive: boolean;
  status: ServicesStatus;
}

export type CollisionPolicy = 'replace' | 'keepBoth' | 'skip';

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
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
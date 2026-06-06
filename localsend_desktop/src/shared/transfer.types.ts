export interface FileMetadata {
  name: string;
  size: number;
  type: string;
}

export type CollisionPolicy = 'replace' | 'keepBoth' | 'skip';

export interface TransferRequest {
  id: string;
  files: FileMetadata[];
  policy: CollisionPolicy;
}

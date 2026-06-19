export type DeviceType = 'desktop' | 'laptop' | 'mobile' | 'unknown';

export type DeviceOS = 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'unknown';

export interface DeviceInfo {
  id: string;
  alias: string;
  ip: string;
  port: number;
  deviceType: DeviceType;
  os: DeviceOS;
  version: string;
}
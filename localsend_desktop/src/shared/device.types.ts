export type DeviceType = 'desktop' | 'laptop' | 'mobile' | 'unknown';

export interface DeviceInfo {
  id: string;           
  ip: string;
  port: number;        
  deviceType: DeviceType;
  os: 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'unknown';
  version: string;     
}
import { useEffect, useState } from 'react';
import { DeviceInfo } from '../../shared/device.types';

export function useDevices() {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);

  useEffect(() => {
    setDevices([]);
  }, []);

  return devices;
}

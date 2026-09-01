import { useState, useEffect } from "react";
import type { DeviceInfo } from "../../shared";

interface UseDiscoveryResult {
  devices: DeviceInfo[];
}

export function useDiscovery(): UseDiscoveryResult {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const current = await window.electronAPI.getDevices();
        setDevices(current);
      } catch {
        setDevices([]);
      }
    };

    loadDevices();

    window.electronAPI.onDeviceFound((device) => {
      setDevices((prev) => {
        const exists = prev.some((d) => d.id === device.id);
        if (exists) {
          return prev.map((d) => (d.id === device.id ? device : d));
        }

        return [...prev, device];
      });
    });

    window.electronAPI.onDeviceLost((deviceId) => {
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
    });
    return () => {
      window.electronAPI.removeAllListeners("device:found");
      window.electronAPI.removeAllListeners("device:lost");
    };
  }, []);

  return { devices };
}

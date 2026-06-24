import { useState, useEffect, useCallback, useRef } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import {
  discoveryService,
  DiscoveredDevice,
} from "../services/DiscoveryService";

export type ScanStatus = "idle" | "checking" | "scanning" | "no_wifi" | "error";

export interface UseDiscoveryResult {
  devices: DiscoveredDevice[];
  status: ScanStatus;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  ping: () => void;
  isScanning: boolean;
  renameDevice: (deviceId: string, name: string) => void;
  editingDeviceId: string | null;
  setEditingDeviceId: (id: string | null) => void;
  tempName: string;
  setTempName: (name: string) => void;
}

export function useDiscovery(): UseDiscoveryResult {
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [tempName, setTempName] = useState("");

  const running = useRef(false);
  const unsubscribeRef = useRef<null | (() => void)>(null);

  const stop = useCallback(() => {
    if (!running.current) return;

    running.current = false;
    discoveryService.stop();

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    setStatus("idle");
    setDevices([]);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStatus("checking");

    const net = await NetInfo.fetch();

    if (!net.isConnected || net.type !== "wifi") {
      setStatus("no_wifi");
      return;
    }

    if (running.current) {
      discoveryService.ping().catch(console.error);
      return;
    }

    try {
      running.current = true;
      setStatus("scanning");

      const unsub = discoveryService.addListener((updated) => {
        console.log("DEVICES RAW:", updated);
        setDevices([...updated]);
      });

      unsubscribeRef.current = unsub;

      await discoveryService.start();
    } catch (err: any) {
      running.current = false;
      setStatus("error");
      setError(err?.message ?? "Error de red");
    }
  }, []);

  const ping = useCallback(() => {
    discoveryService.ping().catch(console.error);
  }, []);

  const renameDevice = useCallback((deviceId: string, name: string) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === deviceId ? { ...d, alias: name } : d)),
    );
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && running.current) {
        discoveryService.ping().catch(console.error);
      }
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      if (!state.isConnected || state.type !== "wifi") {
        stop();
        setStatus("no_wifi");
      }
    });

    return unsub;
  }, [stop]);

  useEffect(() => {
    return () => {
      discoveryService.stop();
      running.current = false;

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  return {
    devices,
    status,
    error,
    start,
    stop,
    ping,
    isScanning: status === "scanning",
    renameDevice,
    editingDeviceId,
    setEditingDeviceId,
    tempName,
    setTempName,
  };
}

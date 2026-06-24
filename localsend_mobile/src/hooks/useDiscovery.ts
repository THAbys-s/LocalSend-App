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
}

export function useDiscovery(): UseDiscoveryResult {
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [error, setError] = useState<string | null>(null);

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

    try {
      if (running.current) {
        discoveryService.ping().catch(console.error);
        return;
      }

      running.current = true;
      setStatus("scanning");

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      unsubscribeRef.current = discoveryService.addListener((updated) => {
        console.log("DEVICES RAW:", updated);
        setDevices([...updated]);
      });

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

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && running.current) {
        discoveryService.ping().catch(console.error);
      }
    });

    return () => sub.remove();
  }, []);

  // detenerse si hubo perdida de wifi
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      if (!state.isConnected || state.type !== "wifi") {
        stop();
        setStatus("no_wifi");
      }
    });

    return unsub;
  }, [stop]);

  // limpiar al desmontar
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
  };
}

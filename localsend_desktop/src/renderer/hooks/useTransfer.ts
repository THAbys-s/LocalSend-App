import { useState, useEffect, useRef } from "react";
import type { Transfer, DeviceInfo } from "../../shared";

interface UseTransferResult {
  transfer: Transfer | null;
  startTransfer: (file: File, device: DeviceInfo) => Promise<void>;
  cancelTransfer: () => void;
}

export function useTransfer(): UseTransferResult {
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const fileNameRef = useRef<string | null>(null);

  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.onTransferProgress((data) => {
      if (fileNameRef.current && data.fileName !== fileNameRef.current) return;

      setTransfer({
        fileName: data.fileName,
        progress: data.progress,
        bytesSent: data.bytesSent,
        totalBytes: data.totalBytes,
        speed: data.speed ?? 0,
        status: data.error ? "error" : data.done ? "complete" : "transferring",
      });
    });

    return () => {
      window.electronAPI.removeAllListeners("transfer:progress");
    };
  }, []);

  const startTransfer = async (file: File, device: DeviceInfo) => {
    fileNameRef.current = file.name;

    setTransfer({
      fileName: file.name,
      progress: 0,
      bytesSent: 0,
      totalBytes: file.size,
      speed: 0,
      status: "connecting",
    });

    const filePath = window.electronAPI.getPathForFile(file);
    if (!filePath) {
      setTransfer((prev) => (prev ? { ...prev, status: "error" } : null));
      return;
    }

    const result = await window.electronAPI.sendFile({
      filePath,
      targetIp: device.ip,
      deviceId: device.id,
    });

    if (!result.success) {
      setTransfer((prev) => (prev ? { ...prev, status: "error" } : null));
    }
  };

  const cancelTransfer = () => {
    fileNameRef.current = null;
    setTransfer(null);
  };

  return { transfer, startTransfer, cancelTransfer };
}

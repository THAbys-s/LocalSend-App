import { useState, useEffect, useRef } from "react";
import type { Transfer, DeviceInfo, FileToSend } from "../../shared";

interface UseTransferResult {
  transfer: Transfer | null;
  startTransfer: (file: FileToSend, device: DeviceInfo) => Promise<void>;
  cancelTransfer: () => void;
  dismissTransfer: () => void;
}

export function useTransfer(): UseTransferResult {
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const fileNameRef = useRef<string | null>(null);

  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.onTransferProgress((data) => {
      if (fileNameRef.current && data.fileName !== fileNameRef.current) return;

      if (
        data.status === "error" &&
        (data.errorCode === "connection_lost" || data.errorCode === "timeout")
      ) {
        setTransfer(null);
        fileNameRef.current = null;
        return;
      }

      setTransfer({
        fileName: data.fileName,
        progress: data.progress,
        bytesSent: data.bytesSent,
        totalBytes: data.totalBytes,
        speed: data.speed ?? 0,

        status: data.status,

        errorMessage: data.error ?? undefined,
        errorCode: data.errorCode,
        resumable: data.resumable,
      });
    });

    return () => {
      window.electronAPI.removeAllListeners("transfer:progress");
    };
  }, []);

  const startTransfer = async (file: FileToSend, device: DeviceInfo) => {
    fileNameRef.current = file.name;

    setTransfer({
      fileName: file.name,
      progress: 0,
      bytesSent: 0,
      totalBytes: file.size,
      speed: 0,
      status: "connecting",
    });

    const result = await window.electronAPI.sendFile({
      filePath: file.path,
      targetIp: device.ip,
      deviceId: device.id,
    });

    if (result.success) {
      setTransfer((prev) =>
        prev
          ? {
              ...prev,
              status: "complete",
              progress: 1,
              bytesSent: prev.totalBytes,
              speed: 0,
              errorMessage: undefined,
              errorCode: undefined,
            }
          : null,
      );
      return;
    }

    setTransfer((prev) =>
      prev
        ? {
            ...prev,
            status: "error",
            errorMessage: result.error ?? "Ocurrió un error desconocido.",
            errorCode: "connection_lost",
          }
        : null,
    );
  };

  const cancelTransfer = async () => {
    fileNameRef.current = null;
    try {
      await window.electronAPI.cancelTransfer();
    } catch {
      // ignored
    }
    setTransfer((prev) =>
      prev
        ? {
            ...prev,
            status: "cancelled",
            progress: Math.min(prev.progress, 1),
          }
        : null,
    );
  };

  const dismissTransfer = () => {
    fileNameRef.current = null;
    setTransfer(null);
  };

  return { transfer, startTransfer, cancelTransfer, dismissTransfer };
}

import { useState, useEffect, useCallback } from "react";
import {
  transferService,
  TransferProgress,
  FileToSend,
} from "../services/TransferService";
import {
  hapticSuccess,
  hapticError,
  hapticTap,
  hapticMedium,
} from "../utils/haptics";
import { DiscoveredDevice } from "../services/DiscoveryService";

export interface UseTransferResult {
  progress: TransferProgress | null;
  send: (target: DiscoveredDevice, file: FileToSend) => Promise<void>;
  cancel: () => void;
  reset: () => void;
  isSending: boolean;
}

export function useTransfer(): UseTransferResult {
  const [progress, setProgress] = useState<TransferProgress | null>(null);

  useEffect(() => {
    return transferService.addListener((p) => {
      const shouldAutoCloseOnError =
        p.status === "error" && "errorKind" in p && p.errorKind === "network";

      if (shouldAutoCloseOnError) {
        setProgress(null);
        hapticError();
        return;
      }

      setProgress({ ...p });

      switch (p.status) {
        case "connecting":
          hapticTap();
          break;
        case "handshaking":
          // pequeño feedback al comenzar la negociación
          hapticMedium();
          break;
        case "success":
          hapticSuccess();
          break;
        case "error":
        case "rejected":
          hapticError();
          break;
      }
    });
  }, []);

  const send = useCallback(
    async (target: DiscoveredDevice, file: FileToSend) => {
      await transferService.send(target.ip, file);
    },
    [],
  );

  const cancel = useCallback(() => transferService.cancel(), []);
  const reset = useCallback(() => setProgress(null), []);

  const isSending =
    progress?.status === "connecting" ||
    progress?.status === "handshaking" ||
    progress?.status === "sending";

  return { progress, send, cancel, reset, isSending };
}

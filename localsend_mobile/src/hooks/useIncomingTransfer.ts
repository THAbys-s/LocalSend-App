import { useState, useEffect, useCallback } from "react";
import {
  transferReceiverService,
  IncomingTransferRequest,
} from "../services/TransferReceiverService";

export function useIncomingTransfer() {
  const [incoming, setIncoming] = useState<IncomingTransferRequest | null>(
    null,
  );

  useEffect(() => {
    transferReceiverService.start();

    const unsub = transferReceiverService.addListener((req) => {
      setIncoming(req);
    });

    return () => {
      unsub();
      transferReceiverService.stop();
    };
  }, []);

  const accept = useCallback(() => {
    if (!incoming) return;

    transferReceiverService.accept(incoming.deviceId);
    setIncoming(null);
  }, [incoming]);

  const reject = useCallback(
    (reason?: string) => {
      if (!incoming) return;

      transferReceiverService.reject(incoming.deviceId, reason);
      setIncoming(null);
    },
    [incoming],
  );

  return {
    incoming,
    accept,
    reject,
  };
}

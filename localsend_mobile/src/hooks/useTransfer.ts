import { useState, useEffect, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { transferService, TransferProgress, FileToSend } from '../services/TransferService';
import { DiscoveredDevice } from '../services/DiscoveryService';

export interface UseTransferResult {
  progress:  TransferProgress | null;
  send:      (target: DiscoveredDevice, file: FileToSend) => Promise<void>;
  cancel:    () => void;
  reset:     () => void;
  isSending: boolean;
}

export function useTransfer(): UseTransferResult {
  const [progress, setProgress] = useState<TransferProgress | null>(null);

  useEffect(() => {
    return transferService.addListener(p => {
      setProgress({ ...p });

      switch (p.status) {
        case 'connecting':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'error':
        case 'rejected':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    });
  }, []);

  const send = useCallback(async (target: DiscoveredDevice, file: FileToSend) => {
    await transferService.send(target.ip, file);
  }, []);

  const cancel = useCallback(() => transferService.cancel(), []);
  const reset  = useCallback(() => setProgress(null), []);

  const isSending =
    progress?.status === 'connecting'  ||
    progress?.status === 'handshaking' ||
    progress?.status === 'sending';

  return { progress, send, cancel, reset, isSending };
}

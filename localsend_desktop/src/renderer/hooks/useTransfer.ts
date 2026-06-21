import { useState } from 'react';
import type { Transfer } from '../../shared/types';

interface UseTransferResult {
  transfer:       Transfer | null;
  startTransfer:  (file: File) => void;
  cancelTransfer: () => void;
}

export function useTransfer(): UseTransferResult {
  const [transfer, setTransfer] = useState<Transfer | null>(null);

  const startTransfer = (file: File) => {
    setTransfer({
      fileName:   file.name,
      progress:   0,
      bytesSent:  0,
      totalBytes: file.size,
      speed:      0,
      status:     'connecting',
    });

    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'http://localhost:53318/upload');
    xhr.setRequestHeader('x-file-name', encodeURIComponent(file.name));

    let lastLoaded = 0;
    let lastTime   = Date.now();

    xhr.upload.onprogress = (event) => {
      const now     = Date.now();
      const elapsed = (now - lastTime) / 1000;
      const speed   = elapsed > 0 ? (event.loaded - lastLoaded) / elapsed : 0;

      lastLoaded = event.loaded;
      lastTime   = now;

      setTransfer(prev => prev ? {
        ...prev,
        status:    'transferring',
        progress:  event.loaded / event.total,
        bytesSent: event.loaded,
        speed,
      } : null);
    };

    xhr.onload = () => {
      setTransfer(prev => prev
        ? { ...prev, status: xhr.status === 200 ? 'complete' : 'error', progress: 1 }
        : null
      );
    };

    xhr.onerror = () => {
      setTransfer(prev => prev ? { ...prev, status: 'error' } : null);
    };

    xhr.send(new FormData());
  };

  const cancelTransfer = () => setTransfer(null);

  return { transfer, startTransfer, cancelTransfer };
}
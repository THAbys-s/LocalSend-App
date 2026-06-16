import { useState } from 'react';

interface Transfer {
  fileName:   string;
  progress:   number;
  bytesSent:  number;
  totalBytes: number;
  speed:      number;
  status:     'connecting' | 'transferring' | 'complete' | 'error';
}

interface UseTransferResult {
  transfer:       Transfer | null;
  startTransfer:  (file: File) => void;
  cancelTransfer: () => void;
}

export function useTransfer(): UseTransferResult {
  const [transfer, setTransfer] = useState<Transfer | null>(null);

  const startTransfer = async (file: File) => {
    setTransfer({
      fileName:   file.name,
      progress:   0,
      bytesSent:  0,
      totalBytes: file.size,
      speed:      0,
      status:     'connecting',
    });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'http://localhost:53318/upload');
      xhr.setRequestHeader('x-file-name', encodeURIComponent(file.name));

      let lastLoaded = 0;
      let lastTime   = Date.now();

      xhr.upload.onprogress = (event) => {
        const now     = Date.now();
        const elapsed = (now - lastTime) / 1000;
        const delta   = event.loaded - lastLoaded;
        const speed   = elapsed > 0 ? delta / elapsed : 0;

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
        if (xhr.status === 200) {
          setTransfer(prev => prev ? { ...prev, status: 'complete', progress: 1 } : null);
        } else {
          setTransfer(prev => prev ? { ...prev, status: 'error' } : null);
        }
      };

      xhr.onerror = () => {
        setTransfer(prev => prev ? { ...prev, status: 'error' } : null);
      };

      xhr.send(formData);
    } catch {
      setTransfer(prev => prev ? { ...prev, status: 'error' } : null);
    }
  };

  const cancelTransfer = () => setTransfer(null);

  return { transfer, startTransfer, cancelTransfer };
}
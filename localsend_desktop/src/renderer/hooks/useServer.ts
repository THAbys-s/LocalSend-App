import { useState, useEffect } from 'react';

interface UseServerResult {
  isListening: boolean;
  startServer: () => void;
  stopServer: () => void;
}

export function useServer(): UseServerResult {
  const [isListening, setIsListening] = useState(false);

  const startServer = () => setIsListening(true);
  const stopServer  = () => setIsListening(false);

  // El servidor UDP y TCP ya arranca en main.ts al iniciar Electron.
  // Este hook solo refleja el estado visual.
  useEffect(() => {
    startServer();
  }, []);

  return { isListening, startServer, stopServer };
}
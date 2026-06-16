import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { discoveryService, DiscoveredDevice } from '../services/DiscoveryService';

export type ScanStatus = 'idle' | 'checking' | 'scanning' | 'no_wifi' | 'error';

export interface UseDiscoveryResult {
  devices:    DiscoveredDevice[];
  status:     ScanStatus;
  error:      string | null;
  start:      () => Promise<void>;
  stop:       () => void;
  ping:       () => void;
  isScanning: boolean;
}

export function useDiscovery(): UseDiscoveryResult {
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [status,  setStatus ] = useState<ScanStatus>('idle');
  const [error,   setError  ] = useState<string | null>(null);
  const running = useRef(false);

  const stop = useCallback(() => {
    if (!running.current) return;
    running.current = false;
    discoveryService.stop();
    setStatus('idle');
    setDevices([]);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStatus('checking');

    const net = await NetInfo.fetch();
    if (net.type !== 'wifi' || !net.isConnected) {
      setStatus('no_wifi');
      return;
    }

    if (running.current) {
      discoveryService.ping().catch(console.error);
      return;
    }

    try {
      running.current = true;
      setStatus('scanning');

      const unsub = discoveryService.addListener(updated => setDevices([...updated]));

      await discoveryService.start();

      return () => unsub();
    } catch (err: any) {
      running.current = false;
      setStatus('error');
      setError(err.message ?? 'Error de red');
    }
  }, []);

  const ping = useCallback(() => {
    discoveryService.ping().catch(console.error);
  }, []);

  // Resume on app foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active' && running.current) {
        discoveryService.ping().catch(console.error);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      if (state.type !== 'wifi' && running.current) {
        stop();
        setStatus('no_wifi');
      }
    });
    return unsub;
  }, [stop]);

  useEffect(() => () => { discoveryService.stop(); running.current = false; }, []);

  return { devices, status, error, start, stop, ping, isScanning: status === 'scanning' };
}

import dgram from 'dgram';
import os from 'os';
import { randomUUID } from 'crypto';
import type { DeviceInfo } from '../../shared/device.types';

const UDP_PORT = 53317;
const BROADCAST_ADDR = '255.255.255.255';
const BEACON_INTERVAL_MS = 2000;

// Resuelve la IP local real
function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const info of iface ?? []) {
      if (info.family === 'IPv4' && !info.internal) {
        return info.address;
      }
    }
  }
  return '127.0.0.1';
}

export class UdpDiscoveryService {
  private socket: dgram.Socket | null = null;
  private beaconTimer: NodeJS.Timeout | null = null;
  private myInfo: DeviceInfo;

  // Callback que el main/index.ts puede suscribir
  onDeviceFound?: (device: DeviceInfo) => void;

  constructor() {
    this.myInfo = {
      id:         randomUUID(),
      alias:      `Desktop-${os.hostname()}`,
      ip:         getLocalIP(),
      port:       53318,         
      deviceType: 'desktop',
      os:         this.detectOS(),
      version:    '1.0',
    };
  }

  private detectOS(): DeviceInfo['os'] {
    switch (process.platform) {
      case 'win32':  return 'windows';
      case 'darwin': return 'macos';
      case 'linux':  return 'linux';
      default:       return 'unknown';
    }
  }

  start(): void {
    this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    this.socket.on('error', (err) => {
      console.error('[UDP] Error:', err.message);
    });

    this.socket.on('message', (msg, rinfo) => {
      // Ignorar nuestros propios beacons
      if (rinfo.address === this.myInfo.ip) return;

      try {
        const device: DeviceInfo = JSON.parse(msg.toString());
        console.log(`[UDP] Dispositivo encontrado: ${device.alias} (${device.ip})`);
        this.onDeviceFound?.(device);
      } catch {
        console.warn('[UDP] Mensaje recibido con formato inválido:', msg.toString());
      }
    });

    this.socket.bind(UDP_PORT, () => {
      this.socket!.setBroadcast(true);
      console.log(`[UDP] Escuchando en puerto ${UDP_PORT}`);
      this.startBeacon();
    });
  }

  private startBeacon(): void {
    const send = () => {
      const msg = Buffer.from(JSON.stringify(this.myInfo));
      this.socket!.send(msg, 0, msg.length, UDP_PORT, BROADCAST_ADDR, (err) => {
        if (err) console.error('[UDP] Error enviando beacon:', err.message);
      });
    };

    send();
    this.beaconTimer = setInterval(send, BEACON_INTERVAL_MS);
  }

  stop(): void {
    if (this.beaconTimer) clearInterval(this.beaconTimer);
    this.socket?.close();
    this.socket = null;
    console.log('[UDP] Servicio detenido');
  }

  getMyInfo(): DeviceInfo {
    return this.myInfo;
  }
}
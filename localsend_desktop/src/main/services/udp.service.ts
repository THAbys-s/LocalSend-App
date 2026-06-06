import dgram from 'dgram';
import os from 'os';
import type { DeviceInfo, DeviceOS } from '../../shared/device.types';
import configStore from '../store/config.store';

const UDP_PORT           = 53317;
const BROADCAST_ADDR     = '255.255.255.255';
const BEACON_INTERVAL_MS = 2000;
const DEVICE_TIMEOUT_MS  = 6000; // si no vemos beacon en 6s lo consideramos perdido

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

function detectOS(): DeviceOS {
  switch (process.platform) {
    case 'win32':  return 'windows';
    case 'darwin': return 'macos';
    case 'linux':  return 'linux';
    default:       return 'unknown';
  }
}

export class UdpDiscoveryService {
  private socket: dgram.Socket | null = null;
  private beaconTimer: NodeJS.Timeout | null = null;

  private deviceTimeouts = new Map<string, NodeJS.Timeout>();

  onDeviceFound?: (device: DeviceInfo) => void;
  onDeviceLost?:  (deviceId: string)   => void;

  private myInfo: DeviceInfo;

  constructor() {
    this.myInfo = {
      id:         configStore.get('deviceId'),
      alias:      configStore.get('deviceAlias'),
      ip:         getLocalIP(),
      port:       53318,
      deviceType: 'desktop',
      os:         detectOS(),
      version:    '1.0',
    };
  }

  start(): void {
    this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    this.socket.on('error', (err) => {
      console.error('[UDP] Error en socket:', err.message);
    });

    this.socket.on('message', (msg, rinfo) => {
      try {
        const device: DeviceInfo = JSON.parse(msg.toString());

        // Ignorar nuestros propios beacons por ID.
        if (device.id === this.myInfo.id) return;

        device.ip = rinfo.address;

        console.log(`[UDP] Beacon de: ${device.alias} (${device.ip})`);
        this.onDeviceFound?.(device);
        this.resetDeviceTimeout(device);

      } catch {
        // Paquete malformado — ignorar silenciosamente
      }
    });

    this.socket.bind(UDP_PORT, () => {
      this.socket!.setBroadcast(true);
      console.log(`[UDP] Servidor escuchando en puerto ${UDP_PORT}`);
      console.log(`[UDP] Este dispositivo: ${this.myInfo.alias} | ${this.myInfo.ip} | ID: ${this.myInfo.id.slice(0, 8)}...`);
      this.startBeacon();
    });
  }

  private startBeacon(): void {
    const send = () => {
      const msg = Buffer.from(JSON.stringify(this.myInfo));
      this.socket?.send(msg, 0, msg.length, UDP_PORT, BROADCAST_ADDR, (err) => {
        if (err) console.error('[UDP] Error enviando beacon:', err.message);
      });
    };

    send(); // envío inmediato al arrancar
    this.beaconTimer = setInterval(send, BEACON_INTERVAL_MS);
  }

  private resetDeviceTimeout(device: DeviceInfo): void {
    const existing = this.deviceTimeouts.get(device.id);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      console.log(`[UDP] Dispositivo perdido: ${device.alias} (${device.ip})`);
      this.onDeviceLost?.(device.id);
      this.deviceTimeouts.delete(device.id);
    }, DEVICE_TIMEOUT_MS);

    this.deviceTimeouts.set(device.id, timer);
  }

  stop(): void {
    if (this.beaconTimer) {
      clearInterval(this.beaconTimer);
      this.beaconTimer = null;
    }

    for (const timer of this.deviceTimeouts.values()) clearTimeout(timer);
    this.deviceTimeouts.clear();

    this.socket?.close();
    this.socket = null;

    console.log('[UDP] Servicio detenido');
  }

  getMyInfo(): DeviceInfo {
    return { ...this.myInfo };
  }
}
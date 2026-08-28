import dgram from "dgram";
import os from "os";
import type { DeviceInfo, DeviceOS, BeaconPayload } from "../../shared";
import { ServerStatusService } from "./server-status.service";
import { configStore } from "../store/config.store";
import {
  UDP_PORT,
  BEACON_INTERVAL_MS,
  DEVICE_TIMEOUT_MS,
  BROADCAST_ADDR,
} from "../../shared/constants";

function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const info of iface ?? []) {
      if (info.family === "IPv4" && !info.internal) {
        return info.address;
      }
    }
  }
  return "127.0.0.1";
}

function hasNetworkInterface(): boolean {
  return Object.values(os.networkInterfaces()).some((iface) =>
    (iface ?? []).some(
      (info) =>
        info.family === "IPv4" &&
        !info.internal &&
        !info.address.startsWith("169.254."),
    ),
  );
}

function detectOS(): DeviceOS {
  switch (process.platform) {
    case "win32":
      return "windows";
    case "darwin":
      return "macos";
    case "linux":
      return "linux";
    default:
      return "unknown";
  }
}

export class UdpDiscoveryService {
  private socket: dgram.Socket | null = null;
  private beaconTimer: NodeJS.Timeout | null = null;
  private networkTimer: NodeJS.Timeout | null = null;

  private deviceTimeouts = new Map<string, NodeJS.Timeout>();
  private devices = new Map<string, DeviceInfo>();

  private readonly serverStatus: ServerStatusService;

  onDeviceFound?: (device: DeviceInfo) => void;
  onDeviceLost?: (deviceId: string) => void;
  onReady?: () => void;
  onError?: (err: Error) => void;
  onNetworkLost?: () => void;

  private myInfo: DeviceInfo;

  constructor(serverStatus: ServerStatusService) {
    this.serverStatus = serverStatus;

    this.myInfo = {
      id: configStore.get("deviceId"),
      alias: configStore.get("deviceAlias"),
      ip: getLocalIP(),
      port: 53318,
      deviceType: "desktop",
      os: detectOS(),
      version: "1.0",
    };
  }

  start(): void {
    this.networkTimer = setInterval(() => {
      const connected = hasNetworkInterface();
      if (!connected) {
        this.serverStatus.setUdp(false);
        this.onNetworkLost?.();
      } else if (this.socket) {
        this.serverStatus.setUdp(true);
      }
    }, 1000);

    this.socket = dgram.createSocket({ type: "udp4", reuseAddr: true });

    this.socket.on("error", (err) => {
      console.error("[UDP] Error en socket:", err.message);

      this.serverStatus.setUdp(false);

      this.onError?.(err);
    });

    this.socket.on("message", (msg, rinfo) => {
      try {
        const raw: Partial<BeaconPayload> = JSON.parse(msg.toString());

        const device: DeviceInfo = {
          id: raw.id ?? "",
          alias: raw.alias ?? "Desconocido",
          ip: rinfo.address,
          port: raw.port ?? UDP_PORT,
          deviceType: raw.deviceType ?? "unknown",
          os: raw.os ?? "unknown",
          version: raw.version ?? "1.0",
        };

        if (!device.id) return;
        if (device.id === this.myInfo.id) return;

        const isNewDevice = !this.devices.has(device.id);
        this.devices.set(device.id, device);

        if (isNewDevice) {
          console.log(`[UDP] Beacon de: ${device.alias} (${device.ip})`);
          this.onDeviceFound?.(device);
        }

        this.resetDeviceTimeout(device);
      } catch (error) {
        void error;
      }
    });
    this.socket.bind(UDP_PORT, () => {
      this.socket!.setBroadcast(true);

      this.serverStatus.setUdp(hasNetworkInterface());

      console.log(`[UDP] Servidor escuchando en puerto ${UDP_PORT}`);
      console.log(
        `[UDP] Este dispositivo: ${this.myInfo.alias} | ${this.myInfo.ip} | ID: ${this.myInfo.id.slice(0, 8)}...`,
      );
      this.startBeacon();
      this.onReady?.();
    });
  }

  private startBeacon(): void {
    const send = () => {
      const beacon: BeaconPayload = {
        type: "beacon",
        id: this.myInfo.id,
        alias: this.myInfo.alias,
        deviceType: this.myInfo.deviceType,
        os: this.myInfo.os,
        port: this.myInfo.port,
        version: this.myInfo.version,
      };
      const msg = Buffer.from(JSON.stringify(beacon));
      this.socket?.send(msg, 0, msg.length, UDP_PORT, BROADCAST_ADDR, (err) => {
        if (err) console.error("[UDP] Error enviando beacon:", err.message);
      });
    };
    send();
    this.beaconTimer = setInterval(send, BEACON_INTERVAL_MS);
  }

  private resetDeviceTimeout(device: DeviceInfo): void {
    const existing = this.deviceTimeouts.get(device.id);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      console.log(`[UDP] Dispositivo perdido: ${device.alias} (${device.ip})`);
      this.onDeviceLost?.(device.id);
      this.devices.delete(device.id);
      this.deviceTimeouts.delete(device.id);
    }, DEVICE_TIMEOUT_MS);

    this.deviceTimeouts.set(device.id, timer);
  }

  stop(): void {
    if (this.beaconTimer) {
      clearInterval(this.beaconTimer);
      this.beaconTimer = null;
    }
    if (this.networkTimer) {
      clearInterval(this.networkTimer);
      this.networkTimer = null;
    }

    for (const timer of this.deviceTimeouts.values()) clearTimeout(timer);
    this.deviceTimeouts.clear();

    this.socket?.close();
    this.socket = null;

    this.serverStatus.setUdp(false);

    console.log("[UDP] Servicio detenido");
  }

  getMyInfo(): DeviceInfo {
    return { ...this.myInfo };
  }

  getDevices(): DeviceInfo[] {
    return Array.from(this.devices.values());
  }
}

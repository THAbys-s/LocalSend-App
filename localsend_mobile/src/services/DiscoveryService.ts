import UdpSocket from "react-native-udp";
import {
  getDiscoveredDeviceAlias,
  getDeviceAlias,
  getDeviceId,
} from "../utils/deviceInfo";
import { Buffer } from "buffer";

const PORT = 53317;
const BROADCAST_ADDR = "255.255.255.255";
const MULTICAST_ADDR = "239.255.77.77";
const BEACON_INTERVAL = 2000;
const DEVICE_TTL = 15000;

export interface DiscoveredDevice {
  id: string;
  alias: string;
  ip: string;
  port: number;
  lastSeen: number;
  deviceType: "desktop" | "mobile" | "unknown";
}

type Listener = (devices: DiscoveredDevice[]) => void;

export class DiscoveryService {
  private socket: ReturnType<typeof UdpSocket.createSocket> | null = null;

  private beaconTimer: ReturnType<typeof setInterval> | null = null;
  private pruneTimer: ReturnType<typeof setInterval> | null = null;

  private devices = new Map<string, DiscoveredDevice>();
  private listeners = new Set<Listener>();

  private running = false;

  private deviceIdPromise = getDeviceId();
  private aliasPromise = getDeviceAlias();

  async start(): Promise<void> {
    if (this.running) return;

    await this._openSocket();
    this.running = true;

    this._startBeaconLoop();
    this._startPruneLoop();
  }

  stop(): void {
    if (!this.running) return;

    this.running = false;

    clearInterval(this.beaconTimer!);
    clearInterval(this.pruneTimer!);

    this.beaconTimer = null;
    this.pruneTimer = null;

    try {
      this.socket?.close();
    } catch {}

    this.socket = null;

    this.devices.clear();
  }

  addListener(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  getDevices(): DiscoveredDevice[] {
    return Array.from(this.devices.values());
  }

  async ping(): Promise<void> {
    await this._sendBeacon();
  }

  private _openSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const sock: any = UdpSocket.createSocket({
        type: "udp4",
        reusePort: true,
      });

      sock.once("error", reject);

      sock.bind(PORT, () => {
        sock.removeListener("error", reject);

        try {
          sock.setBroadcast(true);
          sock.addMembership(MULTICAST_ADDR);
        } catch {}

        sock.on(
          "message",
          (msg: Buffer, rinfo: { address: string; port: number }) => {
            this._onMessage(msg, rinfo).catch(() => {});
          },
        );

        sock.on("error", () => {
          if (this.running) {
            setTimeout(async () => {
              try {
                this.socket?.close();
              } catch {}

              this.socket = null;

              this._openSocket().catch(console.error);
            }, 3000);
          }
        });

        this.socket = sock;
        resolve();
      });
    });
  }

  private _startBeaconLoop(): void {
    void this._sendBeacon().catch(() => {});
    this.beaconTimer = setInterval(() => {
      void this._sendBeacon().catch(() => {});
    }, BEACON_INTERVAL);
  }

  private async _sendBeacon(): Promise<void> {
    const socket = this.socket;
    if (!socket) return;

    const payload = Buffer.from(
      JSON.stringify({
        type: "beacon",
        id: await this.deviceIdPromise,
        alias: await this.aliasPromise,
        deviceType: "mobile",
        os: "android",
        port: PORT,
        version: "1.0",
      }),
      "utf8",
    );

    const send = (addr: string) =>
      new Promise<void>((res) => {
        if (this.socket !== socket) {
          res();
          return;
        }

        try {
          socket.send(payload, 0, payload.length, PORT, addr, () => res());
        } catch {
          res();
        }
      });

    await send(BROADCAST_ADDR);
    await send(MULTICAST_ADDR);
  }

  private async _onMessage(
    msg: Buffer,
    rinfo: { address: string; port: number },
  ): Promise<void> {
    try {
      const data = JSON.parse(msg.toString("utf8"));

      if (data.type !== "beacon") return;
      if (data.deviceType === "mobile") return;

      const now = Date.now();
      const id = data.id ?? rinfo.address;

      const device: DiscoveredDevice = {
        id,
        alias: await getDiscoveredDeviceAlias(id),
        ip: rinfo.address,
        port: data.port ?? PORT,
        lastSeen: now,
        deviceType: data.deviceType ?? "desktop",
      };

      this.devices.set(device.id, device);

      this._notify();
    } catch {}
  }

  private _startPruneLoop(): void {
    this.pruneTimer = setInterval(() => {
      const now = Date.now();
      let changed = false;

      for (const [id, d] of this.devices) {
        if (now - d.lastSeen > DEVICE_TTL) {
          this.devices.delete(id);
          changed = true;
        }
      }

      if (changed) this._notify();
    }, DEVICE_TTL / 2);
  }

  private _notify(): void {
    const list = this.getDevices();
    for (const fn of this.listeners) fn(list);
  }
}

export const discoveryService = new DiscoveryService();

import UdpSocket from "react-native-udp";
import { getDeviceAlias, getDeviceId } from "../utils/deviceInfo";
import { Buffer } from "buffer";

const PORT = 53317;
const BROADCAST_ADDR = "255.255.255.255";
const MULTICAST_ADDR = "239.255.77.77";
const BEACON_INTERVAL = 2000;
const DEVICE_TTL = 8000;

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
    this.listeners.clear();
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

        sock.on("message", (msg: Buffer, rinfo) => {
          this._onMessage(msg, rinfo);
        });

        sock.on("error", (err: Error) => {
          console.warn("[Discovery] socket error:", err.message);

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

  // ---------------- BEACON ----------------

  private _startBeaconLoop(): void {
    this._sendBeacon();
    this.beaconTimer = setInterval(() => this._sendBeacon(), BEACON_INTERVAL);
  }

  private async _sendBeacon(): Promise<void> {
    if (!this.socket) return;

    const payload = Buffer.from(
      JSON.stringify({
        type: "beacon",
        deviceId: await this.deviceIdPromise,
        alias: await this.aliasPromise,
        deviceType: "mobile",
        port: PORT,
        version: "1.0",
      }),
      "utf8",
    );

    const send = (addr: string) =>
      new Promise<void>((res) => {
        this.socket!.send(payload, 0, payload.length, PORT, addr, () => res());
      });

    await send(BROADCAST_ADDR);
    await send(MULTICAST_ADDR);
  }

  // ---------------- RECEIVE ----------------

  private _onMessage(
    msg: Buffer,
    rinfo: { address: string; port: number },
  ): void {
    try {
      const data = JSON.parse(msg.toString("utf8"));

      if (data.type !== "beacon") return;
      if (data.deviceType === "mobile") return;

      const now = Date.now();

      const existing = this.devices.get(data.deviceId);

      const device: DiscoveredDevice = {
        id: data.deviceId ?? rinfo.address,
        alias: data.alias ?? `Desktop (${rinfo.address})`,
        ip: rinfo.address,
        port: data.port ?? PORT,
        lastSeen: now,
        deviceType: data.deviceType ?? "desktop",
      };

      this.devices.set(device.id, device);

      // ALWAYS notify (fixes frozen UI + stale radar)
      this._notify();
    } catch {}
  }

  // ---------------- PRUNE ----------------

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

  // ---------------- LISTENERS ----------------

  private _notify(): void {
    const list = this.getDevices();
    for (const fn of this.listeners) fn(list);
  }
}

export const discoveryService = new DiscoveryService();

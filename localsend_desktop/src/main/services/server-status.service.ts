import type { ServicesStatus } from "../../shared";

export type ServerStatusListener = (
  isActive: boolean,
  status: Readonly<ServicesStatus>,
) => void;

export class ServerStatusService {
  private status: ServicesStatus = {
    udp: false,
    ws: false,
    tcp: false,
  };

  private listeners = new Set<ServerStatusListener>();
  private lastActive = false;
  private networkAvailable = false;

  onStatusChange(listener: ServerStatusListener): void {
    this.listeners.add(listener);
    listener(this.lastActive, this.getStatus());
  }

  offStatusChange(listener: ServerStatusListener): void {
    this.listeners.delete(listener);
  }

  setUdp(active: boolean): void {
    if (this.status.udp === active) return;

    this.status.udp = active;
    this.notify();
  }

  setWs(active: boolean): void {
    if (this.status.ws === active) return;

    this.status.ws = active;
    this.notify();
  }

  setTcp(active: boolean): void {
    if (this.status.tcp === active) return;

    this.status.tcp = active;
    this.notify();
  }

  setNetworkAvailable(active: boolean): void {
    if (this.networkAvailable === active) return;

    this.networkAvailable = active;
    this.notify();
  }

  getStatus(): Readonly<ServicesStatus> {
    return { ...this.status };
  }

  isActive(): boolean {
    return (
      this.networkAvailable &&
      this.status.udp &&
      this.status.ws &&
      this.status.tcp
    );
  }

  reset(): void {
    this.status = {
      udp: false,
      ws: false,
      tcp: false,
    };
    this.networkAvailable = false;

    this.notify(true);
  }

  private notify(force = false): void {
    const active = this.isActive();

    if (!force && active === this.lastActive && this.listeners.size === 0) {
      return;
    }

    this.lastActive = active;

    const snapshot = this.getStatus();

    for (const listener of this.listeners) {
      listener(active, snapshot);
    }
  }
}

import fs from "fs";
import net from "net";
import path from "path";
import type { CollisionPolicy, TransferRequestData } from "../../shared";
import { NEGOTIATION_TIMEOUT_MS } from "../../shared/constants";
import { configStore } from "../store/config.store";
import { ServerStatusService } from "./server-status.service";

interface PendingTransfer {
  deviceId: string;
  alias: string;
  socket: net.Socket;
  timeout: NodeJS.Timeout;
}

type TransferRequestHandler = (data: TransferRequestData) => void;
type TransferExpiredHandler = (data: {
  deviceId: string;
  alias: string;
}) => void;

export class WsTransferService {
  private server: net.Server | null = null;
  private pendingTransfers = new Map<string, PendingTransfer>();
  private acceptedTransfers = new Set<string>();
  private acceptedPolicies = new Map<string, CollisionPolicy>();
  private listeners = new Set<TransferRequestHandler>();
  private expiredListeners = new Set<TransferExpiredHandler>();
  private port: number;

  private readonly serverStatus: ServerStatusService;

  onReady?: () => void;
  onError?: (err: Error) => void;

  constructor(serverStatus: ServerStatusService, port: number = 53317) {
    this.serverStatus = serverStatus;
    this.port = port;
  }

  start(): void {
    this.server = net.createServer((socket) => {
      let buffer = Buffer.alloc(0);

      const timeout = setTimeout(() => {
        socket.destroy();
      }, NEGOTIATION_TIMEOUT_MS);

      socket.on("data", (chunk: Buffer) => {
        buffer = Buffer.concat([buffer, chunk]);
        const newlineIndex = buffer.indexOf(0x0a);
        if (newlineIndex === -1) {
          if (buffer.length > 16 * 1024) {
            socket.destroy();
          }
          return;
        }

        clearTimeout(timeout);
        const line = buffer.subarray(0, newlineIndex).toString("utf8");

        try {
          const message = JSON.parse(line);
          if (message.type === "transfer-request") {
            this._handleTransferRequest(message, socket);
          } else {
            socket.destroy();
          }
        } catch {
          socket.destroy();
        }
      });

      socket.on("error", () => {
        clearTimeout(timeout);
      });

      socket.on("close", () => {
        clearTimeout(timeout);
        const entry = Array.from(this.pendingTransfers.entries()).find(
          ([_, t]) => t.socket === socket,
        );
        if (entry) {
          clearTimeout(entry[1].timeout);
          this.pendingTransfers.delete(entry[0]);
        }
      });
    });

    this.server.on("error", (err) => {
      this.serverStatus.setWs(false);

      this.onError?.(err);
    });

    this.server.listen(this.port, () => {
      this.serverStatus.setWs(true);

      this.onReady?.();
    });
  }

  stop(): void {
    for (const [_, transfer] of this.pendingTransfers) {
      clearTimeout(transfer.timeout);
      transfer.socket.destroy();
    }
    this.pendingTransfers.clear();
    this.acceptedTransfers.clear();

    this.server?.close(() => {
      this.serverStatus.setWs(false);
    });
    this.server = null;
  }

  on(event: "transfer-request", handler: TransferRequestHandler): void;
  on(event: "transfer-request-expired", handler: TransferExpiredHandler): void;
  on(event: string, handler: any): void {
    if (event === "transfer-request") {
      this.listeners.add(handler as TransferRequestHandler);
      return;
    }

    if (event === "transfer-request-expired") {
      this.expiredListeners.add(handler as TransferExpiredHandler);
    }
  }

  off(event: "transfer-request", handler: TransferRequestHandler): void;
  off(event: "transfer-request-expired", handler: TransferExpiredHandler): void;
  off(event: string, handler: any): void {
    if (event === "transfer-request") {
      this.listeners.delete(handler as TransferRequestHandler);
      return;
    }

    if (event === "transfer-request-expired") {
      this.expiredListeners.delete(handler as TransferExpiredHandler);
    }
  }

  accept(
    deviceId: string,
    collisionPolicy: CollisionPolicy = "keepBoth",
  ): void {
    const transfer = this.pendingTransfers.get(deviceId);
    if (!transfer) {
      return;
    }
    try {
      transfer.socket.write(
        JSON.stringify({ type: "accept", policy: collisionPolicy }) + "\n",
      );
      clearTimeout(transfer.timeout);
      this.acceptedTransfers.add(deviceId);
      this.acceptedPolicies.set(deviceId, collisionPolicy);
      setTimeout(() => {
        this.acceptedTransfers.delete(deviceId);
        this.acceptedPolicies.delete(deviceId);
      }, NEGOTIATION_TIMEOUT_MS);
      this.pendingTransfers.delete(deviceId);
      transfer.socket.end();
    } catch {
      // ignored
    }
  }

  reject(deviceId: string, reason = "Rechazado por el usuario"): void {
    const transfer = this.pendingTransfers.get(deviceId);
    if (!transfer) {
      return;
    }
    try {
      const payload =
        JSON.stringify({ type: "reject", message: reason }) + "\n";
      transfer.socket.end(payload);
      clearTimeout(transfer.timeout);
      this.pendingTransfers.delete(deviceId);
      this.acceptedTransfers.delete(deviceId);
    } catch {
      // ignored
    }
  }

  isAccepted(deviceId: string): boolean {
    return this.acceptedTransfers.has(deviceId);
  }

  getCollisionPolicy(deviceId: string): CollisionPolicy | undefined {
    return this.acceptedPolicies.get(deviceId);
  }

  consumeAcceptance(deviceId: string): void {
    this.acceptedTransfers.delete(deviceId);
    this.acceptedPolicies.delete(deviceId);
    this.pendingTransfers.delete(deviceId);
  }

  private _handleTransferRequest(message: any, socket: net.Socket): void {
    const { deviceId, alias, file } = message;

    if (
      !deviceId ||
      !alias ||
      !file ||
      typeof file.name !== "string" ||
      typeof file.size !== "number" ||
      typeof file.mimeType !== "string"
    ) {
      socket.write(
        JSON.stringify({ type: "error", message: "Formato inválido" }) + "\n",
      );
      socket.destroy();
      return;
    }

    const downloadDir =
      (configStore.get("downloadDir") as string | undefined) ||
      path.join(process.cwd(), "downloads");

    const transferData: TransferRequestData = {
      deviceId,
      alias,
      file: { name: file.name, size: file.size, mimeType: file.mimeType },
      hasCollision: fs.existsSync(path.join(downloadDir, file.name)),
    };

    const timeout = setTimeout(() => {
      if (this.pendingTransfers.has(deviceId)) {
        const expiredTransfer = this.pendingTransfers.get(deviceId)!;
        socket.write(
          JSON.stringify({ type: "error", message: "Timeout" }) + "\n",
        );

        for (const handler of this.expiredListeners) {
          handler({ deviceId, alias });
        }

        this.pendingTransfers.delete(deviceId);
        this.acceptedTransfers.delete(deviceId);
        this.acceptedPolicies.delete(deviceId);
        socket.destroy();
      }
    }, NEGOTIATION_TIMEOUT_MS);

    this.pendingTransfers.set(deviceId, { deviceId, alias, socket, timeout });

    for (const handler of this.listeners) {
      handler(transferData);
    }
  }
}

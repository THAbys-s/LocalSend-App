import net from "net";
import type { TransferRequestData } from "../../shared";
import { ServerStatusService } from "./server-status.service";

interface PendingTransfer {
  deviceId: string;
  alias: string;
  socket: net.Socket;
  timeout: NodeJS.Timeout;
}

type TransferRequestHandler = (data: TransferRequestData) => void;

export class WsTransferService {
  private server: net.Server | null = null;
  private pendingTransfers = new Map<string, PendingTransfer>();
  private acceptedTransfers = new Set<string>();
  private listeners = new Set<TransferRequestHandler>();
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
      console.log("[Handshake] Nueva conexión");
      let buffer = Buffer.alloc(0);

      const timeout = setTimeout(() => {
        console.warn(
          "[Handshake] Cliente no envió mensaje en 10s, desconectando",
        );
        socket.destroy();
      }, 10000);

      socket.on("data", (chunk: Buffer) => {
        buffer = Buffer.concat([buffer, chunk]);
        const newlineIndex = buffer.indexOf(0x0a);
        if (newlineIndex === -1) {
          if (buffer.length > 16 * 1024) {
            console.warn("[Handshake] Mensaje demasiado grande, cerrando");
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
        } catch (err) {
          console.error("[Handshake] Error parsing message:", err);
          socket.destroy();
        }
      });

      socket.on("error", (err) => {
        console.error("[Handshake] Error en socket:", err.message);
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
          console.log(`[Handshake] Transferencia cancelada: ${entry[1].alias}`);
        }
      });
    });

    this.server.on("error", (err) => {
      console.error("[Handshake] Server error:", err.message);

      this.serverStatus.setWs(false);

      this.onError?.(err);
    });

    this.server.listen(this.port, () => {
      this.serverStatus.setWs(true);

      console.log(`[Handshake] Servidor escuchando en puerto ${this.port}`);
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

      console.log("[Handshake] Servidor detenido");
    });
    this.server = null;
  }

  on(event: "transfer-request", handler: TransferRequestHandler): void {
    this.listeners.add(handler);
  }

  off(event: "transfer-request", handler: TransferRequestHandler): void {
    this.listeners.delete(handler);
  }

  accept(deviceId: string): void {
    const transfer = this.pendingTransfers.get(deviceId);
    if (!transfer) {
      console.warn(
        `[Handshake] No hay transferencia pendiente de: ${deviceId}`,
      );
      return;
    }
    try {
      transfer.socket.write(JSON.stringify({ type: "accept" }) + "\n");
      console.log(
        `[Handshake] Transferencia aceptada: ${transfer.alias} (${deviceId.slice(0, 8)}...)`,
      );
      clearTimeout(transfer.timeout);
      this.acceptedTransfers.add(deviceId);
      setTimeout(() => this.acceptedTransfers.delete(deviceId), 60000);
      this.pendingTransfers.delete(deviceId);
      transfer.socket.end();
    } catch (err) {
      console.error(`[Handshake] Error enviando accept a ${deviceId}:`, err);
    }
  }

  reject(deviceId: string, reason = "Rechazado por el usuario"): void {
    const transfer = this.pendingTransfers.get(deviceId);
    if (!transfer) {
      console.warn(
        `[Handshake] No hay transferencia pendiente de: ${deviceId}`,
      );
      return;
    }
    try {
      transfer.socket.write(
        JSON.stringify({ type: "reject", message: reason }) + "\n",
      );
      console.log(`[Handshake] Transferencia rechazada: ${transfer.alias}`);
      clearTimeout(transfer.timeout);
      this.pendingTransfers.delete(deviceId);
      this.acceptedTransfers.delete(deviceId);
      transfer.socket.end();
    } catch (err) {
      console.error(`[Handshake] Error enviando reject a ${deviceId}:`, err);
    }
  }

  isAccepted(deviceId: string): boolean {
    return this.acceptedTransfers.has(deviceId);
  }

  consumeAcceptance(deviceId: string): void {
    this.acceptedTransfers.delete(deviceId);
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
      console.error(
        "[Handshake] Mensaje de transfer-request inválido:",
        message,
      );
      socket.write(
        JSON.stringify({ type: "error", message: "Formato inválido" }) + "\n",
      );
      socket.destroy();
      return;
    }

    const transferData: TransferRequestData = {
      deviceId,
      alias,
      file: { name: file.name, size: file.size, mimeType: file.mimeType },
    };

    console.log(
      `[Handshake] Transfer request de: ${alias} (${deviceId.slice(0, 8)}...) | Archivo: ${file.name} (${file.size} bytes)`,
    );

    const timeout = setTimeout(() => {
      if (this.pendingTransfers.has(deviceId)) {
        console.warn(`[Handshake] Timeout esperando respuesta para: ${alias}`);
        socket.write(
          JSON.stringify({ type: "error", message: "Timeout" }) + "\n",
        );
        this.pendingTransfers.delete(deviceId);
        socket.destroy();
      }
    }, 30000);

    this.pendingTransfers.set(deviceId, { deviceId, alias, socket, timeout });

    for (const handler of this.listeners) {
      handler(transferData);
    }
  }
}

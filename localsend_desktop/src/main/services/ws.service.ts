import { WebSocketServer, WebSocket } from 'ws';
import type { TransferRequestData } from '../../shared';

interface PendingTransfer {
  deviceId: string;
  alias: string;
  ws: WebSocket;
  timeout: NodeJS.Timeout;
}

type TransferRequestHandler = (data: TransferRequestData) => void;

export class WsTransferService {
  private server: WebSocketServer | null = null;
  private pendingTransfers = new Map<string, PendingTransfer>();
  private listeners = new Set<TransferRequestHandler>();
  private port: number;

  constructor(port: number = 53317) {
    this.port = port;
  }

  start(): void {
    this.server = new WebSocketServer({ port: this.port });

    this.server.on('connection', (ws) => {
      console.log('[WS] Nuevo cliente conectado');

      const timeout = setTimeout(() => {
        console.warn('[WS] Cliente no envió mensaje en 10s, desconectando');
        ws.close(1000, 'Timeout');
      }, 10000);

      ws.on('message', (data) => {
        try {
          clearTimeout(timeout);
          const message = JSON.parse(data.toString());

          if (message.type === 'transfer-request') {
            this._handleTransferRequest(message, ws);
          }
        } catch (err) {
          console.error('[WS] Error parsing message:', err);
          ws.close(1002, 'Invalid message');
        }
      });

      ws.on('error', (err) => {
        console.error('[WS] Error en socket:', err.message);
        clearTimeout(timeout);
      });

      ws.on('close', () => {
        clearTimeout(timeout);
        const entry = Array.from(this.pendingTransfers.entries()).find(
          ([_, transfer]) => transfer.ws === ws
        );
        if (entry) {
          clearTimeout(entry[1].timeout);
          this.pendingTransfers.delete(entry[0]);
          console.log(`[WS] Transferencia cancelada: ${entry[1].alias}`);
        }
      });
    });

    this.server.on('error', (err) => {
      console.error('[WS] Server error:', err.message);
    });

    console.log(`[WS] Servidor escuchando en puerto ${this.port}`);
  }

  stop(): void {
    for (const [_, transfer] of this.pendingTransfers) {
      clearTimeout(transfer.timeout);
      transfer.ws.close(1000, 'Server shutting down');
    }
    this.pendingTransfers.clear();

    this.server?.close(() => {
      console.log('[WS] Servidor detenido');
    });
    this.server = null;
  }

  on(event: 'transfer-request', handler: TransferRequestHandler): void {
    this.listeners.add(handler);
  }

  off(event: 'transfer-request', handler: TransferRequestHandler): void {
    this.listeners.delete(handler);
  }

  accept(deviceId: string): void {
    const transfer = this.pendingTransfers.get(deviceId);
    if (!transfer) {
      console.warn(`[WS] No hay transferencia pendiente de: ${deviceId}`);
      return;
    }

    try {
      transfer.ws.send(JSON.stringify({ type: 'accept' }));
      console.log(`[WS] Transferencia aceptada: ${transfer.alias} (${deviceId.slice(0, 8)}...)`);
      clearTimeout(transfer.timeout);
      // Keep connection alive for potential retry/confirmation
    } catch (err) {
      console.error(`[WS] Error enviando accept a ${deviceId}:`, err);
    }
  }

  reject(deviceId: string, reason = 'Rechazado por el usuario'): void {
    const transfer = this.pendingTransfers.get(deviceId);
    if (!transfer) {
      console.warn(`[WS] No hay transferencia pendiente de: ${deviceId}`);
      return;
    }

    try {
      transfer.ws.send(JSON.stringify({ type: 'reject', message: reason }));
      console.log(`[WS] Transferencia rechazada: ${transfer.alias}`);
      clearTimeout(transfer.timeout);
      this.pendingTransfers.delete(deviceId);
      transfer.ws.close(1000, 'Rejected');
    } catch (err) {
      console.error(`[WS] Error enviando reject a ${deviceId}:`, err);
    }
  }

  private _handleTransferRequest(
    message: any,
    ws: WebSocket
  ): void {
    const { deviceId, alias, file } = message;

    if (!deviceId || !alias || !file || !file.name || !file.size || !file.mimeType) {
      console.error('[WS] Mensaje de transfer-request inválido:', message);
      ws.send(JSON.stringify({ type: 'error', message: 'Formato inválido' }));
      ws.close(1002, 'Invalid request format');
      return;
    }

    const transferData: TransferRequestData = {
      deviceId,
      alias,
      file: {
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
      },
    };

    console.log(
      `[WS] Transfer request de: ${alias} (${deviceId.slice(0, 8)}...) | Archivo: ${file.name} (${file.size} bytes)`
    );

    // Store with 30s timeout for user to accept/reject
    const timeout = setTimeout(() => {
      if (this.pendingTransfers.has(deviceId)) {
        console.warn(`[WS] Timeout esperando respuesta para: ${alias}`);
        ws.send(JSON.stringify({ type: 'error', message: 'Timeout' }));
        this.pendingTransfers.delete(deviceId);
        ws.close(1000, 'Timeout');
      }
    }, 30000);

    this.pendingTransfers.set(deviceId, {
      deviceId,
      alias,
      ws,
      timeout,
    });

    // Notify all listeners (main.ts will use this to send IPC to renderer)
    for (const handler of this.listeners) {
      handler(transferData);
    }
  }
}

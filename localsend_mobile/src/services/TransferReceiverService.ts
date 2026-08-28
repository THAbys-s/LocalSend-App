import TcpSocket from "react-native-tcp-socket";
import { Buffer } from "@craftzdog/react-native-buffer";
import { File, Directory, FileMode, FileHandle, Paths } from "expo-file-system";
import { getDownloadDirUri } from "../utils/downloadDir";

const HANDSHAKE_PORT = 53317;
const DATA_PORT = 53318;
const NEGOTIATION_TIMEOUT_MS = 600000;

export interface IncomingTransferRequest {
  deviceId: string;
  alias: string;
  file: { name: string; size: number; mimeType: string };
}

export type ReceiverErrorReason =
  | "no_folder"
  | "no_space"
  | "permission_denied"
  | "write_error"
  | "unknown";

export interface ReceiverError {
  reason: ReceiverErrorReason;
  fileName?: string;
}

type RequestListener = (req: IncomingTransferRequest) => void;
type ErrorListener = (err: ReceiverError) => void;

interface PendingHandshake {
  deviceId: string;
  alias: string;
  socket: any;
  timeout: ReturnType<typeof setTimeout>;
}

class TransferReceiverService {
  private handshakeServer: any = null;
  private dataServer: any = null;
  private pending = new Map<string, PendingHandshake>();
  private accepted = new Set<string>();
  private listeners = new Set<RequestListener>();
  private errorListeners = new Set<ErrorListener>();

  addListener(fn: RequestListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  addErrorListener(fn: ErrorListener): () => void {
    this.errorListeners.add(fn);
    return () => this.errorListeners.delete(fn);
  }

  start(): void {
    this._startHandshakeServer();
    this._startDataServer();
  }

  stop(): void {
    this.handshakeServer?.close();
    this.dataServer?.close();
    for (const p of this.pending.values()) clearTimeout(p.timeout);
    this.pending.clear();
    this.accepted.clear();
  }

  accept(deviceId: string): void {
    const p = this.pending.get(deviceId);
    if (!p) return;
    try {
      p.socket.write(JSON.stringify({ type: "accept" }) + "\n");
      clearTimeout(p.timeout);
      this.accepted.add(deviceId);
      setTimeout(() => this.accepted.delete(deviceId), 60000);
      p.socket.end();
    } catch (err) {
      console.warn("[Receiver] Error enviando accept:", err);
    }
  }

  reject(deviceId: string, reason = "Rechazado por el usuario"): void {
    const p = this.pending.get(deviceId);
    if (!p) return;
    try {
      const payload =
        JSON.stringify({ type: "reject", message: reason }) + "\n";
      p.socket.end(payload);
      clearTimeout(p.timeout);
      this.pending.delete(deviceId);
    } catch (err) {
      console.warn("[Receiver] Error enviando reject:", err);
    }
  }

  private _emitError(err: ReceiverError): void {
    for (const fn of this.errorListeners) fn(err);
  }

  private _failTransfer(
    socket: any,
    reason: ReceiverErrorReason,
    fileName?: string,
  ): void {
    this._emitError({ reason, fileName });
    try {
      socket.write(JSON.stringify({ type: "error", reason }) + "\n", () => {
        socket.destroy();
      });
    } catch {
      socket.destroy();
    }
  }

  private _startHandshakeServer(): void {
    this.handshakeServer = TcpSocket.createServer((socket: any) => {
      let buffer = Buffer.alloc(0);
      const timeout = setTimeout(
        () => socket.destroy(),
        NEGOTIATION_TIMEOUT_MS,
      );

      socket.on("data", (chunk: Buffer) => {
        buffer = Buffer.concat([buffer, chunk]);
        const newlineIndex = buffer.indexOf(0x0a);
        if (newlineIndex === -1) return;

        clearTimeout(timeout);
        const line = buffer.subarray(0, newlineIndex).toString("utf8");

        try {
          const msg = JSON.parse(line);
          if (msg.type !== "transfer-request") {
            socket.destroy();
            return;
          }

          const { deviceId, alias, file } = msg;
          if (!deviceId || !alias || !file) {
            socket.destroy();
            return;
          }

          const reqTimeout = setTimeout(() => {
            if (this.pending.has(deviceId)) {
              this.pending.delete(deviceId);
              socket.destroy();
            }
          }, NEGOTIATION_TIMEOUT_MS);

          this.pending.set(deviceId, {
            deviceId,
            alias,
            socket,
            timeout: reqTimeout,
          });

          for (const fn of this.listeners) fn({ deviceId, alias, file });
        } catch {
          socket.destroy();
        }
      });

      socket.on("error", () => clearTimeout(timeout));
    });

    this.handshakeServer.listen(
      { port: HANDSHAKE_PORT, host: "0.0.0.0" },
      () => {
        console.log(`[Receiver] Handshake escuchando en ${HANDSHAKE_PORT}`);
      },
    );
  }

  private _startDataServer(): void {
    this.dataServer = TcpSocket.createServer((socket: any) => {
      let headerParsed = false;
      let headerBuffer = Buffer.alloc(0);
      let header: {
        name: string;
        size: number;
        mimeType: string;
        deviceId: string;
      } | null = null;

      // Escribimos directamente en el directorio seleccionado.
      let outputFile: File | null = null;
      let fileHandle: FileHandle | null = null;
      let writeQueue: Promise<void> = Promise.resolve();
      let writeFailed = false;

      const enqueueWrite = (bytes: Uint8Array) => {
        writeQueue = writeQueue
          .then(() => {
            if (writeFailed) return;

            fileHandle!.writeBytes(bytes);
          })
          .catch((err) => {
            if (writeFailed) return;

            writeFailed = true;

            try {
              fileHandle?.close();
            } catch {}

            try {
              outputFile?.delete();
            } catch {}

            console.error(err);

            this._emitError({
              reason: "write_error",
              fileName: header?.name,
            });

            socket.destroy();
          });
      };

      socket.on("data", (chunk: Buffer) => {
        if (headerParsed) {
          enqueueWrite(new Uint8Array(chunk));
          return;
        }

        headerBuffer = Buffer.concat([headerBuffer, chunk]);
        const newlineIndex = headerBuffer.indexOf(0x0a);
        if (newlineIndex === -1) return;

        const headerLine = headerBuffer
          .subarray(0, newlineIndex)
          .toString("utf8");
        const rest = headerBuffer.subarray(newlineIndex + 1);

        socket.pause();

        (async () => {
          try {
            header = JSON.parse(headerLine);
          } catch {
            console.error("[Receiver] Header inválido, cerrando conexión");
            socket.destroy();
            return;
          }

          if (!header?.deviceId || !this.accepted.has(header.deviceId)) {
            console.warn("[Receiver] Transferencia no aceptada");
            socket.destroy();
            return;
          }

          if (Paths.availableDiskSpace < header.size) {
            console.warn("[Receiver] Espacio insuficiente");
            this._failTransfer(socket, "no_space", header.name);
            return;
          }

          const dirUri = await getDownloadDirUri();
          if (!dirUri) {
            console.warn("[Receiver] No hay carpeta de destino configurada");
            this._failTransfer(socket, "no_folder", header.name);
            return;
          }

          try {
            const destDir = new Directory(dirUri);

            const resolvedName = this._resolveCollision(destDir, header.name);

            outputFile = destDir.createFile(resolvedName, header.mimeType);

            fileHandle = outputFile.open(FileMode.WriteOnly);
          } catch (err) {
            console.error("[Receiver] Error creando archivo:", err);
            this._failTransfer(socket, "write_error", header.name);
            return;
          }

          headerParsed = true;

          if (rest.length > 0) {
            enqueueWrite(new Uint8Array(rest));
          }

          socket.resume();
        })();
      });

      socket.on("end", () => {
        if (!header || !fileHandle) return;

        const h = header;
        const handle = fileHandle;

        writeQueue
          .then(() => {
            try {
              handle.close();
            } catch {}

            console.log("[Receiver] Archivo recibido:", h.name);

            this.accepted.delete(h.deviceId);
            this.pending.delete(h.deviceId);
          })
          .catch((err) => {
            console.error("[Receiver] Error finalizando archivo:", err);

            try {
              handle.close();
            } catch {}
          });
      });

      socket.on("error", (err: Error) => {
        console.error("[Receiver] Socket error:", err.message);

        writeQueue.finally(() => {
          try {
            outputFile?.delete();
          } catch {}
        });
      });
    });

    this.dataServer.listen({ port: DATA_PORT, host: "0.0.0.0" }, () => {
      console.log(`[Receiver] Data escuchando en ${DATA_PORT}`);
    });
  }

  private _resolveCollision(dir: Directory, fileName: string): string {
    const existingNames = new Set(dir.list().map((item) => item.name));
    if (!existingNames.has(fileName)) return fileName;

    const dotIndex = fileName.lastIndexOf(".");
    const base = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
    const ext = dotIndex > 0 ? fileName.slice(dotIndex) : "";

    let counter = 1;
    let candidate = `${base} (${counter})${ext}`;
    while (existingNames.has(candidate)) {
      counter++;
      candidate = `${base} (${counter})${ext}`;
    }
    return candidate;
  }
}

export const transferReceiverService = new TransferReceiverService();

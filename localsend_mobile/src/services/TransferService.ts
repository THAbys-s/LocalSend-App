import TcpSocket from "react-native-tcp-socket";
import ReactNativeBlobUtil from "react-native-blob-util";
import { getDeviceAlias, getDeviceId } from "../utils/deviceInfo";
import { Buffer } from "@craftzdog/react-native-buffer";

const WS_PORT = 53317;
const TCP_PORT = 53318;
const CHUNK = 32 * 1024;

export type TransferStatus =
  | "idle"
  | "connecting"
  | "handshaking"
  | "sending"
  | "success"
  | "rejected"
  | "error";

export interface TransferProgress {
  status: TransferStatus;
  progress: number;
  bytesSent: number;
  totalBytes: number;
  speed: number;
  fileName: string;
  fileUri: string;
  fileMime: string;
  thumbnailUri?: string;
}

export interface FileToSend {
  uri: string;
  name: string;
  size: number;
  type: string;
  thumbnailUri?: string;
}

type ProgressListener = (p: TransferProgress) => void;

class TransferService {
  private socket: any = null; // ← antes: private ws: WebSocket | null, ahora es un TcpSocket
  private listeners = new Set<ProgressListener>();
  private current: TransferProgress | null = null;
  private cancelled = false;

  addListener(fn: ProgressListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  getCurrent(): TransferProgress | null {
    return this.current;
  }

  cancel(): void {
    this.cancelled = true;
    try {
      this.socket?.destroy();
    } catch (_) {}
    this.socket = null;
  }

  async send(ip: string, file: FileToSend): Promise<void> {
    this.cancelled = false;

    const deviceId = await getDeviceId();
    const alias = await getDeviceAlias();

    this._emit({
      status: "connecting",
      progress: 0,
      bytesSent: 0,
      totalBytes: file.size,
      speed: 0,
      fileName: file.name,
      fileUri: file.uri,
      fileMime: file.type,
      thumbnailUri: file.thumbnailUri,
    });

    try {
      await this._handshake(ip, file, deviceId, alias);
      if (this.cancelled) return;
      await this._tcpStream(ip, file, deviceId);
    } catch (err: any) {
      this._emit({ ...this.current!, status: "error", progress: 0 });
      throw err;
    } finally {
      try {
        this.socket?.destroy();
      } catch (_) {}
      this.socket = null;
    }
  }

  private _handshake(
    ip: string,
    file: FileToSend,
    deviceId: string,
    alias: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = TcpSocket.createConnection(
        { host: ip, port: WS_PORT },
        () => {
          this._emit({ ...this.current!, status: "handshaking" });

          const message =
            JSON.stringify({
              type: "transfer-request",
              deviceId,
              alias,
              file: { name: file.name, size: file.size, mimeType: file.type },
            }) + "\n";

          socket.write(message);
        },
      );

      this.socket = socket;

      let buffer = Buffer.alloc(0);
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error("Timeout de conexión"));
      }, 8000);

      socket.on("data", (chunk: Buffer) => {
        buffer = Buffer.concat([buffer, chunk]);
        const newlineIndex = buffer.indexOf(0x0a);
        if (newlineIndex === -1) return;

        clearTimeout(timeout);
        const line = buffer.subarray(0, newlineIndex).toString("utf8");

        try {
          const msg = JSON.parse(line);
          if (msg.type === "accept") {
            resolve();
          } else if (msg.type === "reject") {
            this._emit({ ...this.current!, status: "rejected" });
            reject(new Error("Transferencia rechazada"));
          } else {
            reject(new Error(msg.message ?? "Error del servidor"));
          }
        } catch {
          reject(new Error("Respuesta inválida del servidor"));
        }
      });

      socket.on("error", (err: Error) => {
        clearTimeout(timeout);
        reject(
          new Error(`No se pudo conectar a ${ip}:${WS_PORT}: ${err.message}`),
        );
      });

      socket.on("close", () => {
        clearTimeout(timeout);
      });
    });
  }

  private _tcpStream(
    ip: string,
    file: FileToSend,
    deviceId: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const client = TcpSocket.createConnection(
        { host: ip, port: TCP_PORT },
        async () => {
          this._emit({ ...this.current!, status: "sending" });
          try {
            await this._stream(client, file, deviceId);
            client.destroy();
            this._emit({ ...this.current!, status: "success", progress: 1 });
            resolve();
          } catch (err) {
            client.destroy();
            reject(err);
          }
        },
      );

      client.on("error", (e: Error) => reject(new Error(`TCP: ${e.message}`)));
      client.setTimeout(30000);
      client.on("timeout", () => {
        client.destroy();
        reject(new Error("TCP timeout"));
      });
    });
  }

  private async _stream(
    client: any,
    file: FileToSend,
    deviceId: string,
  ): Promise<void> {
    const header =
      JSON.stringify({
        name: file.name,
        size: file.size,
        mimeType: file.type,
        deviceId,
      }) + "\n";
    await this._write(client, Buffer.from(header, "utf8"));

    let bytesSent = 0;
    let lastTime = Date.now();
    let lastBytes = 0;
    const path = file.uri.startsWith("content://")
      ? file.uri
      : file.uri.replace("file://", "");
    let offset = 0;

    while (offset < file.size) {
      if (this.cancelled) {
        throw new Error("Cancelado");
      }

      const length = Math.min(CHUNK, file.size - offset);
      const b64 = await ReactNativeBlobUtil.fs.read(
        path,
        "base64",
        offset,
        length,
      );
      const buf = Buffer.from(b64, "base64");

      if (buf.length === 0) {
        throw new Error("No se pudieron leer más datos del archivo.");
      }

      await this._write(client, buf);
      bytesSent += buf.length;
      offset += buf.length;

      const now = Date.now();
      const elapsed = now - lastTime;
      const speed =
        elapsed >= 500
          ? ((bytesSent - lastBytes) / elapsed) * 1000
          : (this.current?.speed ?? 0);
      if (elapsed >= 500) {
        lastTime = now;
        lastBytes = bytesSent;
      }

      this._emit({
        ...this.current!,
        status: "sending",
        progress: bytesSent / file.size,
        bytesSent,
        totalBytes: file.size,
        speed,
      });
    }

    this._emit({
      ...this.current!,
      status: "sending",
      progress: 1,
      bytesSent: file.size,
      totalBytes: file.size,
      speed: this.current?.speed ?? 0,
    });
  }

  private _write(client: any, data: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      client.write(data, (err: Error | null) =>
        err ? reject(err) : resolve(),
      );
    });
  }

  private _emit(state: TransferProgress): void {
    this.current = state;
    for (const fn of this.listeners) fn(state);
  }
}

export const transferService = new TransferService();

import TcpSocket from "react-native-tcp-socket";
import ReactNativeBlobUtil from "react-native-blob-util";
import { getDeviceAlias, getDeviceId } from "../utils/deviceInfo";
import { Buffer } from "@craftzdog/react-native-buffer";

const WS_PORT = 53317;
const TCP_PORT = 53318;
const CHUNK = 32760;

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
    console.log("[Transfer] URI recibida:", file.uri);
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

      socket.on("data", (chunk: string | Buffer) => {
        const bufChunk =
          typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk;
        buffer = Buffer.concat([buffer, bufChunk]);
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

    const path = file.uri.startsWith("content://")
      ? file.uri
      : file.uri.replace("file://", "");
    console.log("[Transfer] path calculado para readStream:", path);
    let bytesSent = 0;
    let lastTime = Date.now();
    let lastBytes = 0;

    return new Promise((resolve, reject) => {
      let finished = false;
      let writeQueue: Promise<void> = Promise.resolve();

      ReactNativeBlobUtil.fs
        .readStream(path, "base64", CHUNK)
        .then((stream: any) => {
          console.log("[Transfer] readStream abierto para:", path);
          stream.open();

          stream.onData((chunk: string) => {
            console.log(
              "[Transfer] chunk recibido, tamaño base64:",
              chunk.length,
            );
            if (this.cancelled) {
              if (!finished) {
                finished = true;
                stream.close();
                reject(new Error("Cancelado"));
              }
              return;
            }

            const buf = Buffer.from(chunk, "base64");

            writeQueue = writeQueue
              .then(() => this._write(client, buf))
              .then(() => {
                bytesSent += buf.length;

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
              })
              .catch((err) => {
                if (!finished) {
                  finished = true;
                  stream.close();
                  reject(err);
                }
              });
          });

          stream.onError((err: any) => {
            console.log("[Transfer] readStream error:", err);
            if (!finished) {
              finished = true;
              reject(
                new Error(
                  typeof err === "string" ? err : "Error leyendo el archivo",
                ),
              );
            }
          });

          stream.onEnd(() => {
            console.log("[Transfer] readStream onEnd disparado");
            writeQueue
              .then(() => {
                if (finished) return;
                finished = true;
                this._emit({
                  ...this.current!,
                  status: "sending",
                  progress: 1,
                  bytesSent: file.size,
                  totalBytes: file.size,
                  speed: this.current?.speed ?? 0,
                });
                resolve();
              })
              .catch((err) => {
                console.log("[Transfer] readStream falló al abrir:", err);
                if (!finished) {
                  finished = true;
                  reject(err);
                }
              });
          });
        })
        .catch(reject);
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

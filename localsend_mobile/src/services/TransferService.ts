import TcpSocket from "react-native-tcp-socket";
import ReactNativeBlobUtil from "react-native-blob-util";
import NetInfo from "@react-native-community/netinfo";
import * as FileSystem from "expo-file-system/legacy";
import { getDeviceAlias, getDeviceId } from "../utils/deviceInfo";
import { Buffer } from "@craftzdog/react-native-buffer";

const WS_PORT = 53317;
const TCP_PORT = 53318;
const CHUNK = 32760;
const PROGRESS_UPDATE_INTERVAL_MS = 120;
const NEGOTIATION_TIMEOUT_MS = 600000;

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
  errorMessage?: string;
}

export interface FileToSend {
  uri: string;
  name: string;
  size: number;
  type: string;
  thumbnailUri?: string;
}

export type TransferErrorKind = "network" | "rejected" | "unknown";

type ProgressListener = (p: TransferProgress) => void;

class TransferService {
  private socket: any = null;
  private listeners = new Set<ProgressListener>();
  private current: TransferProgress | null = null;
  private cancelled = false;
  private networkLost = false;
  private networkUnsubscribe: (() => void) | null = null;
  private cancelPending: (() => void) | null = null;

  addListener(fn: ProgressListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  getCurrent(): TransferProgress | null {
    return this.current;
  }

  cancel(): void {
    this.cancelled = true;
    this.cancelPending?.();
    this.cancelPending = null;
    try {
      this.socket?.destroy();
    } catch (_) {}
    this.socket = null;
  }

  async send(ip: string, file: FileToSend): Promise<void> {
    this.cancelled = false;
    this.networkLost = false;
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
      const fileToSend = {
        ...file,
        size: await this._getFileSize(file),
      };
      this.update({ totalBytes: fileToSend.size });
      const networkState = await NetInfo.fetch();
      if (networkState.isConnected === false) {
        throw new Error("Sin conexión de red");
      }
      this.networkUnsubscribe = NetInfo.addEventListener((state) => {
        const offline =
          !state.isConnected ||
          state.isConnected === null ||
          state.type === "none" ||
          state.type === "unknown";

        if (offline) {
          this.networkLost = true;
          this.cancel();
        }
      });

      await this._handshake(ip, fileToSend, deviceId, alias);
      if (this.cancelled) return;
      await this._tcpStream(ip, fileToSend, deviceId);
    } catch (err: any) {
      const kind: TransferErrorKind =
        this.networkLost ||
        /ECONNREFUSED|ETIMEDOUT|Network|TCP|conexión de red/i.test(err.message)
          ? "network"
          : err.message === "Transferencia rechazada"
            ? "rejected"
            : "unknown";
      this._emit({
        ...this.current!,
        status: "error",
        progress: 0,
        errorKind: kind,
        errorMessage:
          kind === "network"
            ? "Se perdió la conexión a la red."
            : (err.message ?? "La transferencia falló."),
      } as any);
      throw err;
    } finally {
      this.networkUnsubscribe?.();
      this.networkUnsubscribe = null;
      this.cancelPending = null;
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
      this.cancelPending = () => reject(new Error("Cancelado"));
      const socket = TcpSocket.createConnection(
        { host: ip, port: WS_PORT },
        () => {
          this.update({ status: "handshaking" });

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
        this.networkLost = true;
        socket.destroy();
        reject(new Error("Sin conexión de red"));
      }, NEGOTIATION_TIMEOUT_MS);
      let finished = false;
      socket.on("data", (chunk: any) => {
        const { line, buffer: next } = this.readJsonLine(buffer, chunk);
        buffer = next;
        if (!line) return;

        clearTimeout(timeout);

        try {
          const msg = JSON.parse(line);
          if (msg.type === "accept") {
            this.cancelPending = null;
            finished = true;
            resolve();
          } else if (msg.type === "reject") {
            this.cancelPending = null;
            this.update({ status: "rejected" });
            finished = true;
            reject(new Error(this.getReceiverError(msg.message)));
          } else {
            reject(new Error(msg.message ?? "Error del servidor"));
          }
        } catch {
          reject(new Error("Respuesta inválida del servidor"));
        }
      });

      socket.on("error", (err: Error) => {
        this.cancelPending = null;
        clearTimeout(timeout);
        reject(
          new Error(`No se pudo conectar a ${ip}:${WS_PORT}: ${err.message}`),
        );
      });

      socket.on("close", () => {
        this.cancelPending = null;
        clearTimeout(timeout);
        if (!finished) {
          finished = true;
          reject(new Error("Cancelado"));
        }
      });
    });
  }

  private _tcpStream(
    ip: string,
    file: FileToSend,
    deviceId: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cancelPending = () => reject(new Error("Cancelado"));
      let receiverError: string | null = null;
      let responseBuffer = Buffer.alloc(0);

      const client = TcpSocket.createConnection(
        { host: ip, port: TCP_PORT },
        async () => {
          // ensure cancel() can destroy the active TCP client socket
          this.socket = client;

          this._emit({ ...this.current!, status: "sending" });
          try {
            await this._stream(client, file, deviceId);
            client.once("close", () => {
              if (receiverError) {
                reject(new Error(receiverError));
                return;
              }
              this._emit({ ...this.current!, status: "success", progress: 1 });
              resolve();
            });
            client.end();
          } catch (err) {
            client.destroy();
            reject(err);
          }
        },
      );

      client.on("data", (chunk: any) => {
        const { line, buffer: next } = this.readJsonLine(responseBuffer, chunk);
        responseBuffer = next;
        if (!line) return;

        try {
          const msg = JSON.parse(line);
          if (msg.type === "error") {
            receiverError = this.getReceiverError(msg.reason ?? msg.message);
            if (!receiverError) return;
            reject(new Error(receiverError));
          }
        } catch {}
      });

      client.on("error", (e: Error) => {
        this.networkLost = true;
        reject(new Error(`TCP: ${e.message}`));
      });
      client.setTimeout(15000);
      client.on("timeout", () => {
        this.networkLost = true;
        client.destroy();
        reject(new Error("Sin conexión de red"));
      });
    });
  }

  private async _getFileSize(file: FileToSend): Promise<number> {
    const path = await this._ensureLocalReadableFile(file.uri);

    try {
      const stat = await ReactNativeBlobUtil.fs.stat(path);
      const size = Number(stat.size);
      if (Number.isFinite(size) && size >= 0) return size;
    } catch {
      // no-op
    }

    return file.size;
  }

  private _getFilePath(uri: string): string {
    if (uri.startsWith("content://")) return uri;
    return uri.startsWith("file://") ? uri.replace("file://", "") : uri;
  }

  private async _ensureLocalReadableFile(uri: string): Promise<string> {
    if (!uri.startsWith("content://")) {
      return this._getFilePath(uri);
    }

    const sanitizedName = (
      uri.split("/").pop() ?? `transfer-${Date.now()}`
    ).replace(/[^a-zA-Z0-9._-]/g, "_");
    const destination = `${FileSystem.cacheDirectory}${sanitizedName}`;

    try {
      const info = await FileSystem.getInfoAsync(destination);
      if (info.exists) return destination;
    } catch {
      // no-op
    }

    await FileSystem.copyAsync({
      from: uri,
      to: destination,
    });

    return destination;
  }

  private async _streamFileChunks(
    uri: string,
    onChunk: (chunk: Buffer) => void,
  ): Promise<void> {
    const path = await this._ensureLocalReadableFile(uri);
    const stream = await ReactNativeBlobUtil.fs.readStream(
      path,
      "base64",
      CHUNK,
    );

    await new Promise<void>((resolve, reject) => {
      stream.open();
      stream.onData((chunk: any) => {
        const value =
          typeof chunk === "string"
            ? chunk
            : Buffer.from(chunk).toString("base64");
        onChunk(Buffer.from(value, "base64"));
      });
      stream.onEnd(() => resolve());
      stream.onError((err: any) => reject(err));
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
    let lastProgressUpdate = 0;
    let writeQueue: Promise<void> = Promise.resolve();

    await this._streamFileChunks(file.uri, (chunk) => {
      writeQueue = writeQueue
        .then(() => this._write(client, chunk))
        .then(() => {
          bytesSent += chunk.length;

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

          if (now - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL_MS) {
            lastProgressUpdate = now;
            this._emit({
              ...this.current!,
              status: "sending",
              progress: bytesSent / file.size,
              bytesSent,
              totalBytes: file.size,
              speed,
            });
          }
        });
    });

    await writeQueue;
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
      try {
        const ok = client.write(data, (err: Error | null) => {
          if (err) reject(err);
        });

        if (ok) {
          resolve(); // Si el buffer no está lleno, resuelve el envio de inmediatamente.
        } else {
          client.once("drain", () => resolve()); // Si el buffer está lleno, espera a que se vacíe antes de resolver.
        }
      } catch (err) {
        reject(err);
      }
    });
  }
  private toBuffer(chunk: string | Buffer): Buffer {
    return typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk;
  }

  private readJsonLine(
    buffer: Buffer,
    chunk: string | Buffer,
  ): { line?: string; buffer: Buffer } {
    const bufChunk = this.toBuffer(chunk);
    let combined = Buffer.concat([buffer, bufChunk]);
    const newlineIndex = combined.indexOf(0x0a);
    if (newlineIndex === -1) return { buffer: combined };
    const line = combined.subarray(0, newlineIndex).toString("utf8");
    const rest = combined.subarray(newlineIndex + 1);
    return { line, buffer: rest };
  }

  private getReceiverError(reasonOrMessage?: string): string {
    if (!reasonOrMessage) return "El receptor no pudo recibir el archivo.";
    switch (reasonOrMessage) {
      case "no_folder":
        return "El receptor no tiene una carpeta de destino configurada.";
      case "no_space":
        return "El receptor no tiene espacio suficiente para recibir el archivo.";
      case "permission_denied":
        return "El receptor perdió el permiso de la carpeta elegida.";
      case "write_error":
        return "Ocurrió un error al guardar el archivo en el receptor.";
      default:
        return reasonOrMessage;
    }
  }

  private update(partial: Partial<TransferProgress> & any): void {
    this._emit({ ...this.current!, ...partial } as TransferProgress);
  }
  private _emit(state: TransferProgress): void {
    this.current = state;
    for (const fn of this.listeners) fn(state);
  }
}

export const transferService = new TransferService();

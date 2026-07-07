import TcpSocket from "react-native-tcp-socket";
import ReactNativeBlobUtil from "react-native-blob-util";
import { Buffer } from "@craftzdog/react-native-buffer";

const HANDSHAKE_PORT = 53317;
const DATA_PORT = 53318;

export interface IncomingTransferRequest {
  deviceId: string;
  alias: string;
  file: { name: string; size: number; mimeType: string };
}

type RequestListener = (req: IncomingTransferRequest) => void;

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

  addListener(fn: RequestListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
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
      p.socket.write(
        JSON.stringify({ type: "reject", message: reason }) + "\n",
      );
      clearTimeout(p.timeout);
      this.pending.delete(deviceId);
      p.socket.end();
    } catch (err) {
      console.warn("[Receiver] Error enviando reject:", err);
    }
  }

  private _startHandshakeServer(): void {
    this.handshakeServer = TcpSocket.createServer((socket: any) => {
      let buffer = Buffer.alloc(0);
      const timeout = setTimeout(() => socket.destroy(), 10000);

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
          }, 30000);

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
      let writeStream: any = null;
      let header: {
        name: string;
        size: number;
        mimeType: string;
        deviceId: string;
      } | null = null;

      socket.on("data", async (chunk: Buffer) => {
        try {
          if (!headerParsed) {
            headerBuffer = Buffer.concat([headerBuffer, chunk]);

            const newlineIndex = headerBuffer.indexOf(0x0a);
            if (newlineIndex === -1) return;

            const headerLine = headerBuffer
              .subarray(0, newlineIndex)
              .toString("utf8");

            const rest = headerBuffer.subarray(newlineIndex + 1);

            try {
              header = JSON.parse(headerLine);
            } catch {
              socket.destroy();
              return;
            }

            if (!header?.deviceId || !this.accepted.has(header.deviceId)) {
              console.warn("[Receiver] Transferencia no aceptada");
              socket.destroy();
              return;
            }

            const downloadDir =
              ReactNativeBlobUtil.fs.dirs.DownloadDir ??
              ReactNativeBlobUtil.fs.dirs.DocumentDir;

            const filePath = `${downloadDir}/${header.name}`;

            writeStream = await ReactNativeBlobUtil.fs.writeStream(
              filePath,
              "base64",
            );

            headerParsed = true;

            if (rest.length > 0) {
              await writeStream.write(rest.toString("base64"));
            }

            return;
          }

          await writeStream.write(chunk.toString("base64"));
        } catch (err) {
          console.error(err);
          socket.destroy();
        }
      });

      socket.on("end", async () => {
        if (!header || !writeStream) return;

        try {
          await writeStream.close();

          this.accepted.delete(header.deviceId);
          this.pending.delete(header.deviceId);

          console.log("[Receiver] Archivo recibido:", header.name);
        } catch (err) {
          console.error("[Receiver] Error cerrando archivo:", err);
        }
      });

      socket.on("error", async (err: Error) => {
        console.error("[Receiver] Socket error:", err.message);

        try {
          await writeStream?.close();
        } catch {}
      });
    });

    this.dataServer.listen({ port: DATA_PORT, host: "0.0.0.0" }, () => {
      console.log(`[Receiver] Data escuchando en ${DATA_PORT}`);
    });
  }
}

export const transferReceiverService = new TransferReceiverService();

import net from "net";
import fs from "fs";
import path from "path";
import { configStore } from "../store/config.store";
import type { WsTransferService } from "./ws.service";

interface TransferHeader {
  name: string;
  size: number;
  mimeType: string;
  deviceId: string;
}

function getDownloadDir(): string {
  const stored = configStore.get("downloadDir") as string | undefined;
  const dir: string =
    stored && stored.trim() !== ""
      ? stored
      : path.join(process.cwd(), "downloads");

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function resolveCollision(dir: string, fileName: string): string {
  let destination = path.join(dir, fileName);
  if (!fs.existsSync(destination)) return destination;

  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  let counter = 1;
  while (fs.existsSync(destination)) {
    destination = path.join(dir, `${base} (${counter})${ext}`);
    counter++;
  }
  return destination;
}

export function createTcpService(
  port = 53318,
  wsService: WsTransferService,
  onReady?: () => void,
  onError?: (err: Error) => void,
) {
  const server = net.createServer((socket) => {
    let headerBuffer = Buffer.alloc(0);
    let headerParsed = false;
    let writeStream: fs.WriteStream | null = null;
    let header: TransferHeader | null = null;

    socket.on("data", (chunk: Buffer) => {
      if (!headerParsed) {
        headerBuffer = Buffer.concat([headerBuffer, chunk]);
        const newlineIndex = headerBuffer.indexOf(0x0a);

        if (newlineIndex === -1) {
          if (headerBuffer.length > 16 * 1024) {
            console.warn("[TCP] Header demasiado grande, cerrando conexión");
            socket.destroy();
          }
          return;
        }

        const headerLine = headerBuffer
          .subarray(0, newlineIndex)
          .toString("utf8");
        const rest = headerBuffer.subarray(newlineIndex + 1);

        try {
          header = JSON.parse(headerLine);
        } catch {
          console.error("[TCP] Header inválido, cerrando conexión");
          socket.destroy();
          return;
        }

        if (!header?.deviceId || !wsService.isAccepted(header.deviceId)) {
          console.warn(
            "[TCP] Transferencia rechazada: no aceptada por el usuario",
            header?.deviceId,
          );
          socket.destroy();
          return;
        }

        const downloadDir = getDownloadDir();
        const destination = resolveCollision(downloadDir, header.name);
        writeStream = fs.createWriteStream(destination);
        headerParsed = true;

        if (rest.length > 0) {
          const ok = writeStream.write(rest);
          if (!ok) socket.pause();
        }

        writeStream.on("drain", () => socket.resume());
      } else if (writeStream) {
        const ok = writeStream.write(chunk);
        if (!ok) socket.pause();
      }
    });

    socket.on("end", () => {
      if (writeStream && header) {
        const h = header;
        writeStream.end(() => {
          wsService.consumeAcceptance(h.deviceId);
          console.log("[TCP] Archivo recibido:", h.name);
        });
      }
    });

    socket.on("error", (err) => {
      console.error("[TCP] Socket error:", err.message);
      writeStream?.destroy();
    });
  });

  server.on("error", (err) => {
    console.error("[TCP] Server error:", err.message);
    onError?.(err);
  });

  server.listen(port, () => {
    console.log(`[TCP] Escuchando en ${port}`);
    onReady?.();
  });

  return server;
}

import net from "net";
import fs from "fs";
import path from "path";
import { configStore } from "../store/config.store";
import type { WsTransferService } from "./ws.service";
import { ServerStatusService } from "./server-status.service";

interface TransferHeader {
  name: string;
  size: number;
  mimeType: string;
  deviceId: string;
  policy?: "replace" | "keepBoth" | "skip";
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

function resolveCollision(
  dir: string,
  fileName: string,
  policy: "replace" | "keepBoth" | "skip" = "keepBoth",
): string | null {
  const destination = path.join(dir, fileName);

  if (!fs.existsSync(destination)) {
    return destination;
  }

  if (policy === "skip") {
    return null;
  }

  if (policy === "replace") {
    return destination;
  }

  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  let counter = 1;
  let candidate = path.join(dir, `${base} (${counter})${ext}`);
  while (fs.existsSync(candidate)) {
    counter++;
    candidate = path.join(dir, `${base} (${counter})${ext}`);
  }
  return candidate;
}

export function createTcpService(
  serverStatus: ServerStatusService,
  port = 53318,
  wsService: WsTransferService,
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

        const policy =
          wsService.getCollisionPolicy(header.deviceId) ?? "keepBoth";
        const downloadDir = getDownloadDir();
        const destination = resolveCollision(downloadDir, header.name, policy);
        if (!destination) {
          console.log(`[TCP] Archivo omitido por conflicto: ${header.name}`);
          socket.destroy();
          return;
        }

        if (policy === "replace" && fs.existsSync(destination)) {
          fs.unlinkSync(destination);
        }

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
    serverStatus.setTcp(false);
  });

  server.listen(port, () => {
    console.log(`[TCP] Escuchando en ${port}`);

    serverStatus.setTcp(true);
  });

  server.on("close", () => {
    serverStatus.setTcp(false);
  });

  return server;
}

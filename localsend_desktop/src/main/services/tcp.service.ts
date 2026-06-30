import http from "http";
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { configStore } from "../store/config.store";
import type { WsTransferService } from "./ws.service";

function getDownloadDir(): string {
  const dir =
    configStore.get("downloadDir") ?? path.join(process.cwd(), "downloads");
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

export function createTcpService(port = 53318, wsService: WsTransferService) {
  return http
    .createServer(async (req, res) => {
      if (req.method !== "POST" || req.url !== "/upload") {
        res.writeHead(404);
        res.end();
        return;
      }

      const deviceId = String(req.headers["x-device-id"] ?? "");

      if (!deviceId || !wsService.isAccepted(deviceId)) {
        console.warn(
          "[TCP] Transferencia rechazada: no aceptada por el usuario",
          deviceId,
        );
        res.writeHead(403);
        res.end("No aceptado");
        return;
      }

      try {
        const fileName = decodeURIComponent(
          String(req.headers["x-file-name"] ?? "archivo.bin"),
        );
        const downloadDir = getDownloadDir();
        const destination = resolveCollision(downloadDir, fileName);
        const writeStream = fs.createWriteStream(destination);

        await pipeline(req, writeStream);

        wsService.consumeAcceptance(deviceId); // limpia el estado para evitar que se pueda reutilizar la aceptación.
        console.log("[TCP] Archivo recibido:", fileName, "->", destination);
        res.writeHead(200);
        res.end("OK");
      } catch (error) {
        console.error("[TCP] Error:", error);
        res.writeHead(500);
        res.end("ERROR");
      }
    })
    .listen(port, () => {
      console.log(`[TCP] Escuchando en ${port}`);
    });
}

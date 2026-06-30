import { ipcMain, BrowserWindow } from "electron";
import fs from "fs";
import path from "path";
import net from "net";
import { channels } from "../../shared/constants";
import type { SendFilePayload } from "../../shared";
import { configStore } from "../store/config.store";
import { UdpDiscoveryService } from "../services/udp.service";
import { WsTransferService } from "../services/ws.service";

export function registerTransferHandlers(
  wsService: WsTransferService,
  mainWindow: BrowserWindow,
) {
  wsService.on("transfer-request", (data) => {
    console.log("[IPC] Enviando transfer-request al renderer");
    mainWindow.webContents.send(channels.transferRequest, {
      deviceId: data.deviceId,
      alias: data.alias,
      file: data.file,
    });
  });

  ipcMain.handle(
    channels.transferRespond,
    (
      _event,
      payload: { deviceId: string; accept: boolean; reason?: string },
    ) => {
      const { deviceId, accept, reason } = payload;
      if (accept) {
        wsService.accept(deviceId);
      } else {
        wsService.reject(deviceId, reason);
      }
      return { success: true };
    },
  );

  ipcMain.handle(
    channels.sendFile,
    async (_event, payload: SendFilePayload) => {
      return new Promise((resolve) => {
        try {
          const { filePath, targetIp, deviceId } = payload;
          const fileName = path.basename(filePath);
          const stats = fs.statSync(filePath);
          const totalBytes = stats.size;

          let bytesSent = 0;
          let lastTime = Date.now();
          let lastBytes = 0;

          const client = net.createConnection(
            { host: targetIp, port: 53318 },
            () => {
              const headerLine =
                JSON.stringify({
                  name: fileName,
                  size: totalBytes,
                  mimeType: "application/octet-stream",
                  deviceId,
                }) + "\n";

              client.write(headerLine, () => {
                const readStream = fs.createReadStream(filePath);

                readStream.on("data", (chunk: Buffer) => {
                  bytesSent += chunk.length;

                  const now = Date.now();
                  const elapsed = now - lastTime;
                  const speed =
                    elapsed >= 500
                      ? ((bytesSent - lastBytes) / elapsed) * 1000
                      : undefined;
                  if (elapsed >= 500) {
                    lastTime = now;
                    lastBytes = bytesSent;
                  }

                  mainWindow.webContents.send(channels.transferProgress, {
                    fileName,
                    bytesSent,
                    totalBytes,
                    progress: bytesSent / totalBytes,
                    speed,
                  });
                });

                readStream.pipe(client);

                readStream.on("error", (err) => {
                  client.destroy();
                  resolve({ success: false, error: err.message });
                });
              });
            },
          );

          client.on("close", () => {
            console.log(`[IPC] Archivo enviado: ${fileName} -> ${targetIp}`);
            mainWindow.webContents.send(channels.transferProgress, {
              fileName,
              bytesSent: totalBytes,
              totalBytes,
              progress: 1,
              speed: 0,
              done: true,
            });
            resolve({ success: true });
          });

          client.on("error", (err) => {
            console.error("[IPC] Error enviando archivo:", err);
            mainWindow.webContents.send(channels.transferProgress, {
              fileName,
              bytesSent,
              totalBytes,
              progress: bytesSent / totalBytes,
              speed: 0,
              error: err.message,
            });
            resolve({ success: false, error: err.message });
          });
        } catch (error) {
          resolve({
            success: false,
            error: error instanceof Error ? error.message : "Error desconocido",
          });
        }
      });
    },
  );
}

export function registerDiscoveryHandlers(
  udpService: UdpDiscoveryService,
  mainWindow: BrowserWindow,
) {
  udpService.onDeviceFound = (device) => {
    console.log("[IPC] Dispositivo encontrado:", device.alias, device.ip);
    mainWindow.webContents.send(channels.deviceFound, device);
  };

  udpService.onDeviceLost = (deviceId) => {
    console.log("[IPC] Dispositivo perdido:", deviceId);
    mainWindow.webContents.send(channels.deviceLost, deviceId);
  };

  ipcMain.handle(channels.getDevices, () => {
    return udpService.getDevices();
  });
}

export function registerIpcHandlers(
  udpService: UdpDiscoveryService,
  wsService: WsTransferService,
  mainWindow: BrowserWindow,
) {
  registerDiscoveryHandlers(udpService, mainWindow);
  registerTransferHandlers(wsService, mainWindow);
  ipcMain.handle(channels.setConfig, (_event, config) => {
    configStore.set(config);
    return { success: true };
  });
}

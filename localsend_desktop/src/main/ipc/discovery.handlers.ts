import { ipcMain, BrowserWindow } from "electron";
import fs from "fs";
import path from "path";
import net from "net";
import { channels } from "../../shared/constants";
import type { SendFilePayload } from "../../shared";
import { configStore } from "../store/config.store";
import { UdpDiscoveryService } from "../services/udp.service";
import { WsTransferService } from "../services/ws.service";
import { dialog } from "electron";

function requestHandshake(
  targetIp: string,
  handshakePort: number,
  payload: {
    deviceId: string;
    alias: string;
    file: { name: string; size: number; mimeType: string };
  },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(
      { host: targetIp, port: handshakePort },
      () => {
        socket.write(
          JSON.stringify({ type: "transfer-request", ...payload }) + "\n",
        );
      },
    );

    let buffer = Buffer.alloc(0);
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error("Timeout esperando respuesta del receptor"));
    }, 35000);

    socket.on("data", (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      const newlineIndex = buffer.indexOf(0x0a);
      if (newlineIndex === -1) return;

      clearTimeout(timeout);
      const line = buffer.subarray(0, newlineIndex).toString("utf8");
      try {
        const msg = JSON.parse(line);
        if (msg.type === "accept") {
          socket.end();
          resolve();
        } else if (msg.type === "reject") {
          socket.end();
          reject(new Error(msg.message ?? "Transferencia rechazada"));
        } else {
          socket.end();
          reject(new Error(msg.message ?? "Error del receptor"));
        }
      } catch {
        socket.destroy();
        reject(new Error("Respuesta inválida del receptor"));
      }
    });

    socket.on("error", (err) => {
      clearTimeout(timeout);
      reject(
        new Error(
          `No se pudo conectar a ${targetIp}:${handshakePort}: ${err.message}`,
        ),
      );
    });
  });
}

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
        (async () => {
          try {
            const { filePath, targetIp } = payload;
            const fileName = path.basename(filePath);
            const stats = fs.statSync(filePath);
            const totalBytes = stats.size;

            const myId = configStore.get("deviceId") as string;
            const myAlias = configStore.get("deviceAlias") as string;

            // 1. Handshake — pedir aceptación antes de mandar cualquier byte
            await requestHandshake(targetIp, 53317, {
              deviceId: myId,
              alias: myAlias,
              file: {
                name: fileName,
                size: totalBytes,
                mimeType: "application/octet-stream",
              },
            });

            // 2. Ya aceptado — abrir canal de datos
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
                    deviceId: myId,
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
              resolve({ success: false, error: err.message });
            });
          } catch (error) {
            resolve({
              success: false,
              error:
                error instanceof Error ? error.message : "Error desconocido",
            });
          }
        })();
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
  ipcMain.handle(channels.selectDownloadDir, async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory", "createDirectory"],
      title: "Elegir carpeta de descargas",
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false };
    }

    const selectedDir = result.filePaths[0];
    configStore.set("downloadDir", selectedDir);
    return { success: true, path: selectedDir };
  });

  ipcMain.handle(channels.getConfig, () => {
    return {
      deviceId: configStore.get("deviceId"),
      deviceAlias: configStore.get("deviceAlias"),
      downloadDir: configStore.get("downloadDir") || null,
    };
  });
}

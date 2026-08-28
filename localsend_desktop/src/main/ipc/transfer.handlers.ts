import { ipcMain, BrowserWindow, dialog } from "electron";
import fs from "fs";
import path from "path";
import net from "net";
import { channels, NEGOTIATION_TIMEOUT_MS } from "../../shared/constants";
import type { CollisionPolicy, SendFilePayload } from "../../shared";
import { configStore } from "../store/config.store";
import { WsTransferService } from "../services/ws.service";

const activeSockets = new Set<net.Socket>();
const cancelledSockets = new Set<net.Socket>();

export function cancelActiveTransfers(): void {
  for (const socket of activeSockets) {
    cancelledSockets.add(socket);
    socket.destroy();
  }
}

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
    activeSockets.add(socket);

    let buffer = Buffer.alloc(0);
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error("Timeout esperando respuesta del receptor"));
    }, NEGOTIATION_TIMEOUT_MS);

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
          const reason = msg.message ?? "Transferencia rechazada";
          socket.end();
          reject(new Error(reason));
        } else {
          const reason = msg.message ?? "Error del receptor";
          socket.end();
          reject(new Error(reason));
        }
      } catch {
        socket.destroy();
        reject(new Error("Respuesta inválida del receptor"));
      }
    });

    socket.on("error", (err) => {
      clearTimeout(timeout);
      activeSockets.delete(socket);
      reject(
        new Error(
          `No se pudo conectar a ${targetIp}:${handshakePort}: ${err.message}`,
        ),
      );
    });
    socket.on("close", () => {
      activeSockets.delete(socket);
      cancelledSockets.delete(socket);
    });
  });
}

export function registerTransferHandlers(
  wsService: WsTransferService,
  mainWindow: BrowserWindow,
) {
  ipcMain.handle(channels.selectFileToSend, async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      title: "Elegir archivo a enviar",
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const filePath = result.filePaths[0];
    const stats = fs.statSync(filePath);

    return {
      canceled: false,
      file: {
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
      },
    };
  });
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
      payload: {
        deviceId: string;
        accept: boolean;
        reason?: string;
        collisionPolicy?: CollisionPolicy;
      },
    ) => {
      const { deviceId, accept, reason, collisionPolicy } = payload;
      if (accept) {
        if (collisionPolicy === "skip") {
          wsService.reject(deviceId);
        } else {
          wsService.accept(deviceId, collisionPolicy ?? "keepBoth");
        }
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

            try {
              await requestHandshake(targetIp, 53317, {
                deviceId: myId,
                alias: myAlias,
                file: {
                  name: fileName,
                  size: totalBytes,
                  mimeType: "application/octet-stream",
                },
              });
            } catch (handshakeError) {
              const reason =
                handshakeError instanceof Error
                  ? handshakeError.message
                  : "Transferencia rechazada";

              mainWindow.webContents.send(channels.transferProgress, {
                fileName,
                bytesSent: 0,
                totalBytes,
                progress: 0,
                speed: 0,
                status: "error",
                error: reason,
                errorCode: "rejected",
              });

              resolve({ success: false, error: reason });
              return;
            }

            let bytesSent = 0;
            let lastTime = Date.now();
            let lastBytes = 0;

            const REASON_MESSAGES: Record<string, string> = {
              no_folder:
                "El celular no tiene una carpeta de destino configurada.",
              no_space:
                "El celular no tiene espacio suficiente para recibir el archivo.",
              permission_denied:
                "El celular perdió el permiso de la carpeta elegida.",
              write_error:
                "Ocurrió un error al guardar el archivo en el celular.",
              unknown: "El receptor no pudo guardar el archivo.",
            };

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
                      status: "transferring",
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
            activeSockets.add(client);

            let receiverError: string | null = null;

            client.on("data", (chunk: Buffer) => {
              try {
                const msg = JSON.parse(chunk.toString("utf8"));
                if (msg.type === "error") {
                  receiverError =
                    REASON_MESSAGES[msg.reason] ?? REASON_MESSAGES.unknown;
                }
              } catch (error) {
                void error;
              }
            });

            client.on("close", () => {
              activeSockets.delete(client);
              const wasCancelled = cancelledSockets.delete(client);
              if (wasCancelled) {
                resolve({
                  success: false,
                  error: "Transferencia cancelada: conexión de red perdida",
                });
                return;
              }
              if (receiverError) {
                console.log(
                  `[IPC] Transferencia rechazada por el receptor: ${receiverError}`,
                );
                resolve({ success: false, error: receiverError });
                return;
              }
              console.log(`[IPC] Archivo enviado: ${fileName} -> ${targetIp}`);
              mainWindow.webContents.send(channels.transferProgress, {
                fileName,
                bytesSent: totalBytes,
                totalBytes,
                progress: 1,
                speed: 0,
                status: "complete",
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

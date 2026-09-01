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
      reject(new Error("Sin conexión de red"));
    }, NEGOTIATION_TIMEOUT_MS);

    socket.setTimeout(15000);
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("Sin conexión de red"));
    });

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
    mainWindow.webContents.send(channels.transferRequest, {
      deviceId: data.deviceId,
      alias: data.alias,
      file: data.file,
    });
  });

  ipcMain.handle("transfer:cancel", () => {
    cancelActiveTransfers();
    return { success: true };
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
            let lastKnownSpeed = 0;
            let transferFinished = false;
            let readStream: fs.ReadStream | null = null;

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
                  readStream = fs.createReadStream(filePath);

                  readStream.on("data", (chunk: Buffer) => {
                    if (transferFinished) return;

                    bytesSent += chunk.length;
                    const now = Date.now();
                    const elapsed = now - lastTime;
                    const speed =
                      elapsed >= 500
                        ? ((bytesSent - lastBytes) / elapsed) * 1000
                        : lastKnownSpeed;
                    if (elapsed >= 500) {
                      lastTime = now;
                      lastBytes = bytesSent;
                      lastKnownSpeed = speed;
                    }

                    mainWindow.webContents.send(channels.transferProgress, {
                      fileName,
                      bytesSent,
                      totalBytes,
                      progress: Math.min(bytesSent / totalBytes, 1),
                      speed,
                      status: "transferring",
                    });
                  });

                  readStream.pipe(client);
                  readStream.on("error", (err) => {
                    if (transferFinished) return;
                    transferFinished = true;
                    client.destroy();
                    resolve({ success: false, error: err.message });
                  });
                });
              },
            );
            activeSockets.add(client);

            let receiverError: string | null = null;

            client.setTimeout(15000);
            client.on("timeout", () => {
              if (transferFinished) return;
              transferFinished = true;
              client.destroy();
              finishTransfer(
                false,
                "Se perdió la conexión de red durante la transferencia.",
                "connection_lost",
              );
            });

            client.on("data", (chunk: Buffer) => {
              try {
                const msg = JSON.parse(chunk.toString("utf8"));
                if (msg.type === "error") {
                  receiverError =
                    REASON_MESSAGES[msg.reason] ?? REASON_MESSAGES.unknown;
                  if (!transferFinished) {
                    readStream?.destroy();
                    client.destroy();
                    finishTransfer(false, receiverError, "rejected");
                  }
                }
              } catch (error) {
                void error;
              }
            });

            const finishTransfer = (
              success: boolean,
              error?: string,
              code?: "connection_lost" | "rejected",
            ) => {
              if (transferFinished) return;
              transferFinished = true;

              if (success) {
                mainWindow.webContents.send(channels.transferProgress, {
                  fileName,
                  bytesSent: totalBytes,
                  totalBytes,
                  progress: 1,
                  speed: 0,
                  status: "complete",
                });
                resolve({ success: true });
                return;
              }

              mainWindow.webContents.send(channels.transferProgress, {
                fileName,
                bytesSent,
                totalBytes,
                progress: Math.min(bytesSent / totalBytes, 1),
                speed: 0,
                status: "error",
                error: error ?? "Transferencia fallida.",
                errorCode: code ?? "connection_lost",
              });
              resolve({
                success: false,
                error: error ?? "Transferencia fallida.",
              });
            };

            client.on("close", () => {
              activeSockets.delete(client);
              const wasCancelled = cancelledSockets.delete(client);
              if (wasCancelled) {
                finishTransfer(false, "Transferencia cancelada", "rejected");
                return;
              }
              if (receiverError) {
                finishTransfer(false, receiverError, "rejected");
                return;
              }
              if (bytesSent < totalBytes) {
                finishTransfer(
                  false,
                  "Se perdió la conexión de red durante la transferencia.",
                  "connection_lost",
                );
                return;
              }
              finishTransfer(true);
            });

            client.on("error", (err) => {
              activeSockets.delete(client);
              if (transferFinished) return;
              if (!cancelledSockets.has(client)) {
                finishTransfer(false, err.message, "connection_lost");
              }
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

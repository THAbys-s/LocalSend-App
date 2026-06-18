import { ipcMain, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';

import { channels } from '../../shared/channels';
import { configStore } from '../store/config.store';
import { UdpDiscoveryService } from '../services/udp.service';
import { WsTransferService } from '../services/ws.service';
import type { SendFilePayload } from '../../shared/transfer.types';

export function registerIpcHandlers(
  udpService: UdpDiscoveryService,
  wsService: WsTransferService,
  mainWindow: BrowserWindow
) {
  // Handle incoming transfer requests from mobile via WebSocket
  wsService.on('transfer-request', (data) => {
    console.log('[IPC] Enviando transfer-request al renderer');
    mainWindow.webContents.send(channels.transferRequest, {
      deviceId: data.deviceId,
      alias: data.alias,
      file: data.file,
    });
  });

  // Handle user response (accept/reject) from renderer
  ipcMain.handle(
    channels.transferRespond,
    async (_event, payload: { deviceId: string; accept: boolean; reason?: string }) => {
      const { deviceId, accept, reason } = payload;

      if (accept) {
        wsService.accept(deviceId);
      } else {
        wsService.reject(deviceId, reason);
      }

      return { success: true };
    }
  );

  ipcMain.handle(
    channels.sendFile,
    async (
      _event,
      payload: SendFilePayload
    ) => {
      try {
        const { filePath, targetIp } = payload;

        const fileName = path.basename(filePath);

        const stream = fs.createReadStream(filePath);

        const response = await fetch(
          `http://${targetIp}:53318/upload`,
          {
            method: 'POST',
            headers: {
              'x-file-name': encodeURIComponent(fileName),
            },
            body: stream as any,
            duplex: 'half',
          }
        );

        if (!response.ok) {
          throw new Error(
            `El receptor respondió ${response.status}`
          );
        }

        console.log(
          `[IPC] Archivo enviado: ${fileName} -> ${targetIp}`
        );

        return {
          success: true,
        };
      } catch (error) {
        console.error('[IPC] Error enviando archivo:', error);

        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Error desconocido',
        };
      }
    }
  );

  ipcMain.handle(channels.getDevices, async () => {
    return { devices: [] };
  });

  ipcMain.handle(channels.setConfig, async (_event, config) => {
    configStore.set(config);

    return {
      success: true,
    };
  });
}
import { ipcMain } from 'electron';
import { channels } from '../../shared/channels';

export function registerIpcHandlers() {
  ipcMain.handle(channels.sendFile, async (event, payload) => {
    return { success: true };
  });
}

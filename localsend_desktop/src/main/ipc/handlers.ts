import { ipcMain } from 'electron';
import { channels } from '../../shared/channels';
import { configStore } from '../store/config.store';

export function registerIpcHandlers() {
  ipcMain.handle(channels.sendFile, async (_event, payload) => {
    console.log('[IPC] sendFile', payload);
    return { success: true };
  });

  ipcMain.handle(channels.getDevices, async () => {
    return { devices: [] };
  });

  ipcMain.handle(channels.setConfig, async (_event, config) => {
    configStore.set(config);
    return { success: true };
  });
}

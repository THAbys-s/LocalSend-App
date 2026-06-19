import { ipcMain } from 'electron';

import { channels } from '../../shared/channels';

export function registerDiscoveryHandlers() {
  ipcMain.handle(channels.getDevices, async () => {
    return { devices: [] };
  });
}

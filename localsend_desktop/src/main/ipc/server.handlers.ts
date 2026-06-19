import { ipcMain } from 'electron';

import { channels } from '../../shared/channels';
import { configStore } from '../store/config.store';

export function registerServerHandlers() {
  ipcMain.handle(channels.setConfig, async (_event, config) => {
    configStore.set(config);

    return {
      success: true,
    };
  });
}

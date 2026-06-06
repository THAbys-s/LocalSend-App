import Store from 'electron-store';
import { randomUUID } from 'crypto';
import os from 'os';

interface ConfigSchema {
  deviceId: string;
  deviceAlias: string;
  downloadPath: string;
}

const store = new Store<ConfigSchema>({
  defaults: {
    deviceId:     randomUUID(),
    deviceAlias:  `Desktop-${os.hostname()}`,
    downloadPath: '',
  },
});

export default store;
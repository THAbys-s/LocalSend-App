import Store from "electron-store";
import { randomUUID } from "crypto";
import os from "os";

interface ConfigSchema {
  deviceId: string;
  deviceAlias: string;
  downloadDir: string;
}

export const configStore = new Store<ConfigSchema>({
  defaults: {
    deviceId: randomUUID(),
    deviceAlias: `Desktop-${os.hostname()}`,
    downloadDir: "",
  },
});

import { ipcMain, BrowserWindow, dialog } from "electron";
import { channels } from "../../shared/constants";
import { configStore } from "../store/config.store";

export function registerConfigHandlers(mainWindow: BrowserWindow) {
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

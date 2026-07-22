import { ipcMain, BrowserWindow } from "electron";
import { channels } from "../../shared/constants";
import { UdpDiscoveryService } from "../services/udp.service";


export function registerDiscoveryHandlers(
  udpService: UdpDiscoveryService,
  mainWindow: BrowserWindow,
) {
  udpService.onDeviceFound = (device) => {
    console.log("[IPC] Dispositivo encontrado:", device.alias, device.ip);
    mainWindow.webContents.send(channels.deviceFound, device);
  };

  udpService.onDeviceLost = (deviceId) => {
    console.log("[IPC] Dispositivo perdido:", deviceId);
    mainWindow.webContents.send(channels.deviceLost, deviceId);
  };

  ipcMain.handle(channels.getDevices, () => {
    return udpService.getDevices();
  });
}

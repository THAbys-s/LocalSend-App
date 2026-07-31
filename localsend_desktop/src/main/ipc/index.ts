import { BrowserWindow, ipcMain } from "electron";
import { UdpDiscoveryService } from "../services/udp.service";
import { WsTransferService } from "../services/ws.service";
import { ServerStatusService } from "../services/server-status.service";
import { registerDiscoveryHandlers } from "./discovery.handlers";
import { registerTransferHandlers } from "./transfer.handlers";
import { registerConfigHandlers } from "./config.handlers";

export function registerIpcHandlers(
  udpService: UdpDiscoveryService,
  wsService: WsTransferService,
  serverStatus: ServerStatusService,
  mainWindow: BrowserWindow,
) {
  registerDiscoveryHandlers(udpService, mainWindow);
  registerTransferHandlers(wsService, mainWindow);
  registerConfigHandlers(mainWindow);

  ipcMain.handle("ipc-get-server-status", () => ({
    isActive: serverStatus.isActive(),
    status: serverStatus.getStatus(),
  }));
}

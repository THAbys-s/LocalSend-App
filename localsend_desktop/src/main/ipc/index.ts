import { BrowserWindow } from "electron";
import { UdpDiscoveryService } from "../services/udp.service";
import { WsTransferService } from "../services/ws.service";
import { registerDiscoveryHandlers } from "./discovery.handlers";
import { registerTransferHandlers } from "./transfer.handlers";
import { registerConfigHandlers } from "./config.handlers";

export function registerIpcHandlers(
  udpService: UdpDiscoveryService,
  wsService: WsTransferService,
  mainWindow: BrowserWindow,
) {
  registerDiscoveryHandlers(udpService, mainWindow);
  registerTransferHandlers(wsService, mainWindow);
  registerConfigHandlers(mainWindow);
}

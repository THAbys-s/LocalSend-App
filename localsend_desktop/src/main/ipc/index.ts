import { BrowserWindow } from 'electron';

import { UdpDiscoveryService } from '../services/udp.service';
import { WsTransferService } from '../services/ws.service';

import { registerDiscoveryHandlers } from './discovery.handlers';
import { registerTransferHandlers } from './transfer.handlers';
import { registerServerHandlers } from './server.handlers';

export function registerIpcHandlers(
  udpService: UdpDiscoveryService,
  wsService: WsTransferService,
  mainWindow: BrowserWindow
) {
  registerDiscoveryHandlers();
  registerTransferHandlers(wsService, mainWindow);
  registerServerHandlers();
}

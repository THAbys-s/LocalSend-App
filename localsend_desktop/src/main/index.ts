import path from "path";
import { registerTransferNotifications } from "./services/transfer-notification.service";
import { app, BrowserWindow } from "electron";
import { UdpDiscoveryService } from "./services/udp.service";
import { WsTransferService } from "./services/ws.service";
import { ServerStatusService } from "./services/server-status.service";
import { registerIpcHandlers } from "./ipc";
import { createTcpService } from "./services/tcp.service";
import { channels } from "../shared/constants";
import { DEFAULT_TCP_PORT } from "../shared/constants";

const TCP_PORT = Number(process.argv[2] ?? DEFAULT_TCP_PORT);
console.log("[Main] argv:", process.argv);
console.log("[Main] TCP_PORT resuelto:", TCP_PORT);

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

const serverStatus = new ServerStatusService();

const udpService = new UdpDiscoveryService(serverStatus);

const wsService = new WsTransferService(serverStatus, 53317);
let mainWindow: BrowserWindow | null = null;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  registerTransferNotifications(wsService, () => mainWindow);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  return win;
}

app.whenReady().then(() => {
  mainWindow = createWindow();

  serverStatus.onStatusChange((isActive, status) => {
    mainWindow?.webContents.send(channels.serverStatus, { isActive, status });
  });

  createTcpService(serverStatus, TCP_PORT, wsService);

  udpService.start();
  wsService.start();

  registerIpcHandlers(udpService, wsService, serverStatus, mainWindow);
});

app.on("window-all-closed", () => {
  udpService.stop();
  wsService.stop();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  udpService.stop();
  wsService.stop();
});

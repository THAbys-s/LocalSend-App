import { app, BrowserWindow } from 'electron';
import path from 'path';
import { UdpDiscoveryService } from './services/udp.service';
import { WsTransferService } from './services/ws.service';
import { registerIpcHandlers } from './ipc';
import { createTcpService } from './services/tcp.service';
import { DEFAULT_TCP_PORT } from '../shared/constants';

const TCP_PORT = Number(
  process.argv[2] ?? DEFAULT_TCP_PORT
);

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

const udpService = new UdpDiscoveryService();
const wsService = new WsTransferService(53317);
let mainWindow: BrowserWindow | null = null;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  return win;
}

app.whenReady().then(() => {
  createTcpService(TCP_PORT);
  mainWindow = createWindow();

  registerIpcHandlers(udpService, wsService, mainWindow);

  udpService.onDeviceFound = (device) => {
    console.log('[Main] Dispositivo encontrado:', device.alias, device.ip);
  };

  udpService.onDeviceLost = (deviceId) => {
    console.log('[Main] Dispositivo perdido:', deviceId);
  };

  udpService.start();
  wsService.start();
});

app.on('window-all-closed', () => {
  udpService.stop();
  wsService.stop();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  udpService.stop();
  wsService.stop();
});
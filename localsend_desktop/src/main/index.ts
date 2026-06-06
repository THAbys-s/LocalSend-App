import { app, BrowserWindow } from 'electron';
import path from 'path';
import { UdpDiscoveryService } from './services/udp.service';

const udpService = new UdpDiscoveryService();

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  return win;
}

app.whenReady().then(() => {
  createWindow();

  udpService.onDeviceFound = (device) => {
    console.log('[Main] Nuevo dispositivo:', device);
  };

  udpService.start();
});

app.on('window-all-closed', () => {
  udpService.stop();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  udpService.stop();
});

// Declaraciones de las variables que Forge inserta.
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;
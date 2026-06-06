import { BrowserWindow } from 'electron';
import { join } from 'path';

export function createMainWindow() {
  const window = new BrowserWindow({
    width: 1200,
    height: 780,
    webPreferences: {
      preload: join(__dirname, '../preload/bridge/index.js'),
      contextIsolation: true,
      sandbox: true,
    },
  });

  window.loadURL('http://localhost:5173');
  return window;
}

import { contextBridge, ipcRenderer } from 'electron';
import { channels } from '../../shared/channels';

contextBridge.exposeInMainWorld('electronAPI', {
  sendFile: (payload: unknown) => ipcRenderer.invoke(channels.sendFile, payload),
});

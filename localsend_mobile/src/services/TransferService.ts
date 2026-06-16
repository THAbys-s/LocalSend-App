import TcpSocket from 'react-native-tcp-socket';
import * as FileSystem from 'expo-file-system';
import { getDeviceAlias, getDeviceId } from '../utils/deviceInfo';

const WS_PORT   = 53317;
const TCP_PORT  = 53318;
const CHUNK     = 32 * 1024; 

export type TransferStatus =
  | 'idle' | 'connecting' | 'handshaking' | 'sending' | 'success' | 'rejected' | 'error';

export interface TransferProgress {
  status:       TransferStatus;
  progress:     number;    
  bytesSent:    number;
  totalBytes:   number;
  speed:        number;   
  fileName:     string;
  fileUri:      string;
  fileMime:     string;
  thumbnailUri?: string;
}

export interface FileToSend {
  uri:           string;
  name:          string;
  size:          number;
  type:          string;
  thumbnailUri?: string;
}

type ProgressListener = (p: TransferProgress) => void;

class TransferService {
  private ws:        WebSocket | null = null;
  private listeners  = new Set<ProgressListener>();
  private current:   TransferProgress | null = null;
  private cancelled  = false;

  addListener(fn: ProgressListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  getCurrent(): TransferProgress | null { return this.current; }

  cancel(): void {
    this.cancelled = true;
    try { this.ws?.close(1000, 'cancelled'); } catch (_) {}
    this.ws = null;
  }

  async send(ip: string, file: FileToSend): Promise<void> {
    this.cancelled = false;

    this._emit({
      status: 'connecting', progress: 0,
      bytesSent: 0, totalBytes: file.size, speed: 0,
      fileName: file.name, fileUri: file.uri, fileMime: file.type,
      thumbnailUri: file.thumbnailUri,
    });

    try {
      await this._handshake(ip, file);
      if (this.cancelled) return;
      await this._tcpStream(ip, file);
    } catch (err: any) {
      this._emit({ ...this.current!, status: 'error', progress: 0 });
      throw err;
    } finally {
      try { this.ws?.close(1000); } catch (_) {}
      this.ws = null;
    }
  }

  private _handshake(ip: string, file: FileToSend): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://${ip}:${WS_PORT}`);
      this.ws  = ws;

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Timeout de conexión WebSocket'));
      }, 8000);

      ws.onopen = async () => {
        clearTimeout(timeout);
        this._emit({ ...this.current!, status: 'handshaking' });

        ws.send(JSON.stringify({
          type:     'transfer-request',
          deviceId: await getDeviceId(),
          alias:    await getDeviceAlias(),
          file:     { name: file.name, size: file.size, mimeType: file.type },
        }));
      };

      ws.onmessage = ({ data }) => {
        try {
          const msg = JSON.parse(data);
          if (msg.type === 'accept')   resolve();
          else if (msg.type === 'reject') {
            this._emit({ ...this.current!, status: 'rejected' });
            reject(new Error('Transferencia rechazada'));
          } else {
            reject(new Error(msg.message ?? 'Error del servidor'));
          }
        } catch {
          reject(new Error('Respuesta inválida del servidor'));
        }
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`No se pudo conectar a ${ip}:${WS_PORT}`));
      };

      ws.onclose = (e) => {
        if (e.code !== 1000) {
          clearTimeout(timeout);
          reject(new Error(`WebSocket cerrado inesperadamente (${e.code})`));
        }
      };
    });
  }

  private _tcpStream(ip: string, file: FileToSend): Promise<void> {
    return new Promise((resolve, reject) => {
      const client = TcpSocket.createConnection({ host: ip, port: TCP_PORT }, async () => {
        this._emit({ ...this.current!, status: 'sending' });
        try {
          await this._stream(client, file);
          client.destroy();
          this._emit({ ...this.current!, status: 'success', progress: 1 });
          resolve();
        } catch (err) {
          client.destroy();
          reject(err);
        }
      });

      client.on('error', (e: Error) => reject(new Error(`TCP: ${e.message}`)));
      client.setTimeout(30000);
      client.on('timeout', () => { client.destroy(); reject(new Error('TCP timeout')); });
    });
  }

  private async _stream(client: any, file: FileToSend): Promise<void> {

    const header = JSON.stringify({ name: file.name, size: file.size, mimeType: file.type }) + '\n';
    await this._write(client, Buffer.from(header, 'utf8'));

    const totalChunks = Math.ceil(file.size / CHUNK);
    let bytesSent = 0, lastTime = Date.now(), lastBytes = 0;

    for (let i = 0; i < totalChunks; i++) {
      if (this.cancelled) throw new Error('Cancelado');

      const offset = i * CHUNK;
      const length = Math.min(CHUNK, file.size - offset);

      const b64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
        position: offset,
        length,
      });

      const buf = Buffer.from(b64, 'base64');
      await this._write(client, buf);

      bytesSent += length;

      const now     = Date.now();
      const elapsed = now - lastTime;
      const speed   = elapsed >= 500 ? ((bytesSent - lastBytes) / elapsed) * 1000 : this.current!.speed;
      if (elapsed >= 500) { lastTime = now; lastBytes = bytesSent; }

      this._emit({
        ...this.current!,
        status: 'sending',
        progress: bytesSent / file.size,
        bytesSent,
        totalBytes: file.size,
        speed,
      });
    }
  }

  private _write(client: any, data: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      client.write(data, (err: Error | null) => err ? reject(err) : resolve());
    });
  }

  private _emit(state: TransferProgress): void {
    this.current = state;
    for (const fn of this.listeners) fn(state);
  }
}

export const transferService = new TransferService();

import http from 'http';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

const DOWNLOAD_DIR = path.join(process.cwd(), 'downloads');

export function createTcpService(port = 53318) {
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }

  return http
    .createServer(async (req, res) => {
      if (req.method !== 'POST' || req.url !== '/upload') {
        res.writeHead(404);
        res.end();
        return;
      }

      try {
        const fileName =
          decodeURIComponent(
            String(req.headers['x-file-name'] ?? 'archivo.bin')
          );

        const destination = path.join(DOWNLOAD_DIR, fileName);

        const writeStream = fs.createWriteStream(destination);

        await pipeline(req, writeStream);

        console.log('[TCP] Archivo recibido:', fileName);

        res.writeHead(200);
        res.end('OK');
      } catch (error) {
        console.error('[TCP] Error:', error);

        res.writeHead(500);
        res.end('ERROR');
      }
    })
    .listen(port, () => {
      console.log(`[TCP] Escuchando en ${port}`);
    });
}
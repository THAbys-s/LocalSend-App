import fs from 'fs';
import { Writable } from 'stream';

export function createFileWriter(path: string): Writable {
  return fs.createWriteStream(path, { flags: 'wx' });
}

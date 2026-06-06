import { EventEmitter } from 'events';

export class TransferService extends EventEmitter {
  startTransfer() {
    this.emit('started');
  }
}

import { Notification } from 'electron';

export function notify(title: string, body: string) {
  new Notification({ title, body }).show();
}

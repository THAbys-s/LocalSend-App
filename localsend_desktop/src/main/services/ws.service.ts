import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';

export function createWebSocketService(server: http.Server) {
  return new WebSocketServer({ server });
}

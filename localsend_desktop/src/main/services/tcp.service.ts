import http from 'http';

export function createTcpService(port = 53318) {
  return http.createServer((req, res) => {
    res.writeHead(404);
    res.end();
  }).listen(port);
}

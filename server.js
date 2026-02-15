require('dotenv').config();
const next = require('next');
const http = require('http');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer((req, res) => handle(req, res));
  const { Server } = require('socket.io');
  const io = new Server(server);

  const { registerVideoNamespace } = require('./server/videoSocketHandler');
  registerVideoNamespace(io);

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});

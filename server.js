require('dotenv').config();
const next = require('next');
const http = require('http');
const { logVideoStage } = require('./server/videoDiagnostics');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev });
const handle = app.getRequestHandler();
const corsOrigins = (process.env.SOCKET_CORS_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);
const enforceHttps = process.env.NODE_ENV === 'production' && process.env.ENFORCE_HTTPS !== 'false';

function isHttpsRequest(req) {
  if (req.socket && req.socket.encrypted) return true;
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (!forwardedProto) return false;
  return forwardedProto.split(',').map((v) => v.trim()).includes('https');
}

if (!process.env.JWT_SECRET) {
  logVideoStage({
    stage: 'startup',
    status: 'fail',
    message: 'JWT_SECRET is missing. Auth and socket JWT verification will fail.',
  });
}

if (!dev && corsOrigins.length === 0) {
  logVideoStage({
    stage: 'startup',
    status: 'fail',
    message: 'No SOCKET_CORS_ORIGIN configured for production.',
  });
}

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    if (enforceHttps && !isHttpsRequest(req)) {
      const host = req.headers.host;
      if (host) {
        const redirectUrl = `https://${host}${req.url || '/'}`;
        logVideoStage({
          stage: 'https',
          status: 'fail',
          message: 'Blocked non-HTTPS request in production.',
          meta: { host, url: req.url || '/' },
        });
        res.writeHead(308, { Location: redirectUrl });
        res.end();
        return;
      }
    }
    handle(req, res);
  });
  const { Server } = require('socket.io');
  const io = new Server(server, {
    cors: corsOrigins.length
      ? {
          origin: corsOrigins,
          methods: ['GET', 'POST'],
          credentials: true,
        }
      : undefined,
  });

  const { registerVideoNamespace } = require('./server/videoSocketHandler');
  registerVideoNamespace(io);

  logVideoStage({
    stage: 'startup',
    status: 'ok',
    message: 'Socket server initialized.',
    meta: {
      nodeEnv: process.env.NODE_ENV,
      enforceHttps,
      corsOrigins: corsOrigins.length ? corsOrigins : ['same-origin'],
      jwtSecretConfigured: Boolean(process.env.JWT_SECRET),
    },
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});

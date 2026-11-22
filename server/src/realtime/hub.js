import { WebSocketServer } from 'ws';
import { env } from '../config/env.js';
import { COOKIE_NAME, verifyAccessToken } from '../utils/token.js';

// userId -> every open socket of that user (several tabs/devices are normal).
const sockets = new Map();
const wss = new WebSocketServer({ noServer: true });

const readCookie = (header, name) => {
  const pair = (header ?? '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return pair ? pair.slice(name.length + 1) : null;
};

// The browser sends the same httpOnly cookie on the WebSocket handshake, so no token is ever put in a URL.
const authenticate = (req) => {
  const token = readCookie(req.headers.cookie, COOKIE_NAME);
  if (!token) return null;
  try {
    return verifyAccessToken(token).sub;
  } catch {
    return null;
  }
};

const register = (userId, ws) => {
  if (!sockets.has(userId)) sockets.set(userId, new Set());
  sockets.get(userId).add(ws);
  ws.on('close', () => {
    sockets.get(userId)?.delete(ws);
    if (sockets.get(userId)?.size === 0) sockets.delete(userId);
  });
};

// Sends one event to every open socket of the given users.
export const publish = (userIds, event) => {
  const payload = JSON.stringify(event);
  for (const userId of new Set(userIds)) {
    for (const ws of sockets.get(userId) ?? []) {
      if (ws.readyState === ws.OPEN) ws.send(payload);
    }
  }
};

export const attachRealtime = (server) => {
  server.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    const userId = pathname === '/ws' ? authenticate(req) : null;
    // A page on another website must not be able to open a socket with the visitor's cookie.
    const originOk = !req.headers.origin || req.headers.origin === env.clientOrigin;

    if (!userId || !originOk) {
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });
      ws.on('error', () => ws.terminate());
      register(userId, ws);
    });
  });

  // Ping every 30s. A client that never answered the previous ping is gone, so drop it.
  setInterval(() => {
    for (const set of sockets.values()) {
      for (const ws of set) {
        if (!ws.isAlive) {
          ws.terminate();
        } else {
          ws.isAlive = false;
          ws.ping();
        }
      }
    }
  }, 30_000).unref();
};
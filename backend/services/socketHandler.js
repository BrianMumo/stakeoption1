/**
 * Socket Handler — Manages Socket.IO connections and events.
 *
 * Connection limits:
 *   - Global: 500 total connections (server-wide)
 *   - Per-IP: 5 connections (prevents single-origin abuse)
 *   - Per-User: 3 connections (multiple tabs/devices)
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

// ── Connection Limits ──
const MAX_GLOBAL_CONNECTIONS = parseInt(process.env.WS_MAX_GLOBAL) || 500;
const MAX_PER_IP = parseInt(process.env.WS_MAX_PER_IP) || 5;
const MAX_PER_USER = parseInt(process.env.WS_MAX_PER_USER) || 3;

function setupSocketHandler(io, priceEngine, tradeEngine) {
  // Track active connections
  const ipConnections = new Map();   // ip → Set<socketId>
  const userConnections = new Map(); // userId → Set<socketId>
  let totalConnections = 0;

  // ── Connection-limit middleware (runs before auth) ──
  io.use((socket, next) => {
    // Global limit
    if (totalConnections >= MAX_GLOBAL_CONNECTIONS) {
      console.warn(`[Socket] Global limit reached (${MAX_GLOBAL_CONNECTIONS}), rejecting ${socket.id}`);
      return next(new Error('Server is at capacity. Please try again later.'));
    }

    // Per-IP limit
    const ip = socket.handshake.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || socket.handshake.address;
    socket._clientIp = ip;

    const ipSet = ipConnections.get(ip) || new Set();
    if (ipSet.size >= MAX_PER_IP) {
      console.warn(`[Socket] Per-IP limit reached for ${ip} (${MAX_PER_IP}), rejecting ${socket.id}`);
      return next(new Error('Too many connections from your network.'));
    }

    next();
  });

  // ── Authentication middleware ──
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      // Allow unauthenticated connections for viewing prices
      socket.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;

      // Per-user limit
      const userSet = userConnections.get(decoded.id) || new Set();
      if (userSet.size >= MAX_PER_USER) {
        console.warn(`[Socket] Per-user limit reached for ${decoded.email} (${MAX_PER_USER}), rejecting ${socket.id}`);
        return next(new Error('Too many active sessions. Close a tab and retry.'));
      }

      next();
    } catch (err) {
      // Allow connection but without user context
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    // ── Track connection ──
    totalConnections++;
    const ip = socket._clientIp || socket.handshake.address;

    if (!ipConnections.has(ip)) ipConnections.set(ip, new Set());
    ipConnections.get(ip).add(socket.id);

    if (socket.user) {
      if (!userConnections.has(socket.user.id)) userConnections.set(socket.user.id, new Set());
      userConnections.get(socket.user.id).add(socket.id);
      socket.join(`user:${socket.user.id}`);
    }

    console.log(`[Socket] Connected: ${socket.id} | IP: ${ip} | User: ${socket.user?.email || 'anon'} | Total: ${totalConnections}`);

    // Send asset list on connect
    socket.emit('asset_list', priceEngine.getAssetList());

    // Client subscribes to a specific asset's price stream
    socket.on('subscribe_asset', (asset) => {
      const history = priceEngine.getHistory(asset);
      socket.emit('price_history', { asset, history });
    });

    // Client places a trade
    socket.on('place_trade', async (data, callback) => {
      if (!socket.user) {
        return callback({ error: 'Authentication required' });
      }

      try {
        const result = await tradeEngine.placeTrade(socket.user.id, {
          asset: data.asset,
          direction: data.direction,
          amount: parseFloat(data.amount),
          expiry_duration: parseInt(data.expiry_duration),
          account_type: data.account_type || 'demo'
        });

        callback({ success: true, trade: result });
        console.log(`[Socket] Trade placed by ${socket.user.email}: ${data.direction} ${data.asset} $${data.amount} [${data.account_type || 'demo'}]`);
      } catch (err) {
        callback({ error: err.message });
      }
    });

    // Client requests current balance
    socket.on('get_balance', async (callback) => {
      if (!socket.user) {
        return callback({ error: 'Authentication required' });
      }

      const { getUserById } = require('../config/db');
      const user = await getUserById(socket.user.id);
      if (user) {
        callback({ balance: user.balance, demo_balance: user.demo_balance });
      } else {
        callback({ error: 'User not found' });
      }
    });

    // ── Cleanup on disconnect ──
    socket.on('disconnect', () => {
      totalConnections = Math.max(0, totalConnections - 1);

      const ipSet = ipConnections.get(ip);
      if (ipSet) {
        ipSet.delete(socket.id);
        if (ipSet.size === 0) ipConnections.delete(ip);
      }

      if (socket.user) {
        const userSet = userConnections.get(socket.user.id);
        if (userSet) {
          userSet.delete(socket.id);
          if (userSet.size === 0) userConnections.delete(socket.user.id);
        }
      }

      console.log(`[Socket] Disconnected: ${socket.id} | Total: ${totalConnections}`);
    });
  });

  // Broadcast price updates to all connected clients
  priceEngine.onPriceUpdate((updates) => {
    io.emit('price_update', updates);
  });

  console.log(`[SocketHandler] Initialized — Limits: ${MAX_GLOBAL_CONNECTIONS} global / ${MAX_PER_IP} per-IP / ${MAX_PER_USER} per-user`);
}

module.exports = setupSocketHandler;

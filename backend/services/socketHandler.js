/**
 * Socket Handler — Manages Socket.IO connections and events.
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

function setupSocketHandler(io, priceEngine, tradeEngine) {
  // Authentication middleware for sockets
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
      next();
    } catch (err) {
      // Allow connection but without user context
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id} | User: ${socket.user?.email || 'anonymous'}`);

    // Join user room for targeted events
    if (socket.user) {
      socket.join(`user:${socket.user.id}`);
    }

    // Send asset list on connect
    socket.emit('asset_list', priceEngine.getAssetList());

    // Client subscribes to a specific asset's price stream
    socket.on('subscribe_asset', (asset) => {
      // Send initial history
      const history = priceEngine.getHistory(asset);
      socket.emit('price_history', { asset, history });
      console.log(`[Socket] ${socket.id} subscribed to ${asset}`);
    });

    // Client places a trade
    socket.on('place_trade', (data, callback) => {
      if (!socket.user) {
        return callback({ error: 'Authentication required' });
      }

      try {
        const result = tradeEngine.placeTrade(socket.user.id, {
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
    socket.on('get_balance', (callback) => {
      if (!socket.user) {
        return callback({ error: 'Authentication required' });
      }

      const { getUserById } = require('../config/db');
      const user = getUserById(socket.user.id);
      if (user) {
        callback({ balance: user.balance, demo_balance: user.demo_balance });
      } else {
        callback({ error: 'User not found' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  // Broadcast price updates to all connected clients
  priceEngine.onPriceUpdate((updates) => {
    io.emit('price_update', updates);
  });

  console.log('[SocketHandler] Initialized');
}

module.exports = setupSocketHandler;

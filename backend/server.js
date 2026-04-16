require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const tradeRoutes = require('./routes/trades');
const financesRoutes = require('./routes/finances');
const adminRoutes = require('./routes/admin');
const PriceEngine = require('./services/priceEngine');
const TradeEngine = require('./services/tradeEngine');
const setupSocketHandler = require('./services/socketHandler');

// Initialize Express
const app = express();
const server = http.createServer(app);

// CORS
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// REST routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/finances', financesRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize engines
const priceEngine = new PriceEngine();
const tradeEngine = new TradeEngine(priceEngine, io);

// Wire up socket events
setupSocketHandler(io, priceEngine, tradeEngine);

// Start engines
(async () => {
  await priceEngine.start(500);     // Price ticks every 500ms — fetches history first
  tradeEngine.startEvaluationLoop(500); // Check expired trades every 500ms
})();

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 StakeOption Backend running on http://localhost:${PORT}`);
  console.log(`📊 Price engine broadcasting for ${priceEngine.getAssetList().length} assets`);
  console.log(`🔌 Socket.IO ready for connections\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  priceEngine.stop();
  tradeEngine.stopEvaluationLoop();
  server.close();
  process.exit(0);
});

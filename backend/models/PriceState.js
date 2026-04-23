const mongoose = require('mongoose');

const priceStateSchema = new mongoose.Schema({
  _id: { type: String, default: 'current' },
  prices: { type: mongoose.Schema.Types.Mixed, default: {} },
  history: { type: mongoose.Schema.Types.Mixed, default: {} },
  updated_at: { type: Date, default: Date.now }
}, { collection: 'price_state' });

module.exports = mongoose.model('PriceState', priceStateSchema);

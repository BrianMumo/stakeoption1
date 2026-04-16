const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  user_id:         { type: String, required: true, index: true },
  asset:           { type: String, required: true },
  direction:       { type: String, enum: ['buy', 'sell'], required: true },
  amount:          { type: Number, required: true },
  strike_price:    { type: Number, required: true },
  close_price:     { type: Number, default: null },
  payout_percent:  { type: Number, default: 0.95 },
  expiry_duration: { type: Number, required: true },
  account_type:    { type: String, enum: ['demo', 'real'], default: 'demo' },
  status:          { type: String, enum: ['active', 'won', 'lost'], default: 'active', index: true },
  payout:          { type: Number, default: 0 },
  placed_at:       { type: Date, default: Date.now },
  expires_at:      { type: Date, required: true },
  closed_at:       { type: Date, default: null },
});

tradeSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    // Convert dates back to ISO strings for API compatibility
    if (ret.placed_at) ret.placed_at = ret.placed_at.toISOString();
    if (ret.expires_at) ret.expires_at = ret.expires_at.toISOString();
    if (ret.closed_at) ret.closed_at = ret.closed_at.toISOString();
    delete ret.__v;
    return ret;
  }
});

tradeSchema.set('toObject', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    if (ret.placed_at) ret.placed_at = ret.placed_at.toISOString();
    if (ret.expires_at) ret.expires_at = ret.expires_at.toISOString();
    if (ret.closed_at) ret.closed_at = ret.closed_at.toISOString();
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Trade', tradeSchema);

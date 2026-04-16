const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user_id:       { type: String, required: true, index: true },
  type:          { type: String, enum: ['deposit', 'withdrawal'], required: true },
  amount:        { type: Number, required: true },
  phone:         { type: String, default: null },
  method:        { type: String, default: 'mpesa' },
  reference:     { type: String, default: null, index: true },
  mpesa_receipt: { type: String, default: null },
  status:        { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'], default: 'pending' },
  completed_at:  { type: Date, default: null },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

transactionSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    if (ret.created_at) ret.created_at = ret.created_at.toISOString();
    if (ret.completed_at) ret.completed_at = ret.completed_at.toISOString();
    delete ret.__v;
    return ret;
  }
});

transactionSchema.set('toObject', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    if (ret.created_at) ret.created_at = ret.created_at.toISOString();
    if (ret.completed_at) ret.completed_at = ret.completed_at.toISOString();
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);

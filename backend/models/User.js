const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
  username:       { type: String, required: true, trim: true },
  password_hash:  { type: String, required: true },
  role:           { type: String, enum: ['user', 'admin'], default: 'user' },
  status:         { type: String, enum: ['active', 'suspended', 'banned'], default: 'active' },
  balance:        { type: Number, default: 5000.00 },
  demo_balance:   { type: Number, default: 5000.00 },
  account_type:   { type: String, enum: ['demo', 'real'], default: 'demo' },
  win_rate_boost: { type: Number, default: null },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Virtual 'id' that mirrors _id as a string (for compatibility with existing code)
userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret.__v;
    return ret;
  }
});

userSchema.set('toObject', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);

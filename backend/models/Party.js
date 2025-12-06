import mongoose from 'mongoose';

const partySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: { type: String, required: true },
  size: { type: Number, required: true },
  phone: { type: String },
  notes: { type: String },
  room: { type: String, default: 'main' },

  state: {
    type: String,
    enum: ['waiting', 'seated', 'completed', 'cancelled'],
    default: 'waiting'
  },

  tableId: { type: Number },
  addedAt: { type: Date, default: Date.now },
  quotedMinutes: { type: Number },
  seatedAt: { type: Date },
  completedAt: { type: Date },
  cancelledAt: { type: Date },
  cancelReason: { type: String },

  // Special requirements
  handicap: { type: Boolean, default: false },
  highchair: { type: Boolean, default: false },
  window: { type: Boolean, default: false },
  time: { type: String }
}, {
  timestamps: true
});

export default mongoose.model('Party', partySchema);

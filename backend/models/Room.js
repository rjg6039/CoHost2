import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  section: { type: Number, default: 1 },
  number: { type: Number, default: 1 },
  capacity: { type: Number, default: 4 },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  shape: { type: String, default: 'square' },
  handicap: { type: Boolean, default: false },
  highchair: { type: Boolean, default: false },
  window: { type: Boolean, default: false },
  state: { type: String, default: 'ready' }
}, { _id: false });

const roomSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  key: { type: String, required: true },
  tables: { type: [tableSchema], default: [] }
}, { timestamps: true });

roomSchema.index({ user: 1, key: 1 }, { unique: true });

export default mongoose.model('Room', roomSchema);

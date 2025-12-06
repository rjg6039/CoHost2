import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  restaurantName: {
    type: String,
    default: 'CoHost Restaurant'
  }
}, {
  timestamps: true
});

export default mongoose.model('User', userSchema);

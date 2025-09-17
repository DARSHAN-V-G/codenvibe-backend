import mongoose from 'mongoose';


const userSchema = new mongoose.Schema({
  team_name: {
    type: String,
    required: true,
    unique: true,
  },
  roll_nos: {
    type: [String],
    required: true,
  },
  emails: {
    type: [String],
    required: true,
  },
  otp: {
    code: String,
    generatedAt: Date,
    expiresAt: Date,
  },
  score: {
    type: Number,
    default: 0
  },
  testcases_passed: {
    type: [Number],
    default: []
  },
  year: {
    type: Number,
    required: true
  }
}, {
  timestamps: true 
});

export default mongoose.model('User', userSchema);

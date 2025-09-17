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
    type: Object,
    default: { code: '', generatedAt: null, expiresAt: null },
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
  },
  members: {
    type: [String],
    required: false,
    default: []
  }
}, {
  timestamps: true 
});

export default mongoose.model('User', userSchema);

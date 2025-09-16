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
    validate: {
      validator: function(v: string[]) {
        return v.length === 3; // Must have exactly 3 roll numbers
      },
      message: 'Team must have exactly 3 roll numbers'
    }
  },
  emails: {
    type: [String],
    required: true,
    validate: {
      validator: function(v: string[]) {
        return v.length === 3; // Must have exactly 3 emails
      },
      message: 'Team must have exactly 3 email addresses'
    }
  },
  otp: {
    code: String,
    generatedAt: Date,
    expiresAt: Date,
  },
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

export default mongoose.model('User', userSchema);

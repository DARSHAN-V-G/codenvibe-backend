import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRound2Submission extends Document {
  questionid: Types.ObjectId;
  teamid: Types.ObjectId;
  image_url: string[];
  github_link: string[];
  prompt_statements: string;
  tech_stack_used: string;
  video_url: string;
}

const Round2SubmissionSchema: Schema = new Schema({
  questionid: { 
    type: Schema.Types.ObjectId, 
    ref: 'Round2Question', 
    required: true 
  },
  teamid: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  image_url: { 
    type: [String], 
    required: true,
    default: [] 
  },
  github_link: { 
    type: [String], 
    required: true,
    default: [] 
  },
  prompt_statements: { 
    type: String, 
    required: true 
  },
  tech_stack_used: { 
    type: String, 
    required: true 
  },
  video_url: {
    type: String,
    required: true,
    default: ''  // Default empty string if no video provided
  }
}, {
  timestamps: true // Adds createdAt and updatedAt timestamps
});

export default mongoose.model<IRound2Submission>('Round2Submission', Round2SubmissionSchema);
import mongoose, { Schema, Document } from 'mongoose';

export interface IRound2Question extends Document {
  description: string;
}

const Round2QuestionSchema: Schema = new Schema({
  description: { type: String, required: true }
});

export default mongoose.model<IRound2Question>('Round2Question', Round2QuestionSchema);
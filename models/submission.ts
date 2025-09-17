import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISubmission extends Document {
  teamid: Types.ObjectId;
  questionid: Types.ObjectId;
  code: string;
  testcases_passed: number;
  all_passed: boolean;
}

const SubmissionSchema: Schema = new Schema({
  teamid: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  questionid: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
  code: { type: String, required: true },
  testcases_passed: { type: Number, required: true },
  all_passed: { type: Boolean, required: true }
});

export default mongoose.model<ISubmission>('Submission', SubmissionSchema);

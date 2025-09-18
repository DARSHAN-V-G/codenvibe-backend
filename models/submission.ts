import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISubmission extends Document {
  teamid: Types.ObjectId;
  questionid: Types.ObjectId;
  code: string;
  testcases_passed: number;
  all_passed: boolean;
  syntax_error: number;
  wrong_submission: number;
  created_at: Date;
}

const SubmissionSchema: Schema = new Schema({
  teamid: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  questionid: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
  code: { type: String, required: true, default: '' },
  testcases_passed: { type: Number, required: true, default: 0 },
  all_passed: { type: Boolean, required: true, default: false },
  syntax_error : {type : Number, required : true, default : 0},
  wrong_submission : {type : Number, required : true, default : 0},
  created_at: { type: Date, required: true, default: Date.now }
});

export default mongoose.model<ISubmission>('Submission', SubmissionSchema);

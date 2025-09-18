import mongoose, { Schema, Document, Types } from 'mongoose';

export enum SubmissionStatus {
    WRONG_SUBMISSION = 'wrong submission',
    SYNTAX_ERROR = 'syntax error',
    ACCEPTED = 'accepted'
}

export interface ISubmissionLog extends Document {
    submissionid: Types.ObjectId;
    created_at: Date;
    status: SubmissionStatus;
}

const SubmissionLogSchema: Schema = new Schema({
    submissionid: { 
        type: Schema.Types.ObjectId, 
        ref: 'Submission', 
        required: true 
    },
    created_at: { 
        type: Date, 
        required: true, 
        default: Date.now 
    },
    status: { 
        type: String, 
        required: true, 
        enum: Object.values(SubmissionStatus)
    }
});

// Create an index on submissionid for faster lookups
SubmissionLogSchema.index({ submissionid: 1 });

export default mongoose.model<ISubmissionLog>('SubmissionLog', SubmissionLogSchema);

import mongoose, { Schema, Document,Types } from 'mongoose';

interface TestCase {
  input: string;
  expectedOutput: string;
}

export interface IQuestion extends Document {
  _id: Types.ObjectId,
  year: number;
  number : number;
  title: string;
  description: string;
  correct_code: string;
  incorrect_code: string;
  test_cases: TestCase[];
}

const TestCaseSchema: Schema = new Schema({
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true }
});

const QuestionSchema: Schema = new Schema({
  number : {type : Number, required: true},
  year: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  correct_code: { type: String, required: true },
  incorrect_code: { type: String, required: true },
  test_cases: { type: [TestCaseSchema], required: true }
});

// Add compound index to make number unique within a year
QuestionSchema.index({ number: 1, year: 1 }, { unique: true });
export default mongoose.model<IQuestion>('Question', QuestionSchema);

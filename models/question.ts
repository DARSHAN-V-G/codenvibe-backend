import mongoose, { Schema, Document } from 'mongoose';

interface TestCase {
  input: string;
  expectedOutput: string;
}

export interface IQuestion extends Document {
  year: number;
  correct_code: string;
  incorrect_code: string;
  test_cases: TestCase[];
}

const TestCaseSchema: Schema = new Schema({
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true }
});

const QuestionSchema: Schema = new Schema({
  year: { type: Number, required: true },
  correct_code: { type: String, required: true },
  incorrect_code: { type: String, required: true },
  test_cases: { type: [TestCaseSchema], required: true }
});

export default mongoose.model<IQuestion>('Question', QuestionSchema);

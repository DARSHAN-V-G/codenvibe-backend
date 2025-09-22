import mongoose, { Schema, Document } from 'mongoose';

export interface IAdmin extends Document {
  username: string;
  email: string;
  password: string;
  current_round: number;
}

const AdminSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  current_round : { type: Number, required: true, default: 1 }
});

export default mongoose.model<IAdmin>('Admin', AdminSchema);

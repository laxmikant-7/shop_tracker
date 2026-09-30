import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'brother'], required: true },
    telegramChatId: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
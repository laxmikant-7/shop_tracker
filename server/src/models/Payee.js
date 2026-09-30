import mongoose from 'mongoose';

const payeeSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // normalized payee name/UPI ID
    displayName: { type: String, default: '' },
    category: { type: String, default: '' },
    isCashTransfer: { type: Boolean, default: false }, // money sent to brother for cash spending
  },
  { timestamps: true }
);

export default mongoose.model('Payee', payeeSchema);
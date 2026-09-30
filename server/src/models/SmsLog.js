import mongoose from 'mongoose';

const smsLogSchema = new mongoose.Schema(
  {
    rawText: { type: String, required: true },
    receivedAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['parsed', 'unparsed', 'duplicate', 'ignored'],
      required: true,
    },
    reason: { type: String, default: '' },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  },
  { timestamps: true }
);

smsLogSchema.index({ createdAt: -1 });

export default mongoose.model('SmsLog', smsLogSchema);
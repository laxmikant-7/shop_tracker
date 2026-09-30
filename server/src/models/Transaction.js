import mongoose from 'mongoose';
import { istDateKey } from '../utils/dates.js';

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['upi_credit', 'upi_debit', 'cash_expense'],
      required: true,
    },
    amountPaise: { type: Number, required: true, min: 1 },
    occurredAt: { type: Date, required: true },
    dateKey: { type: String, index: true }, // IST day, e.g. "2026-09-30"

    counterparty: { type: String, default: '' }, // sender / payee name or UPI ID
    counterpartyKey: { type: String, default: '', index: true }, // lowercase, for payee tagging
    category: { type: String, default: '' },
    note: { type: String, default: '' },

    source: { type: String, enum: ['sms', 'manual'], required: true },
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rawSms: { type: String, default: '' },

    // Duplicate protection: UPI ref number, or a hash of the SMS if no ref exists
    dedupeKey: { type: String },

    voided: { type: Boolean, default: false }, // "delete" = void, so history is kept
    editLog: [
      {
        at: Date,
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        change: String,
      },
    ],
  },
  { timestamps: true }
);

// Same SMS arriving twice must never create two records
transactionSchema.index(
  { dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } }
);
transactionSchema.index({ dateKey: 1, type: 1 });

transactionSchema.pre('validate', function (next) {
  if (this.occurredAt) this.dateKey = istDateKey(this.occurredAt);
  next();
});

export default mongoose.model('Transaction', transactionSchema);
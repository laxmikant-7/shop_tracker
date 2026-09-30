import mongoose from 'mongoose';

const dayCloseSchema = new mongoose.Schema(
  {
    dateKey: { type: String, required: true, unique: true },
    cashSalesPaise: { type: Number, required: true, min: 0 },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('DayClose', dayCloseSchema);
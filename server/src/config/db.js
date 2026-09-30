import dns from 'node:dns';
import mongoose from 'mongoose';

// Workaround for networks whose DNS blocks SRV lookups
dns.setServers(['8.8.8.8', '1.1.1.1']);

export async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');
}
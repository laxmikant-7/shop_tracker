import 'dotenv/config';
import readline from 'node:readline/promises';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const username = (await rl.question('Username (lowercase, no spaces): ')).toLowerCase().trim();
const name = (await rl.question('Full name: ')).trim();
const role = (await rl.question('Role (admin / brother): ')).trim();
const password = await rl.question('Password (min 8 chars; it will be visible): ');
rl.close();

if (!['admin', 'brother'].includes(role)) throw new Error('Role must be admin or brother');
if (password.length < 8) throw new Error('Password too short');

await connectDB();
await User.create({ username, name, role, passwordHash: await bcrypt.hash(password, 12) });
console.log(`Created ${role}: ${username}`);
await mongoose.disconnect();
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Stops password guessing: 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10 });

router.post('/login', loginLimiter, async (req, res) => {
  const username = String(req.body?.username || '').toLowerCase().trim();
  const password = String(req.body?.password || '');

  const user = await User.findOne({ username });
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) return res.status(401).json({ error: 'Invalid username or password' });

  // 30 days so your brother isn't asked to log in constantly
  const token = jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
  res.json({
    token,
    user: { id: user._id, name: user.name, username: user.username, role: user.role },
  });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).select('name username role');
  if (!user) return res.status(401).json({ error: 'Account not found' });
  res.json({ user });
});

export default router;
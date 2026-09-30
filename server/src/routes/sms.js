import { Router } from 'express';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import Transaction from '../models/Transaction.js';
import Payee from '../models/Payee.js';
import SmsLog from '../models/SmsLog.js';
import { parseBankSms, normalizeKey } from '../utils/smsParser.js';
import { toPaise } from '../utils/money.js';

const router = Router();
const limiter = rateLimit({ windowMs: 60_000, limit: 60 });

// Constant-time comparison so the key can't be guessed by timing
function keyMatches(provided = '') {
  const a = Buffer.from(String(provided));
  const b = Buffer.from(process.env.SMS_API_KEY || '');
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Accepts ISO strings or epoch seconds/ms; falls back to "now" if missing or unreasonable
function pickTime(value) {
  const now = new Date();
  let d = null;
  if (value) {
    const s = String(value).trim();
    if (/^\d{10}$/.test(s)) d = new Date(Number(s) * 1000);
    else if (/^\d{13}$/.test(s)) d = new Date(Number(s));
    else d = new Date(s);
  }
  const valid =
    d &&
    !isNaN(d) &&
    d.getTime() <= now.getTime() + 5 * 60 * 1000 && // not in the future
    now.getTime() - d.getTime() < 3 * 24 * 3600 * 1000; // not older than 3 days
  return valid ? d : now;
}

router.post('/', limiter, async (req, res) => {
  if (!keyMatches(req.get('x-api-key'))) return res.status(401).json({ error: 'unauthorized' });

  const text = String(req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'text is required' });
  if (text.length > 1000) return res.status(400).json({ error: 'text too long' });

  const receivedAt = pickTime(req.body?.receivedAt);

  try {
    const parsed = parseBankSms(text);

    if (!parsed.ok) {
      const status = parsed.ignored ? 'ignored' : 'unparsed';
      await SmsLog.create({ rawText: text, receivedAt, status, reason: parsed.reason });
      // 200 on purpose: a "failed" response would make MacroDroid retry forever
      return res.json({ status, reason: parsed.reason });
    }

    // Duplicate protection: UPI ref if we have it, else a hash of the text + time
    const dedupeKey = parsed.refNo
      ? `${parsed.direction}:${parsed.refNo}`
      : 'hash:' +
        crypto.createHash('sha256').update(parsed.text + receivedAt.toISOString().slice(0, 16)).digest('hex');

    const counterpartyKey = normalizeKey(parsed.counterparty);
    let category = '';

    if (parsed.direction === 'debit' && counterpartyKey) {
      const payee = await Payee.findOne({ key: counterpartyKey });
      if (payee) {
        category = payee.isCashTransfer ? 'cash_transfer' : payee.category;
      } else {
        // First time we see this supplier: create an untagged entry for you to categorize
        await Payee.updateOne(
          { key: counterpartyKey },
          { $setOnInsert: { key: counterpartyKey, displayName: parsed.counterparty } },
          { upsert: true }
        );
      }
    }

    try {
      const tx = await Transaction.create({
        type: parsed.direction === 'credit' ? 'upi_credit' : 'upi_debit',
        amountPaise: toPaise(parsed.amount),
        occurredAt: receivedAt,
        counterparty: parsed.counterparty,
        counterpartyKey,
        category,
        source: 'sms',
        rawSms: parsed.text,
        dedupeKey,
      });
      await SmsLog.create({ rawText: text, receivedAt, status: 'parsed', transactionId: tx._id });
      return res.status(201).json({ status: 'saved', id: tx._id });
    } catch (err) {
      if (err.code === 11000) {
        await SmsLog.create({ rawText: text, receivedAt, status: 'duplicate', reason: 'same ref/hash' });
        return res.json({ status: 'duplicate' });
      }
      throw err;
    }
  } catch (err) {
    console.error('SMS handler error:', err);
    // 500 => MacroDroid retries later, and dedupe makes the retry safe
    return res.status(500).json({ error: 'server error' });
  }
});

export default router;
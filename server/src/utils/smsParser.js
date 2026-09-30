// Messages that are never transactions
const IGNORE_RE =
  /\b(otp|one time password|cvv|pin)\b|(will be|to be)\s+(debited|credited)|\bmandate\b|collect request|requested money/i;

// Clearly NOT UPI (cash deposit, cheques, charges...). These are logged for your review, not counted.
const NON_UPI_RE =
  /\b(neft|rtgs|imps|cash deposit|cdm|atm|interest|int\.?\s?pd|cheque|chq|emi|charges?|fee)\b/i;

const AMOUNT_RE = /(?:\brs\.?|\binr\.?|₹)\s*(\d[\d,]*(?:\.\d{1,2})?)/gi;
// SBI style: "debited by 1500.0" (no Rs)
const AMOUNT_FALLBACK_RE =
  /\b(?:credited|debited)\s+(?:by|with|for)\s+(?:rs\.?\s*)?(\d[\d,]*(?:\.\d{1,2})?)/i;

const CREDIT_WORDS = /\b(credited|received|deposited)\b/i;
const DEBIT_WORDS = /\b(debited|sent|paid|withdrawn|transferred|spent)\b/i;

const BAD_NAMES = /^(a\/c|acct?|account|your|you|upi|bank|hdfc|sbi)\b/i;

const clean = (s) => s.replace(/\s+/g, ' ').trim();

export const normalizeKey = (s = '') => clean(s.toLowerCase());

function findDirection(text) {
  const c = text.search(CREDIT_WORDS);
  const d = text.search(DEBIT_WORDS);
  if (c === -1 && d === -1) return null;
  if (c === -1) return 'debit';
  if (d === -1) return 'credit';
  return c < d ? 'credit' : 'debit'; // whichever word comes first
}

function findAmount(text) {
  for (const m of text.matchAll(AMOUNT_RE)) {
    const before = text.slice(Math.max(0, m.index - 20), m.index).toLowerCase();
    if (/bal|limit/.test(before)) continue; // skip "Avl bal Rs..."
    const n = Number(m[1].replace(/,/g, ''));
    if (n > 0) return n;
  }
  const f = text.match(AMOUNT_FALLBACK_RE);
  if (f) {
    const n = Number(f[1].replace(/,/g, ''));
    if (n > 0) return n;
  }
  return null;
}

function findRef(text) {
  let m = text.match(
    /\b(?:ref(?:erence)?|rrn|utr|upi)\s*(?:no|number|id|#)?\.?\s*[:\-]?\s*(\d{9,14})\b/i
  );
  if (m) return m[1];
  m = text.match(/\/(\d{12})\b/); // UPI/NAME/627012345678
  if (m) return m[1];
  m = text.match(/\b(\d{12})\b/); // any 12-digit number
  return m ? m[1] : '';
}

function findCounterparty(text, direction) {
  // 1) UPI ID like ramesh@ybl (ignores email footers like care@bank.com)
  let m = text.match(/\b([a-z0-9._-]{2,}@[a-z][a-z0-9]+)\b(?!\.[a-z])/i);
  if (m) return m[1];

  // 2) UPI/CR/627012345678/NAME
  m = text.match(/\bUPI\/(?:CR|DR)\/\d+\/([^\/]{2,40})/i);
  if (m) return clean(m[1]);

  // 3) UPI/NAME/627012345678
  m = text.match(/\bUPI\/(?!CR\/|DR\/)([A-Za-z][^\/\d]{1,40}?)\//i);
  if (m) return clean(m[1]);

  // 4) "from NAME" (credit) or "to NAME" (debit)
  const word = direction === 'credit' ? 'from' : 'to';
  const re = new RegExp(
    `\\b${word}\\s+(?:vpa\\s+)?([A-Za-z][A-Za-z0-9 .&'-]{1,40}?)` +
      `(?=\\s+(?:on|via|upi|through|avl|bal|not|if|call|dated|date)\\b|\\s+ref|[.,(]|$)`,
    'i'
  );
  m = text.match(re);
  if (m) {
    const name = clean(m[1]);
    if (!BAD_NAMES.test(name)) return name;
  }
  return '';
}

export function parseBankSms(raw) {
  const text = clean(String(raw));

  if (IGNORE_RE.test(text)) return { ok: false, ignored: true, reason: 'not_a_transaction' };
  if (NON_UPI_RE.test(text)) return { ok: false, ignored: true, reason: 'not_upi' };

  const direction = findDirection(text);
  if (!direction) return { ok: false, ignored: false, reason: 'no_direction' };

  const amount = findAmount(text);
  if (!amount) return { ok: false, ignored: false, reason: 'no_amount' };

  return {
    ok: true,
    direction, // 'credit' | 'debit'
    amount, // rupees
    refNo: findRef(text),
    counterparty: findCounterparty(text, direction),
    text,
  };
}
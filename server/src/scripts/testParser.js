import { parseBankSms } from '../utils/smsParser.js';

// These are GENERIC samples. Add your bank's real messages (names/digits masked) at the bottom.
const samples = [
  {
    text: 'Rs.250.00 credited to A/c XX1234 on 30-09-26 by UPI/RAMESH KUMAR/627012345678. Avl bal Rs.12,340.50',
    expect: { direction: 'credit', amount: 250, refNo: '627012345678', counterparty: 'RAMESH KUMAR' },
  },
  {
    text: 'Sent Rs.1500.00 From HDFC Bank A/C *1234 To SHARMA WHOLESALE On 30/09/26 Ref 627012345999 Not You? Call 18002586161',
    expect: { direction: 'debit', amount: 1500, refNo: '627012345999', counterparty: 'SHARMA WHOLESALE' },
  },
  {
    text: 'Credit Alert! Rs.500.00 credited to HDFC Bank A/c XX1234 on 30-09-26 from VPA ramesh@ybl (UPI 627012345001)',
    expect: { direction: 'credit', amount: 500, refNo: '627012345001', counterparty: 'ramesh@ybl' },
  },
  {
    text: 'Dear UPI user A/C X1234 debited by 1500.0 on date 30Sep26 trf to SHARMA WHOLESALE Refno 627012345999. If not you, call 1800111109',
    expect: { direction: 'debit', amount: 1500, refNo: '627012345999', counterparty: 'SHARMA WHOLESALE' },
  },
  {
    text: 'Dear UPI user A/C X1234 credited by Rs250.0 on date 30Sep26 by transfer from RAMESH KUMAR Refno 627012345002. If not you, call 1800111109',
    expect: { direction: 'credit', amount: 250, refNo: '627012345002', counterparty: 'RAMESH KUMAR' },
  },
  {
    text: 'Received Rs.300.00 in your Kotak Bank AC X1234 from ramesh@okaxis on 30-09-26.UPI Ref:627012345003.',
    expect: { direction: 'credit', amount: 300, refNo: '627012345003', counterparty: 'ramesh@okaxis' },
  },
  { text: 'Your OTP is 123456 for UPI transaction. Do not share.', expect: { ignored: true } },
  { text: 'Rs 2000.00 credited to A/c XX1234 on 30-09-26 by CASH DEPOSIT', expect: { ignored: true } },
  // ---- ADD YOUR REAL SAMPLES BELOW ----
];

let failed = 0;
for (const s of samples) {
  const r = parseBankSms(s.text);
  const problems = [];
  if (s.expect.ignored) {
    if (!r.ignored) problems.push('expected ignored');
  } else {
    if (!r.ok) problems.push(`not parsed (${r.reason})`);
    else
      for (const [k, v] of Object.entries(s.expect))
        if (r[k] !== v) problems.push(`${k}: got "${r[k]}", expected "${v}"`);
  }
  if (problems.length) {
    failed++;
    console.log('FAIL:', s.text.slice(0, 70), '\n   ', problems.join(' | '));
  } else console.log('PASS:', s.text.slice(0, 70));
}
console.log(failed ? `\n${failed} failed` : '\nAll passed');
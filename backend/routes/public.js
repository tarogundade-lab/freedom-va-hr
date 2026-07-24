const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { sendNewApplicationEmail } = require('../email');

const router = express.Router();

// Extremely simple in-memory rate limiting: max 5 submissions per IP per hour.
// Good enough to blunt casual spam without needing an external service.
const submissionLog = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const entries = (submissionLog.get(ip) || []).filter((t) => now - t < windowMs);
  entries.push(now);
  submissionLog.set(ip, entries);
  return entries.length > 5;
}

// Public application form submission — no login required.
router.post('/apply', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many submissions. Please try again later.' });
  }

  const { name, email, phone, source, notes, honeypot } = req.body;
  // Honeypot field: real users never fill this in; bots often do.
  if (honeypot) return res.status(201).json({ ok: true });

  if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

  const id = uuid();
  db.prepare(`INSERT INTO applicants (id, name, email, phone, source, notes) VALUES (?,?,?,?,?,?)`)
    .run(id, name.trim(), email.trim(), phone || null, source || 'Public application form', notes || null);
  db.prepare(`INSERT INTO applicant_activity (id, applicant_id, note, to_stage) VALUES (?,?,?,?)`)
    .run(uuid(), id, 'Applied via public form', 'applied');

  const admins = db.prepare(`SELECT email FROM users WHERE role = 'admin' AND status = 'active'`).all();
  admins.forEach((a) => sendNewApplicationEmail({ to: a.email, applicantName: name.trim() }));

  res.status(201).json({ ok: true });
});

// Lets the apply/login pages show your org name without needing login.
router.get('/info', (req, res) => {
  const row = db.prepare(`SELECT value FROM settings WHERE key = 'org_name'`).get();
  res.json({ org: row?.value || 'My Freedom VA' });
});

// Public assessment: fetch questions WITHOUT correct answers.
router.get('/assessment/questions', (req, res) => {
  const rows = db.prepare('SELECT id, question, options, category FROM assessment_questions ORDER BY sort_order').all();
  res.json({ questions: rows.map(r => ({ ...r, options: JSON.parse(r.options) })) });
});

// Public assessment submission — scored entirely server-side. The response
// only ever includes the overall score, never which specific answers were
// wrong, so a candidate can't learn the answer key from their own result.
router.post('/assessment/submit', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many submissions. Please try again later.' });
  }

  const { name, email, phone, answers } = req.body;
  if (!name || !email || !answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'Name, email, and answers are required' });
  }

  const questions = db.prepare('SELECT id, correct_index FROM assessment_questions').all();
  let correctCount = 0;
  questions.forEach((q) => {
    if (answers[q.id] === q.correct_index) correctCount += 1;
  });
  const total = questions.length;
  const scorePct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  // Try to link this attempt to an existing applicant by email, so admins
  // see the score right alongside that person in the recruitment pipeline.
  const applicant = db.prepare('SELECT id FROM applicants WHERE LOWER(email) = LOWER(?) ORDER BY applied_at DESC LIMIT 1').get(email.trim());

  const id = uuid();
  db.prepare(`
    INSERT INTO assessment_attempts (id, name, email, phone, applicant_id, total_questions, correct_count, score_pct, answers)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(id, name.trim(), email.trim(), phone || null, applicant?.id || null, total, correctCount, scorePct, JSON.stringify(answers));

  res.status(201).json({ score_pct: scorePct, correct_count: correctCount, total_questions: total });
});

module.exports = router;

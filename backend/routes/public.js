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

// Lets the apply page show your org name without needing login.
router.get('/apply/info', (req, res) => {
  res.json({ org: process.env.ORG_NAME || 'Freedom VA' });
});

module.exports = router;

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function sign(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (user.status !== 'active') return res.status(403).json({ error: 'Account is inactive' });
  const token = sign(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, status, phone, cohort_id, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// Admin creates a new user account (admin or va), e.g. when hiring an applicant
router.post('/users', requireAuth, requireAdmin, (req, res) => {
  const { name, email, password, role, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'A user with that email already exists' });
  const id = uuid();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(`INSERT INTO users (id, name, email, password_hash, role, phone) VALUES (?,?,?,?,?,?)`)
    .run(id, name, email.toLowerCase(), hash, role === 'admin' ? 'admin' : 'va', phone || null);

  // Auto-assign the default onboarding checklist to new VAs
  if (role !== 'admin') {
    const templates = db.prepare('SELECT id FROM onboarding_templates').all();
    const insert = db.prepare('INSERT INTO onboarding_progress (id, user_id, template_id) VALUES (?,?,?)');
    templates.forEach(t => insert.run(uuid(), id, t.id));
  }

  res.status(201).json({ id });
});

router.get('/users', requireAuth, requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.status, u.phone, u.created_at,
      u.skills, u.weekly_capacity_hours, u.offboarded_at, u.offboard_reason,
      COALESCE((SELECT SUM(a.hours_per_week) FROM assignments a WHERE a.va_user_id = u.id AND a.status = 'active'), 0) AS booked_hours_per_week
    FROM users u ORDER BY u.created_at DESC
  `).all();
  res.json({
    users: users.map((u) => ({ ...u, skills: JSON.parse(u.skills || '[]') })),
  });
});

router.patch('/users/:id/status', requireAuth, requireAdmin, (req, res) => {
  const { status } = req.body;
  if (!['active', 'inactive'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

// Update a VA's skills and weekly capacity
router.patch('/users/:id', requireAuth, requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'User not found' });
  const { name, phone, skills, weekly_capacity_hours } = req.body;
  db.prepare(`UPDATE users SET name=?, phone=?, skills=?, weekly_capacity_hours=? WHERE id=?`).run(
    name ?? existing.name,
    phone ?? existing.phone,
    skills !== undefined ? JSON.stringify(skills) : existing.skills,
    weekly_capacity_hours !== undefined ? weekly_capacity_hours : existing.weekly_capacity_hours,
    req.params.id
  );
  res.json({ ok: true });
});

// Offboard a VA: marks them inactive, records why and when, and ends their active client assignments
router.post('/users/:id/offboard', requireAuth, requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'User not found' });
  const { reason } = req.body;
  const today = new Date().toISOString().slice(0, 10);
  db.prepare(`UPDATE users SET status='inactive', offboarded_at=?, offboard_reason=? WHERE id=?`)
    .run(new Date().toISOString(), reason || null, req.params.id);
  db.prepare(`UPDATE assignments SET status='ended', end_date=? WHERE va_user_id=? AND status='active'`)
    .run(today, req.params.id);
  res.json({ ok: true });
});

// Reactivate a previously offboarded VA
router.post('/users/:id/reactivate', requireAuth, requireAdmin, (req, res) => {
  db.prepare(`UPDATE users SET status='active', offboarded_at=NULL, offboard_reason=NULL WHERE id=?`).run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;

const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { sendOnboardingReminderEmail } = require('../email');

const router = express.Router();
router.use(requireAuth);

// Onboarding info doc (work schedule, pay, access instructions, etc.)
// Viewable by anyone logged in — VAs need to read it too — editable by admin only.
router.get('/info', (req, res) => {
  const row = db.prepare(`SELECT value FROM settings WHERE key = 'onboarding_info'`).get();
  res.json({ info: row?.value || '' });
});

router.patch('/info', requireAdmin, (req, res) => {
  const { info } = req.body;
  db.prepare(`INSERT INTO settings (key, value) VALUES ('onboarding_info', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(info || '');
  res.json({ ok: true });
});

// Template management (admin only)
router.get('/templates', requireAdmin, (req, res) => {
  const templates = db.prepare('SELECT * FROM onboarding_templates ORDER BY sort_order').all();
  res.json({ templates });
});

router.post('/templates', requireAdmin, (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM onboarding_templates').get().m;
  const id = uuid();
  db.prepare('INSERT INTO onboarding_templates (id, title, sort_order) VALUES (?,?,?)').run(id, title, maxOrder + 1);
  res.status(201).json({ id });
});

router.delete('/templates/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM onboarding_templates WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// A user's checklist progress. Admin can view anyone's via ?user_id=, VAs only their own.
router.get('/progress', (req, res) => {
  const targetUserId = req.user.role === 'admin' && req.query.user_id ? req.query.user_id : req.user.id;
  const progress = db.prepare(`
    SELECT p.id, p.completed, p.completed_at, t.id AS template_id, t.title, t.sort_order
    FROM onboarding_progress p JOIN onboarding_templates t ON t.id = p.template_id
    WHERE p.user_id = ? ORDER BY t.sort_order
  `).all(targetUserId);
  res.json({ progress });
});

router.patch('/progress/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM onboarding_progress WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Checklist item not found' });
  if (req.user.role !== 'admin' && item.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Not allowed' });
  }
  const { completed } = req.body;
  db.prepare(`UPDATE onboarding_progress SET completed = ?, completed_at = ? WHERE id = ?`)
    .run(completed ? 1 : 0, completed ? new Date().toISOString() : null, req.params.id);
  res.json({ ok: true });
});

// Admin: overview of every VA's onboarding completion %
router.get('/overview', requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT u.id AS user_id, u.name, u.email,
      COUNT(p.id) AS total_items,
      SUM(p.completed) AS completed_items
    FROM users u LEFT JOIN onboarding_progress p ON p.user_id = u.id
    WHERE u.role = 'va'
    GROUP BY u.id ORDER BY u.name
  `).all();
  res.json({ overview: rows });
});

// Admin: send a nudge email to a VA who hasn't finished onboarding
router.post('/remind/:userId', requireAdmin, async (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const rows = db.prepare(`
    SELECT COUNT(*) AS total, SUM(completed) AS completed FROM onboarding_progress WHERE user_id = ?
  `).get(req.params.userId);
  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const result = await sendOnboardingReminderEmail({
    to: user.email, name: user.name, completed: rows.completed || 0, total: rows.total || 0, loginUrl,
  });
  res.json({ ok: true, sent: !result.skipped && !result.error });
});

module.exports = router;

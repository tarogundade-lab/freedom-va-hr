const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  if (req.user.role === 'admin') {
    const clients = db.prepare('SELECT * FROM clients ORDER BY name').all();
    return res.json({ clients });
  }
  // VAs only see clients they're assigned to
  const clients = db.prepare(`
    SELECT c.* FROM clients c
    JOIN assignments a ON a.client_id = c.id
    WHERE a.va_user_id = ? AND a.status = 'active'
    ORDER BY c.name
  `).all(req.user.id);
  res.json({ clients });
});

router.get('/:id', requireAdmin, (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const assignments = db.prepare(`
    SELECT a.*, u.name AS va_name, u.email AS va_email FROM assignments a
    JOIN users u ON u.id = a.va_user_id WHERE a.client_id = ? ORDER BY a.start_date DESC
  `).all(req.params.id);
  res.json({ client, assignments });
});

router.post('/', requireAdmin, (req, res) => {
  const { name, contact_name, contact_email, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Client name required' });
  const id = uuid();
  db.prepare(`INSERT INTO clients (id, name, contact_name, contact_email, notes) VALUES (?,?,?,?,?)`)
    .run(id, name, contact_name || null, contact_email || null, notes || null);
  res.status(201).json({ id });
});

router.patch('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Client not found' });
  const { name, contact_name, contact_email, notes, status } = req.body;
  db.prepare(`UPDATE clients SET name=?, contact_name=?, contact_email=?, notes=?, status=? WHERE id=?`)
    .run(name ?? existing.name, contact_name ?? existing.contact_name, contact_email ?? existing.contact_email,
         notes ?? existing.notes, status ?? existing.status, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Assignments — linking VAs to clients
router.get('/:id/assignments', requireAdmin, (req, res) => {
  const assignments = db.prepare(`
    SELECT a.*, u.name AS va_name FROM assignments a JOIN users u ON u.id = a.va_user_id
    WHERE a.client_id = ?`).all(req.params.id);
  res.json({ assignments });
});

router.post('/:id/assignments', requireAdmin, (req, res) => {
  const { va_user_id, role_title, hourly_rate, hours_per_week, start_date } = req.body;
  if (!va_user_id) return res.status(400).json({ error: 'va_user_id required' });
  const id = uuid();
  db.prepare(`INSERT INTO assignments (id, va_user_id, client_id, role_title, hourly_rate, hours_per_week, start_date) VALUES (?,?,?,?,?,?,?)`)
    .run(id, va_user_id, req.params.id, role_title || null, hourly_rate || null, hours_per_week || null, start_date || new Date().toISOString().slice(0,10));
  res.status(201).json({ id });
});

router.patch('/assignments/:assignmentId', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.assignmentId);
  if (!existing) return res.status(404).json({ error: 'Assignment not found' });
  const { role_title, hourly_rate, hours_per_week, end_date, status } = req.body;
  db.prepare(`UPDATE assignments SET role_title=?, hourly_rate=?, hours_per_week=?, end_date=?, status=? WHERE id=?`)
    .run(role_title ?? existing.role_title, hourly_rate ?? existing.hourly_rate, hours_per_week ?? existing.hours_per_week,
         end_date ?? existing.end_date, status ?? existing.status, req.params.assignmentId);
  res.json({ ok: true });
});

module.exports = router;

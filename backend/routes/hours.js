const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// List hours: admin sees all (optionally filtered by va_user_id/client_id), VA sees only their own
router.get('/', (req, res) => {
  const { va_user_id, client_id, from, to } = req.query;
  let sql = `SELECT h.*, u.name AS va_name, c.name AS client_name FROM hours_logs h
    JOIN users u ON u.id = h.va_user_id LEFT JOIN clients c ON c.id = h.client_id WHERE 1=1`;
  const params = [];
  if (req.user.role !== 'admin') {
    sql += ' AND h.va_user_id = ?';
    params.push(req.user.id);
  } else if (va_user_id) {
    sql += ' AND h.va_user_id = ?';
    params.push(va_user_id);
  }
  if (client_id) { sql += ' AND h.client_id = ?'; params.push(client_id); }
  if (from) { sql += ' AND h.log_date >= ?'; params.push(from); }
  if (to) { sql += ' AND h.log_date <= ?'; params.push(to); }
  sql += ' ORDER BY h.log_date DESC';
  const logs = db.prepare(sql).all(...params);
  const total_hours = logs.reduce((sum, l) => sum + l.hours, 0);
  res.json({ logs, total_hours });
});

router.post('/', (req, res) => {
  const { client_id, log_date, hours, description, va_user_id } = req.body;
  if (!log_date || !hours) return res.status(400).json({ error: 'log_date and hours are required' });
  const targetVa = req.user.role === 'admin' && va_user_id ? va_user_id : req.user.id;
  const id = uuid();
  db.prepare(`INSERT INTO hours_logs (id, va_user_id, client_id, log_date, hours, description) VALUES (?,?,?,?,?,?)`)
    .run(id, targetVa, client_id || null, log_date, hours, description || null);
  res.status(201).json({ id });
});

router.patch('/:id', (req, res) => {
  const log = db.prepare('SELECT * FROM hours_logs WHERE id = ?').get(req.params.id);
  if (!log) return res.status(404).json({ error: 'Log not found' });
  if (req.user.role !== 'admin' && log.va_user_id !== req.user.id) return res.status(403).json({ error: 'Not allowed' });

  const { client_id, log_date, hours, description, approved } = req.body;
  const isAdmin = req.user.role === 'admin';
  db.prepare(`UPDATE hours_logs SET client_id=?, log_date=?, hours=?, description=?, approved=? WHERE id=?`)
    .run(client_id ?? log.client_id, log_date ?? log.log_date, hours ?? log.hours,
         description ?? log.description, isAdmin && approved !== undefined ? (approved ? 1 : 0) : log.approved,
         req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const log = db.prepare('SELECT * FROM hours_logs WHERE id = ?').get(req.params.id);
  if (!log) return res.status(404).json({ error: 'Log not found' });
  if (req.user.role !== 'admin' && log.va_user_id !== req.user.id) return res.status(403).json({ error: 'Not allowed' });
  db.prepare('DELETE FROM hours_logs WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Admin: CSV export of hours, filterable by date range — for payroll
router.get('/export.csv', requireAdmin, (req, res) => {
  const { from, to, approved_only } = req.query;
  let sql = `SELECT h.log_date, u.name AS va_name, u.email AS va_email, c.name AS client_name,
    h.hours, h.description, h.approved FROM hours_logs h
    JOIN users u ON u.id = h.va_user_id LEFT JOIN clients c ON c.id = h.client_id WHERE 1=1`;
  const params = [];
  if (from) { sql += ' AND h.log_date >= ?'; params.push(from); }
  if (to) { sql += ' AND h.log_date <= ?'; params.push(to); }
  if (approved_only === 'true') { sql += ' AND h.approved = 1'; }
  sql += ' ORDER BY h.log_date ASC, u.name ASC';
  const rows = db.prepare(sql).all(...params);

  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['Date', 'VA Name', 'VA Email', 'Client', 'Hours', 'Description', 'Approved'];
  const lines = [header.join(',')];
  rows.forEach((r) => {
    lines.push([
      r.log_date, r.va_name, r.va_email, r.client_name || '', r.hours, r.description || '', r.approved ? 'Yes' : 'No',
    ].map(escape).join(','));
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="hours-export-${new Date().toISOString().slice(0,10)}.csv"`);
  res.send(lines.join('\n'));
});

// Admin summary: total hours per VA, useful for payroll snapshots
router.get('/summary/by-va', requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT u.id AS va_user_id, u.name, u.email,
      COALESCE(SUM(h.hours), 0) AS total_hours,
      COALESCE(SUM(CASE WHEN h.approved = 1 THEN h.hours ELSE 0 END), 0) AS approved_hours
    FROM users u LEFT JOIN hours_logs h ON h.va_user_id = u.id
    WHERE u.role = 'va'
    GROUP BY u.id ORDER BY u.name
  `).all();
  res.json({ summary: rows });
});

module.exports = router;

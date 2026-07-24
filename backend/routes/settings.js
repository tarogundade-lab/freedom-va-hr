const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const EDITABLE_KEYS = ['org_name', 'contact_email'];

router.get('/', requireAuth, requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  res.json({ settings });
});

router.patch('/', requireAuth, requireAdmin, (req, res) => {
  const update = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  EDITABLE_KEYS.forEach((key) => {
    if (req.body[key] !== undefined) update.run(key, req.body[key]);
  });
  res.json({ ok: true });
});

module.exports = router;

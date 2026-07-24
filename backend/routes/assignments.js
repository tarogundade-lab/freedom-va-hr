const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Full roster: every VA <-> client assignment. Admin only.
router.get('/', requireAdmin, (req, res) => {
  const assignments = db.prepare(`
    SELECT a.*, u.name AS va_name, u.email AS va_email, c.name AS client_name
    FROM assignments a
    JOIN users u ON u.id = a.va_user_id
    JOIN clients c ON c.id = a.client_id
    ORDER BY a.status ASC, a.start_date DESC
  `).all();
  res.json({ assignments });
});

// A given VA's own assignments (self, or admin viewing anyone via ?va_user_id=)
router.get('/mine', (req, res) => {
  const targetVa = req.user.role === 'admin' && req.query.va_user_id ? req.query.va_user_id : req.user.id;
  const assignments = db.prepare(`
    SELECT a.*, c.name AS client_name FROM assignments a
    JOIN clients c ON c.id = a.client_id WHERE a.va_user_id = ? ORDER BY a.status ASC, a.start_date DESC
  `).all(targetVa);
  res.json({ assignments });
});

module.exports = router;

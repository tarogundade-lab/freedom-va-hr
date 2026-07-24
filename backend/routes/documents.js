const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB, generous for certificates/IDs as PDFs or images
const CATEGORIES = ['certification', 'agreement', 'id_verification', 'other'];

// List documents: admin can view anyone's via ?user_id=, VAs only their own.
router.get('/', (req, res) => {
  const targetUserId = req.user.role === 'admin' && req.query.user_id ? req.query.user_id : req.user.id;
  const docs = db.prepare(`
    SELECT id, user_id, title, category, file_name, mime_type, created_at,
      LENGTH(file_data) AS approx_size
    FROM documents WHERE user_id = ? ORDER BY created_at DESC
  `).all(targetUserId);
  res.json({ documents: docs });
});

// Download a single document (returns the base64 payload for the client to decode)
router.get('/:id', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (req.user.role !== 'admin' && doc.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Not allowed' });
  }
  res.json({ document: doc });
});

// Upload a document. VAs upload their own; admins can upload on behalf of a VA via user_id.
router.post('/', (req, res) => {
  const { title, category, file_name, mime_type, file_data, user_id } = req.body;
  if (!title || !file_name || !mime_type || !file_data) {
    return res.status(400).json({ error: 'title, file_name, mime_type and file_data are required' });
  }
  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }
  // Rough size check on the base64 string (base64 is ~1.37x the original size)
  if (file_data.length > MAX_FILE_BYTES * 1.4) {
    return res.status(413).json({ error: 'File is too large (max 8MB)' });
  }
  const targetUserId = req.user.role === 'admin' && user_id ? user_id : req.user.id;
  const id = uuid();
  db.prepare(`
    INSERT INTO documents (id, user_id, title, category, file_name, mime_type, file_data, uploaded_by)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(id, targetUserId, title, category, file_name, mime_type, file_data, req.user.id);
  res.status(201).json({ id });
});

router.delete('/:id', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (req.user.role !== 'admin' && doc.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Not allowed' });
  }
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Admin overview: document counts per VA, handy for spotting who's missing certifications
router.get('/overview/all', requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT u.id AS user_id, u.name, u.email, COUNT(d.id) AS document_count
    FROM users u LEFT JOIN documents d ON d.user_id = u.id
    WHERE u.role = 'va'
    GROUP BY u.id ORDER BY u.name
  `).all();
  res.json({ overview: rows });
});

module.exports = router;

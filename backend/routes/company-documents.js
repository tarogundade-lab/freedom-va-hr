const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB, generous for policy manuals etc.

// Anyone logged in can see what's available (VAs need to read these too)
router.get('/', (req, res) => {
  const docs = db.prepare(`
    SELECT id, title, file_name, mime_type, created_at, LENGTH(file_data) AS approx_size
    FROM company_documents ORDER BY created_at DESC
  `).all();
  res.json({ documents: docs });
});

router.get('/:id', (req, res) => {
  const doc = db.prepare('SELECT * FROM company_documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json({ document: doc });
});

router.post('/', requireAdmin, (req, res) => {
  const { title, file_name, mime_type, file_data } = req.body;
  if (!title || !file_name || !mime_type || !file_data) {
    return res.status(400).json({ error: 'title, file_name, mime_type and file_data are required' });
  }
  if (file_data.length > MAX_FILE_BYTES * 1.4) {
    return res.status(413).json({ error: 'File is too large (max 15MB)' });
  }
  const id = uuid();
  db.prepare(`INSERT INTO company_documents (id, title, file_name, mime_type, file_data, uploaded_by) VALUES (?,?,?,?,?,?)`)
    .run(id, title, file_name, mime_type, file_data, req.user.id);
  res.status(201).json({ id });
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM company_documents WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;

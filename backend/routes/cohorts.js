const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get('/', (req, res) => {
  const cohorts = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM applicants a WHERE a.cohort_id = c.id) AS applicant_count,
      (SELECT COUNT(*) FROM applicants a WHERE a.cohort_id = c.id AND a.stage='hired') AS hired_count
    FROM cohorts c ORDER BY c.start_date DESC
  `).all();
  res.json({ cohorts });
});

router.get('/:id', (req, res) => {
  const cohort = db.prepare('SELECT * FROM cohorts WHERE id = ?').get(req.params.id);
  if (!cohort) return res.status(404).json({ error: 'Cohort not found' });
  const applicants = db.prepare('SELECT * FROM applicants WHERE cohort_id = ? ORDER BY name').all(req.params.id);
  res.json({ cohort, applicants });
});

router.post('/', (req, res) => {
  const { name, start_date, end_date, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const id = uuid();
  db.prepare(`INSERT INTO cohorts (id, name, start_date, end_date, notes) VALUES (?,?,?,?,?)`)
    .run(id, name, start_date || null, end_date || null, notes || null);
  res.status(201).json({ id });
});

router.patch('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM cohorts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Cohort not found' });
  const { name, start_date, end_date, status, notes } = req.body;
  db.prepare(`UPDATE cohorts SET name=?, start_date=?, end_date=?, status=?, notes=? WHERE id=?`)
    .run(name ?? existing.name, start_date ?? existing.start_date, end_date ?? existing.end_date,
         status ?? existing.status, notes ?? existing.notes, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM cohorts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;

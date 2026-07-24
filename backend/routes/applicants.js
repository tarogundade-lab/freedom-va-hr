const express = require('express');
const { v4: uuid } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { sendHiredEmail } = require('../email');

const router = express.Router();
const STAGES = ['applied', 'screening', 'interview', 'training', 'hired', 'not_hired'];

router.use(requireAuth, requireAdmin);

router.get('/', (req, res) => {
  const { cohort_id, stage } = req.query;
  let sql = `SELECT a.*, c.name AS cohort_name FROM applicants a LEFT JOIN cohorts c ON c.id = a.cohort_id WHERE 1=1`;
  const params = [];
  if (cohort_id) { sql += ' AND a.cohort_id = ?'; params.push(cohort_id); }
  if (stage) { sql += ' AND a.stage = ?'; params.push(stage); }
  sql += ' ORDER BY a.applied_at DESC';
  const applicants = db.prepare(sql).all(...params);
  res.json({ applicants, stages: STAGES });
});

router.get('/:id', (req, res) => {
  const applicant = db.prepare('SELECT * FROM applicants WHERE id = ?').get(req.params.id);
  if (!applicant) return res.status(404).json({ error: 'Applicant not found' });
  const activity = db.prepare('SELECT * FROM applicant_activity WHERE applicant_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ applicant, activity });
});

router.post('/', (req, res) => {
  const { name, email, phone, source, cohort_id, notes } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });
  const id = uuid();
  db.prepare(`INSERT INTO applicants (id, name, email, phone, source, cohort_id, notes) VALUES (?,?,?,?,?,?,?)`)
    .run(id, name, email, phone || null, source || null, cohort_id || null, notes || null);
  db.prepare(`INSERT INTO applicant_activity (id, applicant_id, note, to_stage) VALUES (?,?,?,?)`)
    .run(uuid(), id, 'Applicant added to pipeline', 'applied');
  res.status(201).json({ id });
});

router.patch('/:id', (req, res) => {
  const { name, email, phone, source, cohort_id, notes } = req.body;
  const existing = db.prepare('SELECT * FROM applicants WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Applicant not found' });
  db.prepare(`UPDATE applicants SET name=?, email=?, phone=?, source=?, cohort_id=?, notes=?, updated_at=datetime('now') WHERE id=?`)
    .run(name ?? existing.name, email ?? existing.email, phone ?? existing.phone, source ?? existing.source,
         cohort_id ?? existing.cohort_id, notes ?? existing.notes, req.params.id);
  res.json({ ok: true });
});

// Move an applicant to a new stage. If moved to "hired", optionally create their user login.
router.post('/:id/stage', (req, res) => {
  const { stage, note, create_account, password } = req.body;
  if (!STAGES.includes(stage)) return res.status(400).json({ error: 'Invalid stage' });
  const applicant = db.prepare('SELECT * FROM applicants WHERE id = ?').get(req.params.id);
  if (!applicant) return res.status(404).json({ error: 'Applicant not found' });

  db.prepare(`UPDATE applicants SET stage=?, updated_at=datetime('now') WHERE id=?`).run(stage, req.params.id);
  db.prepare(`INSERT INTO applicant_activity (id, applicant_id, note, from_stage, to_stage) VALUES (?,?,?,?,?)`)
    .run(uuid(), req.params.id, note || `Moved to ${stage}`, applicant.stage, stage);

  let createdUserId = null;
  if (stage === 'hired' && create_account && !applicant.linked_user_id) {
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(applicant.email.toLowerCase());
    if (!existingUser) {
      createdUserId = uuid();
      const hash = bcrypt.hashSync(password || 'FreedomVA123!', 10);
      db.prepare(`INSERT INTO users (id, name, email, password_hash, role, phone, cohort_id) VALUES (?,?,?,?,?,?,?)`)
        .run(createdUserId, applicant.name, applicant.email.toLowerCase(), hash, 'va', applicant.phone, applicant.cohort_id);
      db.prepare('UPDATE applicants SET linked_user_id = ? WHERE id = ?').run(createdUserId, req.params.id);
      const templates = db.prepare('SELECT id FROM onboarding_templates').all();
      const insert = db.prepare('INSERT INTO onboarding_progress (id, user_id, template_id) VALUES (?,?,?)');
      templates.forEach(t => insert.run(uuid(), createdUserId, t.id));
    } else {
      createdUserId = existingUser.id;
      db.prepare('UPDATE applicants SET linked_user_id = ? WHERE id = ?').run(existingUser.id, req.params.id);
    }
  }

  if (createdUserId) {
    const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    sendHiredEmail({ to: applicant.email.toLowerCase(), name: applicant.name, loginUrl });
  }

  res.json({ ok: true, created_user_id: createdUserId });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM applicants WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Bulk import applicants (e.g. from a CSV of training sign-ups).
// Expects { rows: [{ name, email, phone, source, cohort }] }.
// Cohort is matched by name (case-insensitive); unmatched names are left unassigned.
router.post('/bulk-import', (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'rows must be a non-empty array' });
  }
  if (rows.length > 1000) {
    return res.status(400).json({ error: 'Max 1000 rows per import' });
  }

  const cohorts = db.prepare('SELECT id, name FROM cohorts').all();
  const cohortByName = new Map(cohorts.map((c) => [c.name.trim().toLowerCase(), c.id]));

  const insertApplicant = db.prepare(`INSERT INTO applicants (id, name, email, phone, source, cohort_id, notes) VALUES (?,?,?,?,?,?,?)`);
  const insertActivity = db.prepare(`INSERT INTO applicant_activity (id, applicant_id, note, to_stage) VALUES (?,?,?,?)`);

  let created = 0;
  const errors = [];
  const unmatchedCohorts = new Set();

  const importTx = db.transaction(() => {
    rows.forEach((row, i) => {
      const name = (row.name || '').trim();
      const email = (row.email || '').trim();
      if (!name || !email) {
        errors.push({ row: i + 1, reason: 'Missing name or email' });
        return;
      }
      let cohortId = null;
      if (row.cohort && row.cohort.trim()) {
        const match = cohortByName.get(row.cohort.trim().toLowerCase());
        if (match) cohortId = match;
        else unmatchedCohorts.add(row.cohort.trim());
      }
      const id = uuid();
      insertApplicant.run(id, name, email, row.phone || null, row.source || 'Bulk import', cohortId, null);
      insertActivity.run(uuid(), id, 'Imported via bulk upload', 'applied');
      created += 1;
    });
  });
  importTx();

  res.status(201).json({
    created,
    skipped: errors.length,
    errors,
    unmatched_cohorts: Array.from(unmatchedCohorts),
  });
});

module.exports = router;

const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireAdmin);

// Full question bank, including correct answers (admin management view)
router.get('/questions', (req, res) => {
  const rows = db.prepare('SELECT * FROM assessment_questions ORDER BY sort_order').all();
  res.json({ questions: rows.map(r => ({ ...r, options: JSON.parse(r.options) })) });
});

router.post('/questions', (req, res) => {
  const { question, options, correct_index, category } = req.body;
  if (!question || !Array.isArray(options) || options.length < 2 || correct_index === undefined) {
    return res.status(400).json({ error: 'question, options (array), and correct_index are required' });
  }
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM assessment_questions').get().m;
  const id = uuid();
  db.prepare('INSERT INTO assessment_questions (id, question, options, correct_index, category, sort_order) VALUES (?,?,?,?,?,?)')
    .run(id, question, JSON.stringify(options), correct_index, category || null, maxOrder + 1);
  res.status(201).json({ id });
});

router.patch('/questions/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM assessment_questions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Question not found' });
  const { question, options, correct_index, category } = req.body;
  db.prepare('UPDATE assessment_questions SET question=?, options=?, correct_index=?, category=? WHERE id=?').run(
    question ?? existing.question,
    options ? JSON.stringify(options) : existing.options,
    correct_index !== undefined ? correct_index : existing.correct_index,
    category !== undefined ? category : existing.category,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete('/questions/:id', (req, res) => {
  db.prepare('DELETE FROM assessment_questions WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Attempt results — for reviewing candidates
router.get('/attempts', (req, res) => {
  const rows = db.prepare(`
    SELECT a.*, ap.id AS matched_applicant_id, ap.stage AS applicant_stage
    FROM assessment_attempts a
    LEFT JOIN applicants ap ON ap.id = a.applicant_id
    ORDER BY a.created_at DESC
  `).all();
  res.json({ attempts: rows });
});

// Full detail of one attempt, including which answers were right/wrong — admin only
router.get('/attempts/:id', (req, res) => {
  const attempt = db.prepare('SELECT * FROM assessment_attempts WHERE id = ?').get(req.params.id);
  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
  const answers = JSON.parse(attempt.answers || '{}');
  const questions = db.prepare('SELECT * FROM assessment_questions').all();
  const breakdown = questions
    .filter(q => answers[q.id] !== undefined)
    .map(q => ({
      question: q.question,
      options: JSON.parse(q.options),
      correct_index: q.correct_index,
      selected_index: answers[q.id],
      was_correct: answers[q.id] === q.correct_index,
    }));
  res.json({ attempt, breakdown });
});

module.exports = router;

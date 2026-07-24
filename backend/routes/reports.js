const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireAdmin);

// Cohort -> hire conversion, ordered chronologically by when the cohort was created
router.get('/cohort-conversion', (req, res) => {
  const rows = db.prepare(`
    SELECT c.id, c.name, c.created_at, c.status,
      COUNT(a.id) AS applicant_count,
      SUM(CASE WHEN a.stage = 'hired' THEN 1 ELSE 0 END) AS hired_count,
      SUM(CASE WHEN a.stage = 'not_hired' THEN 1 ELSE 0 END) AS not_hired_count
    FROM cohorts c LEFT JOIN applicants a ON a.cohort_id = c.id
    GROUP BY c.id ORDER BY c.created_at ASC
  `).all();
  const withRate = rows.map((r) => ({
    ...r,
    conversion_rate: r.applicant_count > 0 ? Math.round((r.hired_count / r.applicant_count) * 100) : 0,
  }));
  res.json({ cohorts: withRate });
});

// Recruitment funnel: how many applicants are currently at each stage
router.get('/pipeline-funnel', (req, res) => {
  const rows = db.prepare(`SELECT stage, COUNT(*) AS count FROM applicants GROUP BY stage`).all();
  res.json({ funnel: rows });
});

// Hiring pace: hires per month, useful for spotting trends over time
router.get('/hiring-trend', (req, res) => {
  const rows = db.prepare(`
    SELECT strftime('%Y-%m', updated_at) AS month, COUNT(*) AS hires
    FROM applicants WHERE stage = 'hired'
    GROUP BY month ORDER BY month ASC
  `).all();
  res.json({ trend: rows });
});

module.exports = router;

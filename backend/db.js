const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'freedom_va.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','va')) DEFAULT 'va',
  status TEXT NOT NULL CHECK (status IN ('active','inactive')) DEFAULT 'active',
  phone TEXT,
  cohort_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cohorts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL CHECK (status IN ('upcoming','active','completed')) DEFAULT 'upcoming',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS applicants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  source TEXT,
  cohort_id TEXT REFERENCES cohorts(id) ON DELETE SET NULL,
  stage TEXT NOT NULL CHECK (stage IN ('applied','screening','interview','training','hired','not_hired')) DEFAULT 'applied',
  notes TEXT,
  linked_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS applicant_activity (
  id TEXT PRIMARY KEY,
  applicant_id TEXT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  from_stage TEXT,
  to_stage TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cohort_enrollments (
  id TEXT PRIMARY KEY,
  cohort_id TEXT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  applicant_id TEXT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  attendance_pct INTEGER DEFAULT 0,
  progress_notes TEXT,
  completed INTEGER DEFAULT 0,
  UNIQUE(cohort_id, applicant_id)
);

CREATE TABLE IF NOT EXISTS onboarding_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES onboarding_templates(id) ON DELETE CASCADE,
  completed INTEGER DEFAULT 0,
  completed_at TEXT,
  UNIQUE(user_id, template_id)
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('active','inactive')) DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  va_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  role_title TEXT,
  hourly_rate REAL,
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL CHECK (status IN ('active','ended')) DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS assessment_questions (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  options TEXT NOT NULL,
  correct_index INTEGER NOT NULL,
  category TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS assessment_attempts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  applicant_id TEXT REFERENCES applicants(id) ON DELETE SET NULL,
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  score_pct INTEGER NOT NULL,
  answers TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS company_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_data TEXT NOT NULL,
  uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('certification','agreement','id_verification','other')) DEFAULT 'certification',
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_data TEXT NOT NULL,
  uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hours_logs (
  id TEXT PRIMARY KEY,
  va_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  log_date TEXT NOT NULL,
  hours REAL NOT NULL,
  description TEXT,
  approved INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// Lightweight migrations: safe to run every startup, including against an
// already-deployed database that predates these columns. SQLite has no
// "ADD COLUMN IF NOT EXISTS" on older versions, so we just try/catch.
function tryAddColumn(sql) {
  try { db.exec(sql); } catch (err) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
}
tryAddColumn(`ALTER TABLE users ADD COLUMN skills TEXT DEFAULT '[]'`);
tryAddColumn(`ALTER TABLE users ADD COLUMN weekly_capacity_hours REAL`);
tryAddColumn(`ALTER TABLE users ADD COLUMN offboarded_at TEXT`);
tryAddColumn(`ALTER TABLE users ADD COLUMN offboard_reason TEXT`);
tryAddColumn(`ALTER TABLE assignments ADD COLUMN hours_per_week REAL`);

// Default org branding, only inserted if not already present
db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('org_name', 'My Freedom VA')`).run();
db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('contact_email', '')`).run();

const defaultOnboardingInfo = `Work Schedule & Expectations

* Hours: Monday to Friday, between 8:00 AM and 6:00 PM CST (40 hours per week)
* Camera Requirement: Please keep your camera on during working hours (recording not required) with proper lighting and a stable power supply.
* Pay: $2 per hour
* Probation: 90 days. Your hourly rate will be reviewed upon successful completion and performance evaluation.
* Payment: Monthly, on the 10th, via Fidelity Bank USD account.

Access & Credentials

* Insightful Access: This is our time-tracking software. Please email our manager, Alicia Bradford, from your personal email to request setup and access. Kindly complete this setup as soon as possible.
* Company Email: You will receive your official email address. Please monitor your inbox and set it up promptly once received.
* You will also receive access to the various tools and software you need to complete your tasks.

Bank Account Setup

If you do not have a Fidelity Bank USD account, our account officer, Chioma Ojukwu, can assist you during Nigerian business hours.

Contact Information:
* Email: chioma.ojukwu@fidelitybank.ng
* Phone: +234-813-869-0829

Once your account is open (or if you already have one), please forward your account details to Alicia Bradford.

For any questions or guidance, please contact your manager directly.

We look forward to your contributions and are confident you will be a valuable addition to the team. Welcome aboard!`;

db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('onboarding_info', ?)`).run(defaultOnboardingInfo);

// Seed the company policy manual as a shared, admin-uploaded reference document,
// visible to every VA from their Onboarding page. Only inserted once — if an
// admin later replaces or deletes it, this won't re-add it on the next deploy.
{
  const fs = require('fs');
  const title = 'Policy, Procedures & Operations Manual';
  const alreadyExists = db.prepare('SELECT id FROM company_documents WHERE title = ?').get(title);
  const manualPath = path.join(__dirname, 'assets', 'policy-manual.pdf');
  if (!alreadyExists && fs.existsSync(manualPath)) {
    const { randomUUID } = require('crypto');
    const fileData = fs.readFileSync(manualPath).toString('base64');
    db.prepare(`INSERT INTO company_documents (id, title, file_name, mime_type, file_data) VALUES (?,?,?,?,?)`)
      .run(randomUUID(), title, 'MY_FREEDOM_LLC_Policy_Manual.pdf', 'application/pdf', fileData);
  }
}

// Default onboarding checklist items. Checked one by one by title (not by
// table-emptiness) so this works correctly both for a brand-new install and
// for an existing database that already has some items — either way, only
// the titles that are missing get added, and nothing is ever duplicated.
const defaultChecklistItems = [
  'Sign VA agreement / contract',
  'Complete tax / payment info (bank or PayPal)',
  'Set up company email & Slack access',
  'Review company policies & code of conduct',
  'Complete platform & tools walkthrough (time tracker, project boards)',
  'Introductory call with assigned mentor/lead',
  'First client brief / shadowing session',
  'Profile added to client-matching roster',
  'Email Alicia Bradford to request Insightful (time-tracking) access',
  'Confirm your company email is set up and being monitored',
  'Set up (or confirm) your Fidelity Bank USD account',
  'Send your bank account details to Alicia Bradford',
  'Review your work schedule, pay rate, and probation terms',
  'Read and acknowledge the Policy, Procedures & Operations Manual',
];
{
  const existingTitles = new Set(db.prepare('SELECT title FROM onboarding_templates').all().map(r => r.title));
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM onboarding_templates').get().m;
  const insertTemplate = db.prepare('INSERT INTO onboarding_templates (id, title, sort_order) VALUES (?,?,?)');
  const { randomUUID } = require('crypto');
  let nextOrder = maxOrder + 1;
  const newlyAddedTemplateIds = [];
  defaultChecklistItems.forEach((title) => {
    if (!existingTitles.has(title)) {
      const id = randomUUID();
      insertTemplate.run(id, title, nextOrder++);
      newlyAddedTemplateIds.push(id);
    }
  });

  // Backfill: any VA hired before these items existed should still see them
  // on their checklist, not just VAs hired from now on.
  if (newlyAddedTemplateIds.length > 0) {
    const vaIds = db.prepare(`SELECT id FROM users WHERE role = 'va'`).all().map(r => r.id);
    const insertProgress = db.prepare('INSERT INTO onboarding_progress (id, user_id, template_id) VALUES (?,?,?)');
    vaIds.forEach((userId) => {
      newlyAddedTemplateIds.forEach((templateId) => {
        insertProgress.run(randomUUID(), userId, templateId);
      });
    });
  }
}

// Seed a default skills/aptitude assessment question bank. Checked by
// question text (not table emptiness) so it's safe to extend later without
// duplicating on redeploy.
{
  const defaultQuestions = [
    { q: 'Which sentence is grammatically correct?', opts: ['Neither of the reports are ready yet.', 'Neither of the reports is ready yet.', 'Neither of the reports were ready yet.', 'Neither of the reports being ready yet.'], correct: 1, cat: 'Grammar' },
    { q: 'Select the sentence with no error.', opts: ['Each of the employees have submitted their timesheet.', 'Each of the employees has submitted their timesheet.', 'Each of the employee have submitted their timesheet.', 'Each of the employees has submit their timesheet.'], correct: 1, cat: 'Grammar' },
    { q: 'A client\'s invoice totals $1,240. They are given a 15% early-payment discount. What is the final amount due?', opts: ['$1,054.00', '$1,046.00', '$1,116.00', '$1,000.00'], correct: 0, cat: 'Numerical' },
    { q: 'A task takes 45 minutes. If you start at 2:20 PM and are interrupted for 10 minutes partway through, at what time will you finish?', opts: ['3:05 PM', '3:15 PM', '2:55 PM', '3:10 PM'], correct: 1, cat: 'Numerical' },
    { q: 'What number comes next in the sequence? 3, 6, 11, 18, 27, __', opts: ['36', '38', '37', '34'], correct: 1, cat: 'Logic' },
    { q: 'Book is to Library as Painting is to:', opts: ['Artist', 'Gallery', 'Frame', 'Canvas'], correct: 1, cat: 'Logic' },
    { q: 'Two client records show the same name but different account numbers: "ACC-10234" and "ACC-10243". What is the correct observation?', opts: ['They are duplicate entries and can be merged', 'The digits are transposed — these are likely different accounts and should be flagged, not merged', 'This is a formatting error only', 'The system will auto-correct this'], correct: 1, cat: 'Attention to Detail' },
    { q: 'You are asked to alphabetize these last names: Osei, O\'Brien, Obi, Oyelaran. Correct order?', opts: ["Obi, O'Brien, Osei, Oyelaran", "O'Brien, Obi, Osei, Oyelaran", "Osei, Obi, Oyelaran, O'Brien", "Oyelaran, Osei, Obi, O'Brien"], correct: 0, cat: 'Attention to Detail' },
    { q: 'A client emails you upset that a task is late, with several complaints in one message. What is the best first step?', opts: ['Reply defending why it was delayed before addressing anything else', 'Acknowledge their frustration, confirm you understand the concern, and give a clear next step or timeline', 'Forward the email to your manager without responding', 'Wait until the task is fully done before replying'], correct: 1, cat: 'Judgment' },
    { q: 'You realize you made an error in a report you already sent to a client. What should you do?', opts: ['Say nothing since it was a small error', 'Wait to see if the client notices', 'Notify them promptly, explain the correction, and send an updated version', 'Send the correction only if directly asked'], correct: 2, cat: 'Judgment' },
    { q: 'In a professional email, what does "cc" mean?', opts: ['Confirm and close', 'Carbon copy — a visible additional recipient', 'Confidential copy', 'Client contact'], correct: 1, cat: 'Office Knowledge' },
    { q: 'In a spreadsheet, which function would you use to add up a range of numbers?', opts: ['=TOTAL()', '=ADD()', '=SUM()', '=COUNT()'], correct: 2, cat: 'Office Knowledge' },
    { q: 'A manager asks you to prioritize four tasks: (1) a client report due in 1 hour, (2) an internal meeting note due tomorrow, (3) an urgent client email needing a same-day reply, (4) filing that has no deadline. What is the best order?', opts: ['4, 3, 2, 1', '1, 3, 2, 4', '3, 1, 2, 4', '2, 1, 3, 4'], correct: 1, cat: 'Judgment' },
    { q: 'Read: "The quarterly report is due by end of day Friday, but the data source will not be updated until Thursday evening." What is the most reasonable plan?', opts: ['Submit the report Wednesday using old data to be early', 'Start the report structure early, then finalize the numbers Thursday night or Friday morning', 'Wait until Friday afternoon to start entirely', 'Ask for the deadline to be moved regardless of the data timing'], correct: 1, cat: 'Reading Comprehension' },
    { q: 'A client is in EST and you are in WAT (West Africa Time, UTC+1), which is 5 hours ahead of EST. If the client wants a call at 9:00 AM their time, what time is that for you?', opts: ['2:00 PM', '4:00 AM', '9:00 AM', '1:00 PM'], correct: 0, cat: 'Numerical' },
  ];
  const existingQ = new Set(db.prepare('SELECT question FROM assessment_questions').all().map(r => r.question));
  const maxQOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM assessment_questions').get().m;
  const insertQuestion = db.prepare('INSERT INTO assessment_questions (id, question, options, correct_index, category, sort_order) VALUES (?,?,?,?,?,?)');
  const { randomUUID: uuidForQ } = require('crypto');
  let qOrder = maxQOrder + 1;
  defaultQuestions.forEach((item) => {
    if (!existingQ.has(item.q)) {
      insertQuestion.run(uuidForQ(), item.q, JSON.stringify(item.opts), item.correct, item.cat, qOrder++);
    }
  });
}

module.exports = db;

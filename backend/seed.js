require('dotenv').config();
const { v4: uuid } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('./db');

function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@freedomva.com').toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    return;
  }
  const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'ChangeMe123!', 10);
  db.prepare(`INSERT INTO users (id, name, email, password_hash, role, status) VALUES (?,?,?,?,'admin','active')`)
    .run(uuid(), process.env.ADMIN_NAME || 'Admin', email, hash);
  console.log(`Created admin: ${email} / ${process.env.ADMIN_PASSWORD || 'ChangeMe123!'}`);
}

function seedOnboardingTemplate() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM onboarding_templates').get().c;
  if (count > 0) return;
  const defaults = [
    'Sign VA agreement / contract',
    'Complete tax / payment info (bank or PayPal)',
    'Set up company email & Slack access',
    'Review Freedom VA policies & code of conduct',
    'Complete platform & tools walkthrough (time tracker, project boards)',
    'Introductory call with assigned mentor/lead',
    'First client brief / shadowing session',
    'Profile added to client-matching roster',
  ];
  const insert = db.prepare('INSERT INTO onboarding_templates (id, title, sort_order) VALUES (?,?,?)');
  defaults.forEach((title, i) => insert.run(uuid(), title, i));
  console.log(`Seeded ${defaults.length} onboarding checklist items`);
}

seedAdmin();
seedOnboardingTemplate();
console.log('Seed complete.');

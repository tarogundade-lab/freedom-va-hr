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

seedAdmin();
console.log('Seed complete.');

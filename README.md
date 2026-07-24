# Freedom VA — HR Platform

An internal admin tool for running Freedom VA's training cohorts, recruitment pipeline, onboarding, hours tracking and client assignments — all in one place.

Built as a full-stack project so it can be deployed properly (not just a chat demo):

- **Backend:** Node.js + Express + SQLite (`better-sqlite3`), JWT auth
- **Frontend:** React + Vite + Tailwind CSS

## What's included

| Module | What it does |
|---|---|
| **Recruitment** | Kanban-style pipeline: Applied → Screening → Interview → In Training → Hired / Not Hired. Hiring an applicant can auto-create their VA login. |
| **Training Cohorts** | Create a cohort per training round, see who's enrolled and how many were hired from it. Just name + notes — mark a cohort "Start Training" or "Mark Finished" with one click, no dates to manage. |
| **Recruitment (bulk import)** | Add applicants one at a time, or import a CSV in bulk (columns: `name, email, phone, source, cohort`) — handy for bringing in a whole training sign-up sheet at once. |
| **Skills Assessment** | A public link (`/assessment`) for candidates to take a 15-question skills & aptitude test — grammar, numerical reasoning, attention to detail, and workplace judgment. Score shown immediately after submitting; specific wrong answers are never revealed to the candidate. Attempts auto-link to a matching applicant by email and show up right in their Recruitment card. Admins manage the question bank and review full right/wrong breakdowns from the Assessment page. |
| **Onboarding** | A checklist template auto-assigned to every new hire, plus a "Welcome Packet" reference doc (work schedule, pay, probation terms, access instructions) and shared **Company Documents** (like your Policy Manual) shown to every VA on their onboarding page. Admins see completion % per VA; VAs check off their own steps. |
| **Clients** | Track external clients and which VAs are assigned to each, with role + hourly rate. |
| **Hours** | VAs log hours per client/date; admins review and approve, and see totals per VA. Admins can export a payroll-ready CSV. |
| **Documents** | Each VA can upload certifications, signed agreements, and ID verification (PDF/image/doc, up to 8MB). Admins can view or upload on behalf of a VA. Lives inside the Onboarding page. |
| **Public Apply Form** | A no-login page at `/apply` for prospective trainees to submit themselves into your pipeline. Share the link from the Recruitment page ("Copy Apply Link"). |
| **Team** | Skills tags per VA (for matching to client needs) and weekly capacity tracking (booked hours vs. available hours, pulled from active client assignments). Also where you offboard a VA — records a reason, ends their active client assignments, and blocks their login, without deleting their history. |
| **Reports** | Cohort → hire conversion rate over time, current pipeline funnel, and hires-per-month. |
| **Settings** | Edit your company name and contact email — shown across the sidebar, login page, and public application form. |
| **View as Employee** | Admins can preview the app exactly as a specific VA sees it — their onboarding checklist, clients, and hours — from the sidebar. Useful for troubleshooting what someone's actually seeing. |
| **Email Notifications** | Sends a welcome email when someone's hired, and lets admins send a one-click onboarding reminder. Optional — the app works fine without it configured. |

Two roles: **admin** (you / your team, sees everything) and **va** (each trainee/hire, sees only their own onboarding, clients and hours).

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env       # then edit .env — especially JWT_SECRET and ADMIN_PASSWORD
npm run seed                # creates your first admin account + default onboarding checklist
npm start                   # runs on http://localhost:4000
```

Your first login will be whatever you set `ADMIN_EMAIL` / `ADMIN_PASSWORD` to in `.env` (defaults to `admin@freedomva.com` / `ChangeMe123!` — change this before going live).

The database is a single SQLite file (`backend/freedom_va.db`) — no external database server needed. It's created automatically on first run.

### Optional: turning on email

Hire notifications and onboarding reminders use [Resend](https://resend.com) (free tier: 3,000 emails/month). Without it configured, the app just skips sending — nothing breaks.

1. Sign up at resend.com and grab an API key.
2. Add to `backend/.env`:
   ```
   RESEND_API_KEY=re_your_key_here
   EMAIL_FROM=Freedom VA <onboarding@yourdomain.com>
   FRONTEND_URL=http://localhost:5173   # or your deployed frontend URL
   ```
   Note: Resend requires you verify a sending domain before you can use a custom `EMAIL_FROM` address — until then, use their default `onboarding@resend.dev` sender for testing.

## 2. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env        # points the frontend at your backend URL
npm run dev                 # runs on http://localhost:5173
```

Open `http://localhost:5173` and log in with your admin account.

## Everyday workflow

1. **Recruitment** → add an applicant as they apply, drag them through stages by clicking a card and choosing the next stage.
2. When you move someone to **Hired**, tick "Create account automatically" — this creates their VA login and auto-assigns your onboarding checklist to them.
3. **Training Cohorts** → create a cohort per round, link applicants to it from Recruitment so you can see enrollment and hire-rate per cohort.
4. **Clients** → add each external client, assign VAs to them with a role and hourly rate.
5. VAs log into their own account and see **My Dashboard**: their onboarding checklist, their clients, and a place to log hours. Admins review and approve hours under **Hours**.

## Deploying for real use

This is dev-ready but not yet internet-exposed. To put it online:

- **Backend:** deploy to any Node host (Render, Railway, Fly.io, a VPS). Set real environment variables — a strong `JWT_SECRET`, and `CORS_ORIGIN` set to your deployed frontend URL. SQLite works fine for this scale, but make sure the host's filesystem persists (some platforms wipe disk on redeploy — if so, switch to a mounted volume or migrate to Postgres later).
- **Frontend:** `npm run build` produces a static `dist/` folder — deploy it to Netlify, Vercel, or any static host, with `VITE_API_URL` set to your backend's public URL.
- Put the backend behind HTTPS before real people log in with real passwords.

## Extending it

Some natural next additions once this is live:
- Password reset flow (currently admins set/reset passwords manually)
- Email notifications when someone's hired or a checklist item is due
- File uploads for signed VA agreements
- Payroll export (CSV) from the Hours summary

The codebase is small and modular on purpose (one route file per module, one page per module) so any of these are a focused, contained change.

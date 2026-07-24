require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const applicantRoutes = require('./routes/applicants');
const cohortRoutes = require('./routes/cohorts');
const onboardingRoutes = require('./routes/onboarding');
const clientRoutes = require('./routes/clients');
const hoursRoutes = require('./routes/hours');
const assignmentRoutes = require('./routes/assignments');
const documentRoutes = require('./routes/documents');
const companyDocumentRoutes = require('./routes/company-documents');
const publicRoutes = require('./routes/public');
const settingsRoutes = require('./routes/settings');
const reportsRoutes = require('./routes/reports');
const assessmentRoutes = require('./routes/assessment');

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '20mb' })); // higher limit to allow base64 document uploads

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'freedom-va-hr' }));

app.use('/api/auth', authRoutes);
app.use('/api/applicants', applicantRoutes);
app.use('/api/cohorts', cohortRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/hours', hoursRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/company-documents', companyDocumentRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/assessment', assessmentRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Freedom VA HR API running on http://localhost:${PORT}`));

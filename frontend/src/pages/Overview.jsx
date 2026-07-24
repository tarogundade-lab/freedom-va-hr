import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const STAGE_LABELS = {
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  training: 'In Training',
  hired: 'Hired',
  not_hired: 'Not Hired',
};

export default function Overview() {
  const [applicants, setApplicants] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [onboardingOverview, setOnboardingOverview] = useState([]);
  const [hoursSummary, setHoursSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/applicants'),
      api.get('/cohorts'),
      api.get('/onboarding/overview'),
      api.get('/hours/summary/by-va'),
    ]).then(([a, c, o, h]) => {
      setApplicants(a.applicants);
      setCohorts(c.cohorts);
      setOnboardingOverview(o.overview);
      setHoursSummary(h.summary);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-ink/50">Loading overview…</div>;

  const stageCounts = Object.keys(STAGE_LABELS).reduce((acc, s) => {
    acc[s] = applicants.filter((a) => a.stage === s).length;
    return acc;
  }, {});

  const activeCohorts = cohorts.filter((c) => c.status !== 'completed').length;
  const incompleteOnboarding = onboardingOverview.filter((o) => o.completed_items < o.total_items).length;
  const totalHoursThisMonth = hoursSummary.reduce((sum, h) => sum + h.total_hours, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold">Overview</h1>
        <p className="text-ink/50 text-sm mt-1">Recruitment, training and workforce snapshot for Freedom VA.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Cohorts" value={activeCohorts} to="/cohorts" />
        <StatCard label="In Pipeline" value={applicants.length - stageCounts.hired - stageCounts.not_hired} to="/recruitment" />
        <StatCard label="Hired to Date" value={stageCounts.hired} to="/recruitment" accent="teal" />
        <StatCard label="Onboarding In Progress" value={incompleteOnboarding} to="/onboarding" accent="gold" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-display font-semibold mb-4">Recruitment Pipeline</h2>
          <div className="space-y-2">
            {Object.entries(STAGE_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="text-ink/70">{label}</span>
                <span className="font-mono font-medium">{stageCounts[key]}</span>
              </div>
            ))}
          </div>
          <Link to="/recruitment" className="text-sm text-gold font-medium mt-4 inline-block hover:underline">
            Manage pipeline →
          </Link>
        </div>

        <div className="card p-5">
          <h2 className="font-display font-semibold mb-4">Hours Logged (all time)</h2>
          {hoursSummary.length === 0 && <p className="text-sm text-ink/50">No hours logged yet.</p>}
          <div className="space-y-2">
            {hoursSummary.slice(0, 6).map((h) => (
              <div key={h.va_user_id} className="flex items-center justify-between text-sm">
                <span className="text-ink/70">{h.name}</span>
                <span className="font-mono font-medium">{h.total_hours.toFixed(1)}h</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t border-black/5 font-semibold">
            <span>Total</span>
            <span className="font-mono">{totalHoursThisMonth.toFixed(1)}h</span>
          </div>
          <Link to="/hours" className="text-sm text-gold font-medium mt-4 inline-block hover:underline">
            View all hours →
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, to, accent }) {
  const accentClass = accent === 'teal' ? 'text-teal' : accent === 'gold' ? 'text-gold' : 'text-ink';
  return (
    <Link to={to} className="card p-4 hover:shadow-md transition-shadow block">
      <div className={`font-mono text-3xl font-semibold ${accentClass}`}>{value}</div>
      <div className="text-xs uppercase tracking-wide text-ink/50 mt-1">{label}</div>
    </Link>
  );
}

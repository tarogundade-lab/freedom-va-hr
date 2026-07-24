import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api';

export default function VaHome({ userId, displayName }) {
  const { user } = useAuth();
  const targetId = userId || user.id;
  const name = displayName || user.name;
  const [progress, setProgress] = useState([]);
  const [clients, setClients] = useState([]);
  const [hoursTotal, setHoursTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isAdminViewing = userId && userId !== user.id;
    const onboardingUrl = isAdminViewing ? `/onboarding/progress?user_id=${targetId}` : '/onboarding/progress';
    const clientsUrl = isAdminViewing ? `/clients?va_user_id=${targetId}` : '/clients';
    const hoursUrl = isAdminViewing ? `/hours?va_user_id=${targetId}` : '/hours';
    Promise.all([api.get(onboardingUrl), api.get(clientsUrl), api.get(hoursUrl)])
      .then(([p, c, h]) => {
        setProgress(p.progress);
        setClients(c.clients);
        setHoursTotal(h.total_hours);
      })
      .finally(() => setLoading(false));
  }, [targetId]);

  if (loading) return <div className="text-ink/50">Loading dashboard…</div>;

  const completed = progress.filter((p) => p.completed).length;
  const onboardingDone = progress.length > 0 && completed === progress.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold">Welcome back, {name.split(' ')[0]}</h1>
        <p className="text-ink/50 text-sm mt-1">Here's where things stand.</p>
      </div>

      {!onboardingDone && progress.length > 0 && (
        <Link to="/onboarding" className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow bg-gold/5 border-gold/20">
          <div>
            <div className="font-medium text-sm">Finish your onboarding checklist</div>
            <div className="text-xs text-ink/50 mt-0.5">{completed} of {progress.length} steps complete</div>
          </div>
          <span className="text-gold font-medium text-sm">Continue →</span>
        </Link>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="font-mono text-3xl font-semibold">{clients.length}</div>
          <div className="text-xs uppercase tracking-wide text-ink/50 mt-1">Active Clients</div>
        </div>
        <div className="card p-4">
          <div className="font-mono text-3xl font-semibold">{hoursTotal.toFixed(1)}h</div>
          <div className="text-xs uppercase tracking-wide text-ink/50 mt-1">Hours Logged</div>
        </div>
        <div className="card p-4">
          <div className="font-mono text-3xl font-semibold text-teal">{completed}/{progress.length}</div>
          <div className="text-xs uppercase tracking-wide text-ink/50 mt-1">Onboarding Steps</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-display font-semibold mb-4">My Clients</h2>
          <div className="space-y-2">
            {clients.slice(0, 5).map((c) => (
              <div key={c.id} className="text-sm py-1.5 border-b border-black/5 last:border-0">{c.name}</div>
            ))}
            {clients.length === 0 && <p className="text-sm text-ink/40">No clients assigned yet.</p>}
          </div>
          <Link to="/clients" className="text-sm text-gold font-medium mt-4 inline-block hover:underline">View all →</Link>
        </div>
        <div className="card p-5">
          <h2 className="font-display font-semibold mb-4">Log Hours</h2>
          <p className="text-sm text-ink/60 mb-4">Keep your hours up to date so approvals aren't held up.</p>
          <Link to="/hours" className="btn-gold">Go to My Hours</Link>
        </div>
      </div>
    </div>
  );
}

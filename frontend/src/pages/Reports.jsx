import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function Reports() {
  const [cohorts, setCohorts] = useState([]);
  const [funnel, setFunnel] = useState([]);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reports/cohort-conversion'),
      api.get('/reports/pipeline-funnel'),
      api.get('/reports/hiring-trend'),
    ]).then(([c, f, t]) => {
      setCohorts(c.cohorts);
      setFunnel(f.funnel);
      setTrend(t.trend);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-ink/50">Loading reports…</div>;

  const stageOrder = ['applied', 'screening', 'interview', 'training', 'hired', 'not_hired'];
  const stageLabels = { applied: 'Applied', screening: 'Screening', interview: 'Interview', training: 'In Training', hired: 'Hired', not_hired: 'Not Hired' };
  const funnelMap = Object.fromEntries(funnel.map((f) => [f.stage, f.count]));
  const maxFunnel = Math.max(1, ...stageOrder.map((s) => funnelMap[s] || 0));
  const maxTrend = Math.max(1, ...trend.map((t) => t.hires));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold">Reports</h1>
        <p className="text-ink/50 text-sm mt-1">How your training cohorts convert into hires, over time.</p>
      </div>

      <div className="card p-5">
        <h2 className="font-display font-semibold mb-1">Cohort → Hire Conversion</h2>
        <p className="text-xs text-ink/50 mb-4">Ordered by when each cohort was created, oldest first.</p>
        {cohorts.length === 0 && <p className="text-sm text-ink/40">No cohorts yet.</p>}
        <div className="space-y-3">
          {cohorts.map((c) => (
            <div key={c.id}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium">{c.name}</span>
                <span className="font-mono text-ink/50">{c.hired_count}/{c.applicant_count} hired · {c.conversion_rate}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-black/5 overflow-hidden">
                <div className="h-full bg-teal" style={{ width: `${c.conversion_rate}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-display font-semibold mb-4">Current Pipeline Funnel</h2>
          <div className="space-y-2">
            {stageOrder.map((s) => {
              const count = funnelMap[s] || 0;
              const pct = Math.round((count / maxFunnel) * 100);
              return (
                <div key={s} className="flex items-center gap-3">
                  <span className="text-xs text-ink/60 w-20 shrink-0">{stageLabels[s]}</span>
                  <div className="flex-1 h-5 rounded bg-black/5 overflow-hidden">
                    <div className={`h-full ${s === 'hired' ? 'bg-teal' : s === 'not_hired' ? 'bg-rust/60' : 'bg-gold'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="font-mono text-xs text-ink/50 w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-display font-semibold mb-4">Hires per Month</h2>
          {trend.length === 0 && <p className="text-sm text-ink/40">No hires recorded yet.</p>}
          <div className="flex items-end gap-2 h-32">
            {trend.map((t) => (
              <div key={t.month} className="flex-1 flex flex-col items-center justify-end gap-1">
                <span className="font-mono text-xs text-ink/50">{t.hires}</span>
                <div className="w-full bg-teal rounded-t" style={{ height: `${Math.max(4, (t.hires / maxTrend) * 100)}%` }} />
                <span className="text-[10px] text-ink/40">{t.month.slice(5)}/{t.month.slice(2, 4)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function Cohorts() {
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [detail, setDetail] = useState(null);

  async function load() {
    const { cohorts } = await api.get('/cohorts');
    setCohorts(cohorts);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function openDetail(c) {
    const data = await api.get(`/cohorts/${c.id}`);
    setDetail(data);
  }

  if (loading) return <div className="text-ink/50">Loading cohorts…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Training Cohorts</h1>
          <p className="text-ink/50 text-sm mt-1">Manage the training rounds that feed your recruitment pipeline.</p>
        </div>
        <button className="btn-gold" onClick={() => setShowAdd(true)}>+ New Cohort</button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {cohorts.map((c) => (
          <button key={c.id} onClick={() => openDetail(c)} className="card p-4 text-left hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="font-display font-semibold">{c.name}</span>
              <span className={`pill ${c.status === 'active' ? 'bg-teal/10 text-teal' : c.status === 'completed' ? 'bg-ink/10 text-ink/60' : 'bg-gold/10 text-gold'}`}>{c.status}</span>
            </div>
            <div className="flex gap-4 text-sm font-mono mt-1">
              <span>{c.applicant_count} enrolled</span>
              <span className="text-teal">{c.hired_count} hired</span>
            </div>
          </button>
        ))}
        {cohorts.length === 0 && <p className="text-ink/40 text-sm">No cohorts yet. Create your first one.</p>}
      </div>

      {showAdd && <AddCohortModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
      {detail && <CohortDetailModal data={detail} onClose={() => setDetail(null)} onChanged={load} />}
    </div>
  );
}

function AddCohortModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/cohorts', form);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="New Cohort" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div><label className="label">Name</label><input required className="input" placeholder="e.g. Cohort 6" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        {error && <div className="text-sm text-rust">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={saving} className="btn-gold">{saving ? 'Saving…' : 'Create Cohort'}</button>
        </div>
      </form>
    </Modal>
  );
}

function CohortDetailModal({ data, onClose, onChanged }) {
  const { cohort, applicants } = data;
  const [status, setStatus] = useState(cohort.status);
  const [saving, setSaving] = useState(false);

  async function updateStatus(newStatus) {
    setSaving(true);
    await api.patch(`/cohorts/${cohort.id}`, { status: newStatus });
    setStatus(newStatus);
    setSaving(false);
    onChanged();
  }

  return (
    <Modal title={cohort.name} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className={`pill ${status === 'active' ? 'bg-teal/10 text-teal' : status === 'completed' ? 'bg-ink/10 text-ink/60' : 'bg-gold/10 text-gold'}`}>{status}</span>
          {status === 'upcoming' && (
            <button disabled={saving} onClick={() => updateStatus('active')} className="btn-ghost border border-black/10 text-sm">Start Training</button>
          )}
          {status !== 'completed' && (
            <button disabled={saving} onClick={() => updateStatus('completed')} className="btn-gold text-sm">Mark Finished</button>
          )}
          {status === 'completed' && (
            <button disabled={saving} onClick={() => updateStatus('active')} className="btn-ghost border border-black/10 text-sm">Reopen</button>
          )}
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ink/50 mb-2">Enrolled Applicants ({applicants.length})</h4>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {applicants.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm py-1.5 border-b border-black/5 last:border-0">
                <span>{a.name}</span>
                <span className="pill bg-ink/5 text-ink/60">{a.stage.replace('_', ' ')}</span>
              </div>
            ))}
            {applicants.length === 0 && <p className="text-sm text-ink/40">No applicants linked to this cohort yet — add them from Recruitment.</p>}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="card w-full max-w-md p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="text-ink/40 hover:text-ink text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

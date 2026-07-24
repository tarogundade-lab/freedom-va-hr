import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api';

export default function Hours({ userId } = {}) {
  const { user } = useAuth();
  if (userId && userId !== user.id) return <VaHours userId={userId} />;
  return user.role === 'admin' ? <AdminHours /> : <VaHours />;
}

function VaHours({ userId }) {
  const { user } = useAuth();
  const targetId = userId || user.id;
  const isAdminViewing = userId && userId !== user.id;
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ client_id: '', log_date: new Date().toISOString().slice(0, 10), hours: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const hoursUrl = isAdminViewing ? `/hours?va_user_id=${targetId}` : '/hours';
    const clientsUrl = isAdminViewing ? `/clients?va_user_id=${targetId}` : '/clients';
    const [h, c] = await Promise.all([api.get(hoursUrl), api.get(clientsUrl)]);
    setLogs(h.logs);
    setTotal(h.total_hours);
    setClients(c.clients);
    setLoading(false);
  }
  useEffect(() => { load(); }, [targetId]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/hours', { ...form, client_id: form.client_id || null, hours: Number(form.hours), va_user_id: isAdminViewing ? targetId : undefined });
      setForm({ client_id: '', log_date: new Date().toISOString().slice(0, 10), hours: '', description: '' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    await api.del(`/hours/${id}`);
    load();
  }

  if (loading) return <div className="text-ink/50">Loading hours…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">My Hours</h1>
          <p className="text-ink/50 text-sm mt-1">Log your work hours by client.</p>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-semibold">{total.toFixed(1)}h</div>
          <div className="text-xs text-ink/50 uppercase tracking-wide">Total logged</div>
        </div>
      </div>

      <form onSubmit={submit} className="card p-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
        <div>
          <label className="label">Date</label>
          <input type="date" required className="input" value={form.log_date} onChange={(e) => setForm({ ...form, log_date: e.target.value })} />
        </div>
        <div>
          <label className="label">Hours</label>
          <input type="number" step="0.25" min="0" required className="input" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
        </div>
        <div>
          <label className="label">Client</label>
          <select className="input" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
            <option value="">— Internal / n/a —</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="col-span-2 md:col-span-1">
          <label className="label">Description</label>
          <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What did you work on?" />
        </div>
        <button type="submit" disabled={saving} className="btn-gold h-[38px]">{saving ? 'Logging…' : 'Log Hours'}</button>
      </form>
      {error && <div className="text-sm text-rust">{error}</div>}

      <div className="card divide-y divide-black/5">
        {logs.map((l) => (
          <div key={l.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <div className="font-medium">{l.log_date} {l.client_name && <span className="text-ink/50 font-normal">· {l.client_name}</span>}</div>
              {l.description && <div className="text-ink/50 text-xs mt-0.5">{l.description}</div>}
            </div>
            <div className="flex items-center gap-3">
              {l.approved ? <span className="pill bg-teal/10 text-teal">approved</span> : <span className="pill bg-gold/10 text-gold">pending</span>}
              <span className="font-mono">{l.hours}h</span>
              <button onClick={() => remove(l.id)} className="text-ink/30 hover:text-rust text-xs">Remove</button>
            </div>
          </div>
        ))}
        {logs.length === 0 && <div className="px-4 py-6 text-sm text-ink/40 text-center">No hours logged yet.</div>}
      </div>
    </div>
  );
}

function AdminHours() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [h, s] = await Promise.all([api.get('/hours'), api.get('/hours/summary/by-va')]);
    setLogs(h.logs);
    setSummary(s.summary);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function approve(l) {
    await api.patch(`/hours/${l.id}`, { approved: !l.approved });
    load();
  }

  async function exportCsv() {
    const token = localStorage.getItem('fva_token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
    const res = await fetch(`${API_URL}/hours/export.csv`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hours-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  if (loading) return <div className="text-ink/50">Loading hours…</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Hours</h1>
          <p className="text-ink/50 text-sm mt-1">Review logged hours across your team.</p>
        </div>
        <button onClick={exportCsv} className="btn-ghost border border-black/10">Export CSV</button>
      </div>

      <div className="card p-5">
        <h2 className="font-display font-semibold mb-3">Totals by VA</h2>
        <div className="space-y-2">
          {summary.map((s) => (
            <div key={s.va_user_id} className="flex items-center justify-between text-sm py-1.5 border-b border-black/5 last:border-0">
              <span>{s.name}</span>
              <span className="font-mono">{s.approved_hours.toFixed(1)}h approved / {s.total_hours.toFixed(1)}h total</span>
            </div>
          ))}
          {summary.length === 0 && <p className="text-sm text-ink/40">No hours logged yet.</p>}
        </div>
      </div>

      <div className="card divide-y divide-black/5">
        {logs.map((l) => (
          <div key={l.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <div className="font-medium">{l.va_name} <span className="text-ink/40 font-normal">· {l.log_date}</span> {l.client_name && <span className="text-ink/50 font-normal">· {l.client_name}</span>}</div>
              {l.description && <div className="text-ink/50 text-xs mt-0.5">{l.description}</div>}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => approve(l)} className={`pill ${l.approved ? 'bg-teal/10 text-teal' : 'bg-gold/10 text-gold'}`}>
                {l.approved ? 'approved' : 'pending — click to approve'}
              </button>
              <span className="font-mono">{l.hours}h</span>
            </div>
          </div>
        ))}
        {logs.length === 0 && <div className="px-4 py-6 text-sm text-ink/40 text-center">No hours logged yet.</div>}
      </div>
    </div>
  );
}

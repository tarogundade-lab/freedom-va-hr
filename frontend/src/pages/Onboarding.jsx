import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api';
import Documents from '../components/Documents.jsx';

export default function Onboarding() {
  const { user } = useAuth();
  return user.role === 'admin' ? <AdminOnboarding /> : <ChecklistFor userId={user.id} title="My Onboarding" />;
}

function AdminOnboarding() {
  const [overview, setOverview] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [newTemplate, setNewTemplate] = useState('');

  async function load() {
    const [o, t] = await Promise.all([api.get('/onboarding/overview'), api.get('/onboarding/templates')]);
    setOverview(o.overview);
    setTemplates(t.templates);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function addTemplate(e) {
    e.preventDefault();
    if (!newTemplate.trim()) return;
    await api.post('/onboarding/templates', { title: newTemplate.trim() });
    setNewTemplate('');
    load();
  }

  async function removeTemplate(id) {
    await api.del(`/onboarding/templates/${id}`);
    load();
  }

  if (loading) return <div className="text-ink/50">Loading onboarding…</div>;

  if (selectedUser) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedUser(null)} className="text-sm text-gold font-medium hover:underline">← Back to overview</button>
        <ChecklistFor userId={selectedUser.user_id} title={`${selectedUser.name}'s Onboarding`} admin />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold">Onboarding</h1>
        <p className="text-ink/50 text-sm mt-1">Track new-hire checklist completion across the team.</p>
      </div>

      <div className="card p-5">
        <h2 className="font-display font-semibold mb-3">Progress by VA</h2>
        <div className="space-y-2">
          {overview.map((o) => {
            const pct = o.total_items ? Math.round((o.completed_items / o.total_items) * 100) : 0;
            const incomplete = o.completed_items < o.total_items;
            return (
              <div key={o.user_id} className="flex items-center gap-4 py-2 border-b border-black/5 last:border-0 hover:bg-black/[0.02] px-1 rounded">
                <button onClick={() => setSelectedUser(o)} className="flex-1 flex items-center gap-4 text-left min-w-0">
                  <span className="flex-1 text-sm font-medium truncate">{o.name}</span>
                  <div className="w-40 h-2 rounded-full bg-black/5 overflow-hidden shrink-0">
                    <div className={`h-full ${pct === 100 ? 'bg-teal' : 'bg-gold'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="font-mono text-xs text-ink/50 w-16 text-right shrink-0">{o.completed_items}/{o.total_items}</span>
                </button>
                {incomplete && <RemindButton userId={o.user_id} />}
              </div>
            );
          })}
          {overview.length === 0 && <p className="text-sm text-ink/40">No VAs hired yet.</p>}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-display font-semibold mb-3">Checklist Template</h2>
        <p className="text-xs text-ink/50 mb-3">This list is auto-assigned to every VA when they're hired.</p>
        <div className="space-y-1 mb-3">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center justify-between text-sm py-1.5 border-b border-black/5 last:border-0">
              <span>{t.title}</span>
              <button onClick={() => removeTemplate(t.id)} className="text-ink/30 hover:text-rust text-xs">Remove</button>
            </div>
          ))}
        </div>
        <form onSubmit={addTemplate} className="flex gap-2">
          <input className="input" placeholder="Add a checklist item" value={newTemplate} onChange={(e) => setNewTemplate(e.target.value)} />
          <button type="submit" className="btn-gold whitespace-nowrap">Add</button>
        </form>
      </div>
    </div>
  );
}

function RemindButton({ userId }) {
  const [state, setState] = useState('idle'); // idle | sending | sent

  async function remind(e) {
    e.stopPropagation();
    setState('sending');
    try {
      const { sent } = await api.post(`/onboarding/remind/${userId}`);
      setState(sent ? 'sent' : 'idle');
    } catch {
      setState('idle');
    }
  }

  return (
    <button onClick={remind} disabled={state !== 'idle'} className="text-xs text-gold font-medium hover:underline shrink-0 whitespace-nowrap">
      {state === 'sending' ? 'Sending…' : state === 'sent' ? 'Sent ✓' : 'Send reminder'}
    </button>
  );
}

function ChecklistFor({ userId, title, admin = false }) {
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { progress } = await api.get(`/onboarding/progress${admin ? `?user_id=${userId}` : ''}`);
    setProgress(progress);
    setLoading(false);
  }
  useEffect(() => { load(); }, [userId]);

  async function toggle(item) {
    setProgress((prev) => prev.map((p) => (p.id === item.id ? { ...p, completed: !p.completed } : p)));
    await api.patch(`/onboarding/progress/${item.id}`, { completed: !item.completed });
  }

  if (loading) return <div className="text-ink/50">Loading checklist…</div>;

  const completedCount = progress.filter((p) => p.completed).length;

  return (
    <div className="space-y-6">
      {!admin && (
        <div>
          <h1 className="text-2xl font-display font-bold">{title}</h1>
          <p className="text-ink/50 text-sm mt-1">Complete each step to finish your onboarding.</p>
        </div>
      )}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="font-display font-semibold">{admin ? title : 'Checklist'}</span>
          <span className="font-mono text-sm text-ink/50">{completedCount}/{progress.length} complete</span>
        </div>
        <div className="space-y-2">
          {progress.map((item) => (
            <label key={item.id} className="flex items-center gap-3 py-2 border-b border-black/5 last:border-0 cursor-pointer">
              <input type="checkbox" checked={!!item.completed} onChange={() => toggle(item)} className="w-4 h-4 accent-teal" />
              <span className={`text-sm flex-1 ${item.completed ? 'line-through text-ink/40' : ''}`}>{item.title}</span>
            </label>
          ))}
          {progress.length === 0 && <p className="text-sm text-ink/40">No checklist items yet.</p>}
        </div>
      </div>
      <Documents userId={userId} admin={admin} />
    </div>
  );
}

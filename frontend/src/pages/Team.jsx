import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function Team() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  async function load() {
    const { users } = await api.get('/auth/users');
    setUsers(users.filter((u) => u.role === 'va'));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-ink/50">Loading team…</div>;

  const visible = users.filter((u) => showInactive || u.status === 'active');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Team</h1>
          <p className="text-ink/50 text-sm mt-1">Skills, capacity, and status for every VA.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink/60">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Show offboarded
        </label>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {visible.map((u) => (
          <button key={u.id} onClick={() => setSelected(u)} className="card p-4 text-left hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="font-display font-semibold">{u.name}</span>
              {u.status === 'inactive'
                ? <span className="pill bg-rust/10 text-rust">offboarded</span>
                : <span className="pill bg-teal/10 text-teal">active</span>}
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {u.skills.length === 0 && <span className="text-xs text-ink/30">No skills tagged</span>}
              {u.skills.map((s) => <span key={s} className="pill bg-ink/5 text-ink/60">{s}</span>)}
            </div>
            {u.weekly_capacity_hours != null && (
              <CapacityBar booked={u.booked_hours_per_week} capacity={u.weekly_capacity_hours} />
            )}
          </button>
        ))}
        {visible.length === 0 && <p className="text-sm text-ink/40">No team members to show.</p>}
      </div>

      {selected && (
        <VaDetailModal user={selected} onClose={() => setSelected(null)} onChanged={() => { load(); setSelected(null); }} />
      )}
    </div>
  );
}

function CapacityBar({ booked, capacity }) {
  const pct = capacity > 0 ? Math.min(100, Math.round((booked / capacity) * 100)) : 0;
  const over = booked > capacity;
  return (
    <div>
      <div className="flex justify-between text-xs text-ink/50 mb-1">
        <span>{booked}h / {capacity}h weekly</span>
        {over && <span className="text-rust font-medium">Over capacity</span>}
      </div>
      <div className="w-full h-1.5 rounded-full bg-black/5 overflow-hidden">
        <div className={`h-full ${over ? 'bg-rust' : pct > 80 ? 'bg-gold' : 'bg-teal'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function VaDetailModal({ user, onClose, onChanged }) {
  const [skills, setSkills] = useState(user.skills);
  const [newSkill, setNewSkill] = useState('');
  const [capacity, setCapacity] = useState(user.weekly_capacity_hours ?? '');
  const [saving, setSaving] = useState(false);
  const [showOffboard, setShowOffboard] = useState(false);
  const [reason, setReason] = useState('');

  function addSkill(e) {
    e.preventDefault();
    const v = newSkill.trim();
    if (!v || skills.includes(v)) return;
    setSkills([...skills, v]);
    setNewSkill('');
  }

  function removeSkill(s) {
    setSkills(skills.filter((x) => x !== s));
  }

  async function save() {
    setSaving(true);
    await api.patch(`/auth/users/${user.id}`, {
      skills,
      weekly_capacity_hours: capacity === '' ? null : Number(capacity),
    });
    setSaving(false);
    onChanged();
  }

  async function offboard() {
    setSaving(true);
    await api.post(`/auth/users/${user.id}/offboard`, { reason });
    setSaving(false);
    onChanged();
  }

  async function reactivate() {
    setSaving(true);
    await api.post(`/auth/users/${user.id}/reactivate`);
    setSaving(false);
    onChanged();
  }

  return (
    <Modal title={user.name} onClose={onClose}>
      <div className="space-y-5">
        <div className="text-sm text-ink/50">{user.email}</div>

        {user.status === 'inactive' && (
          <div className="bg-rust/5 border border-rust/20 rounded-md p-3 text-sm">
            <div className="font-medium text-rust">Offboarded</div>
            {user.offboard_reason && <div className="text-ink/60 mt-1">{user.offboard_reason}</div>}
            <button disabled={saving} onClick={reactivate} className="btn-ghost border border-black/10 mt-2 text-xs">Reactivate</button>
          </div>
        )}

        <div>
          <label className="label">Skills</label>
          <div className="flex flex-wrap gap-1 mb-2">
            {skills.map((s) => (
              <span key={s} className="pill bg-ink/5 text-ink/60 flex items-center gap-1">
                {s}
                <button onClick={() => removeSkill(s)} className="text-ink/40 hover:text-rust">&times;</button>
              </span>
            ))}
            {skills.length === 0 && <span className="text-xs text-ink/30">No skills tagged yet</span>}
          </div>
          <form onSubmit={addSkill} className="flex gap-2">
            <input className="input" placeholder="e.g. Social Media, Bookkeeping" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} />
            <button type="submit" className="btn-ghost border border-black/10 whitespace-nowrap">Add</button>
          </form>
        </div>

        <div>
          <label className="label">Weekly Capacity (hours)</label>
          <input type="number" min="0" className="input" placeholder="e.g. 20" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          <div className="text-xs text-ink/40 mt-1">Currently booked: {user.booked_hours_per_week}h/week across active client assignments</div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-black/10">
          <button onClick={save} disabled={saving} className="btn-gold">{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>

        {user.status === 'active' && (
          <div className="border-t border-black/10 pt-4">
            {!showOffboard ? (
              <button onClick={() => setShowOffboard(true)} className="text-sm text-rust hover:underline">Offboard this VA</button>
            ) : (
              <div className="space-y-2">
                <label className="label">Reason for offboarding</label>
                <textarea className="input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Contract ended, performance, personal reasons" />
                <div className="flex gap-2">
                  <button onClick={() => setShowOffboard(false)} className="btn-ghost">Cancel</button>
                  <button onClick={offboard} disabled={saving} className="btn bg-rust text-white hover:bg-rust/90">
                    {saving ? 'Offboarding…' : 'Confirm Offboard'}
                  </button>
                </div>
                <p className="text-xs text-ink/40">This ends their active client assignments and blocks their login. Their hours and history stay intact.</p>
              </div>
            )}
          </div>
        )}
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

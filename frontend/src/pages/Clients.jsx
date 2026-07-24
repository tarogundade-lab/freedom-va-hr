import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api';

export default function Clients({ userId } = {}) {
  const { user } = useAuth();
  if (userId && userId !== user.id) return <VaClients userId={userId} />;
  return user.role === 'admin' ? <AdminClients /> : <VaClients />;
}

function VaClients({ userId }) {
  const { user } = useAuth();
  const targetId = userId || user.id;
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const isAdminViewing = userId && userId !== user.id;
    const url = isAdminViewing ? `/clients?va_user_id=${targetId}` : '/clients';
    api.get(url).then((d) => setClients(d.clients)).finally(() => setLoading(false));
  }, [targetId]);
  if (loading) return <div className="text-ink/50">Loading clients…</div>;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">My Clients</h1>
        <p className="text-ink/50 text-sm mt-1">External clients you're currently assigned to.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {clients.map((c) => (
          <div key={c.id} className="card p-4">
            <div className="font-display font-semibold">{c.name}</div>
            {c.contact_name && <div className="text-sm text-ink/60 mt-1">{c.contact_name}</div>}
            {c.contact_email && <div className="text-sm text-ink/50">{c.contact_email}</div>}
          </div>
        ))}
        {clients.length === 0 && <p className="text-sm text-ink/40">You're not assigned to any clients yet.</p>}
      </div>
    </div>
  );
}

function AdminClients() {
  const [clients, setClients] = useState([]);
  const [vas, setVas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [detail, setDetail] = useState(null);

  async function load() {
    const [c, u] = await Promise.all([api.get('/clients'), api.get('/auth/users')]);
    setClients(c.clients);
    setVas(u.users.filter((x) => x.role === 'va' && x.status === 'active'));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function openDetail(c) {
    const data = await api.get(`/clients/${c.id}`);
    setDetail(data);
  }

  if (loading) return <div className="text-ink/50">Loading clients…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Clients</h1>
          <p className="text-ink/50 text-sm mt-1">External clients your VAs work with, and who's assigned where.</p>
        </div>
        <button className="btn-gold" onClick={() => setShowAdd(true)}>+ Add Client</button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {clients.map((c) => (
          <button key={c.id} onClick={() => openDetail(c)} className="card p-4 text-left hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="font-display font-semibold">{c.name}</span>
              <span className={`pill ${c.status === 'active' ? 'bg-teal/10 text-teal' : 'bg-ink/10 text-ink/60'}`}>{c.status}</span>
            </div>
            {c.contact_name && <div className="text-sm text-ink/50 mt-1">{c.contact_name}</div>}
          </button>
        ))}
        {clients.length === 0 && <p className="text-sm text-ink/40">No clients yet.</p>}
      </div>

      {showAdd && <AddClientModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
      {detail && <ClientDetailModal data={detail} vas={vas} onClose={() => setDetail(null)} onChanged={() => { openDetail(detail.client); load(); }} />}
    </div>
  );
}

function AddClientModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', contact_name: '', contact_email: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/clients', form);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add Client" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div><label className="label">Client / Company Name</label><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">Contact Name</label><input className="input" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
        <div><label className="label">Contact Email</label><input type="email" className="input" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
        <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        {error && <div className="text-sm text-rust">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={saving} className="btn-gold">{saving ? 'Saving…' : 'Add Client'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ClientDetailModal({ data, vas, onClose, onChanged }) {
  const { client, assignments } = data;
  const [vaId, setVaId] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [rate, setRate] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: client.name, contact_name: client.contact_name || '', contact_email: client.contact_email || '', notes: client.notes || '',
  });

  async function saveContact() {
    setSaving(true);
    await api.patch(`/clients/${client.id}`, contactForm);
    setSaving(false);
    setEditingContact(false);
    onChanged();
  }

  async function assign(e) {
    e.preventDefault();
    if (!vaId) return;
    setSaving(true);
    await api.post(`/clients/${client.id}/assignments`, {
      va_user_id: vaId,
      role_title: roleTitle || null,
      hourly_rate: rate ? Number(rate) : null,
      hours_per_week: hoursPerWeek ? Number(hoursPerWeek) : null,
    });
    setVaId(''); setRoleTitle(''); setRate(''); setHoursPerWeek('');
    setSaving(false);
    onChanged();
  }

  async function endAssignment(a) {
    await api.patch(`/clients/assignments/${a.id}`, { status: 'ended', end_date: new Date().toISOString().slice(0, 10) });
    onChanged();
  }

  return (
    <Modal title={client.name} onClose={onClose}>
      <div className="space-y-4">
        {!editingContact ? (
          <div className="flex items-start justify-between">
            <div className="text-sm text-ink/60">
              {contactForm.contact_name && <div>{contactForm.contact_name}</div>}
              {contactForm.contact_email && <div>{contactForm.contact_email}</div>}
              {contactForm.notes && <div className="text-ink/40 mt-1">{contactForm.notes}</div>}
              {!contactForm.contact_name && !contactForm.contact_email && !contactForm.notes && (
                <span className="text-ink/30">No contact details yet</span>
              )}
            </div>
            <button onClick={() => setEditingContact(true)} className="text-xs text-gold font-medium hover:underline shrink-0">Edit</button>
          </div>
        ) : (
          <div className="space-y-2 bg-black/[0.02] border border-black/10 rounded-md p-3">
            <div><label className="label">Client Name</label><input className="input" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} /></div>
            <div><label className="label">Contact Name</label><input className="input" value={contactForm.contact_name} onChange={(e) => setContactForm({ ...contactForm, contact_name: e.target.value })} /></div>
            <div><label className="label">Contact Email</label><input type="email" className="input" value={contactForm.contact_email} onChange={(e) => setContactForm({ ...contactForm, contact_email: e.target.value })} /></div>
            <div><label className="label">Notes</label><textarea className="input" rows={2} value={contactForm.notes} onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })} /></div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingContact(false)} className="btn-ghost text-sm">Cancel</button>
              <button onClick={saveContact} disabled={saving} className="btn-gold text-sm">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        )}

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ink/50 mb-2">Assigned VAs</h4>
          <div className="space-y-1">
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm py-1.5 border-b border-black/5 last:border-0">
                <div>
                  <span className="font-medium">{a.va_name}</span>
                  {a.role_title && <span className="text-ink/50"> · {a.role_title}</span>}
                  {a.hours_per_week && <span className="text-ink/40"> · {a.hours_per_week}h/wk</span>}
                </div>
                {a.status === 'active'
                  ? <button onClick={() => endAssignment(a)} className="text-xs text-rust hover:underline">End</button>
                  : <span className="pill bg-ink/5 text-ink/40">ended</span>}
              </div>
            ))}
            {assignments.length === 0 && <p className="text-sm text-ink/40">No VAs assigned yet.</p>}
          </div>
        </div>

        <form onSubmit={assign} className="border-t border-black/10 pt-4 space-y-2">
          <label className="label">Assign a VA</label>
          <select className="input" value={vaId} onChange={(e) => setVaId(e.target.value)}>
            <option value="">Select a VA…</option>
            {vas.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input className="input" placeholder="Role (optional)" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} />
            <input className="input" placeholder="Hourly rate (optional)" type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
          </div>
          <input className="input" placeholder="Hours per week (optional, for capacity tracking)" type="number" step="0.5" value={hoursPerWeek} onChange={(e) => setHoursPerWeek(e.target.value)} />
          <button type="submit" disabled={saving || !vaId} className="btn-gold w-full">{saving ? 'Assigning…' : 'Assign VA'}</button>
        </form>
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

import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function Settings() {
  const [form, setForm] = useState({ org_name: '', contact_email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/settings').then(({ settings }) => {
      setForm({ org_name: settings.org_name || '', contact_email: settings.contact_email || '' });
      setLoading(false);
    });
  }, []);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await api.patch('/settings', form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    // Refresh so the new org name shows in the sidebar immediately
    window.location.reload();
  }

  if (loading) return <div className="text-ink/50">Loading settings…</div>;

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h1 className="text-2xl font-display font-bold">Settings</h1>
        <p className="text-ink/50 text-sm mt-1">Branding shown across the platform and public pages.</p>
      </div>

      <form onSubmit={save} className="card p-5 space-y-4">
        <div>
          <label className="label">Company Name</label>
          <input className="input" value={form.org_name} onChange={(e) => setForm({ ...form, org_name: e.target.value })} />
          <p className="text-xs text-ink/40 mt-1">Shown in the sidebar, login page, and public application form.</p>
        </div>
        <div>
          <label className="label">Contact Email</label>
          <input type="email" className="input" placeholder="hello@yourcompany.com" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          <p className="text-xs text-ink/40 mt-1">For your own reference — not yet shown publicly.</p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-gold">{saving ? 'Saving…' : 'Save Changes'}</button>
          {saved && <span className="text-sm text-teal">Saved ✓</span>}
        </div>
      </form>

      <div className="card p-5">
        <h2 className="font-display font-semibold mb-2">About This Platform</h2>
        <p className="text-sm text-ink/60">
          This HR platform handles recruitment, training cohorts, onboarding, team management, client assignments, and hours tracking — built specifically for {form.org_name || 'your organization'}.
        </p>
      </div>
    </div>
  );
}

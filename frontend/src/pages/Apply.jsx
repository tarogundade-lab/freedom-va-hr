import React, { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default function Apply() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', source: '', notes: '', honeypot: '' });
  const [status, setStatus] = useState('idle'); // idle | submitting | done | error
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setStatus('submitting');
    setError('');
    try {
      const res = await fetch(`${API_URL}/public/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Something went wrong');
      setStatus('done');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <div className="font-display font-bold text-2xl text-sand mb-3">You're in.</div>
          <p className="text-sand/60 text-sm">Thanks for applying to Freedom VA. We'll review your application and reach out about next steps.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="font-display font-bold text-2xl text-sand tracking-tight">Freedom VA</div>
          <div className="text-sand/50 text-sm uppercase tracking-widest mt-1">Apply to Train</div>
        </div>
        <form onSubmit={submit} className="card p-6 space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input required type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">How did you hear about us?</label>
            <input className="input" placeholder="e.g. Instagram, referral, Google" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          </div>
          <div>
            <label className="label">Anything you'd like us to know?</label>
            <textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {/* Honeypot field — hidden from real people via CSS, bots often fill it in anyway */}
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            className="absolute opacity-0 h-0 w-0 pointer-events-none"
            value={form.honeypot}
            onChange={(e) => setForm({ ...form, honeypot: e.target.value })}
          />
          {error && <div className="text-sm text-rust">{error}</div>}
          <button type="submit" disabled={status === 'submitting'} className="btn-gold w-full">
            {status === 'submitting' ? 'Submitting…' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
}

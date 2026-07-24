import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useBranding } from '../context/BrandingContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const { orgName } = useBranding();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink relative overflow-hidden flex items-center justify-center px-4">
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(600px circle at 50% 0%, rgba(217,164,65,0.16), transparent 60%), radial-gradient(500px circle at 100% 100%, rgba(46,156,143,0.12), transparent 60%)',
      }} />
      <div className="w-full max-w-sm relative animate-fade-up">
        <div className="text-center mb-8">
          <div className="font-display font-bold text-2xl text-sand tracking-tight">{orgName}</div>
          <div className="text-sand/50 text-sm uppercase tracking-widest mt-1">HR Platform</div>
        </div>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@freedomva.com" />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <div className="text-sm text-rust">{error}</div>}
          <button type="submit" disabled={loading} className="btn-gold w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-sand/40 text-xs mt-4">Access is by invitation from an admin.</p>
      </div>
    </div>
  );
}

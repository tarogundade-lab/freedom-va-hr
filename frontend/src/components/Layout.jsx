import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const adminNav = [
  { to: '/', label: 'Overview', end: true },
  { to: '/recruitment', label: 'Recruitment' },
  { to: '/cohorts', label: 'Training Cohorts' },
  { to: '/onboarding', label: 'Onboarding' },
  { to: '/team', label: 'Team' },
  { to: '/clients', label: 'Clients' },
  { to: '/hours', label: 'Hours' },
];

const vaNav = [
  { to: '/', label: 'My Dashboard', end: true },
  { to: '/onboarding', label: 'Onboarding' },
  { to: '/clients', label: 'My Clients' },
  { to: '/hours', label: 'My Hours' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const nav = user?.role === 'admin' ? adminNav : vaNav;

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shrink-0 bg-ink text-sand flex flex-col">
        <div className="px-6 py-6 border-b border-white/10">
          <div className="font-display font-bold text-lg tracking-tight">Freedom VA</div>
          <div className="text-xs text-sand/50 uppercase tracking-widest mt-0.5">HR Platform</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-gold text-ink' : 'text-sand/80 hover:bg-white/10 hover:text-sand'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-white/10">
          <div className="text-sm font-medium">{user?.name}</div>
          <div className="text-xs text-sand/50 mb-3">{user?.role === 'admin' ? 'Administrator' : 'Virtual Assistant'}</div>
          <button onClick={logout} className="btn-ghost w-full !text-sand/80 hover:!bg-white/10 justify-start px-0">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 bg-sand">
        <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useBranding } from '../context/BrandingContext.jsx';
import { useViewAs } from '../context/ViewAsContext.jsx';
import { api } from '../api';

const adminNav = [
  { to: '/', label: 'Overview', end: true },
  { to: '/recruitment', label: 'Recruitment' },
  { to: '/assessment-admin', label: 'Assessment' },
  { to: '/cohorts', label: 'Training Cohorts' },
  { to: '/onboarding', label: 'Onboarding' },
  { to: '/team', label: 'Team' },
  { to: '/clients', label: 'Clients' },
  { to: '/hours', label: 'Hours' },
  { to: '/reports', label: 'Reports' },
  { to: '/settings', label: 'Settings' },
];

const vaNav = [
  { to: '/', label: 'My Dashboard', end: true },
  { to: '/onboarding', label: 'Onboarding' },
  { to: '/clients', label: 'My Clients' },
  { to: '/hours', label: 'My Hours' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { orgName } = useBranding();
  const { viewAsUser, setViewAsUser } = useViewAs();
  const [vas, setVas] = useState([]);

  useEffect(() => {
    if (user?.role === 'admin') {
      api.get('/auth/users').then((d) => setVas(d.users.filter((u) => u.role === 'va' && u.status === 'active'))).catch(() => {});
    }
  }, [user]);

  const isViewingAs = user?.role === 'admin' && !!viewAsUser;
  const nav = isViewingAs || user?.role !== 'admin' ? vaNav : adminNav;

  return (
    <div className="min-h-screen flex">
      <aside className={`w-64 shrink-0 flex flex-col ${isViewingAs ? 'bg-teal' : 'bg-ink'} text-sand`}>
        <div className="px-6 py-6 border-b border-white/10">
          <div className="font-display font-bold text-lg tracking-tight">{orgName}</div>
          <div className="text-xs text-sand/50 uppercase tracking-widest mt-0.5">
            {isViewingAs ? 'Employee Preview' : 'HR Platform'}
          </div>
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

        {user?.role === 'admin' && (
          <div className="px-4 py-3 border-t border-white/10">
            {isViewingAs ? (
              <button onClick={() => setViewAsUser(null)} className="btn-ghost w-full !text-sand border border-white/20 hover:!bg-white/10 justify-center text-sm">
                ← Back to Admin View
              </button>
            ) : (
              <div>
                <label className="text-xs text-sand/50 uppercase tracking-wide block mb-1.5">View as employee</label>
                <select
                  className="w-full rounded-md bg-white/10 border border-white/20 text-sand text-sm px-2 py-1.5"
                  value=""
                  onChange={(e) => {
                    const va = vas.find((v) => v.id === e.target.value);
                    if (va) setViewAsUser(va);
                  }}
                >
                  <option value="" className="text-ink">Select a VA…</option>
                  {vas.map((v) => <option key={v.id} value={v.id} className="text-ink">{v.name}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="px-4 py-4 border-t border-white/10">
          <div className="text-sm font-medium">{isViewingAs ? viewAsUser.name : user?.name}</div>
          <div className="text-xs text-sand/50 mb-3">
            {isViewingAs ? `Viewing as this VA` : user?.role === 'admin' ? 'Administrator' : 'Virtual Assistant'}
          </div>
          <button onClick={logout} className="btn-ghost w-full !text-sand/80 hover:!bg-white/10 justify-start px-0">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 bg-sand">
        {isViewingAs && (
          <div className="bg-teal text-white text-sm px-8 py-2 flex items-center justify-between">
            <span>Viewing the app as <strong>{viewAsUser.name}</strong> would see it. Any changes you make here (checklist, hours) affect their real account.</span>
            <button onClick={() => setViewAsUser(null)} className="underline font-medium whitespace-nowrap ml-4">Exit preview</button>
          </div>
        )}
        <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}

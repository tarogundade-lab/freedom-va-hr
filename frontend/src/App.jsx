import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Overview from './pages/Overview.jsx';
import VaHome from './pages/VaHome.jsx';
import Recruitment from './pages/Recruitment.jsx';
import Cohorts from './pages/Cohorts.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Team from './pages/Team.jsx';
import Clients from './pages/Clients.jsx';
import Hours from './pages/Hours.jsx';
import Apply from './pages/Apply.jsx';

function Private({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-ink/50">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/apply" element={<Apply />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<Private>{user?.role === 'admin' ? <Overview /> : <VaHome />}</Private>} />
      <Route path="/recruitment" element={<Private adminOnly><Recruitment /></Private>} />
      <Route path="/cohorts" element={<Private adminOnly><Cohorts /></Private>} />
      <Route path="/onboarding" element={<Private><Onboarding /></Private>} />
      <Route path="/team" element={<Private adminOnly><Team /></Private>} />
      <Route path="/clients" element={<Private><Clients /></Private>} />
      <Route path="/hours" element={<Private><Hours /></Private>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

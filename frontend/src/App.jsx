import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { useViewAs } from './context/ViewAsContext.jsx';
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
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import Apply from './pages/Apply.jsx';
import Assessment from './pages/Assessment.jsx';
import AdminAssessment from './pages/AdminAssessment.jsx';

function Private({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  const { viewAsUser } = useViewAs();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-ink/50">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && (user.role !== 'admin' || viewAsUser)) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { user } = useAuth();
  const { viewAsUser } = useViewAs();
  const isAdmin = user?.role === 'admin';
  const isViewingAs = isAdmin && !!viewAsUser;

  return (
    <Routes>
      <Route path="/apply" element={<Apply />} />
      <Route path="/assessment" element={<Assessment />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={
        <Private>
          {isViewingAs
            ? <VaHome userId={viewAsUser.id} displayName={viewAsUser.name} />
            : isAdmin ? <Overview /> : <VaHome />}
        </Private>
      } />
      <Route path="/recruitment" element={<Private adminOnly><Recruitment /></Private>} />
      <Route path="/assessment-admin" element={<Private adminOnly><AdminAssessment /></Private>} />
      <Route path="/cohorts" element={<Private adminOnly><Cohorts /></Private>} />
      <Route path="/onboarding" element={<Private><Onboarding userId={isViewingAs ? viewAsUser.id : undefined} /></Private>} />
      <Route path="/team" element={<Private adminOnly><Team /></Private>} />
      <Route path="/clients" element={<Private><Clients userId={isViewingAs ? viewAsUser.id : undefined} /></Private>} />
      <Route path="/hours" element={<Private><Hours userId={isViewingAs ? viewAsUser.id : undefined} /></Private>} />
      <Route path="/reports" element={<Private adminOnly><Reports /></Private>} />
      <Route path="/settings" element={<Private adminOnly><Settings /></Private>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

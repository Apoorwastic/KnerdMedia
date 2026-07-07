import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import api from './lib/api';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SectionPage from './pages/SectionPage';
import ClientTasksPage from './pages/ClientTasksPage';
import Operations from './pages/Operations';
import MyTracker from './pages/MyTracker';
import TeamTracker from './pages/TeamTracker';
import AdminPanel from './pages/AdminPanel';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Settings from './pages/Settings';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { token, setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    if (token) {
      api.get('/auth/me').then((r) => setAuth(r.data, token)).catch(() => clearAuth());
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="performance" element={<SectionPage section="PERFORMANCE" />} />
          <Route path="performance/:clientId" element={<ClientTasksPage section="PERFORMANCE" />} />
          <Route path="retention" element={<SectionPage section="RETENTION" />} />
          <Route path="retention/:clientId" element={<ClientTasksPage section="RETENTION" />} />
          <Route path="creatives" element={<SectionPage section="CREATIVES" />} />
          <Route path="creatives/:clientId" element={<ClientTasksPage section="CREATIVES" />} />
          <Route path="operations" element={<Operations />} />
          <Route path="tracker" element={<MyTracker />} />
          <Route path="team-tracker" element={<TeamTracker />} />
          <Route path="admin" element={<AdminPanel />} />
          <Route path="accounts" element={<Projects />} />
          <Route path="accounts/:id" element={<ProjectDetail />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

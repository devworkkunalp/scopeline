import { useState, useEffect, useCallback } from 'react';
import { getToken, getUser, clearAuth, api } from './api.js';

import Sidebar from './components/Sidebar.jsx';
import LandingPage from './pages/LandingPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import OnboardingWizard from './pages/OnboardingWizard.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CompanyProjects from './pages/CompanyProjects.jsx';
import Contract from './pages/Contract.jsx';
import ProjectData from './pages/ProjectData.jsx';
import Opportunities from './pages/Opportunities.jsx';
import ChangeOrders from './pages/ChangeOrders.jsx';
import InvoiceTracking from './pages/InvoiceTracking.jsx';
import AiAssistant from './pages/AiAssistant.jsx';

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [user, setUser] = useState(getUser());
  const [workspace, setWorkspace] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    if (!getToken()) return;
    try {
      const list = await api.projects();
      setProjects(list || []);
      if (list && list.length > 0) {
        setActiveProjectId((prev) => {
          if (prev && list.some((p) => p.id === prev)) return prev;
          return list[0].id;
        });
      }
    } catch (err) {
      if (err.message === 'Unauthorized') {
        clearAuth();
        setAuthed(false);
      }
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    try {
      const me = await api.me();
      setUser(me.user);
      setWorkspace(me.workspace || me.company);
      await fetchProjects();
    } catch {
      clearAuth();
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }, [fetchProjects]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  function handleAuthSuccess(res) {
    setAuthed(true);
    setUser({
      id: res.userId,
      email: res.email,
      displayName: res.displayName,
      role: res.role,
      onboarded: res.onboarded,
      onboardingStep: res.onboardingStep,
    });
    setWorkspace({ name: res.workspaceName, id: res.workspaceId });
    fetchProjects();
  }

  function handleOnboardingComplete(res) {
    if (res?.user) setUser(res.user);
    if (res?.workspace) setWorkspace(res.workspace);
    fetchProjects();
  }

  function handleLogout() {
    clearAuth();
    setAuthed(false);
    setUser(null);
    setWorkspace(null);
    setProjects([]);
    setActiveProjectId(null);
  }

  if (loading) {
    return <div className="spinner" style={{ marginTop: '20vh' }} />;
  }

  if (!authed) {
    return <LandingPage onAuthSuccess={handleAuthSuccess} />;
  }

  if (user && !user.onboarded) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  const activeProject = projects.find((p) => p.id === activeProjectId);

  return (
    <div id="app">
      <Sidebar
        page={page}
        setPage={setPage}
        projects={projects}
        activeProjectId={activeProjectId}
        setActiveProjectId={setActiveProjectId}
        user={user}
        workspace={workspace}
        onLogout={handleLogout}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <main className="main">
        {/* Mobile Header Bar — visible only on responsive/mobile screens */}
        <div className="mobile-header-bar">
          <button
            type="button"
            className="mobile-hamburger-btn"
            onClick={() => setMobileNavOpen((o) => !o)}
            aria-label="Toggle Navigation Menu"
          >
            ☰ Menu
          </button>
          <div className="mobile-brand">
            <span className="brand-title">SCOPELINE</span>
            <div className="swatch" />
          </div>
        </div>

        {page === 'dashboard' && (
          <Dashboard
            activeProjectId={activeProjectId}
            setPage={setPage}
            setActiveProjectId={setActiveProjectId}
          />
        )}
        {page === 'projects' && (
          <CompanyProjects
            projects={projects}
            setProjects={setProjects}
            activeProjectId={activeProjectId}
            setActiveProjectId={setActiveProjectId}
            setPage={setPage}
            user={user}
            workspace={workspace}
            refreshUser={refreshUser}
          />
        )}
        {page === 'contract' && (
          <Contract activeProject={activeProject} />
        )}
        {page === 'data' && (
          <ProjectData
            activeProject={activeProject}
            setPage={setPage}
          />
        )}
        {page === 'opportunities' && (
          <Opportunities
            activeProject={activeProject}
            refreshProjects={fetchProjects}
            setPage={setPage}
          />
        )}
        {page === 'change-orders' && (
          <ChangeOrders
            activeProject={activeProject}
            refreshProjects={fetchProjects}
          />
        )}
        {page === 'invoices' && (
          <InvoiceTracking activeProject={activeProject} />
        )}
        {page === 'assistant' && (
          <AiAssistant activeProject={activeProject} />
        )}
      </main>
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
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
import ClientReviewPortal from './pages/ClientReviewPortal.jsx';
import NotificationToast from './components/NotificationToast.jsx';
import NotificationCenter from './components/NotificationCenter.jsx';
import GettingStartedModal from './components/GettingStartedModal.jsx';
import FeedbackModal from './components/FeedbackModal.jsx';

export default function App() {
  // Check for public review portal magic link token (?token=... or /review/:token)
  const urlParams = new URLSearchParams(window.location.search);
  const reviewToken = urlParams.get('token') || (window.location.pathname.startsWith('/review/') ? window.location.pathname.replace('/review/', '') : null);

  const [authed, setAuthed] = useState(!!getToken());
  const [user, setUser] = useState(getUser());
  const [workspace, setWorkspace] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // User Flow Guide & Feedback Modals
  const [showGuide, setShowGuide] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Real-time Inbound Activity & Scope Change Notifications
  const [toasts, setToasts] = useState([]);
  const [notificationHistory, setNotificationHistory] = useState([]);
  const knownOppIdsRef = useRef(new Set());
  const initialSyncDoneRef = useRef(false);

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

  // Reset known opps when activeProjectId changes
  useEffect(() => {
    knownOppIdsRef.current = new Set();
    initialSyncDoneRef.current = false;
  }, [activeProjectId]);

  // Background poller for live inbound emails and newly detected opportunities
  useEffect(() => {
    if (!authed || !activeProjectId) return;

    let isMounted = true;

    async function checkActivity() {
      try {
        const opps = await api.opportunities(activeProjectId);
        if (!isMounted || !Array.isArray(opps)) return;

        if (!initialSyncDoneRef.current) {
          // Record baseline on first fetch
          opps.forEach((o) => knownOppIdsRef.current.add(o.id));
          initialSyncDoneRef.current = true;
          return;
        }

        // Detect new items
        const newOpps = opps.filter((o) => !knownOppIdsRef.current.has(o.id));
        if (newOpps.length > 0) {
          newOpps.forEach((opp) => {
            knownOppIdsRef.current.add(opp.id);
            const isEmail =
              opp.evidence?.some(
                (e) =>
                  e.src?.toLowerCase().includes('inbound') ||
                  e.src?.toLowerCase().includes('email') ||
                  e.src?.toLowerCase().endsWith('.eml')
              ) || opp.desc?.toLowerCase().includes('forwarded');

            const notif = {
              id: opp.id || String(Date.now() + Math.random()),
              type: isEmail ? 'inbound_email' : 'opportunity',
              badge: isEmail ? 'Inbound Email Ingested' : 'Scope Opportunity Detected',
              title: opp.title,
              message: opp.desc
                ? opp.desc.length > 120
                  ? opp.desc.slice(0, 117) + '...'
                  : opp.desc
                : 'New scope item parsed and audited against SOW.',
              billableValue: opp.billable,
              actionLabel: isEmail ? 'Review Opportunity' : 'View Opportunity',
              timeAgo: 'Just now',
              createdAt: new Date(),
              read: false,
            };

            setToasts((prev) => [notif, ...prev.slice(0, 2)]);
            setNotificationHistory((prev) => [notif, ...prev]);
          });

          // Live update project list and counters
          fetchProjects();
        }
      } catch (e) {
        // silent catch
      }
    }

    checkActivity();
    const interval = setInterval(checkActivity, 7000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [authed, activeProjectId, fetchProjects]);

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

  if (reviewToken) {
    return <ClientReviewPortal token={reviewToken} />;
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
  const currentPerspective = workspace?.perspective || activeProject?.perspective || user?.perspective || 'vendor';

  return (
    <div id="app">
      <NotificationToast
        notifications={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
        onAction={(notif) => {
          setPage(notif.type === 'inbound_email' ? 'data' : 'opportunities');
          setToasts((prev) => prev.filter((t) => t.id !== notif.id));
        }}
      />

      {showGuide && (
        <GettingStartedModal
          onClose={() => setShowGuide(false)}
          onNavigate={(pageKey) => setPage(pageKey)}
          perspective={currentPerspective}
        />
      )}

      {showFeedback && (
        <FeedbackModal
          onClose={() => setShowFeedback(false)}
          user={user}
          showToast={(msg) => {
            setToasts((prev) => [
              {
                id: String(Date.now()),
                type: 'feedback',
                badge: 'FEEDBACK RECEIVED',
                title: 'Thank you for your feedback!',
                message: msg,
                timeAgo: 'Just now',
                createdAt: new Date(),
                read: true,
              },
              ...prev,
            ]);
          }}
        />
      )}

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
        onOpenGuide={() => setShowGuide(true)}
        onOpenFeedback={() => setShowFeedback(true)}
      />

      <main className="main">
        {/* Top Real-time System Bar */}
        <div
          className="top-system-bar"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 24px',
            background: '#FFFFFF',
            borderBottom: '1px solid #D8D2C2',
            position: 'sticky',
            top: 0,
            zIndex: 90,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '11px',
                fontFamily: "'IBM Plex Mono', monospace",
                color: '#5C6B73',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {activeProject ? `${activeProject.name}` : 'Scopeline'}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '10.5px',
                color: '#2F6F4E',
                background: '#D8E8DD',
                padding: '2px 8px',
                borderRadius: '3px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 600,
              }}
              title="CloudMailin Webhook Listening at 4d5fcfd49f452cf19bbf@cloudmailin.net"
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#10B981',
                  display: 'inline-block',
                  boxShadow: '0 0 6px #10B981',
                }}
              />
              LIVE INBOX LISTENER ACTIVE
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              style={{
                background: '#EFEBE1',
                border: '1px solid #D8D2C2',
                color: '#14213D',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              <span>🚀</span>
              <span>Quickstart Guide</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFeedback(true)}
              style={{
                background: 'rgba(232, 93, 46, 0.08)',
                border: '1px solid #E85D2E',
                color: '#E85D2E',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              <span>💡</span>
              <span>Feedback</span>
            </button>

            <NotificationCenter
              notifications={notificationHistory}
              onClear={() => setNotificationHistory([])}
              onSelect={(notif) => {
                setPage(notif.type === 'inbound_email' ? 'data' : 'opportunities');
              }}
              activeProject={activeProject}
            />
          </div>
        </div>

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
            perspective={currentPerspective}
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
          <InvoiceTracking activeProject={activeProject} refreshProjects={fetchProjects} />
        )}
        {page === 'assistant' && (
          <AiAssistant activeProject={activeProject} />
        )}
      </main>
    </div>
  );
}

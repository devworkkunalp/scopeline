// Sidebar for Scopeline
export default function Sidebar({
  page,
  setPage,
  projects,
  activeProjectId,
  setActiveProjectId,
  user,
  workspace,
  onLogout,
  mobileOpen,
  onCloseMobile,
}) {
  const activeProject = projects?.find((p) => p.id === activeProjectId);
  const perspective = activeProject?.perspective || workspace?.perspective || user?.perspective || 'vendor';
  const isClient = perspective === 'client';

  const navItem = (num, label, key) => (
    <button
      key={key}
      className={`nav-item${page === key ? ' active' : ''}`}
      onClick={() => {
        setPage(key);
        onCloseMobile?.();
      }}
      id={`nav-${key}`}
    >
      <span className="num">{num}</span>
      {label}
    </button>
  );

  return (
    <>
      {mobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <div className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="brand">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="mark">
              <div className="swatch" style={isClient ? { background: '#3B82F6' } : {}} />
              <h1>SCOPELINE</h1>
            </div>
            {mobileOpen && (
              <button
                type="button"
                className="mobile-close-btn"
                onClick={onCloseMobile}
                aria-label="Close Menu"
              >
                &times;
              </button>
            )}
          </div>
          <div className="tag" style={isClient ? { color: '#93C5FD' } : {}}>
            {isClient ? '🛡️ Client Shield Edition' : '🏢 Agency Edition'}
          </div>
        </div>

        {/* Project / Engagement Switcher */}
        {projects && projects.length > 0 && (
          <div style={{ padding: '10px 14px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div
              style={{
                fontSize: 9.5,
                letterSpacing: '0.1em',
                color: '#8C9AB5',
                padding: '2px 0 6px',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              {isClient ? 'Active Vendor Engagement' : 'Active Project'}
            </div>
            <div className="sidebar-select-wrapper">
              <select
                value={activeProjectId || ''}
                onChange={(e) => setActiveProjectId(e.target.value)}
                className="sidebar-project-select"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} style={{ background: '#14213D', color: '#fff' }}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="nav">
          <div className="group-label">Overview</div>
          {navItem('05', isClient ? 'Scope Defense Dashboard' : 'Revenue Dashboard', 'dashboard')}

          <div className="group-label">Setup</div>
          {navItem('01', isClient ? 'Workspace & Vendors' : 'Workspace & Projects', 'projects')}
          {navItem('02', isClient ? 'Baseline SOW Contract' : 'Scope of Work', 'contract')}
          {navItem('03', isClient ? 'Vendor Correspondence' : 'Project Activity', 'data')}

          <div className="group-label">{isClient ? 'Audit & Defense' : 'Recovery Workflow'}</div>
          {navItem('04', isClient ? 'Scope & Overbilling Audit' : 'Scope Opportunities', 'opportunities')}
          {navItem('05', isClient ? 'Vendor Change Claims' : 'Change Requests', 'change-orders')}
          {navItem('06', isClient ? 'Vendor Invoices' : 'Invoice Tracking', 'invoices')}

          <div className="group-label">Ask</div>
          {navItem('07', 'AI Assistant', 'assistant')}
        </nav>

        {/* Footer */}
        <div className="sidebar-foot">
          <div className="co">{workspace?.name || user?.workspaceName || 'Nimbus Digital'}</div>
          <div style={{ color: '#10B981', fontSize: 11, fontWeight: 600 }}>
            {workspace?.plan || (user?.trialDaysRemaining ? `30-Day Trial (${user.trialDaysRemaining}d left)` : '30-Day Free Trial')}
          </div>
          <div className="who">
            <span>{user?.displayName || user?.email?.split('@')[0] || 'You'}</span>
            <button className="logout" onClick={onLogout}>
              Log out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

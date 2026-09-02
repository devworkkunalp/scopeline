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
              <div className="swatch" />
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
          <div className="tag">Scope &amp; Revenue Recovery</div>
        </div>

        {/* Project switcher */}
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
              Active Project
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
          {navItem('05', 'Revenue Dashboard', 'dashboard')}

          <div className="group-label">Setup</div>
          {navItem('01', 'Workspace & Projects', 'projects')}
          {navItem('02', 'Scope of Work', 'contract')}
          {navItem('03', 'Project Activity', 'data')}

          <div className="group-label">Recovery Workflow</div>
          {navItem('04', 'Scope Opportunities', 'opportunities')}
          {navItem('05', 'Change Requests', 'change-orders')}
          {navItem('06', 'Invoice Tracking', 'invoices')}

          <div className="group-label">Ask</div>
          {navItem('07', 'AI Assistant', 'assistant')}
        </nav>

        {/* Footer */}
        <div className="sidebar-foot">
          <div className="co">{workspace?.name || user?.workspaceName || 'Nimbus Digital'}</div>
          <div>{workspace?.plan || 'Team Plan · Trial'}</div>
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

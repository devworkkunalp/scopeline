// TitleBlock — page header row with title + project meta strip
export default function TitleBlock({ title, sub, project, onToggleMobile }) {
  return (
    <div className="titleblock">
      <div className="titleblock-main">
        {onToggleMobile && (
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={onToggleMobile}
            aria-label="Toggle Navigation Menu"
          >
            ☰
          </button>
        )}
        <div>
          <h2>{title}</h2>
          {sub && <div className="sub">{sub}</div>}
        </div>
      </div>

      {project && (
        <div className="titleblock-meta-chips">
          <div className="meta-chip">
            <span className="chip-label">PROJECT</span>
            <span className="chip-val" title={project.name}>{project.name}</span>
          </div>
          <div className="meta-chip">
            <span className="chip-label">CLIENT</span>
            <span className="chip-val" title={project.client || project.clientName}>{project.client || project.clientName || '—'}</span>
          </div>
          <div className="meta-chip">
            <span className="chip-label">SCOPE VALUE</span>
            <span className="chip-val mono">{fmt(project.value || project.scopeValue, project.currency)}</span>
          </div>
          <div className="meta-chip hide-on-mobile">
            <span className="chip-label">STATUS</span>
            <span className="chip-val mono" style={{ color: 'var(--green)' }}>● LIVE</span>
          </div>
        </div>
      )}
    </div>
  );
}

function fmt(n, currency = 'USD') {
  if (!n && n !== 0) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

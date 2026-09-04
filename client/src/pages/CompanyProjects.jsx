import { useState } from 'react';
import { api } from '../api.js';
import TitleBlock from '../components/TitleBlock.jsx';
import NewProjectModal from '../components/NewProjectModal.jsx';

const fmt = (n, cur = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n || 0);

export default function CompanyProjects({
  projects,
  setProjects,
  activeProjectId,
  setActiveProjectId,
  setPage,
  user,
  workspace,
  refreshUser,
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingWs, setEditingWs] = useState(false);
  const [wsName, setWsName] = useState(workspace?.name || 'Nimbus Digital');
  const [toast, setToast] = useState('');

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  function handleCreated(proj) {
    setProjects((prev) => [proj, ...prev]);
    setActiveProjectId(proj.id);
  }

  async function handleRenameWorkspace(e) {
    e.preventDefault();
    try {
      await api.updateWorkspace(wsName);
      refreshUser?.();
      setEditingWs(false);
      showToast('Workspace renamed successfully');
    } catch (ex) {
      showToast(ex.message || 'Failed to rename workspace');
    }
  }

  return (
    <>
      <TitleBlock
        title="Workspace & Projects"
        sub="Every project belongs here before any data or analysis"
      />
      {toast && <div className="toast">{toast}</div>}
      <div className="content">
        {/* Workspace banner */}
        <section className="block">
          <div className="block-head">
            <h3>Workspace</h3>
          </div>
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 16 }}>
                {workspace?.name || user?.workspaceName || 'Nimbus Digital'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--steel)', marginTop: 2 }}>
                {projects.length} projects · {workspace?.plan || 'Team Plan · Trial'}
              </div>
            </div>
            <button
              className="btn ghost small"
              onClick={() => { setWsName(workspace?.name || 'Nimbus Digital'); setEditingWs(true); }}
            >
              Rename Workspace
            </button>
          </div>
        </section>

        {/* Projects grid */}
        <section className="block">
          <div className="block-head">
            <h3>Projects ({projects.length})</h3>
            <button
              className="btn orange small"
              onClick={() => setShowModal(true)}
              id="btn-new-project"
            >
              + New Project
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="empty">
              <h4>No projects yet</h4>
              Create your first project to begin tracking scope.
            </div>
          ) : (
            <div className="grid cols-3">
              {projects.map((p) => {
                const oppTotal = p.oppTotal || 0;
                return (
                  <div
                    key={p.id}
                    className={`project-card${p.id === activeProjectId ? ' active' : ''}`}
                    onClick={() => {
                      setActiveProjectId(p.id);
                      setPage(p.contractUploaded ? 'opportunities' : 'contract');
                    }}
                    id={`proj-card-${p.id}`}
                    style={{ borderColor: p.id === activeProjectId ? 'var(--orange)' : undefined }}
                  >
                    {p.atRisk > 0 && <div className="flag">{fmt(p.atRisk)} AT RISK</div>}
                    <div className="pc-top">
                      <div>
                        <h4>{p.name}</h4>
                        <div className="client">{p.client || p.clientName || '—'}</div>
                      </div>
                      <span className="tag-type">{p.status}</span>
                    </div>
                    <div className="row">
                      <span>Scope Value</span>
                      <span className="v">{fmt(p.value || p.scopeValue, p.currency)}</span>
                    </div>
                    <div className="row">
                      <span>Dates</span>
                      <span className="v">
                        {p.start || '2025-06-01'} → {p.end || 'TBD'}
                      </span>
                    </div>
                    <div className="row">
                      <span>Revenue Found</span>
                      <span className="v" style={{ color: oppTotal > 0 ? 'var(--orange)' : 'var(--steel)' }}>
                        {oppTotal > 0 ? fmt(oppTotal) : '—'}
                      </span>
                    </div>
                    {oppTotal > 0 && (p.value || p.scopeValue) > 0 && (
                      <div className="row">
                        <span>SOW Drift</span>
                        <span className="v mono" style={{ color: (oppTotal / (p.value || p.scopeValue)) >= 0.15 ? '#DC2626' : 'var(--navy)', fontWeight: 600 }}>
                          +{Math.round((oppTotal / (p.value || p.scopeValue)) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}

      {editingWs && (
        <div className="modal-backdrop open" onClick={() => setEditingWs(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-head">
              <h3>RENAME WORKSPACE</h3>
              <button onClick={() => setEditingWs(false)}>&times;</button>
            </div>
            <form onSubmit={handleRenameWorkspace}>
              <div className="modal-body">
                <div className="field">
                  <label className="field-label">Workspace / Agency Name</label>
                  <input
                    type="text"
                    value={wsName}
                    onChange={(e) => setWsName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn ghost" onClick={() => setEditingWs(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn orange">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

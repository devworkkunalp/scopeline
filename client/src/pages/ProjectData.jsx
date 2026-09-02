import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import TitleBlock from '../components/TitleBlock.jsx';
import ScopeCheckerModal from '../components/ScopeCheckerModal.jsx';
import MomLoggerModal from '../components/MomLoggerModal.jsx';

const EXT_CLASSES = {
  pdf: 'pdf',
  xls: 'xls',
  doc: 'doc',
  img: 'img',
  eml: 'eml',
  chat: 'chat',
  tkt: 'tkt',
};

export default function ProjectData({ activeProject, setPage }) {
  const [docs, setDocs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showChecker, setShowChecker] = useState(false);
  const [showMomLogger, setShowMomLogger] = useState(false);
  const [toast, setToast] = useState('');
  const [err, setErr] = useState('');
  const fileRef = useRef();

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  useEffect(() => {
    if (!activeProject) return;
    setLoading(true);
    Promise.all([
      api.documents(activeProject.id),
      api.events(activeProject.id),
    ])
      .then(([d, e]) => {
        setDocs(d || []);
        setEvents(e || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeProject?.id]);

  async function handleUpload(files) {
    if (!activeProject || !files.length) return;
    setUploading(true);
    setErr('');
    try {
      const updated = await api.uploadDocs(activeProject.id, Array.from(files));
      setDocs(updated);
      showToast(`${files.length} document${files.length > 1 ? 's' : ''} uploaded`);
    } catch (e) {
      setErr(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files);
  }

  async function handleDelete(docId) {
    if (!activeProject) return;
    try {
      await api.deleteDoc(activeProject.id, docId);
      setDocs((prev) => prev.filter((d) => d.id !== docId));
      showToast('Document removed');
    } catch (e) {
      showToast('Could not delete document: ' + e.message);
    }
  }

  async function handleAnalyze() {
    if (!activeProject) return;
    setAnalyzing(true);
    setErr('');
    try {
      const job = await api.analyze(activeProject.id);
      showToast('Analysis completed. Reviewing opportunities.');
      setPage('opportunities');
    } catch (e) {
      setErr(e.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }

  if (!activeProject) {
    return (
      <div className="content">
        <div className="empty">Select a project.</div>
      </div>
    );
  }

  return (
    <>
      <TitleBlock
        title="Project Activity"
        sub="Ingested delivery, financial and correspondence records"
        project={activeProject}
      />
      {toast && <div className="toast">{toast}</div>}
      <div className="content">
        {/* Upload zone */}
        <section className="block">
          <div
            className="upload-zone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => fileRef.current.click()}
            id="doc-upload-zone"
          >
            {uploading ? (
              <>
                <div className="spinner" style={{ margin: '0 auto 10px' }} />
                Ingesting project activity…
              </>
            ) : (
              <>
                <h4>Import project activity</h4>
                <p>
                  Drag files here, or log post-meeting MOM notes, emails, and chat asks with rule-based proof verification.
                </p>
                <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn orange small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMomLogger(true);
                    }}
                  >
                    📝 + Log Post-Meeting MOM
                  </button>
                  <button
                    type="button"
                    className="btn small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMomLogger(true);
                    }}
                  >
                    ✉️ Forward Email / Drop-In
                  </button>
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowChecker(true);
                    }}
                  >
                    ⚡ Check Scope Coverage
                  </button>
                  <button type="button" className="btn ghost small">
                    📂 Upload Files
                  </button>
                </div>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.eml,.json,.txt,.png,.jpg,.jpeg"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files.length) handleUpload(e.target.files);
              e.target.value = '';
            }}
          />
          {err && <div className="error" style={{ marginTop: 8 }}>{err}</div>}
        </section>

        {loading && <div className="spinner" />}

        {/* Document list */}
        {!loading && (
          <section className="block">
            <div className="block-head">
              <h3>Ingested Activity ({docs.length})</h3>
              {docs.length > 0 && (
                <button
                  className="btn ghost small"
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  id="btn-run-analysis"
                >
                  {analyzing ? 'Analyzing…' : 'Run AI Analysis →'}
                </button>
              )}
            </div>

            {docs.length === 0 ? (
              <div className="empty">
                <h4>No project activity yet</h4>
                Upload tickets, chat exports, invoices or emails to begin analysis.
              </div>
            ) : (
              docs.map((d) => (
                <div key={d.id} className="doc-row">
                  <span className={`ext ${EXT_CLASSES[d.type] || 'doc'}`}>
                    {(d.type || 'DOC').toUpperCase()}
                  </span>
                  <span className="name">{d.name}</span>
                  <span className="meta">
                    {d.date} · {d.size}
                  </span>
                </div>
              ))
            )}
          </section>
        )}

        {/* Extracted events timeline */}
        {!loading && events.length > 0 && (
          <section className="block">
            <div className="block-head">
              <h3>Extracted Events</h3>
              <div className="hint">
                events, costs, instructions and dates pulled from the activity above
              </div>
            </div>
            <div className="timeline">
              {events.slice(0, 15).map((ev) => (
                <div key={ev.id} className="t-item">
                  <div className="date">
                    {ev.eventDate
                      ? new Date(ev.eventDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Event date'}
                  </div>
                  <div className="desc">
                    {ev.description}{' '}
                    {ev.eventType && <span className="tag-type">{ev.eventType}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {showChecker && (
        <ScopeCheckerModal
          activeProject={activeProject}
          onClose={() => setShowChecker(false)}
          onAdded={(opp, isCR) => {
            showToast(isCR ? 'Change Request generated.' : 'Opportunity added to review.');
            setTimeout(() => setPage(isCR ? 'change-orders' : 'opportunities'), 600);
          }}
        />
      )}

      {showMomLogger && (
        <MomLoggerModal
          activeProject={activeProject}
          onClose={() => setShowMomLogger(false)}
          onAdded={(opp, isCR) => {
            showToast(isCR ? 'Change Request with proof generated.' : 'Scope opportunity added.');
            setTimeout(() => setPage(isCR ? 'change-orders' : 'opportunities'), 600);
          }}
        />
      )}
    </>
  );
}

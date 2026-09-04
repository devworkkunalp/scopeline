import { useEffect, useState } from 'react';
import { api } from '../api.js';
import TitleBlock from '../components/TitleBlock.jsx';
import EvidenceModal from '../components/EvidenceModal.jsx';
import DefenseLetterModal from '../components/DefenseLetterModal.jsx';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

export default function ChangeOrders({ activeProject, refreshProjects }) {
  const [opps, setOpps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [defenseOpp, setDefenseOpp] = useState(null);
  const [editCr, setEditCr] = useState(null);
  const [shareCr, setShareCr] = useState(null);
  const [shareData, setShareData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState('');

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  useEffect(() => {
    if (!activeProject) return;
    setLoading(true);
    api.opportunities(activeProject.id)
      .then(setOpps)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeProject?.id]);

  const readyToGenerate = opps.filter((o) => o.status === 'confirmed' && !o.changeRequest && !o.changeOrder);
  const withCR = opps.filter((o) => o.changeRequest || o.changeOrder);

  async function generateCR(opp) {
    setBusy(opp.id);
    try {
      const updated = await api.generateCo(opp.id);
      setOpps((prev) => prev.map((o) => (o.id === opp.id ? updated : o)));
      showToast(`Change request ${updated.changeRequest?.number || 'draft'} created.`);
      refreshProjects?.();
    } catch (ex) {
      showToast(ex.message || 'Error');
    } finally {
      setBusy('');
    }
  }

  async function saveCrEdits() {
    if (!editCr) return;
    setBusy('save');
    try {
      const updated = await api.patchCo(editCr.id, {
        reason: editCr.reason,
        changedScope: editCr.changedScope,
        costBreakdown: editCr.costBreakdown,
        billableValue: parseFloat(editCr.billable) || undefined,
      });
      setOpps((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      setEditCr(null);
      showToast('Change request saved.');
    } catch (ex) {
      showToast(ex.message || 'Error');
    } finally {
      setBusy('');
    }
  }

  async function approveCR(opp) {
    const crId = opp.changeRequest?.id || opp.changeOrder?.id;
    if (!crId) return;
    setBusy(opp.id + 'app');
    try {
      const updated = await api.patchCo(crId, { status: 'approved' });
      setOpps((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      showToast('Change request marked as approved.');
      refreshProjects?.();
    } catch (ex) {
      showToast(ex.message || 'Error');
    } finally {
      setBusy('');
    }
  }

  async function downloadPdf(cr) {
    try {
      setBusy(cr.id + 'pdf');
      const blob = await api.coExport(cr.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cr.number || 'Change_Order'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      showToast(`Downloaded ${cr.number || 'Change Order'}.pdf`);
    } catch (ex) {
      showToast('PDF Export Error: ' + ex.message);
    } finally {
      setBusy('');
    }
  }

  async function openShareModal(cr, opp) {
    setBusy(cr.id + 'share');
    try {
      const res = await api.getShareLink(cr.id);
      setShareCr({ ...cr, opp });
      // Construct public review URL
      const origin = window.location.origin;
      const fullUrl = `${origin}/?token=${res.approvalToken}`;
      setShareData({ ...res, fullUrl });
    } catch (ex) {
      showToast('Error getting share link: ' + ex.message);
    } finally {
      setBusy('');
    }
  }

  function copyShareUrl() {
    if (!shareData?.fullUrl) return;
    navigator.clipboard.writeText(shareData.fullUrl);
    setCopied(true);
    showToast('Magic review link copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
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
        title="Change Requests"
        sub="Draft, submitted and approved scope-change documents"
        project={activeProject}
      />
      {toast && <div className="toast">{toast}</div>}
      <div className="content">
        {/* Ready to draft */}
        {readyToGenerate.length > 0 && (
          <section className="block">
            <div className="block-head">
              <h3>Ready To Draft</h3>
              <div className="hint">
                confirmed opportunities without a change request yet
              </div>
            </div>
            {readyToGenerate.map((opp) => (
              <div key={opp.id} className="opp-card" style={{ marginBottom: 12 }}>
                <div className="oc-top">
                  <div>
                    <span className="tag-type">{opp.type}</span>
                    <h4 style={{ marginTop: 6 }}>{opp.title}</h4>
                    <div className="desc">{opp.desc}</div>
                  </div>
                  <span className="stamp confirmed">Confirmed</span>
                </div>
                <div
                  className="foot"
                  style={{ borderTop: 'none', paddingTop: 8, justifyContent: 'flex-end' }}
                >
                  <button
                    className="btn orange small"
                    onClick={() => generateCR(opp)}
                    disabled={busy === opp.id}
                    id={`btn-gen-cr-${opp.id}`}
                  >
                    {busy === opp.id ? 'Generating…' : 'Generate Draft Change Request →'}
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Change requests on file */}
        <section className="block">
          <div className="block-head">
            <h3>Change Requests on File</h3>
          </div>

          {loading && <div className="spinner" />}
          {!loading && withCR.length === 0 && (
            <div className="empty">
              <h4>No change requests yet</h4>
              Confirm an opportunity to draft one.
            </div>
          )}

          {withCR.map((opp) => {
            const cr = opp.changeRequest || opp.changeOrder;
            const sowRef = opp.clause ? opp.clause.split('—')[0].trim() : '§5';

            return (
              <div key={opp.id} className="card" style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--steel)', letterSpacing: '0.05em' }}>
                      {cr.number}
                    </div>
                    <h4
                      style={{
                        fontFamily: "'IBM Plex Sans', sans-serif",
                        textTransform: 'none',
                        letterSpacing: 0,
                        fontSize: 15,
                        color: 'var(--navy)',
                        marginTop: 3,
                      }}
                    >
                      {opp.title}
                    </h4>
                  </div>
                  <span className={`stamp ${cr.status === 'approved' ? 'approved' : 'change-order'}`}>
                    {cr.status}
                  </span>
                </div>

                <div className="grid cols-4" style={{ marginTop: 14 }}>
                  <div>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--steel)' }}>Reason</div>
                    <div style={{ fontSize: 12.5, marginTop: 3 }}>{cr.reason || opp.type}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--steel)' }}>SOW Reference</div>
                    <div style={{ fontSize: 12.5, marginTop: 3 }}>{sowRef}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--steel)' }}>Submitted</div>
                    <div className="mono" style={{ fontSize: 12.5, marginTop: 3 }}>{cr.submitted || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--steel)' }}>Proposed Value</div>
                    <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--orange)', marginTop: 3 }}>
                      {fmt(opp.billable)}
                    </div>
                  </div>
                </div>

                {cr.changedScope && (
                  <div style={{ fontSize: 12.5, color: 'var(--steel)', marginTop: 12, borderLeft: '3px solid var(--line)', paddingLeft: 10 }}>
                    {cr.changedScope}
                  </div>
                )}

                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: '1px solid var(--paper-2)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <button className="btn ghost small" onClick={() => setSelected(opp)}>
                    View Supporting Evidence
                  </button>
                  <button
                    className="btn ghost small"
                    onClick={() => setDefenseOpp(opp)}
                    id={`btn-defense-cr-${cr.id}`}
                    title="Generate formal SOW scope defense letter or commercial notice"
                  >
                    🛡️ Scope Defense Notice
                  </button>
                  <button
                    className="btn ghost small"
                    onClick={() => openShareModal(cr, opp)}
                    disabled={busy === cr.id + 'share'}
                    id={`btn-share-cr-${cr.id}`}
                  >
                    {busy === cr.id + 'share' ? 'Loading…' : '🔗 Share Approval Link'}
                  </button>
                  <button
                    className="btn ghost small"
                    onClick={() => downloadPdf(cr)}
                    disabled={busy === cr.id + 'pdf'}
                  >
                    {busy === cr.id + 'pdf' ? 'Generating PDF…' : '📄 Export PDF'}
                  </button>
                  <button
                    className="btn ghost small"
                    onClick={() =>
                      setEditCr({
                        id: cr.id,
                        reason: cr.reason || '',
                        changedScope: cr.changedScope || '',
                        costBreakdown: cr.costBreakdown || '',
                        billable: opp.billable,
                      })
                    }
                  >
                    Edit
                  </button>
                  {cr.status !== 'approved' && (
                    <button
                      className="btn orange small"
                      onClick={() => approveCR(opp)}
                      disabled={busy === opp.id + 'app'}
                    >
                      {busy === opp.id + 'app' ? 'Approving…' : 'Mark Approved'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </div>

      {selected && <EvidenceModal opp={selected} onClose={() => setSelected(null)} />}

      {/* Scope Defense Letter Modal */}
      {defenseOpp && (
        <DefenseLetterModal
          project={activeProject}
          opp={defenseOpp}
          onClose={() => setDefenseOpp(null)}
        />
      )}

      {/* Share Approval Link Modal */}
      {shareCr && shareData && (
        <div className="modal-backdrop open" onClick={() => setShareCr(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>🔗</span>
                <h3>CLIENT MAGIC APPROVAL LINK</h3>
              </div>
              <button onClick={() => setShareCr(null)}>&times;</button>
            </div>
            <div className="modal-body" style={{ gap: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--steel)', margin: 0, lineHeight: 1.5 }}>
                Share this secure magic link directly with your client sponsor or procurement team. They can inspect the <strong>3-Way Grounded Proof</strong>, review baseline contract exclusions, and execute an <strong>E-Signature</strong> without logging in.
              </p>

              {/* Status Badge */}
              <div style={{ background: 'var(--paper-2)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--steel)' }}>Current Status</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: shareData.status === 'approved' ? 'var(--emerald)' : 'var(--orange)', marginTop: 2 }}>
                    {shareData.status === 'approved' ? '✓ Approved & Executed' : 'Awaiting Client E-Signature'}
                  </div>
                </div>
                {shareData.signedBy && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--steel)' }}>Signed By</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{shareData.signedBy}</div>
                  </div>
                )}
              </div>

              {/* Link Box */}
              <div className="field">
                <label className="field-label">Public Review & E-Signature URL</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <input
                    type="text"
                    readOnly
                    value={shareData.fullUrl}
                    style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, background: 'var(--paper-1)', color: 'var(--navy)' }}
                  />
                  <button
                    className="btn orange small"
                    onClick={copyShareUrl}
                    style={{ minWidth: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                  >
                    {copied ? '✓ Copied!' : '📋 Copy'}
                  </button>
                </div>
              </div>

              {/* Preview Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--paper-2)' }}>
                <a
                  href={shareData.fullUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 13, color: 'var(--orange)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  ↗️ Open Client Review Portal Preview
                </a>
                <button className="btn ghost small" onClick={() => setShareCr(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editCr && (
        <div className="modal-backdrop open" onClick={() => setEditCr(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-head">
              <h3>EDIT CHANGE REQUEST</h3>
              <button onClick={() => setEditCr(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label className="field-label">Reason / Category</label>
                <input
                  type="text"
                  value={editCr.reason}
                  onChange={(e) => setEditCr((p) => ({ ...p, reason: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="field-label">Changed Scope Description</label>
                <textarea
                  rows={3}
                  value={editCr.changedScope}
                  onChange={(e) => setEditCr((p) => ({ ...p, changedScope: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="field-label">Cost Breakdown</label>
                <textarea
                  rows={2}
                  value={editCr.costBreakdown}
                  onChange={(e) => setEditCr((p) => ({ ...p, costBreakdown: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="field-label">Proposed Value ($)</label>
                <input
                  type="number"
                  value={editCr.billable}
                  onChange={(e) => setEditCr((p) => ({ ...p, billable: e.target.value }))}
                />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn ghost" onClick={() => setEditCr(null)}>
                Cancel
              </button>
              <button className="btn orange" onClick={saveCrEdits} disabled={busy === 'save'}>
                {busy === 'save' ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

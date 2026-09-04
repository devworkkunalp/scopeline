import { useEffect, useState } from 'react';
import { api } from '../api.js';
import TitleBlock from '../components/TitleBlock.jsx';
import EvidenceModal from '../components/EvidenceModal.jsx';
import ScopeCheckerModal from '../components/ScopeCheckerModal.jsx';
import DefenseLetterModal from '../components/DefenseLetterModal.jsx';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

const STATUS_ORDER = ['detected', 'review', 'confirmed', 'change-order', 'approved', 'invoiced', 'paid', 'rejected'];

const STAMP_LABELS = {
  detected: 'Detected',
  review: 'Review',
  confirmed: 'Confirmed',
  'change-order': 'Change Request',
  approved: 'Approved',
  invoiced: 'Invoiced',
  paid: 'Paid',
  rejected: 'Rejected',
};

export default function Opportunities({ activeProject, refreshProjects, setPage }) {
  const [opps, setOpps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [defenseOpp, setDefenseOpp] = useState(null);
  const [showChecker, setShowChecker] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
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

  async function changeStatus(opp, status, reason) {
    setBusy(opp.id + status);
    try {
      const updated = await api.setStatus(opp.id, status, reason);
      setOpps((prev) => prev.map((o) => (o.id === opp.id ? updated : o)));
      showToast(`Status updated → ${STAMP_LABELS[status] || status}`);
      refreshProjects?.();
    } catch (ex) {
      showToast(ex.message || 'Error');
    } finally {
      setBusy('');
    }
  }

  async function generateCR(opp) {
    setBusy(opp.id + 'co');
    try {
      const updated = await api.generateCo(opp.id);
      setOpps((prev) => prev.map((o) => (o.id === opp.id ? updated : o)));
      showToast('Change request draft generated.');
      refreshProjects?.();
      setTimeout(() => setPage('change-orders'), 800);
    } catch (ex) {
      showToast(ex.message || 'Error');
    } finally {
      setBusy('');
    }
  }

  const allFiltered = filter === 'all' ? opps : opps.filter((o) => o.status === filter);
  const totalBillable = allFiltered.reduce((s, o) => s + (o.billable || 0), 0);

  const counts = {};
  for (const o of opps) counts[o.status] = (counts[o.status] || 0) + 1;

  const TABS = [
    { key: 'all', label: `All (${opps.length})` },
    ...STATUS_ORDER.filter((s) => counts[s] || s === 'review' || s === 'confirmed').map((s) => ({
      key: s,
      label: `${STAMP_LABELS[s]} (${counts[s] || 0})`,
    })),
  ];

  if (!activeProject) {
    return (
      <div className="content">
        <div className="empty">Select a project.</div>
      </div>
    );
  }
  const isClient = activeProject?.perspective === 'client';

  return (
    <>
      <TitleBlock
        title={isClient ? 'Scope & Overbilling Audit' : 'Scope Opportunities'}
        sub={
          isClient
            ? `Cross-referencing vendor claims for ${activeProject?.name || 'project'} against SOW deliverables`
            : `Detected unbilled work for ${activeProject?.name || 'project'}`
        }
      />

      <div className="content">
        {/* Filter bar + Action */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div className="filter-bar">
            <button
              className={`pill${filter === 'all' ? ' active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({opps.length})
            </button>
            {STATUS_ORDER.map((st) => (
              <button
                key={st}
                className={`pill${filter === st ? ' active' : ''}`}
                onClick={() => setFilter(st)}
              >
                {isClient && st === 'confirmed' ? 'Challenged' : isClient && st === 'approved' ? 'Authorized' : STAMP_LABELS[st]} ({counts[st] || 0})
              </button>
            ))}
          </div>
          <button
            className={`btn small ${isClient ? '' : 'orange'}`}
            style={isClient ? { background: '#2563EB', color: '#fff', border: 'none' } : {}}
            onClick={() => setShowChecker(true)}
          >
            {isClient ? '+ Audit Vendor Claim / Check SOW' : '+ Log Client Ask / Check Scope'}
          </button>
        </div>

        <div
          className="hint"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            color: 'var(--steel)',
            marginBottom: 14,
          }}
        >
          {isClient
            ? `Showing ${allFiltered.length} vendor claims · ${fmt(totalBillable)} exposure under audit`
            : `Showing ${allFiltered.length} opportunities · ${fmt(totalBillable)} billable value`}
        </div>

        {loading && <div className="spinner" />}

        {!loading && allFiltered.length === 0 && (
          <div className="empty">
            <h4>{isClient ? 'No vendor claims under this status' : 'No opportunities in this status'}</h4>
            {filter === 'all'
              ? isClient
                ? 'Run AI analysis from Project Activity to audit incoming vendor correspondence.'
                : 'Run AI analysis from Project Activity to detect out-of-scope work.'
              : `No ${STAMP_LABELS[filter] || filter} items.`}
          </div>
        )}

        {allFiltered.map((opp) => (
          <OppCard
            key={opp.id}
            opp={opp}
            busy={busy}
            isClient={isClient}
            onViewEvidence={() => setSelected(opp)}
            onDefenseLetter={() => setDefenseOpp(opp)}
            onConfirm={() => changeStatus(opp, 'confirmed')}
            onReject={() => {
              setRejectId(opp.id);
              setRejectReason('');
            }}
            onGenerateCR={() => generateCR(opp)}
            onGotoInvoicing={() => setPage('invoices')}
          />
        ))}
      </div>

      {/* Defense Letter Modal */}
      {defenseOpp && (
        <DefenseLetterModal
          project={activeProject}
          opp={defenseOpp}
          onClose={() => setDefenseOpp(null)}
        />
      )}

      {/* Evidence Modal */}
      {selected && (
        <EvidenceModal
          opp={selected}
          projectId={activeProject?.id}
          perspective={activeProject?.perspective || 'vendor'}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Reject Modal */}
      {rejectId && (
        <div className="modal-backdrop open" onClick={() => setRejectId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-head">
              <h3>DISMISS OPPORTUNITY</h3>
              <button onClick={() => setRejectId(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label className="field-label">Reason for rejection (audit trail)</label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Determined vendor-side error, not billable"
                />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn ghost" onClick={() => setRejectId(null)}>
                Cancel
              </button>
              <button
                className="btn orange"
                onClick={() => {
                  const opp = opps.find((o) => o.id === rejectId);
                  changeStatus(opp, 'rejected', rejectReason);
                  setRejectId(null);
                }}
              >
                Confirm Dismissal
              </button>
            </div>
          </div>
        </div>
      )}

      {showChecker && (
        <ScopeCheckerModal
          activeProject={activeProject}
          onClose={() => setShowChecker(false)}
          onAdded={(opp, isCR) => {
            setOpps((prev) => [opp, ...prev]);
            showToast(isCR ? 'Change Request generated.' : 'Opportunity added to review.');
            refreshProjects?.();
            if (isCR) setPage('change-orders');
          }}
        />
      )}
    </>
  );
}

function OppCard({ opp, busy, isClient, onViewEvidence, onDefenseLetter, onConfirm, onReject, onGenerateCR, onGotoInvoicing }) {
  const pct = Math.round((opp.confidence || 0) * 100);
  const isDetected = opp.status === 'detected';
  const isReview = opp.status === 'review';
  const isConfirmed = opp.status === 'confirmed';
  const isApproved = opp.status === 'approved';
  const clauseRef = opp.clause ? opp.clause.split('—')[0].trim() : '§5';

  return (
    <div className="opp-card" id={`opp-${opp.id}`}>
      <div className="oc-top">
        <div>
          <span className="tag-type">{opp.type}</span>
          <h4 style={{ marginTop: 6 }}>{opp.title}</h4>
          <div className="desc">{opp.desc}</div>
        </div>
        <span className={`stamp ${opp.status}`}>
          {STAMP_LABELS[opp.status] || opp.status}
        </span>
      </div>

      <div className="figures">
        <div>
          <div className="l">Estimated Cost</div>
          <div className="v">{fmt(opp.estCost)}</div>
        </div>
        <div>
          <div className="l">Potential Billable</div>
          <div className="v" style={{ color: 'var(--orange)' }}>
            {fmt(opp.billable)}
          </div>
        </div>
        <div>
          <div className="l">Confidence</div>
          <div className="v">
            <span className="confidence-bar">
              <span style={{ width: `${pct}%` }}></span>
            </span>
            {pct}%
          </div>
        </div>
        <div>
          <div className="l">SOW Reference</div>
          <div className="v mono" style={{ fontSize: 11.5, fontWeight: 500 }}>
            {clauseRef}
          </div>
        </div>
      </div>

      <div className="foot">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className="btn ghost small" onClick={onViewEvidence} id={`btn-ev-${opp.id}`}>
            View Evidence
          </button>
          <button
            className="btn ghost small"
            onClick={onDefenseLetter}
            id={`btn-defense-${opp.id}`}
            title="Generate formal SOW scope defense letter or commercial dispute notice"
          >
            🛡️ Scope Defense Notice
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {(isDetected || isReview) && (
            <>
              <button
                className="btn ghost small"
                onClick={onReject}
                disabled={!!busy}
                id={`btn-reject-${opp.id}`}
              >
                Reject
              </button>
              <button
                className="btn orange small"
                onClick={onConfirm}
                disabled={!!busy}
                id={`btn-confirm-${opp.id}`}
              >
                Confirm
              </button>
            </>
          )}

          {isConfirmed && (
            <button
              className="btn orange small"
              onClick={onGenerateCR}
              disabled={busy === opp.id + 'co'}
              id={`btn-co-${opp.id}`}
            >
              {busy === opp.id + 'co' ? 'Generating…' : 'Generate Change Request →'}
            </button>
          )}

          {isApproved && (
            <button className="btn ghost small" onClick={onGotoInvoicing}>
              View in Invoice Tracking →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

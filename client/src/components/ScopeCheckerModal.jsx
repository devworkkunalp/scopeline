import { useState } from 'react';
import { api } from '../api.js';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

export default function ScopeCheckerModal({ activeProject, onClose, onAdded }) {
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('Client Call / Meeting');
  const [desc, setDesc] = useState('');
  const [hours, setHours] = useState('24');
  const [rate, setRate] = useState('150');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [evaluating, setEvaluating] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function handleCheckScope(e) {
    e?.preventDefault();
    if (!title.trim() || !desc.trim()) {
      setErr('Title and description/discussion notes are required.');
      return;
    }
    setErr('');
    setEvaluating(true);
    try {
      const res = await api.checkScope(activeProject.id, {
        title,
        description: desc,
        source,
        dateLabel: date,
        estimatedHours: parseFloat(hours) || 20,
        hourlyRate: parseFloat(rate) || 150,
      });
      setVerdict(res);
    } catch (ex) {
      setErr(ex.message || 'Scope analysis failed');
    } finally {
      setEvaluating(false);
    }
  }

  async function handleSaveOpportunity(createCR = false) {
    if (!verdict) return;
    setSaving(true);
    setErr('');
    try {
      const opp = await api.addManualOpportunity(activeProject.id, {
        title: verdict.title || title,
        description: verdict.description || desc,
        type: verdict.type || 'Scope Expansion',
        estimatedCost: verdict.estimatedCost || (parseFloat(hours) * parseFloat(rate) * 0.7),
        billableValue: verdict.billableValue || (parseFloat(hours) * parseFloat(rate)),
        clause: verdict.clause || '§3 — Change Request Process',
        source: verdict.source || source,
        dateLabel: date,
        createChangeRequest: createCR,
      });
      onAdded(opp, createCR);
      onClose();
    } catch (ex) {
      setErr(ex.message || 'Failed to save opportunity');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-head">
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: '0.08em', color: 'var(--orange)', textTransform: 'uppercase', fontWeight: 600 }}>
              Ad-Hoc Scope Evaluation &amp; Manual Entry
            </div>
            <h3>Log Client Ask / Check Scope Coverage</h3>
          </div>
          <button onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <div className="modal-body">
          {err && <div className="error">{err}</div>}

          <div className="field">
            <label className="field-label">Requirement / Client Ask Title *</label>
            <input
              type="text"
              placeholder="e.g. Enable multi-currency checkout (EUR/GBP) & recurring bean subscription"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid cols-2">
            <div className="field">
              <label className="field-label">Source / Origin</label>
              <input
                type="text"
                placeholder="e.g. Call with VP Dave Miller / Slack channel"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-label">Date of Request</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label className="field-label">Details / Pasted Conversation / Discussion Notes *</label>
            <textarea
              rows={4}
              placeholder="Paste email text, meeting transcripts, or describe what the client requested..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              required
            />
          </div>

          <div className="grid cols-2" style={{ background: 'var(--paper)', padding: 12, borderRadius: 2, marginBottom: 16 }}>
            <div className="field" style={{ margin: 0 }}>
              <label className="field-label">Estimated Effort (Hours)</label>
              <input
                type="number"
                placeholder="24"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label className="field-label">Rate ($/hr)</label>
              <input
                type="number"
                placeholder="150"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>
          </div>

          {!verdict && (
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <button
                type="button"
                className="btn orange wide"
                onClick={handleCheckScope}
                disabled={evaluating || !title.trim() || !desc.trim()}
              >
                {evaluating ? 'Analyzing Against SOW Terms…' : '⚡ Evaluate SOW Scope Coverage with AI'}
              </button>
            </div>
          )}

          {verdict && (
            <div style={{ marginTop: 20, borderTop: '2px solid var(--line)', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--steel)', fontWeight: 600 }}>
                  AI Scope Verdict
                </div>
                <span className={`stamp ${verdict.verdict === 'OUT_OF_SCOPE' ? 'unbilled' : verdict.verdict === 'IN_SCOPE' ? 'paid' : 'review'}`}>
                  {verdict.verdict === 'OUT_OF_SCOPE' ? 'OUT OF SCOPE (BILLABLE REVENUE)' : verdict.verdict === 'IN_SCOPE' ? 'COVERED IN BASE SOW' : 'NEEDS CLARIFICATION'}
                </span>
              </div>

              <div style={{ background: 'var(--paper)', borderLeft: '4px solid var(--orange)', padding: 12, fontSize: 13, marginBottom: 14 }}>
                <strong>Reasoning:</strong> {verdict.reasoning}
                <div style={{ fontSize: 11.5, color: 'var(--steel)', marginTop: 6 }}>
                  <strong>Applicable Clause / Boundary:</strong> {verdict.clause}
                </div>
              </div>

              <div className="grid cols-3" style={{ marginBottom: 18 }}>
                <div className="card" style={{ padding: 12 }}>
                  <div style={{ fontSize: 10, color: 'var(--steel)', textTransform: 'uppercase' }}>Type</div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginTop: 2 }}>{verdict.type}</div>
                </div>
                <div className="card" style={{ padding: 12 }}>
                  <div style={{ fontSize: 10, color: 'var(--steel)', textTransform: 'uppercase' }}>Estimated Cost</div>
                  <div className="mono" style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>{fmt(verdict.estimatedCost)}</div>
                </div>
                <div className="card" style={{ padding: 12, border: '1px solid var(--orange)' }}>
                  <div style={{ fontSize: 10, color: 'var(--orange)', textTransform: 'uppercase', fontWeight: 600 }}>Billable Revenue</div>
                  <div className="mono" style={{ fontWeight: 700, fontSize: 15, color: 'var(--orange)', marginTop: 2 }}>{fmt(verdict.billableValue)}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => setVerdict(null)}
                >
                  Re-evaluate
                </button>
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => handleSaveOpportunity(false)}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : '+ Add to Opportunities'}
                </button>
                <button
                  type="button"
                  className="btn orange small"
                  onClick={() => handleSaveOpportunity(true)}
                  disabled={saving}
                >
                  {saving ? 'Creating…' : 'Generate Change Request Now →'}
                </button>
              </div>
            </div>
          )}
        </div>

        {!verdict && (
          <div className="modal-foot">
            <button className="btn ghost" onClick={onClose}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

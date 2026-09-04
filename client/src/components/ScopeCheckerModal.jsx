import { useState, useMemo } from 'react';
import { api } from '../api.js';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

const DEFAULT_ROLES = [
  { role: 'Lead Architect / Principal', hours: 6, hourlyRate: 210, directCostRate: 95 },
  { role: 'Senior Fullstack Engineer', hours: 16, hourlyRate: 160, directCostRate: 75 },
  { role: 'UI/UX Product Designer', hours: 4, hourlyRate: 130, directCostRate: 60 },
  { role: 'QA & Release Engineer', hours: 6, hourlyRate: 95, directCostRate: 45 },
];

export default function ScopeCheckerModal({ activeProject, onClose, onAdded }) {
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('Client Call / Meeting');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Estimator Mode: 'simple' | 'multi_role'
  const [estimatorMode, setEstimatorMode] = useState('multi_role');
  const [simpleHours, setSimpleHours] = useState('24');
  const [simpleRate, setSimpleRate] = useState('150');

  // Multi-role state
  const [roles, setRoles] = useState(DEFAULT_ROLES);

  const [evaluating, setEvaluating] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // Live calculations
  const { totalHours, totalBillable, totalDirectCost, blendedRate, grossMarginPct, isRealistic } = useMemo(() => {
    if (estimatorMode === 'simple') {
      const h = parseFloat(simpleHours) || 0;
      const r = parseFloat(simpleRate) || 0;
      const billable = h * r;
      const cost = billable * 0.55;
      const margin = billable > 0 ? ((billable - cost) / billable) * 100 : 0;
      return {
        totalHours: h,
        totalBillable: billable,
        totalDirectCost: cost,
        blendedRate: r,
        grossMarginPct: Math.round(margin * 10) / 10,
        isRealistic: r >= 75 && margin >= 35,
      };
    }

    let hSum = 0;
    let bSum = 0;
    let cSum = 0;

    roles.forEach((r) => {
      const h = parseFloat(r.hours) || 0;
      const rate = parseFloat(r.hourlyRate) || 0;
      const costRate = parseFloat(r.directCostRate) || rate * 0.5;
      hSum += h;
      bSum += h * rate;
      cSum += h * costRate;
    });

    const blended = hSum > 0 ? bSum / hSum : 0;
    const margin = bSum > 0 ? ((bSum - cSum) / bSum) * 100 : 0;

    return {
      totalHours: hSum,
      totalBillable: bSum,
      totalDirectCost: cSum,
      blendedRate: Math.round(blended),
      grossMarginPct: Math.round(margin * 10) / 10,
      isRealistic: blended >= 75 && margin >= 35,
    };
  }, [estimatorMode, simpleHours, simpleRate, roles]);

  const handleRoleChange = (index, field, value) => {
    setRoles((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addRole = () => {
    setRoles((prev) => [...prev, { role: 'Additional Specialist', hours: 8, hourlyRate: 140, directCostRate: 65 }]);
  };

  const removeRole = (index) => {
    setRoles((prev) => prev.filter((_, i) => i !== index));
  };

  const getCostBreakdownString = () => {
    if (estimatorMode === 'simple') {
      return `Estimated effort: ${totalHours} hrs @ $${blendedRate}/hr. Direct cost ${fmt(totalDirectCost)}, proposed billable ${fmt(totalBillable)}.`;
    }
    const activeRoles = roles.filter((r) => parseFloat(r.hours) > 0);
    const roleItems = activeRoles.map((r) => `${r.hours}h ${r.role} ($${r.hourlyRate}/hr)`).join(', ');
    return `Itemized Roles: ${roleItems} | Blended Rate: $${blendedRate}/hr | Target Margin: ${grossMarginPct}% | Total: ${fmt(totalBillable)}`;
  };

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
        estimatedHours: totalHours,
        hourlyRate: blendedRate,
        roleEstimates: estimatorMode === 'multi_role' ? roles : null,
        targetMarginPct: grossMarginPct,
      });
      setVerdict({
        ...res,
        estimatedCost: totalDirectCost > 0 ? totalDirectCost : res.estimatedCost,
        billableValue: totalBillable > 0 ? totalBillable : res.billableValue,
        blendedRate,
        grossMarginPct,
        costBreakdown: getCostBreakdownString(),
      });
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
      const breakdown = verdict.costBreakdown || getCostBreakdownString();
      const opp = await api.addManualOpportunity(activeProject.id, {
        title: verdict.title || title,
        description: verdict.description || desc,
        type: verdict.type || 'Scope Expansion',
        estimatedCost: verdict.estimatedCost || totalDirectCost,
        billableValue: verdict.billableValue || totalBillable,
        clause: verdict.clause || '§3 — Change Request Process',
        source: verdict.source || source,
        dateLabel: date,
        createChangeRequest: createCR,
        roleEstimates: estimatorMode === 'multi_role' ? roles : null,
        targetMarginPct: grossMarginPct,
        costBreakdown: breakdown,
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
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 740, maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="modal-head">
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: '0.08em', color: 'var(--orange)', textTransform: 'uppercase', fontWeight: 600 }}>
              Smart Scope &amp; Rate Estimator
            </div>
            <h3 style={{ margin: '2px 0 0' }}>Log Scope Addition &amp; Estimate Pricing</h3>
          </div>
          <button onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <div className="modal-body" style={{ gap: 16 }}>
          {err && <div className="error">{err}</div>}

          <div className="field">
            <label className="field-label">Requirement / Client Ask Title *</label>
            <input
              type="text"
              placeholder="e.g. Multi-Currency Checkout (EUR/GBP) & Subscription Billing Engine"
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
            <label className="field-label">Details / Client Ask Notes *</label>
            <textarea
              rows={3}
              placeholder="Paste meeting notes, emails, or describe what functionality was requested..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              required
            />
          </div>

          {/* Rate Realism & Multi-Role Estimator Container */}
          <div style={{ background: 'var(--paper-1)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>📊</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
                  Smart Rate &amp; Margin Estimator
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setEstimatorMode('multi_role')}
                  style={{
                    padding: '3px 10px',
                    fontSize: 11,
                    borderRadius: 4,
                    background: estimatorMode === 'multi_role' ? 'var(--orange)' : 'var(--paper-2)',
                    color: estimatorMode === 'multi_role' ? '#fff' : 'var(--navy)',
                    border: '1px solid var(--line)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Multi-Role Breakdown
                </button>
                <button
                  type="button"
                  onClick={() => setEstimatorMode('simple')}
                  style={{
                    padding: '3px 10px',
                    fontSize: 11,
                    borderRadius: 4,
                    background: estimatorMode === 'simple' ? 'var(--orange)' : 'var(--paper-2)',
                    color: estimatorMode === 'simple' ? '#fff' : 'var(--navy)',
                    border: '1px solid var(--line)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Simple Flat Rate
                </button>
              </div>
            </div>

            {/* Mode 1: Multi-Role Inputs */}
            {estimatorMode === 'multi_role' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 32px', gap: 8, fontSize: 11, fontWeight: 600, color: 'var(--steel)', textTransform: 'uppercase' }}>
                  <div>Role Tier</div>
                  <div>Hours</div>
                  <div>Bill Rate ($/hr)</div>
                  <div>Direct Cost ($/hr)</div>
                  <div></div>
                </div>

                {roles.map((r, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 32px', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      value={r.role}
                      onChange={(e) => handleRoleChange(i, 'role', e.target.value)}
                      style={{ padding: '6px 8px', fontSize: 12, borderRadius: 4, border: '1px solid var(--line)' }}
                    />
                    <input
                      type="number"
                      min="0"
                      value={r.hours}
                      onChange={(e) => handleRoleChange(i, 'hours', e.target.value)}
                      style={{ padding: '6px 8px', fontSize: 12, borderRadius: 4, border: '1px solid var(--line)' }}
                    />
                    <input
                      type="number"
                      min="0"
                      value={r.hourlyRate}
                      onChange={(e) => handleRoleChange(i, 'hourlyRate', e.target.value)}
                      style={{ padding: '6px 8px', fontSize: 12, borderRadius: 4, border: '1px solid var(--line)' }}
                    />
                    <input
                      type="number"
                      min="0"
                      value={r.directCostRate}
                      onChange={(e) => handleRoleChange(i, 'directCostRate', e.target.value)}
                      style={{ padding: '6px 8px', fontSize: 12, borderRadius: 4, border: '1px solid var(--line)' }}
                    />
                    <button
                      type="button"
                      onClick={() => removeRole(i)}
                      style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14 }}
                      title="Remove Role"
                    >
                      &times;
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addRole}
                  style={{ background: 'none', border: '1px dashed var(--line)', color: 'var(--steel)', padding: '6px', borderRadius: 4, fontSize: 11.5, cursor: 'pointer', marginTop: 4 }}
                >
                  + Add Role / Specialist Tier
                </button>
              </div>
            ) : (
              /* Mode 2: Simple Inputs */
              <div className="grid cols-2" style={{ gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--steel)', display: 'block', marginBottom: 4 }}>
                    Estimated Effort (Hours)
                  </label>
                  <input
                    type="number"
                    value={simpleHours}
                    onChange={(e) => setSimpleHours(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: 13, borderRadius: 6, border: '1px solid var(--line)', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--steel)', display: 'block', marginBottom: 4 }}>
                    Blended Rate ($/hr)
                  </label>
                  <input
                    type="number"
                    value={simpleRate}
                    onChange={(e) => setSimpleRate(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: 13, borderRadius: 6, border: '1px solid var(--line)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            )}

            {/* Live Financial & Realism Summary Bar */}
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <div style={{ background: 'var(--paper-2)', padding: '8px 10px', borderRadius: 6 }}>
                <div style={{ fontSize: 10, color: 'var(--steel)', textTransform: 'uppercase' }}>Total Hours</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{totalHours} hrs</div>
              </div>
              <div style={{ background: 'var(--paper-2)', padding: '8px 10px', borderRadius: 6 }}>
                <div style={{ fontSize: 10, color: 'var(--steel)', textTransform: 'uppercase' }}>Blended Rate</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>${blendedRate}/hr</div>
              </div>
              <div style={{ background: 'var(--paper-2)', padding: '8px 10px', borderRadius: 6 }}>
                <div style={{ fontSize: 10, color: 'var(--steel)', textTransform: 'uppercase' }}>Direct Cost</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--steel)' }}>{fmt(totalDirectCost)}</div>
              </div>
              <div style={{ background: 'var(--paper-2)', padding: '8px 10px', borderRadius: 6, borderLeft: '3px solid var(--orange)' }}>
                <div style={{ fontSize: 10, color: 'var(--orange)', textTransform: 'uppercase', fontWeight: 600 }}>Gross Margin</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--orange)' }}>
                  {grossMarginPct}% ({fmt(totalBillable - totalDirectCost)})
                </div>
              </div>
            </div>

            {/* Realism Badge */}
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
              {isRealistic ? (
                <span style={{ color: 'var(--emerald)', fontWeight: 600 }}>
                  ✓ Realistic Commercial Pricing: Blended rate and margin align with professional services benchmarks.
                </span>
              ) : (
                <span style={{ color: 'var(--red)', fontWeight: 600 }}>
                  ⚠️ Low Rate / Margin Warning: Target rate or margin is below the 35% commercial threshold.
                </span>
              )}
            </div>
          </div>

          {!verdict && (
            <div style={{ textAlign: 'center', marginTop: 6 }}>
              <button
                type="button"
                className="btn orange wide"
                onClick={handleCheckScope}
                disabled={evaluating || !title.trim() || !desc.trim()}
              >
                {evaluating ? 'Analyzing Against SOW Terms…' : `⚡ Evaluate Scope & Calculate Change Order (${fmt(totalBillable)})`}
              </button>
            </div>
          )}

          {verdict && (
            <div style={{ borderTop: '2px solid var(--line)', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--steel)', fontWeight: 600 }}>
                  AI Scope Verdict &amp; Valuation
                </div>
                <span className={`stamp ${verdict.verdict === 'OUT_OF_SCOPE' ? 'unbilled' : verdict.verdict === 'IN_SCOPE' ? 'paid' : 'review'}`}>
                  {verdict.verdict === 'OUT_OF_SCOPE' ? 'OUT OF SCOPE (BILLABLE VARIATION)' : verdict.verdict === 'IN_SCOPE' ? 'COVERED IN BASE SOW' : 'NEEDS CLARIFICATION'}
                </span>
              </div>

              <div style={{ background: 'var(--paper-1)', borderLeft: '4px solid var(--orange)', padding: 12, fontSize: 13, marginBottom: 14 }}>
                <strong>Reasoning:</strong> {verdict.reasoning}
                <div style={{ fontSize: 11.5, color: 'var(--steel)', marginTop: 6 }}>
                  <strong>Applicable Clause / Boundary:</strong> {verdict.clause}
                </div>
              </div>

              <div className="grid cols-3" style={{ marginBottom: 18 }}>
                <div className="card" style={{ padding: 12 }}>
                  <div style={{ fontSize: 10, color: 'var(--steel)', textTransform: 'uppercase' }}>Classification</div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginTop: 2 }}>{verdict.type}</div>
                </div>
                <div className="card" style={{ padding: 12 }}>
                  <div style={{ fontSize: 10, color: 'var(--steel)', textTransform: 'uppercase' }}>Direct Delivery Cost</div>
                  <div className="mono" style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>{fmt(verdict.estimatedCost)}</div>
                </div>
                <div className="card" style={{ padding: 12, border: '1px solid var(--orange)' }}>
                  <div style={{ fontSize: 10, color: 'var(--orange)', textTransform: 'uppercase', fontWeight: 600 }}>Proposed Billable Value</div>
                  <div className="mono" style={{ fontWeight: 700, fontSize: 15, color: 'var(--orange)', marginTop: 2 }}>{fmt(verdict.billableValue)}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => setVerdict(null)}
                >
                  Adjust Estimate
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

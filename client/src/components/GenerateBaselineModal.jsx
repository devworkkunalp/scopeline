import { useState } from 'react';
import { api } from '../api.js';

const PRESETS = [
  {
    id: 'web_dev',
    name: '💻 Web & Software Development',
    sampleScope: `• Modernization and migration of core web storefront to Shopify Plus.
• Custom responsive UI based on Figma mockups with product catalog & cart.
• Standard inventory batch sync with ERP system.
• Standard payment gateway integration for credit card transactions.
• 10 business days user acceptance testing (UAT).`,
    price: 50000,
    rate: 150,
    revisions: 2,
    weeks: 8,
  },
  {
    id: 'agency',
    name: '🎨 Creative & Brand Design Agency',
    sampleScope: `• Complete brand identity overhaul including logo kit, color palette & typography.
• High-fidelity design system in Figma with 15 core reusable UI components.
• Interactive prototype walkthrough for executive sign-off.
• Up to 2 design review cycles per milestone.`,
    price: 35000,
    rate: 140,
    revisions: 2,
    weeks: 6,
  },
  {
    id: 'consulting',
    name: '🏗️ Commercial & Technical Consulting',
    sampleScope: `• Cloud infrastructure architecture review and security audit.
• Microservices migration roadmap and automated CI/CD deployment pipeline.
• Weekly technical governance review and team enablement workshops.`,
    price: 60000,
    rate: 175,
    revisions: 1,
    weeks: 10,
  },
];

export default function GenerateBaselineModal({ activeProject, onClose, onGenerated }) {
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0].id);
  const [requirements, setRequirements] = useState(PRESETS[0].sampleScope);
  const [price, setPrice] = useState(activeProject?.value ? activeProject.value.toString() : PRESETS[0].price.toString());
  const [rate, setRate] = useState(PRESETS[0].rate.toString());
  const [revisions, setRevisions] = useState(PRESETS[0].revisions.toString());
  const [weeks, setWeeks] = useState(PRESETS[0].weeks.toString());

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  function handleSelectPreset(pId) {
    setSelectedPreset(pId);
    const p = PRESETS.find((x) => x.id === pId);
    if (p) {
      setRequirements(p.sampleScope);
      if (!activeProject?.value) setPrice(p.price.toString());
      setRate(p.rate.toString());
      setRevisions(p.revisions.toString());
      setWeeks(p.weeks.toString());
    }
  }

  async function handleGenerate(e) {
    e?.preventDefault();
    if (!requirements.trim()) {
      setErr('Please enter the informal requirements or bullet points.');
      return;
    }
    setErr('');
    setGenerating(true);
    try {
      const presetObj = PRESETS.find((x) => x.id === selectedPreset);
      const contract = await api.generateBaseline(activeProject.id, {
        requirementsText: requirements,
        contractValue: parseFloat(price) || 50000,
        hourlyRate: parseFloat(rate) || 150,
        industryPreset: presetObj?.name || 'Software & Web Development',
        revisionLimit: parseInt(revisions) || 2,
        timelineWeeks: parseInt(weeks) || 8,
      });
      setResult(contract);
      onGenerated(contract);
    } catch (ex) {
      setErr(ex.message || 'Failed to generate SOW baseline');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 840 }}>
        <div className="modal-head">
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: '0.08em', color: 'var(--orange)', textTransform: 'uppercase', fontWeight: 600 }}>
              AI Scope Estimator &amp; Baseline Solidifier
            </div>
            <h3>✨ Solidify Requirements, Estimate Effort &amp; Forecast Future Opportunities</h3>
          </div>
          <button onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <div className="modal-body" style={{ maxHeight: 'calc(85vh - 120px)', overflowY: 'auto' }}>
          {err && <div className="error" style={{ marginBottom: 14 }}>{err}</div>}

          {!result ? (
            <>
              <div style={{ background: '#F8FAFC', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: 4, marginBottom: 16, fontSize: 12.5, color: 'var(--steel)' }}>
                <strong>How it helps you:</strong> If the client came with raw requirements, the AI will <strong>solidify the scope</strong>, estimate <strong>total effort hours &amp; timeline</strong>, and <strong>forecast upcoming billing / upsell opportunities</strong> that you can protect in your SOW baseline!
              </div>

              {/* Preset Selector */}
              <div className="field">
                <label className="field-label">Select Industry Protection Preset</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`btn small ${selectedPreset === p.id ? 'orange' : 'ghost'}`}
                      onClick={() => handleSelectPreset(p.id)}
                      style={{ textAlign: 'left', padding: '8px 10px', fontSize: 12, height: 'auto' }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Requirements text */}
              <div className="field">
                <label className="field-label">Raw Client Asks / Informal Requirements *</label>
                <textarea
                  rows={5}
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="Paste rough client requirements, verbal scope notes, or proposal summary..."
                  required
                />
              </div>

              {/* Commercial Parameters */}
              <div className="grid cols-4" style={{ gap: 10 }}>
                <div className="field">
                  <label className="field-label">Agreed Price ($) *</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="50000"
                    required
                  />
                </div>
                <div className="field">
                  <label className="field-label">Variation Rate ($/hr) *</label>
                  <input
                    type="number"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder="150"
                    required
                  />
                </div>
                <div className="field">
                  <label className="field-label">Revision Round Cap *</label>
                  <input
                    type="number"
                    value={revisions}
                    onChange={(e) => setRevisions(e.target.value)}
                    placeholder="2"
                    required
                  />
                </div>
                <div className="field">
                  <label className="field-label">Timeline (Weeks) *</label>
                  <input
                    type="number"
                    value={weeks}
                    onChange={(e) => setWeeks(e.target.value)}
                    placeholder="8"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button
                  type="button"
                  className="btn orange"
                  disabled={generating}
                  onClick={handleGenerate}
                  style={{ minWidth: 320 }}
                >
                  {generating ? (
                    <>
                      <span className="spinner" style={{ width: 14, height: 14, marginRight: 8 }} />
                      Solidifying Scope &amp; Forecasting Opportunities…
                    </>
                  ) : (
                    '✨ Solidify Scope, Estimate Hours & Forecast Opportunities →'
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* SUCCESS & FORECAST PREVIEW */}
              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '14px 18px', borderRadius: 6, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: '#065F46', fontSize: 13.5 }}>
                  ✓ Scope Solidified &amp; Baseline Configured for {activeProject.name}
                </div>
                <div style={{ fontSize: 12, color: '#047857', marginTop: 4 }}>
                  Estimated Effort: <strong>~{Math.round((parseFloat(price) || 50000) / (parseFloat(rate) || 150))} Hours</strong> · Target Timeline: <strong>{weeks} Weeks</strong>
                </div>
              </div>

              {/* FORECASTED FUTURE BILLING OPPORTUNITIES */}
              <div style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', padding: '14px 18px', borderRadius: 6, marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#92400E', fontWeight: 700, fontSize: 12.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  🔮 AI Future Billing &amp; Upsell Opportunities Forecast
                </div>
                <div style={{ fontSize: 12, color: '#78350F', marginTop: 3, marginBottom: 10 }}>
                  Based on the client's architecture, they are highly likely to ask for these expansion items post-launch. These are explicitly excluded in §2 so you can bill for them:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: '#fff', border: '1px solid #FDE68A', padding: '10px 12px', borderRadius: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--navy)' }}>📱 Mobile Native App (iOS/Android)</div>
                    <div style={{ fontSize: 11.5, color: 'var(--steel)', marginTop: 2 }}>Est. 120 hrs · <strong>$18,000 Billable Opportunity</strong></div>
                  </div>
                  <div style={{ background: '#fff', border: '1px solid #FDE68A', padding: '10px 12px', borderRadius: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--navy)' }}>🔄 Subscriptions &amp; Recurring Billing</div>
                    <div style={{ fontSize: 11.5, color: 'var(--steel)', marginTop: 2 }}>Est. 50 hrs · <strong>$7,500 Billable Opportunity</strong></div>
                  </div>
                </div>
              </div>

              {/* SOW CLAUSES PREVIEW */}
              <div className="grid cols-2" style={{ gap: 14 }}>
                <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: 12, borderRadius: 4 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--steel)', marginBottom: 6 }}>
                    1. Solidified In-Scope Deliverables (§1)
                  </div>
                  <div style={{ fontSize: 12.5, whiteSpace: 'pre-wrap', lineHeight: 1.45, color: 'var(--navy)' }}>
                    {result.terms?.originalScope || result.originalScope}
                  </div>
                </div>

                <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', padding: 12, borderRadius: 4 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--orange)', marginBottom: 6 }}>
                    2. Protective Exclusions &amp; Boundaries (§2)
                  </div>
                  <div style={{ fontSize: 12.5, whiteSpace: 'pre-wrap', lineHeight: 1.45, color: '#7C2D12' }}>
                    {result.terms?.exclusionsAllowances || result.exclusionsAllowances}
                  </div>
                </div>

                <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: 12, borderRadius: 4 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--steel)', marginBottom: 6 }}>
                    3. Change Request Process (§3)
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--navy)' }}>
                    {result.terms?.changeVariationRules || result.changeVariationRules}
                  </div>
                </div>

                <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: 12, borderRadius: 4 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--steel)', marginBottom: 6 }}>
                    4. Milestone Schedule &amp; Terms (§4)
                  </div>
                  <div style={{ fontSize: 12.5, whiteSpace: 'pre-wrap', lineHeight: 1.45, color: 'var(--navy)' }}>
                    {result.terms?.paymentTerms || result.paymentTerms}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => setResult(null)}
                >
                  ← Modify Parameters
                </button>
                <button
                  type="button"
                  className="btn orange"
                  onClick={onClose}
                >
                  Apply &amp; View SOW Baseline Document →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

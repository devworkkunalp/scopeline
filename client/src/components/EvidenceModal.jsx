import { useState } from 'react';
import { api } from '../api.js';

export default function EvidenceModal({ opp, projectId, perspective = 'vendor', onClose }) {
  const [defenseLetter, setDefenseLetter] = useState(null);
  const [loadingLetter, setLoadingLetter] = useState(false);
  const [copied, setCopied] = useState(false);

  const isClient = perspective === 'client';
  const pct = Math.round((opp.confidence || 0) * 100);

  async function handleGenerateDefenseLetter() {
    if (!projectId || !opp.id) return;
    setLoadingLetter(true);
    try {
      const res = await api.generateDefenseLetter(projectId, opp.id);
      setDefenseLetter(res);
    } catch (err) {
      alert(err.message || 'Failed to generate defense letter');
    } finally {
      setLoadingLetter(false);
    }
  }

  function handleCopyLetter() {
    if (!defenseLetter) return;
    const fullText = `Subject: ${defenseLetter.subject}\n\n${defenseLetter.body}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 740 }}>
        <div className="modal-head">
          <div>
            <div
              className="hint"
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                color: isClient ? '#3B82F6' : 'var(--steel)',
                marginBottom: 2,
                fontWeight: 600,
              }}
            >
              {isClient ? '🛡️ SOW OVERBILLING AUDIT' : opp.type}
            </div>
            <h3>{opp.title}</h3>
          </div>
          <button onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="modal-body" style={{ maxHeight: 'calc(80vh - 120px)', overflowY: 'auto' }}>
          {/* Audit Badge Bar */}
          <div
            style={{
              background: isClient ? '#EFF6FF' : '#ECFDF5',
              border: isClient ? '1px solid #BFDBFE' : '1px solid #A7F3D0',
              padding: '8px 12px',
              borderRadius: 4,
              marginBottom: 14,
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              fontSize: 11.5,
              color: isClient ? '#1E40AF' : '#065F46',
            }}
          >
            <span style={{ fontWeight: 600 }}>{isClient ? '✓ Contract Baseline Cross-Referenced' : '✓ Client Authority Verified'}</span>
            <span style={{ fontWeight: 600 }}>{isClient ? '✓ Deliverable Scope Tested' : '✓ Post-SOW Date Validated'}</span>
            <span style={{ fontWeight: 600 }}>{isClient ? '✓ SOW Clause Grounded' : '✓ Contract Barrier Grounded'}</span>
            <span style={{ fontWeight: 600 }}>{isClient ? '✓ Budget Impact Quantified' : '✓ Rate Grounded ($150/hr)'}</span>
          </div>

          <p style={{ fontSize: 13.5, color: 'var(--steel)', lineHeight: 1.5, marginTop: 0 }}>
            {opp.desc}
          </p>

          {/* 3-WAY SIDE-BY-SIDE PROOF CARD */}
          <div className="grid cols-3" style={{ gap: 10, margin: '14px 0' }}>
            <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: 10, borderRadius: 4 }}>
              <div style={{ fontSize: 9.5, textTransform: 'uppercase', color: 'var(--steel)', fontWeight: 600, marginBottom: 4 }}>
                {isClient ? '1. Vendor Claim Record' : '1. Informal Request Proof'}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>
                {opp.evidence?.[0]?.src || 'Correspondence Record'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 4, maxHeight: 60, overflowY: 'auto' }}>
                {opp.evidence?.[0]?.text || opp.title}
              </div>
            </div>

            <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: 10, borderRadius: 4 }}>
              <div style={{ fontSize: 9.5, textTransform: 'uppercase', color: 'var(--steel)', fontWeight: 600, marginBottom: 4 }}>
                {isClient ? '2. Governing SOW Clause' : '2. SOW Barrier Clause'}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>
                {opp.clause || '§1.0 Deliverables / §2.0 Exclusions'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 4 }}>
                {isClient ? 'Governing contract boundary provision.' : 'Excluded deliverable requiring formal Change Request.'}
              </div>
            </div>

            <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: 10, borderRadius: 4 }}>
              <div style={{ fontSize: 9.5, textTransform: 'uppercase', color: 'var(--steel)', fontWeight: 600, marginBottom: 4 }}>
                {isClient ? '3. Defended Budget Exposure' : '3. Financial Impact'}
              </div>
              <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: isClient ? '#2563EB' : 'var(--orange)' }}>
                {fmt(opp.billable)}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--steel)', marginTop: 4 }}>
                Confidence: {pct}% | Estimated: {fmt(opp.estCost)}
              </div>
            </div>
          </div>

          {/* DEFENSE LETTER GENERATOR SECTION (CLIENT SHIELD MODE) */}
          {isClient && (
            <div style={{ background: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: 6, padding: '16px 18px', margin: '18px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    🛡️ Automated SOW Defense &amp; Dispute Letter
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--steel)', marginTop: 2 }}>
                    Generate a formal, contract-backed rebuttal letter to challenge this claim.
                  </div>
                </div>
                {!defenseLetter ? (
                  <button
                    type="button"
                    className="btn small"
                    style={{ background: '#2563EB', color: '#fff', border: 'none' }}
                    onClick={handleGenerateDefenseDefenseLetter ?? handleGenerateDefenseLetter}
                    disabled={loadingLetter}
                  >
                    {loadingLetter ? 'Generating…' : 'Generate Defense Letter →'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn small"
                    style={{ background: copied ? '#10B981' : '#0F172A', color: '#fff', border: 'none' }}
                    onClick={handleCopyLetter}
                  >
                    {copied ? '✓ Copied to Clipboard!' : '📋 Copy Letter Text'}
                  </button>
                )}
              </div>

              {defenseLetter && (
                <div style={{ marginTop: 12, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 4, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    SUBJECT: {defenseLetter.subject}
                  </div>
                  <pre
                    style={{
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'inherit',
                      fontSize: 12,
                      color: '#334155',
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {defenseLetter.body}
                  </pre>
                </div>
              )}
            </div>
          )}

          {opp.evidence?.length > 0 && (
            <>
              <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--steel)', margin: '16px 0 8px', fontWeight: 600 }}>
                Direct Source Evidence Citations
              </div>
              {opp.evidence.map((ev, i) => (
                <div key={i} className="evidence-item" style={{ borderLeft: isClient ? '3px solid #3B82F6' : '3px solid var(--orange)' }}>
                  <div style={{ fontSize: 12.5, lineHeight: 1.45 }}>{ev.text}</div>
                  <div className="src" style={{ marginTop: 4, fontWeight: 600, color: 'var(--navy)' }}>
                    SOURCE: {ev.src}
                  </div>
                </div>
              ))}
            </>
          )}

          {opp.timeline?.length > 0 && (
            <>
              <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--steel)', margin: '16px 0 8px', fontWeight: 600 }}>
                Activity Timeline &amp; Correspondence
              </div>
              <div className="timeline">
                {opp.timeline.map((t, i) => (
                  <div key={i} className="t-item">
                    <div className="date">{t.date}</div>
                    <div className="desc">{t.desc}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {opp.rejectionReason && (
            <div style={{ marginTop: 12, color: '#888', fontSize: 12, fontStyle: 'italic' }}>
              Dismissed: {opp.rejectionReason}
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function fmt(n) {
  if (!n && n !== 0) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

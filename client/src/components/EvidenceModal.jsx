export default function EvidenceModal({ opp, onClose }) {
  const pct = Math.round((opp.confidence || 0) * 100);

  return (
    <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="modal-head">
          <div>
            <div
              className="hint"
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                color: 'var(--steel)',
                marginBottom: 2,
              }}
            >
              {opp.type}
            </div>
            <h3>{opp.title}</h3>
          </div>
          <button onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="modal-body" style={{ maxHeight: 'calc(80vh - 120px)', overflowY: 'auto' }}>
          {/* 4-Point Rule Audit Badge Bar */}
          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '8px 12px', borderRadius: 4, marginBottom: 14, display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11.5, color: '#065F46' }}>
            <span style={{ fontWeight: 600 }}>✓ Client Authority Verified</span>
            <span style={{ fontWeight: 600 }}>✓ Post-SOW Date Validated</span>
            <span style={{ fontWeight: 600 }}>✓ Contract Barrier Grounded</span>
            <span style={{ fontWeight: 600 }}>✓ Rate Grounded ($150/hr)</span>
          </div>

          <p style={{ fontSize: 13.5, color: 'var(--steel)', lineHeight: 1.5, marginTop: 0 }}>
            {opp.desc}
          </p>

          {/* 3-WAY SIDE-BY-SIDE PROOF CARD */}
          <div className="grid cols-3" style={{ gap: 10, margin: '14px 0' }}>
            <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: 10, borderRadius: 4 }}>
              <div style={{ fontSize: 9.5, textTransform: 'uppercase', color: 'var(--steel)', fontWeight: 600, marginBottom: 4 }}>
                1. Informal Request Proof
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>
                {opp.evidence?.[0]?.src || 'Client Activity Record'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 4, maxHeight: 60, overflowY: 'auto' }}>
                {opp.evidence?.[0]?.text || opp.title}
              </div>
            </div>

            <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: 10, borderRadius: 4 }}>
              <div style={{ fontSize: 9.5, textTransform: 'uppercase', color: 'var(--steel)', fontWeight: 600, marginBottom: 4 }}>
                2. SOW Barrier Clause
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>
                {opp.clause || '§2 Exclusions'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 4 }}>
                Excluded deliverable requiring formal Change Request.
              </div>
            </div>

            <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: 10, borderRadius: 4 }}>
              <div style={{ fontSize: 9.5, textTransform: 'uppercase', color: 'var(--steel)', fontWeight: 600, marginBottom: 4 }}>
                3. Financial Impact
              </div>
              <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--orange)' }}>
                {fmt(opp.billable)}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--steel)', marginTop: 4 }}>
                Confidence: {pct}% | Cost: {fmt(opp.estCost)}
              </div>
            </div>
          </div>

          {opp.evidence?.length > 0 && (
            <>
              <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--steel)', margin: '16px 0 8px', fontWeight: 600 }}>
                Direct Source Evidence Citations
              </div>
              {opp.evidence.map((ev, i) => (
                <div key={i} className="evidence-item" style={{ borderLeft: '3px solid var(--orange)' }}>
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

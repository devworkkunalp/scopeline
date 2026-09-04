import { useState, useEffect } from 'react';
import { api } from '../api.js';

const fmt = (n) =>
  !n && n !== 0 ? '—' :
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const SAMPLE_EMAIL = `---------- Forwarded message ---------
From: Sara Jenkins <sara.jenkins@apexretail.io>
Date: Fri, Sep 4, 2026 at 2:15 PM
Subject: Urgent: Add Stripe Multi-Currency Subscriptions to Portal
To: delivery-team@devagency.io

Hi Team,

Our executive team just decided we must support EUR and GBP billing with Stripe recurring subscriptions for international buyers before our Q4 launch.

I know this wasn't in our original fixed-scope SOW baseline, but we need your team to implement the FX rate calculation and multi-currency webhook engine.

Please proceed ASAP!

Thanks,
Sara Jenkins
VP of Product`;

export default function InboundEmailModal({ activeProject, onClose, onIngested, setPage, perspective = 'vendor' }) {
  const [addressData, setAddressData] = useState(null);
  const [copied, setCopied] = useState(false);
  
  // Single Email Input (Zero manual forms!)
  const [rawEmail, setRawEmail] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  const isClient = perspective === 'client';

  useEffect(() => {
    if (activeProject?.id) {
      api.inboundAddress(activeProject.id)
        .then(setAddressData)
        .catch(() => {
          setAddressData({
            standardInboundAddress: `inbound+${activeProject.id}@scopeline.io`,
          });
        });
    }
  }, [activeProject]);

  function copyAddress() {
    const addr = addressData?.standardInboundAddress || `inbound+${activeProject?.id}@scopeline.io`;
    navigator.clipboard?.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function loadSample() {
    setRawEmail(SAMPLE_EMAIL);
    setResult(null);
    setErr('');
  }

  async function handleProcess(e) {
    e.preventDefault();
    if (!rawEmail.trim()) {
      setErr('Please paste an email thread or forward text.');
      return;
    }

    setProcessing(true);
    setErr('');
    setResult(null);

    try {
      const res = await api.simulateInboundEmail(activeProject.id, {
        from: 'Client Stakeholder',
        subject: 'Forwarded Client Request',
        body: rawEmail.trim(),
        createChangeRequest: true,
      });

      setResult(res);
      onIngested?.(res);
    } catch (ex) {
      setErr(ex.message || 'Failed to process forwarded email');
    } finally {
      setProcessing(false);
    }
  }

  const inboundAddr = addressData?.standardInboundAddress || `inbound+${activeProject?.id}@scopeline.io`;

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div
        className="modal"
        id="inbound-email-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 680, width: '92%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>📬</span>
              <h3 style={{ margin: 0, color: 'var(--navy)', fontSize: 18, fontWeight: 700 }}>
                {isClient ? 'Forward Vendor Notice / Claim' : 'Forward Client Email for Instant Scope Ingestion'}
              </h3>
            </div>
            <p style={{ margin: '4px 0 0', color: 'var(--steel)', fontSize: 13 }}>
              Project: <strong style={{ color: 'var(--navy)' }}>{activeProject?.name}</strong> · Zero manual data entry.
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* 1. Forwarding Email Box */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--steel)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Option A: Forward From Your Email Client
            </span>
            <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 600 }}>● Active Inbox</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <code style={{ background: '#FFFFFF', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: 13, color: 'var(--navy)', fontWeight: 600, flex: 1, minWidth: 260 }}>
              {inboundAddr}
            </code>
            <button
              type="button"
              className="btn small"
              onClick={copyAddress}
              style={{ background: 'var(--navy)', color: '#fff', minWidth: 120, height: 36 }}
            >
              {copied ? '✓ Copied!' : '📋 Copy Address'}
            </button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--steel)', marginTop: 6 }}>
            Forward any client email thread directly to this address. Our AI parses the sender, subject, and message, audits it against the SOW, and drafts the change order automatically.
          </div>
        </div>

        {/* 2. Direct Paste / Drop Box */}
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
              Option B: Paste Email Thread or Drop Content Here
            </label>
            <button
              type="button"
              className="btn ghost small"
              onClick={loadSample}
              style={{ fontSize: 11.5, padding: '2px 8px', color: 'var(--orange)', borderColor: 'var(--orange)' }}
            >
              ⚡ Paste Sample Email
            </button>
          </div>

          <form onSubmit={handleProcess}>
            <textarea
              rows={6}
              value={rawEmail}
              onChange={(e) => setRawEmail(e.target.value)}
              placeholder="Paste the raw forwarded email thread here (with or without headers)..."
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '13px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontFamily: 'inherit',
                lineHeight: 1.5,
                background: '#FFFFFF',
              }}
            />

            {err && <div className="error" style={{ marginTop: 8 }}>{err}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              <button type="button" className="btn ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn orange"
                disabled={processing}
                style={{ minWidth: 220 }}
              >
                {processing ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14, marginRight: 8 }} />
                    Parsing & Auditing Scope…
                  </>
                ) : (
                  '⚡ Auto-Process Email'
                )}
              </button>
            </div>

            {/* Results Card */}
            {result && (
              <div
                id="inbound-email-result-card"
                style={{
                  marginTop: 18,
                  padding: 16,
                  borderRadius: 8,
                  background: result.isOutOfScope ? '#FFFBEB' : '#F0FDF4',
                  border: `1.5px solid ${result.isOutOfScope ? '#FCD34D' : '#86EFAC'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{result.isOutOfScope ? '🚨' : '✅'}</span>
                    <strong style={{ fontSize: 14, color: result.isOutOfScope ? '#92400E' : '#166534' }}>
                      {result.isOutOfScope ? 'OUT OF SCOPE VARIATION DETECTED' : 'IN SCOPE DELIVERABLE VERIFIED'}
                    </strong>
                  </div>
                  {result.isOutOfScope && (
                    <span className="mono" style={{ fontWeight: 700, fontSize: 16, color: 'var(--orange)' }}>
                      +{fmt(result.billableValue)}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 12.5, color: '#334155', background: '#fff', padding: '10px 12px', borderRadius: 6, border: '1px solid #E2E8F0', marginBottom: 12 }}>
                  <div><strong>Detected Request:</strong> {result.opportunityTitle || 'Client Scope Request'}</div>
                  <div style={{ marginTop: 2 }}><strong>Contract Clause:</strong> {result.clause}</div>
                </div>

                {setPage && (
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn small ghost"
                      onClick={() => {
                        onClose();
                        setPage('documents');
                      }}
                    >
                      📁 View Ingested Email Proof
                    </button>
                    {result.isOutOfScope && (
                      <button
                        type="button"
                        className="btn small orange"
                        onClick={() => {
                          onClose();
                          setPage('opportunities');
                        }}
                      >
                        ⚡ View Change Order →
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

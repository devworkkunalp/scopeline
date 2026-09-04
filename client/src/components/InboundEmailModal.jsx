import { useState, useEffect } from 'react';
import { api } from '../api.js';

const fmt = (n) =>
  !n && n !== 0 ? '—' :
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const SAMPLE_PRESETS = [
  {
    label: '⚡ Multi-Currency & Subscriptions (Out of Scope)',
    sender: 'sara.jenkins@apexretail.io',
    subject: 'Urgent: Add Stripe Multi-Currency Subscriptions to Portal',
    body: `Hi Team,\n\nOur executive team just decided we must support EUR and GBP billing with Stripe recurring subscriptions for international buyers before Q4 launch.\n\nI know this wasn't in our original fixed-scope SOW, but we need your team to implement the FX rate calculation and multi-currency webhook engine.\n\nPlease proceed ASAP!`,
    hours: 24,
    rate: 150,
  },
  {
    label: '📊 Executive Analytics Data Pipeline (Out of Scope)',
    sender: 'marcus.vance@globalhealth.org',
    subject: 'Request for Daily Executive BI Export Pipeline',
    body: `Hello,\n\nCan you add an automated nightly data pipeline that extracts all project KPIs and emails PDF summary reports to our board members?\n\nThis is a critical addition outside the primary portal MVP.`,
    hours: 32,
    rate: 175,
  },
  {
    label: '✓ Tablet Viewport Responsiveness (In-Scope Delivery)',
    sender: 'david.miller@clientcorp.com',
    subject: 'iPad viewport layout adjustment',
    body: `Hi,\n\nWe noticed the navigation header wraps awkwardly on iPad screen resolutions. As per Section 1.2 responsive web design requirements in our contract, could you please fix this formatting glitch?`,
    hours: 4,
    rate: 150,
  },
];

export default function InboundEmailModal({ activeProject, onClose, onIngested, setPage, perspective = 'vendor' }) {
  const [tab, setTab] = useState('simulate'); // 'simulate' | 'guide' | 'webhook'
  const [addressData, setAddressData] = useState(null);
  const [copied, setCopied] = useState('');
  
  // Simulator State
  const [sender, setSender] = useState(SAMPLE_PRESETS[0].sender);
  const [subject, setSubject] = useState(SAMPLE_PRESETS[0].subject);
  const [body, setBody] = useState(SAMPLE_PRESETS[0].body);
  const [hours, setHours] = useState(SAMPLE_PRESETS[0].hours);
  const [rate, setRate] = useState(SAMPLE_PRESETS[0].rate);
  const [autoCr, setAutoCr] = useState(true);
  
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  const isClient = perspective === 'client';

  useEffect(() => {
    if (activeProject?.id) {
      api.inboundAddress(activeProject.id)
        .then(setAddressData)
        .catch(() => {
          // Fallback if network fails
          setAddressData({
            standardInboundAddress: `inbound+${activeProject.id}@scopeline.io`,
            vanityInboundAddress: `project-${(activeProject.name || 'delivery').toLowerCase().replace(/[^a-z0-9]/g, '-')}-${activeProject.id.substring(0, 8)}@inbound.scopeline.io`,
          });
        });
    }
  }, [activeProject]);

  function copyText(txt, label) {
    navigator.clipboard?.writeText(txt);
    setCopied(label);
    setTimeout(() => setCopied(''), 2500);
  }

  function applyPreset(p) {
    setSender(p.sender);
    setSubject(p.subject);
    setBody(p.body);
    setHours(p.hours);
    setRate(p.rate);
    setResult(null);
    setErr('');
  }

  async function handleSimulate(e) {
    e.preventDefault();
    if (!sender.trim() || !subject.trim() || !body.trim()) {
      setErr('Sender, Subject, and Email Body are required.');
      return;
    }

    setSimulating(true);
    setErr('');
    setResult(null);

    try {
      const res = await api.simulateInboundEmail(activeProject.id, {
        from: sender.trim(),
        subject: subject.trim(),
        body: body.trim(),
        claimedHours: parseFloat(hours) || 20,
        hourlyRate: parseFloat(rate) || 150,
        createChangeRequest: autoCr,
      });

      setResult(res);
      onIngested?.(res);
    } catch (ex) {
      setErr(ex.message || 'Failed to simulate inbound email ingestion');
    } finally {
      setSimulating(false);
    }
  }

  const standardAddr = addressData?.standardInboundAddress || `inbound+${activeProject?.id}@scopeline.io`;
  const vanityAddr = addressData?.vanityInboundAddress || `project-inbox@inbound.scopeline.io`;

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div
        className="modal"
        id="inbound-email-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 760, width: '92%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>📬</span>
              <h3 style={{ margin: 0, color: 'var(--navy)', fontSize: 18, fontWeight: 700 }}>
                {isClient ? 'Official Inbound Claim & Notice Ingestion' : 'Inbound Email Forwarding & Zero-Manual Scope Ingestion'}
              </h3>
            </div>
            <p style={{ margin: '4px 0 0', color: 'var(--steel)', fontSize: 13 }}>
              Project: <strong style={{ color: 'var(--navy)' }}>{activeProject?.name}</strong> · Forward client emails directly to auto-detect out-of-scope work.
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Dedicated Forwarding Address Callout Box */}
        <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
            📬 Dedicated Inbound Forwarding Address
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <code style={{ background: '#FFFFFF', padding: '6px 12px', border: '1px solid #7DD3FC', borderRadius: 6, fontSize: 13, color: 'var(--navy)', fontWeight: 600, flex: 1, minWidth: 260 }}>
              {standardAddr}
            </code>
            <button
              type="button"
              className="btn small"
              onClick={() => copyText(standardAddr, 'standard')}
              style={{ background: '#0284C7', color: '#fff', borderColor: '#0284C7', minWidth: 110 }}
            >
              {copied === 'standard' ? '✓ Copied!' : '📋 Copy Address'}
            </button>
          </div>
          <div style={{ fontSize: 12, color: '#0284C7', marginTop: 8 }}>
            💡 <strong>Zero Manual Entry:</strong> When a client sends a scope change or new feature request, forward the email to this address. Scopeline parses it via MimeKit, grounds it against the baseline SOW, and logs the change order automatically.
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20, gap: 10 }}>
          <button
            type="button"
            className={`btn small ${tab === 'simulate' ? 'orange' : 'ghost'}`}
            onClick={() => setTab('simulate')}
            style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none' }}
          >
            ⚡ Test Inbound Simulator
          </button>
          <button
            type="button"
            className={`btn small ${tab === 'guide' ? 'orange' : 'ghost'}`}
            onClick={() => setTab('guide')}
            style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none' }}
          >
            📖 Gmail / Outlook Setup
          </button>
          <button
            type="button"
            className={`btn small ${tab === 'webhook' ? 'orange' : 'ghost'}`}
            onClick={() => setTab('webhook')}
            style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none' }}
          >
            🔌 Webhook API Spec
          </button>
        </div>

        {/* TAB 1: SIMULATOR */}
        {tab === 'simulate' && (
          <form onSubmit={handleSimulate}>
            {/* Presets */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--steel)', marginBottom: 6 }}>
                Load Sample Test Email:
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SAMPLE_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="btn ghost small"
                    onClick={() => applyPreset(p)}
                    style={{ fontSize: 11.5, padding: '4px 10px' }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Email Form Fields */}
            <div className="grid cols-2" style={{ gap: 12 }}>
              <div className="field">
                <label className="field-label">From (Client Sender Email) *</label>
                <input
                  type="text"
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  placeholder="e.g. sara.jenkins@clientcorp.com"
                  required
                />
              </div>
              <div className="field">
                <label className="field-label">Subject Line *</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Request for multi-currency settlement"
                  required
                />
              </div>
            </div>

            <div className="field" style={{ marginTop: 10 }}>
              <label className="field-label">Forwarded Email Body Context *</label>
              <textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Paste the full email thread or client ask..."
                required
              />
            </div>

            <div className="grid cols-2" style={{ marginTop: 10 }}>
              <div className="field">
                <label className="field-label">Estimated Engineering Hours</label>
                <input
                  type="number"
                  min="1"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">Agreed SOW Hourly Rate ($/hr)</label>
                <input
                  type="number"
                  min="1"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                />
              </div>
            </div>

            <div style={{ margin: '14px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                id="auto-cr-check"
                checked={autoCr}
                onChange={(e) => setAutoCr(e.target.checked)}
              />
              <label htmlFor="auto-cr-check" style={{ fontSize: 13, color: 'var(--navy)', cursor: 'pointer' }}>
                Automatically draft Change Request & Generate Magic Link Approval Token
              </label>
            </div>

            {err && <div className="error" style={{ marginBottom: 12 }}>{err}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button type="button" className="btn ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn orange"
                disabled={simulating}
                style={{ minWidth: 200 }}
              >
                {simulating ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14, marginRight: 8 }} />
                    Parsing & Auditing Scope…
                  </>
                ) : (
                  '📨 Simulate Inbound Email Ingestion'
                )}
              </button>
            </div>

            {/* Ingestion Results Card */}
            {result && (
              <div
                id="inbound-email-result-card"
                style={{
                  marginTop: 20,
                  padding: 16,
                  borderRadius: 8,
                  background: result.isOutOfScope ? '#FFFBEB' : '#F0FDF4',
                  border: `1.5px solid ${result.isOutOfScope ? '#FCD34D' : '#86EFAC'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{result.isOutOfScope ? '🚨' : '✅'}</span>
                    <strong style={{ fontSize: 15, color: result.isOutOfScope ? '#92400E' : '#166534' }}>
                      {result.isOutOfScope ? 'OUT OF SCOPE VARIATION DETECTED' : 'IN SCOPE DELIVERABLE VERIFIED'}
                    </strong>
                  </div>
                  {result.isOutOfScope && (
                    <span className="mono" style={{ fontWeight: 700, fontSize: 16, color: 'var(--orange)' }}>
                      +{fmt(result.billableValue)}
                    </span>
                  )}
                </div>

                <p style={{ margin: '0 0 10px', fontSize: 13, color: '#334155' }}>
                  {result.message}
                </p>

                <div style={{ fontSize: 12, color: 'var(--steel)', background: '#fff', padding: '8px 12px', borderRadius: 6, border: '1px solid #E2E8F0', marginBottom: 12 }}>
                  <div><strong>Contract Clause:</strong> {result.clause}</div>
                  <div><strong>Ingested Document:</strong> Proof stored as <code>.eml</code></div>
                  {result.opportunityTitle && <div><strong>Opportunity Title:</strong> {result.opportunityTitle}</div>}
                </div>

                {setPage && (
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn small ghost"
                      onClick={() => {
                        onClose();
                        setPage('documents');
                      }}
                    >
                      📁 View Ingested EML
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
                        ⚡ View in Opportunities →
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </form>
        )}

        {/* TAB 2: GMAIL / OUTLOOK GUIDE */}
        {tab === 'guide' && (
          <div style={{ fontSize: 13.5, color: 'var(--navy)', lineHeight: 1.6 }}>
            <h4 style={{ margin: '0 0 8px', color: 'var(--navy)' }}>How to Set Up 1-Minute Auto-Forwarding</h4>
            <p style={{ margin: '0 0 14px', color: 'var(--steel)', fontSize: 13 }}>
              You don't need to connect your full mailbox or compromise team privacy. Simply forward specific client threads or create a rule.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* Gmail Guide */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 14 }}>
                <h5 style={{ margin: '0 0 8px', color: '#DC2626' }}>🔴 Google Workspace / Gmail</h5>
                <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#475569' }}>
                  <li>Go to <strong>Settings → Forwarding and POP/IMAP</strong>.</li>
                  <li>Click <strong>Add a forwarding address</strong> and paste: <br/><code style={{ fontSize: 11 }}>{standardAddr}</code></li>
                  <li>Or create a filter: <em>From: client@domain.com</em> → Forward to Scopeline.</li>
                </ol>
              </div>

              {/* Outlook Guide */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 14 }}>
                <h5 style={{ margin: '0 0 8px', color: '#2563EB' }}>🔵 Microsoft 365 / Outlook</h5>
                <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#475569' }}>
                  <li>Go to <strong>Settings → Mail → Rules</strong>.</li>
                  <li>Add a new rule: <em>Condition: "From client" + "Subject contains 'Change / Urgent / Add'"</em>.</li>
                  <li>Action: <em>Forward to <code style={{ fontSize: 11 }}>{standardAddr}</code></em>.</li>
                </ol>
              </div>
            </div>

            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '10px 14px', borderRadius: 6, fontSize: 12.5, color: '#166534' }}>
              ✓ <strong>Security & Compliance:</strong> Scopeline only processes emails routed specifically to your unique project hash. No external mailbox scraping or OAuth reading permissions required.
            </div>
          </div>
        )}

        {/* TAB 3: WEBHOOK API SPEC */}
        {tab === 'webhook' && (
          <div style={{ fontSize: 13, color: 'var(--navy)' }}>
            <h4 style={{ margin: '0 0 8px', color: 'var(--navy)' }}>Inbound Webhook API Specification</h4>
            <p style={{ color: 'var(--steel)', fontSize: 12.5, margin: '0 0 12px' }}>
              Compatible with SendGrid Inbound Parse, Postmark Inbound Webhooks, Mailgun, and AWS SES.
            </p>

            <div style={{ background: '#1E293B', color: '#E2E8F0', padding: 12, borderRadius: 6, fontFamily: 'monospace', fontSize: 12, marginBottom: 12 }}>
              <div><strong style={{ color: '#38BDF8' }}>POST</strong> /api/inbound/email</div>
              <div><strong style={{ color: '#38BDF8' }}>Content-Type:</strong> multipart/form-data OR application/json</div>
              <div style={{ marginTop: 8, color: '#94A3B8' }}>// Payload Fields:</div>
              <div>{`{`}</div>
              <div style={{ paddingLeft: 16 }}>{`"to": "${standardAddr}",`}</div>
              <div style={{ paddingLeft: 16 }}>{`"from": "client.sponsor@company.com",`}</div>
              <div style={{ paddingLeft: 16 }}>{`"subject": "Change request details",`}</div>
              <div style={{ paddingLeft: 16 }}>{`"text": "Email body content...",`}</div>
              <div style={{ paddingLeft: 16 }}>{`"eml": "Raw MIME string (optional)"`}</div>
              <div>{`}`}</div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--steel)' }}>
              Responses return HTTP 200 with the evaluated scope verdict and auto-created opportunity ID.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

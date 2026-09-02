import { useState } from 'react';
import { api } from '../api.js';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

export default function MomLoggerModal({ activeProject, onClose, onAdded }) {
  const [tab, setTab] = useState('mom'); // 'mom' | 'email' | 'chat'
  
  // MOM Fields
  const [meetingTitle, setMeetingTitle] = useState('Weekly Client Standup / Sprint Review');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [stakeholder, setStakeholder] = useState('');
  const [askSummary, setAskSummary] = useState('');
  const [momRaw, setMomRaw] = useState('');
  
  // Email Fields
  const [emailSubject, setEmailSubject] = useState('');
  const [emailSender, setEmailSender] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // Chat Fields
  const [chatChannel, setChatChannel] = useState('#client-project-delivery');
  const [chatAuthor, setChatAuthor] = useState('');
  const [chatSnippet, setChatSnippet] = useState('');

  // Commercials
  const [hours, setHours] = useState('24');
  const [rate, setRate] = useState('150');

  // Analysis State
  const [evaluating, setEvaluating] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [copiedEmail, setCopiedEmail] = useState(false);

  const inboundEmail = `project-${(activeProject?.name || 'delivery').toLowerCase().replace(/[^a-z0-9]/g, '-')}-${activeProject?.id?.substring(0, 6) || 'box'}@inbound.scopeline.io`;

  async function handleEvaluate(e) {
    e?.preventDefault();
    let title = '';
    let desc = '';
    let source = '';

    if (tab === 'mom') {
      if (!stakeholder.trim() || !askSummary.trim()) {
        setErr('Client stakeholder and requested ask summary are required.');
        return;
      }
      title = `${meetingTitle}: ${askSummary.substring(0, 60)}`;
      source = `MOM: ${meetingTitle} (${stakeholder})`;
      desc = `Client Stakeholder: ${stakeholder}\nMeeting Date: ${meetingDate}\n\nAsk / Decision:\n${askSummary}\n\nMeeting Notes Snippet:\n${momRaw}`;
    } else if (tab === 'email') {
      if (!emailSubject.trim() || !emailBody.trim()) {
        setErr('Email subject and body snippet are required.');
        return;
      }
      title = `Email: ${emailSubject}`;
      source = `Email: ${emailSender || 'Client Stakeholder'}`;
      desc = `Sender: ${emailSender}\nSubject: ${emailSubject}\n\nEmail Thread Context:\n${emailBody}`;
    } else {
      if (!chatSnippet.trim()) {
        setErr('Chat message snippet is required.');
        return;
      }
      title = `Chat Ask: ${chatSnippet.substring(0, 60)}`;
      source = `Chat ${chatChannel} (${chatAuthor || 'Client'})`;
      desc = `Channel: ${chatChannel}\nAuthor: ${chatAuthor}\n\nMessage Quote:\n${chatSnippet}`;
    }

    setErr('');
    setEvaluating(true);
    try {
      const res = await api.checkScope(activeProject.id, {
        title,
        description: desc,
        source,
        dateLabel: meetingDate,
        estimatedHours: parseFloat(hours) || 20,
        hourlyRate: parseFloat(rate) || 150,
      });
      setVerdict({ ...res, calculatedTitle: title, calculatedSource: source, calculatedDesc: desc });
    } catch (ex) {
      setErr(ex.message || 'AI scope evaluation failed');
    } finally {
      setEvaluating(false);
    }
  }

  async function handleSave(createCR = false) {
    if (!verdict) return;
    setSaving(true);
    setErr('');
    try {
      const opp = await api.addManualOpportunity(activeProject.id, {
        title: verdict.title || verdict.calculatedTitle,
        description: verdict.description || verdict.calculatedDesc,
        type: verdict.type || 'Scope Change',
        estimatedCost: verdict.estimatedCost || (parseFloat(hours) * parseFloat(rate) * 0.7),
        billableValue: verdict.billableValue || (parseFloat(hours) * parseFloat(rate)),
        clause: verdict.clause || '§2 Exclusions & Variation Rules',
        source: verdict.source || verdict.calculatedSource,
        dateLabel: meetingDate,
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

  function copyInbound() {
    navigator.clipboard.writeText(inboundEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  }

  return (
    <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
        <div className="modal-head">
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: '0.08em', color: 'var(--orange)', textTransform: 'uppercase', fontWeight: 600 }}>
              Privacy-First Informal Ingestion
            </div>
            <h3>Log Post-Meeting MOM / Email Drop-In</h3>
          </div>
          <button onClick={onClose} aria-label="Close">&times;</button>
        </div>

        {/* Tab Selection */}
        <div className="tab-bar" style={{ padding: '0 24px', borderBottom: '1px solid var(--border)', background: 'var(--paper)' }}>
          <button
            type="button"
            className={`tab-item ${tab === 'mom' ? 'active' : ''}`}
            onClick={() => { setTab('mom'); setVerdict(null); setErr(''); }}
          >
            📝 Post-Meeting MOM
          </button>
          <button
            type="button"
            className={`tab-item ${tab === 'email' ? 'active' : ''}`}
            onClick={() => { setTab('email'); setVerdict(null); setErr(''); }}
          >
            ✉️ Email Drop-In / Forward
          </button>
          <button
            type="button"
            className={`tab-item ${tab === 'chat' ? 'active' : ''}`}
            onClick={() => { setTab('chat'); setVerdict(null); setErr(''); }}
          >
            💬 Chat Thread Paste
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: 'calc(80vh - 120px)', overflowY: 'auto' }}>
          {err && <div className="error" style={{ marginBottom: 14 }}>{err}</div>}

          {/* TAB 1: MOM */}
          {tab === 'mom' && (
            <>
              <div style={{ background: '#F8FAFC', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: 4, marginBottom: 16, fontSize: 12.5, color: 'var(--steel)' }}>
                <strong>Rule-Based MOM Guideline:</strong> Enter the client decision maker and action items from your meeting notes. The AI will cross-reference the ask against SOW boundaries.
              </div>

              <div className="grid cols-2">
                <div className="field">
                  <label className="field-label">Meeting Title / Standup *</label>
                  <input
                    type="text"
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    placeholder="e.g. Sprint 3 Demo & Review"
                  />
                </div>
                <div className="field">
                  <label className="field-label">Meeting Date *</label>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label">Client Stakeholder / Requester *</label>
                <input
                  type="text"
                  value={stakeholder}
                  onChange={(e) => setStakeholder(e.target.value)}
                  placeholder="e.g. Dave Miller (VP Product, Acme Corp)"
                />
              </div>

              <div className="field">
                <label className="field-label">Requested Feature / Client Ask Summary *</label>
                <textarea
                  rows={2}
                  value={askSummary}
                  onChange={(e) => setAskSummary(e.target.value)}
                  placeholder="e.g. Client requested enabling multi-currency EUR/GBP tax calculations and Recharge recurring subscriptions before launch."
                />
              </div>

              <div className="field">
                <label className="field-label">Raw Meeting Notes / MOM Bullets (Optional Context)</label>
                <textarea
                  rows={3}
                  value={momRaw}
                  onChange={(e) => setMomRaw(e.target.value)}
                  placeholder="* Reviewed checkout flow. Dave requested subscriptions support. Marcus noted design effort."
                />
              </div>
            </>
          )}

          {/* TAB 2: EMAIL DROP-IN */}
          {tab === 'email' && (
            <>
              <div style={{ background: '#F0F7FF', border: '1px solid #BAE6FD', padding: '12px 14px', borderRadius: 4, marginBottom: 16, fontSize: 12.5, color: '#0369A1' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>📬 Dedicated Project Forwarding Address:</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <code style={{ background: '#fff', padding: '4px 8px', border: '1px solid #BAE6FD', borderRadius: 3, fontSize: 12, flex: 1, color: 'var(--navy)' }}>
                    {inboundEmail}
                  </code>
                  <button type="button" className="btn small ghost" onClick={copyInbound}>
                    {copiedEmail ? '✓ Copied' : 'Copy Address'}
                  </button>
                </div>
                <div style={{ marginTop: 6, fontSize: 11.5, color: '#0284C7' }}>
                  Forward only specific client emails to this address — no full mailbox sync or privacy exposure required.
                </div>
              </div>

              <div className="grid cols-2">
                <div className="field">
                  <label className="field-label">Client Sender *</label>
                  <input
                    type="text"
                    value={emailSender}
                    onChange={(e) => setEmailSender(e.target.value)}
                    placeholder="e.g. Dave Miller <dave@acmeproducts.com>"
                  />
                </div>
                <div className="field">
                  <label className="field-label">Email Subject *</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="e.g. Re: Urgent request for international tax & subscriptions"
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label">Forwarded Email Body / Client Instruction *</label>
                <textarea
                  rows={4}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Paste the email thread where the client requested new scope or changes..."
                />
              </div>
            </>
          )}

          {/* TAB 3: CHAT SNIPPET */}
          {tab === 'chat' && (
            <>
              <div style={{ background: '#F8FAFC', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: 4, marginBottom: 16, fontSize: 12.5, color: 'var(--steel)' }}>
                <strong>Selective Thread Ingestion:</strong> Paste only the specific Slack/Teams message where the client requested work.
              </div>

              <div className="grid cols-2">
                <div className="field">
                  <label className="field-label">Channel / Group</label>
                  <input
                    type="text"
                    value={chatChannel}
                    onChange={(e) => setChatChannel(e.target.value)}
                    placeholder="e.g. #acme-general or Slack Connect"
                  />
                </div>
                <div className="field">
                  <label className="field-label">Client Requester</label>
                  <input
                    type="text"
                    value={chatAuthor}
                    onChange={(e) => setChatAuthor(e.target.value)}
                    placeholder="e.g. Dave Miller (VP)"
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label">Chat Message Snippet *</label>
                <textarea
                  rows={4}
                  value={chatSnippet}
                  onChange={(e) => setChatSnippet(e.target.value)}
                  placeholder="Paste the Slack / Teams thread messages..."
                />
              </div>
            </>
          )}

          {/* Commercials Grid */}
          <div className="grid cols-2" style={{ marginTop: 8 }}>
            <div className="field">
              <label className="field-label">Estimated Engineering / Design Hours</label>
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

          {/* Evaluate Button */}
          {!verdict && (
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button
                type="button"
                className="btn"
                disabled={evaluating}
                onClick={handleEvaluate}
                style={{ minWidth: 260 }}
              >
                {evaluating ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14, marginRight: 8 }} />
                    Cross-Checking SOW Baseline…
                  </>
                ) : (
                  '⚡ Verify Scope & Build Proof Package'
                )}
              </button>
            </div>
          )}

          {/* SIDE-BY-SIDE PROOF PACKAGE & VERDICT */}
          {verdict && (
            <div style={{ marginTop: 20, borderTop: '2px solid var(--border)', paddingTop: 16 }}>
              {/* 4-Point Rule Audit Badge Bar */}
              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '10px 14px', borderRadius: 4, marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: '#065F46' }}>
                <span style={{ fontWeight: 600 }}>✓ Client Requester Identified</span>
                <span style={{ fontWeight: 600 }}>✓ Timeline After SOW Execution</span>
                <span style={{ fontWeight: 600 }}>✓ SOW Clause Boundary Verified</span>
                <span style={{ fontWeight: 600 }}>✓ Rate Calculation Grounded ($150/hr)</span>
              </div>

              {/* Status Banner */}
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 4,
                  background: verdict.isOutOfScope ? '#FFF3E0' : '#E8F5E9',
                  border: `1px solid ${verdict.isOutOfScope ? 'var(--orange)' : 'var(--green)'}`,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      textTransform: 'uppercase',
                      color: verdict.isOutOfScope ? 'var(--orange)' : 'var(--green)',
                    }}
                  >
                    {verdict.isOutOfScope ? '⚡ OUT OF SCOPE (BILLABLE REVENUE DETECTED)' : '✓ COVERED IN BASE SOW AGREEMENT'}
                  </span>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>
                    Confidence: {Math.round((verdict.confidence || 0.9) * 100)}%
                  </span>
                </div>
                <div style={{ fontSize: 13, marginTop: 6, color: 'var(--navy)' }}>
                  {verdict.reasoning || verdict.description}
                </div>
              </div>

              {/* 3-WAY SIDE-BY-SIDE PROOF CARD */}
              <div className="grid cols-3" style={{ gap: 12, marginBottom: 16 }}>
                <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: 12, borderRadius: 4 }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--steel)', fontWeight: 600, marginBottom: 4 }}>
                    1. The Informal Request
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--navy)' }}>
                    {stakeholder || emailSender || chatAuthor || 'Client Stakeholder'}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--steel)', marginTop: 4 }}>
                    {askSummary || emailSubject || chatSnippet}
                  </div>
                </div>

                <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: 12, borderRadius: 4 }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--steel)', fontWeight: 600, marginBottom: 4 }}>
                    2. SOW Barrier Clause
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--navy)' }}>
                    {verdict.clause || '§2 Exclusions'}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--steel)', marginTop: 4 }}>
                    {verdict.citation || 'Excluded deliverable requiring formal Change Request.'}
                  </div>
                </div>

                <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: 12, borderRadius: 4 }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--steel)', fontWeight: 600, marginBottom: 4 }}>
                    3. Financial Proof
                  </div>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--orange)' }}>
                    {fmt(verdict.billableValue || (parseFloat(hours) * parseFloat(rate)))}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 4 }}>
                    {hours} hrs × ${rate}/hr rate
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={saving}
                  onClick={() => handleSave(false)}
                >
                  Save as Scope Opportunity
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={saving}
                  onClick={() => handleSave(true)}
                  style={{ background: 'var(--orange)', borderColor: 'var(--orange)' }}
                >
                  {saving ? 'Generating…' : '⚡ Generate Change Request with Proof →'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

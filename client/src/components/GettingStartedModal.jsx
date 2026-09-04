import { useState } from 'react';

export default function GettingStartedModal({ onClose, onNavigate, perspective = 'vendor' }) {
  const [activeStep, setActiveStep] = useState(1);
  const isClient = perspective === 'client';

  const steps = [
    {
      num: 1,
      tag: isClient ? 'VENDOR SOW BASELINE' : 'CONTRACT SETUP',
      title: isClient ? '1. Establish Contract Baseline & Warranty Terms' : '1. Upload Signed SOW & Contract Baseline',
      desc: isClient
        ? 'Upload your vendor MSA/SOW to lock in agreed deliverables, 90-day defect warranties, and change order rules to prevent unauthorized vendor billing.'
        : 'Upload your signed SOW or MSA (PDF, DOCX, TXT) to establish contractual boundaries, covered deliverables, out-of-scope exclusions, and hourly billing rates.',
      pageKey: 'contract',
      btnLabel: isClient ? 'Go to Baseline SOW' : 'Go to Scope of Work',
      highlight: 'Saves hours of manual contract review by extracting clauses into searchable parameters.',
      bulletPoints: [
        'Automatic extraction of §1 Covered Scope & §2 Exclusions',
        'Locked-in hourly rates, payment terms, and notice rules',
        'Live contract comparison engine for every subsequent deliverable',
      ],
      icon: '📄',
    },
    {
      num: 2,
      tag: 'ZERO MANUAL ENTRY',
      title: '2. Ingest Inbound Client Asks & Emails',
      desc: 'Never manually retype client scope asks. Forward emails directly to your live CloudMailin inbox, upload meeting notes (MOM), Slack chats, or ticket PDFs.',
      pageKey: 'data',
      btnLabel: 'Go to Project Activity',
      highlight: 'Forwarding to 4d5fcfd49f452cf19bbf@cloudmailin.net instantly parses the scope ask into your project stream.',
      bulletPoints: [
        'Live CloudMailin email ingestion: 4d5fcfd49f452cf19bbf@cloudmailin.net',
        'Post-meeting MOM note logger with automatic participant & ask extraction',
        'Slack, EML, PDF, and DOCX drag-and-drop ingestion',
      ],
      icon: '📥',
    },
    {
      num: 3,
      tag: isClient ? 'OVERBILLING DEFENSE' : 'SCOPE AUDIT & REVENUE',
      title: isClient ? '3. Audit Vendor Claims Against Warranty' : '3. Detect Scope Creep & Billable Opportunities',
      desc: isClient
        ? 'Scopeline automatically flags redundant charges, warranty-covered bug fixes masquerading as change orders, and unapproved rate hikes.'
        : 'Scopeline cross-references ingested activity against the SOW, identifies unbilled scope expansions, calculates realistic hours, and estimates potential billable revenue.',
      pageKey: 'opportunities',
      btnLabel: isClient ? 'View Audit & Claims' : 'View Scope Opportunities',
      highlight: 'Every detected opportunity includes 3-way grounded proof linking the exact client quote to the SOW clause.',
      bulletPoints: [
        'AI classification: Scope Expansion, Acceleration, Extra Revisions, or Rework',
        'Smart Rate Realism & itemized hours estimation by role',
        '1-Click "Scope Defense Notice" generator with legal citations',
      ],
      icon: '⚡',
    },
    {
      num: 4,
      tag: '1-CLICK APPROVALS',
      title: '4. Generate Change Orders & Client E-Signature',
      desc: 'Turn any scope item into a formal, legally grounded Change Order with a single click. Share passwordless client review links for frictionless digital approval.',
      pageKey: 'change-orders',
      btnLabel: 'Go to Change Requests',
      highlight: 'Clients can review evidence, inspect baseline clauses, and legally e-sign without creating an account.',
      bulletPoints: [
        'Instant Change Order generation (CR-001, CR-002...) with full cost breakdown',
        'Public Review Magic Links (/review/:token) with digital signature & audit log',
        'Professional QuestPDF document export ready for executive signing',
      ],
      icon: '✍️',
    },
    {
      num: 5,
      tag: 'FINANCIAL RECONCILIATION',
      title: '5. Reconcile Revenue & Invoices',
      desc: 'Track approved change orders against milestone billing to ensure zero unbilled margin leakage and prevent invoice payment delays.',
      pageKey: 'invoices',
      btnLabel: 'Go to Invoice Tracking',
      highlight: 'Identifies unbilled gaps in real-time so your team gets paid for 100% of delivered value.',
      bulletPoints: [
        'Approved vs. Invoiced reconciliation table with gap indicators',
        '1-Click "Mark as Paid" or "Partially Clear" reconciliation actions',
        'Live SOW Drift and Milestone Burn Rate telemetry',
      ],
      icon: '📊',
    },
  ];

  const curr = steps.find((s) => s.num === activeStep) || steps[0];

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '780px',
          width: '94vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 0,
          background: '#F7F5F0',
          borderRadius: '6px',
        }}
      >
        {/* Header Strip */}
        <div
          style={{
            background: '#14213D',
            color: '#FFFFFF',
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🚀</span>
              <h3 style={{ color: '#FFFFFF', fontSize: '18px', margin: 0 }}>
                Scopeline User Guide & Quickstart Flow
              </h3>
            </div>
            <div style={{ fontSize: '12px', color: '#8C9AB5', marginTop: '4px' }}>
              {isClient
                ? 'How to audit vendor deliverables and protect your budget against unauthorized change orders.'
                : 'How to capture scope changes, forward client emails, and convert unbilled work into revenue.'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#8C9AB5',
              fontSize: '24px',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {/* Step Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #D8D2C2',
            background: '#EFEBE1',
            overflowX: 'auto',
          }}
        >
          {steps.map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => setActiveStep(s.num)}
              style={{
                flex: '1 0 auto',
                padding: '12px 14px',
                border: 'none',
                borderBottom: activeStep === s.num ? '3px solid #E85D2E' : '3px solid transparent',
                background: activeStep === s.num ? '#FFFFFF' : 'transparent',
                color: activeStep === s.num ? '#14213D' : '#5C6B73',
                fontWeight: activeStep === s.num ? 700 : 500,
                fontSize: '12px',
                fontFamily: "'IBM Plex Mono', monospace",
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{s.icon}</span>
              <span>Step {s.num}</span>
            </button>
          ))}
        </div>

        {/* Active Step Content */}
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span
              style={{
                fontSize: '10.5px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 700,
                background: '#E85D2E',
                color: '#FFFFFF',
                padding: '2px 8px',
                borderRadius: '2px',
                textTransform: 'uppercase',
              }}
            >
              {curr.tag}
            </span>
          </div>

          <h2 style={{ fontSize: '18px', color: '#14213D', marginBottom: '10px' }}>
            {curr.title}
          </h2>

          <p style={{ fontSize: '13.5px', color: '#1B1B1B', lineHeight: 1.6, marginBottom: '16px' }}>
            {curr.desc}
          </p>

          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #D8D2C2',
              borderRadius: '4px',
              padding: '14px 16px',
              marginBottom: '18px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 700,
                color: '#5C6B73',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              Key Capabilities
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#1B1B1B', lineHeight: 1.6 }}>
              {curr.bulletPoints.map((b, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <div
            style={{
              background: '#D8E8DD',
              borderLeft: '4px solid #2F6F4E',
              padding: '10px 14px',
              borderRadius: '2px',
              fontSize: '12px',
              color: '#1B1B1B',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '16px' }}>💡</span>
            <span>
              <b>Pro Tip:</b> {curr.highlight}
            </span>
          </div>

          {/* Action Row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid #D8D2C2',
              paddingTop: '16px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              {activeStep > 1 && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveStep((s) => Math.max(1, s - 1))}
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                >
                  &larr; Previous Step
                </button>
              )}
              {activeStep < 5 && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveStep((s) => Math.min(5, s + 1))}
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                >
                  Next Step &rarr;
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onNavigate(curr.pageKey);
                  onClose();
                }}
                style={{ fontSize: '12px', padding: '8px 18px', fontWeight: 700 }}
              >
                {curr.btnLabel} &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

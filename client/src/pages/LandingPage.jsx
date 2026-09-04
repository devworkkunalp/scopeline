import { useState } from 'react';
import { api, setToken, setUser } from '../api.js';

const DEMO_SCENARIOS = [
  {
    id: 'multicurrency',
    title: 'Multi-Currency Checkout & Subscriptions',
    channel: '📝 Post-Meeting MOM',
    sender: 'Sarah Jenkins (VP Digital)',
    text: 'Client requested enabling multi-currency checkout with automatic FX rate hedging and recurring subscription management for EU/UK expansion before next sprint.',
    verdict: 'OUT_OF_SCOPE',
    type: 'Internationalization / Excluded Scope',
    clause: '§2.3 — SOW covers single-currency USD checkout only. Multi-currency engines, localization, and recurring subscription billing require separate commercial variation.',
    hours: 75,
    rate: 150,
    value: 11250,
    confidence: '100%',
    reasoning: 'Multi-currency checkout and recurring subscription pipelines are explicitly excluded under SOW §2.3. Requires dedicated gateway integration and 75 billable engineering hours.',
  },
  {
    id: 'revisions',
    title: 'Round 4 Design & Layout Overhaul',
    channel: '💬 Slack Channel Ask',
    sender: 'Alex Rivera (Marketing Lead)',
    text: 'Can we redo the entire checkout step 2 layout and change the theme palette? We want to try a 4th design iteration before launch.',
    verdict: 'OUT_OF_SCOPE',
    type: 'Excess Design Iterations',
    clause: '§2.6 — Contract explicitly limits UI design iterations to 2 rounds per milestone. Additional rounds billed at standard variation rate.',
    hours: 24,
    rate: 150,
    value: 3600,
    confidence: '95%',
    reasoning: 'Milestone 2 design sign-off was completed on Aug 14. This represents iteration #4, exceeding the contractually agreed 2-round limit (24 hrs @ $150/hr).',
  },
  {
    id: 'dashboard',
    title: 'Urgent Executive Gross-Margin Dashboard',
    channel: '✉️ CEO Email Thread',
    sender: 'David Vance (CEO)',
    text: 'Hey team, we have a board meeting on Thursday. Can you quickly build a live Gross-Margin analytics dashboard with real-time export? We need this urgent.',
    verdict: 'OUT_OF_SCOPE',
    type: 'Feature Addition / Scope Expansion',
    clause: '§2.4 — Third-party analytics pipelines and executive reporting suites are excluded from base deliverables.',
    hours: 42,
    rate: 150,
    value: 6300,
    confidence: '98%',
    reasoning: 'Executive reporting and custom BI dashboards are explicitly excluded under SOW §2.4. Matched signed contract boundaries.',
  },
];

const TOUR_DATA = {
  vendor: [
    {
      id: 'dash',
      tabLabel: '📊 Revenue Dashboard',
      screenKicker: 'Executive Dashboard & Unbilled Exposure',
      screenTitle: 'Track Baseline Value vs. Recovered Scope Across Accounts',
      screenDesc: 'Real-time portfolio visibility into baseline contract values ($185,000), unbilled change opportunities (+$18,500), and margin health across all accounts.',
      outcomes: [
        '+$18,500 Unbilled Scope Detected across client portfolio',
        '+9.7% Profit Margin Saved from unbilled creep compression',
        'Real-time sync between client conversations and project financials',
      ],
      windowTitle: 'Scopeline — Agency Edition / Revenue Dashboard',
      mockupType: 'vendor_dashboard',
    },
    {
      id: 'contract',
      tabLabel: '📜 Baseline SOW Contract',
      screenKicker: 'AI Contract Boundaries & Clause Extraction',
      screenTitle: 'Extract Deliverables, Exclusions (§2.0), & Hourly Rates ($150/hr)',
      screenDesc: 'Upload executed SOW agreements or let AI formulate protective boundaries. Signed contract terms are automatically prioritized as the golden standard.',
      outcomes: [
        'Automatic §1.0 Baseline Deliverables breakdown ($185,000 SOW)',
        'Locks in out-of-scope exclusions (§2.0) and 2-round revision limits (§2.6)',
        'Defines agreed commercial variation hourly rate ($150.00/hr)',
      ],
      windowTitle: 'Scopeline — Baseline SOW Contract (§1.0 - §5.0)',
      mockupType: 'vendor_contract',
    },
    {
      id: 'audit',
      tabLabel: '⚡ 3-Way Grounded Proof',
      screenKicker: 'Scope Creep Discovery & Evidence Grounding',
      screenTitle: 'Transform Client Asks into Audit-Grade Billable Proof (+$11,250)',
      screenDesc: 'Every detected scope addition connects the raw client ask, the corresponding SOW exclusion clause, and mathematical proof with 4 verified green badges.',
      outcomes: [
        '4 Verification Badges: Authority, Date, SOW Barrier, Hourly Rate',
        'Eliminates billing awkwardness with contractual clause citations',
        'Direct mathematical proof: 75 hrs × $150/hr = +$11,250.00',
      ],
      windowTitle: 'Scopeline — Scope Audit & Evidence Grounding',
      mockupType: 'vendor_audit',
    },
    {
      id: 'change_requests',
      tabLabel: '📄 Change Orders & CRs',
      screenKicker: 'Executive Agreement Generator',
      screenTitle: 'Generate Executive Change Orders with Embedded Evidence',
      screenDesc: 'Convert approved scope expansions into professional, formal Change Request agreements (e.g. CR-012 $3,600, CR-017 $11,250) complete with scope diffs and signature lines.',
      outcomes: [
        '1-Click Executive Change Order PDF Export',
        'Includes contractually cited deliverables and schedule adjustments',
        'Ready for client sign-off and permanent legal record',
      ],
      windowTitle: 'Scopeline — Change Request CR-017 Export Preview',
      mockupType: 'vendor_co',
    },
    {
      id: 'invoices',
      tabLabel: '💳 Cash Reconciliation',
      screenKicker: 'Payment Gate & Leakage Prevention',
      screenTitle: 'Reconcile Approved Variations with Milestone Billings',
      screenDesc: 'Track approved change requests ($41K) against milestone disbursements ($25K), highlighting unbilled revenue ($16K) to prevent cash leakage.',
      outcomes: [
        'Real-time Approved ($41K) vs. Invoiced ($25K) gap tracking',
        '1-Click Full ($11,250) & Partial Payment Reconciliation',
        'Zero unbilled revenue leakage across deliverables',
      ],
      windowTitle: 'Scopeline — Invoicing & Cash Reconciliation Gate',
      mockupType: 'vendor_invoices',
    },
  ],
  client: [
    {
      id: 'dash',
      tabLabel: '🛡️ Defense Dashboard',
      screenKicker: 'Buyer Budget Defense & Contract Shield',
      screenTitle: 'Defend Fixed Budgets & Block SOW Overbilling (+$5,700 Saved)',
      screenDesc: 'Executive visibility into total contracted commitments ($185,000), approved milestone disbursements ($46,250), and cumulative dollars saved from blocked overbilling.',
      outcomes: [
        '+$5,700 SOW Overbilling Blocked & Saved',
        '100% Contract Compliance across vendor deliverables',
        'Zero surprise add-ons or hidden hourly charges',
      ],
      windowTitle: 'Scopeline — Client Shield Edition / Defense Dashboard',
      mockupType: 'client_dashboard',
    },
    {
      id: 'contract',
      tabLabel: '📜 Baseline & 90-Day Warranty SLA',
      screenKicker: 'Contract Baseline & Defect Protection',
      screenTitle: 'Lock In Baseline Scope & 90-Day Defect Warranty (§5.0)',
      screenDesc: 'Maintains an unalterable inventory of agreed deliverables (§1.0) and warranty SLAs (§5.0) to prevent vendors from billing for bugs or baseline features.',
      outcomes: [
        'Guaranteed 90-Day Defect SLA at zero additional charge',
        'Protects against double-billing for baseline deliverables',
        'Contractual shielding against vendor scope inflation',
      ],
      windowTitle: 'Scopeline — Client Shield Baseline & Warranty Defense',
      mockupType: 'client_contract',
    },
    {
      id: 'audit',
      tabLabel: '⚠️ Scope & Overbilling Audit',
      screenKicker: 'Automated Vendor Claim Auditing',
      screenTitle: 'Neutralize Bug Fixes ($2,200 → $0.00) & Redundant Surcharges',
      screenDesc: 'When a vendor sends a supplementary invoice or change request, Scopeline cross-references Section 1.0 and Section 5.0 to detect redundant charges.',
      outcomes: [
        'Neutralizes defect bug fixes to $0.00 under §5.1 Warranty SLA',
        'Flags redundant baseline charges (e.g. +$3,500 Filter Surcharge)',
        '4 Verification Badges validating contract boundaries',
      ],
      windowTitle: 'Scopeline — Vendor Claim & Overbilling Audit',
      mockupType: 'client_audit',
    },
    {
      id: 'dispute',
      tabLabel: '📜 Dispute Pushback Memo',
      screenKicker: '1-Click Contractual Pushback Notice',
      screenTitle: 'Generate Official Contractual Dispute Letters to Vendor PM',
      screenDesc: 'Generate a pre-formatted, legally grounded pushback memo citing exact SOW clauses, meeting logs, and payment withholding notices.',
      outcomes: [
        'Pre-drafted contractual memo ready for Vendor Billing Team',
        '1-Click Clipboard Copy & Document Export',
        'Safely withholds unapproved fees while maintaining milestone timelines',
      ],
      windowTitle: 'Scopeline — Contractual Payment Defense Notice',
      mockupType: 'client_dispute',
    },
    {
      id: 'invoices',
      tabLabel: '💳 Payment Shield Gate',
      screenKicker: 'Vendor Invoice Audit & Payment Gate',
      screenTitle: 'Audit Milestone Invoices & Hold Disputed Line Items ($3,500)',
      screenDesc: 'Cross-audit incoming vendor milestone invoices, releasing approved funds ($15,000) for completed deliverables while holding unapproved line-item surcharges ($3,500).',
      outcomes: [
        'Line-item milestone verification against SOW sign-offs',
        'Withhold disputed surcharges ($3,500) before cash outflow',
        'Clear visibility into verified disbursements ($46,250)',
      ],
      windowTitle: 'Scopeline — Vendor Invoice Audit & Payment Shield',
      mockupType: 'client_invoices',
    },
  ],
};

export default function LandingPage({ onAuthSuccess }) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState('register'); // 'login' | 'register'
  const [selectedDemo, setSelectedDemo] = useState(DEMO_SCENARIOS[0]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tourPerspective, setTourPerspective] = useState('vendor'); // 'vendor' | 'client'
  const [tourScreenIndex, setTourScreenIndex] = useState(0);

  // Auth form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [perspective, setPerspective] = useState('vendor'); // 'vendor' | 'client'
  const [authError, setAuthError] = useState('');
  const [busy, setBusy] = useState(false);

  // Book a Demo form states
  const [demoName, setDemoName] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [demoCompany, setDemoCompany] = useState('');
  const [demoPerspective, setDemoPerspective] = useState('vendor');
  const [demoTeamSize, setDemoTeamSize] = useState('11-50');
  const [demoGoal, setDemoGoal] = useState('Recover Unbilled Scope Creep across Client Accounts');
  const [demoNotes, setDemoNotes] = useState('');
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoError, setDemoError] = useState('');

  function handleDemoSubmit(e) {
    e.preventDefault();
    setDemoError('');
    if (!demoEmail.trim() || !demoName.trim() || !demoCompany.trim()) {
      setDemoError('Please complete all required fields.');
      return;
    }
    setDemoBusy(true);
    setTimeout(() => {
      setDemoBusy(false);
      setDemoSubmitted(true);
    }, 500);
  }

  function openAuth(tab = 'register', preferredPerspective = 'vendor') {
    setAuthTab(tab);
    if (preferredPerspective) setPerspective(preferredPerspective);
    setAuthError('');
    setShowAuthModal(true);
    setMobileMenuOpen(false);
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setAuthError('');

    // Strict client-side validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setAuthError('Please enter a valid work email address (e.g. name@company.com).');
      return;
    }

    if (password.length < 8) {
      setAuthError('Password must be at least 8 characters long.');
      return;
    }

    if (authTab === 'register') {
      if (!displayName.trim()) {
        setAuthError('Please enter your full name.');
        return;
      }
      if (!companyName.trim()) {
        setAuthError('Please enter your company or agency name.');
        return;
      }
    }

    setBusy(true);
    try {
      let res;
      if (authTab === 'register') {
        res = await api.signup({
          email: email.trim(),
          password,
          companyName: companyName.trim(),
          displayName: displayName.trim(),
          phoneNumber: phoneNumber.trim(),
          perspective,
        });
      } else {
        res = await api.login(email.trim(), password);
      }
      setToken(res.token);
      setUser({
        id: res.userId,
        email: res.email,
        displayName: res.displayName,
        role: res.role,
        phoneNumber: res.phoneNumber,
        onboarded: res.onboarded,
        onboardingStep: res.onboardingStep,
        trialDaysRemaining: res.trialDaysRemaining || 30,
        perspective: res.perspective || perspective,
      });
      setShowAuthModal(false);
      onAuthSuccess(res);
    } catch (err) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="landing-shell">
      {/* TOP URGENCY BANNER */}
      <div className="landing-top-banner">
        <span>
          🔥 <strong>Early Access Program:</strong> 30-Day Full Access Free Trial · <strong>No Credit Card Required</strong>
        </span>
        <button
          type="button"
          className="banner-cta"
          onClick={() => openAuth('register')}
        >
          Claim 30-Day Pass →
        </button>
      </div>

      {/* HEADER / NAV */}
      <header className="landing-nav">
        <div className="nav-container">
          <div className="landing-brand">
            <div className="swatch" />
            <span className="brand-text">SCOPELINE</span>
          </div>

          {/* Desktop Nav Links */}
          <nav className="nav-links desktop-only">
            <a href="#tour">Screenshots &amp; Tour</a>
            <a href="#features">Features</a>
            <a href="#demo">Interactive Sandbox</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#pricing">Pricing</a>
            <a href="#book-demo" style={{ color: 'var(--orange)', fontWeight: 700 }}>Book a Demo</a>
          </nav>

          <div className="nav-actions">
            <button
              type="button"
              className="btn ghost small"
              onClick={() => openAuth('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className="btn orange small hide-on-tiny"
              onClick={() => openAuth('register')}
            >
              Start Free Trial →
            </button>
            <button
              type="button"
              className="landing-mobile-toggle mobile-only"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="landing-mobile-menu">
            <a href="#tour" onClick={() => setMobileMenuOpen(false)}>
              Screenshots &amp; Tour
            </a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>
              Features
            </a>
            <a href="#demo" onClick={() => setMobileMenuOpen(false)}>
              Interactive Sandbox
            </a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>
              How It Works
            </a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>
              Pricing
            </a>
            <a href="#book-demo" onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--orange)', fontWeight: 700 }}>
              📅 Book a Demo
            </a>
            <div style={{ padding: '10px 0 4px' }}>
              <button
                type="button"
                className="btn orange small full-width"
                onClick={() => openAuth('register')}
              >
                🚀 Start 30-Day Free Trial
              </button>
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="landing-hero">
        <div className="hero-badge">
          <span className="pulse-dot" />
          <span>Dual-Perspective Scope Intelligence &amp; Revenue Protection</span>
        </div>

        <h1 className="hero-title">
          Stop Unbilled Scope Creep.<br />
          <span className="highlight">Recover Revenue &amp; Shield Against Overbilling</span>.
        </h1>

        <p className="hero-subtitle">
          Whether you are an agency protecting billable work from scope creep or a founder auditing vendor change orders, Scopeline automatically cross-references project correspondence against your signed SOW baseline in seconds.
        </p>

        <div className="hero-cta-group">
          <button
            type="button"
            className="btn orange large"
            onClick={() => openAuth('register')}
          >
            🚀 Start 30-Day Free Trial (No Credit Card Required)
          </button>
          <a
            href="#tour"
            className="btn ghost large"
          >
            📸 View Product Screenshots &amp; Tour
          </a>
        </div>

        {/* Trust Badges */}
        <div className="hero-trust-bar">
          <div className="trust-item">
            <strong>$1.2M+</strong> Unbilled Scope Recovered
          </div>
          <div className="trust-divider" />
          <div className="trust-item">
            <strong>🔒 Privacy First</strong> Zero Mailbox Permissions Needed
          </div>
          <div className="trust-divider" />
          <div className="trust-item">
            <strong>⚡ 3-Way Proof</strong> Client Ask + Contract Barrier + Financial Math
          </div>
        </div>

        {/* HERO VISUAL PROOF CARD */}
        <div className="hero-visual-card">
          <div className="visual-top-bar">
            <div className="dots">
              <span className="dot red" />
              <span className="dot yellow" />
              <span className="dot green" />
            </div>
            <div className="visual-title">Grounded Scope Recovery Engine</div>
            <div className="visual-tag">98% Grounded Proof</div>
          </div>

          <div className="visual-grid">
            <div className="visual-col incoming">
              <div className="col-label">1. INCOMING CLIENT ASK (EMAIL / MOM)</div>
              <div className="ask-box">
                <div className="ask-meta">✉️ From: Sarah Jenkins (Client VP) · 2 days ago</div>
                <div className="ask-body">
                  &ldquo;Can we urgently build an executive Gross-Margin dashboard with real-time analytics for the board meeting?&rdquo;
                </div>
              </div>
            </div>

            <div className="visual-col barrier">
              <div className="col-label">2. SOW CONTRACT BOUNDARY (§2)</div>
              <div className="barrier-box">
                <div className="clause-tag">§2.4 EXCLUSIONS ALLOWANCES</div>
                <div className="barrier-text">
                  &ldquo;Third-party BI analytics, custom executive reporting pipelines, and board dashboards are explicitly excluded from the base deliverables.&rdquo;
                </div>
              </div>
            </div>

            <div className="visual-col recovery">
              <div className="col-label">3. REVENUE RECOVERY PROOF</div>
              <div className="recovery-box">
                <div className="recovery-val">+$6,300.00</div>
                <div className="recovery-sub">42 hrs @ $150/hr variation rate</div>
                <div className="recovery-action">
                  <span className="badge">✓ Change Order CR-011 Generated</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= INTERACTIVE PRODUCT SCREENSHOTS & FEATURE TOUR ================= */}
      <section id="tour" className="landing-section tour-section">
        <div className="section-head">
          <div className="section-kicker">Interactive Product Tour &amp; Screenshots</div>
          <h2>See the Exact Results You Get in Scopeline</h2>
          <p>Explore actual screen previews and workflows tailored to your specific role and business model.</p>

          {/* Perspective Switcher */}
          <div className="tour-switcher-wrapper">
            <div className="tour-edition-switcher">
              <button
                type="button"
                className={`tour-edition-btn ${tourPerspective === 'vendor' ? 'active vendor' : ''}`}
                onClick={() => { setTourPerspective('vendor'); setTourScreenIndex(0); }}
              >
                🏢 Agency / Vendor Edition
              </button>
              <button
                type="button"
                className={`tour-edition-btn ${tourPerspective === 'client' ? 'active client' : ''}`}
                onClick={() => { setTourPerspective('client'); setTourScreenIndex(0); }}
              >
                🛡️ Client / Buyer Shield Edition
              </button>
            </div>
          </div>
        </div>

        {/* Tour Navigation Tabs */}
        <div className="tour-nav-tabs">
          {TOUR_DATA[tourPerspective].map((screen, idx) => (
            <button
              key={screen.id}
              type="button"
              className={`tour-nav-tab ${tourScreenIndex === idx ? (tourPerspective === 'client' ? 'active client-tab' : 'active') : ''}`}
              onClick={() => setTourScreenIndex(idx)}
            >
              <span>{screen.tabLabel}</span>
            </button>
          ))}
        </div>

        {/* Interactive Tour Screen Display Card */}
        {(() => {
          const currentScreen = TOUR_DATA[tourPerspective][tourScreenIndex] || TOUR_DATA[tourPerspective][0];
          const isClientTour = tourPerspective === 'client';

          return (
            <div className="tour-card">
              {/* Window Header */}
              <div className="tour-card-header" style={isClientTour ? { background: '#0F172A' } : {}}>
                <div className="tour-window-controls">
                  <span className="tour-dot red" />
                  <span className="tour-dot yellow" />
                  <span className="tour-dot green" />
                  <span className="tour-window-title">{currentScreen.windowTitle}</span>
                </div>
                <div className="tour-tag" style={isClientTour ? { background: '#1E3A8A', color: '#93C5FD' } : { background: 'rgba(232,93,46,0.2)', color: 'var(--orange-dim)' }}>
                  {isClientTour ? '🛡️ Buyer Shield Active' : '🏢 Agency Revenue Protection'}
                </div>
              </div>

              {/* 2-Column Split: Realistic UI Mockup & Value Outcomes */}
              <div className="tour-grid">
                {/* Left Preview Pane */}
                <div className="tour-preview-pane">
                  {/* MOCKUP TYPE 1: VENDOR DASHBOARD */}
                  {currentScreen.mockupType === 'vendor_dashboard' && (
                    <div>
                      <div className="mock-kpi-strip">
                        <div className="mock-kpi">
                          <div className="mock-kpi-label">Base SOW Value</div>
                          <div className="mock-kpi-val">$185,000</div>
                        </div>
                        <div className="mock-kpi" style={{ borderLeftColor: '#1D6E96' }}>
                          <div className="mock-kpi-label">Unbilled Exposure</div>
                          <div className="mock-kpi-val" style={{ color: 'var(--orange)' }}>+$18,500</div>
                        </div>
                        <div className="mock-kpi green">
                          <div className="mock-kpi-label">Change Orders Approved</div>
                          <div className="mock-kpi-val" style={{ color: 'var(--green)' }}>$12,000</div>
                        </div>
                      </div>

                      <div className="mock-table-card">
                        <div className="mock-table-head">
                          <span>RECENT RECOVERED SCOPE OPPORTUNITIES</span>
                          <span style={{ color: 'var(--steel)' }}>3 Items Detected</span>
                        </div>
                        <div className="mock-table-row">
                          <div>
                            <div className="mock-row-title">Multi-Currency Checkout &amp; Subscriptions</div>
                            <div className="mock-row-sub">Source: 📝 Meeting MOM · SOW Ref: §2.3 Single-Currency Limit · 75 hrs @ $150/hr</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="mock-row-amount">+$11,250.00</div>
                            <span className="badge" style={{ background: '#F59E0B', color: '#fff', fontSize: 10 }}>Unbilled (Review)</span>
                          </div>
                        </div>
                        <div className="mock-table-row">
                          <div>
                            <div className="mock-row-title">4th Design &amp; Layout Overhaul</div>
                            <div className="mock-row-sub">Source: 💬 Slack Ask · SOW Ref: §2.6 Revision Limit · 24 hrs @ $150/hr</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="mock-row-amount">+$3,600.00</div>
                            <span className="badge" style={{ background: '#059669', color: '#fff', fontSize: 10 }}>CR-012 (Approved)</span>
                          </div>
                        </div>
                        <div className="mock-table-row">
                          <div>
                            <div className="mock-row-title">Urgent Executive Gross-Margin Dashboard</div>
                            <div className="mock-row-sub">Source: ✉️ Email from CEO · SOW Ref: §2.4 BI Exclusions · 42 hrs @ $150/hr</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="mock-row-amount">+$6,300.00</div>
                            <span className="badge" style={{ background: '#2563EB', color: '#fff', fontSize: 10 }}>CR-011 (Invoiced)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MOCKUP TYPE 2: VENDOR CONTRACT */}
                  {currentScreen.mockupType === 'vendor_contract' && (
                    <div className="mock-table-card" style={{ padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}>Enterprise_Web_App_SOW_Executed.pdf</div>
                          <div style={{ fontSize: 11, color: 'var(--steel)' }}>Executed Fixed-Price Agreement · Scope Value: $185,000.00</div>
                        </div>
                        <span className="badge" style={{ background: '#059669', color: '#fff', fontSize: 10.5 }}>✓ Signed Priority</span>
                      </div>
                      <div className="mock-clauses-grid">
                        <div style={{ background: '#F8FAFC', padding: 10, borderRadius: 4, border: '1px solid #E2E8F0' }}>
                          <span className="mock-clause-badge">§1.0 BASE DELIVERABLES</span>
                          <div style={{ fontSize: 11.5, color: '#334155', lineHeight: 1.45 }}>
                            Core eCommerce engine, product catalog with category filtering, and single-currency USD checkout.
                          </div>
                        </div>
                        <div style={{ background: '#FFF7ED', padding: 10, borderRadius: 4, border: '1px solid #FED7AA' }}>
                          <span className="mock-clause-badge" style={{ background: '#FEE2E2', color: '#991B1B', borderColor: '#FCA5A5' }}>§2.0 EXCLUSIONS &amp; LIMITS</span>
                          <div style={{ fontSize: 11.5, color: '#7C2D12', lineHeight: 1.45 }}>
                            Multi-currency tax engines (§2.3), custom BI pipelines (§2.4), and design iterations exceeding 2 rounds (§2.6) are excluded.
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: 10, background: '#EFF6FF', padding: '8px 12px', borderRadius: 4, fontSize: 11.5, color: '#1E40AF', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                        <span><strong>§3.0 Agreed Variation Rate:</strong> $150.00 / engineering hr</span>
                        <span><strong>§4.0 Terms:</strong> Net 30 upon milestone sign-off</span>
                      </div>
                    </div>
                  )}

                  {/* MOCKUP TYPE 3: VENDOR AUDIT (WITH 4 VERIFICATION BADGES) */}
                  {currentScreen.mockupType === 'vendor_audit' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* 4 Green Grounding Badges */}
                      <div className="mock-badges-grid">
                        <span className="mock-vbadge">✓ Client Authority Verified</span>
                        <span className="mock-vbadge">✓ Post-SOW Date Validated</span>
                        <span className="mock-vbadge">✓ Contract Barrier Grounded</span>
                        <span className="mock-vbadge">✓ Rate Grounded ($150/hr)</span>
                      </div>

                      <div style={{ background: '#fff', border: '1px solid var(--line)', padding: 12, borderRadius: 6 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--steel)', textTransform: 'uppercase' }}>1. Client Requirement / Raw Ask</div>
                        <div style={{ fontSize: 12, color: 'var(--navy)', marginTop: 4, fontWeight: 500 }}>
                          &ldquo;Client requested enabling multi-currency checkout with automatic FX hedging and recurring subscription billing for EU/UK expansion.&rdquo;
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--steel)', marginTop: 4 }}>📝 Post-Meeting MOM · Sarah Jenkins (VP Digital) · Post-SOW Signed Date</div>
                      </div>

                      <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', padding: 12, borderRadius: 6 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: '#C2410C', textTransform: 'uppercase' }}>2. SOW Contract Barrier Grounding</div>
                        <div style={{ fontSize: 11.5, color: '#7C2D12', marginTop: 4 }}>
                          Matched <strong>§2.3 Excluded Scope</strong>: Base contract covers single-currency USD checkout only. Multi-currency and subscriptions require separate variation.
                        </div>
                      </div>

                      <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: 12, borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>3. Billable Mathematical Proof</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#047857', fontFamily: "'IBM Plex Mono', monospace" }}>+$11,250.00 (75 hrs @ $150.00/hr)</div>
                        </div>
                        <span className="badge" style={{ background: '#059669', color: '#fff', fontSize: 11, padding: '6px 12px' }}>
                          ✓ Generate CR-017 Change Order
                        </span>
                      </div>
                    </div>
                  )}

                  {/* MOCKUP TYPE 4: VENDOR CHANGE ORDER */}
                  {currentScreen.mockupType === 'vendor_co' && (
                    <div className="mock-memo-box">
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #CBD5E1', paddingBottom: 8, marginBottom: 10 }}>
                        <span style={{ fontWeight: 700, color: 'var(--navy)' }}>CHANGE ORDER AGREEMENT #CR-017</span>
                        <span style={{ color: 'var(--green)', fontWeight: 700 }}>$11,250.00 USD</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#334155', lineHeight: 1.5 }}>
                        <strong>Project:</strong> Enterprise Web Application &amp; Portal<br />
                        <strong>Deliverable:</strong> Multi-Currency Checkout &amp; Stripe Subscription Engine<br />
                        <strong>Contract Basis:</strong> Commercial variation pursuant to SOW §3.0 &amp; §2.3 Excluded Scope.<br />
                        <strong>Cost Breakdown:</strong> 75 Engineering Hours @ $150.00/hr = $11,250.00 USD.<br />
                        <strong>Schedule Adjustment:</strong> +7 Business Days to Milestone 3.<br />
                        <strong>Authorized Client Signature:</strong> [Sarah Jenkins, VP Digital]
                      </div>
                    </div>
                  )}

                  {/* MOCKUP TYPE 5: VENDOR INVOICES */}
                  {currentScreen.mockupType === 'vendor_invoices' && (
                    <div>
                      <div className="mock-kpi-strip">
                        <div className="mock-kpi">
                          <div className="mock-kpi-label">Approved Variations</div>
                          <div className="mock-kpi-val">$41,000</div>
                        </div>
                        <div className="mock-kpi" style={{ borderLeftColor: '#1D6E96' }}>
                          <div className="mock-kpi-label">Invoiced to Date</div>
                          <div className="mock-kpi-val">$25,000</div>
                        </div>
                        <div className="mock-kpi" style={{ borderLeftColor: 'var(--orange)' }}>
                          <div className="mock-kpi-label">Potentially Unbilled</div>
                          <div className="mock-kpi-val" style={{ color: 'var(--orange)' }}>$16,000</div>
                        </div>
                      </div>
                      <div className="mock-table-card">
                        <div className="mock-table-row">
                          <div>
                            <div className="mock-row-title">CR-017: Multi-Currency Checkout &amp; Subscriptions</div>
                            <div className="mock-row-sub">Approved: $11,250 · Invoiced: $0 · Remaining Gap: $11,250</div>
                          </div>
                          <button type="button" className="btn small" style={{ background: 'var(--green)', borderColor: 'var(--green)', fontSize: 11, padding: '4px 8px' }}>
                            ✓ Clear Full ($11,250)
                          </button>
                        </div>
                        <div className="mock-table-row">
                          <div>
                            <div className="mock-row-title">CR-012: 4th Design &amp; Layout Overhaul</div>
                            <div className="mock-row-sub">Approved: $3,600 · Invoiced: $3,600 · Disbursed in Full</div>
                          </div>
                          <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: 11 }}>✓ Invoiced in Full</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MOCKUP TYPE 6: CLIENT DASHBOARD */}
                  {currentScreen.mockupType === 'client_dashboard' && (
                    <div>
                      <div className="mock-kpi-strip">
                        <div className="mock-kpi client">
                          <div className="mock-kpi-label">Contract Sum Committed</div>
                          <div className="mock-kpi-val">$185,000</div>
                        </div>
                        <div className="mock-kpi client" style={{ borderLeftColor: '#10B981' }}>
                          <div className="mock-kpi-label">Audited &amp; Disbursed</div>
                          <div className="mock-kpi-val">$46,250</div>
                        </div>
                        <div className="mock-kpi green" style={{ borderLeftColor: '#16A34A', background: '#F0FDF4' }}>
                          <div className="mock-kpi-label" style={{ color: '#15803D' }}>🛡️ Overbilling Blocked</div>
                          <div className="mock-kpi-val" style={{ color: '#16A34A' }}>+$5,700 Saved</div>
                        </div>
                      </div>

                      <div className="mock-table-card">
                        <div className="mock-table-head" style={{ background: '#EFF6FF', color: '#1E40AF' }}>
                          <span>AUDITED VENDOR CLAIMS &amp; PAYMENT DEFENSE</span>
                          <span style={{ color: '#2563EB' }}>2 Surcharges Blocked</span>
                        </div>
                        <div className="mock-table-row" style={{ background: '#FEF2F2' }}>
                          <div>
                            <div className="mock-row-title">Vendor Change Order #04 — Faceted Category Filter</div>
                            <div className="mock-row-sub">Ref: CR-010 · SOW Citation: 📜 SOW §1.2 Baseline Deliverables</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="mock-row-amount dispute">+$3,500.00</div>
                            <span className="badge" style={{ background: '#DC2626', color: '#fff', fontSize: 10 }}>🛡️ Disputed / Withheld</span>
                          </div>
                        </div>
                        <div className="mock-table-row" style={{ background: '#FEF2F2' }}>
                          <div>
                            <div className="mock-row-title">Supplementary Invoice INV-SUPP-08 — Memory Leak Defect Fix</div>
                            <div className="mock-row-sub">Ref: INV-SUPP-08 · SOW Citation: 📜 Section 5.1 90-Day Warranty SLA</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="mock-row-amount dispute" style={{ textDecoration: 'line-through' }}>$2,200.00</div>
                            <span className="badge" style={{ background: '#16A34A', color: '#fff', fontSize: 10 }}>🛡️ Neutralized to $0.00</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MOCKUP TYPE 7: CLIENT CONTRACT */}
                  {currentScreen.mockupType === 'client_contract' && (
                    <div className="mock-table-card" style={{ padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}>Master_Vendor_Contract_SOW.pdf</div>
                          <div style={{ fontSize: 11, color: 'var(--steel)' }}>Executed Fixed-Price Development Agreement · Lump Sum: $185,000</div>
                        </div>
                        <span className="badge" style={{ background: '#2563EB', color: '#fff', fontSize: 10.5 }}>🛡️ Buyer Shield Active</span>
                      </div>
                      <div className="mock-clauses-grid">
                        <div style={{ background: '#F8FAFC', padding: 10, borderRadius: 4, border: '1px solid #CBD5E1' }}>
                          <span className="mock-clause-badge">§1.2 INCLUDED DELIVERABLES</span>
                          <div style={{ fontSize: 11.5, color: '#1E293B', lineHeight: 1.45 }}>
                            Faceted category filters, product search, checkout flows, and responsive UI components are fully included in base sum.
                          </div>
                        </div>
                        <div style={{ background: '#EFF6FF', padding: 10, borderRadius: 4, border: '1px solid #BFDBFE' }}>
                          <span className="mock-clause-badge" style={{ background: '#DBEAFE', color: '#1E40AF' }}>§5.1 90-DAY DEFECT WARRANTY</span>
                          <div style={{ fontSize: 11.5, color: '#1E3A8A', lineHeight: 1.45 }}>
                            Vendor warrants all baseline deliverables against code defects and memory leaks for 90 days following UAT sign-off at $0 cost.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MOCKUP TYPE 8: CLIENT AUDIT (WITH 4 VERIFICATION BADGES) */}
                  {currentScreen.mockupType === 'client_audit' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* 4 Green Grounding Badges */}
                      <div className="mock-badges-grid">
                        <span className="mock-vbadge">✓ Client Authority Verified</span>
                        <span className="mock-vbadge">✓ Post-SOW Date Validated</span>
                        <span className="mock-vbadge">✓ Contract Barrier Grounded</span>
                        <span className="mock-vbadge">✓ Warranty SLA Grounded (§5.1)</span>
                      </div>

                      <div style={{ background: '#fff', border: '1px solid var(--line)', padding: 12, borderRadius: 6 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--steel)', textTransform: 'uppercase' }}>1. Vendor Supplementary Claim Inbound</div>
                        <div style={{ fontSize: 12, color: 'var(--navy)', marginTop: 4, fontWeight: 500 }}>
                          Vendor Invoice: &ldquo;INV-SUPP-08: Urgent Memory Leak Remediation &amp; Checkout Crash Fix (+ $2,200.00).&rdquo;
                        </div>
                      </div>

                      <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', padding: 12, borderRadius: 6 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: '#991B1B', textTransform: 'uppercase' }}>2. Contract Breach / Overbilling Finding</div>
                        <div style={{ fontSize: 11.5, color: '#7F1D1D', marginTop: 4 }}>
                          Violation of <strong>SOW §5.1 Warranty SLA</strong>: Memory leaks in delivered code are covered defects. Potential Billable Amount is neutralized to <strong>$0.00</strong>.
                        </div>
                      </div>

                      <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: 12, borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>3. Action Recommendation</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#15803D' }}>🛡️ Neutralize $2,200 Surcharge &amp; Send SOW Pushback Notice</div>
                        </div>
                        <span className="badge" style={{ background: '#DC2626', color: '#fff', fontSize: 11, padding: '6px 12px' }}>
                          🛡️ Dispute Line Item
                        </span>
                      </div>
                    </div>
                  )}

                  {/* MOCKUP TYPE 9: CLIENT DISPUTE */}
                  {currentScreen.mockupType === 'client_dispute' && (
                    <div className="mock-memo-box" style={{ background: '#FEF2F2', borderColor: '#FECACA' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #FCA5A5', paddingBottom: 8, marginBottom: 10 }}>
                        <span style={{ fontWeight: 700, color: '#991B1B' }}>CONTRACTUAL DISPUTE NOTICE (SOW §1.2 &amp; §5.1)</span>
                        <span style={{ color: '#DC2626', fontWeight: 700 }}>$5,700.00 WITHHELD</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#7F1D1D', lineHeight: 1.5 }}>
                        <strong>To:</strong> Vendor Project Manager &amp; Accounts Receivable<br />
                        <strong>Re:</strong> Disputed Charges for Category Filter ($3,500) &amp; Memory Leak ($2,200)<br />
                        <strong>Contract Basis:</strong> Section 1.2 includes filtering in baseline scope. Section 5.1 warrants defect fixes at zero additional cost for 90 days.<br />
                        <strong>Action:</strong> Disputed line items totaling $5,700 are withheld pursuant to SOW Section 4.0 terms.<br />
                        <strong>Status:</strong> [1-Click Exported &amp; Ready to Send]
                      </div>
                    </div>
                  )}

                  {/* MOCKUP TYPE 10: CLIENT INVOICES */}
                  {currentScreen.mockupType === 'client_invoices' && (
                    <div>
                      <div className="mock-kpi-strip">
                        <div className="mock-kpi client">
                          <div className="mock-kpi-label">Contract Budget</div>
                          <div className="mock-kpi-val">$185,000</div>
                        </div>
                        <div className="mock-kpi client" style={{ borderLeftColor: '#10B981' }}>
                          <div className="mock-kpi-label">Audited &amp; Disbursed</div>
                          <div className="mock-kpi-val">$46,250</div>
                        </div>
                        <div className="mock-kpi green" style={{ borderLeftColor: '#16A34A', background: '#F0FDF4' }}>
                          <div className="mock-kpi-label" style={{ color: '#15803D' }}>🛡️ Blocked Fees</div>
                          <div className="mock-kpi-val" style={{ color: '#16A34A' }}>$5,700 Held</div>
                        </div>
                      </div>
                      <div className="mock-table-card">
                        <div className="mock-table-row">
                          <div>
                            <div className="mock-row-title">Milestone 1 — Architecture &amp; Core Schema</div>
                            <div className="mock-row-sub">Claimed: $46,250 · Disbursed: $46,250</div>
                          </div>
                          <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: 11.5 }}>✓ Disbursed in Full</span>
                        </div>
                        <div className="mock-table-row" style={{ background: '#FEF2F2' }}>
                          <div>
                            <div className="mock-row-title">Milestone 2 + Unapproved Filter Surcharge</div>
                            <div className="mock-row-sub">Claimed: $18,500 · Authorized: $15,000 · Disputed: $3,500</div>
                          </div>
                          <span style={{ color: '#DC2626', fontWeight: 600, fontSize: 11.5 }}>🛡️ $3,500 Held in Dispute</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Info Pane */}
                <div className="tour-info-pane">
                  <div className="tour-info-kicker" style={{ color: isClientTour ? '#2563EB' : 'var(--orange)' }}>
                    {currentScreen.screenKicker}
                  </div>
                  <h3 className="tour-info-title">{currentScreen.screenTitle}</h3>
                  <p className="tour-info-desc">{currentScreen.screenDesc}</p>

                  <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy)', letterSpacing: '0.05em' }}>
                    KEY COMMERCIAL OUTCOMES:
                  </div>
                  <ul className="tour-outcomes-list">
                    {currentScreen.outcomes.map((item, i) => (
                      <li key={i} className="tour-outcome-item">
                        <span className="tour-outcome-icon" style={{ color: isClientTour ? '#2563EB' : 'var(--green)' }}>✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    className={`btn large ${isClientTour ? '' : 'orange'}`}
                    style={isClientTour ? { background: '#2563EB', borderColor: '#2563EB' } : {}}
                    onClick={() => openAuth('register', tourPerspective)}
                  >
                    🚀 Try {isClientTour ? 'Client Shield Edition' : 'Agency Edition'} Free →
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </section>

      {/* INTERACTIVE SCOPE CREEP TESTER (LIVE DEMO SANDBOX) */}
      <section id="demo" className="landing-section demo-section">
        <div className="section-head">
          <div className="section-kicker">Interactive Live Sandbox</div>
          <h2>Test Your Scope Creep Detection</h2>
          <p>Select a real-world client ask below to see how Scopeline grounds the evidence and calculates billable revenue.</p>
        </div>

        <div className="demo-container">
          {/* Scenario Tabs */}
          <div className="demo-scenarios-nav">
            {DEMO_SCENARIOS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`demo-tab-btn ${selectedDemo.id === s.id ? 'active' : ''}`}
                onClick={() => setSelectedDemo(s)}
              >
                <div style={{ fontSize: 11, color: selectedDemo.id === s.id ? 'var(--orange)' : 'var(--steel)' }}>{s.channel}</div>
                <div style={{ fontWeight: 600, fontSize: 13, marginTop: 2 }}>{s.title}</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--green)', marginTop: 4 }}>
                  +${s.value.toLocaleString()} Recovery
                </div>
              </button>
            ))}
          </div>

          {/* Interactive Output Box */}
          <div className="demo-output-card">
            <div className="demo-card-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="stamp unbilled" style={{ fontSize: 10.5, padding: '3px 8px' }}>
                  ⚡ OUT OF SCOPE (BILLABLE)
                </span>
                <span style={{ fontSize: 11.5, color: 'var(--steel)' }}>
                  Confidence: <strong>{selectedDemo.confidence}</strong>
                </span>
              </div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>
                +${selectedDemo.value.toLocaleString()} USD
              </div>
            </div>

            <div className="demo-card-body">
              <div className="demo-split">
                <div className="demo-left">
                  <div className="demo-subhead">Client Requirement / Raw Ask:</div>
                  <div className="demo-text-box">{selectedDemo.text}</div>
                  <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 6 }}>
                    Source: <strong>{selectedDemo.channel}</strong> · Client Stakeholder: <strong>{selectedDemo.sender}</strong>
                  </div>
                </div>

                <div className="demo-right">
                  <div className="demo-subhead">SOW Protection Barrier:</div>
                  <div className="demo-text-box" style={{ background: '#FFF7ED', border: '1px solid #FED7AA', color: '#7C2D12' }}>
                    {selectedDemo.clause}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 6 }}>
                    Calculation: <strong>{selectedDemo.hours} hrs × ${selectedDemo.rate}/hr = ${selectedDemo.value.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              <div className="demo-reasoning">
                <strong>Why This Gets Approved:</strong> {selectedDemo.reasoning}
              </div>
            </div>

            <div className="demo-card-foot">
              <div style={{ fontSize: 12, color: 'var(--steel)' }}>
                Want to run this across your own agency's contracts and client emails?
              </div>
              <button
                type="button"
                className="btn orange small"
                onClick={() => openAuth('register')}
              >
                Start Your 14-Day Free Trial →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6 CORE PLATFORM CAPABILITIES */}
      <section id="features" className="landing-section">
        <div className="section-head">
          <div className="section-kicker">End-to-End Recovery Platform</div>
          <h2>Everything You Need to Protect Agency Margins</h2>
          <p>Built specifically for digital agencies, custom software developers, and commercial contractors.</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feat-icon">🛡️</div>
            <h3>AI SOW Baseline &amp; Signed Priority</h3>
            <p>Upload signed PDF/Word contracts or use AI to formulate protective out-of-scope boundaries and revision caps from informal estimates.</p>
            <div className="feat-tag">Signed Documents Always Priority</div>
          </div>

          <div className="feature-card">
            <div className="feat-icon">✉️</div>
            <h3>Post-Meeting MOM &amp; Email Inbound</h3>
            <p>Log meeting notes in 30 seconds or forward client threads to your project's dedicated inbound drop address. Zero mailbox permissions required.</p>
            <div className="feat-tag">Privacy-First Architecture</div>
          </div>

          <div className="feature-card">
            <div className="feat-icon">⚡</div>
            <h3>3-Way Grounded Proof Engine</h3>
            <p>Every detected opportunity cites the exact client ask, the corresponding SOW exclusion clause, and the billable hourly math for friction-free client sign-off.</p>
            <div className="feat-tag">Audit-Grade Proof</div>
          </div>

          <div className="feature-card">
            <div className="feat-icon">📄</div>
            <h3>1-Click PDF Change Order Generator</h3>
            <p>Convert confirmed scope creep into professional, executive Change Request agreements with embedded evidence ready for client signature.</p>
            <div className="feat-tag">Instant Export</div>
          </div>

          <div className="feature-card">
            <div className="feat-icon">💳</div>
            <h3>1-Click Full &amp; Partial Cash Reconciliation</h3>
            <p>Clear invoices in full or record partial milestone payments with 1 click. Real-time sync with your portfolio-wide revenue dashboard.</p>
            <div className="feat-tag">Live Invoice Tracking</div>
          </div>

          <div className="feature-card">
            <div className="feat-icon">🤖</div>
            <h3>Commercial AI Clause Assistant</h3>
            <p>Ask any commercial question across your projects, exposure, unbilled revenue, and contract clauses with grounded file citations.</p>
            <div className="feat-tag">Commercial Intelligence</div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE USER JOURNEY WORKFLOW */}
      <section id="how-it-works" className="landing-section how-section">
        <div className="section-head">
          <div className="section-kicker">Interactive User Journey</div>
          <h2>How Scopeline Works From Day 1</h2>
          <p>A frictionless 4-step workflow designed to eliminate manual data entry and protect project margins.</p>
        </div>

        {/* Journey Perspective Switcher */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--paper-2)',
              padding: 4,
              borderRadius: 6,
              border: '1px solid var(--line)',
            }}
          >
            <button
              type="button"
              onClick={() => setTourPerspective('vendor')}
              style={{
                padding: '8px 18px',
                border: 'none',
                borderRadius: 4,
                fontWeight: 700,
                fontSize: 12.5,
                cursor: 'pointer',
                fontFamily: "'IBM Plex Mono', monospace",
                background: tourPerspective === 'vendor' ? 'var(--navy)' : 'transparent',
                color: tourPerspective === 'vendor' ? '#fff' : 'var(--steel)',
                transition: 'all 0.15s ease',
              }}
            >
              🏢 Agency / Vendor Flow
            </button>
            <button
              type="button"
              onClick={() => setTourPerspective('client')}
              style={{
                padding: '8px 18px',
                border: 'none',
                borderRadius: 4,
                fontWeight: 700,
                fontSize: 12.5,
                cursor: 'pointer',
                fontFamily: "'IBM Plex Mono', monospace",
                background: tourPerspective === 'client' ? '#2563EB' : 'transparent',
                color: tourPerspective === 'client' ? '#fff' : 'var(--steel)',
                transition: 'all 0.15s ease',
              }}
            >
              🛡️ Client / Buyer Shield Flow
            </button>
          </div>
        </div>

        {/* 4-Step Journey Grid */}
        <div className="steps-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {tourPerspective === 'vendor' ? (
            <>
              <div className="step-card" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 6, padding: '24px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div className="step-num" style={{ color: 'var(--orange)', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 18 }}>01</div>
                  <span style={{ fontSize: 22 }}>📜</span>
                </div>
                <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--navy)' }}>Lock SOW Baseline</h3>
                <p style={{ fontSize: 12.5, color: 'var(--steel)', lineHeight: 1.5 }}>
                  <strong>Option A:</strong> Upload signed SOW/MSA (PDF/Word) for instant clause extraction.<br />
                  <strong>Option B (No Document?):</strong> Use our AI Baseline Formulator to generate protective scope rules and rates ($150/hr) from your basic project details.
                </p>
                <div style={{ marginTop: 12, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--orange)', fontWeight: 600 }}>
                  ✓ Upload SOW OR Formulate with AI
                </div>
              </div>

              <div className="step-card" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 6, padding: '24px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div className="step-num" style={{ color: 'var(--orange)', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 18 }}>02</div>
                  <span style={{ fontSize: 22 }}>📥</span>
                </div>
                <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--navy)' }}>Stream Inbound Asks</h3>
                <p style={{ fontSize: 12.5, color: 'var(--steel)', lineHeight: 1.5 }}>
                  Forward client emails to your live inbox (<code>cloudmailin.net</code>), log post-meeting MOM notes, or drop Slack chats. Zero manual typing.
                </p>
                <div style={{ marginTop: 12, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--green)', fontWeight: 600 }}>
                  ✓ Real-time Webhook Ingestion
                </div>
              </div>

              <div className="step-card" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 6, padding: '24px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div className="step-num" style={{ color: 'var(--orange)', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 18 }}>03</div>
                  <span style={{ fontSize: 22 }}>⚡</span>
                </div>
                <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--navy)' }}>Grounded Scope Audit</h3>
                <p style={{ fontSize: 12.5, color: 'var(--steel)', lineHeight: 1.5 }}>
                  AI cross-references every ask against the contract baseline, estimates realistic hours by role, and establishes 3-way grounded billable proof.
                </p>
                <div style={{ marginTop: 12, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--orange)', fontWeight: 600 }}>
                  ✓ 4 Verification Badges
                </div>
              </div>

              <div className="step-card" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 6, padding: '24px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div className="step-num" style={{ color: 'var(--orange)', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 18 }}>04</div>
                  <span style={{ fontSize: 22 }}>✍️</span>
                </div>
                <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--navy)' }}>1-Click Approval &amp; Cash</h3>
                <p style={{ fontSize: 12.5, color: 'var(--steel)', lineHeight: 1.5 }}>
                  Generate Change Orders (CR-014, CR-017...), share passwordless client e-sign links (<code>/review/:token</code>), and reconcile invoices with 1 click.
                </p>
                <div style={{ marginTop: 12, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--green)', fontWeight: 600 }}>
                  ✓ Friction-Free Digital Sign-Off
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="step-card" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 6, padding: '24px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div className="step-num" style={{ color: '#2563EB', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 18 }}>01</div>
                  <span style={{ fontSize: 22 }}>🛡️</span>
                </div>
                <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--navy)' }}>Lock Vendor Warranty</h3>
                <p style={{ fontSize: 12.5, color: 'var(--steel)', lineHeight: 1.5 }}>
                  <strong>Option A:</strong> Upload vendor agreement to extract scope bounds and 90-day defect warranty SLAs (§5.1).<br />
                  <strong>Option B (No Contract?):</strong> Input agreed deliverables and let AI generate your protective Buyer Shield baseline.
                </p>
                <div style={{ marginTop: 12, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: '#2563EB', fontWeight: 600 }}>
                  ✓ Upload Contract OR AI-Guided Creation
                </div>
              </div>

              <div className="step-card" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 6, padding: '24px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div className="step-num" style={{ color: '#2563EB', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 18 }}>02</div>
                  <span style={{ fontSize: 22 }}>📑</span>
                </div>
                <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--navy)' }}>Ingest Invoices &amp; Claims</h3>
                <p style={{ fontSize: 12.5, color: 'var(--steel)', lineHeight: 1.5 }}>
                  Upload vendor supplementary invoices, change claims, or email billing requests for automated contractual verification.
                </p>
                <div style={{ marginTop: 12, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: '#2563EB', fontWeight: 600 }}>
                  ✓ Automated Claim Ingestion
                </div>
              </div>

              <div className="step-card" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 6, padding: '24px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div className="step-num" style={{ color: '#2563EB', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 18 }}>03</div>
                  <span style={{ fontSize: 22 }}>🔍</span>
                </div>
                <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--navy)' }}>Audit Double-Billing</h3>
                <p style={{ fontSize: 12.5, color: 'var(--steel)', lineHeight: 1.5 }}>
                  Scopeline automatically flags redundant charges, defect rework billed as new features, and unapproved variation rates.
                </p>
                <div style={{ marginTop: 12, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: '#DC2626', fontWeight: 600 }}>
                  ✓ Overbilling Shield Active
                </div>
              </div>

              <div className="step-card" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 6, padding: '24px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div className="step-num" style={{ color: '#2563EB', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 18 }}>04</div>
                  <span style={{ fontSize: 22 }}>⚖️</span>
                </div>
                <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--navy)' }}>Dispute &amp; Protect Budget</h3>
                <p style={{ fontSize: 12.5, color: 'var(--steel)', lineHeight: 1.5 }}>
                  Generate legal SOW Pushback &amp; Dispute Letters with cited contract clauses to withhold unauthorized fees before milestone release.
                </p>
                <div style={{ marginTop: 12, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--green)', fontWeight: 600 }}>
                  ✓ Budget Protected &amp; Neutralized
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick CTA inside Journey */}
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <button
            type="button"
            className="btn orange large"
            onClick={() => openAuth('register', tourPerspective)}
            style={tourPerspective === 'client' ? { background: '#2563EB', borderColor: '#2563EB' } : {}}
          >
            🚀 Experience The {tourPerspective === 'client' ? 'Client Shield' : 'Agency'} Workflow Free →
          </button>
        </div>
      </section>

      {/* PRICING & 14-DAY TRIAL SECTION */}
      <section id="pricing" className="landing-section pricing-section">
        <div className="section-head">
          <div className="section-kicker">Early Adopter Program</div>
          <h2>Simple, Margin-Positive Pricing</h2>
          <p>Join the first 50 agency leaders protecting their project revenue today.</p>
        </div>

        <div className="pricing-grid">
          <div className="pricing-card popular">
            <div className="pricing-badge">🔥 FIRST 50 USERS PASS · SPOT 38/50</div>
            <h3>Team Growth Plan</h3>
            <div className="price-tag">
              <span className="price">$0</span>
              <span className="period">due today (14-Day Free Trial)</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--steel)', marginBottom: 18 }}>
              Then $149/mo after trial. Cancel anytime before trial ends in 1 click.
            </div>

            <ul className="pricing-perks">
              <li>✓ Unlimited Active Projects &amp; SOWs</li>
              <li>✓ AI SOW Baseline &amp; Signed Contract Priority</li>
              <li>✓ 3-Way Proof Scope Creep Detection</li>
              <li>✓ Dedicated Inbound Project Email Drop-In</li>
              <li>✓ 1-Click PDF Change Order Exports</li>
              <li>✓ Full &amp; Partial Payment Reconciliation</li>
              <li>✓ Commercial AI Clause Assistant</li>
            </ul>

            <button
              type="button"
              className="btn orange large full-width"
              onClick={() => openAuth('register')}
            >
              Start 14-Day Free Trial →
            </button>
          </div>

          <div className="pricing-card">
            <div className="pricing-badge" style={{ background: '#F1F5F9', color: 'var(--navy)' }}>ENTERPRISE</div>
            <h3>Custom Agency Portfolio</h3>
            <div className="price-tag">
              <span className="price">Custom</span>
              <span className="period">billed annually</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--steel)', marginBottom: 18 }}>
              For multi-entity agencies and consultancies managing $5M+ in project volume.
            </div>

            <ul className="pricing-perks">
              <li>✓ Everything in Team Growth</li>
              <li>✓ Dedicated Account Manager</li>
              <li>✓ Custom ERP &amp; Billing Integrations</li>
              <li>✓ Multi-workspace Consolidation</li>
              <li>✓ Custom SLA &amp; Security Review</li>
            </ul>

            <button
              type="button"
              className="btn ghost large full-width"
              onClick={() => openAuth('register')}
            >
              Contact Sales →
            </button>
          </div>
        </div>
      </section>

      {/* ================= BOOK A DEMO SECTION ================= */}
      <section id="book-demo" className="landing-section book-demo-section">
        <div className="section-head">
          <div className="section-kicker">Personalized 1-on-1 Walkthrough</div>
          <h2>Book a Tailored Demo with a Solutions Architect</h2>
          <p>See how Scopeline protects margins or defends budgets on your actual contract workflows in 20 minutes.</p>
        </div>

        <div className="book-demo-grid">
          {/* Left Column: What to Expect & Proof */}
          <div className="book-demo-info">
            <h2>See Scopeline in Action on Your SOWs</h2>
            <p className="book-demo-desc">
              Whether you are an agency owner looking to stop unbilled scope creep or a founder auditing incoming vendor change requests, our team will walk you through a live, tailored session with zero pressure.
            </p>

            <ul className="demo-perks-list">
              <li className="demo-perk-item">
                <div className="demo-perk-icon">🔍</div>
                <div className="demo-perk-text">
                  <strong>AI SOW Baseline Extraction</strong>
                  <p>Watch how Scopeline extracts Section 1.0 deliverables and locks out-of-scope boundaries from complex contracts.</p>
                </div>
              </li>
              <li className="demo-perk-item">
                <div className="demo-perk-icon">⚡</div>
                <div className="demo-perk-text">
                  <strong>3-Way Grounded Proof Demo</strong>
                  <p>Experience converting messy email threads and Slack asks into audit-grade Change Orders with contractual citations.</p>
                </div>
              </li>
              <li className="demo-perk-item">
                <div className="demo-perk-icon">🛡️</div>
                <div className="demo-perk-text">
                  <strong>Milestone Payment &amp; Invoice Shield</strong>
                  <p>Learn how to withhold disputed surcharges or reconcile approved milestone payments with 1 click.</p>
                </div>
              </li>
              <li className="demo-perk-item">
                <div className="demo-perk-icon">🔒</div>
                <div className="demo-perk-text">
                  <strong>Enterprise Privacy &amp; Security Review</strong>
                  <p>Zero mailbox access required. Dedicated project inbound drop address and workspace isolation.</p>
                </div>
              </li>
            </ul>

            <div className="demo-guarantee-card">
              <strong>⭐ Tailored Session Guarantee:</strong> In 20 minutes, we will benchmark your unbilled revenue risk or vendor overbilling exposure with actionable contractual takeaways.
            </div>
          </div>

          {/* Right Column: Interactive Booking Card */}
          <div className="book-demo-form-card">
            {demoSubmitted ? (
              <div className="demo-success-box">
                <div className="demo-success-icon">🎉</div>
                <div className="demo-success-title">Demo Request Confirmed!</div>
                <div className="demo-success-msg">
                  Thank you, <strong>{demoName}</strong>. We've reserved your priority 1-on-1 walkthrough for <strong>{demoCompany || 'your team'}</strong>.<br /><br />
                  A senior solution engineer will email you at <strong style={{ color: 'var(--navy)' }}>{demoEmail}</strong> within 2 business hours with direct calendar booking slots and a customized preview link.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    type="button"
                    className="btn orange full-width"
                    onClick={() => openAuth('register', demoPerspective)}
                  >
                    Start 30-Day Free Trial Immediately →
                  </button>
                  <button
                    type="button"
                    className="btn ghost small full-width"
                    onClick={() => {
                      setDemoSubmitted(false);
                      setDemoName('');
                      setDemoEmail('');
                      setDemoCompany('');
                    }}
                  >
                    Book Another Session
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="book-demo-form-head">
                  <h3>Schedule Your 20-Minute Demo</h3>
                  <p>Pick your business perspective and let us tailor the live walkthrough.</p>
                </div>

                {demoError && <div className="error" style={{ marginBottom: 14 }}>{demoError}</div>}

                <form onSubmit={handleDemoSubmit}>
                  <div className="field">
                    <label className="field-label">Your Perspective *</label>
                    <div className="demo-pill-group">
                      <button
                        type="button"
                        className={`demo-pill-btn ${demoPerspective === 'vendor' ? 'active vendor' : ''}`}
                        onClick={() => setDemoPerspective('vendor')}
                      >
                        🏢 Agency / Service Provider
                      </button>
                      <button
                        type="button"
                        className={`demo-pill-btn ${demoPerspective === 'client' ? 'active client' : ''}`}
                        onClick={() => setDemoPerspective('client')}
                      >
                        🛡️ Client / Buyer Shield
                      </button>
                    </div>
                  </div>

                  <div className="field">
                    <label className="field-label">Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Sarah Jenkins"
                      value={demoName}
                      onChange={(e) => setDemoName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="field">
                    <label className="field-label">Work Email *</label>
                    <input
                      type="email"
                      placeholder="name@company.com"
                      value={demoEmail}
                      onChange={(e) => setDemoEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="field">
                    <label className="field-label">{demoPerspective === 'client' ? 'Company / Business Name *' : 'Agency / Studio Name *'}</label>
                    <input
                      type="text"
                      placeholder={demoPerspective === 'client' ? 'e.g. Acme Ventures Ltd.' : 'e.g. Apex Digital Agency'}
                      value={demoCompany}
                      onChange={(e) => setDemoCompany(e.target.value)}
                      required
                    />
                  </div>

                  <div className="field">
                    <label className="field-label">Team Size</label>
                    <div className="demo-size-grid">
                      {['1-10', '11-50', '51-200', '200+'].map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          className={`demo-size-btn ${demoTeamSize === sz ? 'active' : ''}`}
                          onClick={() => setDemoTeamSize(sz)}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="field">
                    <label className="field-label">Primary Objective</label>
                    <select
                      value={demoGoal}
                      onChange={(e) => setDemoGoal(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--line)', background: '#fff', fontSize: 12.5 }}
                    >
                      {demoPerspective === 'vendor' ? (
                        <>
                          <option value="Recover Unbilled Scope Creep across Client Accounts">Recover Unbilled Scope Creep across Client Accounts</option>
                          <option value="Standardize 1-Click Change Order Agreements">Standardize 1-Click Change Order Agreements</option>
                          <option value="Milestone Invoicing & Cash Reconciliation">Milestone Invoicing &amp; Cash Reconciliation</option>
                          <option value="Multi-Workspace Agency Setup">Multi-Workspace Agency Setup ($1M+ Volume)</option>
                        </>
                      ) : (
                        <>
                          <option value="Audit Vendor Change Orders & Defend Fixed Budgets">Audit Vendor Change Orders &amp; Defend Fixed Budgets</option>
                          <option value="Enforce 90-Day Defect Warranty SLAs">Enforce 90-Day Defect Warranty SLAs (§5.0)</option>
                          <option value="Neutralize Redundant Surcharges on Invoices">Neutralize Redundant Surcharges on Invoices</option>
                          <option value="Enterprise Buyer Vendor Management">Enterprise Buyer Vendor Management</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="field">
                    <label className="field-label">Specific Questions or SOW Context (Optional)</label>
                    <textarea
                      rows={2}
                      placeholder="Tell us about your current contract review workflow or upcoming projects…"
                      value={demoNotes}
                      onChange={(e) => setDemoNotes(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--line)', fontSize: 12 }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn orange large full-width"
                    disabled={demoBusy}
                    style={{ marginTop: 6 }}
                  >
                    {demoBusy ? 'Scheduling…' : '📅 Book 1-on-1 Walkthrough →'}
                  </button>

                  <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--steel)', marginTop: 10 }}>
                    🔒 100% Confidential · No credit card required · NDA protected
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <div className="swatch" />
            <span className="brand-text">SCOPELINE</span>
            <p>The AI-powered commercial scope &amp; revenue recovery platform for agencies and contractors.</p>
          </div>

          <div className="footer-links">
            <a href="#features">Features</a>
            <a href="#demo">Interactive Sandbox</a>
            <a href="#pricing">Pricing</a>
            <a href="#book-demo">Book a Demo</a>
            <button type="button" className="link-btn" onClick={() => openAuth('login')}>
              Sign In
            </button>
          </div>
        </div>
        <div className="footer-bottom">
          © 2026 Scopeline Inc. All rights reserved. Bank-grade encryption &amp; privacy first.
        </div>
      </footer>

      {/* AUTH MODAL (REGISTER & SIGN IN) */}
      {showAuthModal && (
        <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) setShowAuthModal(false); }}>
          <div className="modal auth-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-head">
              <div>
                <div style={{ fontSize: 10.5, letterSpacing: '0.08em', color: 'var(--orange)', textTransform: 'uppercase', fontWeight: 600 }}>
                  {authTab === 'register' ? '✨ 30-Day Full Access Trial' : 'Account Access'}
                </div>
                <h3>{authTab === 'register' ? 'Create Your Account' : 'Sign in to Scopeline'}</h3>
              </div>
              <button onClick={() => setShowAuthModal(false)} aria-label="Close">&times;</button>
            </div>

            <div className="modal-body" style={{ padding: '20px 24px' }}>
              {/* Tab Selector */}
              <div className="auth-toggle" style={{ marginBottom: 18 }}>
                <button
                  type="button"
                  className={authTab === 'register' ? 'active' : ''}
                  onClick={() => { setAuthTab('register'); setAuthError(''); }}
                >
                  Start 30-Day Free Trial
                </button>
                <button
                  type="button"
                  className={authTab === 'login' ? 'active' : ''}
                  onClick={() => { setAuthTab('login'); setAuthError(''); }}
                >
                  Sign In
                </button>
              </div>

              {authError && <div className="error" style={{ marginBottom: 12 }}>{authError}</div>}

              <form onSubmit={handleAuthSubmit}>
                {authTab === 'register' && (
                  <>
                    <div className="field">
                      <label className="field-label">Choose Your Product Edition *</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                        <div
                          style={{
                            border: `1.5px solid ${perspective === 'vendor' ? 'var(--orange)' : 'var(--line)'}`,
                            background: perspective === 'vendor' ? 'var(--orange-dim)' : '#fff',
                            padding: '10px 12px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                          onClick={() => setPerspective('vendor')}
                        >
                          <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--navy)' }}>🏢 Service Provider</div>
                          <div style={{ fontSize: 10.5, color: 'var(--steel)', marginTop: 2 }}>Agency, Dev Shop, PM</div>
                        </div>
                        <div
                          style={{
                            border: `1.5px solid ${perspective === 'client' ? '#2563EB' : 'var(--line)'}`,
                            background: perspective === 'client' ? '#EFF6FF' : '#fff',
                            padding: '10px 12px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                          onClick={() => setPerspective('client')}
                        >
                          <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--navy)' }}>🛡️ Hiring Client</div>
                          <div style={{ fontSize: 10.5, color: 'var(--steel)', marginTop: 2 }}>Founder, Buyer, Client</div>
                        </div>
                      </div>
                    </div>

                    <div className="field">
                      <label className="field-label">Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Alex Henderson"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="field">
                      <label className="field-label">{perspective === 'client' ? 'Company / Business Name *' : 'Company / Agency Name *'}</label>
                      <input
                        type="text"
                        placeholder={perspective === 'client' ? 'e.g. Acme Ventures' : 'e.g. Apex Digital Studio'}
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}

                <div className="field">
                  <label className="field-label">Work Email *</label>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {authTab === 'register' && (
                  <div className="field">
                    <label className="field-label">Mobile Phone Number (Optional)</label>
                    <input
                      type="tel"
                      placeholder="e.g. +1 (555) 000-0000 or +91 9876543210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                    <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 3 }}>
                      🔒 Used for security alerts, account recovery &amp; password resets.
                    </div>
                  </div>
                )}

                <div className="field">
                  <label className="field-label">Password *</label>
                  <input
                    type="password"
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>

                {authTab === 'register' && (
                  <div style={{ background: '#F8FAFC', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: 4, marginBottom: 12, fontSize: 11.5, color: 'var(--steel)' }}>
                    ✓ <strong>No credit card required.</strong> Instant 30-day trial with full access to SOW baseline analysis, change orders, and AI scope detection.
                  </div>
                )}

                <button
                  type="submit"
                  className="btn orange full-width"
                  disabled={busy}
                  style={{ marginTop: 4, padding: '10px' }}
                >
                  {busy ? 'Processing…' : authTab === 'register' ? 'Activate 30-Day Free Trial →' : 'Sign In →'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { api, setToken, setUser } from '../api.js';

const DEMO_SCENARIOS = [
  {
    id: 'dashboard',
    title: 'Urgent Executive Gross-Margin Dashboard',
    channel: '✉️ Email from CEO',
    sender: 'David Vance (CEO)',
    text: 'Hey team, we have a board meeting on Thursday. Can you quickly build a live Gross-Margin analytics dashboard with real-time export? We need this urgent.',
    verdict: 'OUT_OF_SCOPE',
    type: 'Feature Addition / Scope Expansion',
    clause: '§2.4 — Third-party analytics and executive reporting suites are excluded from base deliverables.',
    hours: 42,
    rate: 150,
    value: 6300,
    confidence: '96%',
    reasoning: 'Executive reporting and custom BI dashboards are explicitly excluded under SOW §2.4. Requires dedicated pipeline and 42 billable engineering hours.',
  },
  {
    id: 'multicurrency',
    title: 'Multi-Currency Checkout & Tax Engine',
    channel: '📝 Post-Meeting MOM',
    sender: 'Sarah Jenkins (VP Digital)',
    text: 'Client requested enabling multi-currency checkout with automatic FX rate hedging and tax localization for EU/UK expansion before next sprint.',
    verdict: 'OUT_OF_SCOPE',
    type: 'Internationalization / Excluded Integration',
    clause: '§2.3 — SOW covers single-currency USD checkout only. Global-e / multi-currency tax engines require separate variation.',
    hours: 100,
    rate: 150,
    value: 15000,
    confidence: '98%',
    reasoning: 'Multi-currency checkout requires third-party localization and cross-border merchant accounts, explicitly excluded from the base SOW deliverables.',
  },
  {
    id: 'revisions',
    title: 'Round 4 Design & Layout Overhaul',
    channel: '💬 Slack Ask',
    sender: 'Alex Rivera (Marketing Lead)',
    text: 'Can we redo the entire checkout step 2 layout and change the card colors? We want to try a 4th design iteration before launch.',
    verdict: 'OUT_OF_SCOPE',
    type: 'Excess Design Iterations',
    clause: '§2.6 — Contract explicitly limits UI design iterations to 2 rounds per milestone.',
    hours: 3.5,
    rate: 150,
    value: 525,
    confidence: '95%',
    reasoning: 'Milestone 2 design sign-off was completed on Aug 14. This represents iteration #4, exceeding the contractually agreed 2-round cap.',
  },
];

export default function LandingPage({ onAuthSuccess }) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState('register'); // 'login' | 'register'
  const [selectedDemo, setSelectedDemo] = useState(DEMO_SCENARIOS[0]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [authError, setAuthError] = useState('');
  const [busy, setBusy] = useState(false);

  function openAuth(tab = 'register') {
    setAuthTab(tab);
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
      if (!phoneNumber.trim()) {
        setAuthError('Please enter your mobile phone number for account verification & security.');
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
      });
      setShowAuthModal(false);
      onAuthSuccess(res);
    } catch (err) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setBusy(false);
    }
  }

  function handleFillDemoLogin() {
    setEmail('demo@scopeline.io');
    setPassword('Demo2026!');
    setAuthTab('login');
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
            <a href="#features">Features</a>
            <a href="#demo">Live Scope Tester</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#pricing">Pricing</a>
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
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>
              Features
            </a>
            <a href="#demo" onClick={() => setMobileMenuOpen(false)}>
              Live Scope Tester
            </a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>
              How It Works
            </a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>
              Pricing
            </a>
            <div style={{ padding: '10px 0 4px' }}>
              <button
                type="button"
                className="btn orange small full-width"
                onClick={() => openAuth('register')}
              >
                🚀 Start 14-Day Free Trial
              </button>
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="landing-hero">
        <div className="hero-badge">
          <span className="pulse-dot" />
          <span>AI Commercial Scope &amp; Revenue Recovery</span>
        </div>

        <h1 className="hero-title">
          Stop Unbilled Scope Creep.<br />
          <span className="highlight">Recover $10,000s</span> in Hidden Project Revenue.
        </h1>

        <p className="hero-subtitle">
          Scopeline cross-references your client emails, meeting notes (MOM), and Slack chats against your signed SOW to detect out-of-scope asks and turn them into client-ready Change Requests in seconds.
        </p>

        <div className="hero-cta-group">
          <button
            type="button"
            className="btn orange large"
            onClick={() => openAuth('register')}
          >
            🚀 Start 14-Day Free Trial (First 50 Users Free)
          </button>
          <a
            href="#demo"
            className="btn ghost large"
          >
            ⚡ Try Interactive Scope Tester
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

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="landing-section how-section">
        <div className="section-head">
          <div className="section-kicker">3 Simple Steps</div>
          <h2>How Scopeline Recovers Your Lost Revenue</h2>
        </div>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-num">01</div>
            <h3>Establish SOW Baseline</h3>
            <p>Upload your signed contract or let the AI build protective scope rules and revision caps from your proposal.</p>
          </div>

          <div className="step-card">
            <div className="step-num">02</div>
            <h3>Log MOM &amp; Forward Activity</h3>
            <p>Log meeting minutes, forward client requests, or paste chat threads. The AI continuously scans for unbilled expansion.</p>
          </div>

          <div className="step-card">
            <div className="step-num">03</div>
            <h3>Generate CRs &amp; Collect Cash</h3>
            <p>Export grounded Change Request PDFs, get signed approval, and reconcile payments seamlessly into your dashboard.</p>
          </div>
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
            <a href="#demo">Live Demo</a>
            <a href="#pricing">Pricing</a>
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
                      <label className="field-label">Company / Agency Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Apex Digital Studio"
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
                    <label className="field-label">Mobile Phone Number *</label>
                    <input
                      type="tel"
                      placeholder="e.g. +1 (555) 000-0000 or +91 9876543210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                    />
                    <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 3 }}>
                      🔒 Used for account recovery, security alerts &amp; password resets.
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

              {authTab === 'login' && (
                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={handleFillDemoLogin}
                    style={{ fontSize: 11.5 }}
                  >
                    ⚡ Use Demo Account (Instant Login)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

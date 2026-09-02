import { useState, useRef } from 'react';
import { api, setUser, getUser } from '../api.js';

const ONB_TOTAL_STEPS = 6;

export default function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('Jamie Rivera');
  const [company, setCompany] = useState('Nimbus Digital');
  const [role, setRole] = useState('pm'); // 'pm' | 'founder'
  const [projectName, setProjectName] = useState('Northwind Retail — Platform Modernization');
  const [client, setClient] = useState('Northwind Retail Corp');
  const [value, setValue] = useState('185000');
  const [currency, setCurrency] = useState('USD');
  const [createdProjectId, setCreatedProjectId] = useState(null);
  const [contractFile, setContractFile] = useState(null);
  const [contractName, setContractName] = useState('');
  const [contractUploaded, setContractUploaded] = useState(false);
  const [sources, setSources] = useState(['email', 'slack']);

  // Payment & Free Trial State
  const [cardholderName, setCardholderName] = useState('Jamie Rivera');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expDate, setExpDate] = useState('12/28');
  const [cvc, setCvc] = useState('123');
  const [country, setCountry] = useState('United States');
  const [postalCode, setPostalCode] = useState('10001');

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileInputRef = useRef(null);

  async function handleNext() {
    setErr('');
    setBusy(true);
    try {
      if (step === 0) {
        // Step 1: Workspace
        await api.onboardingWorkspace({ name, companyName: company, role });
      } else if (step === 1) {
        // Step 2: Project
        const proj = await api.onboardingProject({
          projectName,
          clientName: client,
          scopeValue: parseFloat(value) || 0,
          currency,
        });
        if (proj?.id) setCreatedProjectId(proj.id);
      } else if (step === 2 && contractFile && createdProjectId) {
        // Step 3: Contract upload
        await api.uploadContract(createdProjectId, contractFile);
      } else if (step === 4) {
        // Step 5: Save Payment Method for 14-day trial
        await api.savePaymentMethod({
          cardholderName: cardholderName || name,
          cardNumber,
          expDate,
          cvc,
          postalCode,
          country,
        });
      }
      setStep((s) => Math.min(ONB_TOTAL_STEPS - 1, s + 1));
    } catch (ex) {
      setErr(ex.message || 'Error saving onboarding step');
    } finally {
      setBusy(false);
    }
  }

  async function handleFinish() {
    setErr('');
    setBusy(true);
    try {
      const res = await api.onboardingComplete();
      const current = getUser();
      setUser({ ...current, onboarded: true, onboardingStep: 5 });
      onComplete(res);
    } catch (ex) {
      setErr(ex.message || 'Failed to complete onboarding');
    } finally {
      setBusy(false);
    }
  }

  function handleFileSelect(e) {
    const f = e.target.files[0];
    if (f) {
      setContractFile(f);
      setContractName(f.name);
      setContractUploaded(true);
    }
  }

  function toggleSource(s) {
    setSources((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  function fillTestCard() {
    setCardNumber('4242 4242 4242 4242');
    setExpDate('12/28');
    setCvc('123');
    setPostalCode('10001');
    setCardholderName(name || 'Jamie Rivera');
  }

  const stepsState = Array.from({ length: ONB_TOTAL_STEPS }, (_, i) =>
    i < step ? 'done' : i === step ? 'current' : ''
  );

  return (
    <div className="onb-shell">
      <div className="onb-header">
        <div className="swatch"></div>
        <div className="name">SCOPELINE</div>
      </div>

      <div className="onb-steps">
        {stepsState.map((s, i) => (
          <div key={i} className={`seg ${s}`}></div>
        ))}
      </div>

      <div className="onb-card">
        {err && <div className="error">{err}</div>}

        {/* STEP 0: WORKSPACE & ROLE */}
        {step === 0 && (
          <>
            <div className="step-tag">Step 1 of {ONB_TOTAL_STEPS} — Workspace &amp; profile</div>
            <h2>Welcome to Scopeline</h2>
            <div className="sub">Tell us a bit about your company and what you do.</div>

            <div className="field">
              <label className="field-label">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!cardholderName) setCardholderName(e.target.value);
                }}
                required
              />
            </div>

            <div className="field">
              <label className="field-label">Company / Agency Name</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="field-label">Your Primary Role</label>
              <div className="role-pick">
                <div
                  className={`opt ${role === 'pm' ? 'selected' : ''}`}
                  onClick={() => setRole('pm')}
                >
                  <div className="t">Project Manager / Delivery Lead</div>
                  <div className="d">Tracking scope boundaries and change requests</div>
                </div>
                <div
                  className={`opt ${role === 'founder' ? 'selected' : ''}`}
                  onClick={() => setRole('founder')}
                >
                  <div className="t">Agency Founder / Executive</div>
                  <div className="d">Portfolio revenue protection and billing leakage</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* STEP 1: FIRST PROJECT */}
        {step === 1 && (
          <>
            <div className="step-tag">Step 2 of {ONB_TOTAL_STEPS} — First project</div>
            <h2>Set up your first project</h2>
            <div className="sub">You can track multiple projects later. Let&apos;s start with one active engagement.</div>

            <div className="field">
              <label className="field-label">Project Name *</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="field-label">Client Name *</label>
              <input
                type="text"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                required
              />
            </div>

            <div className="grid cols-2" style={{ gap: 12 }}>
              <div className="field">
                <label className="field-label">Agreed Scope Value ($)</label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">Currency</label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {/* STEP 2: CONTRACT UPLOAD / BASELINE */}
        {step === 2 && (
          <>
            <div className="step-tag">Step 3 of {ONB_TOTAL_STEPS} — Scope of Work</div>
            <h2>Add your contract or SOW baseline</h2>
            <div className="sub">We&apos;ll extract the scope, price, and change-request terms automatically. You can skip this and add it later.</div>

            <div
              className="upload-zone"
              onClick={() => fileInputRef.current?.click()}
            >
              <h4>Drop your SOW / contract here</h4>
              <p>Supports PDF, Word (DOCX), Excel (XLSX), or Text (TXT)</p>
              <div style={{ marginTop: 14 }}>
                <button type="button" className="btn small">
                  {contractUploaded ? 'Change File' : 'Choose File'}
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.xlsx,.xls,.txt"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />

            {contractUploaded && (
              <div className="doc-row" style={{ marginTop: 14 }}>
                <span className={`ext ${contractName?.endsWith('.pdf') ? 'pdf' : contractName?.endsWith('.xlsx') || contractName?.endsWith('.xls') ? 'xls' : contractName?.endsWith('.txt') ? 'txt' : 'doc'}`}>
                  {contractName?.split('.').pop()?.toUpperCase() || 'DOC'}
                </span>
                <span className="name">{contractName || 'SOW_Signed.pdf'}</span>
                <span className="meta">Ready to extract</span>
              </div>
            )}
          </>
        )}

        {/* STEP 3: ACTIVITY SOURCES */}
        {step === 3 && (
          <>
            <div className="step-tag">Step 4 of {ONB_TOTAL_STEPS} — Project activity</div>
            <h2>Where does your project activity live?</h2>
            <div className="sub">Pick what you&apos;d like to connect. All of these can be added or changed later — file upload always works.</div>

            <div className="source-grid">
              {[
                { id: 'email', label: 'Email (Forwarding / Sync)', desc: 'Forward client threads or sync Gmail/Outlook' },
                { id: 'slack', label: 'Slack (Channel / Export)', desc: 'Paste exports or connect a private project channel' },
                { id: 'jira', label: 'Jira / Linear (Tickets)', desc: 'Sync scope-creep issue tickets or paste logs' },
                { id: 'files', label: 'Direct Upload & Manual Entry', desc: 'Drag files, paste notes, or log ad-hoc client asks anytime' },
              ].map((s) => (
                <div
                  key={s.id}
                  className={`src ${sources.includes(s.id) ? 'selected' : ''}`}
                  onClick={() => toggleSource(s.id)}
                  style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '14px 16px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>{s.label}</span>
                    <span className="chk"></span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 4, fontWeight: 400 }}>
                    {s.desc}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--paper)', fontSize: 11.5, color: 'var(--steel)', borderRadius: 2 }}>
              🔒 <strong>Privacy note:</strong> You never need to grant full mailbox access. You can simply forward client emails, paste chat snippets, or use our <strong>Manual Scope Evaluator</strong> to check ad-hoc asks.
            </div>
          </>
        )}

        {/* STEP 4: 14-DAY FREE TRIAL & PAYMENT DETAILS (FIRST 50 USERS PASS) */}
        {step === 4 && (
          <>
            <div className="step-tag">Step 5 of {ONB_TOTAL_STEPS} — Early Access Pass</div>
            
            {/* Early Adopter Pass Banner */}
            <div style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', padding: '12px 16px', borderRadius: 6, marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#92400E', fontSize: 12.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  🔥 First 50 Early Access Pass — Spot 38 of 50 Claimed
                </div>
                <div style={{ fontSize: 12, color: '#78350F', marginTop: 2 }}>
                  Enjoy <strong>14 days of unlimited scope &amp; revenue recovery free</strong>. $0.00 charged today.
                </div>
              </div>
              <button
                type="button"
                className="btn ghost small"
                onClick={fillTestCard}
                style={{ fontSize: 11, padding: '4px 10px', borderColor: '#D97706', color: '#92400E' }}
                title="Fill with instant test card details"
              >
                💳 Use Test Card
              </button>
            </div>

            <h2>Activate Your 14-Day Free Trial</h2>
            <div className="sub">Provide payment details to secure your early access trial. You will not be charged during your 14-day trial.</div>

            {/* Payment Method Inputs */}
            <div className="field">
              <label className="field-label">Cardholder Name *</label>
              <input
                type="text"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="Name on card"
                required
              />
            </div>

            <div className="field">
              <label className="field-label">Card Number *</label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="4242 4242 4242 4242"
                required
              />
            </div>

            <div className="grid cols-2" style={{ gap: 12 }}>
              <div className="field">
                <label className="field-label">Expiration (MM/YY) *</label>
                <input
                  type="text"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  placeholder="12/28"
                  required
                />
              </div>
              <div className="field">
                <label className="field-label">Security CVC *</label>
                <input
                  type="text"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  placeholder="123"
                  required
                />
              </div>
            </div>

            <div className="grid cols-2" style={{ gap: 12 }}>
              <div className="field">
                <label className="field-label">Billing Postal Code</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="10001"
                />
              </div>
              <div className="field">
                <label className="field-label">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="United States"
                />
              </div>
            </div>

            {/* Security Guarantee Strip */}
            <div style={{ background: '#F8FAFC', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: 4, marginTop: 12, fontSize: 11.5, color: 'var(--steel)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🔒 <strong>Zero-risk guarantee:</strong> $0.00 charged today. 256-bit bank-level encryption. Cancel anytime before day 14 in 1 click.</span>
            </div>
          </>
        )}

        {/* STEP 5: COMPLETED */}
        {step === 5 && (
          <div className="onb-done">
            <div className="big-check">✓</div>
            <h2 style={{ textAlign: 'center' }}>
              14-Day Free Trial Activated!
            </h2>
            <div className="sub" style={{ textAlign: 'center', maxWidth: 460, margin: '6px auto 18px' }}>
              Welcome aboard, <strong>{name ? name.split(' ')[0] : 'there'}</strong>. Your workspace <strong>{company}</strong> and project <strong>{projectName}</strong> are active.
            </div>
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '10px 16px', borderRadius: 4, display: 'inline-block', color: '#065F46', fontSize: 12.5, fontWeight: 600 }}>
              ✓ Team Plan Active · 14 Days Remaining in Free Trial
            </div>
          </div>
        )}

        {/* ACTIONS */}
        <div className="onb-actions">
          <button
            type="button"
            className="btn ghost small"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || busy}
          >
            Back
          </button>

          <div style={{ display: 'flex', gap: 10 }}>
            {step >= 2 && step < 4 && (
              <button
                type="button"
                className="btn ghost small"
                onClick={() => setStep((s) => s + 1)}
                disabled={busy}
              >
                Skip for now
              </button>
            )}
            <button
              type="button"
              className="btn orange"
              onClick={step === 5 ? handleFinish : handleNext}
              disabled={busy}
            >
              {busy ? 'Saving…' : step === 4 ? 'Activate 14-Day Trial →' : step === 5 ? 'Enter Dashboard →' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef } from 'react';
import { api, setUser, getUser } from '../api.js';

const ONB_TOTAL_STEPS = 5;

export default function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(0);

  // Step 1: Workspace & Profile
  const initialUser = getUser();
  const [perspective, setPerspective] = useState(initialUser?.perspective || 'vendor'); // 'vendor' | 'client'
  const [name, setName] = useState(initialUser?.displayName || '');
  const [company, setCompany] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(initialUser?.phoneNumber || '');
  const [role, setRole] = useState(initialUser?.perspective === 'client' ? 'founder' : 'pm');

  // Step 2: First Project / Contract
  const [projectName, setProjectName] = useState('');
  const [client, setClient] = useState('');
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [createdProjectId, setCreatedProjectId] = useState(null);

  // Step 3: Contract SOW Baseline
  const [contractFile, setContractFile] = useState(null);
  const [contractName, setContractName] = useState('');
  const [contractUploaded, setContractUploaded] = useState(false);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileInputRef = useRef(null);

  const isClient = perspective === 'client';

  async function handleNext() {
    setErr('');

    // Step 0 Validation
    if (step === 0) {
      if (!name.trim()) {
        setErr('Please enter your full name.');
        return;
      }
      if (!company.trim()) {
        setErr(`Please enter your ${isClient ? 'company / business' : 'company / agency'} name.`);
        return;
      }

      setBusy(true);
      try {
        await api.onboardingWorkspace({
          name: name.trim(),
          companyName: company.trim(),
          role,
          phoneNumber: phoneNumber.trim(),
          perspective,
        });
        setStep(1);
      } catch (ex) {
        setErr(ex.message || 'Error saving workspace details');
      } finally {
        setBusy(false);
      }
      return;
    }

    // Step 1 Validation
    if (step === 1) {
      if (!projectName.trim()) {
        setErr('Please provide a project name.');
        return;
      }
      if (!client.trim()) {
        setErr(`Please provide a ${isClient ? 'vendor / agency' : 'client'} name.`);
        return;
      }
      const numVal = parseFloat(value) || 0;
      if (numVal <= 0) {
        setErr('Please enter a valid agreed scope contract value (e.g. 50000).');
        return;
      }

      setBusy(true);
      try {
        const proj = await api.onboardingProject({
          projectName: projectName.trim(),
          clientName: client.trim(),
          scopeValue: numVal,
          currency,
        });
        if (proj?.id) setCreatedProjectId(proj.id);
        setStep(2);
      } catch (ex) {
        setErr(ex.message || 'Error creating project');
      } finally {
        setBusy(false);
      }
      return;
    }

    // Step 2 Validation (Upload Contract)
    if (step === 2) {
      if (contractFile && createdProjectId) {
        setBusy(true);
        try {
          await api.uploadContract(createdProjectId, contractFile);
        } catch (ex) {
          setErr(ex.message || 'Error uploading SOW file');
          setBusy(false);
          return;
        } finally {
          setBusy(false);
        }
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      setStep(4);
      return;
    }
  }

  async function handleFinish() {
    setErr('');
    setBusy(true);
    try {
      const res = await api.onboardingComplete();
      const current = getUser();
      setUser({
        ...current,
        onboarded: true,
        onboardingStep: 4,
        trialDaysRemaining: 30,
        perspective,
      });
      onComplete({
        ...res,
        workspace: {
          ...(res?.workspace || {}),
          perspective,
        },
      });
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
        {err && <div className="error" style={{ marginBottom: 14 }}>{err}</div>}

        {/* STEP 0: PRODUCT EDITION & PROFILE */}
        {step === 0 && (
          <>
            <div className="step-tag">Step 1 of {ONB_TOTAL_STEPS} — Choose Your Product Edition</div>
            <h2>Select Your Account Type</h2>
            <div className="sub">Scopeline is tailored specifically to whether you provide services or hire external vendors.</div>

            <div className="field">
              <label className="field-label">Primary Purpose *</label>
              <div className="role-pick" style={{ marginBottom: 16 }}>
                <div
                  className={`opt ${perspective === 'vendor' ? 'selected' : ''}`}
                  onClick={() => {
                    setPerspective('vendor');
                    setRole('pm');
                  }}
                >
                  <div className="t">🏢 Agency / Vendor Edition</div>
                  <div className="d">We provide client services. Stop doing free unbilled work and convert scope creep into billable Change Orders.</div>
                </div>
                <div
                  className={`opt ${perspective === 'client' ? 'selected' : ''}`}
                  onClick={() => {
                    setPerspective('client');
                    setRole('founder');
                  }}
                  style={perspective === 'client' ? { borderColor: '#2563EB', background: '#EFF6FF' } : {}}
                >
                  <div className="t" style={perspective === 'client' ? { color: '#1E40AF' } : {}}>🛡️ Client / Buyer Shield</div>
                  <div className="d">We hire external agencies. Audit incoming vendor change requests, detect double-billing, and defend contract budget.</div>
                </div>
              </div>
            </div>

            <div className="field">
              <label className="field-label">Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Alex Henderson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="field-label">{isClient ? 'Company / Business Name *' : 'Company / Agency Name *'}</label>
              <input
                type="text"
                placeholder={isClient ? 'e.g. Acme Ventures' : 'e.g. Apex Digital Studio'}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="field-label">Mobile Phone Number (Optional)</label>
              <input
                type="tel"
                placeholder="e.g. +1 (555) 019-2834 or +91 98765 43210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 4 }}>
                🔒 Used for identity authentication, security alerts, and instant password resets.
              </div>
            </div>
          </>
        )}

        {/* STEP 1: FIRST PROJECT SETUP */}
        {step === 1 && (
          <>
            <div className="step-tag">Step 2 of {ONB_TOTAL_STEPS} — {isClient ? 'Vendor Contract Setup' : 'First Project Setup'}</div>
            <h2>{isClient ? 'Configure First Vendor Engagement' : 'Set Up Your First Project'}</h2>
            <div className="sub">
              {isClient
                ? 'Configure an active vendor contract to begin auditing change requests. You can add more vendors later.'
                : 'Configure one active project to begin tracking out-of-scope creep. You can add unlimited projects later.'}
            </div>

            <div className="field">
              <label className="field-label">Project / Engagement Name *</label>
              <input
                type="text"
                placeholder={isClient ? 'e.g. Mobile App Modernization' : 'e.g. Acme Corp — E-Commerce Modernization'}
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="field-label">{isClient ? 'Vendor / Agency Name *' : 'Client Name *'}</label>
              <input
                type="text"
                placeholder={isClient ? 'e.g. DevAgency Partners Ltd.' : 'e.g. Acme Corporation'}
                value={client}
                onChange={(e) => setClient(e.target.value)}
                required
              />
            </div>

            <div className="grid cols-2" style={{ gap: 12 }}>
              <div className="field">
                <label className="field-label">Agreed SOW Contract Sum *</label>
                <input
                  type="number"
                  placeholder="e.g. 150000"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label className="field-label">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid var(--border)',
                    borderRadius: 2,
                    background: '#fff',
                    fontFamily: 'inherit',
                    fontSize: 13,
                  }}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>
            </div>
          </>
        )}

        {/* STEP 2: CONTRACT SOW BASELINE */}
        {step === 2 && (
          <>
            <div className="step-tag">Step 3 of {ONB_TOTAL_STEPS} — Baseline Contract</div>
            <h2>Upload Statement of Work (SOW)</h2>
            <div className="sub">
              {isClient
                ? 'Upload the signed vendor SOW so AI can extract deliverable boundaries to defend you against unjustified extra charges.'
                : 'AI will automatically parse deliverables, exclusions, hourly variation rates, and payment milestones.'}
            </div>

            <div
              className="upload-zone"
              onClick={() => fileInputRef.current?.click()}
            >
              <h4>Drop signed SOW / Agreement here</h4>
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
                <span className="meta">Ready for AI Boundary Extraction</span>
              </div>
            )}
          </>
        )}

        {/* STEP 3: 30-DAY TRIAL ACTIVATION & ACCESS SUMMARY */}
        {step === 3 && (
          <>
            <div className="step-tag">Step 4 of {ONB_TOTAL_STEPS} — 30-Day Full Access Pass</div>
            
            <div style={{ background: isClient ? '#EFF6FF' : '#F0FDF4', border: `1.5px solid ${isClient ? '#93C5FD' : '#86EFAC'}`, padding: '14px 18px', borderRadius: 6, marginBottom: 18 }}>
              <div style={{ fontWeight: 700, color: isClient ? '#1E40AF' : '#166534', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>✨ 30-Day {isClient ? 'Client Overbilling Shield' : 'Agency Revenue Recovery'} Pass Active</span>
              </div>
              <div style={{ fontSize: 12.5, color: isClient ? '#1D4ED8' : '#15803D', marginTop: 4 }}>
                <strong>No Credit Card Required.</strong> Enjoy full access to {isClient ? 'vendor claim auditing, SOW defense letters, and budget defense.' : 'SOW baseline extraction, scope creep detection, and 1-click Change Order PDF exports.'}
              </div>
            </div>

            <h2>Security &amp; Account Overview</h2>
            <div className="sub">Review your workspace configuration before entering your portal.</div>

            <div style={{ background: '#F8FAFC', border: '1px solid var(--border)', borderRadius: 4, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                <div>
                  <div style={{ fontSize: 10.5, color: 'var(--steel)', textTransform: 'uppercase', fontWeight: 600 }}>Edition</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isClient ? '#2563EB' : 'var(--orange)', marginTop: 2 }}>
                    {isClient ? '🛡️ Client Shield Edition' : '🏢 Agency Edition'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: 'var(--steel)', textTransform: 'uppercase', fontWeight: 600 }}>Organization</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginTop: 2 }}>{company || 'My Organization'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: 'var(--steel)', textTransform: 'uppercase', fontWeight: 600 }}>Lead</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginTop: 2 }}>{name || 'Account Lead'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: 'var(--steel)', textTransform: 'uppercase', fontWeight: 600 }}>Trial Period</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#15803D', marginTop: 2 }}>30 Days Uncapped</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* STEP 4: COMPLETED & DASHBOARD LAUNCH */}
        {step === 4 && (
          <div className="onb-done">
            <div className="big-check" style={isClient ? { background: '#EFF6FF', color: '#2563EB' } : {}}>✓</div>
            <h2 style={{ textAlign: 'center' }}>
              {isClient ? 'Client Shield Command Center Ready!' : 'Workspace Ready & Live!'}
            </h2>
            <div className="sub" style={{ textAlign: 'center', maxWidth: 460, margin: '6px auto 18px' }}>
              Welcome, <strong>{name ? name.split(' ')[0] : 'there'}</strong>. Your organization <strong>{company}</strong> is configured for <strong>{isClient ? 'Vendor Overbilling Defense' : 'Revenue Recovery'}</strong>.
            </div>
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '10px 18px', borderRadius: 4, display: 'inline-block', color: '#065F46', fontSize: 13, fontWeight: 600 }}>
              ✓ 30-Day Free Trial Active · 30 Days Remaining
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
            {step === 2 && (
              <button
                type="button"
                className="btn ghost small"
                onClick={() => setStep(3)}
                disabled={busy}
              >
                Skip for now
              </button>
            )}
            <button
              type="button"
              className={`btn ${isClient ? '' : 'orange'}`}
              style={isClient ? { background: '#2563EB', color: '#fff', border: 'none' } : {}}
              onClick={step === 4 ? handleFinish : handleNext}
              disabled={busy}
            >
              {busy ? 'Saving…' : step === 3 ? 'Activate 30-Day Trial →' : step === 4 ? 'Enter Portal →' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

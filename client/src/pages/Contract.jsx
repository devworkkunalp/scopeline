import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import TitleBlock from '../components/TitleBlock.jsx';
import GenerateBaselineModal from '../components/GenerateBaselineModal.jsx';

export default function Contract({ activeProject, refreshProjects }) {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showBaselineModal, setShowBaselineModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [toast, setToast] = useState('');
  const [err, setErr] = useState('');
  const fileRef = useRef();

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  function loadContract() {
    if (!activeProject) return;
    setLoading(true);
    api.contract(activeProject.id)
      .then(setContract)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadContract();
  }, [activeProject?.id]);

  async function handleUpload(file) {
    if (!activeProject || !file) return;
    setUploading(true);
    setErr('');
    try {
      const res = await api.uploadContract(activeProject.id, file);
      setContract(res);
      showToast('SOW uploaded. Commercial terms extracted.');
      refreshProjects?.();
    } catch (e) {
      setErr(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    if (e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0]);
  }

  // Extract terms helper
  const terms = {
    originalScope: contract?.originalScope || contract?.terms?.originalScope || contract?.extracted?.['Original Scope'] || '',
    contractValueText: contract?.contractValueText || contract?.terms?.contractValueText || contract?.extracted?.['Contract Value'] || (activeProject?.value ? `$${activeProject.value.toLocaleString()} USD` : ''),
    exclusionsAllowances: contract?.exclusionsAllowances || contract?.terms?.exclusionsAllowances || contract?.extracted?.['Exclusions / Out of Scope'] || contract?.extracted?.['Exclusions'] || '',
    changeVariationRules: contract?.changeVariationRules || contract?.terms?.changeVariationRules || contract?.extracted?.['Change Request Process'] || contract?.extracted?.['Change Rules'] || '',
    paymentTerms: contract?.paymentTerms || contract?.terms?.paymentTerms || contract?.extracted?.['Payment Terms'] || '',
    noticePeriods: contract?.noticePeriods || contract?.terms?.noticePeriods || contract?.extracted?.['Notice Period'] || '',
    commercialClauses: contract?.commercialClauses || contract?.terms?.commercialClauses || contract?.extracted?.['Relevant Terms'] || contract?.extracted?.['Commercial Clauses'] || '',
  };

  // 5 Mandatory Pillar Rules Validation
  const hasScope = !!terms.originalScope.trim() && terms.originalScope !== '—';
  const hasValue = !!terms.contractValueText.trim() && terms.contractValueText !== '—';
  const hasExclusions = !!terms.exclusionsAllowances.trim() && terms.exclusionsAllowances !== '—';
  const hasRate = terms.changeVariationRules.includes('$') || terms.changeVariationRules.toLowerCase().includes('/hr') || terms.changeVariationRules.toLowerCase().includes('rate');
  const hasPayment = !!terms.paymentTerms.trim() && terms.paymentTerms !== '—';

  const rulesPassed = [hasScope, hasValue, hasExclusions, hasRate, hasPayment].filter(Boolean).length;
  const isFullyGrounded = rulesPassed === 5;

  function openEdit(focusField) {
    setEditForm({ ...terms });
    setShowEditModal(true);
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    try {
      const updated = await api.generateBaseline(activeProject.id, {
        requirementsText: editForm.originalScope,
        contractValue: activeProject.value,
        hourlyRate: 150,
      });
      // Update local view
      setContract({
        ...contract,
        ...editForm,
        terms: { ...editForm },
        extracted: {
          'Original Scope': editForm.originalScope,
          'Contract Value': editForm.contractValueText,
          'Exclusions / Out of Scope': editForm.exclusionsAllowances,
          'Change Request Process': editForm.changeVariationRules,
          'Payment Terms': editForm.paymentTerms,
          'Notice Period': editForm.noticePeriods,
          'Commercial Clauses': editForm.commercialClauses,
        }
      });
      setShowEditModal(false);
      showToast('Baseline terms saved & grounded.');
    } catch (ex) {
      showToast(ex.message || 'Failed to save');
    }
  }

  if (!activeProject) {
    return (
      <div className="content">
        <div className="empty">Select a project to view contract terms.</div>
      </div>
    );
  }

  return (
    <>
      <TitleBlock
        title="Scope of Work"
        sub="Authoritative commercial baseline & protective boundaries for scope recovery"
        project={activeProject}
      />
      {toast && <div className="toast">{toast}</div>}
      <div className="content">
        {/* Source Baseline Bar */}
        <section className="block">
          <div className="block-head">
            <h3>Contract Source &amp; Extraction Baseline</h3>
            {contract?.uploaded && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn ghost small"
                  onClick={() => openEdit()}
                >
                  ✏️ Edit SOW Terms
                </button>
                <button
                  className="btn ghost small"
                  onClick={() => setShowBaselineModal(true)}
                >
                  ✨ Re-Generate Baseline with AI
                </button>
                <button
                  className="btn ghost small"
                  onClick={() => {
                    setErr('');
                    fileRef.current.click();
                  }}
                  id="btn-replace-contract"
                >
                  🔄 Upload Document
                </button>
              </div>
            )}
          </div>

          {!contract?.uploaded ? (
            <div className="grid cols-2" style={{ gap: 16 }}>
              {/* OPTION A: UPLOAD */}
              <div
                className="upload-zone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                onClick={() => fileRef.current.click()}
                id="contract-upload-zone"
                style={{ textAlign: 'left', padding: 24, cursor: 'pointer' }}
              >
                {uploading ? (
                  <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ margin: '0 auto 10px' }} />
                    Analyzing document &amp; extracting rules…
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--steel)', fontWeight: 600, marginBottom: 4 }}>
                      Option A · Upload File
                    </div>
                    <h4 style={{ margin: '0 0 6px' }}>Upload Signed SOW / Contract</h4>
                    <p style={{ fontSize: 12.5, color: 'var(--steel)', margin: '0 0 14px' }}>
                      Supports PDF, Word (DOCX), Excel (XLSX), or TXT. AI extracts scope, exclusions, rates, and payment rules.
                    </p>
                    <button type="button" className="btn small">
                      Choose SOW File
                    </button>
                  </>
                )}
              </div>

              {/* OPTION B: GENERATE WITH AI */}
              <div
                className="card"
                style={{
                  border: '1.5px dashed var(--orange)',
                  background: '#FFFBF9',
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--orange)', fontWeight: 600, marginBottom: 4 }}>
                    Option B · No Formal SOW Yet?
                  </div>
                  <h4 style={{ margin: '0 0 6px', color: 'var(--navy)' }}>✨ Build SOW Baseline with AI</h4>
                  <p style={{ fontSize: 12.5, color: 'var(--steel)', margin: '0 0 14px' }}>
                    Enter verbal requirements or estimate bullets. The AI formulates a formal SOW with protective out-of-scope boundaries and revision caps.
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    className="btn orange small"
                    onClick={() => setShowBaselineModal(true)}
                  >
                    ✨ Build SOW Baseline Now →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="doc-row" style={{ marginBottom: 8 }}>
                <span className={`ext ${contract.fileName?.endsWith('.pdf') ? 'pdf' : contract.fileName?.endsWith('.xlsx') || contract.fileName?.endsWith('.xls') ? 'xls' : contract.fileName?.endsWith('.txt') ? 'txt' : 'doc'}`}>
                  {contract.fileName?.split('.').pop()?.toUpperCase() || 'DOC'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="name">{contract.fileName}</span>
                    {contract.isSignedDocument ? (
                      <span className="stamp paid" style={{ fontSize: 10 }}>📎 Signed Client Document (Authoritative Ground Truth)</span>
                    ) : (
                      <span className="stamp unbilled" style={{ fontSize: 10 }}>✨ AI-Formulated Baseline Proposal</span>
                    )}
                  </div>
                  <div className="meta" style={{ marginTop: 2 }}>
                    {isFullyGrounded ? '✓ Authoritative SOW Baseline Grounded (5/5 Rules Active)' : `⚠️ Baseline Incomplete (${rulesPassed}/5 Rules Grounded)`}
                  </div>
                </div>
              </div>

              {!contract.isSignedDocument && (
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '8px 12px', borderRadius: 4, fontSize: 12, color: '#1E40AF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    <strong>Signed Contract Preference:</strong> If you receive a signed SOW document from the client later, upload it to immediately supersede this AI generated baseline.
                  </span>
                  <button
                    type="button"
                    className="btn small"
                    onClick={() => fileRef.current.click()}
                    style={{ fontSize: 11, padding: '3px 10px' }}
                  >
                    Upload Signed SOW
                  </button>
                </div>
              )}
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.xlsx,.xls,.txt"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files[0]) handleUpload(e.target.files[0]);
              e.target.value = '';
            }}
          />
          {err && <div className="error" style={{ marginTop: 8 }}>{err}</div>}
        </section>

        {/* FORMAL SOW DOCUMENT VIEWER */}
        {contract?.uploaded && (
          <div className="sow-doc-container">
            {/* Header */}
            <div className="sow-doc-header">
              <div>
                <div style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--orange)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                  Official Contract Baseline Document
                </div>
                <h2>Statement of Work Baseline Agreement</h2>
                <div className="doc-subtitle">
                  Project: <strong>{activeProject.name}</strong> · Client: <strong>{activeProject.client}</strong> · Value: <strong>{terms.contractValueText}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  className="btn ghost small"
                  style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.08)' }}
                  onClick={() => window.print()}
                  title="Print / Export SOW Document as PDF"
                >
                  📄 Print / Export PDF
                </button>
              </div>
            </div>

            {/* 5-Pillar Rule Audit Bar */}
            <div className="sow-audit-bar">
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>
                Mandatory Baseline Rule Audit:
              </div>
              <div className="sow-audit-pills">
                <span className={`sow-audit-pill ${hasScope ? 'pass' : 'fail'}`} onClick={() => !hasScope && openEdit('scope')}>
                  {hasScope ? '✓ §1 In-Scope Deliverables' : '⚠️ Missing: §1 Scope'}
                </span>
                <span className={`sow-audit-pill ${hasValue ? 'pass' : 'fail'}`} onClick={() => !hasValue && openEdit('value')}>
                  {hasValue ? `✓ Base Value (${terms.contractValueText})` : '⚠️ Missing: Contract Price'}
                </span>
                <span className={`sow-audit-pill ${hasExclusions ? 'pass' : 'fail'}`} onClick={() => !hasExclusions && openEdit('exclusions')}>
                  {hasExclusions ? '✓ §2 Protective Exclusions Active' : '⚠️ Missing: §2 Exclusions'}
                </span>
                <span className={`sow-audit-pill ${hasRate ? 'pass' : 'warn'}`} onClick={() => !hasRate && openEdit('rate')}>
                  {hasRate ? '✓ §3 Variation Rate Grounded' : '⚠️ Missing: Hourly Rate'}
                </span>
                <span className={`sow-audit-pill ${hasPayment ? 'pass' : 'fail'}`} onClick={() => !hasPayment && openEdit('payment')}>
                  {hasPayment ? '✓ §4 Milestones & Terms' : '⚠️ Missing: Milestones'}
                </span>
              </div>
            </div>

            {/* SOW Document Body */}
            <div className="sow-body">
              {/* §1 Scope */}
              <div className="sow-clause-block">
                <div className="sow-clause-head">
                  <span className="clause-title">§1.0 Baseline Scope &amp; Agreed Deliverables</span>
                  <span className="stamp paid" style={{ fontSize: 10 }}>In-Scope</span>
                </div>
                <div className="sow-clause-content">
                  {terms.originalScope || <em style={{ color: 'var(--steel)' }}>No in-scope deliverables specified yet.</em>}
                </div>
              </div>

              {/* §2 Protective Exclusions */}
              <div className="sow-clause-block sow-exclusions-block">
                <div className="sow-clause-head">
                  <span className="clause-title">§2.0 Out-of-Scope Exclusions &amp; Commercial Boundaries</span>
                  <span className="stamp unbilled" style={{ fontSize: 10 }}>Protective Boundaries</span>
                </div>
                <div className="sow-clause-content">
                  {terms.exclusionsAllowances || <em style={{ color: 'var(--steel)' }}>No exclusions configured. Click Edit to add protective limits.</em>}
                </div>
              </div>

              {/* §3 Change Control */}
              <div className="sow-clause-block">
                <div className="sow-clause-head">
                  <span className="clause-title">§3.0 Change Request &amp; Variation Rate Protocol</span>
                  <span className="stamp confirmed" style={{ fontSize: 10 }}>Change Control</span>
                </div>
                <div className="sow-clause-content">
                  {terms.changeVariationRules || <em style={{ color: 'var(--steel)' }}>No variation rules configured.</em>}
                </div>
              </div>

              {/* §4 Payment Milestones */}
              <div className="sow-clause-block">
                <div className="sow-clause-head">
                  <span className="clause-title">§4.0 Milestone Payment Schedule &amp; Commercial Terms</span>
                  <span className="stamp paid" style={{ fontSize: 10 }}>Commercial Terms</span>
                </div>
                <div className="sow-clause-content">
                  {terms.paymentTerms || <em style={{ color: 'var(--steel)' }}>No milestone payment terms configured.</em>}
                </div>
              </div>

              {/* §5 Deadlines & Commercial Clauses */}
              <div className="sow-clause-block">
                <div className="sow-clause-head">
                  <span className="clause-title">§5.0 Acceptance Deadlines &amp; Commercial Notice</span>
                  <span className="stamp review" style={{ fontSize: 10 }}>Notice Periods</span>
                </div>
                <div className="sow-clause-content">
                  <div><strong>Notice Period:</strong> {terms.noticePeriods || '7 calendar days'}</div>
                  <div style={{ marginTop: 8 }}><strong>Commercial Terms:</strong> {terms.commercialClauses || 'Client-directed rework billable at standard variation rate.'}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* GENERATE BASELINE MODAL */}
      {showBaselineModal && (
        <GenerateBaselineModal
          activeProject={activeProject}
          onClose={() => setShowBaselineModal(false)}
          onGenerated={(c) => {
            setContract(c);
            showToast('SOW baseline generated and configured as active reference.');
            refreshProjects?.();
            setShowBaselineModal(false);
          }}
        />
      )}

      {/* EDIT / COMPLETE MANDATORY RULES MODAL */}
      {showEditModal && (
        <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="modal-head">
              <div>
                <div style={{ fontSize: 10.5, letterSpacing: '0.08em', color: 'var(--orange)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Contract Baseline Editor
                </div>
                <h3>Edit &amp; Complete Mandatory SOW Rules</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} aria-label="Close">&times;</button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                <div className="field">
                  <label className="field-label">§1.0 Agreed Deliverables (In-Scope) *</label>
                  <textarea
                    rows={4}
                    value={editForm.originalScope || ''}
                    onChange={(e) => setEditForm((p) => ({ ...p, originalScope: e.target.value }))}
                    required
                  />
                </div>

                <div className="field">
                  <label className="field-label">§2.0 Protective Exclusions &amp; Limits (Out-of-Scope) *</label>
                  <textarea
                    rows={4}
                    value={editForm.exclusionsAllowances || ''}
                    onChange={(e) => setEditForm((p) => ({ ...p, exclusionsAllowances: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid cols-2" style={{ gap: 12 }}>
                  <div className="field">
                    <label className="field-label">§3.0 Change Request &amp; Variation Rate Clause *</label>
                    <textarea
                      rows={3}
                      value={editForm.changeVariationRules || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, changeVariationRules: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">§4.0 Milestone Schedule &amp; Terms *</label>
                    <textarea
                      rows={3}
                      value={editForm.paymentTerms || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, paymentTerms: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid cols-2" style={{ gap: 12 }}>
                  <div className="field">
                    <label className="field-label">§5.0 Acceptance Notice Period</label>
                    <input
                      type="text"
                      value={editForm.noticePeriods || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, noticePeriods: e.target.value }))}
                      placeholder="e.g. 7 calendar days written notice"
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Contract Value Text</label>
                    <input
                      type="text"
                      value={editForm.contractValueText || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, contractValueText: e.target.value }))}
                      placeholder="e.g. $185,000 USD"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-foot">
                <button type="button" className="btn ghost" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn orange">
                  Save SOW Baseline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

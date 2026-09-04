import { useEffect, useState } from 'react';
import { api } from '../api.js';
import TitleBlock from '../components/TitleBlock.jsx';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

const fmtShort = (n) => {
  if (!n) return '$0';
  if (Math.abs(n) >= 1000) return '$' + (n / 1000).toFixed(0) + 'K';
  return fmt(n);
};

export default function InvoiceTracking({ activeProject, refreshProjects }) {
  const isClient = activeProject?.perspective === 'client';

  const [opps, setOpps] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [partialOpp, setPartialOpp] = useState(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [partialDate, setPartialDate] = useState(new Date().toISOString().split('T')[0]);
  const [disputeOpp, setDisputeOpp] = useState(null);
  const [disputeLetter, setDisputeLetter] = useState(null);
  const [loadingDispute, setLoadingDispute] = useState(false);
  const [form, setForm] = useState({ number: '', date: new Date().toISOString().split('T')[0], amount: '', collected: '', related: '' });
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  function reloadData() {
    if (!activeProject) return;
    Promise.all([
      api.opportunities(activeProject.id),
      api.invoices(activeProject.id),
    ])
      .then(([o, i]) => {
        setOpps(o || []);
        setInvoices(i || []);
        refreshProjects?.();
      })
      .catch(console.error);
  }

  useEffect(() => {
    if (!activeProject) return;
    setLoading(true);
    Promise.all([
      api.opportunities(activeProject.id),
      api.invoices(activeProject.id),
    ])
      .then(([o, i]) => {
        setOpps(o || []);
        setInvoices(i || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeProject?.id]);

  // Agency calculations
  const approvedOpps = opps.filter((o) =>
    ['approved', 'invoiced', 'paid', 'change-order'].includes(o.status)
  );
  const totalApproved = approvedOpps.reduce((s, o) => s + (o.billable || 0), 0);
  const totalInvoiced = approvedOpps.reduce((s, o) => s + (o.invoiced || 0), 0);
  const totalUnbilled = Math.max(0, totalApproved - totalInvoiced);

  // Client calculations
  const contractCommitment = activeProject?.scopeValue || 0;
  const clientApprovedVariations = opps
    .filter((o) => ['approved', 'invoiced', 'paid'].includes(o.status))
    .reduce((s, o) => s + (o.billable || 0), 0);
  const clientTotalDisbursed = invoices.reduce((s, i) => s + (i.collected || 0), 0);
  const overbillingSaved = opps
    .filter((o) => ['disputed', 'rejected', 'challenge', 'detected'].includes(o.status))
    .reduce((s, o) => s + (o.billable || 0), 0);

  // Agency: Clear Full Payment
  async function handleClearFull(o) {
    const gap = (o.billable || 0) - (o.invoiced || 0);
    if (gap <= 0) return;
    setBusy(true);
    try {
      await api.reconcilePayment(o.id, { isFull: true });
      showToast(`Full payment of ${fmt(gap)} cleared for ${o.changeRequest?.number || 'CR'}.`);
      reloadData();
    } catch (ex) {
      showToast(ex.message || 'Error clearing payment');
    } finally {
      setBusy(false);
    }
  }

  // Agency: Confirm Partial Payment
  async function handleConfirmPartial(e) {
    e.preventDefault();
    if (!partialOpp) return;
    const val = parseFloat(partialAmount);
    if (!val || val <= 0) {
      showToast('Please enter a valid amount.');
      return;
    }
    setBusy(true);
    try {
      await api.reconcilePayment(partialOpp.id, {
        amount: val,
        date: partialDate,
        isFull: false,
      });
      showToast(`Payment of ${fmt(val)} recorded.`);
      setPartialOpp(null);
      reloadData();
    } catch (ex) {
      showToast(ex.message || 'Error recording partial payment');
    } finally {
      setBusy(false);
    }
  }

  // Client: Authorize / Disburse an Invoice
  async function handleDisburseInvoice(inv, full = true, customAmt = null) {
    setBusy(true);
    try {
      const amt = full ? inv.amount : (customAmt || inv.amount);
      await api.patchInvoice(activeProject.id, inv.id, {
        number: inv.number,
        collected: amt,
        relatedChangeOrder: inv.related
      });
      showToast(`Payment of ${fmt(amt)} disbursed for ${inv.number}.`);
      reloadData();
    } catch (ex) {
      showToast(ex.message || 'Error updating disbursement');
    } finally {
      setBusy(false);
    }
  }

  // Client: Delete an invoice
  async function handleDeleteInvoice(inv) {
    if (!window.confirm(`Remove invoice ${inv.number}?`)) return;
    setBusy(true);
    try {
      await api.deleteInvoice(activeProject.id, inv.id);
      showToast(`Invoice ${inv.number} removed.`);
      reloadData();
    } catch (ex) {
      showToast(ex.message || 'Error deleting invoice');
    } finally {
      setBusy(false);
    }
  }

  // Client: Open Dispute Modal with SOW Proof
  async function handleOpenDispute(opp) {
    setDisputeOpp(opp);
    setLoadingDispute(true);
    try {
      const letter = await api.generateDefenseLetter(activeProject.id, opp.id, {
        vendorName: activeProject.clientName || 'Vendor Development Team',
        customNotes: opp.notes || opp.clause || ''
      });
      setDisputeLetter(letter);
    } catch (ex) {
      // Fallback local letter if backend service is offline
      setDisputeLetter({
        subject: `Notice of Disputed Surcharge: ${opp.title} (${fmt(opp.billable)})`,
        body: `Dear Project Billing Team,\n\nWe have reviewed the surcharge of ${fmt(opp.billable)} associated with "${opp.title}".\n\nPursuant to our Master Services Agreement & SOW Clause (${opp.clause || 'Section 1.0 Deliverables'}), this item is part of the baseline contracted scope and is covered under the agreed milestone fee. Consequently, this supplementary fee is not authorized and payment for this line item is currently withheld.\n\nPlease adjust the invoice to reflect only approved milestone deliverables.\n\nSincerely,\nProject Ownership & Commercial Lead`,
        sowReference: opp.clause || 'SOW Section 1.2 Baseline Specifications',
        verdict: 'CHALLENGE_OVERBILLING',
        disputedAmount: opp.billable
      });
    } finally {
      setLoadingDispute(false);
    }
  }

  // Client: Confirm Dispute & Mark on Hold
  async function handleConfirmDispute() {
    if (!disputeOpp) return;
    setBusy(true);
    try {
      await api.setStatus(disputeOpp.id, 'disputed', 'Disputed pursuant to SOW baseline deliverables.');
      showToast(`Line item marked as Disputed. Payment withheld.`);
      setDisputeOpp(null);
      setDisputeLetter(null);
      reloadData();
    } catch (ex) {
      showToast(ex.message || 'Error marking item as disputed');
    } finally {
      setBusy(false);
    }
  }

  // Client / Agency: Add Invoice
  async function addInvoice(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const inv = await api.addInvoice(activeProject.id, {
        number: form.number,
        date: form.date,
        amount: parseFloat(form.amount) || 0,
        collected: parseFloat(form.collected) || 0,
        relatedChangeOrder: form.related || (isClient ? 'SOW Milestone' : '—'),
      });
      setInvoices((prev) => [inv, ...prev]);
      setForm({ number: '', date: new Date().toISOString().split('T')[0], amount: '', collected: '', related: '' });
      setShowAdd(false);
      showToast(isClient ? 'Vendor invoice logged and queued for milestone audit.' : 'Invoice / milestone logged.');
      reloadData();
    } catch (ex) {
      showToast(ex.message || 'Error adding invoice');
    } finally {
      setBusy(false);
    }
  }

  if (!activeProject) {
    return (
      <div className="content">
        <div className="empty">Select a project.</div>
      </div>
    );
  }

  return (
    <>
      <TitleBlock
        title={isClient ? "Vendor Invoice Audit & Payment Shield" : "Invoice Tracking"}
        sub={
          isClient
            ? "Cross-audit incoming vendor invoices against contracted SOW scope, warranty SLAs, and approved variations"
            : "Approved value reconciled against what's actually been billed"
        }
        project={activeProject}
      />
      {toast && <div className="toast">{toast}</div>}

      <div className="content">
        {/* ======================= KPI STRIP ======================= */}
        {isClient ? (
          // CLIENT SHIELD KPIS
          <section className="block">
            <div className="grid cols-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div className="kpi" style={{ '--kpi-accent': 'var(--navy)' }}>
                <div className="label">Contract Sum Committed</div>
                <div className="value">{fmtShort(contractCommitment)}</div>
                <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 4 }}>Agreed SOW Budget</div>
              </div>
              <div className="kpi" style={{ '--kpi-accent': '#1D6E96' }}>
                <div className="label">Authorized Variations</div>
                <div className="value">{fmtShort(clientApprovedVariations)}</div>
                <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 4 }}>Signed Client Add-ons</div>
              </div>
              <div className="kpi" style={{ '--kpi-accent': 'var(--green)' }}>
                <div className="label">Audited &amp; Disbursed</div>
                <div className="value">{fmtShort(clientTotalDisbursed)}</div>
                <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 4 }}>Verified Milestone Payments</div>
              </div>
              <div className="kpi" style={{ '--kpi-accent': '#2563EB', background: '#F0FDF4', border: '1.5px solid #BBF7D0' }}>
                <div className="label" style={{ color: '#166534', fontWeight: 700 }}>🛡️ Overbilling Blocked &amp; Saved</div>
                <div className="value" style={{ color: '#15803D' }}>{fmtShort(overbillingSaved)}</div>
                <div style={{ fontSize: 11, color: '#166534', marginTop: 4 }}>Unapproved fees withheld</div>
              </div>
            </div>
          </section>
        ) : (
          // AGENCY / VENDOR KPIS
          <section className="block">
            <div className="grid cols-3">
              <div className="kpi" style={{ '--kpi-accent': 'var(--amber)' }}>
                <div className="label">Approved Value</div>
                <div className="value">{fmtShort(totalApproved)}</div>
              </div>
              <div className="kpi" style={{ '--kpi-accent': '#1D6E96' }}>
                <div className="label">Invoiced Value</div>
                <div className="value">{fmtShort(totalInvoiced)}</div>
              </div>
              <div className="kpi" style={{ '--kpi-accent': 'var(--orange)' }}>
                <div className="label">Potentially Unbilled</div>
                <div className="value">{fmtShort(totalUnbilled)}</div>
              </div>
            </div>
          </section>
        )}

        {/* ======================= CLIENT SHIELD: VENDOR SURCHARGES & CHANGE CLAIMS AUDIT ======================= */}
        {isClient && (
          <section className="block">
            <div className="block-head">
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🛡️ Vendor Billing Surcharges &amp; Change Claims Audit</span>
                </h3>
                <div style={{ fontSize: 12.5, color: 'var(--steel)', marginTop: 2 }}>
                  Vendor-initiated claims for supplementary fees, hourly overages, or feature add-ons. Cross-audit against baseline SOW before releasing funds.
                </div>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="card desktop-table-view" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th>Vendor Surcharge / Claim</th>
                    <th>Vendor Ref</th>
                    <th className="num-cell">Claimed Fee</th>
                    <th>Audit Finding</th>
                    <th>SOW Proof Citation</th>
                    <th style={{ textAlign: 'right', paddingRight: 16 }}>Payment Defense Action</th>
                  </tr>
                </thead>
                <tbody>
                  {opps.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ color: 'var(--steel)', padding: 18, textAlign: 'center' }}>
                        No vendor surcharge claims detected. All billing is aligned with SOW baseline.
                      </td>
                    </tr>
                  ) : (
                    opps.map((o) => {
                      const isDisputed = o.status === 'disputed' || o.status === 'rejected';
                      const isApproved = ['approved', 'invoiced', 'paid'].includes(o.status);
                      const crNum = o.changeRequest?.number || o.changeOrder?.number || 'Vendor Claim';

                      return (
                        <tr key={o.id} style={isDisputed ? { background: '#FEF2F2' } : {}}>
                          <td style={{ maxWidth: 260 }}>
                            <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{o.title}</div>
                            {o.desc && (
                              <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {o.desc}
                              </div>
                            )}
                          </td>
                          <td className="mono" style={{ fontSize: 12 }}>
                            {crNum}
                          </td>
                          <td className="num-cell mono" style={{ fontWeight: 700, color: isDisputed ? '#DC2626' : 'var(--navy)' }}>
                            {fmt(o.billable)}
                          </td>
                          <td>
                            {isDisputed ? (
                              <span className="stamp" style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }}>
                                🛡️ Disputed / Withheld
                              </span>
                            ) : isApproved ? (
                              <span className="stamp paid">
                                ✓ Authorized Add-on
                              </span>
                            ) : (
                              <span className="stamp unbilled" style={{ background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' }}>
                                ⚠️ SOW Surcharge Flagged
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--navy)', fontFamily: "'IBM Plex Mono', monospace" }}>
                            {o.clause ? (
                              <span title={o.clause} style={{ display: 'inline-block', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                📜 {o.clause}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--steel)' }}>SOW Deliverables</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', paddingRight: 16 }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              {!isDisputed && !isApproved && (
                                <button
                                  type="button"
                                  className="btn small"
                                  disabled={busy}
                                  onClick={() => handleOpenDispute(o)}
                                  style={{ background: '#DC2626', borderColor: '#DC2626', padding: '4px 10px', fontSize: 11.5 }}
                                  title="Audit against SOW and generate legal dispute letter"
                                >
                                  🛡️ Dispute Line Item
                                </button>
                              )}
                              {isDisputed && (
                                <button
                                  type="button"
                                  className="btn ghost small"
                                  onClick={() => handleOpenDispute(o)}
                                  style={{ padding: '4px 8px', fontSize: 11.5, color: '#991B1B', borderColor: '#FCA5A5' }}
                                >
                                  📜 View Dispute Proof
                                </button>
                              )}
                              {isApproved && (
                                <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
                                  ✓ Cleared for Disbursement
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View for Client */}
            <div className="mobile-card-list">
              {opps.map((o) => {
                const isDisputed = o.status === 'disputed' || o.status === 'rejected';
                const isApproved = ['approved', 'invoiced', 'paid'].includes(o.status);
                const crNum = o.changeRequest?.number || o.changeOrder?.number || 'Vendor Claim';

                return (
                  <div key={o.id} className="card" style={{ marginBottom: 10, borderLeft: isDisputed ? '4px solid #DC2626' : '4px solid #2563EB' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--navy)' }}>{o.title}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--steel)', marginTop: 2, fontFamily: "'IBM Plex Mono', monospace" }}>
                          Ref: <strong>{crNum}</strong> · Amount: <strong style={{ color: isDisputed ? '#DC2626' : 'var(--navy)' }}>{fmt(o.billable)}</strong>
                        </div>
                      </div>
                      <div>
                        {isDisputed ? (
                          <span className="stamp" style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }}>
                            Disputed
                          </span>
                        ) : isApproved ? (
                          <span className="stamp paid">Authorized</span>
                        ) : (
                          <span className="stamp unbilled">Flagged</span>
                        )}
                      </div>
                    </div>

                    <div style={{ margin: '8px 0', fontSize: 11.5, color: '#475569', background: '#F8FAFC', padding: '6px 10px', borderRadius: 3 }}>
                      <strong>SOW Proof:</strong> {o.clause || 'Baseline SOW Scope & Warranty'}
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      {!isDisputed && !isApproved ? (
                        <button
                          type="button"
                          className="btn small"
                          style={{ flex: 1, background: '#DC2626', borderColor: '#DC2626', fontSize: 12 }}
                          onClick={() => handleOpenDispute(o)}
                        >
                          🛡️ Dispute with SOW Proof
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn ghost small"
                          style={{ flex: 1, fontSize: 12 }}
                          onClick={() => handleOpenDispute(o)}
                        >
                          📜 View Dispute Proof
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ======================= AGENCY: APPROVED VS INVOICED ======================= */}
        {!isClient && (
          <section className="block">
            <div className="block-head">
              <h3>Approved vs. Invoiced — by opportunity</h3>
            </div>

            {/* Desktop Table View */}
            <div className="card desktop-table-view" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ minWidth: 640 }}>
                <thead>
                  <tr>
                    <th>Opportunity</th>
                    <th>Change Request</th>
                    <th className="num-cell">Approved</th>
                    <th className="num-cell">Invoiced</th>
                    <th className="num-cell">Gap</th>
                    <th>Flag</th>
                    <th style={{ textAlign: 'right', paddingRight: 16 }}>Reconciliation Action</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedOpps.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ color: 'var(--steel)' }}>
                        No approved opportunities yet.
                      </td>
                    </tr>
                  ) : (
                    approvedOpps.map((o) => {
                      const invoicedVal = o.invoiced || 0;
                      const gap = o.billable - invoicedVal;
                      const crNum = o.changeRequest?.number || o.changeOrder?.number || '—';
                      return (
                        <tr key={o.id}>
                          <td style={{ maxWidth: 280 }}>
                            <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{o.title}</div>
                          </td>
                          <td className="mono" style={{ fontSize: 12 }}>
                            {crNum}
                          </td>
                          <td className="num-cell mono">{fmt(o.billable)}</td>
                          <td className="num-cell mono">{fmt(invoicedVal)}</td>
                          <td
                            className="num-cell mono"
                            style={{
                              color: gap > 0 ? 'var(--orange)' : 'var(--green)',
                              fontWeight: 600,
                            }}
                          >
                            {fmt(gap)}
                          </td>
                          <td>
                            {gap <= 0 ? (
                              <span className="stamp paid">Clear</span>
                            ) : invoicedVal > 0 ? (
                              <span className="stamp partial" style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                                Partial ({fmt(invoicedVal)})
                              </span>
                            ) : (
                              <span className="stamp unbilled">Unbilled</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', paddingRight: 16 }}>
                            {gap > 0 ? (
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  className="btn small"
                                  disabled={busy}
                                  onClick={() => handleClearFull(o)}
                                  style={{ background: 'var(--green)', borderColor: 'var(--green)', padding: '4px 10px', fontSize: 11.5 }}
                                  title="Mark full remaining gap as paid & cleared"
                                >
                                  ✓ Clear (Full)
                                </button>
                                <button
                                  type="button"
                                  className="btn ghost small"
                                  disabled={busy}
                                  onClick={() => {
                                    setPartialOpp(o);
                                    setPartialAmount(gap.toString());
                                    setPartialDate(new Date().toISOString().split('T')[0]);
                                  }}
                                  style={{ padding: '4px 8px', fontSize: 11.5 }}
                                  title="Record partial payment amount"
                                >
                                  ⚡ Partially Clear
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
                                ✓ Paid in Full
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (< 768px) */}
            <div className="mobile-card-list">
              {approvedOpps.length === 0 ? (
                <div className="card empty">No approved opportunities yet.</div>
              ) : (
                approvedOpps.map((o) => {
                  const invoicedVal = o.invoiced || 0;
                  const gap = o.billable - invoicedVal;
                  const crNum = o.changeRequest?.number || o.changeOrder?.number || '—';
                  return (
                    <div key={o.id} className="card opp-mobile-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--navy)' }}>{o.title}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--steel)', marginTop: 2, fontFamily: "'IBM Plex Mono', monospace" }}>
                            Change Request: <strong>{crNum}</strong>
                          </div>
                        </div>
                        <div>
                          {gap <= 0 ? (
                            <span className="stamp paid">Clear</span>
                          ) : invoicedVal > 0 ? (
                            <span className="stamp partial" style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                              Partial ({fmt(invoicedVal)})
                            </span>
                          ) : (
                            <span className="stamp unbilled">Unbilled</span>
                          )}
                        </div>
                      </div>

                      <div className="grid cols-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px 12px', borderRadius: 4, margin: '10px 0', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 9.5, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Approved</div>
                          <div className="mono" style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy)', marginTop: 2 }}>{fmt(o.billable)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 9.5, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Invoiced</div>
                          <div className="mono" style={{ fontWeight: 600, fontSize: 13, color: '#1D6E96', marginTop: 2 }}>{fmt(invoicedVal)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 9.5, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Remaining Gap</div>
                          <div className="mono" style={{ fontWeight: 700, fontSize: 13, color: gap > 0 ? 'var(--orange)' : 'var(--green)', marginTop: 2 }}>{fmt(gap)}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        {gap > 0 ? (
                          <>
                            <button
                              type="button"
                              className="btn small"
                              style={{ flex: 1, justifyContent: 'center', background: 'var(--green)', borderColor: 'var(--green)', fontSize: 12, padding: '8px' }}
                              disabled={busy}
                              onClick={() => handleClearFull(o)}
                            >
                              ✓ Clear Full ({fmt(gap)})
                            </button>
                            <button
                              type="button"
                              className="btn ghost small"
                              style={{ flex: 1, justifyContent: 'center', fontSize: 12, padding: '8px' }}
                              disabled={busy}
                              onClick={() => {
                                setPartialOpp(o);
                                setPartialAmount(gap.toString());
                                setPartialDate(new Date().toISOString().split('T')[0]);
                              }}
                            >
                              ⚡ Partial Amount
                            </button>
                          </>
                        ) : (
                          <div style={{ width: '100%', textAlign: 'center', color: 'var(--green)', fontWeight: 600, fontSize: 12.5, padding: '6px' }}>
                            ✓ Reconciled &amp; Paid in Full
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

        {/* ======================= INVOICES & MILESTONE DISBURSEMENTS ======================= */}
        <section className="block">
          <div className="block-head">
            <div>
              <h3>{isClient ? "Incoming Vendor Invoices & Milestone Disbursements" : "Invoices & Reconciled Receipts on File"}</h3>
              <div style={{ fontSize: 12, color: 'var(--steel)', marginTop: 2 }}>
                {isClient
                  ? "Formal invoices submitted by the vendor. Audit against deliverable sign-offs before disbursing."
                  : "Track invoices sent to the client and payments collected."}
              </div>
            </div>
            <button
              className={isClient ? "btn small" : "btn ghost small"}
              style={isClient ? { background: '#2563EB', borderColor: '#2563EB' } : {}}
              onClick={() => setShowAdd((s) => !s)}
            >
              {showAdd ? 'Cancel' : isClient ? '+ Log Vendor Invoice for Audit' : '+ Add Custom Invoice'}
            </button>
          </div>

          {showAdd && (
            <div className="card" style={{ marginBottom: 14, border: isClient ? '1.5px solid #93C5FD' : '1px solid var(--border)' }}>
              <form onSubmit={addInvoice}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <div className="field">
                    <label className="field-label">{isClient ? "Vendor Invoice # / Ref *" : "Invoice / Milestone *"}</label>
                    <input
                      type="text"
                      placeholder={isClient ? "e.g. INV-2024-002" : "e.g. Milestone 4"}
                      value={form.number}
                      onChange={(e) => setForm((p) => ({ ...p, number: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">{isClient ? "Date Received *" : "Invoice Date *"}</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">{isClient ? "Linked SOW Milestone / Deliverable" : "Linked Change Request"}</label>
                    <input
                      type="text"
                      placeholder={isClient ? "e.g. Milestone 2 — Frontend Integration" : "e.g. CR-011"}
                      value={form.related}
                      onChange={(e) => setForm((p) => ({ ...p, related: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <div className="field">
                    <label className="field-label">{isClient ? "Invoice Billed Amount ($) *" : "Amount ($) *"}</label>
                    <input
                      type="number"
                      placeholder="46250"
                      value={form.amount}
                      onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">{isClient ? "Approved Disbursement ($)" : "Collected ($)"}</label>
                    <input
                      type="number"
                      placeholder={isClient ? "0 (or approved milestone amount)" : "46250"}
                      value={form.collected}
                      onChange={(e) => setForm((p) => ({ ...p, collected: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button type="submit" className={isClient ? "btn small" : "btn orange small"} style={isClient ? { background: '#2563EB', borderColor: '#2563EB' } : {}} disabled={busy}>
                    {busy ? 'Saving…' : isClient ? 'Log & Queue for Audit' : 'Add Record'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th>{isClient ? "Vendor Invoice Ref" : "Receipt / Invoice"}</th>
                  <th>Date</th>
                  <th>{isClient ? "Linked SOW Milestone" : "Linked Change Request"}</th>
                  <th className="num-cell">{isClient ? "Claimed Amount" : "Amount"}</th>
                  <th className="num-cell">{isClient ? "Disbursed" : "Collected"}</th>
                  {isClient && <th style={{ textAlign: 'right', paddingRight: 16 }}>Disbursement Action</th>}
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={isClient ? 6 : 5} style={{ color: 'var(--steel)', padding: 18, textAlign: 'center' }}>
                      {isClient ? "No vendor invoices logged yet. Click '+ Log Vendor Invoice for Audit' to record incoming vendor bills." : "No invoices recorded."}
                    </td>
                  </tr>
                ) : (
                  invoices.map((i) => {
                    const isFullyDisbursed = (i.collected || 0) >= (i.amount || 0);
                    const isPartiallyDisbursed = (i.collected || 0) > 0 && (i.collected || 0) < (i.amount || 0);

                    return (
                      <tr key={i.id}>
                        <td style={{ fontWeight: 600 }}>{i.number}</td>
                        <td className="mono" style={{ fontSize: 12 }}>
                          {i.date}
                        </td>
                        <td className="mono" style={{ fontSize: 12 }}>
                          {i.related || '—'}
                        </td>
                        <td className="num-cell mono">{fmt(i.amount)}</td>
                        <td
                          className="num-cell mono"
                          style={{
                            color: i.collected > 0 ? 'var(--green)' : 'var(--steel)',
                            fontWeight: 600,
                          }}
                        >
                          {i.collected > 0 ? fmt(i.collected) : isClient ? 'On Hold / Pending' : 'Outstanding'}
                        </td>
                        {isClient && (
                          <td style={{ textAlign: 'right', paddingRight: 16 }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                              {!isFullyDisbursed && (
                                <button
                                  type="button"
                                  className="btn small"
                                  style={{ background: 'var(--green)', borderColor: 'var(--green)', padding: '3px 8px', fontSize: 11 }}
                                  onClick={() => handleDisburseInvoice(i, true)}
                                  title="Release full milestone payment to vendor"
                                >
                                  ✓ Release Payment
                                </button>
                              )}
                              {isFullyDisbursed && (
                                <span style={{ fontSize: 11.5, color: 'var(--green)', fontWeight: 600 }}>
                                  ✓ Disbursed
                                </span>
                              )}
                              <button
                                type="button"
                                className="btn ghost small"
                                style={{ padding: '3px 6px', fontSize: 11, color: '#94A3B8' }}
                                onClick={() => handleDeleteInvoice(i)}
                                title="Remove invoice"
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ======================= CLIENT SHIELD: DISPUTE & SOW PROOF MODAL ======================= */}
      {disputeOpp && (
        <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) setDisputeOpp(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-head" style={{ borderBottom: '2px solid #EF4444' }}>
              <div>
                <div style={{ fontSize: 10.5, letterSpacing: '0.08em', color: '#DC2626', textTransform: 'uppercase', fontWeight: 700 }}>
                  🛡️ Contractual Payment Defense Notice
                </div>
                <h3 style={{ color: '#991B1B', marginTop: 2 }}>
                  Dispute Surcharge for {disputeOpp.title}
                </h3>
              </div>
              <button onClick={() => setDisputeOpp(null)} aria-label="Close">&times;</button>
            </div>

            <div className="modal-body" style={{ maxHeight: '68vh', overflowY: 'auto' }}>
              {loadingDispute ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--steel)' }}>
                  Extracting contract terms &amp; drafting dispute memo…
                </div>
              ) : (
                <>
                  {/* Summary Banner */}
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', padding: '12px 14px', borderRadius: 4, marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#991B1B' }}>DISPUTED CLAIM AMOUNT:</span>
                      <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: '#DC2626' }}>{fmt(disputeOpp.billable)}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: '#7F1D1D', marginTop: 4 }}>
                      <strong>Contractual Grounds:</strong> {disputeLetter?.sowReference || disputeOpp.clause || 'SOW Section 1.2 Baseline Deliverables & Section 5.0 Warranty'}
                    </div>
                  </div>

                  {/* Pre-drafted Dispute Letter */}
                  <div className="field">
                    <label className="field-label">Official Dispute Memo (Pre-formatted for Vendor PM)</label>
                    <textarea
                      rows={10}
                      readOnly
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 12,
                        lineHeight: 1.5,
                        background: '#F8FAFC',
                        color: '#0F172A',
                        padding: '12px',
                        border: '1.5px solid #CBD5E1',
                        borderRadius: 4,
                      }}
                      value={disputeLetter?.body || ''}
                    />
                  </div>

                  {/* Evidence & Citations */}
                  {disputeOpp.evidence && disputeOpp.evidence.length > 0 && (
                    <div style={{ marginTop: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px 12px', borderRadius: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', marginBottom: 6 }}>
                        📁 Cited Evidence on Record
                      </div>
                      {disputeOpp.evidence.map((ev, idx) => (
                        <div key={idx} style={{ fontSize: 11.5, color: '#475569', marginBottom: 4 }}>
                          • <strong>[{ev.src || 'Meeting Notes'}]:</strong> &ldquo;{ev.text}&rdquo;
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-foot" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="btn ghost small"
                onClick={() => {
                  if (disputeLetter?.body) {
                    navigator.clipboard.writeText(disputeLetter.body);
                    showToast('Dispute notice copied to clipboard!');
                  }
                }}
              >
                📋 Copy Letter to Clipboard
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn ghost" onClick={() => setDisputeOpp(null)}>
                  Close
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ background: '#DC2626', borderColor: '#DC2626' }}
                  disabled={busy}
                  onClick={handleConfirmDispute}
                >
                  {busy ? 'Saving…' : '🛡️ Confirm Dispute & Withhold Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= AGENCY: PARTIAL CLEAR MODAL ======================= */}
      {partialOpp && (
        <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) setPartialOpp(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-head">
              <div>
                <div style={{ fontSize: 10.5, letterSpacing: '0.08em', color: 'var(--orange)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Partial Payment Reconciliation
                </div>
                <h3>Record Payment for {partialOpp.changeRequest?.number || 'Change Request'}</h3>
              </div>
              <button onClick={() => setPartialOpp(null)} aria-label="Close">&times;</button>
            </div>

            <form onSubmit={handleConfirmPartial}>
              <div className="modal-body">
                <div style={{ background: '#F8FAFC', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: 4, marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>{partialOpp.title}</div>
                  <div className="grid cols-3" style={{ marginTop: 8, fontSize: 11.5 }}>
                    <div>
                      <span style={{ color: 'var(--steel)' }}>Total Approved:</span>
                      <div className="mono" style={{ fontWeight: 600 }}>{fmt(partialOpp.billable)}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--steel)' }}>Already Paid:</span>
                      <div className="mono" style={{ fontWeight: 600, color: 'var(--green)' }}>{fmt(partialOpp.invoiced || 0)}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--steel)' }}>Remaining Gap:</span>
                      <div className="mono" style={{ fontWeight: 600, color: 'var(--orange)' }}>
                        {fmt((partialOpp.billable || 0) - (partialOpp.invoiced || 0))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="field">
                  <label className="field-label">Amount Received ($) *</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="field">
                  <label className="field-label">Payment / Invoice Date *</label>
                  <input
                    type="date"
                    value={partialDate}
                    onChange={(e) => setPartialDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-foot">
                <button type="button" className="btn ghost" onClick={() => setPartialOpp(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn orange" disabled={busy}>
                  {busy ? 'Recording…' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

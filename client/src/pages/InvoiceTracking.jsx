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
  const [opps, setOpps] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [partialOpp, setPartialOpp] = useState(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [partialDate, setPartialDate] = useState(new Date().toISOString().split('T')[0]);
  const [form, setForm] = useState({ number: '', date: '', amount: '', collected: '', related: '' });
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
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

  const approvedOpps = opps.filter((o) =>
    ['approved', 'invoiced', 'paid', 'change-order'].includes(o.status)
  );
  const totalApproved = approvedOpps.reduce((s, o) => s + (o.billable || 0), 0);
  const totalInvoiced = approvedOpps.reduce((s, o) => s + (o.invoiced || 0), 0);
  const totalUnbilled = Math.max(0, totalApproved - totalInvoiced);

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

  async function addInvoice(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const inv = await api.addInvoice(activeProject.id, {
        number: form.number,
        date: form.date,
        amount: parseFloat(form.amount) || 0,
        collected: parseFloat(form.collected) || 0,
        relatedChangeOrder: form.related || '—',
      });
      setInvoices((prev) => [inv, ...prev]);
      setForm({ number: '', date: '', amount: '', collected: '', related: '' });
      setShowAdd(false);
      showToast('Invoice / milestone logged.');
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
        title="Invoice Tracking"
        sub="Approved value reconciled against what's actually been billed"
        project={activeProject}
      />
      {toast && <div className="toast">{toast}</div>}
      <div className="content">
        {/* KPI Strip */}
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

        {/* Approved vs Invoiced Table & Mobile Card View */}
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

        {/* Invoices on file */}
        <section className="block">
          <div className="block-head">
            <h3>Invoices &amp; Reconciled Receipts on File</h3>
            <button
              className="btn ghost small"
              onClick={() => setShowAdd((s) => !s)}
            >
              {showAdd ? 'Cancel' : '+ Add Custom Invoice'}
            </button>
          </div>

          {showAdd && (
            <div className="card" style={{ marginBottom: 14 }}>
              <form onSubmit={addInvoice}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div className="field">
                    <label className="field-label">Invoice / Milestone *</label>
                    <input
                      type="text"
                      placeholder="e.g. Milestone 4"
                      value={form.number}
                      onChange={(e) => setForm((p) => ({ ...p, number: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Date *</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Linked Change Request</label>
                    <input
                      type="text"
                      placeholder="e.g. CR-011"
                      value={form.related}
                      onChange={(e) => setForm((p) => ({ ...p, related: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="field">
                    <label className="field-label">Amount ($) *</label>
                    <input
                      type="number"
                      placeholder="46250"
                      value={form.amount}
                      onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Collected ($)</label>
                    <input
                      type="number"
                      placeholder="46250"
                      value={form.collected}
                      onChange={(e) => setForm((p) => ({ ...p, collected: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button type="submit" className="btn orange small" disabled={busy}>
                    {busy ? 'Saving…' : 'Add Record'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>Receipt / Invoice</th>
                  <th>Date</th>
                  <th>Linked Change Request</th>
                  <th className="num-cell">Amount</th>
                  <th className="num-cell">Collected</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ color: 'var(--steel)' }}>
                      No invoices recorded.
                    </td>
                  </tr>
                ) : (
                  invoices.map((i) => (
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
                        style={{ color: i.collected > 0 ? 'var(--green)' : 'var(--steel)', fontWeight: 600 }}
                      >
                        {i.collected > 0 ? fmt(i.collected) : 'Outstanding'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* PARTIAL CLEAR MODAL */}
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

import { useEffect, useState } from 'react';
import { api } from '../api.js';
import TitleBlock from '../components/TitleBlock.jsx';
import SowDriftCard from '../components/SowDriftCard.jsx';

const fmt = (n, currency = 'USD') =>
  !n && n !== 0 ? '—' :
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
const fmtK = (n) =>
  !n ? '$0' : Math.abs(n) >= 1000 ? `$${Math.round(n / 1000)}K` : fmt(n);

const STATUS_COLORS = {
  detected: 'var(--steel)',
  review: 'var(--steel)',
  confirmed: 'var(--navy)',
  'change-order': '#7A4FB5',
  approved: 'var(--amber)',
  invoiced: '#1D6E96',
  paid: 'var(--green)',
};

export default function Dashboard({ setPage, setActiveProjectId, activeProjectId, perspective = 'vendor', onTogglePerspective }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState(activeProjectId || null);
  const isClient = perspective === 'client';

  useEffect(() => {
    api.dashboard().then((res) => {
      setData(res);
      if (!selectedProjectId && res?.projects?.length > 0) {
        setSelectedProjectId(activeProjectId || res.projects[0].id);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [activeProjectId]);

  if (loading) return <div className="spinner" />;
  if (!data) return <div className="content"><div className="empty">Failed to load dashboard.</div></div>;

  const {
    potential = 0,
    underReview = 0,
    confirmed = 0,
    changeOrder = 0,
    approved = 0,
    invoiced = 0,
    paid = 0,
    atRisk = 0,
    projects = [],
    rejectedOpportunities = [],
  } = data;

  const funnel = [
    { key: 'detected', label: isClient ? 'Claim Under Audit' : 'Detected / Review', val: underReview },
    { key: 'confirmed', label: isClient ? 'Challenged (In-Scope)' : 'Confirmed', val: confirmed },
    { key: 'change-order', label: isClient ? 'Variation Under Review' : 'Change Request', val: changeOrder },
    { key: 'approved', label: isClient ? 'Authorized Addition' : 'Approved', val: approved },
    { key: 'invoiced', label: isClient ? 'Vendor Invoiced' : 'Invoiced', val: invoiced },
    { key: 'paid', label: isClient ? 'Disbursed' : 'Paid', val: paid },
  ];
  const funnelTotal = funnel.reduce((s, f) => s + f.val, 0) || 1;

  return (
    <>
      <TitleBlock
        title={isClient ? 'Scope Defense & Overbilling Dashboard' : 'Revenue Dashboard'}
        sub={isClient ? 'Vendor claim audits, double-billing prevention & contract budget defense' : 'Portfolio-wide leakage, recovery and collection status'}
      />
      <div className="content">
        {/* KPI strip */}
        <div className="grid cols-4 mb-20" style={{ marginBottom: 30 }}>
          <div className="kpi" style={{ '--kpi-accent': isClient ? '#3B82F6' : 'var(--steel)' }}>
            <div className="label">{isClient ? 'Total Claims Audited' : 'Total Potential Revenue'}</div>
            <div className="value">{fmtK(potential)}</div>
            <div className="delta up">
              {data.opportunityCount || 0} {isClient ? 'claims across' : 'opportunities across'} {projects.length} project{projects.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="kpi" style={{ '--kpi-accent': 'var(--amber)' }}>
            <div className="label">{isClient ? 'Pending Scope Review' : 'Revenue Under Review'}</div>
            <div className="value">{fmtK(underReview)}</div>
            <div className="delta">{isClient ? 'Vendor variation notices awaiting decision' : 'Awaiting PM decision'}</div>
          </div>
          <div className="kpi" style={{ '--kpi-accent': isClient ? '#10B981' : 'var(--orange)' }}>
            <div className="label">{isClient ? 'Overbilling Defended & Saved' : 'Revenue At Risk (Unbilled)'}</div>
            <div className="value">{fmtK(isClient ? confirmed + paid : atRisk)}</div>
            <div className="delta up">{isClient ? 'Flagged as already in SOW scope' : 'Approved but not yet invoiced'}</div>
          </div>
          <div className="kpi" style={{ '--kpi-accent': 'var(--green)' }}>
            <div className="label">{isClient ? 'Authorized Variations' : 'Collected To Date'}</div>
            <div className="value">{fmtK(isClient ? approved : paid)}</div>
            <div className="delta up">{isClient ? 'Verified out-of-scope additions' : 'From recovered opportunities'}</div>
          </div>
        </div>

        {/* SOW Drift & Burn Rate Monitor */}
        {projects.length > 0 && (
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>
              Target Project Scope Analysis:
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {projects.map((p) => (
                <button
                  key={p.id}
                  className={`btn small ${selectedProjectId === p.id ? 'orange' : 'ghost'}`}
                  onClick={() => {
                    setSelectedProjectId(p.id);
                    setActiveProjectId?.(p.id);
                  }}
                  style={{ fontSize: 12, padding: '4px 10px' }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedProjectId && (
          <SowDriftCard
            projectId={selectedProjectId}
            setPage={setPage}
            perspective={perspective}
          />
        )}

        {/* Recovery Funnel */}
        <section className="block">
          <div className="block-head">
            <h3>Recovery Funnel</h3>
            <div className="hint">
              detected → review → confirmed → change request → approved → invoiced → paid
            </div>
          </div>
          <div className="card">
            <div className="progress-track" style={{ height: 14, marginBottom: 14 }}>
              {funnel.map((f) => (
                <div
                  key={f.key}
                  className={`seg ${f.key}`}
                  style={{
                    width: `${(f.val / funnelTotal) * 100}%`,
                    background: STATUS_COLORS[f.key],
                  }}
                  title={`${f.label}: ${fmt(f.val)}`}
                />
              ))}
            </div>
            <div className="grid cols-4" style={{ gap: 10 }}>
              {funnel.map((f) => (
                <div key={f.key} style={{ fontSize: 12 }}>
                  <span
                    className="badge-dot"
                    style={{ background: STATUS_COLORS[f.key] }}
                  />
                  {f.label}
                  <div
                    className="mono"
                    style={{ fontWeight: 600, color: 'var(--navy)', marginTop: 2 }}
                  >
                    {fmt(f.val)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* By Project */}
        <section className="block">
          <div className="block-head">
            <h3>By Project — drill in for evidence</h3>
          </div>
          {projects.length === 0 ? (
            <div className="empty">
              <h4>No projects in workspace</h4>
              Create your first project to begin tracking revenue recovery.
            </div>
          ) : (
            <div className="grid cols-3">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="project-card"
                  onClick={() => {
                    setActiveProjectId(p.id);
                    setPage('opportunities');
                  }}
                  id={`dash-proj-${p.id}`}
                >
                  {p.atRisk > 0 && <div className="flag">{fmtK(p.atRisk)} AT RISK</div>}
                  <div className="pc-top">
                    <div>
                      <h4>{p.name}</h4>
                      <div className="client">{p.client}</div>
                    </div>
                  </div>
                  <div className="row">
                    <span>Potential Revenue Found</span>
                    <span className="v">{fmt(p.oppTotal, p.currency)}</span>
                  </div>
                  <div className="row">
                    <span>Open Opportunities</span>
                    <span className="v">{p.openCount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Rejected audit trail */}
        <section className="block">
          <div className="block-head">
            <h3>Rejected / Dismissed (audit trail)</h3>
          </div>
          <div className="card" style={{ padding: 0 }}>
            {rejectedOpportunities.length === 0 ? (
              <div style={{ padding: '20px', color: 'var(--steel)', fontSize: 13, textAlign: 'center' }}>
                No rejected or dismissed opportunities on file.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Opportunity</th>
                    <th>Type</th>
                    <th className="num-cell">Billable Value</th>
                    <th>Reason on file</th>
                  </tr>
                </thead>
                <tbody>
                  {rejectedOpportunities.map((opp) => (
                    <tr key={opp.id}>
                      <td>{opp.title}</td>
                      <td><span className="tag-type">{opp.type}</span></td>
                      <td className="num-cell mono">{fmt(opp.billable)}</td>
                      <td style={{ color: 'var(--steel)', fontSize: 12 }}>
                        {opp.rejectionReason || 'Determined vendor-side error, not billable'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

import { useEffect, useState } from 'react';
import { api } from '../api.js';

const fmt = (n) =>
  !n && n !== 0 ? '—' :
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const RISK_CONFIG = {
  low: {
    label: 'Low Scope Drift',
    bg: '#DEF7EC',
    text: '#03543F',
    border: '#BCF0DA',
    dot: '#31C48D',
    icon: '🟢'
  },
  moderate: {
    label: 'Moderate Scope Drift',
    bg: '#FEF08A',
    text: '#713F12',
    border: '#FDE047',
    dot: '#EAB308',
    icon: '🟡'
  },
  critical: {
    label: 'Critical SOW Drift',
    bg: '#FDE8E8',
    text: '#9B1C1C',
    border: '#F8B4B4',
    dot: '#F05252',
    icon: '🔴'
  }
};

export default function SowDriftCard({ projectId, setPage, perspective = 'vendor' }) {
  const [driftData, setDriftData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isClient = perspective === 'client';

  const loadDrift = async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.sowDrift(id);
      setDriftData(res);
    } catch (err) {
      console.error('Failed to load SOW drift analytics:', err);
      setError(err.message || 'Failed to load SOW drift analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadDrift(projectId);
    }
  }, [projectId]);

  if (!projectId) return null;

  if (loading && !driftData) {
    return (
      <div className="card" style={{ padding: '24px', marginBottom: '24px', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--steel)' }}>
          <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
          <span>Analyzing real-time SOW drift & milestone burn rate...</span>
        </div>
      </div>
    );
  }

  if (error && !driftData) {
    return null; // Silent fallback if project doesn't have data
  }

  if (!driftData) return null;

  const risk = RISK_CONFIG[driftData.driftRiskLevel] || RISK_CONFIG.low;
  const baseline = driftData.baselineScopeValue || 1;
  const projected = driftData.projectedFinalValue || baseline;
  
  // Percentages for multi-segment scope expansion bar
  const baselinePct = Math.min(100, Math.round((baseline / projected) * 100));
  const approvedCoPct = Math.min(100 - baselinePct, Math.round((driftData.approvedChangeOrdersValue / projected) * 100));
  const unapprovedExp = Math.max(0, driftData.detectedScopeExpansion - driftData.approvedChangeOrdersValue);
  const unapprovedPct = Math.max(0, 100 - baselinePct - approvedCoPct);

  return (
    <div
      className="card sow-drift-card"
      id="sow-drift-monitor-card"
      style={{
        padding: '24px',
        marginBottom: '28px',
        border: `1px solid ${driftData.driftRiskLevel === 'critical' ? '#FCA5A5' : '#E2E8F0'}`,
        borderRadius: '12px',
        background: driftData.driftRiskLevel === 'critical' ? '#FFFDFD' : '#FFFFFF',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>📈</span>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--navy)' }}>
              {isClient ? 'SOW Contract Drift & Budget Defense Monitor' : 'Real-Time SOW Drift & Milestone Burn Monitor'}
            </h3>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--steel)', marginTop: '4px' }}>
            Project: <strong style={{ color: 'var(--navy)' }}>{driftData.projectName}</strong> ({driftData.clientName})
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            id="sow-drift-risk-badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              background: risk.bg,
              color: risk.text,
              border: `1px solid ${risk.border}`,
              letterSpacing: '0.02em',
              textTransform: 'uppercase'
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: risk.dot }} />
            {risk.label} ({driftData.scopeDriftPct > 0 ? `+${driftData.scopeDriftPct}%` : '0%'})
          </div>

          <button
            className="btn ghost small"
            onClick={() => loadDrift(projectId)}
            title="Refresh drift analytics"
            style={{ padding: '4px 8px', fontSize: '12px' }}
          >
            🔄 Sync
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid cols-4" style={{ gap: '14px', marginBottom: '22px' }}>
        <div style={{ background: '#F8FAFC', padding: '14px 16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--steel)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Baseline Scope
          </div>
          <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--navy)', marginTop: '4px' }}>
            {fmt(driftData.baselineScopeValue)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--steel)', marginTop: '2px' }}>
            Original contractual value
          </div>
        </div>

        <div style={{ background: '#F8FAFC', padding: '14px 16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--steel)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {isClient ? 'Vendor Scope Expansion' : 'Scope Drift Expansion'}
          </div>
          <div
            className="mono"
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: driftData.detectedScopeExpansion > 0 ? (isClient ? '#DC2626' : 'var(--orange)') : 'var(--navy)',
              marginTop: '4px'
            }}
          >
            {driftData.detectedScopeExpansion > 0 ? `+${fmt(driftData.detectedScopeExpansion)}` : '$0'}
          </div>
          <div style={{ fontSize: '12px', color: driftData.scopeDriftPct >= 10 ? '#DC2626' : 'var(--steel)', marginTop: '2px' }}>
            <strong>{driftData.scopeDriftPct > 0 ? `+${driftData.scopeDriftPct}%` : '0%'}</strong> drift vs baseline
          </div>
        </div>

        <div style={{ background: '#F8FAFC', padding: '14px 16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--steel)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Invoiced Burn Rate
          </div>
          <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--navy)', marginTop: '4px' }}>
            {fmt(driftData.invoicedToDate)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--steel)', marginTop: '2px' }}>
            <strong>{driftData.budgetBurnPct}%</strong> billed · {fmt(driftData.collectedToDate)} collected
          </div>
        </div>

        <div style={{ background: '#F8FAFC', padding: '14px 16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--steel)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Projected Final Value
          </div>
          <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: '#1E40AF', marginTop: '4px' }}>
            {fmt(driftData.projectedFinalValue)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--steel)', marginTop: '2px' }}>
            {fmt(driftData.approvedChangeOrdersValue)} formally approved
          </div>
        </div>
      </div>

      {/* Comparative Progress Gauges */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '22px' }}>
        {/* Scope Drift Multi-Segment Gauge */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
            <span style={{ fontWeight: 600, color: 'var(--navy)' }}>Scope Composition & Drift Breakdown</span>
            <span className="mono" style={{ color: 'var(--steel)', fontSize: '12px' }}>
              Projected: {fmt(projected)}
            </span>
          </div>
          <div style={{ height: '14px', width: '100%', background: '#E2E8F0', borderRadius: '7px', overflow: 'hidden', display: 'flex' }}>
            <div
              style={{ width: `${baselinePct}%`, background: '#2563EB', transition: 'width 0.4s' }}
              title={`Baseline Scope: ${fmt(baseline)} (${baselinePct}%)`}
            />
            <div
              style={{ width: `${approvedCoPct}%`, background: '#10B981', transition: 'width 0.4s' }}
              title={`Approved Change Orders: ${fmt(driftData.approvedChangeOrdersValue)}`}
            />
            <div
              style={{ width: `${unapprovedPct}%`, background: '#F59E0B', transition: 'width 0.4s' }}
              title={`Unapproved Expansion: ${fmt(unapprovedExp)}`}
            />
          </div>
          <div style={{ display: 'flex', gap: '14px', marginTop: '10px', fontSize: '11px', color: 'var(--steel)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '2px', background: '#2563EB' }} />
              Baseline ({fmt(baseline)})
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '2px', background: '#10B981' }} />
              Approved COs ({fmt(driftData.approvedChangeOrdersValue)})
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '2px', background: '#F59E0B' }} />
              Unsigned Drift ({fmt(unapprovedExp)})
            </div>
          </div>
        </div>

        {/* Budget Burn vs Timeline Elapsed Velocity Gauge */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
            <span style={{ fontWeight: 600, color: 'var(--navy)' }}>Budget Burn vs. Timeline Velocity</span>
            <span className="mono" style={{ color: driftData.budgetBurnPct > driftData.timelineElapsedPct + 15 ? '#DC2626' : 'var(--steel)', fontSize: '12px', fontWeight: 600 }}>
              {driftData.budgetBurnPct}% Burn / {driftData.timelineElapsedPct}% Schedule
            </span>
          </div>
          {/* Dual Bar */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--steel)', marginBottom: '2px' }}>
              <span>Invoiced Budget Burn</span>
              <span className="mono">{driftData.budgetBurnPct}%</span>
            </div>
            <div style={{ height: '8px', width: '100%', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, driftData.budgetBurnPct)}%`,
                  background: driftData.budgetBurnPct > driftData.timelineElapsedPct + 15 ? '#EF4444' : '#6366F1',
                  height: '100%',
                  transition: 'width 0.4s'
                }}
              />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--steel)', marginBottom: '2px' }}>
              <span>Timeline Schedule Elapsed</span>
              <span className="mono">{driftData.timelineElapsedPct}%</span>
            </div>
            <div style={{ height: '8px', width: '100%', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, driftData.timelineElapsedPct)}%`,
                  background: '#64748B',
                  height: '100%',
                  transition: 'width 0.4s'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Alerts & Actionable Notifications Section */}
      {driftData.alerts && driftData.alerts.length > 0 ? (
        <div style={{ marginTop: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚡</span>
            <span>Active Drift & Milestone Alerts ({driftData.alerts.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {driftData.alerts.map((alert, idx) => {
              const isCrit = alert.severity === 'critical';
              const isWarn = alert.severity === 'warning';
              const alertBg = isCrit ? '#FEF2F2' : isWarn ? '#FFFBEB' : '#F0F9FF';
              const alertBorder = isCrit ? '#FECACA' : isWarn ? '#FDE68A' : '#BAE6FD';
              const alertColor = isCrit ? '#991B1B' : isWarn ? '#92400E' : '#075985';

              return (
                <div
                  key={idx}
                  className="drift-alert-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    background: alertBg,
                    border: `1px solid ${alertBorder}`,
                    color: alertColor
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
                    <span style={{ fontSize: '16px' }}>{isCrit ? '🚨' : isWarn ? '⚠️' : 'ℹ️'}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>{alert.title}</div>
                      <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>{alert.message}</div>
                    </div>
                  </div>

                  {alert.actionPage && setPage && (
                    <button
                      className="btn small"
                      onClick={() => setPage(alert.actionPage)}
                      style={{
                        padding: '5px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: '#FFFFFF',
                        border: `1px solid ${alertBorder}`,
                        color: alertColor,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}
                    >
                      {alert.recommendedAction || `Go to ${alert.actionPage} →`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ padding: '12px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', color: '#166534', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>✨</span>
          <span><strong>Scope & Burn Stability:</strong> Contract milestones, change orders, and burn velocity are within normal operating bounds.</span>
        </div>
      )}
    </div>
  );
}

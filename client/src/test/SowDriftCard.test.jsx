import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SowDriftCard from '../components/SowDriftCard.jsx';
import { api } from '../api.js';

vi.mock('../api.js', () => ({
  api: {
    sowDrift: vi.fn(),
  },
}));

describe('SowDriftCard Component', () => {
  const mockDriftData = {
    projectId: 'proj-1',
    projectName: 'Fintech Cloud Replatforming',
    clientName: 'Apex Banking Corp',
    baselineScopeValue: 125000,
    invoicedToDate: 60000,
    collectedToDate: 50000,
    detectedScopeExpansion: 25000,
    approvedChangeOrdersValue: 15000,
    projectedFinalValue: 150000,
    scopeDriftPct: 20.0,
    budgetBurnPct: 48.0,
    timelineElapsedPct: 35.0,
    driftRiskLevel: 'critical',
    alerts: [
      {
        severity: 'critical',
        code: 'UNAPPROVED_SCOPE_EXPANSION',
        title: 'Unapproved Scope Expansion',
        message: 'Found $10,000 in detected out-of-scope work not yet formally approved.',
        recommendedAction: 'Convert to signed Change Requests',
        actionPage: 'opportunities',
      },
      {
        severity: 'warning',
        code: 'PENDING_CHANGE_ORDERS',
        title: 'Pending Change Orders Awaiting Signoff',
        message: 'There are 2 change orders pending client authorization.',
        recommendedAction: 'Send Magic Link approval requests',
        actionPage: 'change-orders',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.sowDrift.mockResolvedValue(mockDriftData);
  });

  it('renders SOW drift card with metrics, risk badge, and comparative progress bars', async () => {
    render(<SowDriftCard projectId="proj-1" setPage={() => {}} />);

    expect(await screen.findByText(/Real-Time SOW Drift & Milestone Burn Monitor/i)).toBeInTheDocument();
    expect(screen.getByText(/Fintech Cloud Replatforming/i)).toBeInTheDocument();
    expect(screen.getByText(/CRITICAL SOW DRIFT \(\+20%\)/i)).toBeInTheDocument();
    expect(screen.getByText('$125,000')).toBeInTheDocument();
    expect(screen.getByText('+$25,000')).toBeInTheDocument();
    expect(screen.getByText('$60,000')).toBeInTheDocument();
    expect(screen.getByText('$150,000')).toBeInTheDocument();
  });

  it('renders actionable alerts and clicking alert button calls setPage with target page', async () => {
    const mockSetPage = vi.fn();
    render(<SowDriftCard projectId="proj-1" setPage={mockSetPage} />);

    expect(await screen.findByText(/Unapproved Scope Expansion/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending Change Orders Awaiting Signoff/i)).toBeInTheDocument();

    const actionBtn = screen.getByRole('button', { name: /Convert to signed Change Requests/i });
    fireEvent.click(actionBtn);

    expect(mockSetPage).toHaveBeenCalledWith('opportunities');
  });

  it('renders stability banner when no alerts exist', async () => {
    api.sowDrift.mockResolvedValue({
      ...mockDriftData,
      driftRiskLevel: 'low',
      scopeDriftPct: 2.5,
      alerts: [],
    });

    render(<SowDriftCard projectId="proj-1" setPage={() => {}} />);

    expect(await screen.findByText(/Scope & Burn Stability/i)).toBeInTheDocument();
  });
});

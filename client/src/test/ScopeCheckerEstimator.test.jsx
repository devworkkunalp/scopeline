import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ScopeCheckerModal from '../components/ScopeCheckerModal.jsx';
import { api } from '../api.js';

vi.mock('../api.js', () => ({
  api: {
    checkScope: vi.fn(),
    addManualOpportunity: vi.fn(),
  },
}));

describe('ScopeCheckerModal with Smart Estimator Component', () => {
  const mockProject = {
    id: 'proj-1',
    name: 'Enterprise Cloud Portal',
    clientName: 'Apex Health Systems',
    perspective: 'vendor',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.checkScope.mockResolvedValue({
      verdict: 'OUT_OF_SCOPE',
      type: 'Scope Expansion',
      clause: '§4.0 — Change Order Required',
      reasoning: 'Feature adds custom multi-currency settlement not included in baseline SOW.',
      estimatedCost: 2400,
      billableValue: 5380,
    });
  });

  it('renders multi-role rate estimator with live margin calculation', async () => {
    render(<ScopeCheckerModal activeProject={mockProject} onClose={() => {}} onAdded={() => {}} />);

    expect(screen.getByText(/Smart Rate & Margin Estimator/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Lead Architect \/ Principal/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Senior Fullstack Engineer/i)).toBeInTheDocument();
    expect(screen.getByText(/Gross Margin/i)).toBeInTheDocument();
    expect(screen.getByText(/Realistic Commercial Pricing/i)).toBeInTheDocument();
  });

  it('allows evaluating scope and saving an opportunity with itemized role breakdown', async () => {
    api.addManualOpportunity.mockResolvedValue({
      id: 'opp-new-1',
      title: 'Real-Time Telehealth Video Bridge',
      billable: 5380,
    });

    render(<ScopeCheckerModal activeProject={mockProject} onClose={() => {}} onAdded={() => {}} />);

    const titleInput = screen.getByPlaceholderText(/Multi-Currency Checkout/i);
    const descInput = screen.getByPlaceholderText(/Paste meeting notes/i);

    fireEvent.change(titleInput, { target: { value: 'Real-Time Telehealth Video Bridge' } });
    fireEvent.change(descInput, { target: { value: 'Client requested WebRTC low-latency video consultations.' } });

    const evalBtn = screen.getByRole('button', { name: /Evaluate Scope & Calculate Change Order/i });
    fireEvent.click(evalBtn);

    expect(await screen.findByText(/OUT OF SCOPE \(BILLABLE VARIATION\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Feature adds custom multi-currency/i)).toBeInTheDocument();

    const saveCrBtn = screen.getByRole('button', { name: /Generate Change Request Now/i });
    fireEvent.click(saveCrBtn);

    await waitFor(() => {
      expect(api.addManualOpportunity).toHaveBeenCalledWith(
        'proj-1',
        expect.objectContaining({
          title: 'Real-Time Telehealth Video Bridge',
          createChangeRequest: true,
          costBreakdown: expect.stringContaining('Itemized Roles'),
        })
      );
    });
  });
});
